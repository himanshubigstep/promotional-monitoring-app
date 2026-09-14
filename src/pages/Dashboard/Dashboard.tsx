import {
  AddRounded,
  ChevronRightRounded,
  DeleteOutlineRounded,
  EditRounded,
  LocalOfferRounded,
  SearchRounded,
  StorefrontRounded,
  TrendingDownRounded,
  TrendingUpRounded,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Modal,
  TextField,
  Typography,
} from "@mui/material";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import * as XLSX from "xlsx";
import { matchesPromotionFilters, useAppContext } from "../../context/AppContext";
import AppPagination from "../../components/AppPagination";
import FormField from "../../components/FormField";
import PromotionFormModal from "../../components/PromotionFormModal";
import DeleteIcon from '@mui/icons-material/Delete';
import BrandComparisonTable from "../../components/BrandComparisonTable";
import { accentTints } from "../../theme/sephoraTheme";

const fallbackImage =
  "https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=900&q=80";
const today = new Date().toISOString().slice(0, 10);
const months = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

const Dashboard = () => {
  const {
    filters,
    user,
    authRole,
    products: catalog,
    addPromotion,
    addBrand,
    addProduct,
    deleteProduct,
    updatePromotion,
    canEdit,
    brandsByMarket,
  } = useAppContext();
  const [catalogSearch, setCatalogSearch] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [catalogPage, setCatalogPage] = useState(1);
  const [expiredPage, setExpiredPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [bulkTab, setBulkTab] = useState<"brands" | "products">("brands");
  const [brandRows, setBrandRows] = useState([
    { brand: "" },
  ]);
  const [productRows, setProductRows] = useState([
    { brandName: "", title: "" },
  ]);
  const [editingPromotion, setEditingPromotion] = useState<any | null>(null);
  const [bulkMarket, setBulkMarket] = useState<"PL" | "CZ">(
    filters.market === "All" ? "PL" : (filters.market as "PL" | "CZ"),
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const catalogPageSize = 10;
  const expiredPageSize = 5;

  useEffect(() => {
    setBulkMarket(
      filters.market === "All" ? "PL" : (filters.market as "PL" | "CZ"),
    );
  }, [filters.market]);

  const locale = filters.market === "CZ" ? "CZ" : "PL";

  const bulkText =
    bulkMarket === "PL"
      ? {
        heading: "Import masowy marek i produktów",
        market: "Rynek",
        tabBrands: "Marki",
        tabProducts: "Produkty",
        excelTemplate: "Szablon Excel",
        templateHint: "Nazwa sklepu | Nazwa marki",
        downloadXlsx: "Pobierz szablon (.xlsx)",
        downloadCsv: "Pobierz szablon (.csv)",
        addBrandRow: "+ Dodaj kolejną markę",
        addProductRow: "+ Dodaj kolejny produkt",
        saveRows: "Zapisz wpisy",
        cancel: "Anuluj",
        brand: "Marka",
        title: "Tytuł",
        brandName: "Nazwa marki",
        delete: "Usuń",
        fileLabel: "Importuj z CSV/XLSX",
        fileHint: "Obsługiwane pliki: .csv, .xlsx, .xls",
        marketOptions: [
          { label: "PL", value: "PL" },
          { label: "CZ", value: "CZ" },
        ],
      }
      : {
        heading: "Hromadný import značek a produktů",
        market: "Trh",
        tabBrands: "Značky",
        tabProducts: "Produkty",
        excelTemplate: "Excel šablona",
        templateHint: "Název obchodu | Název značky",
        downloadXlsx: "Stáhnout šablonu (.xlsx)",
        downloadCsv: "Stáhnout šablonu (.csv)",
        addBrandRow: "+ Přidat další značku",
        addProductRow: "+ Přidat další produkt",
        saveRows: "Uložit záznamy",
        cancel: "Zrušit",
        brand: "Značka",
        title: "Název",
        brandName: "Název značky",
        delete: "Smazat",
        fileLabel: "Importovat z CSV/XLSX",
        fileHint: "Podporované soubory: .csv, .xlsx, .xls",
        marketOptions: [
          { label: "PL", value: "PL" },
          { label: "CZ", value: "CZ" },
        ],
      };

  const dashboardText =
    locale === "CZ"
      ? {
        offersTracked: "Sledované nabídky",
        activeToday: "Dnes aktivní",
        averageDiscount: "Průměrná sleva",
        peakMonth: "Nejvyšší měsíc",
        trendSubtitle: "Měsíční vývoj slev pro vybraný rok.",
        pulseSubtitle: "Všechny dostupné roky s filtrováním objemu nabídek.",
        ends: "Končí",
      }
      : {
        offersTracked: "Śledzone oferty",
        activeToday: "Aktywne dziś",
        averageDiscount: "Średnia zniżka",
        peakMonth: "Miesiąc szczytu",
        pulseSubtitle: "Wszystkie dostępne lata z filtrowaniem wolumenu ofert.",
        ends: "Kończy się",
      };

  const brandOptions = useMemo(
    () => brandsByMarket[bulkMarket] || [],
    [brandsByMarket, bulkMarket],
  );

  const resetBulkRows = () => {
    setBrandRows([{ brand: "" }]);
    setProductRows([{ brandName: "", title: "" }]);
  };

  const downloadBulkTemplate = (format: "csv" | "xlsx") => {
    const brandTemplate = [
      [bulkText.brand],
      [bulkMarket === "PL" ? "Nazwa marki" : "Název značky"],
      [bulkMarket === "PL" ? "L'Oréal" : "L'Oréal"],
    ];
    const productTemplate = [
      [bulkText.brandName, bulkText.title],
      [bulkMarket === "PL" ? "L'Oréal" : "L'Oréal", bulkMarket === "PL" ? "Krem nawilżający" : "Hydratační krém"],
      [bulkMarket === "PL" ? "Nivea" : "Nivea", bulkMarket === "PL" ? "Serum do twarzy" : "Sérum pro obličej"],
    ];
    const rows = bulkTab === "brands" ? brandTemplate : productTemplate;
    const fileName = `bulk-${bulkTab}-${bulkMarket.toLowerCase()}.${format}`;

    if (format === "csv") {
      const csv = rows
        .map((row) =>
          row
            .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
            .join(","),
        )
        .join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return;
    }

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, fileName);
  };

  const updateBrandRow = (
    index: number,
    field: "brand",
    value: string,
  ) => {
    setBrandRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    );
  };

  const updateProductRow = (
    index: number,
    field: "brandName" | "title",
    value: string,
  ) => {
    setProductRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    );
  };

  const addBrandRow = () =>
    setBrandRows((current) => [
      ...current,
      { brand: "" },
    ]);
  const addProductRow = () =>
    setProductRows((current) => [
      ...current,
      { brandName: "", title: "" },
    ]);

  const removeBrandRow = (index: number) => {
    setBrandRows((current) => {
      if (current.length === 1) {
        return [{ brand: "" }];
      }
      return current.filter((_, rowIndex) => rowIndex !== index);
    });
  };

  const removeProductRow = (index: number) => {
    setProductRows((current) => {
      if (current.length === 1) {
        return [{ brandName: "", title: "" }];
      }
      return current.filter((_, rowIndex) => rowIndex !== index);
    });
  };

  const parseBulkFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, string | number | null>>(
      worksheet,
      { defval: "" },
    );

    const normalize = (value: string | number | null | undefined) =>
      typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();

    if (bulkTab === "brands") {
      const items = rows
        .map((row) => {
          const brand = normalize(
            row.Brand ?? row.Marka ?? row["Brand Name"] ?? row["Nazwa marki"],
          );
          return { brand };
        })
        .filter((row) => row.brand);

      setBrandRows(items.length > 0 ? items : [{ brand: "" }]);
    } else {
      const items = rows
        .map((row) => {
          const brandName = normalize(
            row["Brand Name"] ?? row["Nazwa marki"] ?? row.Brand ?? row.Marka,
          );
          const title = normalize(
            row.Title ?? row.Tytuł ?? row["Product Name"] ?? row["Nazwa produktu"],
          );
          return { brandName, title };
        })
        .filter((row) => row.brandName || row.title);

      setProductRows(
        items.length > 0 ? items : [{ brandName: "", title: "" }],
      );
    }

    event.target.value = "";
  };

  const handleBulkSave = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setBulkError(null);
    setBulkSaving(true);
    try {
      if (bulkTab === "brands") {
        // Sequential, not Promise.all: two rows with the same new brand
        // name racing the same lookup-or-create step could otherwise both
        // try to insert it.
        for (const row of brandRows) {
          const brandName = row.brand.trim();
          if (!brandName) continue;
          await addBrand(brandName, bulkMarket);
        }
      } else {
        const defaultRetailer = bulkMarket === "PL" ? "Douglas" : "CZ Demo Store Prague";

        for (let index = 0; index < productRows.length; index += 1) {
          const row = productRows[index];
          const brandName = row.brandName.trim();
          const title = row.title.trim();
          if (!brandName || !title) continue;

          const productId = `BULK-${bulkMarket}-${Date.now()}-${index}`;
          await addProduct({
            id: productId,
            name: title,
            brand: brandName,
            category: "Skincare",
            price: 0,
            currency: bulkMarket === "CZ" ? "CZK" : "PLN",
            market: bulkMarket,
            retailer: defaultRetailer,
            rating: 0,
            stock: 1,
            competitorDiscount: 0,
            image:
              "https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=900&q=80",
            fromDate: today,
            toDate: today,
            promotionName: title,
            description:
              bulkMarket === "PL"
                ? `Masowy import produktu dla ${brandName}`
                : `Hromadně nahraný produkt pro ${brandName}`,
            promotionDescription:
              bulkMarket === "PL"
                ? `Masowy import produktu dla ${brandName}`
                : `Hromadně nahraný produkt pro ${brandName}`,
            terms: bulkMarket === "PL" ? "Import masowy" : "Hromadný import",
            priceAfterDiscount: 0,
            promotionType: "Fixed promotion",
          });
        }
      }

      setBulkModalOpen(false);
      resetBulkRows();
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setBulkSaving(false);
    }
  };

  async function handleDelete(id: string) {
    setActionError(null);
    try {
      await deleteProduct(id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete.");
    }
  }

  const filteredProducts = useMemo(
    () =>
      catalog
        .filter((product) => {
          return (
            (product.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
              product.brand
                .toLowerCase()
                .includes(catalogSearch.toLowerCase()) ||
              product.category
                .toLowerCase()
                .includes(catalogSearch.toLowerCase())) &&
            matchesPromotionFilters(product, filters)
          );
        })
        .sort((a, b) => {
          const aActive = a.toDate >= today;
          const bActive = b.toDate >= today;
          if (aActive && !bActive) return -1;
          if (!aActive && bActive) return 1;
          return b.toDate.localeCompare(a.toDate);
        }),
    [catalog, catalogSearch, filters],
  );
  const chartProducts = filteredProducts;
  const analytics = useMemo(() => {
    const monthValues = months.map((_, monthIndex) => {
      const month = String(monthIndex + 1).padStart(2, "0");
      const records = chartProducts.filter(
        (product) => product.fromDate.slice(5, 7) === month,
      );
      return records.length
        ? Math.round(
          records.reduce(
            (sum, product) => sum + product.competitorDiscount,
            0,
          ) / records.length,
        )
        : 0;
    });
    const average = chartProducts.length
      ? Math.round(
        chartProducts.reduce(
          (sum, product) => sum + product.competitorDiscount,
          0,
        ) / chartProducts.length,
      )
      : 0;
    const active = chartProducts.filter(
      (product) => product.fromDate <= today && product.toDate >= today,
    ).length;
    const peak = Math.max(...monthValues, 0);
    return {
      monthValues,
      average,
      active,
      peak,
      peakMonth: months[monthValues.indexOf(peak)],
    };
  }, [chartProducts]);
  const yearlyTrend = useMemo(
    () =>
      Array.from(
        new Set(
          catalog.flatMap((product) => [
            product.fromDate.slice(0, 4),
            product.toDate.slice(0, 4),
          ]),
        ),
      )
        .sort()
        .map((year) => {
          const yearProducts = filteredProducts.filter((product) =>
            product.fromDate.startsWith(year),
          );
          return {
            year,
            offers: yearProducts.length,
            open: yearProducts.length ? yearProducts[0].competitorDiscount : 0,
            close: yearProducts.length
              ? yearProducts[yearProducts.length - 1].competitorDiscount
              : 0,
            high: yearProducts.length
              ? Math.max(
                ...yearProducts.map((product) => product.competitorDiscount),
              )
              : 0,
            low: yearProducts.length
              ? Math.min(
                ...yearProducts.map((product) => product.competitorDiscount),
              )
              : 0,
          };
        }),
    [catalog, filteredProducts],
  );
  const catalogProducts = filteredProducts.slice(
    (catalogPage - 1) * catalogPageSize,
    catalogPage * catalogPageSize,
  );
  const expiredProducts = useMemo(
    () =>
      catalog.filter(
        product => product.toDate < today && matchesPromotionFilters(product, filters),
      ),
    [catalog, filters],
  );
  const visibleExpiredProducts = expiredProducts.slice(
    (expiredPage - 1) * expiredPageSize,
    expiredPage * expiredPageSize,
  );
  useEffect(() => {
    setCatalogPage(1);
    setExpiredPage(1);
  }, [filters]);

  useEffect(() => {
    const maxCatalogPage = Math.max(
      1,
      Math.ceil(filteredProducts.length / catalogPageSize),
    );
    if (catalogPage > maxCatalogPage) {
      setCatalogPage(maxCatalogPage);
    }
  }, [filteredProducts.length, catalogPage]);

  useEffect(() => {
    const maxExpiredPage = Math.max(
      1,
      Math.ceil(expiredProducts.length / expiredPageSize),
    );
    if (expiredPage > maxExpiredPage) {
      setExpiredPage(maxExpiredPage);
    }
  }, [expiredProducts.length, expiredPage]);

  const openEditPromotion = (product: (typeof catalog)[number]) => {
    const promotion = {
      id: product.id,
      market: product.market,
      name: product.promotionName || product.name,
      from: product.fromDate,
      to: product.toDate,
      scope: "Wielokanałowa",
      channel: "Sklep stacjonarny",
      category: product.category,
      brands: product.brand,
      retailer: product.retailer,
      discount: `-${product.competitorDiscount}%`,
      threshold: "",
      promoPrice: String(product.priceAfterDiscount ?? product.price ?? ""),
      promotionType: product.promotionType || "Fixed promotion",
      skuCount: 1,
      notes: product.terms || product.description || "",
      creativeName: product.name,
      creativeData: product.image || "",
      averageMarketDiscount: `${product.competitorDiscount}%`,
      createdAt: product.fromDate,
    };
    setEditingPromotion(promotion);
    setFormOpen(true);
  };

  return (
    <Box className="flex flex-col gap-4">
      <Card
        elevation={0}
        className="rounded-2xl border border-[#e7eaee] text-white relative overflow-hidden"
        sx={{ backgroundColor: "#1a1d23 !important" }}
      >
        <CardContent className="!p-5">
          <Box className="flex items-center justify-between mb-1 flex-wrap gap-3">
            <Box className="flex items-center gap-4">
              <Typography
                sx={{
                  color: "#78a1ff",
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Sephora Intelligence Hub
              </Typography>
              <Typography sx={{ color: "#4b5160", fontSize: 11 }}>•</Typography>
              <Typography
                sx={{ color: "#9199a6", fontSize: 11, fontWeight: 500 }}
              >
                {getGreeting()}, {user ? (authRole === "editor" ? "Editor" : "Analyst") : "Guest"}
              </Typography>
            </Box>
            <Box className="flex items-center gap-2">
              {canEdit && (
                <>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<AddRounded />}
                    onClick={() => setFormOpen(true)}
                    sx={{
                      backgroundColor: "#4f82f7",
                      color: "#ffffff",
                      textTransform: "none",
                      fontWeight: 500,
                      borderRadius: "8px",
                      "&:hover": { backgroundColor: "#2e63d4" },
                    }}
                  >
                    Add promotion
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      resetBulkRows();
                      setBulkTab("brands");
                      setBulkModalOpen(true);
                    }}
                    sx={{
                      borderColor: "#3a3f4a",
                      color: "#ffffff",
                      textTransform: "none",
                      fontWeight: 500,
                      borderRadius: "8px",
                      "&:hover": {
                        borderColor: "#4f82f7",
                        backgroundColor: "#22252e",
                      },
                    }}
                  >
                    Bulk upload brands or products
                  </Button>
                </>
              )}
            </Box>
          </Box>
          {actionError && (
            <Box sx={{ color: "#ff8a8a", fontSize: 13, mt: 1 }}>{actionError}</Box>
          )}
          <Typography
            sx={{
              color: "#ffffff",
              fontSize: { xs: 22, md: 28 },
              fontWeight: 500,
              letterSpacing: "-0.02em",
              mt: 0.5,
            }}
          >
            Promotional & Competitor Monitor
          </Typography>
          <Typography
            sx={{
              color: "#aeb5c0",
              fontSize: 13.5,
              mt: 0.8,
              maxWidth: "500px",
            }}
          >
            Track Poland & international retail promotions, analyze discount
            depth across competitors, and optimize campaign timings.
          </Typography>
        </CardContent>
      </Card>

      <Box className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Offers tracked",
            value: filteredProducts.length,
            detail: "Active catalog",
            icon: <LocalOfferRounded sx={{ fontSize: 20 }} />,
            tint: accentTints[0],
          },
          {
            label: "Active today",
            value: analytics.active,
            detail: "across monitored retailers",
            icon: <StorefrontRounded sx={{ fontSize: 20 }} />,
            tint: accentTints[1],
          },
          {
            label: "Average discount",
            value: `${analytics.average}%`,
            detail: "across active campaigns",
            icon: <TrendingUpRounded sx={{ fontSize: 20 }} />,
            tint: accentTints[2],
          },
          {
            label: "Peak month",
            value: analytics.peakMonth || "No data",
            detail: `${analytics.peak}% max monthly avg`,
            icon: <TrendingDownRounded sx={{ fontSize: 20 }} />,
            tint: accentTints[3],
          },
        ].map(({ label, value, detail, icon, tint }) => (
          <Card
            key={label}
            elevation={0}
            className="rounded-2xl border border-[#e7eaee] bg-white transition-all hover:border-[#c8d0da]"
          >
            <CardContent className="!p-5">
              <Box className="flex items-center justify-between">
                <Typography
                  sx={{
                    color: "#737b88",
                    fontSize: 11.5,
                    fontWeight: 500,
                    // letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  {label}
                </Typography>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: tint.bg,
                    color: tint.fg,
                  }}
                >
                  {icon}
                </Box>
              </Box>
              <Typography
                sx={{
                  color: "#20242b",
                  fontSize: 26,
                  fontWeight: 500,
                  letterSpacing: "-0.02em",
                }}
              >
                {value}
              </Typography>
              <Typography sx={{ color: "#737b88", fontSize: 12}}>
                {detail}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Box className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          elevation={0}
          className="rounded-2xl border border-[#e7eaee] bg-white"
        >
          <CardContent className="!p-6">
            <Box className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <Box>
                <Typography
                  sx={{
                    color: "#20242b",
                    fontSize: 16,
                    fontWeight: 500,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Poland Promotion Trend
                </Typography>
                <Typography sx={{ color: "#737b88", fontSize: 12.5, mt: 0.5 }}>
                  Monthly discount movement for the selected year.
                </Typography>
              </Box>
              <Chip
                label={`${chartProducts.length} offers`}
                size="small"
                sx={{
                  backgroundColor: "#eaf1ff",
                  color: "#3b6fed",
                  fontWeight: 500,
                  fontSize: 11,
                  borderRadius: "6px",
                }}
              />
            </Box>
            <Box className="flex h-48 items-end gap-2 border-b border-l border-[#e7eaee] px-3 pb-2 sm:gap-4">
              {analytics.monthValues.map((value, index) => (
                <Box
                  key={months[index]}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                >
                  <Typography
                    sx={{
                      color:
                        value === analytics.peak
                          ? "#4f82f7"
                          : value
                            ? "#20242b"
                            : "#c8d0da",
                      fontSize: 10,
                      fontWeight: 800,
                    }}
                  >
                    {value ? `${value}%` : "-"}
                  </Typography>
                  <Box
                    className="w-full max-w-10 rounded-t-sm transition-all"
                    sx={{
                      height: `${Math.max((value / Math.max(analytics.peak, 1)) * 125, value ? 10 : 2)}px`,
                      backgroundColor:
                        value === analytics.peak
                          ? "#4f82f7"
                          : value
                            ? "#20242b"
                            : "#eef1f4",
                    }}
                  />
                  <Typography
                    sx={{ color: "#737b88", fontSize: 10, fontWeight: 500 }}
                  >
                    {months[index]}
                  </Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>

        <Card
          elevation={0}
          className="rounded-2xl border border-[#e7eaee] bg-white"
        >
          <CardContent className="!p-6">
            <Typography
              sx={{
                color: "#20242b",
                fontSize: 16,
                fontWeight: 500,
                letterSpacing: "-0.01em",
              }}
            >
              Promotion Pulse by Year
            </Typography>
            <Typography sx={{ color: "#737b88", fontSize: 12.5, mt: 0.5 }}>
              All available years, with filtered offer volume.
            </Typography>
            <Typography sx={{ color: "#737b88", fontSize: 12.5, mt: 0.5 }}>
              {dashboardText.pulseSubtitle}
            </Typography>
            <Box className="relative mt-5 flex h-52 items-end justify-around border-b border-l border-[#e7eaee] px-3 pb-2">
              <Box className="absolute inset-x-3 top-0 border-t border-dashed border-[#e7eaee]" />
              <Box className="absolute inset-x-3 top-1/2 border-t border-dashed border-[#e7eaee]" />
              {yearlyTrend.map((item) => {
                const chartMax = Math.max(
                  ...yearlyTrend.map((trend) => trend.high),
                  1,
                );
                const scale = (value: number) =>
                  `${Math.max(5, (value / chartMax) * 145)}px`;
                const rising = item.close >= item.open;
                return (
                  <Box
                    key={item.year}
                    className="flex h-full min-w-12 flex-col items-center justify-end gap-1"
                  >
                    <Typography
                      sx={{
                        color: rising ? "#4f82f7" : "#737b88",
                        fontSize: 10,
                        fontWeight: 800,
                      }}
                    >
                      {item.close}%
                    </Typography>
                    <Box
                      className="relative flex h-36 items-center justify-center"
                      title={`${item.year}: low ${item.low}%, open ${item.open}%, close ${item.close}%, high ${item.high}%`}
                    >
                      <Box
                        className="absolute w-px bg-[#c8d0da]"
                        sx={{ height: scale(item.high) }}
                      />
                      <Box
                        className="relative w-6 rounded-sm"
                        sx={{
                          height: scale(Math.abs(item.close - item.open)),
                          minHeight: 8,
                          backgroundColor: rising ? "#4f82f7" : "#3a3f48",
                          border: `1px solid ${rising ? "#2e63d4" : "#20242b"}`,
                        }}
                      />
                    </Box>
                    <Typography
                      sx={{ color: "#20242b", fontSize: 11, fontWeight: 500 }}
                    >
                      {item.year}
                    </Typography>
                    <Typography sx={{ color: "#737b88", fontSize: 10 }}>
                      {item.offers} offers
                    </Typography>
                  </Box>
                );
              })}
            </Box>
            <Box className="grid grid-cols-3 gap-2 mt-4">
              {yearlyTrend.map((item) => (
                <Box
                  key={item.year}
                  className="rounded-lg bg-[#f4f6f8] border border-[#e7eaee] px-2 py-1.5 text-center"
                >
                  <Typography
                    sx={{ color: "#737b88", fontSize: 10, fontWeight: 500 }}
                  >
                    {item.year}
                  </Typography>
                  <Typography
                    sx={{ color: "#20242b", fontSize: 12, fontWeight: 800 }}
                  >
                    {item.low}-{item.high}% range
                  </Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Card
        elevation={0}
        className="rounded-2xl border border-[#e7eaee] bg-white"
      >
        <CardContent className="!p-6">
          <Box className="mb-5 flex items-center justify-between">
            <Box>
              <Typography
                sx={{
                  color: "#20242b",
                  fontSize: 16,
                  fontWeight: 500,
                  letterSpacing: "-0.01em",
                }}
              >
                Product Promotion Catalog
              </Typography>
              <Typography sx={{ color: "#737b88", fontSize: 12.5, mt: 0.5 }}>
                Monitored products, competitor offers, and promotion end dates
              </Typography>
            </Box>
            <Box className="flex items-center gap-2">
              <Button
                component={Link}
                to="/promotions"
                size="small"
                endIcon={<ChevronRightRounded />}
                sx={{
                  color: "#20242b",
                  textTransform: "none",
                  fontWeight: 500,
                  "&:hover": { color: "#4f82f7" },
                }}
              >
                Manage promotions
              </Button>
            </Box>
          </Box>
          <TextField
            size="small"
            placeholder="Search products, brands, or categories"
            value={catalogSearch}
            onChange={(event) => {
              setCatalogSearch(event.target.value);
              setCatalogPage(1);
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <SearchRounded sx={{ color: "#a0a8b3", mr: 1 }} />
                ),
              },
            }}
            sx={{ mb: 3, minWidth: 320 }}
          />
          <Box className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {catalogProducts.map((product) => (
              <Box
                component={Link}
                to={`/products/${product.id}`}
                key={product.id}
                className="overflow-hidden rounded-2xl border border-[#e7eaee] no-underline bg-white transition-all hover:border-[#4f82f7] hover:shadow-md"
              >
                <Box className="relative h-36 bg-[#f4f6f8]">
                  <img
                    src={product.image || fallbackImage}
                    alt={product.name}
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = fallbackImage;
                    }}
                  />
                  <Chip
                    label={product.toDate >= today ? "Active" : "Expired"}
                    size="small"
                    sx={{
                      position: "absolute",
                      left: 8,
                      top: 8,
                      backgroundColor:
                        product.toDate >= today ? "#22252b" : "#eef1f4",
                      color: product.toDate >= today ? "#ffffff" : "#737b88",
                      fontSize: 10,
                      fontWeight: 500,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      borderRadius: "6px",
                    }}
                  />
                  {canEdit && product.toDate >= today && (
                    <IconButton
                      size="small"
                      title="Edit active promotion"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        openEditPromotion(product);
                      }}
                      sx={{
                        position: "absolute",
                        right: 6,
                        top: 6,
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        color: "#20242b",
                        padding: "3px",
                        "&:hover": {
                          backgroundColor: "#f5f8ff",
                          color: "#4f82f7",
                        },
                      }}
                    >
                      <EditRounded sx={{ fontSize: 16 }} />
                    </IconButton>
                  )}
                  {canEdit && product.toDate < today && (
                    <IconButton
                      size="small"
                      title="Delete expired promotion"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        handleDelete(product.id);
                      }}
                      sx={{
                        position: "absolute",
                        right: 6,
                        top: 6,
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        color: "#e5484d",
                        padding: "3px",
                        "&:hover": {
                          backgroundColor: "#fdecec",
                          color: "#c9302c",
                        },
                      }}
                    >
                      <DeleteOutlineRounded sx={{ fontSize: 16 }} />
                    </IconButton>
                  )}
                  <Box className="absolute bottom-2 right-2 rounded-md bg-[#f3873a] px-2 py-0.5 shadow-sm">
                    <Typography
                      sx={{
                        color: "#ffffff",
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: "0.02em",
                      }}
                    >
                      -{product.competitorDiscount}%
                    </Typography>
                  </Box>
                </Box>
                <Box className="p-3">
                  <Typography
                    sx={{
                      color: "#737b88",
                      display: "block",
                      fontSize: 10,
                      fontWeight: 500,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}
                  >
                    {product.brand}
                  </Typography>
                  <Typography
                    sx={{
                      color: "#20242b",
                      display: "block",
                      fontSize: 12.5,
                      fontWeight: 500,
                      lineHeight: 1.3,
                      mt: 0.25,
                    }}
                  >
                    {product.name}
                  </Typography>
                  <Typography
                    sx={{
                      color: "#737b88",
                      display: "block",
                      fontSize: 11,
                      fontWeight: 500,
                      mt: 0.75,
                    }}
                  >
                    {dashboardText.ends} {product.toDate}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
          <AppPagination
            count={Math.ceil(filteredProducts.length / catalogPageSize)}
            page={catalogPage}
            onChange={setCatalogPage}
            total={filteredProducts.length}
            pageSize={catalogPageSize}
            itemLabel="products"
          />
        </CardContent>
      </Card>

      <BrandComparisonTable />

      <Modal open={bulkModalOpen} onClose={() => setBulkModalOpen(false)}>
        <Box
          className="absolute left-1/2 top-1/2 w-[calc(100%-32px)] max-w-[900px] max-h-[90vh] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl relative border border-[#e7eaee] overflow-hidden"
          sx={{ p: 4 }}
        >
          {/* Form spans full modal height with flex layout */}
          <Box component="form" onSubmit={handleBulkSave} className="flex flex-col max-h-[80vh]">

            {/* 1. Header (Fixed at top) */}
            <Box className="pb-4">
              <Typography variant="h5" sx={{ fontWeight: 800, fontSize: 22 }}>
                {bulkText.heading}
              </Typography>
            </Box>

            {/* 2. Scrollable Body (Takes remaining space) */}
            <Box className="flex-1 overflow-y-auto py-4 flex flex-col gap-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <Box>
                <FormField
                  type="select"
                  label={bulkText.market}
                  value={bulkMarket}
                  onValueChange={(value) => setBulkMarket(String(value) as "PL" | "CZ")}
                  options={bulkText.marketOptions}
                  fullWidth
                />
              </Box>

              <Box className="flex gap-2">
                <Button
                  variant={bulkTab === "brands" ? "contained" : "outlined"}
                  onClick={() => setBulkTab("brands")}
                  sx={{
                    textTransform: "none",
                    fontWeight: 500,
                    backgroundColor: bulkTab === "brands" ? "#22252b" : "transparent",
                    color: bulkTab === "brands" ? "#ffffff" : "#20242b",
                    borderColor: "#dce1e8",
                    "&:hover": {
                      backgroundColor: bulkTab === "brands" ? "#343942" : "#f5f8ff",
                    },
                  }}
                >
                  {bulkText.tabBrands}
                </Button>
                <Button
                  variant={bulkTab === "products" ? "contained" : "outlined"}
                  onClick={() => setBulkTab("products")}
                  sx={{
                    textTransform: "none",
                    fontWeight: 500,
                    backgroundColor: bulkTab === "products" ? "#22252b" : "transparent",
                    color: bulkTab === "products" ? "#ffffff" : "#20242b",
                    borderColor: "#dce1e8",
                    "&:hover": {
                      backgroundColor: bulkTab === "products" ? "#343942" : "#f5f8ff",
                    },
                  }}
                >
                  {bulkText.tabProducts}
                </Button>
              </Box>

              <Box className="rounded-lg border border-[#e7eaee] bg-[#f4f6f8] p-3">
                <Typography sx={{ color: "#20242b", fontSize: 12, fontWeight: 800 }}>
                  {bulkText.excelTemplate}
                </Typography>
                <Typography sx={{ color: "#737b88", fontSize: 11.5, mt: 0.5 }}>
                  {bulkTab === "brands"
                    ? bulkText.brand
                    : `${bulkText.brandName} | ${bulkText.title}`}
                </Typography>
                <Box className="mt-2 flex flex-col gap-2">
                  <Box className="flex items-center justify-between gap-2">
                    <Button
                      variant="outlined"
                      component="label"
                      sx={{
                        textTransform: "none",
                        borderColor: "#dce1e8",
                        color: "#20242b",
                        fontWeight: 500,
                        "&:hover": { borderColor: "#4f82f7", backgroundColor: "#f5f8ff" },
                      }}
                    >
                      {bulkText.fileLabel}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        hidden
                        onChange={parseBulkFile}
                      />
                    </Button>
                    <Typography sx={{ color: "#737b88", fontSize: 11.5 }}>
                      {bulkText.fileHint}
                    </Typography>
                  </Box>
                  <Box className="flex flex-wrap gap-2">
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => downloadBulkTemplate("xlsx")}
                      sx={{
                        textTransform: "none",
                        borderColor: "#dce1e8",
                        color: "#20242b",
                        fontWeight: 500,
                        "&:hover": { borderColor: "#4f82f7", backgroundColor: "#f5f8ff" },
                      }}
                    >
                      {bulkText.downloadXlsx}
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => downloadBulkTemplate("csv")}
                      sx={{
                        textTransform: "none",
                        borderColor: "#dce1e8",
                        color: "#20242b",
                        fontWeight: 500,
                        "&:hover": { borderColor: "#4f82f7", backgroundColor: "#f5f8ff" },
                      }}
                    >
                      {bulkText.downloadCsv}
                    </Button>
                  </Box>
                </Box>
              </Box>

              {bulkTab === "brands" ? (
                <Box className="flex flex-col gap-2">
                  {brandRows.map((row, index) => (
                    <Box key={`brand-row-${index}`} className="grid grid-cols-[1fr_50px] gap-2 items-center">
                      <FormField
                        type="text"
                        label={bulkText.brand}
                        value={row.brand}
                        onValueChange={(value) => updateBrandRow(index, "brand", String(value))}
                        placeholder={bulkText.brand}
                      />
                      <Button
                        variant="text"
                        color="error"
                        onClick={() => removeBrandRow(index)}
                        sx={{ minWidth: 0, px: 0, fontWeight: 500, mt: 2 }}
                      >
                        <DeleteIcon fontSize="small" color="error" />
                      </Button>
                    </Box>
                  ))}
                  <Button
                    variant="text"
                    onClick={addBrandRow}
                    sx={{ textTransform: "none", fontWeight: 500, color: "#ffffff", selfAlign: "flex-start", maxWidth: "fit-content", backgroundColor: "#22252b", "&:hover": { backgroundColor: "#343942" } }}
                  >
                    {bulkText.addBrandRow}
                  </Button>
                </Box>
              ) : (
                <Box className="flex flex-col gap-2">
                  {productRows.map((row, index) => (
                    <Box key={`product-row-${index}`} className="grid grid-cols-[1fr_1fr_50px] gap-2 items-center">
                      <FormField
                        type="select"
                        label={bulkText.brandName}
                        value={row.brandName}
                        onValueChange={(value) => updateProductRow(index, "brandName", String(value))}
                        options={brandOptions.map((option) => ({ label: option, value: option }))}
                        fullWidth
                      />
                      <FormField
                        type="text"
                        label={bulkText.title}
                        value={row.title}
                        onValueChange={(value) => updateProductRow(index, "title", String(value))}
                        placeholder={bulkText.title}
                      />
                      <Button
                        variant="text"
                        color="error"
                        onClick={() => removeProductRow(index)}
                        sx={{ minWidth: 0, px: 0, fontWeight: 500, mt: 2 }}
                      >
                        <DeleteIcon fontSize="small" color="error" />
                      </Button>
                    </Box>
                  ))}
                  <Button
                    variant="text"
                    onClick={addProductRow}
                    sx={{ textTransform: "none", fontWeight: 500, color: "#ffffff", selfAlign: "flex-start", maxWidth: "fit-content", backgroundColor: "#22252b", "&:hover": { backgroundColor: "#343942" } }}
                  >
                    {bulkText.addProductRow}
                  </Button>
                </Box>
              )}
            </Box>

            {/* 3. Footer (Always pinned at bottom) */}
            <Box className="pt-4 flex flex-col gap-2 bg-white">
              {bulkError && (
                <Box sx={{ color: "#e5484d", fontSize: 13 }}>{bulkError}</Box>
              )}
              <Box className="flex items-center justify-end gap-2">
                <Button onClick={() => setBulkModalOpen(false)} sx={{ textTransform: "none", fontWeight: 500 }}>
                  {bulkText.cancel}
                </Button>
                <Button
                  variant="contained"
                  type="submit"
                  disabled={bulkSaving}
                  sx={{
                    textTransform: "none",
                    fontWeight: 500,
                    backgroundColor: "#22252b",
                    color: "#ffffff",
                    "&:hover": { backgroundColor: "#343942" },
                  }}
                >
                  {bulkSaving ? "Saving…" : bulkText.saveRows}
                </Button>
              </Box>
            </Box>

          </Box>
        </Box>
      </Modal>

      <PromotionFormModal
        open={formOpen}
        editingPromotion={editingPromotion}
        onClose={() => {
          setFormOpen(false);
          setEditingPromotion(null);
        }}
        onSave={async (promotion) => {
          setActionError(null);
          try {
            if (editingPromotion) {
              await updatePromotion(editingPromotion.id, promotion);
            } else {
              await addPromotion(promotion);
            }
            setFormOpen(false);
            setEditingPromotion(null);
          } catch (err) {
            setActionError(err instanceof Error ? err.message : "Failed to save.");
          }
        }}
      />

      <Card
        elevation={0}
        className="rounded-2xl border border-[#e7eaee] bg-white"
      >
        <CardContent className="!p-6">
          <Box className="mb-4 flex items-center justify-between">
            <Box>
              <Typography
                sx={{
                  color: "#20242b",
                  fontSize: 16,
                  fontWeight: 500,
                  letterSpacing: "-0.01em",
                }}
              >
                Expired Promotions
              </Typography>
              <Typography sx={{ color: "#737b88", fontSize: 12.5, mt: 0.5 }}>
                Historical discounts that are no longer active.
              </Typography>
            </Box>
            <Chip
              label={`${expiredProducts.length} archived`}
              size="small"
              sx={{
                backgroundColor: "#eef1f4",
                color: "#737b88",
                fontWeight: 500,
                borderRadius: "6px",
              }}
            />
          </Box>
          {expiredProducts.length === 0 ? (
            <Typography
              sx={{
                color: "#737b88",
                fontSize: 13,
                py: 4,
                textAlign: "center",
              }}
            >
              No expired promotions found.
            </Typography>
          ) : (
            <Box className="grid grid-cols-1 gap-3 md:grid-cols-5">
              {visibleExpiredProducts.map((product) => (
                <Box
                  key={product.id}
                  component={Link}
                  to={`/products/${product.id}`}
                  className="group relative overflow-hidden rounded-2xl border border-[#e7eaee] no-underline bg-white transition-all hover:border-[#4f82f7]"
                >
                  <Box className="relative h-32 bg-[#f4f6f8]">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover grayscale-[30%]"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = fallbackImage;
                      }}
                    />
                    <Chip
                      label="Expired"
                      size="small"
                      sx={{
                        position: "absolute",
                        left: 8,
                        top: 8,
                        backgroundColor: "#eef1f4",
                        color: "#737b88",
                        fontSize: 10,
                        fontWeight: 800,
                        borderRadius: "6px",
                      }}
                    />
                    {canEdit && (
                      <IconButton
                        size="small"
                        title="Delete expired promotion"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          handleDelete(product.id);
                        }}
                        sx={{
                          position: "absolute",
                          right: 8,
                          top: 8,
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          color: "#e5484d",
                          padding: "4px",
                          "&:hover": {
                            backgroundColor: "#fdecec",
                            color: "#c9302c",
                          },
                        }}
                      >
                        <DeleteOutlineRounded sx={{ fontSize: 16 }} />
                      </IconButton>
                    )}
                  </Box>
                  <Box className="p-3">
                    <Typography
                      sx={{ color: "#20242b", fontSize: 12, fontWeight: 500 }}
                    >
                      {product.name}
                    </Typography>
                    <Typography
                      sx={{ color: "#737b88", fontSize: 11, mt: 0.5 }}
                    >
                      {product.fromDate} - {product.toDate}
                    </Typography>
                    <Typography
                      sx={{
                        color: "#f3873a",
                        fontSize: 11,
                        fontWeight: 800,
                        mt: 1,
                      }}
                    >
                      -{product.competitorDiscount}% discount
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
          {expiredProducts.length > 0 && (
            <AppPagination
              count={Math.ceil(expiredProducts.length / expiredPageSize)}
              page={expiredPage}
              onChange={setExpiredPage}
              total={expiredProducts.length}
              pageSize={expiredPageSize}
              itemLabel="archived promotions"
            />
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Dashboard;
