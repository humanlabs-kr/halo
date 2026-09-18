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
  'ar',
  'bn',
  'de-AT',
  'de-CH',
  'de-DE',
  'en',
  'en-GB',
  'es-419',
  'es-ES',
  'fa',
  'fr-CA',
  'fr-FR',
  'hi',
  'id',
  'it',
  'ja',
  'kn',
  'ko',
  'mr',
  'ms-ID',
  'ms-MY',
  'nl-BE',
  'nl-NL',
  'pa-Arab',
  'pa-Guru',
  'pl',
  'pt-BR',
  'pt-PT',
  'ru',
  'sw',
  'ta',
  'te',
  'th',
  'tl',
  'tr',
  'uk',
  'ur',
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
  pa: ['pa-Guru'],
  pt: ['pt-BR'],
  zh: ['zh-CN'],
  'zh-Hant': ['zh-TW'],
  default: ['en'],
} as const;

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
    nonExplicitSupportedLngs: true,
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
