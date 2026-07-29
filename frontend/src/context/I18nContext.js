import React, { createContext, useContext, useState } from "react";
import { strings } from "../i18n/translations";

const I18nContext = createContext(null);

export const I18nProvider = ({ children }) => {
  const [lang, setLang] = useState(localStorage.getItem("agribid_lang") || "en");
  const toggle = () => {
    const next = lang === "en" ? "hi" : "en";
    setLang(next);
    localStorage.setItem("agribid_lang", next);
  };
  const t = (key) => (strings[key] ? strings[key][lang] || strings[key].en : key);
  return (
    <I18nContext.Provider value={{ lang, toggle, t }}>{children}</I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);



