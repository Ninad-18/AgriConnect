import i18n, { type SupportedLanguage } from "@/i18n";

export interface ProductLocaleMap {
  canonicalKey: string;
  en: string;
  hi: string;
  mr: string;
}

/**
 * Built-in catalogue of supported agricultural produce with verified translations.
 */
export const PRODUCT_CATALOGUE: Record<string, ProductLocaleMap> = {
  cauliflower: {
    canonicalKey: "cauliflower",
    en: "Cauliflower",
    hi: "फूलगोभी",
    mr: "फुलकोबी",
  },
  greenchilli: {
    canonicalKey: "greenChilli",
    en: "Green Chilli",
    hi: "हरी मिर्च",
    mr: "हिरवी मिरची",
  },
  onion: {
    canonicalKey: "onion",
    en: "Onion",
    hi: "प्याज",
    mr: "कांदा",
  },
  potato: {
    canonicalKey: "potato",
    en: "Potato",
    hi: "आलू",
    mr: "बटाटा",
  },
  rice: {
    canonicalKey: "rice",
    en: "Rice",
    hi: "चावल",
    mr: "तांदूळ",
  },
  "rice (basmati)": {
    canonicalKey: "riceBasmati",
    en: "Rice (Basmati)",
    hi: "चावल (बासमती)",
    mr: "तांदूळ (बासमती)",
  },
  sugarcane: {
    canonicalKey: "sugarcane",
    en: "Sugarcane",
    hi: "गन्ना",
    mr: "ऊस",
  },
  tomato: {
    canonicalKey: "tomato",
    en: "Tomato",
    hi: "टमाटर",
    mr: "टोमॅटो",
  },
  wheat: {
    canonicalKey: "wheat",
    en: "Wheat",
    hi: "गेहूँ",
    mr: "गहू",
  },
  chilli: {
    canonicalKey: "chilli",
    en: "Chilli",
    hi: "मिर्च",
    mr: "मिरची",
  },
  paddy: {
    canonicalKey: "paddy",
    en: "Paddy",
    hi: "धान",
    mr: "भात",
  },
  maize: {
    canonicalKey: "maize",
    en: "Maize",
    hi: "मक्का",
    mr: "मका",
  },
  bajra: {
    canonicalKey: "bajra",
    en: "Bajra",
    hi: "बाजरा",
    mr: "बाजरी",
  },
  jowar: {
    canonicalKey: "jowar",
    en: "Jowar",
    hi: "ज्वार",
    mr: "ज्वारी",
  },
  soybean: {
    canonicalKey: "soybean",
    en: "Soybean",
    hi: "सोयाबीन",
    mr: "सोयाबीन",
  },
  groundnut: {
    canonicalKey: "groundnut",
    en: "Groundnut",
    hi: "मूंगफली",
    mr: "शेंगदाणा",
  },
  cotton: {
    canonicalKey: "cotton",
    en: "Cotton",
    hi: "कपास",
    mr: "कापूस",
  },
  ladyfinger: {
    canonicalKey: "ladyfinger",
    en: "Ladyfinger",
    hi: "भिंडी",
    mr: "भेंडी",
  },
  brinjal: {
    canonicalKey: "brinjal",
    en: "Brinjal",
    hi: "बैंगन",
    mr: "वांगी",
  },
  cabbage: {
    canonicalKey: "cabbage",
    en: "Cabbage",
    hi: "पत्तागोभी",
    mr: "कोबी",
  },
  mango: {
    canonicalKey: "mango",
    en: "Mango",
    hi: "आम",
    mr: "आंबा",
  },
  banana: {
    canonicalKey: "banana",
    en: "Banana",
    hi: "केला",
    mr: "केळी",
  },
  grapes: {
    canonicalKey: "grapes",
    en: "Grapes",
    hi: "अंगूर",
    mr: "द्राक्षे",
  },
  orange: {
    canonicalKey: "orange",
    en: "Orange",
    hi: "संतरा",
    mr: "संत्री",
  },
  guava: {
    canonicalKey: "guava",
    en: "Guava",
    hi: "अमरूद",
    mr: "पेरू",
  },
  apple: {
    canonicalKey: "apple",
    en: "Apple",
    hi: "सेब",
    mr: "सफरचंद",
  },
  turmeric: {
    canonicalKey: "turmeric",
    en: "Turmeric",
    hi: "हल्दी",
    mr: "हळद",
  },
  ginger: {
    canonicalKey: "ginger",
    en: "Ginger",
    hi: "अदरक",
    mr: "आले",
  },
  mustard: {
    canonicalKey: "mustard",
    en: "Mustard",
    hi: "सरसों",
    mr: "मोहरी",
  },
};

/**
 * Normalizes input string and finds matching catalogue entry if known.
 */
export function findCatalogueEntry(rawName?: string | null): ProductLocaleMap | undefined {
  if (!rawName) return undefined;
  const trimmed = rawName.trim();
  const lower = trimmed.toLowerCase();
  const stripped = lower.replace(/[^a-z0-9]/g, "");

  // Match directly in catalog
  for (const [key, entry] of Object.entries(PRODUCT_CATALOGUE)) {
    const entryStripped = key.replace(/[^a-z0-9]/g, "");
    if (lower === key || stripped === entryStripped) {
      return entry;
    }
  }

  // Common spelling variants
  if (stripped === "greenchili") return PRODUCT_CATALOGUE["greenchilli"];
  if (stripped === "chili") return PRODUCT_CATALOGUE["chilli"];

  return undefined;
}

/**
 * Returns localized product/crop name for current language, or fallback to original name.
 */
export function getLocalizedProductName(
  rawName: string | undefined | null,
  fallbackName?: string | null,
  lang?: SupportedLanguage
): string {
  if (!rawName && !fallbackName) return "";
  const target = rawName || fallbackName || "";
  const entry = findCatalogueEntry(target);
  if (!entry) return target;

  const currentLang: SupportedLanguage =
    lang || ((i18n.language?.slice(0, 2) as SupportedLanguage) || "en");

  // Check i18n resources first, fallback to catalogue dictionary
  const translated = i18n.t(`common:products.${entry.canonicalKey}`, {
    defaultValue: entry[currentLang] ?? entry.en,
    lng: currentLang,
  });

  return translated || entry[currentLang] || entry.en;
}

/**
 * Checks if search query matches crop name in raw English, active locale, or any supported catalog locale.
 */
export function matchesProductSearch(
  rawName: string | undefined | null,
  query: string
): boolean {
  if (!rawName) return false;
  const q = query.trim().toLowerCase();
  if (!q) return true;

  // 1. Raw name match
  if (rawName.toLowerCase().includes(q)) return true;

  // 2. Active localized name match
  const localized = getLocalizedProductName(rawName);
  if (localized.toLowerCase().includes(q)) return true;

  // 3. Any catalog translation match
  const entry = findCatalogueEntry(rawName);
  if (entry) {
    if (entry.en.toLowerCase().includes(q)) return true;
    if (entry.hi.toLowerCase().includes(q)) return true;
    if (entry.mr.toLowerCase().includes(q)) return true;
  }

  return false;
}
