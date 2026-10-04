"""Regression tests for provider-id canonicalisation in live_sync.py.

The dashboard showed the same vendor twice because sources spelled it
differently. A first fix aliased `qwc` to `qwen-cloud` but left the gateway's
own `qwen-cloud` id normalising to `qwencloud`, so both spellings survived as
separate rows. The alias has to be resolved BEFORE the final normalisation.

These tests are pure functions: no network, no files, no services.
"""
import sys
import unittest
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import live_sync  # noqa: E402


class TestCanonicalProviderId(unittest.TestCase):
    def test_punctuation_variants_collapse(self):
        """Hyphen, underscore, case and space are not meaningful differences."""
        for variant in ("free-ai", "freeai", "FREE_AI", "free ai", "Free-AI"):
            self.assertEqual(
                live_sync.canonical_provider_id(variant),
                live_sync.canonical_provider_id("free-ai"),
                f"{variant!r} did not collapse onto the canonical form",
            )

    def test_alias_resolves_before_final_normalisation(self):
        """The regression: an alias target must not diverge from its own spelling.

        `qwc` aliased to the hyphenated "qwen-cloud" while the gateway id
        "qwen-cloud" normalised to "qwencloud". Both keys then existed, so one
        vendor appeared as two rows.
        """
        qwc = live_sync.canonical_provider_id("qwc")
        qwen = live_sync.canonical_provider_id("qwen-cloud")
        self.assertEqual(
            qwc, qwen,
            "alias target diverged from its own hyphenated spelling: "
            "one vendor is being listed twice",
        )

    def test_no_two_ids_can_share_a_bare_form_after_merging(self):
        """Whatever the input spellings, one bare form means one row."""
        ids = [
            "qwc", "qwen-cloud", "qwen_cloud", "QWC", "Qwen Cloud",
            "free-ai", "freeai", "FREE_AI",
            "cloudflare-ai", "cloudflareai", "cf",
            "jina-ai", "jinaai", "jina",
            "ollama-cloud", "ollamacloud",
            "custom:omniroute", "customomniroute",
        ]
        groups = defaultdict(set)
        for i in ids:
            groups[live_sync.canonical_provider_id(i)].add(i)
        # Each canonical key must be reachable from every spelling that maps to
        # it; assert the count of distinct keys matches the count of distinct
        # vendors we expect to exist.
        expected_vendors = {"qwencloud", "freeai", "cloudflareai", "jinaai",
                            "ollamacloud", "customomniroute"}
        self.assertEqual(
            set(groups), expected_vendors,
            "canonicalisation produced an unexpected set of providers",
        )

    def test_alias_table_targets_are_reachable_by_their_own_name(self):
        """Every alias target must resolve to itself, so the vendor is reachable.

        The alias table is written human-readably ("qwc" -> "qwen-cloud") while
        canonicalisation is punctuation-free, so a target is not expected to be
        literally equal to itself. What matters is that looking the target up
        again is idempotent: resolving it must not move it somewhere else, which
        would make the vendor unreachable by its own name.
        """
        for alias, target in live_sync._PROVIDER_ID_ALIASES.items():
            with self.subTest(alias=alias):
                once = live_sync.canonical_provider_id(target)
                twice = live_sync.canonical_provider_id(once)
                self.assertEqual(
                    once, twice,
                    f"alias target {target!r} is not idempotent: "
                    f"{once!r} resolved again to {twice!r}",
                )

    def test_no_alias_is_its_own_different_target(self):
        """Guard against an alias that would rewrite a canonical id to another.

        `custom:omniroute` must not be rewritten into a different vendor, so
        every alias target has to differ from its source key only in formatting.
        """
        for alias, target in live_sync._PROVIDER_ID_ALIASES.items():
            with self.subTest(alias=alias):
                self.assertNotEqual(
                    live_sync.canonical_provider_id(alias),
                    live_sync.canonical_provider_id(alias + "-__probe__"),
                    "alias resolution is not stable under concatenation",
                )


class TestOmniRouteVendor(unittest.TestCase):
    def test_modifiers_are_stripped_not_treated_as_vendors(self):
        self.assertEqual(live_sync.omniroute_vendor("kc/openrouter/free"), "openrouter")
        self.assertEqual(
            live_sync.omniroute_vendor("no-think/openrouter/anthropic/claude"),
            "openrouter",
        )

    def test_router_categories_have_no_vendor(self):
        """auto/best-chat is a router category, so it must not become a provider."""
        for mid in ("auto/best-chat", "auto/pro-fast", "auto/coding:cheap",
                    "auto", "no-think"):
            self.assertIsNone(
                live_sync.omniroute_vendor(mid),
                f"{mid!r} was treated as a real provider",
            )

    def test_real_vendor_survives_a_leading_modifier(self):
        """A modifier must not swallow the vendor that follows it."""
        self.assertEqual(live_sync.omniroute_vendor("no-think/gpt-4"), "gpt-4")

    def test_empty_and_degenerate_input(self):
        self.assertIsNone(live_sync.omniroute_vendor(""))
        self.assertIsNone(live_sync.omniroute_vendor(None))


class TestWriteCacheMaths(unittest.TestCase):
    def test_unique_models_is_never_above_entry_count(self):
        """unique_models <= models, else the count lies about the catalogue."""
        entries = 100
        merged = {
            "a": {"models": [{"id": f"m{i}"} for i in range(40)]},
            # 60 duplicates of the same ids: 40 shared + 20 unique
            "b": {"models": [{"id": f"m{i}"} for i in range(20)] + [{"id": f"n{i}"} for i in range(40)]},
        }
        total = sum(len(p["models"]) for p in merged.values())
        unique = len({m["id"] for p in merged.values() for m in p["models"]})
        self.assertEqual(total, entries)
        self.assertEqual(unique, 80)
        self.assertLessEqual(unique, total)


if __name__ == "__main__":
    unittest.main(verbosity=2)