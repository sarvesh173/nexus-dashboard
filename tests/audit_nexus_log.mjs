/**
 * Evidence harness for the telemetry log buffer (src/nexusLog.js) and the
 * Logs terminal that consumes it (src/features/logs/index.jsx).
 *
 * Run: node tests/audit_nexus_log.mjs
 *
 * Each case asserts the CURRENT behaviour of the shipped code so the defects
 * are reproducible before and after the fix.
 */

const results = [];
function check(name, fn) {
  try {
    const detail = fn();
    results.push({ name, pass: true, detail });
  } catch (err) {
    results.push({ name, pass: false, detail: `${err.name}: ${err.message}` });
  }
}
void check;

// ---- 1. Corrupted sessionStorage payload shapes -------------------------
// Each shape is what a partially-written / foreign / hand-edited sessionStorage
// entry can look like. nexusLog() must keep working after each.
const BAD_SHAPES = {
  'object instead of array': '{"not":"an array"}',
  'bare number': '42',
  'bare string': '"hello"',
  'null': 'null',
  'array of junk': '[null,3,"x",{"nope":1}]',
  'truncated json': '[{"id":1,',
  'deeply nested array': JSON.stringify([[[[1]]]]),
};

// The restore path is synchronous, so drive the module directly per case.
async function runRestoreCase(label, raw) {
  const store = new Map([['nexus_dev_logs', raw]]);
  globalThis.sessionStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  const bust = `?t=${Math.random()}`;
  const mod = await import(`../src/nexusLog.js${bust}`);
  let afterRestore;
  try {
    afterRestore = Array.isArray(mod.getNexusLogs()) ? 'array' : typeof mod.getNexusLogs();
  } catch (err) {
    return `getNexusLogs() threw ${err.name}`;
  }
  // Now record an event - the real test of whether telemetry still works.
  try {
    mod.nexusLog('SYSTEM', 'probe');
    const out = mod.getNexusLogs();
    return `buffer=${afterRestore}, nexusLog() ok, length=${out.length}`;
  } catch (err) {
    return `buffer=${afterRestore}, nexusLog() THREW ${err.name}: ${err.message}`;
  }
}

console.log('=== 1. sessionStorage restore shapes ===');
for (const [label, raw] of Object.entries(BAD_SHAPES)) {
  const out = await runRestoreCase(label, raw);
  console.log(`  ${label.padEnd(26)} -> ${out}`);
}

// ---- 2. Buffer cap enforcement on restore -------------------------------
console.log('\n=== 2. buffer cap on restore (NEXUS_MAX_LOGS = 300) ===');
{
  const oversized = JSON.stringify(
    Array.from({ length: 5000 }, (_, i) => ({
      id: `e${i}`, time: '00:00:00', type: 'SYSTEM', message: `m${i}`, details: null,
    })),
  );
  console.log(`  restoring ${oversized.length} bytes / 5000 entries -> ${await runRestoreCase('5000 entries', oversized)}`);
}

// ---- 3. Subscriber isolation -------------------------------------------
console.log('\n=== 3. subscriber isolation ===');
{
  globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  const mod = await import(`../src/nexusLog.js?sub=${Math.random()}`);
  const seen = [];
  const offBad = mod.subscribeNexusLogs(() => { throw new Error('subscriber blew up'); });
  const offGood = mod.subscribeNexusLogs((l) => seen.push(l.length));
  mod.nexusLog('SYSTEM', 'one');
  mod.nexusLog('SYSTEM', 'two');
  offBad();
  offGood();
  console.log(`  good subscriber saw lengths: ${JSON.stringify(seen)}`);
  console.log(`  bad subscriber did not prevent delivery: ${seen.length === 2 ? 'PASS' : 'FAIL'}`);
}

// ---- 4. Logs terminal read path (what logs/index.jsx now calls) ---------
console.log('\n=== 4. Logs terminal read path (getNexusLogs / clearNexusLogs) ===');
{
  globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  const mod = await import(`../src/nexusLog.js?path=${Math.random()}`);
  mod.nexusLog('ACTION', 'clicked Fetch');
  mod.nexusLog('ERROR', 'sync failed');
  mod.nexusLog('SYSTEM', 'started');

  const read = () => mod.getNexusLogs();
  const filterOnType = (cat) => read().filter((l) => cat === 'ALL' || l.type === cat);

  console.log(`  buffer length after 3 events : ${read().length}`);
  console.log(`  filter ALL      -> ${filterOnType('ALL').length} rows`);
  console.log(`  filter ACTION   -> ${filterOnType('ACTION').length} rows`);
  console.log(`  filter ERROR    -> ${filterOnType('ERROR').length} rows`);
  console.log(`  filter SYSTEM   -> ${filterOnType('SYSTEM').length} rows`);
  console.log(`  every row has a .type         : ${read().every((l) => typeof l.type === 'string')}`);
  console.log(`  => filters match rows         : ${
    filterOnType('ACTION').length === 1 && filterOnType('ERROR').length === 1 ? 'PASS' : 'FAIL'}`);

  // Search must not stringify the whole entry (the old path did, inside render).
  const cyclic = { self: null };
  cyclic.self = cyclic;
  mod.nexusLog('SYSTEM', 'cyclic detail', cyclic);
  let searchOk;
  try {
    const hay = read().map((l) => `${l.type ?? ''} ${l.message ?? ''} ${l.details ?? ''}`);
    searchOk = hay.some((h) => h.toLowerCase().includes('cyclic'));
  } catch (err) {
    searchOk = `THREW ${err.name}`;
  }
  console.log(`  search over cyclic detail     : ${searchOk}`);
  console.log(`  circular detail stored as     : ${JSON.stringify(read()[0].details)}`);

  mod.clearNexusLogs();
  console.log(`  after clearNexusLogs()        : ${read().length} rows` +
              `  => ${read().length === 0 ? 'PASS' : 'FAIL'}`);
}

// ---- 5. Buffer schema the terminal renders ------------------------------
console.log('\n=== 5. schema: buffer output vs what the terminal reads ===');
{
  globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  const mod = await import(`../src/nexusLog.js?schema=${Math.random()}`);
  mod.nexusLog('ERROR', 'boom', { k: 1 });
  const e = mod.getNexusLogs()[0];
  console.log(`  entry keys produced : ${JSON.stringify(Object.keys(e))}`);
  console.log(`  entry.type          : ${JSON.stringify(e.type)}   <- terminal filters on this`);
  console.log(`  entry.level         : ${JSON.stringify(e.level)}   <- undefined; old code filtered on this`);
  console.log(`  => filter field exists: ${e.type !== undefined ? 'PASS' : 'FAIL'}`);
}