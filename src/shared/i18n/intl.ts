/**
 * i18n shim for the ported components.
 *
 * The upstream components call next-intl hooks. This project has no Next.js
 * runtime, so this provides the same hook surface backed by the copied
 * en.json. Only English is wired; another locale means loading another
 * messages file and returning it from loadMessages().
 */

import messages from "@/i18n/messages/en.json";

let locale = "en";

export function setLocale(next) {
  locale = next;
}

function lookup(namespace, key) {
  let node = messages;
  for (const part of namespace.split(".")) {
    if (!node || typeof node !== "object") return undefined;
    node = node[part];
  }
  if (!node || typeof node !== "object") return undefined;
  for (const part of String(key).split(".")) {
    if (!node || typeof node !== "object") return undefined;
    node = node[part];
  }
  return typeof node === "string" ? node : undefined;
}

/**
 * Interpolation mirrors ICU's simple {name} form, which is the only form the
 * copied components use. A missing key returns the key itself, so a gap shows
 * up on screen instead of rendering as an empty string.
 */
function format(template, values) {
  if (typeof template !== "string") return String(template);
  return template.replace(/\{(\w+)\}/g, (match, name) =>
    values && values[name] !== undefined ? String(values[name]) : match,
  );
}

export function useTranslations(namespace) {
  return (key, values) => format(lookup(namespace, key), values);
}

export function useLocale() {
  return locale;
}

export function useMessages() {
  return messages;
}

export default { useTranslations, useLocale, useMessages, setLocale };