import { detectSourceLang } from "@/lib/detectLang";

// South Asian languages that we treat as inherently regional (non-Latin scripts)
// If an article is in one of these, it is from a South Asian outlet and
// relevant to the regional view even without an explicit place-name in English.
const SOUTH_ASIAN_LANG_CODES = new Set([
  "ur",
  "hi",
  "ta",
  "te",
  "bn",
  "gu",
  "pa",
  "ml",
  "kn",
  "si",
  "my",
]);

// Gazetteer for English-language articles: if none of these appear in the
// syndicated title/description, the piece is not about the region (e.g. the
// iPhone launch on adaderana.lk that only has "Sri Lanka" in the site footer).
const SOUTH_ASIA_KEYWORDS = [
  // Countries / demonyms
  "india",
  "indian",
  "bharat",
  "pakistan",
  "pakistani",
  "bangladesh",
  "bangladeshi",
  "sri lanka",
  "srilanka",
  "sri lankan",
  "nepal",
  "nepali",
  "nepalese",
  "myanmar",
  "burma",
  "burmese",
  "bhutan",
  "bhutanese",
  "maldives",
  "maldivian",
  "afghanistan",
  "afghan",
  "tibet",
  "tibetan",
  // Indian states / major cities
  "delhi",
  "mumbai",
  "kolkata",
  "chennai",
  "bengaluru",
  "bangalore",
  "hyderabad",
  "ahmedabad",
  "pune",
  "jaipur",
  "lucknow",
  "kanpur",
  "kashmir",
  "punjab",
  "sindh",
  "balochistan",
  // Bangladesh
  "dhaka",
  "chittagong",
  "sylhet",
  "khulna",
  "rajshahi",
  // Pakistan
  "karachi",
  "lahore",
  "islamabad",
  "rawalpindi",
  "peshawar",
  "quetta",
  "faisalabad",
  // Sri Lanka – cities visible on the map
  "colombo",
  "kandy",
  "galle",
  "jaffna",
  "ampara",
  "badulla",
  "anuradhapura",
  "trincomalee",
  "batticaloa",
  "matara",
  "kurunegala",
  "hambantota",
  "hapura",
  // Nepal
  "kathmandu",
  "pokhara",
  "biratnagar",
  "lalitpur",
  // Myanmar
  "yangon",
  "mandalay",
  "naypyidaw",
  "mawlamyine",
  // Wider South-East Asia (kept in regional bundle)
  "thailand",
  "bangkok",
  "phuket",
  "vietnam",
  "hanoi",
  "saigon",
  "ho chi minh",
  "cambodia",
  "phnom penh",
  "laos",
  "vientiane",
  "malaysia",
  "kuala lumpur",
  "indonesia",
  "jakarta",
  "philippines",
  "manila",
  // Regional water / geography that appears in genuine hotspots
  "bay of bengal",
  "arabian sea",
  "indian ocean",
  "himalaya",
  "everest",
];

export function isRssRelevantForMap(
  title: string,
  description: string,
): boolean {
  const lang = detectSourceLang(title) || detectSourceLang(description);
  if (lang && SOUTH_ASIAN_LANG_CODES.has(lang)) {
    // Tamil/Hindi/Sinhala/Burmese etc. from a South Asian BBC service is
    // regionally relevant by definition — keep it even without an English keyword.
    return true;
  }
  // English article: require an explicit South-Asia place-name in the
  // syndicated title/description (not in site chrome/footer, which we never ingest).
  const haystack = `${title} ${description}`.toLowerCase();
  return SOUTH_ASIA_KEYWORDS.some((kw) => haystack.includes(kw));
}
