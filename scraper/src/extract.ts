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
  threshold?: string;
  averageMarketDiscount?: string;
  notes?: string;
  dateFrom?: string;
  dateTo?: string;
};

export async function extractPromotionFields(
  screenshot: Buffer,
): Promise<ExtractedPromotionFields[]> {
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
  "threshold": "",
  "averageMarketDiscount": "",
  "notes": "",
  "dateFrom": "",
  "dateTo": ""
}
Rules:
- Use only text visible in the image.
- One array entry per distinct promotional offer/banner, not per product.
- Use empty string for unknown values.
- Do not include markdown, explanations, code fences, or comments.
- Keep the discount as a string like "-25%" or "20%".
- Keep threshold as a string like "powyżej 99 PLN" or "99 PLN" if visible.
- dateFrom/dateTo: the promotion's validity dates if shown, as ISO YYYY-MM-DD. Assume the current year if only day/month is shown. Empty string if no date is visible at all.
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

  const rawText = (
    payload?.candidates
      ?.map((candidate: any) =>
        candidate?.content?.parts?.map((part: any) => part?.text || "").join(""),
      )
      .join("\n") || ""
  ).trim();

  const cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}
