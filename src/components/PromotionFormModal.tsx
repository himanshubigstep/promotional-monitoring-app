import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  AddPhotoAlternateRounded,
  CloseRounded,
  DeleteOutlineRounded,
  SaveRounded,
} from "@mui/icons-material";
import { Box, Button, Modal, Typography } from "@mui/material";
import { createWorker } from "tesseract.js";
import type { Promotion } from "../context/AppContext";
import FormField from "./FormField";
import {
  readPromotionFieldsWithGemini,
  translateToEnglishWithGemini,
} from "../utils/geminiOcr";
import { preprocessImageForOCR } from "../utils/imagePreprocessing";

const categories = ["Pielęgnacja", "Perfumy", "Makijaż", "Włosy"];
const brands = [
  "Ziaja",
  "Tołpa",
  "Bielenda",
  "Resibo",
  "Inglot",
  "Mo61",
  "GdanSkin",
  "Pani Walewska",
  "Eveline",
  "Bell",
  "Wibo",
  "Joico Polska",
  "Vis Plantis",
  "Anwen",
  "OnlyBio",
];
const retailers = [
  "Rossmann Polska",
  "Hebe",
  "Douglas Polska",
  "Super-Pharm",
  "Natura",
  "Kontigo",
  "Fryzjerzy.pl",
  "Cocolita",
  "dm drogerie markt",
  "Teta drogerie",
  "Notino CZ",
];
const scopes = ["Wielokanałowa", "Tylko e-commerce", "Tylko aplikacja mobilna"];
const channels = [
  "Media społecznościowe",
  "Strona internetowa",
  "Telewizja",
  "E-mail",
  "Sklep stacjonarny",
  "Aplikacja mobilna",
];

// Update FormState to have brands as string instead of array
type FormState = Omit<Promotion, "id" | "createdAt"> & {
  brands: string; // Override brands to be string
};

const emptyForm: FormState = {
  market: "PL",
  name: "",
  from: "",
  to: "",
  scope: "",
  channel: "",
  category: "",
  brands: "",
  retailer: "",
  discount: "",
  threshold: "",
  skuCount: 1,
  notes: "",
  creativeName: "",
  creativeData: "",
  averageMarketDiscount: "",
};

// --- OCR helpers -----------------------------------------------------

// Strip Polish diacritics + lowercase, so "Rossmann Polska" matches
// even if OCR reads "Rossmann Polsko" or drops a diacritic mark.
const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

// Find the best match from a known list (brands / retailers / categories)
// by checking if the list item appears (loosely) inside the OCR text.
const findKnownMatches = (text: string, list: string[], multiple = false) => {
  const normalizedText = normalize(text);
  const matches = list.filter((item) =>
    normalizedText.includes(normalize(item)),
  );
  return multiple ? matches : matches[0] || "";
};

const extractPromotionFields = (rawText: string) => {
  const text = rawText.replace(/\s+/g, " ").trim();
  console.log("OCR text:", text);
  // Discount: "-25%", "25% rabatu", "rabat -30%"
  const discountMatch = text.match(/-?\d{1,3}\s?%(?:\s?(?:rabat[u]?|off))?/i);
  const discount = discountMatch ? discountMatch[0].replace(/\s+/g, "") : "";

  // Threshold: "powyżej 99 PLN", "od 99 zł", "powyżej 99zł"
  const thresholdMatch = text.match(
    /(?:powyżej|od)\s?\d{1,4}(?:[.,]\d{1,2})?\s?(?:PLN|zł|CZK|Kč)/i,
  );
  const threshold = thresholdMatch ? thresholdMatch[0] : "";

  // Average market discount: a second "%" figure often labeled "średni"
  const avgMatch = text.match(
    /średni[a-ząęćłńóśźż]*\s?rabat[a-ząęćłńóśźż]*\D{0,10}(\d{1,3}\s?%)/i,
  );
  const averageMarketDiscount = avgMatch ? avgMatch[1].replace(/\s+/g, "") : "";

  // Known-list matches
  const matchedBrand = findKnownMatches(text, brands) as string;
  const matchedRetailer = findKnownMatches(text, retailers) as string;
  const matchedCategory = findKnownMatches(text, categories) as string;

  // Name: fall back to the longest readable line that isn't just numbers/%
  const nameCandidate = rawText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 4 && !/^[\d\s%.,-]+$/.test(l))
    .sort((a, b) => b.length - a.length)[0];

  return {
    discount,
    threshold,
    averageMarketDiscount,
    brands: matchedBrand,
    retailer: matchedRetailer,
    category: matchedCategory,
    name: nameCandidate || "",
  };
};

// const extractPromotionFieldsFromGemini = (rawText: string) => {
//   const text = rawText
//     .replace(/\*\*|\*/g, " ")
//     .replace(/\s+/g, " ")
//     .trim();

//   const cleanText = text.toLowerCase();

//   const percentMatches = [...cleanText.matchAll(/(\d{1,3})\s*%/g)].map(
//     (match) => match[1],
//   );

//   const discount = percentMatches[0] ? `${percentMatches[0]}%` : "";
//   const averageMarketDiscount = percentMatches[1]
//     ? `${percentMatches[1]}%`
//     : "";

//   const matchedBrand = findKnownMatches(text, brands) as string;
//   const matchedCategory = findKnownMatches(text, categories) as string;

//   const nameCandidates = text
//     .split(/\n|\.|\s{2,}/)
//     .map((line) => line.trim())
//     .filter((line) => line.length > 5)
//     .filter(
//       (line) =>
//         !/^(here is the text extracted from the image|top right|left product|right product|bottom right|#)/i.test(
//           line,
//         ),
//     );

//   const name =
//     nameCandidates.find((line) =>
//       /foot mask|foam face wash|ultra hydration|hydration|repair/i.test(line),
//     ) ||
//     nameCandidates[0] ||
//     "";

//   return {
//     discount,
//     threshold: "",
//     averageMarketDiscount,
//     brands: matchedBrand,
//     retailer: "",
//     category: matchedCategory,
//     name,
//   };
// };
// -----------------------------------------------------------------------

export default function PromotionFormModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (promotion: FormState) => void;
}) {
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [ocrLoading, setOcrLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const update = (
    field: keyof FormState,
    value: string | number | string[],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";

      setForm((current) => ({
        ...current,
        creativeName: file.name,
        creativeData: result,
      }));

      setPreviewUrl(result);
    };

    reader.readAsDataURL(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
    },
    multiple: false,
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
  });

  // --- shared merge logic -----------------------------------------------

  type ExtractedFields = {
    discount?: string;
    threshold?: string;
    averageMarketDiscount?: string;
    brands?: string;
    retailer?: string;
    category?: string;
    name?: string;
    notes?: string;
  };

  const mergeExtractedIntoForm = (
    current: FormState,
    extracted: ExtractedFields,
  ): FormState => ({
    ...current,
    discount: current.discount || extracted.discount || "",
    threshold: current.threshold || extracted.threshold || "",
    averageMarketDiscount:
      current.averageMarketDiscount || extracted.averageMarketDiscount || "",
    brands: current.brands.length ? current.brands : extracted.brands || "",
    retailer: extracted.retailer || current.retailer,
    category: extracted.category || current.category,
    name: current.name || extracted.name || "",
    notes: current.notes || extracted.notes || "",
  });

  // --- Tesseract path (local OCR) ----------------------------------------

  const extractWithTesseract = async (file: File): Promise<ExtractedFields> => {
    const processedFile = await preprocessImageForOCR(file, {
      scale: 1.5,
      contrast: 1.4,
      grayscale: true,
    });

    const worker = await createWorker(["eng", "pol"]);
    const {
      data: { text },
    } = await worker.recognize(processedFile);
    await worker.terminate();

    return extractPromotionFields(text); // already returns brands: string[]
  };

  // --- Gemini path ---------------------------------------------------------

  const extractWithGemini = async (file: File): Promise<ExtractedFields> => {
    const raw = await readPromotionFieldsWithGemini(file);

    return {
      discount: raw.discount || "",
      threshold: raw.threshold || "",
      averageMarketDiscount: raw.averageMarketDiscount || "",
      name: raw.name || "",
      brands: findKnownMatches(raw.brands || "", brands) as string,
      retailer: findKnownMatches(raw.retailer || "", retailers) as string,
      category: findKnownMatches(raw.category || "", categories) as string,
      notes: raw.notes || "",
    };
  };

  // --- orchestration ---------------------------------------------------------

  const isGeminiConfigured = () =>
    Boolean(process.env.REACT_APP_GEMINI_API_KEY || process.env.GEMINI_API_KEY);

  const handleCreativeUpload = async (file: File) => {
    // 1) Save the ORIGINAL image for preview/storage — independent of OCR
    const reader = new FileReader();
    reader.onload = () => {
      update("creativeName", file.name);
      update(
        "creativeData",
        typeof reader.result === "string" ? reader.result : "",
      );
    };
    reader.readAsDataURL(file);

    // 2) Extract fields: prefer Gemini, fall back to Tesseract on any failure
    setOcrLoading(true);
    try {
      let extracted: ExtractedFields;

      if (isGeminiConfigured()) {
        try {
          extracted = await extractWithGemini(file);
        } catch (err) {
          console.warn(
            "Gemini extraction failed, falling back to Tesseract:",
            err,
          );
          extracted = await extractWithTesseract(file);
        }
      } else {
        extracted = await extractWithTesseract(file);
      }

      setForm((current) => mergeExtractedIntoForm(current, extracted));
    } catch (err) {
      console.error("OCR extraction failed:", err);
    } finally {
      setOcrLoading(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!form.name) errors.name = "Podaj nazwę promocji.";
    if (!form.from) errors.from = "Wybierz datę rozpoczęcia.";
    if (!form.to) errors.to = "Wybierz datę zakończenia.";
    if (form.from && form.to && form.from > form.to)
      errors.to = "Data zakończenia musi być po dacie rozpoczęcia.";
    if (!form.discount) errors.discount = "Podaj poziom rabatu.";
    if (!form.brands) errors.brands = "Wybierz markę.";
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError("Sprawdź wymagane pola formularza.");
      return;
    }

    let finalNotes = form.notes || "";
    if (finalNotes.trim() && isGeminiConfigured()) {
      setSubmitting(true);
      try {
        const translated = await translateToEnglishWithGemini(finalNotes);
        if (translated) {
          finalNotes = translated;
        }
      } catch (err) {
        console.warn("Failed to translate notes on submit with Gemini:", err);
      } finally {
        setSubmitting(false);
      }
    }

    onSave({ ...form, notes: finalNotes });
    setForm(emptyForm);
    setError("");
    setFieldErrors({});
    setPreviewUrl("");
  };

  return (
    <Modal open={open} onClose={onClose} aria-labelledby="promotion-form-title">
      <Box
        className="absolute left-1/2 top-1/2 w-[calc(100%-32px)] max-w-[900px] max-h-[90vh] h-[90vh] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl"
        sx={{
          p: 4,
        }}
      >
        <Box
          component="form"
          onSubmit={submit}
          className="flex flex-col gap-4 h-full"
        >
          <Box
            className="flex items-start justify-between gap-4 sticky"
            id="promotion-form-title"
          >
            <Box>
              <Typography
                sx={{ color: "#173c35", fontSize: 22, fontWeight: 800 }}
              >
                Dodaj promocję
              </Typography>
              <Typography sx={{ color: "#82908b", fontSize: 13, mt: 0.5 }}>
                Wprowadź dane kampanii. Zapisana promocja pozostanie w języku
                polskim.
              </Typography>
            </Box>
            <Button
              onClick={onClose}
              aria-label="Zamknij"
              sx={{ minWidth: 40, color: "#65736f" }}
            >
              <CloseRounded />
            </Button>
          </Box>
          <Box className="flex flex-col gap-4 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <Box className="mb-4 flex items-center justify-between">
              <Typography
                sx={{ color: "#48665d", fontSize: 13, fontWeight: 700 }}
              >
                Rynek *
              </Typography>
              <Box className="flex gap-1 rounded-l bg-[#f2f7f5]">
                {(["PL", "CZ"] as const).map((market) => (
                  <Button
                    key={market}
                    onClick={() => update("market", market)}
                    variant={form.market === market ? "contained" : "text"}
                    size="small"
                    sx={{
                      minWidth: 56,
                      backgroundColor:
                        form.market === market ? "#286e5e" : "transparent",
                      color: form.market === market ? "white" : "#65736f",
                      fontWeight: 800,
                    }}
                  >
                    {market}
                  </Button>
                ))}
              </Box>
            </Box>
            <Box className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                label="Nazwa promocji"
                value={form.name}
                onValueChange={(value) => update("name", value)}
                required
                error={fieldErrors.name}
                placeholder="Wpisz nazwę promocji"
              />
              <FormField
                type="select"
                label="Kategoria produktu"
                value={form.category}
                onValueChange={(value) => update("category", value)}
                options={categories.map((item) => ({
                  label: item,
                  value: item,
                }))}
                required
                placeholder="Kategoria produktu"
              />
              <FormField
                type="date"
                label="Data rozpoczęcia"
                value={form.from}
                onValueChange={(value) => update("from", value)}
                required
                error={fieldErrors.from}
                placeholder="DD/MM/YYYY"
              />
              <FormField
                type="date"
                label="Data zakończenia"
                value={form.to}
                onValueChange={(value) => update("to", value)}
                required
                error={fieldErrors.to}
                placeholder="DD/MM/YYYY"
              />
              <FormField
                type="select"
                label="Zasięg promocji"
                value={form.scope}
                onValueChange={(value) => update("scope", value)}
                options={scopes.map((item) => ({ label: item, value: item }))}
                placeholder="Zasięg promocji"
              />
              <FormField
                type="select"
                label="Kanał promocyjny"
                value={form.channel}
                onValueChange={(value) => update("channel", value)}
                options={channels.map((item) => ({ label: item, value: item }))}
                placeholder="Kanał promocyjny"
              />
              <FormField
                type="select"
                label="Marka"
                value={form.brands}
                onValueChange={(value) => update("brands", value)}
                options={brands.map((item) => ({ label: item, value: item }))}
                required
                error={fieldErrors.brands}
                placeholder="Marka"
              />
              <FormField
                type="select"
                label="Sprzedawca"
                value={form.retailer}
                onValueChange={(value) => update("retailer", value)}
                options={retailers.map((item) => ({
                  label: item,
                  value: item,
                }))}
                placeholder="Sprzedawca"
              />
              <FormField
                label="Poziom i typ rabatu"
                placeholder="np. -25% powyżej 99 PLN"
                value={form.discount}
                onValueChange={(value) => update("discount", value)}
                required
                error={fieldErrors.discount}
              />
              <FormField
                label="Próg zakupowy"
                placeholder="np. 99 PLN"
                value={form.threshold}
                onValueChange={(value) => update("threshold", value)}
              />
              <FormField
                type="number"
                label="Liczba SKU"
                value={form.skuCount}
                onValueChange={(value) => update("skuCount", value)}
                placeholder="Wpisz liczbę SKU"
              />
              <FormField
                label="Średni rabat rynkowy"
                placeholder="np. 18%"
                value={form.averageMarketDiscount}
                onValueChange={(value) =>
                  update("averageMarketDiscount", value)
                }
              />
              <FormField
                className="md:col-span-2"
                multiline
                minRows={3}
                label="Uwagi i warunki"
                placeholder="Regulamin, wyjątki, ograniczenia..."
                value={form.notes}
                onValueChange={(value) => update("notes", value)}
              />
              <Button
                component="label"
                variant="outlined"
                disabled={ocrLoading}
                startIcon={
                  ocrLoading ? (
                    <Box
                      component="span"
                      sx={{
                        width: 16,
                        height: 16,
                        border: "2px solid #bfd2ce",
                        borderTopColor: "#286e5e",
                        borderRadius: "50%",
                        display: "inline-block",
                        animation: "spin 0.8s linear infinite",
                      }}
                    />
                  ) : (
                    <AddPhotoAlternateRounded />
                  )
                }
                className="md:col-span-2 !justify-start !border-[#dce6e2] !py-3 !text-[#48665d] !normal-case disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span>
                  {ocrLoading
                    ? "Wczytuję i pobieram tekst..."
                    : form.creativeName || "Prześlij screenshot lub kreację"}
                </span>
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  disabled={ocrLoading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    handleCreativeUpload(file);
                  }}
                />
              </Button>
            </Box>
            {error && (
              <Typography sx={{ color: "#b55a50", fontSize: 13, mt: 2 }}>
                {error}
              </Typography>
            )}
          </Box>
          <Box className="flex justify-end gap-2 sticky">
            <Button
              onClick={onClose}
              sx={{ color: "#65736f", textTransform: "none" }}
            >
              Anuluj
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submitting || ocrLoading}
              startIcon={
                submitting ? (
                  <Box
                    component="span"
                    sx={{
                      width: 16,
                      height: 16,
                      border: "2px solid #bfd2ce",
                      borderTopColor: "white",
                      borderRadius: "50%",
                      display: "inline-block",
                      animation: "spin 0.8s linear infinite",
                    }}
                  />
                ) : (
                  <SaveRounded />
                )
              }
              sx={{
                backgroundColor: "#286e5e",
                textTransform: "none",
                "&:hover": { backgroundColor: "#1d594b" },
              }}
            >
              {submitting ? "Zapisuję..." : "Zapisz promocję"}
            </Button>
          </Box>
        </Box>
      </Box>
    </Modal>
  );
}
