import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpBackend, { HttpBackendOptions } from "i18next-http-backend";
import { initReactI18next } from "react-i18next";

i18n
  .use(LanguageDetector)
  .use(HttpBackend)
  .use(initReactI18next)
  .init<HttpBackendOptions>({
    backend: {
      loadPath: "/locales/{{lng}}.json",
    },
    supportedLngs: [
      "ar",
      "bn",
      "de-AT",
      "de-CH",
      "de-DE",
      "en-GB",
      "en-US",
      "es-419",
      "es-ES",
      "fa",
      "fr-CA",
      "fr-FR",
      "hi",
      "id",
      "it",
      "ja",
      "kn",
      "ko",
      "mr",
      "ms-ID",
      "ms-MY",
      "nl-BE",
      "nl-NL",
      "pa-Arab",
      "pa-Guru",
      "pl",
      "pt-BR",
      "pt-PT",
      "ru",
      "sw",
      "ta",
      "te",
      "th",
      "tl",
      "tr",
      "uk",
      "ur",
      "vi",
      "zh-CN",
      "zh-TW",
    ],
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
