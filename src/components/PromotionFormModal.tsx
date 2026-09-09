import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  AddPhotoAlternateRounded,
  CloseRounded,
  DeleteOutlineRounded,
  SaveRounded,
} from "@mui/icons-material";
import { Box, Button, Modal, Typography } from "@mui/material";
import type { Promotion } from "../context/AppContext";
import FormField from "./FormField";

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
      const result =
        typeof reader.result === "string" ? reader.result : "";

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

  const submit = (event: React.FormEvent) => {
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
    onSave(form);
    setForm(emptyForm);
    setError("");
    setFieldErrors({});
    setPreviewUrl("");
  };

  return (
    <Modal open={open} onClose={onClose} aria-labelledby="promotion-form-title">
      <Box className="absolute left-1/2 top-1/2 w-[calc(100%-32px)] max-w-[900px] max-h-[90vh] h-[90vh] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl" sx={{
        p: 4,
      }}>
        <Box component="form" onSubmit={submit} className="flex flex-col gap-4 h-full">
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
              <Box className="md:col-span-2">
                <Typography
                  sx={{
                    color: "#48665d",
                    fontSize: 12,
                    fontWeight: 700,
                    mb: 0.75,
                  }}
                >
                  Prześlij obraz
                </Typography>

                {!previewUrl ? (
                  <Box
                    {...getRootProps()}
                    sx={{
                      border: "1.5px dashed",
                      borderColor: isDragActive ? "#286e5e" : "#cbdad5",
                      borderRadius: "12px",
                      minHeight: 150,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      backgroundColor: isDragActive ? "#f0f8f5" : "#fafcfb",
                      transition: "all 0.2s ease",

                      "&:hover": {
                        borderColor: "#286e5e",
                        backgroundColor: "#f5faf8",
                      },
                    }}
                  >
                    <input {...getInputProps()} />

                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        backgroundColor: "#e8f3ef",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        mb: 1.5,
                      }}
                    >
                      <AddPhotoAlternateRounded
                        sx={{
                          color: "#286e5e",
                          fontSize: 24,
                        }}
                      />
                    </Box>

                    <Typography
                      sx={{
                        color: "#286e5e",
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      {isDragActive
                        ? "Upuść obraz tutaj"
                        : "Przeciągnij obraz tutaj"}
                    </Typography>

                    <Typography
                      sx={{
                        color: "#82908b",
                        fontSize: 12,
                        mt: 0.5,
                      }}
                    >
                      lub kliknij, aby wybrać plik
                    </Typography>

                    <Typography
                      sx={{
                        color: "#a0aaa7",
                        fontSize: 11,
                        mt: 1,
                      }}
                    >
                      PNG, JPG, JPEG lub WEBP • maks. 5 MB
                    </Typography>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      position: "relative",
                      border: "1px solid #dce6e2",
                      borderRadius: "12px",
                      overflow: "hidden",
                      backgroundColor: "#fafcfb",
                      p: 1.5,
                    }}
                  >
                    {/* Preview */}
                    <Box
                      sx={{
                        position: "relative",
                        width: "100%",
                        height: 240,
                        borderRadius: "8px",
                        overflow: "hidden",
                        backgroundColor: "#f1f4f3",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Box
                        component="img"
                        src={previewUrl}
                        alt={form.creativeName || "Podgląd"}
                        sx={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                        }}
                      />

                      {/* Remove button */}
                      <Button
                        onClick={(event) => {
                          event.stopPropagation();

                          setPreviewUrl("");

                          setForm((current) => ({
                            ...current,
                            creativeName: "",
                            creativeData: "",
                          }));
                        }}
                        sx={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          minWidth: 36,
                          width: 36,
                          height: 36,
                          borderRadius: "50%",
                          backgroundColor: "rgba(255,255,255,0.95)",
                          color: "#b55a50",
                          padding: 0,
                          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",

                          "&:hover": {
                            backgroundColor: "#fff",
                            color: "#963f35",
                          },
                        }}
                      >
                        <DeleteOutlineRounded fontSize="small" />
                      </Button>
                    </Box>

                    {/* File information */}
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 2,
                        mt: 1.5,
                      }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography
                          sx={{
                            color: "#263b35",
                            fontSize: 13,
                            fontWeight: 700,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {form.creativeName}
                        </Typography>

                        <Typography
                          sx={{
                            color: "#82908b",
                            fontSize: 11,
                            mt: 0.25,
                          }}
                        >
                          Obraz został dodany
                        </Typography>
                      </Box>

                      <Box
                        {...getRootProps()}
                        sx={{
                          flexShrink: 0,
                          cursor: "pointer",
                        }}
                      >
                        <input {...getInputProps()} />

                        <Button
                          component="span"
                          size="small"
                          variant="outlined"
                          sx={{
                            borderColor: "#dce6e2",
                            color: "#286e5e",
                            textTransform: "none",
                            borderRadius: "8px",
                            fontSize: 12,

                            "&:hover": {
                              borderColor: "#7dbba8",
                              backgroundColor: "#f5faf8",
                            },
                          }}
                        >
                          Zmień obraz
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                )}
              </Box>
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
              startIcon={<SaveRounded />}
              sx={{
                backgroundColor: "#286e5e",
                textTransform: "none",
                "&:hover": { backgroundColor: "#1d594b" },
              }}
            >
              Zapisz promocję
            </Button>
          </Box>
        </Box>
      </Box>
    </Modal>
  );
}