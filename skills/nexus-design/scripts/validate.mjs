#!/usr/bin/env node
/* global process */
// Offline structure/snippet/regression gate; --browser adds a real Chromium gate.
import assert from "node:assert/strict";
import { readdir, readFile, stat, mkdtemp, writeFile, rm } from "node:fs/promises";
import { resolve, relative, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

export const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporary = await mkdtemp(join(tmpdir(), "nexus-vault-validate-"));
const command = (args) => {
  const result = spawnSync(process.execPath, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`${args.join(" ")}\n${result.stdout}${result.stderr}`);
  return result.stdout;
};
const collect = async (directory) => {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collect(path));
    else files.push(path);
  }
  return files;
};

try {
  const required = ["SKILL.md", "apple_spec.md", "material_spec.md", "components.md", "sources.md", "review.md",
    "assets/tokens.css", "assets/foundation.css", "assets/components.css", "assets/glass.css",
    "assets/spring.mjs", "assets/ripple.mjs", "assets/components.mjs", "examples/dashboard.html", "examples/dashboard.mjs"];
  for (const path of required) assert.ok((await stat(join(root, path))).size > 0, `Missing/empty ${path}`);
  const files = await collect(root);
  let snippetCount = 0;
  let links = 0;
  let modules = 0;
  for (const file of files) {
    const extension = extname(file);
    if (![".md", ".mjs", ".css", ".html"].includes(extension)) continue;
    const text = await readFile(file, "utf8");
    if (extension === ".mjs") { command(["--check", file]); modules++; }
    if (extension === ".md") {
      const lines = text.split("\n");
      assert.ok(lines.filter((line) => line.startsWith("```")).length % 2 === 0, `Unclosed fence in ${file}`);
      for (const match of text.matchAll(/\[[^\]]*\]\(([^\s]+)\)/g)) {
        const href = match[1];
        if (/^https?:|^mailto:/.test(href)) continue;
        const [path, anchor] = href.split("#");
        const target = path ? resolve(dirname(file), decodeURIComponent(path)) : file;
        assert.ok(target.startsWith(root + "/") || target === root, `Link escapes vault: ${href}`);
        assert.ok((await stat(target)).isFile(), `Missing link ${href}`);
        if (anchor && target.endsWith(".md")) {
          const source = await readFile(target, "utf8");
          const slugs = [...source.matchAll(/^#{1,6}\s+(.+)$/gm)].map((item) => item[1].toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, "").trim().replace(/\s/g, "-"));
          assert.ok(slugs.includes(anchor), `Missing anchor ${href}`);
        }
        links++;
      }
      for (const [, language, snippet] of text.matchAll(/```([^\n]*)\n([\s\S]*?)```/g)) {
        if (!["js", "javascript"].includes(language.trim())) continue;
        const path = join(temporary, `snippet-${snippetCount++}.mjs`);
        await writeFile(path, snippet);
        command(["--check", path]);
        for (const imported of snippet.matchAll(/from\s+["'](\.[^"']+)["']/g)) {
          // Blueprint snippets describe paths in the copied application assets.
          assert.ok((await stat(resolve(root, imported[1]))).isFile(), `Missing snippet import ${imported[1]}`);
        }
      }
    }
    if (extension === ".html") {
      for (const [, href] of text.matchAll(/(?:src|href)="([^"#]+)"/g)) {
        if (/^https?:|^\//.test(href)) continue;
        assert.ok((await stat(resolve(dirname(file), href))).isFile(), `Missing HTML asset ${href}`);
      }
    }
  }
  const master = await readFile(join(root, "SKILL.md"), "utf8");
  assert.match(master, /^---\nname: nexus-design\ndescription: "[^\n]+"\n---/);
  const components = await readFile(join(root, "components.md"), "utf8");
  for (const name of ["NavDrawer", "MetricCard", "StreamLog", "KanbanColumn", "Glassmorphic Drawer"]) assert.ok(components.includes(name), `Missing ${name}`);
  const source = await readFile(join(root, "assets/tokens.css"), "utf8");
  const declarations = [...source.matchAll(/(--nx-[\w-]+)\s*:\s*([^;]+);/g)];
  const declared = new Set(declarations.map(([, name]) => name));
  for (const file of files.filter((path) => path.endsWith(".css") || path.endsWith(".md"))) {
    const text = await readFile(file, "utf8");
    for (const [, token] of text.matchAll(/var\((--nx-[\w-]+)/g)) assert.ok(declared.has(token), `${relative(root, file)} references undefined ${token}`);
  }
  const definitions = new Map(declarations.map(([, name, value]) => [name, value]));
  function visit(name, path = []) {
    assert.ok(!path.includes(name), `Cyclic token: ${[...path, name].join(" → ")}`);
    for (const [, dependency] of (definitions.get(name) ?? "").matchAll(/var\((--nx-[\w-]+)/g)) visit(dependency, [...path, name]);
  }
  for (const name of declared) visit(name);
  const blockAliases = (selector) => {
    const begin = source.indexOf(selector);
    assert.ok(begin >= 0);
    const block = source.slice(begin, source.indexOf("}", begin));
    return Object.fromEntries([...block.matchAll(/(--nx-[\w-]+)\s*:\s*([^;]+);/g)].map(([, name, value]) => [name, value.trim()]));
  };
  const dark = blockAliases(':root[data-nx-theme="dark"] {');
  const autoDark = blockAliases(':root:not([data-nx-theme="light"]) {');
  assert.deepEqual(dark, autoDark, "Automatic dark scheme differs from explicit dark");
  const light = blockAliases(':root,\n:root[data-nx-theme="light"] {');
  assert.deepEqual(Object.keys(light).sort(), Object.keys(dark).sort(), "Incomplete theme mapping");
  for (const aliases of [light, dark]) {
    const tiers = ["lowest", "low", "", "high", "highest"].map((tier) => aliases[`--nx-color-surface-container${tier ? `-${tier}` : ""}`]);
    assert.equal(new Set(tiers).size, 5, "Five surface containers must be distinct");
  }
  assert.match(source, /--nx-glass-blur: 28px;/);
  assert.match(source, /--nx-glass-saturation: 190%;/);
  assert.match(source, /--nx-glass-rim-width: 1px;/);
  console.log(`PASS structure, ${links} local links, ${declared.size} tokens/theme parity, ${modules} JS modules, ${snippetCount} JS snippets`);
  console.log(command(["--test", join(root, "scripts/spring.test.mjs")]).trim());
  if (process.argv.includes("--browser")) {
    const { runBrowserGate } = await import("./browser.mjs");
    await runBrowserGate(root);
  } else console.log("Browser gate not run (use --browser). Optional MCU recipe has a separate verify-mcu.mjs gate.");
} finally {
  await rm(temporary, { recursive: true, force: true });
}
