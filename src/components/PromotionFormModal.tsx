import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  AddPhotoAlternateRounded,
  CloseRounded,
  DeleteOutlineRounded,
  SaveRounded,
  EditRounded,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Modal,
  Typography,
  IconButton,
} from "@mui/material";
import { createWorker } from "tesseract.js";
import { useAppContext, type Promotion } from "../context/AppContext";
import FormField from "./FormField";
import { getMarketBrandOptions, sephoraBrands } from "../data/brands";
import type { Product } from "../data/productTypes";
import { czDummyRetailers, plRetailers } from "../data/retailers";
import {
  readPromotionFieldsWithGemini,
  translateToEnglishWithGemini,
} from "../utils/geminiOcr";
import { preprocessImageForOCR } from "../utils/imagePreprocessing";

const fallbackImage =
  "https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=900&q=80";

const categories = ["Pielęgnacja", "Perfumy", "Makijaż", "Włosy"];
const productCategories = [
  "Skincare",
  "Fragrance",
  "Makeup",
  "Haircare",
] as const;
const brandCatalog = [...sephoraBrands];
const retailers = [...plRetailers];
const czRetailers = [...czDummyRetailers];
const scopes = ["Wielokanałowa", "Tylko e-commerce", "Tylko aplikacja mobilna"];
const channels = [
  "Media społecznościowe",
  "Strona internetowa",
  "Telewizja",
  "E-mail",
  "Sklep stacjonarny",
  "Aplikacja mobilna",
];

export const getPromotionTypeFieldConfig = (
  market: "PL" | "CZ",
  promotionType: string,
) => {
  const currency = market === "CZ" ? "CZK" : "PLN";

  if (promotionType === "Buy one get one free") {
    return {
      currency,
      showDiscount: true,
      showThreshold: false,
      showPromoPrice: false,
      requiredFields: {
        discount: false,
        threshold: false,
        promoPrice: false,
      },
    };
  }

  if (promotionType === "Custom") {
    return {
      currency,
      showDiscount: true,
      showThreshold: true,
      showPromoPrice: true,
      requiredFields: {
        discount: false,
        threshold: false,
        promoPrice: false,
      },
    };
  }

  return {
    currency,
    showDiscount: true,
    showThreshold: true,
    showPromoPrice: true,
    requiredFields: {
      discount: true,
      threshold: true,
      promoPrice: true,
    },
  };
};

type FormState = Omit<Promotion, "id" | "createdAt"> & {
  brands: string;
  product: string;
};

const promotionTypeOptions = {
  PL: [
    { label: "Stały rabat", value: "Fixed promotion" },
    { label: "Kup 1, dostaniesz 1 gratis", value: "Buy one get one free" },
    { label: "Niestandardowa", value: "Custom" },
  ],
  CZ: [
    { label: "Fixní sleva", value: "Fixed promotion" },
    { label: "Kupte jeden a druhý získejte zdarma", value: "Buy one get one free" },
    { label: "Zvyk", value: "Custom" },
  ],
} as const;

const emptyForm: FormState = {
  market: "PL",
  name: "",
  from: "",
  to: "",
  scope: "",
  channel: "",
  category: "",
  brands: "",
  product: "",
  retailer: "",
  discount: "",
  threshold: "",
  promoPrice: "",
  promotionType: "Fixed promotion",
  skuCount: 1,
  notes: "",
  creativeName: "",
  creativeData: "",
  averageMarketDiscount: "",
};

// --- OCR helpers -----------------------------------------------------

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

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
  const discountMatch = text.match(/-?\d{1,3}\s?%(?:\s?(?:rabat[u]?|off))?/i);
  const discount = discountMatch ? discountMatch[0].replace(/\s+/g, "") : "";

  const thresholdMatch = text.match(
    /(?:powyżej|od)\s?\d{1,4}(?:[.,]\d{1,2})?\s?(?:PLN|zł|CZK|Kč)/i,
  );
  const threshold = thresholdMatch ? thresholdMatch[0] : "";

  const avgMatch = text.match(
    /średni[a-ząęćłńóśźż]*\s?rabat[a-ząęćłńóśźż]*\D{0,10}(\d{1,3}\s?%)/i,
  );
  const averageMarketDiscount = avgMatch ? avgMatch[1].replace(/\s+/g, "") : "";

  const matchedBrand = findKnownMatches(text, brandCatalog) as string;
  const matchedRetailer = findKnownMatches(text, retailers) as string;
  const matchedCategory = findKnownMatches(text, categories) as string;

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

// -----------------------------------------------------------------------

export default function PromotionFormModal({
  open,
  onClose,
  onSave,
  editingPromotion,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (promotion: FormState) => void;
  editingPromotion?: Promotion | null;
}) {
  const { brandsByMarket, addBrand, addProduct, products } = useAppContext();
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const promotionFieldConfig = getPromotionTypeFieldConfig(
    form.market,
    form.promotionType,
  );
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [ocrLoading, setOcrLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const currentLanguage =
    form.market === "CZ"
      ? {
        addPromotion: "Přidat akci",
        marketSubtitle:
          "Zadejte podrobnosti kampaně. Uložená akce zůstane ve stejném formátu v polštině.",
        market: "Trh *",
        marketLabel: "Trh",
        promotionType: "Typ akce",
        promotionTypeOptions: promotionTypeOptions.CZ,
        productCategory: "Kategorie produktu",
        categoryPlaceholder: "Vyberte kategorii",
        promoName: "Název akce",
        promoNamePlaceholder: "Zadejte název akce",
        startDate: "Datum začátku",
        endDate: "Datum ukončení",
        scope: "Rozsah akce",
        scopePlaceholder: "Vyberte rozsah akce",
        channel: "Propagační kanál",
        channelPlaceholder: "Vyberte propagační kanál",
        lockedEdit: "Uzamčeno v režimu úprav",
        editableEdit: "Upravitelný v režimu úprav",
        brand: "Značka",
        product: "Produkt",
        retailer: "Prodejce",
        discount: "Typ a výše slevy",
        discountPlaceholder: "např. -25% nad 999 CZK",
        threshold: "Minimální nákup",
        thresholdPlaceholder: "např. 999 CZK",
        sku: "Počet SKU",
        skuPlaceholder: "Zadejte počet SKU",
        avgDiscount: "Průměrná tržní sleva",
        avgDiscountPlaceholder: "např. 18%",
        notes: "Poznámky a podmínky",
        notesPlaceholder: "Podmínky, výjimky, pravidla...",
        upload: "Nahrajte screenshot nebo kreativ",
        changeImage: "Změnit obrázek",
        loading: "Načítání textu...",
        cancel: "Zrušit",
        save: "Uložit akci",
        add: "Přidat",
        addBrand: "Přidat značku",
        addProduct: "Přidat produkt",
        addBrandTitle: "Přidat novou značku",
        addProductTitle: "Přidat nový produkt",
        brandNameLabel: "Název značky",
        brandNamePlaceholder: "Zadejte název značky",
        productNameLabel: "Název produktu",
        productNamePlaceholder: "Název produktu",
        brandSelectLabel: "Značka",
        brandSelectPlaceholder: "Vyberte značku",
        productBrandLabel: "Vybrat značku",
        categorySelectLabel: "Kategorie",
        categorySelectPlaceholder: "Vyberte kategorii",
        priceLabel: "Cena",
        pricePlaceholder: "Cena",
        descriptionLabel: "Popis",
        descriptionPlaceholder: "Popis",
        retailerLabel: "Prodejce",
        retailerPlaceholder: "Prodejce",
        saveBrand: "Uložit značku",
        saveProduct: "Uložit produkt",
        validationError: "Zkontrolujte povinná pole formuláře.",
        errors: {
          name: "Zadejte název akce.",
          from: "Vyberte datum začátku.",
          to: "Vyberte datum ukončení.",
          invalidDates: "Datum ukončení musí být po datu začátku.",
          discount: "Zadejte výši slevy.",
          brand: "Vyberte značku.",
          product: "Vyberte produkt.",
        },
      }
      : {
        addPromotion: "Dodaj promocję",
        marketSubtitle: "Wprowadź dane kampanii. Zapisana promocja pozostanie w tym samym formacie w języku polskim.",
        market: "Rynek *",
        marketLabel: "Rynek",
        promotionType: "Typ promocji",
        promotionTypeOptions: promotionTypeOptions.PL,
        productCategory: "Kategoria produktu",
        categoryPlaceholder: "Wybierz kategorię",
        promoName: "Nazwa promocji",
        promoNamePlaceholder: "Wprowadź nazwę promocji",
        startDate: "Data rozpoczęcia",
        endDate: "Data zakończenia",
        scope: "Zasięg promocji",
        scopePlaceholder: "Wybierz zasięg promocji",
        channel: "Kanał promocyjny",
        channelPlaceholder: "Wybierz kanał promocyjny",
        lockedEdit: "Zablokowane w trybie edycji",
        editableEdit: "Edytowalne w trybie edycji",
        brand: "Marka",
        product: "Produkt",
        retailer: "Sprzedawca",
        discount: "Poziom i typ rabatu",
        discountPlaceholder: "np. -25% powyżej 99 PLN",
        threshold: "Próg zakupowy",
        thresholdPlaceholder: "np. 99 PLN",
        sku: "Liczba SKU",
        skuPlaceholder: "Wpisz liczbę SKU",
        avgDiscount: "Średni rabat rynkowy",
        avgDiscountPlaceholder: "np. 18%",
        notes: "Uwagi i warunki",
        notesPlaceholder: "Warunki, wykluczenia, zasady...",
        upload: "Prześlij screenshot lub kreację",
        changeImage: "Zmień obraz",
        loading: "Wczytuję tekst...",
        cancel: "Anuluj",
        save: "Zapisz promocję",
        add: "Dodaj",
        addBrand: "Dodaj markę",
        addProduct: "Dodaj produkt",
        addBrandTitle: "Dodaj nową markę",
        addProductTitle: "Dodaj nowy produkt",
        brandNameLabel: "Nazwa marki",
        brandNamePlaceholder: "Wpisz nazwę marki",
        productNameLabel: "Nazwa produktu",
        productNamePlaceholder: "Nazwa produktu",
        brandSelectLabel: "Marka",
        brandSelectPlaceholder: "Wybierz markę",
        productBrandLabel: "Wybierz markę",
        categorySelectLabel: "Kategoria",
        categorySelectPlaceholder: "Wybierz kategorię",
        priceLabel: "Cena",
        pricePlaceholder: "Cena",
        descriptionLabel: "Opis",
        descriptionPlaceholder: "Opis",
        retailerLabel: "Sprzedawca",
        retailerPlaceholder: "Sprzedawca",
        saveBrand: "Zapisz markę",
        saveProduct: "Zapisz produkt",
        validationError: "Sprawdź wymagane pola formularza.",
        errors: {
          name: "Podaj nazwę promocji.",
          from: "Wybierz datę rozpoczęcia.",
          to: "Wybierz datę zakończenia.",
          invalidDates: "Data zakończenia musi być po dacie rozpoczęcia.",
          discount: "Podaj poziom rabatu.",
          brand: "Wybierz markę.",
          product: "Wybierz produkt.",
        },
      };

  const [newProduct, setNewProduct] = useState<{
    name: string;
    brand: string;
    category: Product["category"];
    price: string;
    description: string;
    retailer: string;
    image: string;
  }>({
    name: "",
    brand: "",
    category: productCategories[0],
    price: "",
    description: "",
    retailer: "",
    image: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const update = useCallback(
    (field: keyof FormState, value: string | number | string[]) => {
      setForm((current) => ({ ...current, [field]: value }));
    },
    [],
  );

  const clearOcrDerivedFields = useCallback(
    (current: FormState): FormState => ({
      ...current,
      discount: "",
      threshold: "",
      averageMarketDiscount: "",
      brands: "",
      retailer: "",
      category: "",
      name: "",
      notes: "",
    }),
    [],
  );

  const removeImage = () => {
    setPreviewUrl("");
    setImageFile(null);
    setForm((current) => ({
      ...clearOcrDerivedFields(current),
      creativeName: "",
      creativeData: "",
    }));
  };

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

  function mergeExtractedIntoForm(
    current: FormState,
    extracted: ExtractedFields,
  ): FormState {
    return {
      ...current,
      discount: extracted.discount || current.discount || "",
      threshold: extracted.threshold || current.threshold || "",
      averageMarketDiscount:
        extracted.averageMarketDiscount || current.averageMarketDiscount || "",
      brands: extracted.brands || current.brands || "",
      retailer: extracted.retailer || current.retailer || "",
      category: extracted.category || current.category || "",
      name: extracted.name || current.name || "",
      notes: extracted.notes || current.notes || "",
    };
  }

  // --- Tesseract path (local OCR) ----------------------------------------

  async function extractWithTesseract(file: File): Promise<ExtractedFields> {
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

    return extractPromotionFields(text);
  }

  // --- Gemini path ---------------------------------------------------------

  async function extractWithGemini(file: File): Promise<ExtractedFields> {
    const raw = await readPromotionFieldsWithGemini(file);

    return {
      discount: raw.discount || "",
      threshold: raw.threshold || "",
      averageMarketDiscount: raw.averageMarketDiscount || "",
      name: raw.name || "",
      brands: findKnownMatches(raw.brands || "", brandCatalog) as string,
      retailer: findKnownMatches(raw.retailer || "", retailers) as string,
      category: findKnownMatches(raw.category || "", categories) as string,
      notes: raw.notes || "",
    };
  }

  async function handleImageUpload(file: File) {
    setImageFile(file);
    setForm((current) => ({ ...clearOcrDerivedFields(current) }));

    // Save the ORIGINAL image for preview/storage
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      setPreviewUrl(result);
      update("creativeName", file.name);
      update("creativeData", result);
    };
    reader.readAsDataURL(file);

    // Extract fields
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
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      handleImageUpload(file);
    },
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
    },
    multiple: false,
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
  });

  // --- orchestration ---------------------------------------------------------

  const isGeminiConfigured = () =>
    Boolean(process.env.REACT_APP_GEMINI_API_KEY || process.env.GEMINI_API_KEY);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!form.name) errors.name = currentLanguage.errors.name;
    if (!form.from) errors.from = currentLanguage.errors.from;
    if (!form.to) errors.to = currentLanguage.errors.to;
    if (form.from && form.to && form.from > form.to)
      errors.to = currentLanguage.errors.invalidDates;
    if (
      promotionFieldConfig.requiredFields.discount &&
      !form.discount
    ) {
      errors.discount = currentLanguage.errors.discount;
    }
    if (
      promotionFieldConfig.requiredFields.threshold &&
      !form.threshold
    ) {
      errors.threshold = currentLanguage.errors.discount;
    }
    if (
      promotionFieldConfig.requiredFields.promoPrice &&
      !form.promoPrice
    ) {
      errors.promoPrice = currentLanguage.errors.discount;
    }
    if (!form.brands) errors.brands = currentLanguage.errors.brand;
    if (!form.product) errors.product = currentLanguage.errors.product;
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

    onSave({
      ...{
        ...form,
        promotionType: form.promotionType || "Fixed promotion",
        promoPrice: form.promoPrice || "",
      }, notes: finalNotes
    });
    setForm(emptyForm);
    setError("");
    setFieldErrors({});
    setPreviewUrl("");
    setImageFile(null);
  };

  useEffect(() => {
    if (!editingPromotion) {
      setForm(emptyForm);
      setPreviewUrl("");
      setImageFile(null);
      return;
    }

    const nextCreativeData = editingPromotion.creativeData || "";
    const safePreview = nextCreativeData || fallbackImage;
    setPreviewUrl(safePreview);
    setImageFile(null);

    setForm({
      ...emptyForm,
      market: editingPromotion.market,
      name: editingPromotion.name,
      from: editingPromotion.from,
      to: editingPromotion.to,
      scope: editingPromotion.scope,
      channel: editingPromotion.channel,
      category: editingPromotion.category,
      brands: editingPromotion.brands,
      product: editingPromotion.name,
      retailer: editingPromotion.retailer,
      discount: editingPromotion.discount,
      threshold: editingPromotion.threshold,
      promoPrice: editingPromotion.promoPrice,
      promotionType: editingPromotion.promotionType,
      skuCount: editingPromotion.skuCount,
      notes: editingPromotion.notes,
      creativeName: editingPromotion.creativeName || editingPromotion.name,
      creativeData: nextCreativeData,
      averageMarketDiscount: editingPromotion.averageMarketDiscount,
    });
  }, [editingPromotion]);

  const marketRetailers = form.market === "CZ" ? czRetailers : retailers;
  const marketBrandOptions = getMarketBrandOptions(
    form.market,
    brandsByMarket[form.market],
  );
  const marketProductOptions = products.filter(
    (item) => item.market === form.market,
  );
  const discountLabel =
    form.promotionType === "Buy one get one free"
      ? currentLanguage.discount === "Typ a výše slevy"
        ? "Typ nabídky"
        : "Typ oferty"
      : currentLanguage.discount;

  const editableFields = new Set([
    "promotionType",
    "from",
    "to",
    "discount",
    "threshold",
    "promoPrice",
  ]);

  const isReadOnlyField = (field: keyof FormState) => {
    if (!editingPromotion) return false;
    return !editableFields.has(field);
  };

  return (
    <>
      <Modal
        open={open}
        onClose={(event: any) => {
          if (ocrLoading) {
            event?.preventDefault?.();
            return;
          }
          onClose();
        }}
        aria-labelledby="promotion-form-title"
      >
        <Box
          className="absolute left-1/2 top-1/2 w-[calc(100%-32px)] max-w-[900px] max-h-[90vh] h-[90vh] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white shadow-2xl relative border border-[#e5e5e5]"
          sx={{
            p: 4,
          }}
        >
          {ocrLoading && (
            <Box className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur-[1px]">
              <Box className="flex items-center gap-3 rounded-xl bg-[#000000] px-5 py-3.5 text-white shadow-xl">
                <Box
                  component="span"
                  sx={{
                    width: 18,
                    height: 18,
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#e50043",
                    borderRadius: "50%",
                    display: "inline-block",
                    animation: "spin 0.8s linear infinite",
                  }}
                />
                <Typography sx={{ fontSize: 13, fontWeight: 700 }}>
                  {currentLanguage.loading}
                </Typography>
              </Box>
            </Box>
          )}
          <Box
            component="form"
            onSubmit={submit}
            className="flex flex-col gap-4 h-full"
          >
            <Box
              className="flex items-start justify-between gap-4 sticky pb-4"
              id="promotion-form-title"
            >
              <Box>
                <Typography
                  sx={{ color: "#000000", fontSize: 20, fontWeight: 800, letterSpacing: "-0.01em" }}
                >
                  {currentLanguage.addPromotion}
                </Typography>
                <Typography sx={{ color: "#757575", fontSize: 12.5, mt: 0.5 }}>
                  {form.market === "CZ"
                    ? "Zadejte údaje kampaně. Uložená akce zůstane v českém formátu."
                    : "Wprowadź dane kampanii. Zapisana promocja pozostanie w tym samym formacie w języku polskim."}
                </Typography>
              </Box>
              <Button
                onClick={ocrLoading ? undefined : onClose}
                disabled={ocrLoading}
                aria-label="Zamknij"
                sx={{ minWidth: 36, width: 36, height: 36, color: "#000000", p: 0, borderRadius: "50%", "&:hover": { backgroundColor: "#f5f5f5" } }}
              >
                <CloseRounded />
              </Button>
            </Box>
            <Box className="flex flex-col gap-4 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <Box className="mb-2 flex items-center justify-between">
                <Typography
                  sx={{ color: "#000000", fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em" }}
                >
                  {currentLanguage.market}
                </Typography>
                <Box className="flex gap-1 rounded bg-[#f5f5f5] p-1">
                  {(["PL", "CZ"] as const).map((market) => (
                    <Button
                      key={market}
                      onClick={() => {
                        update("market", market);
                        setForm((current) => ({
                          ...current,
                          market,
                          brands: "",
                          product: "",
                          retailer: "",
                          category: "",
                        }));
                      }}
                      variant={form.market === market ? "contained" : "text"}
                      size="small"
                      sx={{
                        minWidth: 54,
                        backgroundColor:
                          form.market === market ? "#000000" : "transparent",
                        color: form.market === market ? "#ffffff" : "#666666",
                        fontWeight: 800,
                        boxShadow: "none",
                        "&:hover": {
                          backgroundColor: form.market === market ? "#111111" : "#e5e5e5",
                          boxShadow: "none",
                        },
                      }}
                    >
                      {market}
                    </Button>
                  ))}
                </Box>
              </Box>

              <Box className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  type="select"
                  label={currentLanguage.promotionType}
                  value={form.promotionType}
                  disabled={isReadOnlyField("promotionType")}
                  onValueChange={(value) => {
                    const nextType = value as FormState["promotionType"];
                    setForm((current) => ({
                      ...current,
                      promotionType: nextType,
                      threshold:
                        nextType === "Buy one get one free" ? "" : current.threshold,
                      promoPrice:
                        nextType === "Buy one get one free" ? "" : current.promoPrice,
                      discount: current.discount || "",
                    }));
                  }}
                  options={currentLanguage.promotionTypeOptions.map((item) => ({
                    label: item.label,
                    value: item.value,
                  }))}
                  placeholder={currentLanguage.promotionType}
                  required
                  error={fieldErrors.promotionType}
                  helperText={isReadOnlyField("promotionType") ? currentLanguage.editableEdit : undefined}
                />
                <FormField
                  label={currentLanguage.promoName}
                  value={form.name}
                  onValueChange={(value) => update("name", value)}
                  required
                  disabled={isReadOnlyField("name")}
                  error={fieldErrors.name}
                  placeholder={currentLanguage.promoNamePlaceholder}
                  helperText={isReadOnlyField("name") ? currentLanguage.lockedEdit : undefined}
                />
                <FormField
                  type="select"
                  label={currentLanguage.productCategory}
                  value={form.category}
                  disabled={isReadOnlyField("category")}
                  onValueChange={(value) => update("category", value)}
                  options={categories.map((item) => ({
                    label: item,
                    value: item,
                  }))}
                  required
                  placeholder={currentLanguage.categoryPlaceholder}
                />
                <FormField
                  type="date"
                  label={currentLanguage.startDate}
                  value={form.from}
                  disabled={isReadOnlyField("from")}
                  onValueChange={(value) => update("from", value)}
                  required
                  error={fieldErrors.from}
                  placeholder={currentLanguage.startDate}
                  helperText={isReadOnlyField("from") ? currentLanguage.lockedEdit : undefined}
                />
                <FormField
                  type="date"
                  label={currentLanguage.endDate}
                  value={form.to}
                  disabled={isReadOnlyField("to")}
                  onValueChange={(value) => update("to", value)}
                  required
                  error={fieldErrors.to}
                  placeholder={currentLanguage.endDate}
                  helperText={isReadOnlyField("to") ? currentLanguage.lockedEdit : undefined}
                />
                <FormField
                  type="select"
                  label={currentLanguage.scope}
                  value={form.scope}
                  disabled={isReadOnlyField("scope")}
                  onValueChange={(value) => update("scope", value)}
                  options={scopes.map((item) => ({ label: item, value: item }))}
                  placeholder={currentLanguage.scopePlaceholder}
                />
                <FormField
                  type="select"
                  label={currentLanguage.channel}
                  value={form.channel}
                  disabled={isReadOnlyField("channel")}
                  onValueChange={(value) => update("channel", value)}
                  options={channels.map((item) => ({
                    label: item,
                    value: item,
                  }))}
                  placeholder={currentLanguage.channelPlaceholder}
                />
                <FormField
                  key={`brand-${form.market}`}
                  type="select"
                  label={currentLanguage.brand}
                  value={form.brands}
                  disabled={isReadOnlyField("brands")}
                  onValueChange={(value) => update("brands", value)}
                  options={marketBrandOptions.map((item) => ({
                    label: item,
                    value: item,
                  }))}
                  required
                  error={fieldErrors.brands}
                  placeholder={currentLanguage.brand}
                />
                <FormField
                  key={`product-${form.market}`}
                  type="select"
                  label={currentLanguage.product}
                  value={form.product}
                  disabled={isReadOnlyField("product")}
                  onValueChange={(value) => {
                    const nextProduct = String(value);
                    const selected = marketProductOptions.find(
                      (item) => item.name === nextProduct,
                    );

                    setForm((current) => ({
                      ...current,
                      product: nextProduct,
                      brands: selected?.brand || current.brands,
                      category: selected?.category
                        ? categories.find(
                          (item) =>
                            item ===
                            {
                              Skincare: "Pielęgnacja",
                              Fragrance: "Perfumy",
                              Makeup: "Makijaż",
                              Haircare: "Włosy",
                            }[selected.category],
                        ) || current.category
                        : current.category,
                      retailer: selected?.retailer || current.retailer,
                    }));
                  }}
                  options={marketProductOptions.map((item) => ({
                    label: `${item.name} · ${item.brand}`,
                    value: item.name,
                  }))}
                  required
                  error={fieldErrors.product}
                  placeholder={currentLanguage.product}
                />
                <FormField
                  key={`retailer-${form.market}`}
                  type="select"
                  label={currentLanguage.retailer}
                  value={form.retailer}
                  disabled={isReadOnlyField("retailer")}
                  onValueChange={(value) => update("retailer", value)}
                  options={marketRetailers.map((item) => ({
                    label: item,
                    value: item,
                  }))}
                  placeholder={currentLanguage.retailer}
                />
                {promotionFieldConfig.showDiscount && (
                  <FormField
                    label={discountLabel}
                    placeholder={
                      form.promotionType === "Buy one get one free"
                        ? form.market === "CZ"
                          ? "např. Kupte 1 a 2. zdarma"
                          : "np. Kup 1, dostaniesz 1 gratis"
                        : form.promotionType === "Custom"
                          ? form.market === "CZ"
                            ? "např. 2 za 1 nebo 299 CZK"
                            : "np. 2 za 1 lub 299 PLN"
                          : form.market === "CZ"
                            ? "např. -25% nad 999 CZK"
                            : "np. -25% powyżej 99 PLN"
                    }
                    value={form.discount}
                    disabled={isReadOnlyField("discount")}
                    onValueChange={(value) => update("discount", value)}
                    required={promotionFieldConfig.requiredFields.discount}
                    error={fieldErrors.discount}
                  />
                )}
                {promotionFieldConfig.showPromoPrice && (
                  <FormField
                    type="number"
                    label={
                      form.market === "CZ"
                        ? "Cena po slevě"
                        : "Cena po promocji"
                    }
                    placeholder={
                      form.market === "CZ" ? "např. 999 CZK" : "np. 299 PLN"
                    }
                    value={form.promoPrice}
                    disabled={isReadOnlyField("promoPrice")}
                    onValueChange={(value) => update("promoPrice", String(value))}
                    required={promotionFieldConfig.requiredFields.promoPrice}
                    error={fieldErrors.promoPrice}
                  />
                )}
                {promotionFieldConfig.showThreshold && (
                  <FormField
                    label={currentLanguage.threshold}
                    placeholder={
                      form.market === "CZ" ? "např. 999 CZK" : "np. 99 PLN"
                    }
                    value={form.threshold}
                    disabled={isReadOnlyField("threshold")}
                    onValueChange={(value) => update("threshold", value)}
                    required={promotionFieldConfig.requiredFields.threshold}
                    error={fieldErrors.threshold}
                  />
                )}
                <FormField
                  type="number"
                  label={currentLanguage.sku}
                  value={form.skuCount}
                  onValueChange={(value) => update("skuCount", value)}
                  placeholder="Wpisz liczbę SKU"
                />
                <FormField
                  label={currentLanguage.avgDiscount}
                  placeholder={currentLanguage.avgDiscountPlaceholder}
                  value={form.averageMarketDiscount}
                  onValueChange={(value) =>
                    update("averageMarketDiscount", value)
                  }
                />
                <FormField
                  className="md:col-span-2"
                  multiline
                  minRows={3}
                  label={currentLanguage.notes}
                  placeholder={currentLanguage.notesPlaceholder}
                  value={form.notes}
                  disabled={isReadOnlyField("notes")}
                  onValueChange={(value) => update("notes", value)}
                />
              </Box>
              {/* Image Upload Section with Preview */}
              <Box className="mb-2">
                {previewUrl ? (
                  <Box className="relative rounded-lg overflow-hidden border border-[#e5e5e5]">
                    <Box className="relative">
                      <img
                        src={previewUrl || fallbackImage}
                        alt="Promotion preview"
                        className="w-full h-auto max-h-[20rem] object-cover bg-[#f7f7f8]"
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = fallbackImage;
                        }}
                      />
                      <Box className="absolute top-2 right-2 flex gap-1">
                        <IconButton
                          size="small"
                          sx={{
                            bgcolor: "white",
                            "&:hover": { bgcolor: "#f5f5f5" },
                            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                          }}
                          onClick={() => {
                            const input = document.createElement("input");
                            input.type = "file";
                            input.accept = "image/*";
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement)
                                .files?.[0];
                              if (file) handleImageUpload(file);
                            };
                            input.click();
                          }}
                          disabled={ocrLoading}
                        >
                          <EditRounded sx={{ fontSize: 18, color: "#000000" }} />
                        </IconButton>
                        <IconButton
                          size="small"
                          sx={{
                            bgcolor: "white",
                            "&:hover": { bgcolor: "#f5f5f5" },
                            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                          }}
                          onClick={removeImage}
                          disabled={ocrLoading}
                        >
                          <DeleteOutlineRounded sx={{ fontSize: 18, color: "#e50043" }} />
                        </IconButton>
                      </Box>
                      {ocrLoading && (
                        <Box className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Box className="bg-white px-4 py-2 rounded-lg flex items-center gap-2">
                            <Box
                              component="span"
                              sx={{
                                width: 16,
                                height: 16,
                                border: "2px solid #e5e5e5",
                                borderTopColor: "#e50043",
                                borderRadius: "50%",
                                display: "inline-block",
                                animation: "spin 0.8s linear infinite",
                              }}
                            />
                            <Typography sx={{ fontSize: 13, color: "#000000", fontWeight: 700 }}>
                              {currentLanguage.loading}
                            </Typography>
                          </Box>
                        </Box>
                      )}
                    </Box>
                    <Box className="px-3 py-2 bg-[#f7f7f8] flex items-center justify-between border-t border-[#e5e5e5]">
                      <Typography sx={{ fontSize: 12, color: "#000000", fontWeight: 600 }}>
                        {form.creativeName}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: "#757575" }}>
                        {imageFile
                          ? `${(imageFile.size / 1024).toFixed(0)} KB`
                          : ""}
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <Box
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragActive
                        ? "border-[#000000] bg-[#f7f7f8]"
                        : "border-[#d1d1d1] hover:border-[#000000] bg-[#fafafa]"
                      } ${ocrLoading ? "pointer-events-none opacity-60" : ""}`}
                  >
                    <input {...getInputProps()} disabled={ocrLoading} />
                    <AddPhotoAlternateRounded
                      sx={{ fontSize: 36, color: "#757575", mb: 1 }}
                    />
                    <Typography
                      sx={{ color: "#000000", fontSize: 13, fontWeight: 700 }}
                    >
                      {isDragActive
                        ? "Upuść obraz tutaj"
                        : currentLanguage.upload}
                    </Typography>
                    <Typography
                      sx={{ color: "#757575", fontSize: 11.5, mt: 0.5 }}
                    >
                      PNG, JPG, WEBP (max 5MB)
                    </Typography>
                    {ocrLoading && (
                      <Typography
                        sx={{ color: "#e50043", fontSize: 12, mt: 1, fontWeight: 700 }}
                      >
                        {currentLanguage.loading}
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
              {error && (
                <Typography sx={{ color: "#e50043", fontSize: 13, mt: 2, fontWeight: 700 }}>
                  {error}
                </Typography>
              )}
            </Box>
            <Box className="flex justify-end gap-2 sticky pt-4">
              <Button
                onClick={onClose}
                sx={{ color: "#757575", textTransform: "none", fontWeight: 700 }}
              >
                {currentLanguage.cancel}
              </Button>
              <Button
                type="submit"
                variant="contained"
                disabled={submitting}
                startIcon={
                  submitting ? (
                    <Box
                      component="span"
                      sx={{
                        width: 16,
                        height: 16,
                        border: "2px solid #666666",
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
                  backgroundColor: "#000000",
                  color: "#ffffff",
                  textTransform: "none",
                  fontWeight: 800,
                  "&:hover": { backgroundColor: "#222222" },
                }}
              >
                {currentLanguage.save}
              </Button>
            </Box>
          </Box>
        </Box>
      </Modal>
    </>
  );
}
