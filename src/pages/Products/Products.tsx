import { AddRounded, SearchRounded, ImageRounded } from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  Chip,
  Modal,
  Skeleton,
  TextField,
  Typography,
} from "@mui/material";
import { useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Link } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import AppPagination from "../../components/AppPagination";
import FormField from "../../components/FormField";
import { getNoImagePlaceholder } from "../../lib/media";
import { formatRetailerLabel } from "../../data/retailers";

const pageSize = 15;

const emptyForm = {
  name: "",
  brand: "",
  category: "",
  retailer: "",
  price: "",
  imageUrl: "",
};

function ProductCardSkeleton() {
  return (
    <Box className="overflow-hidden rounded-2xl border border-[#e3e6ed] bg-white">
      <Skeleton
        variant="rectangular"
        animation="wave"
        sx={{ height: 128, bgcolor: "#f5f7fa" }}
      />
      <Box className="p-3">
        <Skeleton variant="text" animation="wave" width="50%" height={12} />
        <Skeleton variant="text" animation="wave" width="90%" height={16} />
        <Skeleton variant="text" animation="wave" width="100%" height={14} />
        <Box className="mt-1 flex items-center justify-between">
          <Skeleton variant="text" animation="wave" width="40%" height={12} />
          <Skeleton variant="text" animation="wave" width="25%" height={14} />
        </Box>
      </Box>
    </Box>
  );
}

export default function Products() {
  const {
    productCatalog,
    retailers: retailerOptions,
    categories,
    brandsByMarket,
    filters,
    canEdit,
    addCatalogProduct,
    showToast,
  } = useAppContext();
  const [search, setSearch] = useState("");
  const [retailerFilter, setRetailerFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [displayLang, setDisplayLang] = useState<"PL" | "CZ" | "EN">("PL");
  const selectedMarket = retailerOptions.find((r) => r.name === form.retailer)?.market ?? "PL";
  const brandOptions = brandsByMarket[selectedMarket];
  const onDrop = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : "";
      setForm((current) => ({ ...current, imageUrl: value }));
      setImagePreview(value);
    };
    reader.readAsDataURL(file);
  };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    multiple: false,
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
  });

  const marketRetailers = retailerOptions.filter(
    (r) => filters.market === "All" || r.market === filters.market,
  );

  const filteredProducts = useMemo(
    () =>
      productCatalog.filter((product) => {
        const searchValue = search.trim().toLowerCase();
        const globalSearch = filters.search.trim().toLowerCase();
        return (
          // Global filters — set via the "Filters" modal shared across pages.
          // Discount/date range fields from that modal don't apply here since
          // catalog products (unlike promotions) don't carry discount/date data.
          (filters.market === "All" || product.market === filters.market) &&
          (filters.category === "All" || product.category === filters.category) &&
          (filters.retailer === "All" || product.retailer === filters.retailer) &&
          (!globalSearch ||
            product.name.toLowerCase().includes(globalSearch) ||
            product.brand.toLowerCase().includes(globalSearch)) &&
          // Local on-page quick filters.
          (retailerFilter === "All" || product.retailer === retailerFilter) &&
          (!searchValue ||
            product.name.toLowerCase().includes(searchValue) ||
            product.brand.toLowerCase().includes(searchValue))
        );
      }),
    [
      productCatalog,
      filters.market,
      filters.category,
      filters.retailer,
      filters.search,
      retailerFilter,
      search,
    ],
  );
  const visibleProducts = filteredProducts.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );

  const handleAdd = async () => {
    if (!form.name || !form.brand || !form.retailer) return;
    setSaving(true);
    try {
      const retailer = retailerOptions.find((r) => r.name === form.retailer);
      // When EN view is active, force market to PL on save.
      // Otherwise keep the retailer's actual market (PL or CZ).
      const marketToSave = displayLang === "EN" ? "PL" : retailer?.market ?? "PL";

      await addCatalogProduct({
        name: form.name,
        brand: form.brand,
        category: form.category,
        retailer: form.retailer,
        market: marketToSave,
        price: form.price ? Number(form.price) : undefined,
        currency: marketToSave === "CZ" ? "CZK" : "PLN",
        imageUrl: form.imageUrl || undefined,
      });
      showToast("Product added to the catalog.");
      setAddOpen(false);
      setForm(emptyForm);
      setImagePreview("");
    } catch (err) {
      showToast("Unable to add the product. The database may be unavailable.", "error");
    } finally {
      setSaving(false);
    }
  };


  return (
    <Box className="flex flex-col gap-5">
      <Box className="flex flex-wrap items-center justify-between gap-3">
        <Box>
          <Typography
            sx={{ color: "#141824", fontSize: 16, fontWeight: 500, letterSpacing: "-0.01em" }}
          >
            Product Catalog
          </Typography>
          <Typography sx={{ color: "#525b75", fontSize: 13, mt: 0.5 }}>
            Every product our scraper has found across all monitored stores - pick from
            these when creating a promotion, even before a campaign exists for it.
          </Typography>
        </Box>
        {canEdit && (
          <Button
            variant="contained"
            startIcon={<AddRounded />}
            onClick={() => setAddOpen(true)}
            sx={{
              backgroundColor: "#141824",
              color: "#ffffff",
              textTransform: "none",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: 13,
              px: 2.5,
              "&:hover": { backgroundColor: "#31374a" },
            }}
          >
            Add product
          </Button>
        )}
      </Box>

      <Card elevation={0} className="rounded-2xl border border-[#e3e6ed] bg-white">
        <Box className="border-b border-[#e3e6ed] p-4 flex flex-wrap items-center gap-3">
          <TextField
            size="small"
            placeholder="Search products or brands"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            slotProps={{
              input: { startAdornment: <SearchRounded sx={{ color: "#9fa6bc", mr: 1 }} /> },
            }}
            sx={{ minWidth: 280 }}
          />
          <Box className="flex flex-wrap gap-1.5">
            <Chip
              label="All stores"
              size="small"
              onClick={() => {
                setRetailerFilter("All");
                setPage(1);
              }}
              sx={{
                backgroundColor: retailerFilter === "All" ? "#141824" : "#eff2f6",
                color: retailerFilter === "All" ? "#ffffff" : "#525b75",
                fontWeight: 700,
                cursor: "pointer",
              }}
            />
            {marketRetailers.map((retailer) => (
              <Chip
                key={retailer.id}
                label={formatRetailerLabel(retailer.name)}
                size="small"
                onClick={() => {
                  setRetailerFilter(retailer.name);
                  setPage(1);
                }}
                sx={{
                  backgroundColor: retailerFilter === retailer.name ? "#141824" : "#eff2f6",
                  color: retailerFilter === retailer.name ? "#ffffff" : "#525b75",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              />
            ))}
          </Box>
        </Box>

        {filteredProducts.length === 0 ? (
          <Box className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </Box>
        ) : (
          <Box className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
            {visibleProducts.map((product) => (
              <Box
                key={product.id}
                component={Link}
                to={`/products/${product.id}`}
                className="overflow-hidden rounded-2xl border border-[#e3e6ed] bg-white no-underline transition-all hover:border-[#000000] hover:shadow-md"
              >
                <Box className="relative h-32 bg-[#f5f7fa]">
                  <img
                    src={product.imageUrl || getNoImagePlaceholder()}
                    alt={product.name}
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = getNoImagePlaceholder();
                    }}
                  />
                  <Chip
                    label={formatRetailerLabel(product.retailer)}
                    size="small"
                    sx={{
                      position: "absolute",
                      left: 8,
                      top: 8,
                      backgroundColor: product.isClient ? "#141824" : "#ffffff",
                      color: product.isClient ? "#ffffff" : "#141824",
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: "0.02em",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                    }}
                  />
                </Box>
                <Box className="p-3">
                  <Typography
                    sx={{
                      color: "#525b75",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}
                  >
                    {product.brand || "Unknown brand"}
                  </Typography>
                  <Typography
                    sx={{ color: "#141824", fontSize: 12.5, fontWeight: 500, lineHeight: 1.3, mt: 0.25 }}
                  >
                    {product.name}
                  </Typography>
                  <Box className="mt-1 flex items-center justify-between">
                    <Typography sx={{ color: "#525b75", fontSize: 11 }}>
                      {product.category || "Uncategorized"}
                    </Typography>
                    {product.price != null && (
                      <Typography sx={{ color: "#141824", fontSize: 12, fontWeight: 700 }}>
                        {product.price} {product.currency}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        )}
        {filteredProducts.length > 0 && (
          <AppPagination
            count={Math.ceil(filteredProducts.length / pageSize)}
            page={page}
            onChange={setPage}
            total={filteredProducts.length}
            pageSize={pageSize}
            itemLabel="products"
          />
        )}
      </Card>

      <Modal open={addOpen} onClose={() => setAddOpen(false)}>
        <Box
          className="absolute left-1/2 top-1/2 w-[calc(100%-32px)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-2xl border border-[#e3e6ed]"
        >
          <Box className="flex items-start justify-between gap-3 mb-3">
            <Typography sx={{ color: "#141824", fontSize: 18, fontWeight: 700 }}>
              {displayLang === "EN"
                ? "Add a product"
                : displayLang === "CZ"
                  ? "Přidat produkt"
                  : "Dodaj produkt"}
            </Typography>

            {/* Language toggle inside modal */}
            <Box className="flex gap-1 rounded-lg bg-[#f5f7fa] p-1">
              {(["PL", "CZ", "EN"] as const).map((market) => (
                <Button
                  key={market}
                  onClick={() => {
                    if (market === "EN") {
                      setDisplayLang("EN");
                      return;
                    }
                    setDisplayLang(market);
                    setForm((current) => ({
                      ...current,
                      brand: "",
                      retailer: "",
                      category: "",
                    }));
                  }}
                  variant={displayLang === market ? "contained" : "text"}
                  size="small"
                  sx={{
                    minWidth: 44,
                    backgroundColor:
                      displayLang === market ? "#141824" : "transparent",
                    color: displayLang === market ? "#ffffff" : "#525b75",
                    fontWeight: 800,
                    boxShadow: "none",
                    "&:hover": {
                      backgroundColor:
                        displayLang === market ? "#31374a" : "#e3e6ed",
                      boxShadow: "none",
                    },
                  }}
                >
                  {market}
                </Button>
              ))}
            </Box>
          </Box>

          <Box className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              className="sm:col-span-2"
              label={
                displayLang === "EN"
                  ? "Product name"
                  : displayLang === "CZ"
                    ? "Název produktu"
                    : "Nazwa produktu"
              }
              value={form.name}
              onValueChange={(value) =>
                setForm((f) => ({ ...f, name: String(value) }))
              }
              required
              placeholder={
                displayLang === "EN"
                  ? "e.g. Advanced Night Repair Serum"
                  : "np. Advanced Night Repair Serum"
              }
            />
            <FormField
              label={
                displayLang === "EN"
                  ? "Brand"
                  : displayLang === "CZ"
                    ? "Značka"
                    : "Marka"
              }
              type="select"
              value={form.brand}
              onValueChange={(value) =>
                setForm((f) => ({ ...f, brand: String(value) }))
              }
              options={brandOptions.map((brand) => ({ label: brand, value: brand }))}
              required
              placeholder={
                displayLang === "EN"
                  ? "Choose a scraped brand"
                  : displayLang === "CZ"
                    ? "Vyberte značku"
                    : "Wybierz markę"
              }
            />
            <FormField
              type="select"
              label={
                displayLang === "EN"
                  ? "Category"
                  : displayLang === "CZ"
                    ? "Kategorie"
                    : "Kategoria"
              }
              value={form.category}
              onValueChange={(value) =>
                setForm((f) => ({ ...f, category: String(value) }))
              }
              options={categories.map((c) => ({ label: c.name, value: c.name }))}
              placeholder={
                displayLang === "EN"
                  ? "Choose a category"
                  : displayLang === "CZ"
                    ? "Vyberte kategorii"
                    : "Wybierz kategorię"
              }
            />
            <FormField
              type="select"
              label={
                displayLang === "EN"
                  ? "Retailer"
                  : displayLang === "CZ"
                    ? "Prodejce"
                    : "Sprzedawca"
              }
              value={form.retailer}
              onValueChange={(value) =>
                setForm((f) => ({ ...f, retailer: String(value) }))
              }
              options={retailerOptions.map((r) => ({
                label: `${formatRetailerLabel(r.name)} (${r.market})`,
                value: r.name,
              }))}
              required
              placeholder={
                displayLang === "EN"
                  ? "Choose a store"
                  : displayLang === "CZ"
                    ? "Vyberte obchod"
                    : "Wybierz sklep"
              }
            />
            <FormField
              type="number"
              label={
                displayLang === "EN"
                  ? "Price"
                  : displayLang === "CZ"
                    ? "Cena"
                    : "Cena"
              }
              value={form.price}
              onValueChange={(value) =>
                setForm((f) => ({ ...f, price: String(value) }))
              }
              placeholder="e.g. 199"
            />
            <Box
              {...getRootProps()}
              className={`sm:col-span-2 cursor-pointer rounded-lg border-2 border-dashed p-4 text-center ${isDragActive ? "border-[#000000] bg-[#f2f2f2]" : "border-[#e3e6ed]"
                }`}
            >
              <input {...getInputProps()} />
              <Typography sx={{ color: "#141824", fontSize: 13, fontWeight: 600 }}>
                {isDragActive
                  ? displayLang === "EN"
                    ? "Drop image here"
                    : displayLang === "CZ"
                      ? "Přetáhněte obrázek sem"
                      : "Upuść obraz tutaj"
                  : displayLang === "EN"
                    ? "Upload or drop product image"
                    : displayLang === "CZ"
                      ? "Nahrajte nebo přetáhněte obrázek produktu"
                      : "Prześlij lub przeciągnij zdjęcie produktu"}
              </Typography>
              <Button component="span" variant="text" startIcon={<ImageRounded />}>
                {displayLang === "EN"
                  ? "Choose image"
                  : displayLang === "CZ"
                    ? "Vybrat obrázek"
                    : "Wybierz obraz"}
              </Button>
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Product preview"
                  className="mt-2 h-24 w-24 rounded-lg object-cover"
                />
              )}
            </Box>
          </Box>
          <Box className="mt-5 flex justify-end gap-2">
            <Button
              onClick={() => setAddOpen(false)}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              {displayLang === "EN" ? "Cancel" : displayLang === "CZ" ? "Zrušit" : "Anuluj"}
            </Button>
            <Button
              variant="contained"
              disabled={saving}
              onClick={handleAdd}
              sx={{
                backgroundColor: "#141824",
                color: "#ffffff",
                textTransform: "none",
                fontWeight: 700,
                "&:hover": { backgroundColor: "#31374a" },
              }}
            >
              {saving
                ? displayLang === "EN"
                  ? "Saving…"
                  : displayLang === "CZ"
                    ? "Ukládání…"
                    : "Zapisywanie…"
                : displayLang === "EN"
                  ? "Add product"
                  : displayLang === "CZ"
                    ? "Přidat produkt"
                    : "Dodaj produkt"}
            </Button>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
}
