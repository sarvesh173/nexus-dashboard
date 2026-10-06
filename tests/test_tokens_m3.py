#!/usr/bin/env python3
"""Verify design-skills/*.md against the shipped stylesheets.

The three design documents are a CONTRACT, not prose. A token table that drifts
from `src/styles/tokens.css` is worse than no table, because it is then trusted
while being wrong. This test fails when they diverge.

Checks:
  1. Every `--md-sys-*` role a document names actually exists in the CSS.
  2. Every shape, typescale, elevation and state token a document names exists.
  3. Every theme named in tokens.md is really declared.
  4. The M3 motion tokens quoted in motion.md match src/index.css exactly -
     this is the check that catches a hand-edited duration or easing curve.
  5. The three documents exist and are non-trivial.

Offline and credential-free: reads only checked-in CSS.

Run: python3 tests/test_tokens_m3.py
"""
import os
import re
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(ROOT, 'design-skills')
TOKENS_CSS = os.path.join(ROOT, 'src', 'styles', 'tokens.css')
INDEX_CSS = os.path.join(ROOT, 'src', 'index.css')


def read(path):
    with open(path, 'r', encoding='utf-8') as fh:
        return fh.read()


def declared_tokens(css):
    return set(re.findall(r'(--md-sys-[a-z0-9-]+)\s*:', css))


class TestDocumentsExist(unittest.TestCase):
    def test_three_documents_present(self):
        for name in ('tokens.md', 'components.md', 'motion.md'):
            path = os.path.join(DOCS, name)
            self.assertTrue(os.path.exists(path), f'{name} is missing')
            self.assertGreater(len(read(path)), 1500, f'{name} looks like a stub')


class TestTokenDocumentsMatchStylesheet(unittest.TestCase):
    """A name in a doc that is not in the CSS is a fabricated token."""

    def setUp(self):
        self.css = read(TOKENS_CSS) + read(INDEX_CSS)
        self.declared = declared_tokens(self.css)
        self.docs = {
            name: read(os.path.join(DOCS, name))
            for name in ('tokens.md', 'components.md', 'motion.md')
        }

    # Requires at least one path segment after the family prefix, so a family
    # name written on its own (`--md-sys-typescale-*`) is not mistaken for a
    # specific token claim.
    TOKEN_RE = re.compile(r'--md-sys-(?:color|shape-corner|typescale|elevation|'
                          r'state)-[a-z0-9]+(?:-[a-z0-9]+)*')

    def test_named_roles_all_exist(self):
        for name, text in self.docs.items():
            for match in self.TOKEN_RE.finditer(text):
                token = match.group(0)
                # `elevation-level0` is declared; `elevation-level` alone in a
                # range such as "level0..5" is prose, not a claim.
                self.assertIn(
                    token, self.declared,
                    f'{name} names {token}, which no stylesheet declares',
                )

    def test_core_m3_families_are_covered(self):
        tokens_doc = self.docs['tokens.md']
        for family in ('--md-sys-color-', '--md-sys-shape-corner-',
                       '--md-sys-typescale-', '--md-sys-elevation-level',
                       '--md-sys-state-'):
            self.assertIn(family, tokens_doc,
                          f'tokens.md does not document the {family} family')

    def test_shape_tokens_named_exist(self):
        for corner in ('none', 'extra-small', 'small', 'medium', 'large',
                       'extra-large', 'full'):
            self.assertIn(f'--md-sys-shape-corner-{corner}', self.declared)

    def test_all_five_themes_are_documented(self):
        tokens_css = read(TOKENS_CSS)
        themes = set(re.findall(r'\[data-theme="([a-z-]+)"\]', tokens_css))
        self.assertGreaterEqual(len(themes), 5)
        tokens_doc = self.docs['tokens.md']
        for theme in sorted(themes):
            self.assertIn(theme, tokens_doc,
                          f'tokens.md does not document the {theme} theme')


class TestMotionDocumentMatchesCSS(unittest.TestCase):
    """The motion doc is only useful if its numbers are the real numbers."""

    def setUp(self):
        self.css = read(INDEX_CSS)
        self.doc = read(os.path.join(DOCS, 'motion.md'))

    def _css_value(self, token):
        match = re.search(
            r'%s:\s*([^;]+);' % re.escape(token), self.css)
        return match.group(1).strip() if match else None

    def test_every_documented_duration_is_exact(self):
        pattern = re.compile(r'\|\s*`?(short[1-4]|medium[1-4]|long[1-4]|'
                             r'extra-long[1-4])`?\s*\|\s*(\d+)ms\s*\|')
        found = pattern.findall(self.doc)
        self.assertGreaterEqual(len(found), 14,
                                'motion.md should list the full duration scale')
        for name, ms in found:
            token = f'--m3-duration-{name}'
            self.assertIn(token, self.declared_duration_names(),
                          f'motion.md lists {name}, absent from index.css')
            self.assertEqual(self._css_value(token), f'{ms}ms',
                             f'{token} is {self._css_value(token)} in CSS '
                             f'but {ms}ms in motion.md')

    def declared_duration_names(self):
        return set(re.findall(r'(--m3-duration-[a-z0-9-]+)\s*:', self.css))

    def test_every_documented_easing_is_exact(self):
        pattern = re.compile(r'\|\s*`?(standard|emphasized)(-decelerate|'
                             r'-accelerate)?`?\s*\|\s*`(cubic-bezier\([^)]+\))`')
        found = pattern.findall(self.doc)
        self.assertGreaterEqual(len(found), 6,
                                'motion.md should list the easing scale')
        for base, suffix, curve in found:
            token = f'--m3-easing-{base}{suffix or ""}'
            self.assertEqual(
                self._css_value(token), curve,
                f'{token} is {self._css_value(token)} in CSS but {curve} '
                f'in motion.md',
            )

    def test_legacy_non_m3_values_are_called_out_as_retired(self):
        # The doc must record that the old 240ms / custom-bezier values were
        # wrong, so nobody reintroduces them as "the previous values".
        self.assertIn('240ms', self.doc)
        self.assertIn('0.16, 1, 0.3, 1', self.doc)

    def test_reduced_motion_is_required(self):
        self.assertIn('prefers-reduced-motion', self.doc)
        # And the rule must actually ship.
        self.assertIn('prefers-reduced-motion', self.css)


class TestComponentsDocument(unittest.TestCase):
    def setUp(self):
        self.doc = read(os.path.join(DOCS, 'components.md'))

    def test_live_state_rules_present(self):
        # The rule that stops a dashboard from asserting liveness it never
        # measured. Removing this section re-enables fabricated status.
        self.assertIn('Live-state semantics', self.doc)
        self.assertIn('sourceError', self.doc)

    def test_a11y_requirements_present(self):
        self.assertIn('WCAG 2.2', self.doc)
        self.assertIn('focus-visible', self.doc)
        self.assertIn('aria-live', self.doc)

    def test_empty_and_degraded_states_required(self):
        self.assertIn('Empty and degraded states', self.doc)


if __name__ == '__main__':
    unittest.main(verbosity=2)