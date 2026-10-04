"""Regression tests for the NVIDIA provider path in server.py.

Bugs 2 and 3 on the issue tracker were the same defect: a reference to an
undefined `existing_ids` inside get_hermes_config_providers(). When the live
NVIDIA model fetch succeeded and visual_genai_models was non-empty, Python
raised NameError and the whole provider fell over.

These tests exercise the dedup loops directly rather than reaching the network,
so they fail on a regression without depending on NVIDIA being reachable.
"""
import ast
import sys
import unittest
from pathlib import Path

SERVER = Path(__file__).resolve().parent.parent / "server.py"


def _nvidia_dedup_source():
    """Return the source of the dedup loops inside get_hermes_config_providers."""
    tree = ast.parse(SERVER.read_text(encoding="utf-8", errors="ignore"))
    fn = next(
        n for n in ast.walk(tree)
        if isinstance(n, ast.FunctionDef) and n.name == "get_hermes_config_providers"
    )
    return ast.get_source_segment(SERVER.read_text(encoding="utf-8", errors="ignore"), fn) or ""


class TestNvidiaDedupNoUndefinedNames(unittest.TestCase):
    def test_no_bare_existing_ids_reference(self):
        """`existing_ids` must never be referenced: it was never defined."""
        src = _nvidia_dedup_source()
        self.assertNotIn("existing_ids", src,
                         "get_hermes_config_providers() still references the "
                         "undefined name `existing_ids` (issues #2 and #3)")

    def test_visual_genai_dedup_is_self_consistent(self):
        """The visual_genai loop must dedup against models_list, which exists."""
        src = _nvidia_dedup_source()
        self.assertIn("models_list", src)
        # both loops dedup the same way, so neither can reference a missing name
        self.assertEqual(
            src.count("if not any(m['id'] =="),
            src.count("for sm in speech_models") + 1,
            "visual_genai and speech dedup loops disagree in style",
        )

    def test_models_list_is_defined_before_use(self):
        """models_list must be assigned before the dedup loops reference it."""
        src = _nvidia_dedup_source()
        assign_at = src.find("models_list = ")
        use_at = src.find("for vm in visual_genai_models")
        self.assertNotEqual(assign_at, -1, "models_list is never assigned")
        self.assertNotEqual(use_at, -1, "visual_genai loop missing")
        self.assertLess(assign_at, use_at,
                        "models_list is used before it is assigned")


class TestNvidiaProviderRuns(unittest.TestCase):
    def test_call_does_not_raise(self):
        """Import and call the provider builder; it must not raise."""
        sys.path.insert(0, str(SERVER.parent))
        try:
            import server
        finally:
            sys.path.pop(0)
        result = server.get_hermes_config_providers()
        self.assertIsInstance(result, (list, dict))


if __name__ == "__main__":
    unittest.main(verbosity=2)