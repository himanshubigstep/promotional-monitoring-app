import {
  AddRounded,
  ChevronRightRounded,
  DeleteOutlineRounded,
  EditRounded,
  LocalOfferRounded,
  SearchRounded,
  StorefrontRounded,
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
import {
  matchesPromotionFilters,
  useAppContext,
} from "../../context/AppContext";
import AppPagination from "../../components/AppPagination";
import FormField from "../../components/FormField";
import PromotionFormModal from "../../components/PromotionFormModal";
import DeleteIcon from "@mui/icons-material/Delete";
import BrandComparisonTable from "../../components/BrandComparisonTable";
import { isBenchmarkProduct } from "../../data/marketProducts";
import { BarChart } from "@mui/x-charts";
import { noImagePlaceholder as fallbackImage } from "../../lib/media";

const today = new Date().toISOString().slice(0, 10);
const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const Dashboard = () => {
  const {
    filters,
    products: catalog,
    addPromotion,
    addBrand,
    deleteProduct,
    updatePromotion,
    showToast,
    canEdit,
  } = useAppContext();

  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogPage, setCatalogPage] = useState(1);
  const [expiredPage, setExpiredPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [brandRows, setBrandRows] = useState([{ brand: "" }]);
  const [editingPromotion, setEditingPromotion] = useState<any | null>(null);
  const [displayLang, setDisplayLang] = useState<"PL" | "CZ" | "EN">("PL");
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

  const bulkText =
    displayLang === "EN"
      ? {
        heading: "Bulk brand import",
        market: "Market",
        excelTemplate: "Excel template",
        downloadXlsx: "Download template (.xlsx)",
        downloadCsv: "Download template (.csv)",
        addBrandRow: "+ Add another brand",
        saveRows: "Save entries",
        cancel: "Cancel",
        brand: "Brand",
        fileLabel: "Import from CSV/XLSX",
        fileHint: "Supported files: .csv, .xlsx, .xls",
        marketOptions: [
          { label: "PL", value: "PL" },
          { label: "CZ", value: "CZ" },
        ],
      }
      : bulkMarket === "PL"
        ? {
          heading: "Import masowy marek",
          market: "Rynek",
          excelTemplate: "Szablon Excel",
          downloadXlsx: "Pobierz szablon (.xlsx)",
          downloadCsv: "Pobierz szablon (.csv)",
          addBrandRow: "+ Dodaj kolejną markę",
          saveRows: "Zapisz wpisy",
          cancel: "Anuluj",
          brand: "Marka",
          fileLabel: "Importuj z CSV/XLSX",
          fileHint: "Obsługiwane pliki: .csv, .xlsx, .xls",
          marketOptions: [
            { label: "PL", value: "PL" },
            { label: "CZ", value: "CZ" },
          ],
        }
        : {
          heading: "Hromadný import značek",
          market: "Trh",
          excelTemplate: "Excel šablona",
          downloadXlsx: "Stáhnout šablonu (.xlsx)",
          downloadCsv: "Stáhnout šablonu (.csv)",
          addBrandRow: "+ Přidat další značku",
          saveRows: "Uložit záznamy",
          cancel: "Zrušit",
          brand: "Značka",
          fileLabel: "Importovat z CSV/XLSX",
          fileHint: "Podporované soubory: .csv, .xlsx, .xls",
          marketOptions: [
            { label: "PL", value: "PL" },
            { label: "CZ", value: "CZ" },
          ],
        };

  const resetBulkRows = () => {
    setBrandRows([{ brand: "" }]);
  };

  const downloadBulkTemplate = (format: "csv" | "xlsx") => {
    const brandTemplate = [
      [bulkText.brand],
      [bulkMarket === "PL" ? "Nazwa marki" : "Název značky"],
      [bulkMarket === "PL" ? "L'Oréal" : "L'Oréal"],
    ];
    const fileName = `bulk-brands-${bulkMarket.toLowerCase()}.${format}`;

    if (format === "csv") {
      const csv = brandTemplate
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
    const worksheet = XLSX.utils.aoa_to_sheet(brandTemplate);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, fileName);
  };

  const updateBrandRow = (index: number, field: "brand", value: string) => {
    setBrandRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row,
      ),
    );
  };

  const addBrandRow = () =>
    setBrandRows((current) => [...current, { brand: "" }]);

  const removeBrandRow = (index: number) => {
    setBrandRows((current) => {
      if (current.length === 1) {
        return [{ brand: "" }];
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
    const rows = XLSX.utils.sheet_to_json<
      Record<string, string | number | null>
    >(worksheet, { defval: "" });

    const normalize = (value: string | number | null | undefined) =>
      typeof value === "string"
        ? value.trim()
        : value == null
          ? ""
          : String(value).trim();

    const items = rows
      .map((row) => {
        const brand = normalize(
          row.Brand ?? row.Marka ?? row["Brand Name"] ?? row["Nazwa marki"],
        );
        return { brand };
      })
      .filter((row) => row.brand);

    setBrandRows(items.length > 0 ? items : [{ brand: "" }]);
    event.target.value = "";
  };

  const handleBulkSave = async (event?: React.FormEvent) => {
    event?.preventDefault();
    setBulkSaving(true);
    try {
      const marketToSave = displayLang === "EN" ? "PL" : bulkMarket;

      for (const row of brandRows) {
        const brandName = row.brand.trim();
        if (!brandName) continue;
        await addBrand(brandName, marketToSave);
      }
      showToast("Brands saved successfully.");
      setBulkModalOpen(false);
      resetBulkRows();
    } catch (err) {
      showToast("Unable to save. The database may be unavailable.", "error");
    } finally {
      setBulkSaving(false);
    }
  };

  async function handleDelete(id: string) {
    try {
      await deleteProduct(id);
      showToast("Promotion deleted successfully.");
    } catch (err) {
      showToast("Unable to delete. The database may be unavailable.", "error");
    }
  }

  const filteredProducts = useMemo(
    () =>
      catalog
        .filter((product) => {
          return (
            (product.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
              product.brand.toLowerCase().includes(catalogSearch.toLowerCase()) ||
              product.category
                .toLowerCase()
                .includes(catalogSearch.toLowerCase())) &&
            matchesPromotionFilters(product, filters)
          );
        })
        .sort((a, b) => {
          const aBench = isBenchmarkProduct(a);
          const bBench = isBenchmarkProduct(b);
          if (aBench !== bBench) return aBench ? -1 : 1;
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

  const monthlyLine = useMemo(() => {
    const topPad = 15;
    const innerHeight = 85;
    const maxVal = Math.max(analytics.peak, 1);
    const points = analytics.monthValues.map((value, index) => {
      const xPct = (index / (analytics.monthValues.length - 1)) * 100;
      const heightFraction = value / maxVal;
      const yPct = topPad + (1 - heightFraction) * innerHeight;
      return { value, xPct, yPct, isPeak: value === analytics.peak && value > 0 };
    });
    const linePath = points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.xPct.toFixed(2)} ${p.yPct.toFixed(2)}`)
      .join(" ");
    const areaPath = `${linePath} L 100 100 L 0 100 Z`;
    return { points, linePath, areaPath };
  }, [analytics]);

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

  const retailerComparison = useMemo(() => {
    const map = new Map<
      string,
      { totalDiscount: number; count: number; activeCount: number }
    >();

    chartProducts.forEach((product) => {
      const key = product.retailer || "Unknown";
      const entry = map.get(key) ?? {
        totalDiscount: 0,
        count: 0,
        activeCount: 0,
      };
      entry.totalDiscount += product.competitorDiscount;
      entry.count += 1;
      if (product.fromDate <= today && product.toDate >= today) {
        entry.activeCount += 1;
      }
      map.set(key, entry);
    });

    return Array.from(map.entries())
      .map(([retailer, stats]) => ({
        retailer,
        avgDiscount: Math.round(stats.totalDiscount / stats.count),
        offers: stats.count,
        active: stats.activeCount,
      }))
      .sort((a, b) => b.avgDiscount - a.avgDiscount);
  }, [chartProducts]);

  const retailerLine = useMemo(() => {
    const topPad = 15;
    const innerHeight = 85;
    const values = retailerComparison.map((r) => r.avgDiscount);
    const maxVal = Math.max(...values, 1);
    const count = retailerComparison.length;

    const points = retailerComparison.map((item, index) => {
      const xPct = count > 1 ? (index / (count - 1)) * 100 : 50;
      const heightFraction = item.avgDiscount / maxVal;
      const yPct = topPad + (1 - heightFraction) * innerHeight;
      return {
        ...item,
        xPct,
        yPct,
        isPeak: item.avgDiscount === maxVal && item.avgDiscount > 0,
      };
    });

    const linePath = points
      .map(
        (p, i) =>
          `${i === 0 ? "M" : "L"} ${p.xPct.toFixed(2)} ${p.yPct.toFixed(2)}`,
      )
      .join(" ");
    const areaPath =
      points.length > 0 ? `${linePath} L 100 100 L 0 100 Z` : "";

    return { points, linePath, areaPath };
  }, [retailerComparison]);

  const catalogProducts = filteredProducts.slice(
    (catalogPage - 1) * catalogPageSize,
    catalogPage * catalogPageSize,
  );

  const expiredProducts = useMemo(
    () =>
      catalog.filter(
        (product) =>
          product.toDate < today && matchesPromotionFilters(product, filters),
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
      <Box className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card
          elevation={0}
          className="rounded-2xl border border-[#e3e6ed] bg-white lg:col-span-3"
        >
          <CardContent className="!p-6">
            {canEdit && (
              <Box className="mb-5 flex items-center justify-end gap-2">
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddRounded />}
                  onClick={() => setFormOpen(true)}
                  sx={{
                    backgroundColor: "#000000",
                    color: "#ffffff",
                    textTransform: "none",
                    fontWeight: 700,
                    borderRadius: "8px",
                    "&:hover": { backgroundColor: "#333333" },
                  }}
                >
                  Add promotion
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    resetBulkRows();
                    setBulkModalOpen(true);
                  }}
                  sx={{
                    borderColor: "#cbd0dd",
                    color: "#31374a",
                    textTransform: "none",
                    fontWeight: 500,
                    borderRadius: "8px",
                    "&:hover": {
                      borderColor: "#000000",
                      backgroundColor: "#f2f2f2",
                    },
                  }}
                >
                  Bulk upload brands
                </Button>
              </Box>
            )}

            {/* Mini-stat row */}
            <Box className="flex flex-wrap items-center gap-x-8 gap-y-4">
              {[
                {
                  value: `${filteredProducts.length} offers tracked`,
                  detail: "Active catalog",
                  icon: <LocalOfferRounded sx={{ fontSize: 18 }} />,
                  bg: "#d9fbd0",
                  fg: "#1c6c09",
                },
                {
                  value: `${analytics.active} active today`,
                  detail: "across monitored retailers",
                  icon: <StorefrontRounded sx={{ fontSize: 18 }} />,
                  bg: "#f2f2f2",
                  fg: "#000000",
                },
                {
                  value: `${analytics.average}% avg discount`,
                  detail: "across active campaigns",
                  icon: <TrendingUpRounded sx={{ fontSize: 18 }} />,
                  bg: "#ffe2dc",
                  fg: "#c92e13",
                },
              ].map((stat) => (
                <Box key={stat.value} className="flex items-center gap-3">
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: stat.bg,
                      color: stat.fg,
                      flexShrink: 0,
                    }}
                  >
                    {stat.icon}
                  </Box>
                  <Box>
                    <Typography sx={{ color: "#141824", fontSize: 14, fontWeight: 800 }}>
                      {stat.value}
                    </Typography>
                    <Typography sx={{ color: "#525b75", fontSize: 11.5 }}>
                      {stat.detail}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>

            <Box className="my-5 border-t border-[#e3e6ed]" />

            <Box className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <Box>
                <Typography
                  sx={{
                    color: "#141824",
                    fontSize: 16,
                    fontWeight: 700,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Poland Promotion Trend
                </Typography>
                <Typography sx={{ color: "#525b75", fontSize: 12.5, mt: 0.5 }}>
                  Monthly discount movement for the selected year.
                </Typography>
              </Box>
              <Chip
                label={`${chartProducts.length} offers`}
                size="small"
                sx={{
                  backgroundColor: "#f2f2f2",
                  color: "#000000",
                  fontWeight: 500,
                  fontSize: 11,
                  borderRadius: "6px",
                }}
              />
            </Box>

            {/* Line chart */}
            <Box className="relative" sx={{
              height: "calc(20rem)"
            }}>
              {monthlyLine.points.map((p, index) => (
                <Box
                  key={months[index]}
                  className="absolute -translate-x-1/2"
                  sx={{ left: `${p.xPct}%`, top: 0 }}
                >
                  <Typography
                    sx={{
                      color: p.isPeak ? "#000000" : p.value ? "#525b75" : "#cbd0dd",
                      fontSize: 10,
                      fontWeight: 800,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {p.value ? `${p.value}%` : "-"}
                  </Typography>
                </Box>
              ))}

              {/* Plot area: percentage coordinates line up 1:1 with the SVG viewBox and the dot markers */}
              <Box className="absolute inset-x-0" sx={{ top: 20, bottom: 20 }}>
                <Box className="absolute inset-0 flex justify-between">
                  {months.map((month) => (
                    <Box
                      key={month}
                      className="h-full border-l border-[#eff2f6] first:border-l-0"
                    />
                  ))}
                </Box>
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  className="absolute inset-0 h-full w-full"
                >
                  <path d={monthlyLine.areaPath} fill="#f2f2f2" stroke="none" />
                  <path
                    d={monthlyLine.linePath}
                    fill="none"
                    stroke="#000000"
                    strokeWidth={2.5}
                    vectorEffect="non-scaling-stroke"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </svg>
                {monthlyLine.points.map((p, index) => (
                  <Box
                    key={months[index]}
                    className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
                    sx={{
                      left: `${p.xPct}%`,
                      top: `${p.yPct}%`,
                      width: p.isPeak ? 9 : 6,
                      height: p.isPeak ? 9 : 6,
                      backgroundColor: p.isPeak ? "#000000" : "#ffffff",
                      border: "2px solid #000000",
                    }}
                  />
                ))}
              </Box>

              <Box className="absolute inset-x-0 bottom-0 flex justify-between">
                {months.map((month) => (
                  <Typography
                    key={month}
                    sx={{ color: "#525b75", fontSize: 10, fontWeight: 500 }}
                  >
                    {month}
                  </Typography>
                ))}
              </Box>
            </Box>
          </CardContent>
        </Card>

        <Box className="grid grid-cols-1 gap-4 lg:col-span-2">
          {/* Yearly promotions comparison */}
          <Card
            elevation={0}
            className="rounded-2xl border border-[#e3e6ed] bg-white"
          >
            <CardContent className="!p-4">
              <Box className="mb-2 flex items-center justify-between">
                <Box>
                  <Typography
                    sx={{
                      color: "#141824",
                      fontSize: 14,
                      fontWeight: 700,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Yearly Promotions
                  </Typography>
                  <Typography sx={{ color: "#525b75", fontSize: 11 }}>
                    Offers tracked per year
                  </Typography>
                </Box>
                <Chip
                  label={`${yearlyTrend.length} years`}
                  size="small"
                  sx={{
                    backgroundColor: "#f2f2f2",
                    color: "#000000",
                    fontWeight: 500,
                    fontSize: 10,
                    borderRadius: "6px",
                  }}
                />
              </Box>
              <Box sx={{ width: "100%", height: 200 }}>
                {yearlyTrend.length > 0 ? (
                  <BarChart
                    height={200}
                    hideLegend
                    xAxis={[
                      {
                        scaleType: "band",
                        data: yearlyTrend.map((item) => item.year),
                        tickLabelStyle: { fontSize: 10, fill: "#525b75" },
                      },
                    ]}
                    yAxis={[
                      {
                        tickLabelStyle: { fontSize: 10, fill: "#525b75" },
                      },
                    ]}
                    series={[
                      {
                        data: yearlyTrend.map((item) => item.offers),
                        label: "Offers",
                        color: "#141824",
                      },
                    ]}
                    margin={{ top: 10, right: 10, bottom: 24, left: 32 }}
                    sx={{
                      "& .MuiBarElement-root": { rx: 4 },
                    }}
                  />
                ) : (
                  <Box className="flex h-full items-center justify-center">
                    <Typography sx={{ color: "#525b75", fontSize: 12 }}>
                      No yearly data available.
                    </Typography>
                  </Box>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* Retailer discount comparison */}
          <Card
            elevation={0}
            className="rounded-2xl border border-[#e3e6ed] bg-white"
          >
            <CardContent className="!p-4">
              <Box className="mb-2 flex items-center justify-between">
                <Box>
                  <Typography
                    sx={{
                      color: "#141824",
                      fontSize: 14,
                      fontWeight: 700,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Retailer Discount Comparison
                  </Typography>
                  <Typography sx={{ color: "#525b75", fontSize: 11 }}>
                    Average competitor discount by retailer
                  </Typography>
                </Box>
                <Chip
                  label={`${retailerComparison.length} retailers`}
                  size="small"
                  sx={{
                    backgroundColor: "#ffe2dc",
                    color: "#c92e13",
                    fontWeight: 500,
                    fontSize: 10,
                    borderRadius: "6px",
                  }}
                />
              </Box>

              {retailerComparison.length === 0 ? (
                <Box className="flex h-[200px] items-center justify-center">
                  <Typography sx={{ color: "#525b75", fontSize: 12 }}>
                    No retailer data available.
                  </Typography>
                </Box>
              ) : (
                <Box className="relative" sx={{ height: "12.5rem" }}>
                  {/* Value labels */}
                  {retailerLine.points.map((p: any) => (
                    <Box
                      key={`label-${p.retailer}`}
                      className="absolute -translate-x-1/2"
                      sx={{ left: `${p.xPct}%`, top: 0 }}
                    >
                      <Typography
                        sx={{
                          color: p.isPeak ? "#e5780b" : p.value ? "#525b75" : "#cbd0dd",
                          fontSize: 10,
                          fontWeight: 800,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p.avgDiscount ? `${p.avgDiscount}%` : "-"}
                      </Typography>
                    </Box>
                  ))}

                  {/* Plot area */}
                  <Box className="absolute inset-x-0" sx={{ top: 20, bottom: 20 }}>
                    <Box className="absolute inset-0 flex justify-between">
                      {retailerLine.points.map((p) => (
                        <Box
                          key={`grid-${p.retailer}`}
                          className="h-full border-l border-[#eff2f6] first:border-l-0"
                        />
                      ))}
                    </Box>
                    <svg
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      className="absolute inset-0 h-full w-full"
                    >
                      <path d={retailerLine.areaPath} fill="#ffe2dc" stroke="none" />
                      <path
                        d={retailerLine.linePath}
                        fill="none"
                        stroke="#e5780b"
                        strokeWidth={2.5}
                        vectorEffect="non-scaling-stroke"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                      />
                    </svg>
                    {retailerLine.points.map((p) => (
                      <Box
                        key={`dot-${p.retailer}`}
                        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
                        sx={{
                          left: `${p.xPct}%`,
                          top: `${p.yPct}%`,
                          width: p.isPeak ? 9 : 6,
                          height: p.isPeak ? 9 : 6,
                          backgroundColor: p.isPeak ? "#e5780b" : "#ffffff",
                          border: "2px solid #e5780b",
                        }}
                      />
                    ))}
                  </Box>

                  {/* Retailer labels */}
                  <Box className="absolute inset-x-0 bottom-0 flex justify-between">
                    {retailerLine.points.map((p) => (
                      <Typography
                        key={`xlabel-${p.retailer}`}
                        sx={{
                          color: "#525b75",
                          fontSize: 10,
                          fontWeight: 500,
                          maxWidth: 60,
                          textAlign: "center",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {p.retailer}
                      </Typography>
                    ))}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>

      <Card elevation={0} className="rounded-2xl border border-[#e3e6ed] bg-white">
        <CardContent className="!p-6">
          <Box className="mb-5 flex items-center justify-between">
            <Box>
              <Typography
                sx={{
                  color: "#141824",
                  fontSize: 16,
                  fontWeight: 500,
                  letterSpacing: "-0.01em",
                }}
              >
                Product Promotion Catalog
              </Typography>
              <Typography sx={{ color: "#525b75", fontSize: 12.5, mt: 0.5 }}>
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
                  color: "#141824",
                  textTransform: "none",
                  fontWeight: 500,
                  "&:hover": { color: "#000000" },
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
                  <SearchRounded sx={{ color: "#9fa6bc", mr: 1 }} />
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
                className="overflow-hidden rounded-2xl border border-[#e3e6ed] no-underline bg-white transition-all hover:border-[#000000] hover:shadow-md"
              >
                <Box className="relative h-36 bg-[#f5f7fa]">
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
                        product.toDate >= today ? "#141824" : "#eff2f6",
                      color: product.toDate >= today ? "#ffffff" : "#525b75",
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
                        color: "#141824",
                        padding: "3px",
                        "&:hover": {
                          backgroundColor: "#f2f2f2",
                          color: "#000000",
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
                        color: "#fa3b1d",
                        padding: "3px",
                        "&:hover": {
                          backgroundColor: "#ffe2dc",
                          color: "#c92e13",
                        },
                      }}
                    >
                      <DeleteOutlineRounded sx={{ fontSize: 16 }} />
                    </IconButton>
                  )}
                  <Box className="absolute bottom-2 right-2 rounded-md bg-[#e5780b] px-2 py-0.5 shadow-sm">
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
                      color: "#525b75",
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
                      color: "#141824",
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
                      color: "#525b75",
                      display: "block",
                      fontSize: 11,
                      fontWeight: 500,
                      mt: 0.75,
                    }}
                  >
                    {product.fromDate}:{product.toDate}
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
          className="absolute left-1/2 top-1/2 w-[calc(100%-32px)] max-w-[700px] max-h-[90vh] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl relative border border-[#e3e6ed] overflow-hidden"
          sx={{ p: 4 }}
        >
          <Box
            component="form"
            onSubmit={handleBulkSave}
            className="flex flex-col max-h-[80vh]"
          >
            {/* Header */}
            <Box className="pb-4 flex items-start justify-between gap-3">
              <Typography variant="h5" sx={{ fontWeight: 800, fontSize: 22 }}>
                {bulkText.heading}
              </Typography>

              {/* Language toggle */}
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
                      setBulkMarket(market);
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

            {/* Scrollable body */}
            <Box className="flex-1 overflow-y-auto py-4 flex flex-col gap-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <Box>
                <FormField
                  type="select"
                  label={bulkText.market}
                  value={bulkMarket}
                  disabled={displayLang === "EN"}
                  onValueChange={(value) =>
                    setBulkMarket(String(value) as "PL" | "CZ")
                  }
                  options={bulkText.marketOptions}
                  fullWidth
                />
              </Box>

              <Box className="rounded-lg border border-[#e3e6ed] bg-[#f5f7fa] p-3">
                <Typography
                  sx={{ color: "#141824", fontSize: 12, fontWeight: 800 }}
                >
                  {bulkText.excelTemplate}
                </Typography>
                <Typography
                  sx={{ color: "#525b75", fontSize: 11.5, mt: 0.5 }}
                >
                  {bulkText.brand}
                </Typography>
                <Box className="mt-2 flex flex-col gap-2">
                  <Box className="flex items-center justify-between gap-2">
                    <Button
                      variant="outlined"
                      component="label"
                      sx={{
                        textTransform: "none",
                        borderColor: "#cbd0dd",
                        color: "#141824",
                        fontWeight: 500,
                        "&:hover": {
                          borderColor: "#000000",
                          backgroundColor: "#f2f2f2",
                        },
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
                    <Typography sx={{ color: "#525b75", fontSize: 11.5 }}>
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
                        borderColor: "#cbd0dd",
                        color: "#141824",
                        fontWeight: 500,
                        "&:hover": {
                          borderColor: "#000000",
                          backgroundColor: "#f2f2f2",
                        },
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
                        borderColor: "#cbd0dd",
                        color: "#141824",
                        fontWeight: 500,
                        "&:hover": {
                          borderColor: "#000000",
                          backgroundColor: "#f2f2f2",
                        },
                      }}
                    >
                      {bulkText.downloadCsv}
                    </Button>
                  </Box>
                </Box>
              </Box>

              <Box className="flex flex-col gap-2">
                {brandRows.map((row, index) => (
                  <Box
                    key={`brand-row-${index}`}
                    className="grid grid-cols-[1fr_50px] gap-2 items-center"
                  >
                    <FormField
                      type="text"
                      label={bulkText.brand}
                      value={row.brand}
                      onValueChange={(value) =>
                        updateBrandRow(index, "brand", String(value))
                      }
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
                  sx={{
                    textTransform: "none",
                    fontWeight: 500,
                    color: "#ffffff",
                    maxWidth: "fit-content",
                    backgroundColor: "#141824",
                    "&:hover": { backgroundColor: "#31374a" },
                  }}
                >
                  {bulkText.addBrandRow}
                </Button>
              </Box>
            </Box>

            {/* Footer */}
            <Box className="pt-4 flex flex-col gap-2 bg-white">
              <Box className="flex items-center justify-end gap-2">
                <Button
                  onClick={() => setBulkModalOpen(false)}
                  sx={{ textTransform: "none", fontWeight: 500 }}
                >
                  {bulkText.cancel}
                </Button>
                <Button
                  variant="contained"
                  type="submit"
                  disabled={bulkSaving}
                  sx={{
                    textTransform: "none",
                    fontWeight: 500,
                    backgroundColor: "#141824",
                    color: "#ffffff",
                    "&:hover": { backgroundColor: "#31374a" },
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
          try {
            if (editingPromotion) {
              await updatePromotion(editingPromotion.id, promotion);
            } else {
              await addPromotion(promotion);
            }
            showToast(
              editingPromotion
                ? "Promotion updated successfully."
                : "Promotion saved successfully.",
            );
            setFormOpen(false);
            setEditingPromotion(null);
          } catch (err) {
            showToast("Unable to save. The database may be unavailable.", "error");
          }
        }}
      />

      <Card elevation={0} className="rounded-2xl border border-[#e3e6ed] bg-white">
        <CardContent className="!p-6">
          <Box className="mb-4 flex items-center justify-between">
            <Box>
              <Typography
                sx={{
                  color: "#141824",
                  fontSize: 16,
                  fontWeight: 500,
                  letterSpacing: "-0.01em",
                }}
              >
                Expired Promotions
              </Typography>
              <Typography sx={{ color: "#525b75", fontSize: 12.5, mt: 0.5 }}>
                Historical discounts that are no longer active.
              </Typography>
            </Box>
            <Chip
              label={`${expiredProducts.length} archived`}
              size="small"
              sx={{
                backgroundColor: "#eff2f6",
                color: "#525b75",
                fontWeight: 500,
                borderRadius: "6px",
              }}
            />
          </Box>
          {expiredProducts.length === 0 ? (
            <Typography
              sx={{
                color: "#525b75",
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
                  className="group relative overflow-hidden rounded-2xl border border-[#e3e6ed] no-underline bg-white transition-all hover:border-[#000000]"
                >
                  <Box className="relative h-32 bg-[#f5f7fa]">
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
                        backgroundColor: "#eff2f6",
                        color: "#525b75",
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
                          color: "#fa3b1d",
                          padding: "4px",
                          "&:hover": {
                            backgroundColor: "#ffe2dc",
                            color: "#c92e13",
                          },
                        }}
                      >
                        <DeleteOutlineRounded sx={{ fontSize: 16 }} />
                      </IconButton>
                    )}
                  </Box>
                  <Box className="p-3">
                    <Typography
                      sx={{ color: "#141824", fontSize: 12, fontWeight: 500 }}
                    >
                      {product.name}
                    </Typography>
                    <Typography
                      sx={{ color: "#525b75", fontSize: 11, mt: 0.5 }}
                    >
                      {product.fromDate}:{product.toDate}
                    </Typography>
                    <Typography
                      sx={{
                        color: "#e5780b",
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