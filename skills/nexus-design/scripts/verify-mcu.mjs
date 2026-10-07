#!/usr/bin/env node
// Optional networked gate: install ONLY pinned MCU into a disposable temp folder.
// Never changes the vault's or a downstream application's dependencies/settings.
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { registerHooks } from "node:module";
import assert from "node:assert/strict";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const temporary = await mkdtemp(join(tmpdir(), "nexus-mcu-"));
try {
  console.log("Installing pinned MCU 0.4.0 in a disposable test directory (network required)…");
  await new Promise((resolve, reject) => {
    const process = spawn("npm", ["install", "--prefix", temporary, "--ignore-scripts", "--no-audit", "--no-fund", "--save-exact", "@material/material-color-utilities@0.4.0"], { stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    process.stdout.on("data", (chunk) => { output += chunk; });
    process.stderr.on("data", (chunk) => { output += chunk; });
    process.once("error", reject);
    process.once("exit", (code) => code === 0 ? resolve() : reject(new Error(output)));
  });
  // Published package has extensionless internal imports. This test hook mimics
  // bundler-style resolution; it does not claim unbundled ESM works by default.
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      try { return nextResolve(specifier, context); }
      catch (error) {
        if (error.code === "ERR_MODULE_NOT_FOUND" && specifier.startsWith(".")) return nextResolve(`${specifier}.js`, context);
        throw error;
      }
    },
  });
  const text = await readFile(join(root, "material_spec.md"), "utf8");
  const snippets = [...text.matchAll(/```js\n([\s\S]*?)```/g)].map(([, code]) => code);
  const recipe = snippets.find((code) => code.includes("SchemeTonalSpot"));
  assert.ok(recipe, "Missing MCU snippet");
  const entry = pathToFileURL(join(temporary, "node_modules/@material/material-color-utilities/index.js")).href;
  const source = recipe.replace('"@material/material-color-utilities"', JSON.stringify(entry));
  const api = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
  const fallback = 0xff6750a4;
  assert.equal(api.seedFromOpaquePixels([]), fallback);
  assert.equal(api.seedFromOpaquePixels([0x006750a4]), fallback);
  assert.equal(api.seedFromOpaquePixels(Array(64).fill(0xff6750a4)), fallback);
  for (const invalid of [[NaN], [-1], [0x100000000], null]) assert.throws(() => api.seedFromOpaquePixels(invalid));
  const expected = 31;
  for (const dark of [false, true]) for (const contrast of [-1, 0, 1]) {
    const roles = api.nexusDynamicRoles(fallback, dark, contrast);
    assert.equal(Object.keys(roles).length, expected);
    assert.ok(Object.values(roles).every((color) => /^#[0-9a-f]{6}$/i.test(color)));
    const containers = ["lowest", "low", "", "high", "highest"].map((suffix) => roles[`--nx-color-surface-container${suffix ? `-${suffix}` : ""}`]);
    assert.equal(new Set(containers).size, 5);
    assert.notEqual(roles["--nx-color-primary"], roles["--nx-color-on-primary"]);
  }
  for (const invalid of [NaN, -1, 0x006750a4]) assert.throws(() => api.nexusDynamicRoles(invalid));
  assert.throws(() => api.nexusDynamicRoles(fallback, "dark"));
  assert.throws(() => api.nexusDynamicRoles(fallback, false, 2));
  hooks.deregister();
  console.log("PASS verbatim MCU recipe: extraction/fallback/invalid data and light/dark roles at three contrast levels");
  console.log("This gate exercises the optional pinned API, not every Android/vendor algorithm or customized-role contrast.");
} finally {
  await rm(temporary, { recursive: true, force: true });
}
