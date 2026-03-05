import React, { createContext, useContext, useState, useEffect } from 'react'
import { translations, type Locale, type Translations } from '../i18n/translations'

interface LangContextType {
  locale: Locale
  setLocale: (l: Locale) => void
  t: Translations
}

const LangContext = createContext<LangContextType | undefined>(undefined)

const STORAGE_KEY = 'app_locale'

export const LangProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && saved in translations) return saved as Locale
    // Autodetect from browser
    const lang = navigator.language?.slice(0, 2)
    if (lang === 'en') return 'en'
    if (lang === 'pt') return 'pt'
    if (lang === 'it') return 'it'
    return 'es'
  })

  const setLocale = (l: Locale) => {
    setLocaleState(l)
    localStorage.setItem(STORAGE_KEY, l)
  }

  // Update <html lang> attribute
  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  return (
    <LangContext.Provider value={{ locale, setLocale, t: translations[locale] }}>
      {children}
    </LangContext.Provider>
  )
}

export const useLang = (): LangContextType => {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error('useLang must be used within LangProvider')
  return ctx
}