export const SUPPORTED_LOCALES = ["en", "zh-Hant", "zh-Hans"];

export const LOCALE_LABELS = {
  en: { short: "EN", full: "English" },
  "zh-Hant": { short: "繁中", full: "繁體中文（香港）" },
  "zh-Hans": { short: "简中", full: "简体中文" },
};

export const translations = {
  en: {
    title: "Student Risk Predictor",
    subtitle: "Informational academic coaching...",
    
    // TODO: Add ALL other English translation keys here.
    // Reference the spec or the proposal for exact text.
    // Keys needed: disclaimerTitle, disclaimerBody, disclaimerCrisis, 
    // disclaimerCedars, disclaimerEmergency, loadingForm, submit, 
    // submitLoading, range, loadingTitle, loadingSub, keyFactors, 
    // zBands, advice, crisisBanner, fallbackNote, tierVeryLow, tierLow, 
    // tierModerate, tierHigh, probability.
    
    fields: {
      Study_Hours_Per_Day: "Study Hours Per Day",
      // TODO: Add the other 7 fields.
    },
  },
  
  "zh-Hant": {
    // TODO: Translate ALL keys from the 'en' object into Traditional Chinese (HK).
  },
  
  "zh-Hans": {
    // TODO: Translate ALL keys from the 'en' object into Simplified Chinese.
  },
};

export function getTranslations(locale) {
  return translations[locale] || translations.en;
}
