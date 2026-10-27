import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enCommon from "./locales/en/common.json";
import enAuth from "./locales/en/auth.json";
import enLanding from "./locales/en/landing.json";
import enShared from "./locales/en/shared.json";
import enFarmer from "./locales/en/farmer.json";
import enSupplier from "./locales/en/supplier.json";
import enCustomer from "./locales/en/customer.json";

import hiCommon from "./locales/hi/common.json";
import hiAuth from "./locales/hi/auth.json";
import hiLanding from "./locales/hi/landing.json";
import hiShared from "./locales/hi/shared.json";
import hiFarmer from "./locales/hi/farmer.json";
import hiSupplier from "./locales/hi/supplier.json";
import hiCustomer from "./locales/hi/customer.json";

import mrCommon from "./locales/mr/common.json";
import mrAuth from "./locales/mr/auth.json";
import mrLanding from "./locales/mr/landing.json";
import mrShared from "./locales/mr/shared.json";
import mrFarmer from "./locales/mr/farmer.json";
import mrSupplier from "./locales/mr/supplier.json";
import mrCustomer from "./locales/mr/customer.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", nativeName: "English" },
  { code: "hi", label: "Hindi", nativeName: "हिन्दी" },
  { code: "mr", label: "Marathi", nativeName: "मराठी" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];

export const LANGUAGE_STORAGE_KEY = "agriconnect_lang";

export function getInitialLanguage(): SupportedLanguage {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      const code = stored ? (stored.slice(0, 2).toLowerCase() as SupportedLanguage) : undefined;
      if (code === "hi" || code === "mr" || code === "en") {
        return code;
      }
    }
  } catch {
    // Fallback on security/access error
  }
  return "en";
}

export const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    landing: enLanding,
    shared: enShared,
    farmer: enFarmer,
    supplier: enSupplier,
    customer: enCustomer,
  },
  hi: {
    common: hiCommon,
    auth: hiAuth,
    landing: hiLanding,
    shared: hiShared,
    farmer: hiFarmer,
    supplier: hiSupplier,
    customer: hiCustomer,
  },
  mr: {
    common: mrCommon,
    auth: mrAuth,
    landing: mrLanding,
    shared: mrShared,
    farmer: mrFarmer,
    supplier: mrSupplier,
    customer: mrCustomer,
  },
} as const;

const initialLang = getInitialLanguage();

i18n.use(initReactI18next).init({
  resources,
  lng: initialLang,
  fallbackLng: "en",
  defaultNS: "common",
  fallbackNS: "common",
  ns: ["common", "auth", "landing", "shared", "farmer", "supplier", "customer"],
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

if (typeof document !== "undefined") {
  document.documentElement.lang = initialLang;
}

i18n.on("languageChanged", (lng: string) => {
  try {
    const code = (lng?.slice(0, 2).toLowerCase() as SupportedLanguage) || "en";
    if (typeof window !== "undefined" && window.localStorage) {
      if (code === "en" || code === "hi" || code === "mr") {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, code);
      }
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = code;
    }
  } catch {
    // Ignore storage errors
  }
});

export async function setAppLanguage(lang: SupportedLanguage) {
  const code = (lang?.slice(0, 2).toLowerCase() as SupportedLanguage) || "en";
  if (code === "en" || code === "hi" || code === "mr") {
    await i18n.changeLanguage(code);
  }
}

export default i18n;
