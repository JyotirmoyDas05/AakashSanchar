import { deriveTag } from "@/lib/deriveTags";
import type { NewsCategory } from "@/types/news";

export interface SemanticClassification {
  tag: string;
  category: NewsCategory;
  confidence: number;
}

interface ArchetypeDef {
  tag: string;
  category: NewsCategory;
  text: string;
}

const ARCHETYPES: ArchetypeDef[] = [
  {
    tag: "Airstrike",
    category: "conflict",
    text: "military airstrike, missile strike, rocket attack, air raid, drone strike, aerial bombardment",
  },
  {
    tag: "Armed Clash",
    category: "conflict",
    text: "armed combat clash, military troops fighting, gunfire shooting, terror attack, soldiers battle, infantry ambush, killed in military attack",
  },
  {
    tag: "Surgery",
    category: "health",
    text: "minimally invasive brain surgery, neurosurgeon operation, organ transplant, medical microsurgery, clinical surgeon",
  },
  {
    tag: "Health",
    category: "health",
    text: "healthcare treatment, clinical disease medical cure, hospital doctor patient therapy, medical research",
  },
  {
    tag: "Outbreak",
    category: "health",
    text: "viral outbreak, infectious epidemic contagion, dengue pandemic, who health emergency advisory",
  },
  {
    tag: "Flood",
    category: "disaster",
    text: "flood, flash flood, submerged town, heavy monsoon rainfall, inundated deluge, landslide disaster",
  },
  {
    tag: "Quake",
    category: "disaster",
    text: "earthquake, strong seismic tremor, tsunami, fault line rupture, building collapse from tremor",
  },
  {
    tag: "Cyclone",
    category: "disaster",
    text: "tropical cyclone, hurricane, typhoon storm, gale force winds, coastal storm surge",
  },
  {
    tag: "Judiciary",
    category: "news",
    text: "court trial, police investigation inquiry, lawyers defense, criminal accused hearing, tribunal verdict, nagorik committee questions",
  },
  {
    tag: "Governance",
    category: "news",
    text: "government cabinet policy, parliamentary legislation bill, prime minister state administration",
  },
  {
    tag: "Diplomacy",
    category: "news",
    text: "international diplomacy summit, bilateral trade corridors, ambassador envoy talks, bilateral agreement",
  },
  {
    tag: "Product Launch",
    category: "news",
    text: "smartphone product launch, new iphone flagship unveil, consumer tech hardware release",
  },
  {
    tag: "Space",
    category: "space",
    text: "spacecraft satellite orbit, space rocket launch, astronomical solar flare, nasa isro planetary mission",
  },
];

type ExtractorPipeline = (
  text: string,
  options?: { pooling?: string; normalize?: boolean },
) => Promise<{ data: Float32Array }>;

let extractorPromise: Promise<ExtractorPipeline | null> | null = null;
let archetypeEmbeddings: Array<{
  tag: string;
  category: NewsCategory;
  vector: Float32Array;
}> | null = null;

function dotProduct(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

async function getExtractor(): Promise<ExtractorPipeline | null> {
  if (typeof window === "undefined") return null;
  if (extractorPromise) return extractorPromise;

  extractorPromise = (async () => {
    try {
      const { pipeline } = await import("@huggingface/transformers");
      const extractor = (await pipeline(
        "feature-extraction",
        "Xenova/all-MiniLM-L6-v2",
        { dtype: "fp32" },
      )) as unknown as ExtractorPipeline;

      // Pre-compute archetype embeddings once
      archetypeEmbeddings = await Promise.all(
        ARCHETYPES.map(async (arch) => {
          const out = await extractor(arch.text, {
            pooling: "mean",
            normalize: true,
          });
          return {
            tag: arch.tag,
            category: arch.category,
            vector: out.data,
          };
        }),
      );

      return extractor;
    } catch {
      return null;
    }
  })();

  return extractorPromise;
}

const semanticCache = new Map<string, SemanticClassification>();

/**
 * Classifies an article using Zero-Shot Semantic Vector Embeddings (ONNX/WASM)
 * Falls back to the lexical-hierarchy engine if embedding pipeline is unavailable.
 */
export async function classifyArticleSemantic(
  title: string,
  description: string,
  source: string,
): Promise<SemanticClassification> {
  const cacheKey = `${title}::${source}`;
  const cached = semanticCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Fast-path heuristic baseline
  const baseline = deriveTag(title, description, source);

  try {
    const extractor = await getExtractor();
    if (extractor && archetypeEmbeddings) {
      // Joint Headline + Cleaned Lead evaluation
      const jointText = `${title}. ${description.slice(0, 180)}`.trim();
      const output = await extractor(jointText, {
        pooling: "mean",
        normalize: true,
      });
      const inputVector = output.data;

      let bestScore = -1;
      let bestTag = baseline.tag;
      let bestCategory = baseline.bucket;

      for (const arch of archetypeEmbeddings) {
        const score = dotProduct(inputVector, arch.vector);
        if (score > bestScore) {
          bestScore = score;
          bestTag = arch.tag;
          bestCategory = arch.category;
        }
      }

      if (bestScore >= 0.35) {
        const result: SemanticClassification = {
          tag: bestTag,
          category: bestCategory,
          confidence: Number.parseFloat(bestScore.toFixed(3)),
        };
        semanticCache.set(cacheKey, result);
        return result;
      }
    }
  } catch {
    // Keep baseline
  }

  const result: SemanticClassification = {
    tag: baseline.tag,
    category: baseline.bucket,
    confidence: baseline.score > 5 ? 0.9 : 0.6,
  };
  semanticCache.set(cacheKey, result);
  return result;
}
