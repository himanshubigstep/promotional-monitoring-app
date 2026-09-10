import { useCallback, useState } from "react";
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
import { marketCatalog } from "../data/catalog";
import { czDummyRetailers, plRetailers } from "../data/retailers";
import {
  readPromotionFieldsWithGemini,
  translateToEnglishWithGemini,
} from "../utils/geminiOcr";
import { preprocessImageForOCR } from "../utils/imagePreprocessing";

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

type FormState = Omit<Promotion, "id" | "createdAt"> & {
  brands: string;
  product: string;
};

const promotionTypeOptions = {
  PL: [
    { label: "Promocja stała", value: "Fixed promotion" },
    { label: "Kup 1, dostaniesz 1 gratis", value: "Buy one get one free" },
    { label: "Niestandardowa", value: "Custom" },
  ],
  CZ: [
    { label: "Fixní sleva", value: "Fixed promotion" },
    { label: "Kup 1, dostanete 1 zdarma", value: "Buy one get one free" },
    { label: "Vlastní", value: "Custom" },
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
}: {
  open: boolean;
  onClose: () => void;
  onSave: (promotion: FormState) => void;
}) {
  const { brandsByMarket, addBrand, addProduct } = useAppContext();
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [ocrLoading, setOcrLoading] = useState(false);
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const currentLanguage =
    form.market === "CZ"
      ? {
          addPromotion: "Přidat akci",
          marketSubtitle:
            "Zadejte údaje kampaně. Uložená akce zůstane v českém formátu.",
          market: "Trh *",
          marketLabel: "Trh",
        promotionType: "Typ akce",
        promotionTypeOptions: promotionTypeOptions.CZ,
          productCategory: "Kategorie produktu",
          promoName: "Název akce",
          promoNamePlaceholder: "Zadejte název akce",
          startDate: "Datum začátku",
          endDate: "Datum ukončení",
          scope: "Rozsah akce",
          scopePlaceholder: "Vyberte rozsah akce",
          channel: "Propagační kanál",
          channelPlaceholder: "Vyberte propagační kanál",
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
        productBrandLabel: "Značka produktu",
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
        promoName: "Nazwa promocji",
        promoNamePlaceholder: "Wprowadź nazwę promocji",
        startDate: "Data rozpoczęcia",
        endDate: "Data zakończenia",
        scope: "Zasięg promocji",
        scopePlaceholder: "Wybierz zasięg promocji",
        channel: "Kanał promocyjny",
        channelPlaceholder: "Wybierz kanał promocyjny",
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
        productBrandLabel: "Marka produktu",
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
    if (!form.discount) errors.discount = currentLanguage.errors.discount;
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

    onSave({ ...{
      ...form,
      promotionType: form.promotionType || "Fixed promotion",
      promoPrice: form.promoPrice || "",
    }, notes: finalNotes });
    setForm(emptyForm);
    setError("");
    setFieldErrors({});
    setPreviewUrl("");
    setImageFile(null);
  };

  const marketRetailers = form.market === "CZ" ? czRetailers : retailers;
  const marketBrandOptions = getMarketBrandOptions(
    form.market,
    brandsByMarket[form.market],
  );
  const marketProductOptions = marketCatalog.filter(
    (item) => item.market === form.market,
  );
  const discountLabel =
    form.promotionType === "Buy one get one free"
      ? currentLanguage.discount === "Typ a výše slevy"
        ? "Typ nabídky"
        : "Typ oferty"
      : currentLanguage.discount;

  const saveBrand = () => {
    const trimmed = newBrandName.trim();
    if (!trimmed) return;

    addBrand(trimmed, form.market as "PL" | "CZ");
    setForm((current) => ({ ...current, brands: trimmed }));
    setNewBrandName("");
    setBrandModalOpen(false);
  };

  const saveProduct = () => {
    const productName = newProduct.name.trim();
    const brandName = newProduct.brand.trim();

    if (!productName || !brandName) return;

    const createdProduct: Product = {
      id: `USER-${Date.now()}`,
      name: productName,
      brand: brandName,
      category: newProduct.category as Product["category"],
      price: Number(newProduct.price || 0),
      currency: form.market === "CZ" ? "CZK" : "PLN",
      market: form.market,
      retailer:
        newProduct.retailer ||
        form.retailer ||
        marketRetailers[0] ||
        retailers[0],
      rating: 0,
      stock: 1,
      competitorDiscount: Number(form.discount.match(/\d+/)?.[0] || 0),
      image:
        newProduct.image ||
        "https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=900&q=80",
      fromDate: form.from || "2026-01-01",
      toDate: form.to || "2026-12-31",
      promotionName: productName,
      description: newProduct.description || "User-created product",
      promotionDescription: newProduct.description || "User-created product",
      terms: "User-created product",
      priceAfterDiscount: Number(form.promoPrice || newProduct.price || 0),
      promoPrice: Number(form.promoPrice || newProduct.price || 0),
      promotionType: form.promotionType || "Fixed promotion",
    };

    addProduct(createdProduct);
    setForm((current) => ({
      ...current,
      product: productName,
      brands: brandName,
      category: categories.includes(current.category)
        ? current.category
        : current.category || "Pielęgnacja",
    }));
    setNewProduct({
      name: "",
      brand: "",
      category: productCategories[0],
      price: "",
      description: "",
      retailer: "",
      image: "",
    });
    setProductModalOpen(false);
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        aria-labelledby="promotion-form-title"
      >
        <Box
          className="absolute left-1/2 top-1/2 w-[calc(100%-32px)] max-w-[900px] max-h-[90vh] h-[90vh] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl relative"
          sx={{
            p: 4,
          }}
        >
          {ocrLoading && (
            <Box className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-white/75 backdrop-blur-[1px]">
              <Box className="flex items-center gap-3 rounded-xl bg-[#173c35] px-4 py-3 text-white shadow-lg">
                <Box
                  component="span"
                  sx={{
                    width: 18,
                    height: 18,
                    border: "2px solid rgba(255,255,255,0.35)",
                    borderTopColor: "#ffffff",
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
              className="flex items-start justify-between gap-4 sticky"
              id="promotion-form-title"
            >
              <Box>
                <Typography
                  sx={{ color: "#173c35", fontSize: 22, fontWeight: 800 }}
                >
                  {currentLanguage.addPromotion}
                </Typography>
                <Typography sx={{ color: "#82908b", fontSize: 13, mt: 0.5 }}>
                  {form.market === "CZ"
                    ? "Zadejte údaje kampaně. Uložená akce zůstane v českém formátu."
                    : "Wprowadź dane kampanii. Zapisana promocja pozostanie w tym samym formacie w języku polskim."}
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
                  {currentLanguage.market}
                </Typography>
                <Box className="flex gap-1 rounded-l bg-[#f2f7f5]">
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

              {/* Image Upload Section with Preview */}
              <Box className="mb-2">
                {previewUrl ? (
                  <Box className="relative rounded-lg overflow-hidden border border-[#dce6e2]">
                    <Box className="relative">
                      <img
                        src={previewUrl}
                        alt="Promotion preview"
                        className="w-full h-auto max-h-[200px] object-contain bg-[#f8faf9]"
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
                            // Trigger file input for editing
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
                          <EditRounded sx={{ fontSize: 18 }} />
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
                          <DeleteOutlineRounded sx={{ fontSize: 18 }} />
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
                                border: "2px solid #bfd2ce",
                                borderTopColor: "#286e5e",
                                borderRadius: "50%",
                                display: "inline-block",
                                animation: "spin 0.8s linear infinite",
                              }}
                            />
                            <Typography sx={{ fontSize: 13, color: "#173c35" }}>
                              {currentLanguage.loading}
                            </Typography>
                          </Box>
                        </Box>
                      )}
                    </Box>
                    <Box className="px-3 py-2 bg-[#f8faf9] flex items-center justify-between">
                      <Typography sx={{ fontSize: 12, color: "#65736f" }}>
                        {form.creativeName}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: "#82908b" }}>
                        {imageFile
                          ? `${(imageFile.size / 1024).toFixed(0)} KB`
                          : ""}
                      </Typography>
                    </Box>
                  </Box>
                ) : (
                  <Box
                    {...getRootProps()}
                    className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                      isDragActive
                        ? "border-[#286e5e] bg-[#f0f7f5]"
                        : "border-[#dce6e2] hover:border-[#286e5e]"
                    } ${ocrLoading ? "pointer-events-none opacity-60" : ""}`}
                  >
                    <input {...getInputProps()} disabled={ocrLoading} />
                    <AddPhotoAlternateRounded
                      sx={{ fontSize: 40, color: "#82908b", mb: 1 }}
                    />
                    <Typography
                      sx={{ color: "#48665d", fontSize: 14, fontWeight: 500 }}
                    >
                      {isDragActive
                        ? "Upuść obraz tutaj"
                        : currentLanguage.upload}
                    </Typography>
                    <Typography
                      sx={{ color: "#82908b", fontSize: 12, mt: 0.5 }}
                    >
                      PNG, JPG, WEBP (max 5MB)
                    </Typography>
                    {ocrLoading && (
                      <Typography
                        sx={{ color: "#286e5e", fontSize: 12, mt: 1 }}
                      >
                        {currentLanguage.loading}
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>

              <Box className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  type="select"
                  label={currentLanguage.promotionType}
                  value={form.promotionType}
                  onValueChange={(value) =>
                    update("promotionType", value as FormState["promotionType"])
                  }
                  options={currentLanguage.promotionTypeOptions.map((item) => ({
                    label: item.label,
                    value: item.value,
                  }))}
                  placeholder={currentLanguage.promotionType}
                />
                <FormField
                  label={currentLanguage.promoName}
                  value={form.name}
                  onValueChange={(value) => update("name", value)}
                  required
                  error={fieldErrors.name}
                  placeholder="Enter promotion name"
                />
                <FormField
                  type="select"
                  label={currentLanguage.productCategory}
                  value={form.category}
                  onValueChange={(value) => update("category", value)}
                  options={categories.map((item) => ({
                    label: item,
                    value: item,
                  }))}
                  required
                  placeholder="Product category"
                />
                <FormField
                  type="date"
                  label={currentLanguage.startDate}
                  value={form.from}
                  onValueChange={(value) => update("from", value)}
                  required
                  error={fieldErrors.from}
                  placeholder="DD/MM/YYYY"
                />
                <FormField
                  type="date"
                  label={currentLanguage.endDate}
                  value={form.to}
                  onValueChange={(value) => update("to", value)}
                  required
                  error={fieldErrors.to}
                  placeholder="DD/MM/YYYY"
                />
                <FormField
                  type="select"
                  label={currentLanguage.scope}
                  value={form.scope}
                  onValueChange={(value) => update("scope", value)}
                  options={scopes.map((item) => ({ label: item, value: item }))}
                  placeholder="Promotion scope"
                />
                <FormField
                  type="select"
                  label={currentLanguage.channel}
                  value={form.channel}
                  onValueChange={(value) => update("channel", value)}
                  options={channels.map((item) => ({
                    label: item,
                    value: item,
                  }))}
                  placeholder="Promotion channel"
                />
                <FormField
                  key={`brand-${form.market}`}
                  type="select"
                  label={currentLanguage.brand}
                  value={form.brands}
                  onValueChange={(value) => update("brands", value)}
                  options={marketBrandOptions.map((item) => ({
                    label: item,
                    value: item,
                  }))}
                  required
                  error={fieldErrors.brands}
                  placeholder={currentLanguage.brand}
                  labelAction={{
                    label: `${currentLanguage.add} brand`,
                    onClick: () => setBrandModalOpen(true),
                  }}
                />
                <FormField
                  key={`product-${form.market}`}
                  type="select"
                  label={currentLanguage.product}
                  value={form.product}
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
                  labelAction={{
                    label: `${currentLanguage.add} product`,
                    onClick: () => setProductModalOpen(true),
                  }}
                />
                <FormField
                  key={`retailer-${form.market}`}
                  type="select"
                  label={currentLanguage.retailer}
                  value={form.retailer}
                  onValueChange={(value) => update("retailer", value)}
                  options={marketRetailers.map((item) => ({
                    label: item,
                    value: item,
                  }))}
                  placeholder={currentLanguage.retailer}
                />
                <FormField
                  label={discountLabel}
                  placeholder={
                    form.promotionType === "Buy one get one free"
                      ? "np. Kup 1, dostaniesz 1 gratis"
                      : form.promotionType === "Custom"
                        ? "np. 2 za 1 lub 299 PLN"
                        : "np. -25% powyżej 99 PLN"
                  }
                  value={form.discount}
                  onValueChange={(value) => update("discount", value)}
                  required
                  error={fieldErrors.discount}
                />
                <FormField
                  type="number"
                  label={form.market === "CZ" ? "Cena po slevě" : "Cena po promocji"}
                  placeholder={form.market === "CZ" ? "např. 999 CZK" : "np. 299 PLN"}
                  value={form.promoPrice}
                  onValueChange={(value) => update("promoPrice", String(value))}
                />
                <FormField
                  label={currentLanguage.threshold}
                  placeholder="e.g. 999 CZK"
                  value={form.threshold}
                  onValueChange={(value) => update("threshold", value)}
                />
                <FormField
                  type="number"
                  label={currentLanguage.sku}
                  value={form.skuCount}
                  onValueChange={(value) => update("skuCount", value)}
                  placeholder="Wpisz liczbę SKU"
                />
                <FormField
                  label={currentLanguage.avgDiscount}
                  placeholder="e.g. 18%"
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
                  placeholder="Terms, exclusions, conditions..."
                  value={form.notes}
                  onValueChange={(value) => update("notes", value)}
                />
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
                {currentLanguage.save}
              </Button>
            </Box>
          </Box>
        </Box>
      </Modal>

      <Modal open={brandModalOpen} onClose={() => setBrandModalOpen(false)}>
        <Box className="absolute left-1/2 top-1/2 w-[calc(100%-32px)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-2xl">
          <Typography
            sx={{ color: "#173c35", fontSize: 20, fontWeight: 800, mb: 2 }}
          >
            {currentLanguage.addBrandTitle}
          </Typography>
          <FormField
            label={currentLanguage.brandNameLabel}
            value={newBrandName}
            onValueChange={(value) => setNewBrandName(String(value))}
            placeholder={currentLanguage.brandNamePlaceholder}
            className="mb-2"
          />
          <Box className="flex justify-end gap-2">
            <Button
              onClick={() => setBrandModalOpen(false)}
              sx={{ color: "#65736f", textTransform: "none" }}
            >
              {currentLanguage.cancel}
            </Button>
            <Button
              variant="contained"
              onClick={saveBrand}
              sx={{ backgroundColor: "#286e5e", textTransform: "none" }}
            >
              {currentLanguage.saveBrand}
            </Button>
          </Box>
        </Box>
      </Modal>

      <Modal open={productModalOpen} onClose={() => setProductModalOpen(false)}>
        <Box className="absolute left-1/2 top-1/2 w-[calc(100%-32px)] max-w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-2xl">
          <Typography
            sx={{ color: "#173c35", fontSize: 20, fontWeight: 800, mb: 2 }}
          >
            {currentLanguage.addProductTitle}
          </Typography>
          <Box className="grid gap-3">
            <FormField
              label={currentLanguage.productNameLabel}
              value={newProduct.name}
              onValueChange={(value) =>
                setNewProduct((current) => ({
                  ...current,
                  name: String(value),
                }))
              }
              placeholder={currentLanguage.productNamePlaceholder}
            />
            <FormField
              type="select"
              label={currentLanguage.productBrandLabel || currentLanguage.brandSelectLabel}
              value={newProduct.brand}
              onValueChange={(value) =>
                setNewProduct((current) => ({
                  ...current,
                  brand: String(value),
                }))
              }
              options={marketBrandOptions.map((item) => ({
                label: item,
                value: item,
              }))}
              placeholder={currentLanguage.brandSelectPlaceholder}
            />
            <FormField
              type="select"
              label={currentLanguage.categorySelectLabel}
              value={newProduct.category}
              onValueChange={(value) =>
                setNewProduct((current) => ({
                  ...current,
                  category: value as Product["category"],
                }))
              }
              options={productCategories.map((item) => ({
                label: item,
                value: item,
              }))}
              placeholder={currentLanguage.categorySelectPlaceholder}
            />
            <FormField
              type="number"
              label={currentLanguage.priceLabel}
              value={newProduct.price}
              onValueChange={(value) =>
                setNewProduct((current) => ({
                  ...current,
                  price: String(value),
                }))
              }
              placeholder={currentLanguage.pricePlaceholder}
            />
            <FormField
              label={currentLanguage.descriptionLabel}
              value={newProduct.description}
              onValueChange={(value) =>
                setNewProduct((current) => ({
                  ...current,
                  description: String(value),
                }))
              }
              placeholder={currentLanguage.descriptionPlaceholder}
            />
            <FormField
              label={currentLanguage.retailerLabel}
              value={newProduct.retailer}
              onValueChange={(value) =>
                setNewProduct((current) => ({
                  ...current,
                  retailer: String(value),
                }))
              }
              placeholder={currentLanguage.retailerPlaceholder}
            />
          </Box>
          <Box className="mt-4 flex justify-end gap-2">
            <Button
              onClick={() => setProductModalOpen(false)}
              sx={{ color: "#65736f", textTransform: "none" }}
            >
              {currentLanguage.cancel}
            </Button>
            <Button
              variant="contained"
              onClick={saveProduct}
              sx={{ backgroundColor: "#286e5e", textTransform: "none" }}
            >
              {currentLanguage.saveProduct}
            </Button>
          </Box>
        </Box>
      </Modal>
    </>
  );
}
