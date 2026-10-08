const mods = ['@tailwindcss/vite', 'vite', 'tailwindcss', 'react18-json-view',
  'next-intl', 'zustand', 'clsx', 'tailwind-merge', 'material-symbols'];
for (const m of mods) {
  let ok = 'MISSING';
  try { require.resolve(m + '/package.json'); ok = 'OK'; } catch {}
  console.log(m.padEnd(22), ok);
}