/* global process */
// Dependency-free Chromium/CDP gate. Node >=22 supplies WebSocket.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtemp, rm, readFile, readdir, stat } from "node:fs/promises";
import { once } from "node:events";
import { tmpdir } from "node:os";
import { join, resolve, extname, relative } from "node:path";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export async function runBrowserGate(root) {
  const profile = await mkdtemp(join(tmpdir(), "nexus-chromium-"));
  const mime = { ".html": "text/html", ".css": "text/css", ".mjs": "text/javascript", ".json": "application/json" };
  const errors = [];
  let browser;
  let socket;
  let stdout = "";
  const server = createServer(async (request, response) => {
    try {
      const path = resolve(root, "." + decodeURIComponent(new URL(request.url, "http://localhost").pathname));
      if (!path.startsWith(root + "/") || !(await stat(path)).isFile()) { response.writeHead(404).end(); return; }
      response.setHeader("Content-Type", mime[extname(path)] ?? "text/plain");
      response.end(await readFile(path));
    } catch { response.writeHead(404).end(); }
  });
  try {
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    const url = `http://127.0.0.1:${server.address().port}/examples/dashboard.html`;
    browser = spawn(process.env.CHROMIUM_BIN ?? "chromium", [
      "--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage",
      "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank",
    ], { stdio: ["ignore", "ignore", "pipe"] });
    let websocket;
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Chromium startup timeout: ${stdout}`)), 15000);
      browser.once("error", (error) => { clearTimeout(timeout); reject(error); });
      browser.once("exit", (code) => { clearTimeout(timeout); reject(new Error(`Chromium exited ${code}: ${stdout}`)); });
      browser.stderr.on("data", (chunk) => {
        stdout += chunk.toString();
        const found = stdout.match(/DevTools listening on (ws:\/\/[^\s]+)/);
        if (found) { websocket = found[1]; clearTimeout(timeout); resolve(); }
      });
    });
    socket = new WebSocket(websocket);
    await once(socket, "open");
    let nextId = 0;
    let sessionId;
    const pending = new Map();
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const waiter = pending.get(message.id);
        if (waiter) {
          pending.delete(message.id);
          clearTimeout(waiter.timeout);
          if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
          else waiter.resolve(message.result);
        }
      } else if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text + ": " + (message.params.exceptionDetails.exception?.description ?? ""));
    });
    const call = (method, params = {}, session = sessionId) => new Promise((resolve, reject) => {
      const id = ++nextId;
      const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
      pending.set(id, { resolve, reject, timeout });
      socket.send(JSON.stringify({ id, method, params, ...(session ? { sessionId: session } : {}) }));
    });
    const target = await call("Target.createTarget", { url: "about:blank" }, null);
    sessionId = (await call("Target.attachToTarget", { targetId: target.targetId, flatten: true }, null)).sessionId;
    await call("Runtime.enable");
    await call("Page.enable");
    const evaluate = async (expression) => {
      const result = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
      return result.result.value;
    };
    const run = (fn, ...args) => evaluate(`(${fn.toString()})(...${JSON.stringify(args)})`);
    const waitFor = async (fn) => {
      for (let tries = 0; tries < 100; tries++) { if (await run(fn)) return; await delay(25); }
      throw new Error(`Browser condition timeout: ${fn}`);
    };
    const viewport = async (width, height = 900) => {
      await call("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
      await delay(75);
    };
    await viewport(1280);
    await call("Page.navigate", { url });
    await waitFor(() => Boolean(window.nexusFixture));
    const version = await call("Browser.getVersion", {}, null);
    console.log(`Browser: ${version.product}`);

    // Audit assets AND every CSS code fence. supports() rejects unknown names;
    // stylesheet insertion also checks syntax/count so dropped rules cannot hide.
    const cssInputs = [];
    for (const file of await readdir(join(root, "assets"))) {
      if (file.endsWith(".css")) cssInputs.push({ label: file, text: await readFile(join(root, "assets", file), "utf8") });
    }
    for (const file of await readdir(root)) {
      if (!file.endsWith(".md")) continue;
      const text = await readFile(join(root, file), "utf8");
      for (const [, code] of text.matchAll(/```css\n([\s\S]*?)```/g)) cssInputs.push({ label: `${file} CSS fence`, text: code });
    }
    const cssAudit = await run((inputs) => {
      const failures = [];
      let count = 0;
      for (const { label, text } of inputs) {
        const cleaned = text.replace(/\/\*[\s\S]*?\*\//g, "");
        const declarations = [...cleaned.matchAll(/(?:^|(?<=[;{]))\s*([\w-]+)\s*:\s*([^;{}]+);/g)];
        let ignoredVendorDeclarations = 0;
        for (const [, property, rawValue] of declarations) {
          const value = rawValue.replace(/\s*!important\s*$/, "").trim();
          // Safari's valid compatibility prefix is not exposed by new Chromium.
          if (property === "-webkit-backdrop-filter" && CSS.supports("backdrop-filter", value)) {
            ignoredVendorDeclarations++;
            continue;
          }
          if (property.startsWith("--")) continue;
          // font-face descriptors have descriptor syntax, not property syntax.
          if (["src", "font-display"].includes(property) || property === "font-weight" && /^\d+\s+\d+/.test(value)
              || property === "font-stretch" && /^\d+%\s+\d+%/.test(value)) continue;
          if (!CSS.supports(property, value.trim())) failures.push(`${label}: unsupported ${property}: ${value}`);
        }
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(text);
        let parsed = 0;
        function visit(rules) {
          for (const rule of rules) {
            if (rule.style) parsed += rule.style.length;
            if (rule.cssRules) visit(rule.cssRules);
          }
        }
        visit(sheet.cssRules);
        // Shorthands may expand, but an authored declaration must not vanish.
        if (parsed < declarations.length - ignoredVendorDeclarations) failures.push(`${label}: parsed ${parsed}/${declarations.length - ignoredVendorDeclarations} supported declarations`);
        count += declarations.length;
      }
      return { failures, count };
    }, cssInputs);
    assert.deepEqual(cssAudit.failures, []);
    console.log(`PASS ${cssAudit.count} authored CSS declarations (${cssInputs.length} assets/fences), no unsupported properties`);

    // Resolve tokens in the browser's actual sRGB renderer, not guessed OKLCH L.
    const contrast = await run(() => {
      const roles = ["surface", "surface-container-lowest", "surface-container-low", "surface-container", "surface-container-high", "surface-container-highest"];
      const pairs = [];
      for (const surface of roles) for (const text of ["on-surface", "on-surface-muted", "on-surface-subtle"]) pairs.push([surface, text, 4.5]);
      for (const role of ["primary", "secondary", "tertiary", "success", "warning", "danger"]) {
        pairs.push([role, `on-${role}`, 4.5], [`${role}-container`, `on-${role}-container`, 4.5], ["surface-container", role, 4.5]);
      }
      pairs.push(["inverse-surface", "inverse-on-surface", 4.5]);
      for (const surface of roles) pairs.push([surface, "--nx-focus-ring", 3], [surface, "outline", 3]);
      const canvas = document.createElement("canvas"); canvas.width = canvas.height = 1;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      const probe = document.createElement("span"); document.body.append(probe);
      const luminance = (suffix) => {
        probe.style.color = `var(${suffix.startsWith("--") ? suffix : `--nx-color-${suffix}`})`;
        context.clearRect(0, 0, 1, 1); context.fillStyle = getComputedStyle(probe).color; context.fillRect(0, 0, 1, 1);
        const [r, g, b] = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3).map((channel) => {
          const c = channel / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const results = [];
      for (const theme of ["light", "dark"]) {
        document.documentElement.dataset.nxTheme = theme;
        for (const [background, foreground, minimum] of pairs) {
          const a = luminance(background), b = luminance(foreground);
          const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
          results.push({ theme, background, foreground, ratio, minimum });
        }
      }
      document.documentElement.dataset.nxTheme = "light";
      probe.remove();
      return results;
    });
    const contrastFailures = contrast.filter((pair) => pair.ratio < pair.minimum);
    assert.deepEqual(contrastFailures, [], JSON.stringify(contrastFailures));
    console.log(`PASS ${contrast.length} rendered semantic text/focus/boundary contrast pair checks`);

    assert.equal(await run(() => document.querySelectorAll("main").length), 1);
    assert.equal(await run(() => document.querySelectorAll("h1").length), 1);
    assert.equal(await run(() => document.querySelectorAll("nav").length), 1);
    assert.deepEqual(await run(() => {
      const ids = [...document.querySelectorAll("[id]")].map((node) => node.id);
      return ids.filter((id, index) => ids.indexOf(id) !== index);
    }), []);

    // Native Tab navigation excludes background controls. At a browser-chrome
    // boundary Chromium may expose BODY as activeElement; it isn't a target.
    await run(() => { document.querySelector("#details-trigger").focus(); document.querySelector("#details-trigger").click(); });
    await delay(800);
    const glass = await run(() => {
      const pane = document.querySelector("#details-drawer .nx-glass");
      const style = getComputedStyle(pane);
      return { filter: style.backdropFilter, background: style.backgroundImage, focusInside: pane.contains(document.activeElement) };
    });
    assert.match(glass.filter, /blur\(28px\).*saturate\(1\.9\)/);
    assert.notEqual(glass.background, "none", "Glass enhancement was overridden by component geometry");
    assert.ok(glass.focusInside);
    for (let i = 0; i < 8; i++) {
      await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
      await call("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
      const focused = await run(() => ({ inside: document.querySelector("#details-drawer").contains(document.activeElement), browserBoundary: document.activeElement === document.body }));
      assert.ok(focused.inside || focused.browserBoundary, `Tab reached background control: ${JSON.stringify(focused)}`);
    }
    assert.ok(await run(() => {
      document.querySelector("#theme-toggle").focus();
      return document.activeElement !== document.querySelector("#theme-toggle");
    }), "Modal background is not inert");
    await run(() => { document.documentElement.dataset.nxReducedTransparency = "true"; });
    assert.deepEqual(await run(() => {
      const style = getComputedStyle(document.querySelector("#details-drawer .nx-glass"));
      return { filter: style.backdropFilter, background: style.backgroundImage };
    }), { filter: "none", background: "none" });
    await run(() => { delete document.documentElement.dataset.nxReducedTransparency; document.documentElement.dataset.nxHighContrast = "true"; });
    assert.equal(await run(() => getComputedStyle(document.querySelector("#details-drawer .nx-glass")).backdropFilter), "none");
    await run(() => { delete document.documentElement.dataset.nxHighContrast; });
    await call("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await call("Input.dispatchKeyEvent", { type: "keyUp", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
    await waitFor(() => !document.querySelector("#details-drawer").open && document.documentElement.style.overflow === "");
    assert.equal(await run(() => document.activeElement.id), "details-trigger");
    assert.equal(await run(() => document.documentElement.style.overflow), "");
    await call("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    await run(() => window.nexusFixture.drawer.open());
    assert.equal(await run(() => document.querySelector("#details-drawer .nx-glass").style.transform), "");
    await run(() => window.nexusFixture.drawer.close());
    await call("Emulation.setEmulatedMedia", { features: [{ name: "forced-colors", value: "active" }] });
    await run(() => window.nexusFixture.drawer.open());
    assert.equal(await run(() => getComputedStyle(document.querySelector("#details-drawer .nx-glass")).backdropFilter), "none");
    await run(() => window.nexusFixture.drawer.close());
    await call("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-transparency", value: "reduce" }] });
    assert.equal(await run(() => getComputedStyle(document.querySelector("#details-drawer .nx-glass")).backdropFilter), "none");
    await call("Emulation.setEmulatedMedia", { features: [] });
    await run(() => {
      document.querySelector("#details-trigger").focus();
      window.nexusFixture.drawer.open();
      window.nexusFixture.drawer.close();
      window.nexusFixture.drawer.open();
    });
    await delay(100);
    assert.ok(await run(() => document.querySelector("#details-drawer").open && document.documentElement.style.overflow === "hidden"));
    assert.ok(await run(() => document.querySelector("#details-drawer").contains(document.activeElement)), "Queued close reset a reopened modal");
    await run(() => { document.documentElement.dataset.nxReducedMotion = "true"; });
    await delay(40);
    assert.equal(await run(() => document.querySelector("#details-drawer .nx-glass").style.transform), "");
    await run(() => {
      window.nexusFixture.drawer.close(); delete document.documentElement.dataset.nxReducedMotion;
      window.nexusFixture.drawer.open();
      // Emulate the native close-before-close-event order used by Escape.
      document.querySelector("#details-drawer").close();
      window.nexusFixture.drawer.open();
    });
    await delay(100);
    await run(() => window.nexusFixture.drawer.close());
    assert.equal(await run(() => document.documentElement.style.overflow), "", "Native-close/reopen leaked the scroll lock");

    // Unsupported enhancement is tested by removing @supports rules, not by
    // asserting a semi-transparent color is 'opaque enough'.
    await run(() => {
      const link = [...document.querySelectorAll("link")].find((node) => node.href.endsWith("/glass.css"));
      const sheet = link.sheet;
      window.restoreGlassRules = [];
      for (let i = sheet.cssRules.length - 1; i >= 0; i--) {
        if (sheet.cssRules[i].type === CSSRule.SUPPORTS_RULE) { window.restoreGlassRules.push([i, sheet.cssRules[i].cssText]); sheet.deleteRule(i); }
      }
    });
    assert.equal(await run(() => getComputedStyle(document.querySelector("#details-drawer .nx-glass")).backdropFilter), "none");
    await run(() => {
      const sheet = [...document.querySelectorAll("link")].find((node) => node.href.endsWith("/glass.css")).sheet;
      for (const [index, text] of window.restoreGlassRules.reverse()) sheet.insertRule(text, index);
      delete window.restoreGlassRules;
    });
    console.log("PASS modal glass/fallbacks, focus, background inertness/Tab exclusion, Escape, preference and scroll-lock paths");

    // Responsive nav: same tree, top-layer transition, RTL, resize with focus.
    await viewport(390, 844);
    await run(() => { document.querySelector("#nav-trigger").focus(); document.querySelector("#nav-trigger").click(); });
    assert.ok(await run(() => document.querySelector("#mobile-navigation").open));
    assert.equal(await run(() => document.querySelector("#workspace-navigation").parentElement.id), "mobile-navigation-host");
    await viewport(1280);
    assert.ok(await run(() => !document.querySelector("#mobile-navigation").open));
    assert.equal(await run(() => document.querySelector("#workspace-navigation").parentElement.id), "desktop-navigation");
    assert.ok(await run(() => document.querySelector("#workspace-navigation").contains(document.activeElement)), "Desktop nav lost focus on modal resize");
    await viewport(390, 844);
    await run(() => { document.documentElement.dir = "rtl"; window.nexusFixture.nav.open(); });
    assert.ok(await run(() => Math.abs(document.querySelector("#mobile-navigation").getBoundingClientRect().right - innerWidth) < 2));
    await run(() => { window.nexusFixture.nav.close(); document.documentElement.dir = "ltr"; });
    await viewport(320, 900);
    assert.ok(await run(() => document.documentElement.scrollWidth <= innerWidth + 1), "320px layout overflows");
    await run(() => { document.documentElement.style.fontSize = "200%"; });
    const enlarged = await run(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth,
      overflow: [...document.querySelectorAll("body *")].filter((node) => node.getClientRects().length && node.getBoundingClientRect().right > innerWidth + 1).slice(0, 8).map((node) => `${node.tagName}.${node.className}`) }));
    assert.ok(enlarged.scroll <= enlarged.width + 1, `Enlarged text overflows: ${JSON.stringify(enlarged)}`);
    await run(() => { document.documentElement.style.fontSize = ""; });
    await viewport(1280);
    console.log("PASS desktop/mobile NavDrawer, RTL, 320px reflow and enlarged-root-font layout");

    // Metric validation and state integrity.
    for (const state of ["loading", "ready", "stale", "empty", "error", "forbidden"]) {
      await run((state) => window.nexusFixture.metric(state), state);
      assert.equal(await run(() => document.querySelector("#throughput-card").dataset.state), state);
    }
    assert.equal(await run(() => {
      const { renderMetric, card } = window.nexusFixture;
      renderMetric(card, { state: "ready", value: 0, unit: "req/s" });
      return card.querySelector("[data-nx-value]").textContent;
    }), "0 req/s");
    assert.ok(await run(() => {
      try { window.nexusFixture.renderMetric(window.nexusFixture.card, { state: "ready", value: NaN }); } catch { return true; }
      return false;
    }));
    assert.ok(await run(() => {
      try { window.nexusFixture.renderMetric(window.nexusFixture.card, { state: "stale", value: 1 }); } catch { return true; }
      return false;
    }));
    assert.ok(await run(() => {
      try { window.nexusFixture.renderMetric(window.nexusFixture.card, { state: "ready", value: 1, updatedAt: null }); } catch { return true; }
      return false;
    }));

    // Stream append, hostile markup, bounded pause buffer, retained row cap.
    await run(() => {
      const { stream } = window.nexusFixture;
      stream.append({ id: "hostile", timestamp: "2026-10-07T08:00:00Z", level: "info", message: "<img src=x onerror=alert(1)>" });
    });
    assert.equal(await run(() => document.querySelector("[data-nx-log-list] img")), null);
    assert.ok(await run(() => {
      try { window.nexusFixture.stream.append({ id: "null-time", timestamp: null, level: "info", message: "Invalid time" }); } catch { return true; }
      return false;
    }));
    const beforePause = await run(() => document.querySelector("[data-nx-log-list]").children.length);
    await run(() => { window.nexusFixture.stream.setPaused(true); for (let i = 0; i < 205; i++) window.nexusFixture.stream.append({ id: `buffer-${i}`, timestamp: "2026-10-07T08:00:00Z", level: "warning", message: `Buffered ${i}` }); });
    assert.equal(await run(() => document.querySelector("[data-nx-log-list]").children.length), beforePause);
    assert.match(await run(() => document.querySelector("[data-nx-log-status]").textContent), /200 buffered.*5 events not retained/);
    await run(() => window.nexusFixture.stream.setPaused(false));
    assert.equal(await run(() => document.querySelector("[data-nx-log-list]").children.length), 200);
    await run(() => { document.querySelector("[data-nx-log-list]").scrollTop = 0; window.nexusFixture.stream.append({ id: "stay", timestamp: "2026-10-07T08:00:00Z", level: "info", message: "Do not tail" }); });
    assert.equal(await run(() => document.querySelector("[data-nx-log-list]").scrollTop), 0);
    await delay(2100);
    assert.match(await run(() => document.querySelector("[data-nx-log-announcer]").textContent), /new events/);
    console.log("PASS MetricCard data boundaries and StreamLog injection/retention/pause/announcement paths");

    // Kanban accepted persistence vs failure. Synthetic adapter is explicit.
    await run(() => {
      const item = document.querySelector("[data-nx-card-id='NX-104']");
      item.querySelector("select").value = "active";
      item.querySelector("button").focus();
      item.querySelector("button").click();
    });
    await waitFor(() => document.querySelector("[data-nx-card-id='NX-104']").closest("[data-nx-column-id]").dataset.nxColumnId === "active");
    assert.equal(await run(() => document.querySelector("[data-nx-column-id='active'] [data-nx-column-count]").textContent), "1");
    assert.ok(await run(() => document.activeElement.matches("[data-nx-move-submit]")));
    await run(() => { document.querySelector("#fail-move").checked = true; });
    assert.equal(await run(async () => window.nexusFixture.board.move("NX-104", "done")), false);
    assert.equal(await run(() => document.querySelector("[data-nx-card-id='NX-104']").closest("[data-nx-column-id]").dataset.nxColumnId), "active");
    assert.match(await run(() => document.querySelector("[data-nx-board-status]").textContent), /Could not move/);
    const cancelled = await run(async () => {
      const { installKanbanBoard } = await import("../assets/components.mjs");
      window.nexusFixture.board.destroy();
      let resolveMove;
      let signal;
      const controller = installKanbanBoard(document.querySelector("#board"), { onMove: (options) => { signal = options.signal; return new Promise((resolve) => { resolveMove = resolve; }); } });
      const first = controller.move("NX-104", "done");
      const second = await controller.move("NX-104", "done");
      controller.destroy();
      resolveMove();
      return { first: await first, second, aborted: signal.aborted, column: document.querySelector("[data-nx-card-id='NX-104']").closest("[data-nx-column-id]").dataset.nxColumnId };
    });
    assert.deepEqual(cancelled, { first: false, second: false, aborted: true, column: "active" });
    console.log("PASS Kanban persistence success/failure, focus/counts, repeat activation and late-response cancellation");

    const ripple = await run(async () => {
      const { installRipple } = await import("../assets/ripple.mjs");
      const button = document.createElement("button"); button.className = "nx-button"; button.textContent = "Test ink"; document.body.append(button);
      const dispose = installRipple(button);
      const box = button.getBoundingClientRect();
      button.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 9, isPrimary: true, button: 0, clientX: box.left + 2, clientY: box.top + 2, bubbles: true }));
      const created = button.querySelectorAll(".nx-ripple").length;
      window.dispatchEvent(new PointerEvent("pointercancel", { pointerId: 9 }));
      await new Promise((resolve) => setTimeout(resolve, 200));
      const afterCancel = button.querySelectorAll(".nx-ripple").length;
      dispose();
      const afterDestroy = button.querySelectorAll(".nx-ripple-layer").length;
      button.remove();
      return { created, afterCancel, afterDestroy };
    });
    assert.deepEqual(ripple, { created: 1, afterCancel: 0, afterDestroy: 0 });
    await run(async () => {
      const { installDragSnap } = await import("../assets/spring.mjs");
      const handle = document.createElement("button"); handle.type = "button"; handle.textContent = "Test drag handle";
      Object.assign(handle.style, { position: "fixed", left: "20px", top: "20px", width: "200px", height: "48px", zIndex: "100", touchAction: "none" });
      document.body.append(handle);
      window.dragProbe = { value: 80, stops: 0, releases: [], handle, dispose: null };
      const state = window.dragProbe;
      state.dispose = installDragSnap(handle, { read: () => state.value, write: (value) => { state.value = value; },
        snapPoints: [0, 280], stopAnimation: () => { state.stops++; }, onRelease: (result) => { state.releases.push(result); } });
    });
    await call("Page.bringToFront");
    // Synchronize compositor hit testing after inserting the fixed probe; CDP
    // input can otherwise arrive before its first painted frame.
    await run(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.ok(await run(() => document.elementFromPoint(30, 44) === window.dragProbe.handle));
    const mouse = (type, x, buttons) => call("Input.dispatchMouseEvent", { type, x, y: 44, button: type === "mouseMoved" ? "none" : "left", buttons, clickCount: type === "mouseMoved" ? 0 : 1 });
    await mouse("mousePressed", 30, 1);
    await waitFor(() => window.dragProbe.stops === 1);
    await delay(20);
    await mouse("mouseMoved", 90, 1);
    await waitFor(() => window.dragProbe.value === 140);
    assert.equal(await run(() => window.dragProbe.value), 140, "Drag didn't preserve grab offset / 1:1 delta");
    await run(() => window.dragProbe.handle.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 2, isPrimary: false, button: 0, clientX: 190 })));
    assert.equal(await run(() => window.dragProbe.stops), 1, "Second pointer took over drag");
    await mouse("mouseReleased", 95, 0);
    await waitFor(() => window.dragProbe.releases.length === 1);
    const release = await run(() => window.dragProbe.releases[0]);
    assert.equal(release.position, 145, "Pointer-up coordinate wasn't committed");
    assert.equal(release.cancelled, false);
    assert.ok(release.velocity > 0);
    await run(() => { window.dragProbe.value = 80; document.documentElement.dataset.nxReducedMotion = "true"; });
    await mouse("mousePressed", 30, 1);
    await mouse("mouseMoved", 40, 1);
    await mouse("mouseReleased", 40, 0);
    await waitFor(() => window.dragProbe.releases.length === 2);
    const reducedDrag = await run(() => window.dragProbe.releases.at(-1));
    assert.equal(reducedDrag.target, 0, "Reduced motion used inertial projection");
    assert.equal(reducedDrag.reduceMotion, true);
    await run(() => { delete document.documentElement.dataset.nxReducedMotion; });
    await mouse("mousePressed", 30, 1);
    await mouse("mouseMoved", 60, 1);
    await run(() => window.dragProbe.handle.dispatchEvent(new PointerEvent("pointercancel", { pointerId: 1 })));
    await mouse("mouseReleased", 60, 0);
    await waitFor(() => window.dragProbe.releases.length === 3);
    const cancelledDrag = await run(() => window.dragProbe.releases.at(-1));
    assert.equal(cancelledDrag.cancelled, true);
    assert.equal(cancelledDrag.velocity, 0);
    assert.equal(await run(() => window.dragProbe.releases.length), 3, "Capture loss double-released drag");
    await run(() => { window.dragProbe.dispose(); window.dragProbe.handle.remove(); delete window.dragProbe; });
    console.log("PASS real mouse drag capture/offset/velocity, second-pointer rejection, cancel and reduced-motion snap");
    assert.deepEqual(errors, []);
    console.log("PASS ripple cancellation/teardown and no browser runtime exceptions");
    console.log("PASS browser gate. Screen-reader quality, real touch/device performance and downstream app checks remain manual.");
  } finally {
    socket?.close();
    if (browser && browser.exitCode === null) {
      browser.kill("SIGTERM");
      await Promise.race([once(browser, "exit"), delay(3000)]);
      if (browser.exitCode === null) browser.kill("SIGKILL");
    }
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await rm(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
}
