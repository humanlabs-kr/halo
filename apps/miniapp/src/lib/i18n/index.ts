import i18n, { type BackendModule, type ReadCallback } from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';

/**
 * Every locale Halo ships. Single source of truth: the i18next `supportedLngs`,
 * the lazy loader below and `scripts/check-locales.mjs` all read this list, so a
 * file added to `locales/` without being listed here fails `pnpm test`.
 */
export const SUPPORTED_LANGS = [
  'de-DE',
  'en',
  'en-GB',
  'es-419',
  'es-ES',
  'fr-FR',
  'hi',
  'id',
  'ja',
  'ko',
  'ms-MY',
  'nl-NL',
  'pl',
  'pt-BR',
  'pt-PT',
  'sw',
  'th',
  'tl',
  'vi',
  'zh-CN',
  'zh-TW',
] as const;

export type LangCode = (typeof SUPPORTED_LANGS)[number];

/** Locale file used as the reference for `check-locales` and as the fallback. */
export const REFERENCE_LANG: LangCode = 'en';

/**
 * Most of our languages only exist as regional variants. A device reporting the
 * bare language ("de", not "de-DE") would otherwise drop straight to English.
 */
const BASE_LANGUAGE_FALLBACKS = {
  de: ['de-DE'],
  es: ['es-ES'],
  fr: ['fr-FR'],
  ms: ['ms-MY'],
  nl: ['nl-NL'],
  pt: ['pt-BR'],
  zh: ['zh-CN'],
  'zh-Hant': ['zh-TW'],
  default: ['en'],
} as const;

/**
 * Names for the language picker.
 *
 * Endonyms, not English names: someone who cannot read the current UI language
 * is exactly the person using this list, so "한국어" has to be findable without
 * reading "Korean". Written out rather than derived from `Intl.DisplayNames`
 * so the picker cannot change wording between devices or come back blank on a
 * webview with a trimmed ICU build.
 */
export const LANGUAGE_NAMES: Record<LangCode, string> = {
  'de-DE': 'Deutsch',
  en: 'English',
  'en-GB': 'English (UK)',
  'es-419': 'Español (Latinoamérica)',
  'es-ES': 'Español (España)',
  'fr-FR': 'Français',
  hi: 'हिन्दी',
  id: 'Bahasa Indonesia',
  ja: '日本語',
  ko: '한국어',
  'ms-MY': 'Bahasa Melayu',
  'nl-NL': 'Nederlands',
  pl: 'Polski',
  'pt-BR': 'Português (Brasil)',
  'pt-PT': 'Português (Portugal)',
  sw: 'Kiswahili',
  th: 'ไทย',
  tl: 'Filipino',
  vi: 'Tiếng Việt',
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
};

/**
 * Locale loaders, one dynamic chunk per language.
 *
 * Importing all 40 files at the top level would put every translation of the
 * app into the main bundle (~300 KB of JSON) so that each user could read one
 * of them. `import.meta.glob` without `eager` leaves them as separate chunks
 * that are fetched on demand; only `en` is bundled, as the fallback that must
 * always be present for first paint.
 */
const localeLoaders = import.meta.glob<{ default: Record<string, string> }>('./locales/*.json');

const lazyLocaleBackend: BackendModule = {
  type: 'backend',
  init: () => {
    // No options to read — the loader map is resolved at build time.
  },
  read: (language: string, _namespace: string, callback: ReadCallback) => {
    const load = localeLoaders[`./locales/${language}.json`];
    if (!load) {
      // Not an error: i18next also asks for intermediate forms such as "ko-KR"
      // before falling back to "ko". An empty bundle lets that resolution run.
      callback(null, {});
      return;
    }
    load()
      .then((module) => callback(null, module.default))
      .catch((error: unknown) => callback(error as Error, false));
  },
};

void i18n
  .use(lazyLocaleBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // `en` ships in the main bundle; every other language arrives through the
    // backend above. `partialBundledLanguages` is what lets the two coexist.
    resources: { en: { translation: en } },
    partialBundledLanguages: true,
    fallbackLng: BASE_LANGUAGE_FALLBACKS,
    supportedLngs: [...SUPPORTED_LANGS],
    // `nonExplicitSupportedLngs` must stay off, and the reason is not obvious.
    //
    // When it is on, i18next reduces a code to its base language *before*
    // checking `supportedLngs`:
    //
    //   isSupportedCode('de-DE') -> supportedLngs.includes('de')
    //
    // Eleven of the twenty-one locales we ship are region-tagged (de-DE,
    // pt-BR, zh-CN, es-419, …) and the bare forms are deliberately not in the
    // list, so every one of them was judged unsupported and fell back to
    // English — about a fifth of our users, with no error anywhere. The locale
    // files were complete and `check-locales` was green the whole time;
    // nothing but rendering the page in German could show it.
    //
    // Bare codes are already handled, and handled better, by
    // `BASE_LANGUAGE_FALLBACKS` above: a device reporting "de" resolves to
    // de-DE explicitly, instead of i18next guessing.
    nonExplicitSupportedLngs: false,
    // Locale files are flat maps of string to string — `check-locales` fails
    // the build on anything else — so i18next's structural separators have no
    // job here, and leaving them on breaks real keys. Source-text keys are
    // keyed by their English copy, and "Free download on iOS & Android."
    // would otherwise be read as a path into a nested object that does not
    // exist: the lookup misses, i18next returns the key, and the string
    // renders in English in every language while looking perfectly fine.
    // A key containing ":" ("Mine:") is worse — it parses as a namespace and
    // renders as nothing at all.
    keySeparator: false,
    nsSeparator: false,
    interpolation: {
      escapeValue: false, // React escapes on render.
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'halo.lang',
    },
    react: {
      // Without Suspense a language switch re-renders with the fallback text
      // already on screen. With it, every screen would blank out while a
      // locale chunk loads — worse on the slow networks our users are on.
      useSuspense: false,
    },
  });

export function changeLanguage(code: LangCode): Promise<unknown> {
  return i18n.changeLanguage(code);
}

export default i18n;
