import React, { useState } from "react";
import {
  AddPhotoAlternateRounded,
  CloseRounded,
  SaveRounded,
} from "@mui/icons-material";
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Modal,
  OutlinedInput,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import type { Promotion } from "../context/AppContext";

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

type FormState = Omit<Promotion, "id" | "createdAt">;

const emptyForm: FormState = {
  market: "PL",
  name: "",
  from: "",
  to: "",
  scope: "Omnichannel",
  channel: "Website",
  category: "Skincare",
  brands: [],
  retailer: "Rossmann Polska",
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
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState("");

  const update = (
    field: keyof FormState,
    value: string | number | string[],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (
      !form.name ||
      !form.from ||
      !form.to ||
      !form.discount ||
      form.brands.length === 0
    ) {
      setError("Uzupełnij wymagane pola: nazwa, daty, rabat i marka.");
      return;
    }
    onSave(form);
    setForm(emptyForm);
    setError("");
  };

  return (
    <Modal open={open} onClose={onClose} aria-labelledby="promotion-form-title">
      <Box className="absolute left-1/2 top-1/2 max-h-[calc(100vh-32px)] w-[calc(100%-32px)] max-w-[900px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white shadow-2xl p-4">
        <Box component="form" onSubmit={submit}>
          <Box
            className="flex items-start justify-between gap-4 mb-4"
            id="promotion-form-title"
          >
            <Box>
              <Typography
                sx={{ color: "#173c35", fontSize: 22, fontWeight: 800 }}
              >
                Dodaj promocję
              </Typography>
              <Typography sx={{ color: "#82908b", fontSize: 13, mt: 0.5 }}>
                Wprowadź dane kampanii. Zapisana promocja pozostanie w języku polskim.
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
          <Box>
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
              <TextField
                required
                label="Nazwa promocji"
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                fullWidth
              />
              <FormControl required fullWidth>
                <InputLabel>Kategoria produktu</InputLabel>
                <Select
                  label="Kategoria produktu"
                  value={form.category}
                  onChange={(event) => update("category", event.target.value)}
                >
                  {categories.map((item) => (
                    <MenuItem key={item} value={item}>
                      {item}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                required
                type="date"
                label="Od"
                slotProps={{ inputLabel: { shrink: true } }}
                value={form.from}
                onChange={(event) => update("from", event.target.value)}
              />
              <TextField
                required
                type="date"
                label="Do"
                slotProps={{ inputLabel: { shrink: true } }}
                value={form.to}
                onChange={(event) => update("to", event.target.value)}
              />
              <FormControl fullWidth>
                <InputLabel>Zakres promocji</InputLabel>
                <Select
                  label="Zakres promocji"
                  value={form.scope}
                  onChange={(event) => update("scope", event.target.value)}
                >
                  {scopes.map((item) => (
                    <MenuItem key={item} value={item}>
                      {item}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Kanał promocyjny</InputLabel>
                <Select
                  label="Kanał promocyjny"
                  value={form.channel}
                  onChange={(event) => update("channel", event.target.value)}
                >
                  {channels.map((item) => (
                    <MenuItem key={item} value={item}>
                      {item}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl required fullWidth>
                <InputLabel>Marki uczestniczące</InputLabel>
                <Select
                  multiple
                  input={<OutlinedInput label="Marki uczestniczące" />}
                  value={form.brands}
                  onChange={(event) =>
                    update(
                      "brands",
                      typeof event.target.value === "string"
                        ? event.target.value.split(",")
                        : event.target.value,
                    )
                  }
                >
                  {brands.map((item) => (
                    <MenuItem key={item} value={item}>
                      {item}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel>Sprzedawca</InputLabel>
                <Select
                  label="Sprzedawca"
                  value={form.retailer}
                  onChange={(event) => update("retailer", event.target.value)}
                >
                  {retailers.map((item) => (
                    <MenuItem key={item} value={item}>
                      {item}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                required
                label="Poziom i typ rabatu"
                placeholder="-25% powyżej 99 PLN"
                value={form.discount}
                onChange={(event) => update("discount", event.target.value)}
              />
              <TextField
                label="Próg zakupowy"
                placeholder="99 PLN"
                value={form.threshold}
                onChange={(event) => update("threshold", event.target.value)}
              />
              <TextField
                type="number"
                label="Liczba SKU"
                slotProps={{ htmlInput: { min: 1 } }}
                value={form.skuCount}
                onChange={(event) =>
                  update("skuCount", Number(event.target.value))
                }
              />
              <TextField
                label="Średni rabat rynkowy"
                placeholder="18%"
                value={form.averageMarketDiscount}
                onChange={(event) =>
                  update("averageMarketDiscount", event.target.value)
                }
              />
              <TextField
                className="md:col-span-2"
                multiline
                minRows={3}
                label="Uwagi i warunki"
                placeholder="Regulamin, wyjątki, ograniczenia..."
                value={form.notes}
                onChange={(event) => update("notes", event.target.value)}
              />
              <Button
                component="label"
                variant="outlined"
                startIcon={<AddPhotoAlternateRounded />}
                className="md:col-span-2 !justify-start !border-[#dce6e2] !py-3 !text-[#48665d] !normal-case"
              >
                <span>
                  {form.creativeName || "Prześlij screenshot lub kreację"}
                </span>
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      update("creativeName", file.name);
                      update("creativeData", typeof reader.result === "string" ? reader.result : "");
                    };
                    reader.readAsDataURL(file);
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
          <Box className="flex justify-end gap-2 mt-4">
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
