import type { StrategicAnalysisPillars } from "@/lib/intelligenceSynthesizer";
import { bucketForTag } from "@/lib/tagPalette";
import type { NewsCategory, NewsEvent } from "@/types/news";

// Singleton WebLLM loader — Qwen2.5-1.5B multilingual model with caching
let enginePromise: Promise<unknown> | null = null;
let engineInstance: unknown | null = null;

export const RECOMMENDED_MODEL = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";

export function getWebLLMEngine(
  onProgress?: (text: string) => void,
): Promise<unknown> {
  if (engineInstance) return Promise.resolve(engineInstance);
  if (enginePromise) return enginePromise;
  enginePromise = (async () => {
    const hasGPU =
      typeof navigator !== "undefined" &&
      !!(navigator as unknown as { gpu?: unknown }).gpu;
    if (!hasGPU) throw new Error("WebGPU unavailable");
    const mod = await import("@mlc-ai/web-llm");
    const engine = await (
      mod as unknown as {
        CreateMLCEngine: (
          model: string,
          opts?: { initProgressCallback?: (p: { text: string }) => void },
        ) => Promise<unknown>;
      }
    ).CreateMLCEngine(RECOMMENDED_MODEL, {
      initProgressCallback: (p: { text: string }) => {
        onProgress?.(p.text);
        try {
          window.dispatchEvent(
            new CustomEvent("ai-status", { detail: { text: p.text } }),
          );
        } catch {}
      },
    });
    engineInstance = engine;
    try {
      window.dispatchEvent(
        new CustomEvent("ai-status", {
          detail: { text: "AI ready (Qwen 1.5B)", ready: true },
        }),
      );
    } catch {}
    return engine;
  })();
  enginePromise.catch(() => {
    enginePromise = null;
  });
  return enginePromise;
}

export function isWebLLMSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!(navigator as unknown as { gpu?: unknown }).gpu
  );
}

export interface LLMAnnotationResult {
  tag: string;
  bucket: NewsCategory;
  cleanedSummary?: string;
  tone?: string;
}

const annotationCache = new Map<string, LLMAnnotationResult>();
const strategicCache = new Map<string, StrategicAnalysisPillars>();

/**
 * Scours the article text with Qwen2.5-1.5B, stripping noise, resolving clickbait metaphors,
 * and extracting true tactical tone, dynamic tag, and clean executive summary.
 */
export async function annotateArticleWithLLM(
  title: string,
  description: string,
  source: string,
): Promise<LLMAnnotationResult | null> {
  const key = `${title}::${source}`;
  if (annotationCache.has(key)) {
    return annotationCache.get(key) || null;
  }
  try {
    const engine = (await getWebLLMEngine()) as {
      chat: {
        completions: {
          create: (opts: {
            messages: Array<{ role: string; content: string }>;
            temperature?: number;
            max_tokens?: number;
          }) => Promise<{
            choices: Array<{ message: { content: string } }>;
          }>;
        };
      };
    };
    if (!engine?.chat?.completions) return null;

    const prompt = `You are a military & geopolitical intelligence annotator. Analyze this news report, distinguish literal reality from reporting quotes or clickbait metaphors.
Headline: "${title}"
Source: "${source}"
Body: "${description.slice(0, 320)}"

Extract:
1. "tag": Specific 1-2 word topic tag (e.g. "Airstrike", "Surgery", "Flood Relief", "Judicial Inquiry", "Diplomacy", "Space Launch", "Election", "Economic Policy").
2. "category": Primary category ("news" | "conflict" | "disaster" | "health" | "space"). Note: military strikes quoting hospitals MUST be "conflict", NOT "health".
3. "summary": One clean factual sentence without boilerplate or ads.

Return JSON ONLY: {"tag": "...", "category": "...", "summary": "..."}`;

    const completion = await engine.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 100,
    });

    const reply = completion.choices[0]?.message?.content?.trim() || "";
    const jsonMatch = reply.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.tag) {
        const tag = parsed.tag.trim();
        const bucket =
          (parsed.category?.trim() as NewsCategory) || bucketForTag(tag);
        const res: LLMAnnotationResult = {
          tag,
          bucket,
          cleanedSummary: parsed.summary?.trim() || undefined,
        };
        annotationCache.set(key, res);
        return res;
      }
    }
  } catch (_e) {
    // LLM not ready or busy
  }
  return null;
}

/**
 * Deep Strategic Synthesis for RegionWindow using Qwen2.5-1.5B on-device.
 */
export async function synthesizeStrategicAnalysisWithLLM(
  events: NewsEvent[],
  locationName: string,
  query?: string,
): Promise<StrategicAnalysisPillars | null> {
  if (!events.length) return null;
  const eventIds = events
    .slice(0, 6)
    .map((e) => e.id)
    .join(",");
  const cacheKey = `${locationName}::${query || ""}::${eventIds}`;
  if (strategicCache.has(cacheKey)) {
    return strategicCache.get(cacheKey) || null;
  }

  try {
    const engine = (await getWebLLMEngine()) as {
      chat: {
        completions: {
          create: (opts: {
            messages: Array<{ role: string; content: string }>;
            temperature?: number;
            max_tokens?: number;
          }) => Promise<{
            choices: Array<{ message: { content: string } }>;
          }>;
        };
      };
    };
    if (!engine?.chat?.completions) return null;

    const eventSummaries = events
      .slice(0, 5)
      .map(
        (e, idx) =>
          `${idx + 1}. [${(e.tag || e.category).toUpperCase()} - ${e.locationName}] ${e.title}: ${e.description.slice(0, 140)}`,
      )
      .join("\n");

    const prompt = `You are a strategic geopolitical and defense intelligence analyst. Synthesize a concise, tactical 3-pillar situational report for "${locationName}" based on these real-time dispatches:
${eventSummaries}

Provide factual, specific intelligence:
1. "impactAssessment": 1-2 factual sentences on human, infrastructure, or institutional strain in this region (cite specific cities/numbers if mentioned).
2. "operationalDynamics": 1-2 sentences on active defense, civil protection, emergency, or judicial response forces deployed and their current posture.
3. "escalationOutlook": 1-2 sentences on realistic 24-48 hour forward trajectory and critical secondary risks.
4. "flashpoints": Array of 2-4 specific named cities/districts/sectors mentioned.

Return JSON ONLY:
{
  "impactAssessment": "...",
  "operationalDynamics": "...",
  "escalationOutlook": "...",
  "flashpoints": ["..."]
}`;

    const completion = await engine.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 280,
    });

    const reply = completion.choices[0]?.message?.content?.trim() || "";
    const jsonMatch = reply.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (
        parsed.impactAssessment &&
        parsed.operationalDynamics &&
        parsed.escalationOutlook
      ) {
        const result: StrategicAnalysisPillars = {
          impactAssessment: parsed.impactAssessment.trim(),
          operationalDynamics: parsed.operationalDynamics.trim(),
          escalationOutlook: parsed.escalationOutlook.trim(),
          threatBreakdown: [],
          flashpoints: Array.isArray(parsed.flashpoints)
            ? parsed.flashpoints
            : [],
        };
        strategicCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (_e) {
    // LLM busy or unavailable
  }
  return null;
}
