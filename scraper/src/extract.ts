// Server-side counterpart to src/utils/geminiOcr.ts in the main app.
// Same prompt/response contract, but takes a screenshot buffer directly
// instead of a browser File, since this runs in GitHub Actions, not a browser.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = "gemini-3.6-flash";

export type ExtractedPromotionFields = {
  name?: string;
  brands?: string;
  retailer?: string;
  category?: string;
  discount?: string;
  // Normalized alongside the free-text `discount` above, so callers don't
  // each have to regex-parse "-25%" themselves (src/services/assistantTools.ts
  // and src/lib/promotionsData.ts both already do this independently against
  // manually-entered discount_text — this at least stops the scraper from
  // adding a third copy of that parsing logic).
  discountPercent?: number | null;
  threshold?: string;
  averageMarketDiscount?: string;
  notes?: string;
  dateFrom?: string;
  dateTo?: string;
  // Matches the manual-entry form's promotionType enum (see
  // src/components/PromotionFormModal.tsx's promotionTypeOptions) so scraped
  // rows populate the same column instead of leaving it null forever.
  promotionType?: "Fixed promotion" | "Buy one get one free" | "Custom";
  // Gemini's own self-reported confidence (0-1) that this entry is a real,
  // correctly-read promotion — not a measured/calibrated score, just the
  // model's best guess, but still strictly more signal for a reviewer than
  // nothing at all.
  confidence?: number | null;
  // Names of fields above the model could not read clearly / had to guess at
  // (e.g. ["dateTo", "threshold"]), so the review queue can flag exactly
  // what to double-check instead of a reviewer re-deriving that from scratch.
  uncertainFields?: string[];
};

const MAX_ATTEMPTS = 2;

async function callGemini(screenshot: Buffer): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `This is a screenshot of a retailer's promotions page. It likely shows MULTIPLE separate promotional campaigns/banners, not just one.
Return ONLY valid JSON: an array of objects, one per distinct promotion you can identify, each with this exact structure:
{
  "name": "",
  "brands": "",
  "retailer": "",
  "category": "",
  "discount": "",
  "discountPercent": null,
  "threshold": "",
  "averageMarketDiscount": "",
  "notes": "",
  "dateFrom": "",
  "dateTo": "",
  "promotionType": "Fixed promotion",
  "confidence": 0.0,
  "uncertainFields": []
}
Rules:
- Use only text visible in the image.
- One array entry per distinct promotional offer/banner, not per product.
- Use empty string (or null for numbers) for unknown values.
- Do not include markdown, explanations, code fences, or comments.
- Keep the discount as a string like "-25%" or "20%". Also set discountPercent to the same value as a plain number (e.g. 25 for "-25%"), or null if there's no single percentage (e.g. a fixed-amount or BOGO offer).
- Keep threshold as a string like "powyżej 99 PLN" or "99 PLN" if visible.
- dateFrom/dateTo: the promotion's validity dates if shown, as ISO YYYY-MM-DD. Assume the current year if only day/month is shown. Empty string if no date is visible at all.
- promotionType: "Buy one get one free" for any buy-N-get-N-free style offer, "Fixed promotion" for a straightforward percentage/amount discount, "Custom" for anything else (bundles, gifts-with-purchase, tiered offers, etc.).
- confidence: your own honest 0.0-1.0 estimate of how sure you are this is a real, correctly-read promotion (not a design element or navigation banner) with accurate values. Use a low value rather than guessing when the image is blurry, cropped, or ambiguous.
- uncertainFields: list the property names above (e.g. "dateTo", "threshold") that you had to guess at or could not read confidently. Empty array if you're confident in everything you filled in.
- If you cannot confidently identify any distinct promotions, return an empty array.`,
              },
              {
                inline_data: {
                  mime_type: "image/png",
                  data: screenshot.toString("base64"),
                },
              },
            ],
          },
        ],
      }),
    },
  );

  const payload: any = await response.json();

  if (!response.ok) {
    throw new Error(payload?.error?.message || "Gemini OCR request failed");
  }

  return (
    payload?.candidates
      ?.map((candidate: any) =>
        candidate?.content?.parts?.map((part: any) => part?.text || "").join(""),
      )
      .join("\n") || ""
  ).trim();
}

function parseGeminiJson(rawText: string): ExtractedPromotionFields[] | undefined {
  const cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return undefined;
  }
}

export async function extractPromotionFields(
  screenshot: Buffer,
): Promise<ExtractedPromotionFields[]> {
  let lastRawText = "";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    lastRawText = await callGemini(screenshot);
    const parsed = parseGeminiJson(lastRawText);
    if (parsed) return parsed;
    console.warn(
      `Gemini returned non-JSON output on attempt ${attempt}/${MAX_ATTEMPTS}:`,
      lastRawText.slice(0, 500),
    );
  }

  // Every attempt returned unparseable output — this is meaningfully
  // different from Gemini legitimately finding zero promotions (which comes
  // back as a valid `[]` and returns normally above), so it's surfaced as a
  // thrown error rather than silently swallowed to []. scrape.ts already
  // catches this per-retailer and reports it as "extraction_failed" instead
  // of an indistinguishable "0 promotion(s) created".
  throw new Error(
    `Gemini response was not valid JSON after ${MAX_ATTEMPTS} attempt(s): ${lastRawText.slice(0, 500)}`,
  );
}
