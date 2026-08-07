import { detectSourceLang } from "@/lib/detectLang";
import { bucketForTag } from "@/lib/tagPalette";
import type { NewsCategory } from "@/types/news";

// Heuristic tag derivation with word boundaries, attribution stripping, and kinetic priority.

type TagDef = {
  tag: string;
  keywords: string[];
  weight?: number;
};

function matchesWordOrPhrase(text: string, kw: string): boolean {
  if (!text || !kw) return false;
  const kwLower = kw.toLowerCase();
  const textLower = text.toLowerCase();
  if (kwLower.includes(" ") || kwLower.includes("-") || kwLower.includes("/")) {
    return textLower.includes(kwLower);
  }
  const escaped = kwLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\b${escaped}\\b`, "i");
  return re.test(textLower);
}

function stripAttributions(text: string): string {
  return text
    .replace(
      /(?:local\s+)?(?:hospital|health|police|military|government|security|emergency|un|who)\s+officials\s+(?:said|stated|reported|confirmed)[^,.]*[,.]?/gi,
      " ",
    )
    .replace(
      /(?:according\s+to|spokesperson\s+for|statement\s+from|sources\s+at)\s+[^,.]*[,.]?/gi,
      " ",
    )
    .replace(/(?:officials\s+at\s+[^,.]+\s+said)[^,.]*[,.]?/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const TAG_DEFS: TagDef[] = [
  {
    tag: "Airstrike",
    keywords: [
      "airstrike",
      "airstrikes",
      "air strike",
      "air strikes",
      "drone strike",
      "drone strikes",
      "air raid",
      "air raids",
      "missile",
      "missiles",
      "missile strike",
      "missile attack",
      "rocket strike",
      "rocket attack",
      "strikes on",
      "israeli strikes",
      "russian strikes",
      "aerial bombardment",
      "fighter jet",
      "strike",
      "strikes",
    ],
  },
  {
    tag: "Armed Clash",
    keywords: [
      "clash",
      "clashes",
      "combat",
      "troops",
      "military",
      "shelling",
      "bombing",
      "bombings",
      "gunfire",
      "gunman",
      "gunmen",
      "shooting",
      "shootings",
      "explosion",
      "explosions",
      "conflict",
      "attack",
      "attacks",
      "terror attack",
      "militant",
      "militants",
      "insurgent",
      "insurgents",
      "terrorist",
      "terrorists",
      "blast",
      "blasts",
      "armed conflict",
      "security forces",
      "hostage",
      "insurgency",
      "ambush",
      "cross-border firing",
      "kills at least",
      "killed in attack",
      "killed in strikes",
      "kills",
      "killed",
      "warfare",
      "casualty",
      "casualties",
      "warzone",
    ],
  },
  {
    tag: "Surgery",
    keywords: [
      "surgery",
      "surgeries",
      "neurosurgeon",
      "neurosurgeons",
      "brain surgery",
      "microsurgical",
      "minimally invasive",
      "surgical",
      "transplant",
      "transplants",
      "oncology",
      "cardiology",
      "cardiac surgery",
      "orthopedic",
      "pediatric surgery",
    ],
  },
  {
    tag: "Health",
    keywords: [
      "healthcare",
      "hospital",
      "hospitals",
      "doctor",
      "doctors",
      "treatment",
      "treatments",
      "clinical",
      "patient",
      "patients",
      "medical",
      "vaccine",
      "vaccines",
      "disease",
      "therapy",
      "physician",
      "pharmaceutical",
      "drug trial",
    ],
  },
  {
    tag: "Outbreak",
    keywords: [
      "outbreak",
      "outbreaks",
      "dengue",
      "ebola",
      "cholera",
      "pandemic",
      "epidemic",
      "virus",
      "influenza",
      "avian flu",
      "health emergency",
      "who warns",
      "who issues",
      "contagion",
    ],
  },
  {
    tag: "Flood",
    keywords: [
      "flood",
      "floods",
      "flash flood",
      "flash floods",
      "inundated",
      "inundation",
      "heavy rainfall",
      "monsoon",
      "rainfall forecast",
      "landslide",
      "landslides",
      "submerged",
      "deluge",
      "waterlogging",
    ],
  },
  {
    tag: "Quake",
    keywords: [
      "earthquake",
      "earthquakes",
      "tremor",
      "tremors",
      "seismic",
      "magnitude",
      "quake",
      "quakes",
      "aftershock",
      "aftershocks",
      "fault line",
    ],
  },
  {
    tag: "Cyclone",
    keywords: [
      "cyclone",
      "cyclones",
      "hurricane",
      "hurricanes",
      "typhoon",
      "typhoons",
      "storm",
      "storms",
      "bay of bengal",
      "gale",
    ],
  },
  {
    tag: "Wildfire",
    keywords: [
      "wildfire",
      "wildfires",
      "forest fire",
      "bushfire",
      "volcano",
      "eruption",
    ],
  },
  {
    tag: "Judiciary",
    keywords: [
      "court",
      "high court",
      "supreme court",
      "lawyer",
      "lawyers",
      "police investigation",
      "investigation",
      "inquiry",
      "verdict",
      "bail",
      "judiciary",
      "prosecutor",
      "chargesheet",
      "tribunal",
      "accused",
      "magistrate",
      "legal action",
      "hearing",
    ],
  },
  {
    tag: "Governance",
    keywords: [
      "cabinet",
      "parliament",
      "minister",
      "governance",
      "policy",
      "reform",
      "budget",
      "administration",
      "assembly",
      "committee",
      "ordinance",
      "legislation",
    ],
  },
  {
    tag: "Diplomacy",
    keywords: [
      "diplomacy",
      "diplomatic",
      "talks",
      "agreement",
      "connectivity",
      "trade corridors",
      "border talks",
      "confidence-building",
      "delegation",
      "bilateral",
      "envoy",
      "summit",
    ],
  },
  {
    tag: "Ceasefire Talks",
    keywords: [
      "ceasefire",
      "truce",
      "de-escalate",
      "de-escalation",
      "peace talks",
      "cease fire",
    ],
  },
  {
    tag: "Product Launch",
    keywords: [
      "iphone",
      "apple",
      "samsung",
      "unveil",
      "flagship",
      "launch next iphone",
      "apple event",
      "ceo ternus",
      "new iphone",
      "first major event under new ceo",
    ],
  },
  {
    tag: "Cinema",
    keywords: [
      "marvel",
      "avengers",
      "doomsday",
      "film",
      "cinema",
      "trailer",
      "box office",
      "movie",
      "sairaat",
      "film to watch",
      "bollywood",
      "hollywood",
    ],
  },
  {
    tag: "Sports",
    keywords: [
      "ipl",
      "cricket",
      "football",
      "kolhapur football",
      "match",
      "tournament",
      "esala perahera",
      "kandy esala",
      "world cup",
      "olympics",
      "championship",
    ],
  },
  {
    tag: "Market Gain",
    keywords: [
      "buy rating",
      "accumulate",
      "bullish",
      "target rs",
      "target of rs",
      "sensex gains",
      "nifty gains",
      "market gains",
      "upgrade",
      "stocks rally",
    ],
  },
  {
    tag: "Market Rout",
    keywords: [
      "sell rating",
      "reduce rating",
      "bearish",
      "market rout",
      "market fall",
      "fell sharply",
      "equity markets fell",
      "slump",
      "crash",
      "downgrade",
      "inflation spike",
    ],
  },
  {
    tag: "Election",
    keywords: [
      "election",
      "by-election",
      "polls",
      "ballot",
      "constituency",
      "parliament vote",
      "voting",
      "electoral",
    ],
  },
  {
    tag: "Energy",
    keywords: [
      "solar panel",
      "rooftop solar",
      "power cut",
      "electricity crisis",
      "energy",
      "oil",
      "crude",
      "power grid",
      "renewable energy",
      "petroleum",
    ],
  },
  {
    tag: "Rescue",
    keywords: [
      "everest",
      "green boots",
      "rescue",
      "missing tourists",
      "nepali police",
      "summit",
      "alpinist",
      "search and rescue",
      "evacuation",
    ],
  },
  {
    tag: "Space",
    keywords: [
      "satellite",
      "nasa",
      "space",
      "orbit",
      "rocket",
      "solar flare",
      "asteroid",
      "isro",
      "lunar",
      "spacecraft",
    ],
  },
];

// Native-script fallbacks for South-Asian feed topics
const NATIVE_TAG_DEFS: TagDef[] = [
  {
    tag: "Flood",
    keywords: [
      "سیلاب",
      "سیلابی",
      "طغیانی",
      "बाढ़",
      "सैलाब",
      "जलप्रलय",
      "வெள்ளம்",
      "புயல்",
      "வாढ",
      "ගංවතුර",
      "বন্যা",
      "প্লাবন",
      "వరద",
      "వరదలు",
      "ရေကြီး",
    ],
  },
  {
    tag: "Surgery",
    keywords: [
      "سرجری",
      "أورام",
      "सर्जरी",
      "शल्यक्रिया",
      "அறுவை சிகிச்சை",
      "অস্ত্রোপচার",
      "శస్త్రచికిత్స",
    ],
  },
  {
    tag: "Health",
    keywords: [
      "ہسپتال",
      "ڈاکٹر",
      "علاج",
      "طبی",
      "अस्पताल",
      "चिकित्सा",
      "इलाज",
      "स्वास्थ्य",
      "மருத்துவம்",
      "சிகிச்சை",
      "மருத்துவமனை",
      "চিকিৎসা",
      "হাসপাতাল",
      "వైద్యం",
      "ఆసుపత్రి",
    ],
  },
  {
    tag: "Judiciary",
    keywords: [
      "عدالت",
      "وکیل",
      "تحقیقات",
      "ملزم",
      "अदालत",
      "वकील",
      "जांच",
      "आरोपी",
      "நீதிமன்றம்",
      "வழக்கு",
      "আদালত",
      "আইনজীবী",
      "তদন্ত",
      "న్యాయస్థానం",
      "విచారణ",
    ],
  },
  {
    tag: "Cinema",
    keywords: [
      "சினிமா",
      "திரைப்படம்",
      "சினிமாடிக்",
      "தமிழ் சினிமா",
      "सिनेமா",
      "फिल्म",
      "චිත්‍රපට",
      "রুপালি পর্দা",
      "ရုပ်ရှင်",
    ],
  },
  {
    tag: "Rescue",
    keywords: [
      "எவரெஸ்ட்",
      "எவரெஸ்டில்",
      "ग्रीन बूट्स",
      " Everest".trim(),
      "බේරා",
      "ကယ်ဆယ်",
      "উদ্ধার",
      "రక్షణ",
    ],
  },
  {
    tag: "Outbreak",
    keywords: ["டெங்கு", "dengue", "ඩෙංගු", "डेंगू", "डेंगु", "কলেরা", "ডেঙ্গু"],
  },
  {
    tag: "Energy",
    keywords: ["சோலார்", "மின்சாரம்", "විදුලිය", "बिजली", "ऊर्जा", "বিদ্যুৎ"],
  },
  {
    tag: "Product Launch",
    keywords: ["ஐபோன்", "iphone", "ඇපල්", "आईफोन"],
  },
  {
    tag: "Armed Clash",
    keywords: [
      "தாக்குதல்",
      "மோதல்",
      "பயங்கரவாத",
      "துப்பாக்கிச் சூடு",
      "हमला",
      "गोलीबारी",
      "आतंकी",
      "मुठभेड़",
      "विस्फोट",
      "सैन्य",
      "பயங்கரவாதிகள்",
      "ප්‍රහාර",
      "ත්‍රස්ත",
      "ගැටුම",
      "جھڑپ",
      "فائرنگ",
      "دہشت گرد",
      "مسلح حملہ",
      "دھماکہ",
      "حملہ",
      "تلاش و تلاشی",
      "হামলা",
      "গুলি",
      "সন্ত্রাসী",
      "সংঘর্ষ",
      "তহবিল",
      "বোমা",
      "துப்பாக்கி",
      "သတ်ဖြတ်",
      "တိုက်ခိုက်",
      "အကြမ်းဖက်",
      "ပစ်ခတ်",
    ],
  },
  {
    tag: "Diplomacy",
    keywords: [
      "ராஜதந்திர",
      "कूटनीति",
      "රජතන්ත්‍ර",
      "سفارت",
      "سفارتی",
      "သံတமန်",
      "কূটনীতি",
      "రాయబార",
    ],
  },
  {
    tag: "Election",
    keywords: [
      "தேர்தல்",
      "चुनाव",
      "මැතිවරණ",
      "انتخابات",
      "ရွေးကောက်ပွဲ",
      "নির্বাচন",
      "ఎన్నికలు",
    ],
  },
  {
    tag: "Quake",
    keywords: ["நிலநடுக்கம்", "भूकंप", "භූමිකම්පාව", "ভূমিকম্প"],
  },
  {
    tag: "Cyclone",
    keywords: ["புயல்", "तूफान", "සුළි කුණාටුව", "ঘূর্ণিঝড়"],
  },
  {
    tag: "Space",
    keywords: ["செயற்கைக்கோள்", "उपग्रह", "චන්ද්‍රිකාව", "উপগ্রহ"],
  },
];

const LANGUAGE_FALLBACK_TAG: Record<string, string> = {
  hi: "General",
  ta: "General",
  te: "General",
  bn: "General",
  mr: "General",
  gu: "General",
  pa: "General",
  ur: "General",
  si: "General",
  my: "General",
  ne: "General",
};

export function deriveTag(
  title: string,
  description: string,
  source: string,
  avgTone?: number,
  goldstein?: number,
): { tag: string; bucket: NewsCategory; score: number } {
  let bestTag = "General";
  let bestScore = 0;
  let _bestDef: TagDef | null = null;

  const lang = detectSourceLang(title) || detectSourceLang(description);

  // For South-Asian scripts, try native lexicon first
  if (lang) {
    for (const def of NATIVE_TAG_DEFS) {
      const titleHits = def.keywords.filter(
        (k) =>
          title.includes(k) || title.toLowerCase().includes(k.toLowerCase()),
      ).length;
      const descHits = def.keywords.filter(
        (k) =>
          description.includes(k) ||
          description.toLowerCase().includes(k.toLowerCase()),
      ).length;
      const uniqueHits = new Set(
        def.keywords.filter(
          (k) =>
            title.includes(k) ||
            description.includes(k) ||
            title.toLowerCase().includes(k.toLowerCase()) ||
            description.toLowerCase().includes(k.toLowerCase()),
        ),
      ).size;
      const score = titleHits * 3 + descHits * 1;
      const effectiveScore = Math.max(score, uniqueHits * 2);
      if (effectiveScore > bestScore) {
        bestScore = effectiveScore;
        bestTag = def.tag;
        _bestDef = def;
      }
    }
    if (bestScore > 0) {
      return { tag: bestTag, bucket: bucketForTag(bestTag), score: bestScore };
    }
    const fallback = LANGUAGE_FALLBACK_TAG[lang] ?? "General";
    return { tag: fallback, bucket: bucketForTag(fallback), score: 0.5 };
  }

  // English path — strip reporting attributions from description so quoted doctors don't pollute combat news
  const cleanDesc = stripAttributions(description);

  // Check kinetic military violence indicators in headline
  const hasKineticHeadline =
    matchesWordOrPhrase(title, "strike") ||
    matchesWordOrPhrase(title, "strikes") ||
    matchesWordOrPhrase(title, "airstrike") ||
    matchesWordOrPhrase(title, "airstrikes") ||
    matchesWordOrPhrase(title, "attack") ||
    matchesWordOrPhrase(title, "attacks") ||
    matchesWordOrPhrase(title, "missile") ||
    matchesWordOrPhrase(title, "bombing") ||
    matchesWordOrPhrase(title, "killed") ||
    matchesWordOrPhrase(title, "kills") ||
    matchesWordOrPhrase(title, "clash") ||
    matchesWordOrPhrase(title, "shelling");

  for (const def of TAG_DEFS) {
    let titleHits = 0;
    let descHits = 0;
    let sourceHits = 0;
    for (const kw of def.keywords) {
      if (matchesWordOrPhrase(title, kw)) titleHits++;
      else if (matchesWordOrPhrase(cleanDesc, kw)) descHits++;
      else if (matchesWordOrPhrase(source, kw)) sourceHits += 0.5;
    }

    let toneBoost = 0;
    if (def.tag === "Airstrike" || def.tag === "Armed Clash") {
      if (hasKineticHeadline) toneBoost += 1.5;
      if (
        (avgTone !== undefined && avgTone < -2) ||
        (goldstein !== undefined && goldstein < -4)
      ) {
        toneBoost += 0.6;
      }
    }
    if (def.tag === "Ceasefire Talks") {
      if (
        matchesWordOrPhrase(title, "talks") ||
        matchesWordOrPhrase(title, "agreement")
      ) {
        toneBoost = 0.6;
      }
    }
    if (def.tag === "Market Rout" && matchesWordOrPhrase(title, "fall")) {
      toneBoost = 0.4;
    }

    // If headline has kinetic military violence, prevent general Health from hijacking it
    const effectiveTitleHits = titleHits;
    let effectiveDescHits = descHits;
    if (hasKineticHeadline && def.tag === "Health") {
      effectiveDescHits = 0;
    }

    const score =
      effectiveTitleHits * 4 +
      effectiveDescHits * 1 +
      sourceHits * 0.5 +
      toneBoost;
    if (score > bestScore) {
      bestScore = score;
      bestTag = def.tag;
      _bestDef = def;
    }
  }

  // Threshold — if nothing clearly wins, keep General
  if (bestScore < 1.5) {
    return { tag: "General", bucket: "news", score: bestScore };
  }
  return { tag: bestTag, bucket: bucketForTag(bestTag), score: bestScore };
}
