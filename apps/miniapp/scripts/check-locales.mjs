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
 *   2. it is missing an opaque key (`L-xxxxxxxx`) the reference locale has
 *   3. it carries a key the reference locale does not (see below)
 *   4. its i18next placeholders (`{{name}}`) differ from the reference's
 *
 * Deliberately allowed:
 *   - an empty `{}` locale: a placeholder for a language that is registered but
 *     not translated yet, which falls back to the reference locale at runtime
 *   - a locale omitting a SOURCE-TEXT key. Halo uses two kinds of key. An
 *     opaque id (`L-fZMUbLsR`) renders as itself when it is missing — the user
 *     sees "L-fZMUbLsR" on the button — so every locale must carry every one
 *     of them. A source-text key IS its English copy ("Claim Now"), so a
 *     locale that omits it falls back to correct English. Requiring those
 *     everywhere would mean pasting the English string into 31 files that
 *     have no translation for it, which reports as translated and is not.
 *
 * Rule 3 stays absolute, including for source-text keys: it is what forces a
 * new key into the reference locale, and it is load-bearing. The cross-promo
 * shipped source-text keys the reference locale did not declare; this check
 * called every one of them "unknown", and the fix applied was to delete nine
 * languages' worth of translation rather than to declare the keys.
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

/**
 * Opaque ids are mandatory in every locale; source-text keys are not. See the
 * header — the difference is what a missing key renders as.
 */
function isOpaqueKey(key) {
  return /^L-/.test(key);
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

  const missing = referenceKeys.filter((key) => isOpaqueKey(key) && !(key in locale));
  const untranslated = referenceKeys.filter((key) => !isOpaqueKey(key) && !(key in locale));
  const extra = keys.filter((key) => !(key in reference));
  if (missing.length) {
    fail(file, `${missing.length} missing key(s): ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? ', …' : ''}`);
  }
  if (untranslated.length) {
    // Reported, not failed: English is a correct rendering, just not a
    // translated one. The count is here so the gap stays visible.
    warnings.push(`${file}: ${untranslated.length} source-text key(s) untranslated, falling back to ${REFERENCE}`);
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

// --- source code vs the reference locale --------------------------------------

/**
 * The direction the checks above cannot see.
 *
 * Everything so far compares locale files to `en.json`. Nothing compared
 * `en.json` to the code that actually calls `t()`. A source-text key that the
 * reference locale never declares still *renders* — i18next falls back to the
 * key, which is the English copy — so the screen looks finished in English and
 * is silently untranslatable in all 39 other languages. There is no runtime
 * symptom to notice and no type error to catch it.
 *
 * That is not hypothetical: 117 keys across the payouts, email-verification,
 * raffle-entry and raffle-history screens were in this state, which is most of
 * four screens shipping English to every locale.
 *
 * Keys built at runtime (`t(someVariable)`) cannot be found this way. Those are
 * declared in `lib/constants.ts` and are opaque ids, so rule 2 already forces
 * them into every locale.
 */
const srcDir = resolve(here, '../src');

function collectSourceFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'locales' && entry.name !== 'node_modules') out.push(...collectSourceFiles(full));
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Each pattern is paired with the quote character it matched, because the
 * unescaping differs and the content cannot tell you which it was: one key is
 * written in single quotes and contains a literal `"TOTAL"`.
 */
const PATTERNS = [
  ['"', /\bt\(\s*"((?:[^"\\]|\\.)*)"/g],
  ["'", /\bt\(\s*'((?:[^'\\]|\\.)*)'/g],
  ['"', /i18nKey=\{?\s*"((?:[^"\\]|\\.)*)"/g],
  ["'", /i18nKey=\{?\s*'((?:[^'\\]|\\.)*)'/g],
];

const referenced = new Map();

for (const file of collectSourceFiles(srcDir)) {
  const text = readFileSync(file, 'utf8');
  for (const [quote, pattern] of PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      // The captured text is still escaped the way the source wrote it.
      const key =
        quote === '"'
          ? JSON.parse(`"${match[1]}"`)
          : match[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\');
      if (!referenced.has(key)) referenced.set(key, file.slice(srcDir.length + 1));
    }
  }
}

const undeclared = [...referenced.keys()].filter((key) => !referenceKeys.includes(key));

if (undeclared.length) {
  for (const key of undeclared.slice(0, 20)) {
    fail(`${REFERENCE}.json`, `"${key}" is used in ${referenced.get(key)} but not declared here`);
  }
  if (undeclared.length > 20) {
    fail(`${REFERENCE}.json`, `…and ${undeclared.length - 20} more undeclared key(s)`);
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

const opaqueCount = referenceKeys.filter(isOpaqueKey).length;

console.log(
  `check-locales: ${files.length} locales OK ` +
    `(${referenceKeys.length} keys — ${opaqueCount} ids, ` +
    `${referenceKeys.length - opaqueCount} source-text — reference ${REFERENCE}` +
    `${emptyCount ? `, ${emptyCount} awaiting translation` : ''})`,
);
