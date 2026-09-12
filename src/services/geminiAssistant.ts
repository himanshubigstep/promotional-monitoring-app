// Gemini-backed orchestration for the in-app AI assistant.
//
// Reuses the same env-var / fetch approach already used by src/utils/geminiOcr.ts
// (REACT_APP_GEMINI_API_KEY, direct REST calls to generativelanguage.googleapis.com).
// This keeps the assistant isolated in its own module so it can later be moved
// behind a backend endpoint without touching the OCR integration or vice versa.
//
// Flow: user question -> Gemini (with tool declarations) -> Gemini requests a
// tool call -> we run the matching deterministic function over real app data
// (see assistantTools.ts) -> the tool result is sent back to Gemini as a
// functionResponse -> Gemini writes a short natural-language reply grounded in
// that data. The structured result (table/cards/etc.) is rendered directly by
// the UI, not reconstructed from Gemini's text.
import { navigationSummaryForPrompt } from "../data/navigation";
import {
  toolCompareBrands,
  toolCompareProducts,
  toolCompareStores,
  toolGetNavigation,
  toolGetRecentPromotions,
  toolSearchBrands,
  toolSearchProducts,
  toolSearchPromotions,
  toolSearchStores,
  type AssistantDataContext,
} from "./assistantTools";
import type { AssistantResult, AssistantToolName, ChatMessage } from "../types/assistant";

const GEMINI_API_KEY =
  process.env.REACT_APP_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-3.6-flash";
const MAX_TOOL_ROUNDTRIPS = 3;

const SYSTEM_INSTRUCTION = `You are the in-app assistant for a promotional monitoring dashboard used by a beauty retailer's team.
You help with two things only:
1. Explaining how to navigate/use the application (real routes below).
2. Answering questions about stores, brands, products, and promotions using the provided tools.

Known application navigation (do not invent other pages):
${navigationSummaryForPrompt}

Rules:
- For any question about data (prices, discounts, promotions, comparisons, brands, stores, products), you MUST call one of the provided tools. Never invent numbers, product names, prices, or dates yourself.
- When the user names a specific brand, product, category, or retailer, ALWAYS pass it verbatim as the tool's brand/query/retailer argument — even if it looks unfamiliar or you suspect it may not exist. Never omit the filter and return a generic/unfiltered list instead.
- If a tool call returns zero matches, immediately report plainly that nothing was found for that request (e.g. "No Lakmé products were found in the tracked data"). Do NOT retry with broader or different arguments, and do NOT substitute unrelated products/promotions/results to seem more helpful.
- After a tool result comes back, write a short (1-4 sentence) natural-language answer that summarizes it. The UI already renders the detailed table/cards, so do not repeat every row in text.
- For pure navigation questions ("where can I see X", "how do I do Y"), you may answer directly from the navigation list above without calling a tool.
- Keep answers concise and business-friendly. Use PLN for Polish prices unless the data says otherwise.
- "Our brand" / "us" / "our products" means retailer values containing "(Your brand)".

Tone: write like a helpful, knowledgeable teammate talking to a colleague — warm and direct, never like a report generator. Plain conversational sentences only:
- Never use markdown syntax: no **bold**, no bullet points/dashes, no backticks or headings. Just write the route name and words normally (e.g. "the Brand analytics page", not "**Brand analytics**" or \`analytics\`).
- Don't announce what you're doing ("I will call...", "Let me search...", "Based on the data retrieved..."). Just answer, the way a person who already knows the answer would.
- Don't pad with filler ("Great question!", "I'd be happy to help!", "Here is a summary:"). Start directly with the answer.`;

type GeminiPart =
  | { text: string }
  | {
      functionCall: { name: string; args: Record<string, unknown> };
      // Gemini's "thinking" models require this to be echoed back verbatim on
      // any later request that includes this function-call turn, or the API
      // rejects the call. See https://ai.google.dev/gemini-api/docs/thought-signatures
      thoughtSignature?: string;
    }
  | { functionResponse: { name: string; response: Record<string, unknown> } };

type GeminiContent = { role: "user" | "model"; parts: GeminiPart[] };

const functionDeclarations = [
  {
    name: "get_navigation",
    description: "Look up real application pages/routes/features, optionally filtered by a keyword.",
    parameters: {
      type: "OBJECT",
      properties: { query: { type: "STRING", description: "Optional keyword, e.g. 'analytics'." } },
    },
  },
  {
    name: "search_stores",
    description: "List tracked retailers/stores with aggregate stats (product count, avg discount, avg price).",
    parameters: {
      type: "OBJECT",
      properties: {
        market: { type: "STRING", description: "PL, CZ, or All." },
        query: { type: "STRING", description: "Filter retailer name by substring." },
      },
    },
  },
  {
    name: "search_brands",
    description: "List tracked brands with aggregate stats (offer count, retailers, avg price/discount).",
    parameters: {
      type: "OBJECT",
      properties: {
        market: { type: "STRING", description: "PL, CZ, or All." },
        query: { type: "STRING", description: "Filter brand name by substring." },
      },
    },
  },
  {
    name: "search_products",
    description:
      "Search/filter individual products across our own catalog and competitor promotions. Supports sorting (e.g. biggest discount). Do NOT use this for 'compare our X vs competitors' questions — use compare_products instead.",
    parameters: {
      type: "OBJECT",
      properties: {
        brand: { type: "STRING" },
        category: { type: "STRING" },
        retailer: { type: "STRING" },
        market: { type: "STRING", description: "PL, CZ, or All." },
        query: { type: "STRING", description: "Free-text match on name/brand/category." },
        source: {
          type: "STRING",
          enum: ["ours", "competitor", "all"],
          description: "Restrict to our own products, competitor products, or all.",
        },
        minDiscount: { type: "NUMBER" },
        maxPrice: { type: "NUMBER" },
        sortBy: { type: "STRING", enum: ["discount", "price", "rating"] },
        order: { type: "STRING", enum: ["asc", "desc"] },
        limit: { type: "NUMBER" },
      },
    },
  },
  {
    name: "search_promotions",
    description: "Search/filter tracked promotions (campaigns), e.g. all promotions for a brand.",
    parameters: {
      type: "OBJECT",
      properties: {
        brand: { type: "STRING" },
        category: { type: "STRING" },
        retailer: { type: "STRING" },
        market: { type: "STRING" },
        query: { type: "STRING" },
        minDiscount: { type: "NUMBER" },
        fromDate: { type: "STRING", description: "YYYY-MM-DD" },
        toDate: { type: "STRING", description: "YYYY-MM-DD" },
        limit: { type: "NUMBER" },
      },
    },
  },
  {
    name: "compare_products",
    description:
      "Use this whenever the user asks to 'compare' our products/prices against competitors (any retailer), typically filtered by brand — e.g. 'compare our Lakmé products with competitors'. Use onlyCheaperCompetitor to find products where a competitor beats our price. Returns a comparison table even if brand spelling differs slightly.",
    parameters: {
      type: "OBJECT",
      properties: {
        brand: { type: "STRING" },
        query: { type: "STRING" },
        market: { type: "STRING" },
        onlyCheaperCompetitor: { type: "BOOLEAN" },
        limit: { type: "NUMBER" },
      },
    },
  },
  {
    name: "compare_brands",
    description: "Compare a single brand's average price/discount across every retailer that carries it.",
    parameters: {
      type: "OBJECT",
      properties: {
        brand: { type: "STRING" },
        market: { type: "STRING" },
      },
      required: ["brand"],
    },
  },
  {
    name: "compare_stores",
    description: "Compare two retailers/stores head-to-head on product count, brands, avg price, and avg discount.",
    parameters: {
      type: "OBJECT",
      properties: {
        retailerA: { type: "STRING" },
        retailerB: { type: "STRING" },
        market: { type: "STRING" },
      },
      required: ["retailerA", "retailerB"],
    },
  },
  {
    name: "get_recent_promotions",
    description: "Summarize promotions from the last N days (default 10).",
    parameters: {
      type: "OBJECT",
      properties: { days: { type: "NUMBER" } },
    },
  },
] as const;

function runTool(
  name: string,
  args: Record<string, unknown>,
  ctx: AssistantDataContext,
): { result: AssistantResult; summaryForModel: unknown } {
  switch (name as AssistantToolName) {
    case "get_navigation":
      return toolGetNavigation(args as { query?: string });
    case "search_stores":
      return toolSearchStores(args as { market?: string; query?: string }, ctx);
    case "search_brands":
      return toolSearchBrands(args as { market?: string; query?: string }, ctx);
    case "search_products":
      return toolSearchProducts(args, ctx);
    case "search_promotions":
      return toolSearchPromotions(args, ctx);
    case "compare_products":
      return toolCompareProducts(args, ctx);
    case "compare_brands":
      return toolCompareBrands(args as { brand: string; market?: string }, ctx);
    case "compare_stores":
      return toolCompareStores(
        args as { retailerA: string; retailerB: string; market?: string },
        ctx,
      );
    case "get_recent_promotions":
      return toolGetRecentPromotions(args as { days?: number }, ctx);
    default:
      return {
        result: { type: "error", message: `Unknown tool "${name}".` },
        summaryForModel: { error: `Unknown tool ${name}` },
      };
  }
}

type FunctionCallPart = {
  functionCall: { name: string; args: Record<string, unknown> };
  thoughtSignature?: string;
};

async function callGemini(
  contents: GeminiContent[],
  options: { allowTools?: boolean } = {},
): Promise<{
  text: string;
  functionCallParts: FunctionCallPart[];
}> {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing REACT_APP_GEMINI_API_KEY");
  }
  const { allowTools = true } = options;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Passed as a header rather than a `?key=` query param so it doesn't
        // end up in browser history, server access logs, or any proxy in
        // between — the key is still shipped to the client either way (see
        // module-level note on backend migration), but this avoids the most
        // casual leak vector.
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        contents,
        ...(allowTools ? { tools: [{ function_declarations: functionDeclarations }] } : {}),
      }),
    },
  );
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || "Gemini assistant request failed");
  }
  const parts: GeminiPart[] = payload?.candidates?.[0]?.content?.parts || [];
  // Gemini can return several functionCall parts in one turn for a compound
  // question — collect all of them so every call gets answered and every
  // one gets a matching functionResponse (a dropped call with no response
  // breaks the next round).
  const functionCallParts = parts.filter(
    (part): part is FunctionCallPart => "functionCall" in part,
  );
  const text = parts
    .filter((part): part is { text: string } => "text" in part)
    .map((part) => part.text)
    .join("\n")
    .trim();
  return {
    text,
    functionCallParts,
  };
}

export type AssistantAnswer = {
  text: string;
  result?: AssistantResult;
  toolName?: AssistantToolName;
};

// Safety net in case the model still slips into markdown/report phrasing
// despite the system prompt — strips it so replies read like something a
// person would actually type in a chat, not a formatted document.
function humanizeText(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1") // **bold**
    .replace(/__(.+?)__/g, "$1") // __bold__
    .replace(/`([^`]+)`/g, "$1") // `code`
    .replace(/^#{1,6}\s+/gm, "") // # Headings
    .replace(/^[*-]\s+/gm, "") // bullet markers
    .trim();
}

// Friendly, past-tense labels for the small "what I checked" indicator shown
// under a reply — reads like a person mentioning what they looked up, not a
// raw function/endpoint name.
const TOOL_LABELS: Partial<Record<AssistantToolName, string>> = {
  get_navigation: "Checked the app's navigation",
  search_stores: "Looked up stores",
  search_brands: "Looked up brands",
  search_products: "Looked up products",
  search_promotions: "Looked up promotions",
  compare_products: "Compared products",
  compare_brands: "Compared brands across stores",
  compare_stores: "Compared stores",
  get_recent_promotions: "Checked recent promotions",
};

export function humanizeToolName(toolName: AssistantToolName): string {
  return TOOL_LABELS[toolName] || toolName.replace(/_/g, " ");
}

// A short, hidden-from-the-UI text summary of a previous structured result,
// folded into that assistant turn's history text so a follow-up question
// ("sort those by price", "what about the second one") has something to
// reason over instead of forcing a fresh, possibly-different tool call.
function serializeResultForContext(result: AssistantResult): string {
  const cap = <T>(items: T[], n = 10): T[] => items.slice(0, n);
  switch (result.type) {
    case "table":
    case "comparison_table":
      return cap(result.rows)
        .map((row) => row.join(" | "))
        .join("\n");
    case "product_cards":
      return cap(result.items)
        .map((item) => `${item.name} (${item.brand}, ${item.retailer}): ${item.price ?? "?"} ${item.currency}`)
        .join("\n");
    case "promotion_cards":
      return cap(result.items)
        .map((item) => `${item.name} — ${item.brand} @ ${item.retailer}: ${item.discount}`)
        .join("\n");
    case "summary":
      return result.stats.map((stat) => `${stat.label}: ${stat.value}`).join("\n");
    case "navigation":
      return result.items.map((item) => `${item.name} (${item.route})`).join("\n");
    default:
      return "";
  }
}

export async function askAssistant(
  question: string,
  history: ChatMessage[],
  ctx: AssistantDataContext,
): Promise<AssistantAnswer> {
  const priorMessages = history.filter((message) => !message.isError);
  // `history` may or may not already end with this turn's question,
  // depending on the caller — guard against sending it twice rather than
  // relying on that convention.
  const trimmedHistory =
    priorMessages[priorMessages.length - 1]?.role === "user" &&
    priorMessages[priorMessages.length - 1]?.text === question
      ? priorMessages.slice(0, -1)
      : priorMessages;

  const contents: GeminiContent[] = trimmedHistory.slice(-8).map((message) => {
    const contextSuffix =
      message.role === "assistant" && message.result
        ? `\n\n[Data previously retrieved:\n${serializeResultForContext(message.result)}]`
        : "";
    return {
      role: message.role === "user" ? "user" : "model",
      parts: [{ text: message.text + contextSuffix }],
    };
  });
  contents.push({ role: "user", parts: [{ text: question }] });

  let lastResult: AssistantResult | undefined;
  let lastToolName: AssistantToolName | undefined;

  for (let round = 0; round < MAX_TOOL_ROUNDTRIPS; round += 1) {
    const response = await callGemini(contents);
    if (response.functionCallParts.length === 0) {
      return {
        text: humanizeText(response.text || "I don't have an answer for that."),
        result: lastResult,
        toolName: lastToolName,
      };
    }

    // Echo every function-call part back verbatim (including thoughtSignature,
    // when present — Gemini's thinking models require this for the follow-up
    // turn to be accepted), and answer every one of them: a compound question
    // can produce more than one call in the same turn, and each needs a
    // matching functionResponse or the next round is rejected/confused.
    contents.push({ role: "model", parts: response.functionCallParts });
    const functionResponseParts: GeminiPart[] = [];
    for (const part of response.functionCallParts) {
      const { name, args } = part.functionCall;
      const { result, summaryForModel } = runTool(name, args || {}, ctx);
      lastResult = result;
      lastToolName = name as AssistantToolName;
      functionResponseParts.push({ functionResponse: { name, response: { result: summaryForModel } } });
    }
    contents.push({ role: "user", parts: functionResponseParts });
  }

  // Exhausted the round-trip budget while Gemini was still requesting tool
  // calls. We already have a real result (lastResult) from the final round —
  // make one more request with tools disabled so Gemini is forced to
  // summarize it in text instead of silently discarding it behind a
  // hardcoded placeholder.
  const finalResponse = await callGemini(contents, { allowTools: false });
  return {
    text: humanizeText(finalResponse.text || "Here's what I found."),
    result: lastResult,
    toolName: lastToolName,
  };
}

export function isGeminiConfigured(): boolean {
  return Boolean(GEMINI_API_KEY);
}
