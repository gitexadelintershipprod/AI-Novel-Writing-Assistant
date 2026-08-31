import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import common from "./locales/en/common";
import navigation from "./locales/en/navigation";

void i18n.use(initReactI18next).init({
  resources: {
    en: {
      common,
      navigation,
    },
  },
  lng: "en",
  fallbackLng: "en",
  supportedLngs: ["en"],
  defaultNS: "common",
  ns: ["common", "navigation"],
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;
