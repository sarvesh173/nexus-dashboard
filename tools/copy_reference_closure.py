#!/usr/bin/env python3
"""Copy a dependency closure of components out of the reference checkout.

Verbatim copy: bytes are not touched. Only the two runtime imports this project
cannot resolve (`next-intl`, `next/navigation`) are rewritten afterwards by a
separate step, so the diff against the reference stays reviewable.

Usage: python3 tools/copy_reference_closure.py <entry-file> [<entry-file> ...]
"""
import os
import re
import shutil
import sys

REF = "/home/kira/Desktop/omni-ref/OmniRoute"
DST = "/home/kira/nexus-dashboard"
EXT = ["", ".tsx", ".ts", ".jsx", ".js", "/index.ts", "/index.tsx"]

# Import statements only: the previous pass matched prose inside block comments
# and reported a phantom dependency.
IMPORT_RE = re.compile(r'^\s*(?:import|export)[^\n;]*?from\s+"([^"]+)"', re.M)


def resolve(imp, base):
    if imp.startswith("@/"):
        # The '@' alias points at src/, so the repo-relative candidate keeps
        # that prefix. Dropping it made every aliased import look unresolved.
        prefix, rel = "src/", imp[2:]
    elif imp.startswith("."):
        # join() already produces a path relative to the repo root, because
        # `base` is root-relative. Joining it onto root a second time (the
        # earlier version) produced 'src/shared/components/src/shared/...'
        # and every relative import looked missing.
        prefix, rel = "", os.path.normpath(os.path.join(os.path.dirname(base), imp))
    else:
        return None  # external package
    for ext in EXT:
        cand = os.path.normpath(f"{prefix}{rel}{ext}")
        if os.path.isfile(os.path.join(REF, cand)):
            return cand
    return False  # in-tree but absent


def main(entries):
    seen, missing, external = set(), set(), set()
    queue = list(entries)
    copied = []
    while queue:
        f = os.path.normpath(queue.pop())
        if f in seen:
            continue
        seen.add(f)
        try:
            src = open(os.path.join(REF, f)).read()
        except OSError:
            continue
        dst = os.path.join(DST, f)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.copyfile(os.path.join(REF, f), dst)
        copied.append(f)
        for imp in IMPORT_RE.findall(src):
            r = resolve(imp, f)
            if r is True or r is False:
                missing.add(imp)
            elif r:
                queue.append(r)
            else:
                external.add(imp)

    print(f"copied {len(copied)} files")
    print(f"external packages ({len(external)}): {sorted(external)}")
    print(f"unresolved in-tree ({len(missing)}):")
    for m in sorted(missing):
        print("   ", m)
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))