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
};

export const readPromotionFieldsWithGemini = async (
  file: File,
): Promise<GeminiPromotionFields> => {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing REACT_APP_GEMINI_API_KEY");
  }

  const base64Data = await fileToBase64(file);

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
  "notes": ""
}
Rules:
- Use only text visible in the image.
- Prefer exact brand/retailer/category names that match the app values.
- Use empty string for unknown values.
- Do not include markdown, explanations, code fences, or comments.
- Keep the discount as a string like "-25%" or "20%".
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
    return parsed;
  } catch {
    return {} as GeminiPromotionFields;
  }
};

export const translateToEnglishWithGemini = async (
  text: string,
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
                text: `Translate the following promotional terms, conditions, or notes from Polish (PL) or Czech (CZ) to English. Return only the direct English translation without explanations, notes, or markdown formatting.\n\nText:\n${text}`,
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
