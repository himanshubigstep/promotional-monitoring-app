const GEMINI_API_KEY =
  process.env.REACT_APP_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-3.6-flash";

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("Failed to read image file"));
    reader.readAsDataURL(file);
  });

export type GeminiPromotionFields = {
  name?: string;
  brands?: string;
  retailer?: string;
  category?: string;
  discount?: string;
  threshold?: string;
  averageMarketDiscount?: string;
  notes?: string;
  promotionType?: string;
};

export type TargetLanguage = "PL" | "CZ" | "EN";

export type GeminiKnownValues = {
  categories?: string[];
  retailers?: string[];
  targetLanguage?: TargetLanguage;
};

const LANGUAGE_NAMES: Record<TargetLanguage, string> = {
  PL: "Polish",
  CZ: "Czech",
  EN: "English",
};

// Market currency for each display language — EN has no market of its own,
// so it defaults to PLN (mirrors the "EN view saves as market PL" rule used
// elsewhere in PromotionFormModal).
const TARGET_CURRENCY: Record<TargetLanguage, "PLN" | "CZK"> = {
  PL: "PLN",
  CZ: "CZK",
  EN: "PLN",
};

// Deterministic currency conversion — never trust an LLM to do arithmetic.
// Approximate, POC-grade fixed rates (units of 1 foreign currency -> PLN/CZK).
const CURRENCY_ALIASES: Record<string, string> = {
  "$": "USD",
  "us$": "USD",
  usd: "USD",
  "€": "EUR",
  eur: "EUR",
  "£": "GBP",
  gbp: "GBP",
  "₹": "INR",
  "rs.": "INR",
  rs: "INR",
  inr: "INR",
  "zł": "PLN",
  zl: "PLN",
  pln: "PLN",
  "kč": "CZK",
  kc: "CZK",
  czk: "CZK",
};

const CONVERSION_RATES: Record<string, { toPLN: number; toCZK: number }> = {
  USD: { toPLN: 4.0, toCZK: 23.0 },
  EUR: { toPLN: 4.3, toCZK: 25.0 },
  GBP: { toPLN: 5.1, toCZK: 29.5 },
  INR: { toPLN: 0.048, toCZK: 0.28 },
  PLN: { toPLN: 1, toCZK: 5.75 },
  CZK: { toPLN: 0.174, toCZK: 1 },
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const CURRENCY_TOKEN = Object.keys(CURRENCY_ALIASES)
  .sort((a, b) => b.length - a.length)
  .map(escapeRegExp)
  .join("|");

const AMOUNT = "\\d+(?:[.,]\\d+)?";
const currencyBeforeRe = new RegExp(`(${CURRENCY_TOKEN})\\s?(${AMOUNT})`, "i");
const currencyAfterRe = new RegExp(`(${AMOUNT})\\s?(${CURRENCY_TOKEN})`, "i");

// Finds the first currency amount in `text` (symbol or code, before or
// after the number) and, if it isn't already in `targetCurrency`, rewrites
// it in that currency using the fixed rate table. Text with no recognizable
// currency (e.g. a plain "-25%") is returned unchanged.
export const convertCurrencyInText = (
  text: string,
  targetCurrency: "PLN" | "CZK",
): string => {
  if (!text) return text;

  let match = text.match(currencyBeforeRe);
  let matchedAmount: string | undefined;
  let matchedSymbol: string | undefined;
  if (match) {
    matchedSymbol = match[1];
    matchedAmount = match[2];
  } else {
    match = text.match(currencyAfterRe);
    if (match) {
      matchedAmount = match[1];
      matchedSymbol = match[2];
    }
  }
  if (!match || !matchedAmount || !matchedSymbol) return text;

  const sourceCurrency = CURRENCY_ALIASES[matchedSymbol.toLowerCase()];
  if (!sourceCurrency || sourceCurrency === targetCurrency) return text;

  const rate = CONVERSION_RATES[sourceCurrency];
  if (!rate) return text;

  const amountValue = parseFloat(matchedAmount.replace(",", "."));
  if (Number.isNaN(amountValue)) return text;

  const converted = amountValue * (targetCurrency === "PLN" ? rate.toPLN : rate.toCZK);
  const roundedText = `${Math.round(converted)} ${targetCurrency}`;

  return text.slice(0, match.index) + roundedText + text.slice((match.index || 0) + match[0].length);
};

export const readPromotionFieldsWithGemini = async (
  file: File,
  knownValues?: GeminiKnownValues,
): Promise<GeminiPromotionFields> => {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing REACT_APP_GEMINI_API_KEY");
  }

  const base64Data = await fileToBase64(file);

  const categoryRule = knownValues?.categories?.length
    ? `- The "category" field must be exactly one of these app values (translate the image's language/wording into the closest matching one of these, do not invent new ones): ${knownValues.categories.join(", ")}.`
    : "- Prefer exact category names that match the app values.";
  const retailerRule = knownValues?.retailers?.length
    ? `- The "retailer" field must be exactly one of these app values: ${knownValues.retailers.join(", ")}.`
    : "- Prefer exact retailer names that match the app values.";
  const targetLanguageName = LANGUAGE_NAMES[knownValues?.targetLanguage || "PL"];
  const languageRule = `- Regardless of what language the image's text is written in, write the "name" and "notes" fields in ${targetLanguageName}. Translate the meaning, don't transliterate.`;
  const currencyRule = `- Keep any price/threshold amount in whatever currency is actually printed in the image (symbol or code, e.g. "$40", "€25", "99 zł"). Do not convert it yourself, just transcribe it exactly as shown.`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Analyze this promotional image and extract values for the form fields below.
Return ONLY valid JSON with this exact structure:
{
  "name": "",
  "brands": "",
  "retailer": "",
  "category": "",
  "discount": "",
  "threshold": "",
  "averageMarketDiscount": "",
  "notes": "",
  "promotionType": ""
}
Rules:
- Use only text visible in the image.
- Prefer exact brand names that match the app values.
${categoryRule}
${retailerRule}
${languageRule}
${currencyRule}
- The "promotionType" field must be exactly one of: "Fixed promotion", "Buy one get one free", "Custom".
  Use "Buy one get one free" for any buy-X-get-Y-free, "N+1", or bundle-style mechanic (e.g. "BUY 2 GET 1",
  "Buy 1 Get 1 Free", "2+1 gratis"), even if X or Y isn't literally 1. Use "Fixed promotion" for a flat
  percentage or amount off (e.g. "-20%", "UP TO 40% OFF", "$10 off"). Use "Custom" only if neither fits
  (e.g. tiered spend-and-save, gift with purchase with no buy-get structure).
- Use empty string for unknown values, including when none of the given app values fit.
- Do not include markdown, explanations, code fences, or comments.
- Keep the discount as a string like "-25%" or "20%" (or a currency amount like "$40" if that's what's shown instead of a percentage).
- Keep threshold as a string like "powyżej 99 PLN" or "99 PLN" if visible.`,
              },
              {
                inline_data: {
                  mime_type: file.type || "image/png",
                  data: base64Data,
                },
              },
            ],
          },
        ],
      }),
    },
  );

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error?.message || "Gemini OCR request failed");
  }

  const rawText = (
    payload?.candidates
      ?.map((candidate: any) =>
        candidate?.content?.parts
          ?.map((part: any) => part?.text || "")
          .join(""),
      )
      .join("\n") || ""
  ).trim();

  const cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as GeminiPromotionFields;
    const targetCurrency = TARGET_CURRENCY[knownValues?.targetLanguage || "PL"];
    return {
      ...parsed,
      discount: parsed.discount ? convertCurrencyInText(parsed.discount, targetCurrency) : parsed.discount,
      threshold: parsed.threshold ? convertCurrencyInText(parsed.threshold, targetCurrency) : parsed.threshold,
    };
  } catch {
    return {} as GeminiPromotionFields;
  }
};

// General-purpose translation, used both to force notes to English on save
// and to re-translate already-filled fields (name/notes) when the modal's
// display language is switched after an image has already been extracted.
export const translateTextWithGemini = async (
  text: string,
  targetLanguageName: string,
): Promise<string> => {
  if (!text || !text.trim()) return "";
  if (!GEMINI_API_KEY) {
    throw new Error("Missing REACT_APP_GEMINI_API_KEY");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `Translate the following promotional text into ${targetLanguageName}. If it is already in ${targetLanguageName}, return it unchanged. Return only the direct translation without explanations, notes, or markdown formatting.\n\nText:\n${text}`,
              },
            ],
          },
        ],
      }),
    },
  );

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error?.message || "Gemini translation failed");
  }

  const translation = (
    payload?.candidates
      ?.map((candidate: any) =>
        candidate?.content?.parts
          ?.map((part: any) => part?.text || "")
          .join(""),
      )
      .join("\n") || ""
  ).trim();

  return translation;
};

export const translateToEnglishWithGemini = (text: string): Promise<string> =>
  translateTextWithGemini(text, "English");
