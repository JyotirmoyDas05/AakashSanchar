// Lightweight, dependency-free source-language detection based on Unicode
// script ranges. Used to decide whether the TRANSLATE button is meaningful
// (non-Latin scripts) and to pick a candidate `from` lang for the translate
// API. Returns an ISO 639-1 code, or null for Latin-script (assumed English).
const RANGES: { code: string; re: RegExp }[] = [
  { code: "ur", re: /[؀-ۿ]/ }, // Arabic / Persian / Urdu
  { code: "ru", re: /[Ѐ-ӿ]/ }, // Cyrillic
  { code: "hi", re: /[ऀ-ॿ]/ }, // Devanagari (Hindi/Nepali/Marathi)
  { code: "ta", re: /[஀-௿]/ }, // Tamil
  { code: "te", re: /[ఀ-౿]/ }, // Telugu
  { code: "bn", re: /[ঀ-৿]/ }, // Bengali
  { code: "gu", re: /[઀-િ]/ }, // Gujarati
  { code: "pa", re: /[਀-੿]/ }, // Gurmukhi (Punjabi)
  { code: "ml", re: /[ഀ-ി]/ }, // Malayalam
  { code: "kn", re: /[ಀ-ಕ೿]/ }, // Kannada
  { code: "si", re: /[඀-෿]/ }, // Sinhala
  { code: "my", re: /[က-႟]/ }, // Burmese (Myanmar)
];

export function detectSourceLang(text: string): string | null {
  if (!text) return null;
  for (const r of RANGES) {
    if (r.re.test(text)) return r.code;
  }
  return null;
}
