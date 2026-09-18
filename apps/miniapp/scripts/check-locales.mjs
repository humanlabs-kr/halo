#!/usr/bin/env node
/**
 * Locale integrity check — run by `pnpm --filter @halo/miniapp test`.
 *
 * Translations arrive from outside the repo (a translation vendor, a script, a
 * hurried copy-paste), and the failure mode is silent: a missing key renders as
 * the raw key id, a broken `{{placeholder}}` renders the literal braces, and a
 * malformed JSON file takes the whole language down at runtime. None of that is
 * caught by tsc or by the bundler, so it is caught here.
 *
 * Hard failures:
 *   1. a locale file is not valid JSON, or is not a flat object of strings
 *   2. its key set differs from the reference locale (missing or extra keys)
 *   3. its i18next placeholders (`{{name}}`) differ from the reference's
 *
 * Deliberately allowed:
 *   - an empty `{}` locale: a placeholder for a language that is registered but
 *     not translated yet, which falls back to the reference locale at runtime
 *
 * Also verified: the files on disk and `SUPPORTED_LANGS` in `src/lib/i18n/index.ts`
 * describe the same set of languages. They drift easily — the loader globs the
 * directory while i18next filters on the array — and a drifted language is one
 * that either never loads or never gets checked here.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const localesDir = resolve(here, '../src/lib/i18n/locales');
const i18nIndex = resolve(here, '../src/lib/i18n/index.ts');
const REFERENCE = 'en';

const errors = [];
const warnings = [];

function fail(file, message) {
  errors.push(`${file}: ${message}`);
}

/** `{{count}}` and `{{ count }}` are the same variable to i18next. */
function placeholdersOf(value) {
  const found = new Set();
  for (const match of value.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)) {
    found.add(match[1]);
  }
  return found;
}

function readLocale(file) {
  const raw = readFileSync(join(localesDir, file), 'utf8');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    fail(file, `invalid JSON — ${error.message}`);
    return null;
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    fail(file, 'expected a JSON object at the top level');
    return null;
  }
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value !== 'string') {
      fail(file, `key "${key}" is ${Array.isArray(value) ? 'an array' : typeof value}, expected a string`);
      return null;
    }
  }
  return parsed;
}

const files = readdirSync(localesDir)
  .filter((name) => name.endsWith('.json'))
  .sort();

if (!files.includes(`${REFERENCE}.json`)) {
  console.error(`check-locales: reference locale ${REFERENCE}.json is missing from ${localesDir}`);
  process.exit(1);
}

const reference = readLocale(`${REFERENCE}.json`);
if (!reference) {
  console.error(`check-locales: reference locale ${REFERENCE}.json is unreadable\n  ${errors.join('\n  ')}`);
  process.exit(1);
}

const referenceKeys = Object.keys(reference);
if (referenceKeys.length === 0) {
  console.error(`check-locales: reference locale ${REFERENCE}.json is empty`);
  process.exit(1);
}

const referencePlaceholders = new Map(
  referenceKeys.map((key) => [key, placeholdersOf(reference[key])]),
);

let emptyCount = 0;

for (const file of files) {
  if (file === `${REFERENCE}.json`) continue;

  const locale = readLocale(file);
  if (!locale) continue;

  const keys = Object.keys(locale);
  if (keys.length === 0) {
    // Registered but untranslated — falls back to the reference locale.
    emptyCount += 1;
    warnings.push(`${file}: empty, falls back to ${REFERENCE}`);
    continue;
  }

  const missing = referenceKeys.filter((key) => !(key in locale));
  const extra = keys.filter((key) => !(key in reference));
  if (missing.length) {
    fail(file, `${missing.length} missing key(s): ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ', …' : ''}`);
  }
  if (extra.length) {
    fail(file, `${extra.length} unknown key(s) not in ${REFERENCE}: ${extra.slice(0, 5).join(', ')}${extra.length > 5 ? ', …' : ''}`);
  }

  for (const key of referenceKeys) {
    const translated = locale[key];
    if (typeof translated !== 'string') continue;
    const expected = referencePlaceholders.get(key);
    const actual = placeholdersOf(translated);
    const lost = [...expected].filter((name) => !actual.has(name));
    const invented = [...actual].filter((name) => !expected.has(name));
    if (lost.length || invented.length) {
      const parts = [];
      if (lost.length) parts.push(`dropped {{${lost.join('}}, {{')}}}`);
      if (invented.length) parts.push(`introduced {{${invented.join('}}, {{')}}}`);
      fail(file, `key "${key}" ${parts.join(' and ')}`);
    }
  }
}

// --- locale files vs SUPPORTED_LANGS -----------------------------------------

const source = readFileSync(i18nIndex, 'utf8');
const listMatch = source.match(/SUPPORTED_LANGS\s*=\s*\[([\s\S]*?)\]\s*as const/);
if (!listMatch) {
  fail('src/lib/i18n/index.ts', 'could not find the SUPPORTED_LANGS array');
} else {
  const declared = [...listMatch[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  const onDisk = files.map((name) => name.replace(/\.json$/, ''));
  const notDeclared = onDisk.filter((code) => !declared.includes(code));
  const notOnDisk = declared.filter((code) => !onDisk.includes(code));
  if (notDeclared.length) {
    fail('src/lib/i18n/index.ts', `locale file(s) not in SUPPORTED_LANGS: ${notDeclared.join(', ')}`);
  }
  if (notOnDisk.length) {
    fail('src/lib/i18n/index.ts', `SUPPORTED_LANGS entries with no locale file: ${notOnDisk.join(', ')}`);
  }
}

// --- report -------------------------------------------------------------------

for (const warning of warnings) console.warn(`  warn  ${warning}`);

if (errors.length) {
  console.error(`\ncheck-locales: ${errors.length} problem(s)\n`);
  for (const error of errors) console.error(`  error ${error}`);
  console.error('');
  process.exit(1);
}

console.log(
  `check-locales: ${files.length} locales OK ` +
    `(${referenceKeys.length} keys, reference ${REFERENCE}` +
    `${emptyCount ? `, ${emptyCount} awaiting translation` : ''})`,
);
