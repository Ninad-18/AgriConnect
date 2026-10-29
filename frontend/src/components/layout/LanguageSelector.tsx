import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Globe, Check, ChevronDown } from "lucide-react";
import { SUPPORTED_LANGUAGES, setAppLanguage, type SupportedLanguage } from "@/i18n";

export default function LanguageSelector() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLang = (i18n.language?.slice(0, 2) as SupportedLanguage) || "en";
  const currentObj =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentLang) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleSelect = async (code: SupportedLanguage) => {
    await setAppLanguage(code);
    setOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50 hover:border-forest/40 focus:outline-none focus:ring-2 focus:ring-forest/30"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Select Language"
        title="Change language / भाषा बदलें"
      >
        <Globe className="h-3.5 w-3.5 text-forest" />
        <span className="hidden sm:inline">{currentObj.nativeName}</span>
        <span className="sm:hidden font-medium uppercase">{currentObj.code}</span>
        <ChevronDown className="h-3 w-3 text-stone-400" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Language options"
          className="absolute right-0 z-50 mt-1.5 w-36 origin-top-right rounded-xl border border-stone-200 bg-white py-1 shadow-lg ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100"
        >
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = lang.code === currentLang;
            return (
              <button
                key={lang.code}
                role="option"
                aria-selected={isSelected}
                type="button"
                onClick={() => handleSelect(lang.code)}
                className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition ${
                  isSelected
                    ? "bg-forest/10 font-bold text-forest"
                    : "text-stone-700 hover:bg-stone-50"
                }`}
              >
                <span>{lang.nativeName}</span>
                {isSelected && <Check className="h-3.5 w-3.5 text-forest" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
