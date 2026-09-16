import { CalendarMonthRounded, DownloadRounded } from "@mui/icons-material";
import { Box, Button, Card, Chip, Tooltip, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import type { Product, ProductCategory } from "../../data/productTypes";
import { isBenchmarkProduct } from "../../data/marketProducts";
import { formatRetailerLabel } from "../../data/retailers";
import { matchesPromotionFilters, useAppContext } from "../../context/AppContext";
import AppPagination from "../../components/AppPagination";
import FormField from "../../components/FormField";

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

// Keyed by product category rather than brand — with brand-wise grouping
// removed, category is the more meaningful visual grouping since it's a
// closed, small set (unlike the open-ended list of brands).
const categoryTints: Record<ProductCategory, { bg: string; fg: string; bar: string }> = {
  Skincare: { bg: "#e3f4fd", fg: "#0c6aa8", bar: "#0097eb" },
  Fragrance: { bg: "#f2e7fb", fg: "#6a3b9e", bar: "#8b4fd6" },
  Makeup: { bg: "#ffe2dc", fg: "#c92e13", bar: "#fa3b1d" },
  Haircare: { bg: "#fdf1e3", fg: "#a85a04", bar: "#e5780b" },
  "Body Care": { bg: "#e6f7ee", fg: "#177245", bar: "#1fa565" },
  Tools: { bg: "#eceef1", fg: "#31374a", bar: "#5b6478" },
};
const defaultTint = { bg: "#eff2f6", fg: "#525b75", bar: "#9fa6bc" };

const pageSize = 10;
const ALL = "All";
const getYear = (dateStr: string) => (dateStr ? Number(dateStr.slice(0, 4)) : NaN);
const currentYear = new Date().getFullYear();

export default function PromotionalCalendar() {
  const { filters, products } = useAppContext();
  const [page, setPage] = useState(1);
  const [calendarYear, setCalendarYear] = useState(currentYear);
  const [calendarCategory, setCalendarCategory] = useState(ALL);
  const [calendarBrand, setCalendarBrand] = useState(ALL);
  const [calendarStore, setCalendarStore] = useState(ALL);
  const [calendarProduct, setCalendarProduct] = useState(ALL);

  const filteredCatalog = useMemo(
    () =>
      products.filter((product) => matchesPromotionFilters(product, filters)),
    [filters, products],
  );

  // Every year any campaign touches (by fromDate or toDate), so the year
  // select never offers an empty year - the Gantt grid can only show one
  // calendar year at a time, so a year is always selected (not "All").
  const availableYears = useMemo(
    () =>
      Array.from(
        new Set(
          filteredCatalog.flatMap((product) => [
            getYear(product.fromDate),
            getYear(product.toDate),
          ]),
        ),
      )
        .filter((year) => Number.isFinite(year))
        .sort((a, b) => b - a),
    [filteredCatalog],
  );

  // If the selected year has no data (first load, or filters just changed
  // it away), snap to the current year if it has data, else the most recent
  // year that does.
  useEffect(() => {
    if (!availableYears.length) return;
    if (availableYears.includes(calendarYear)) return;
    setCalendarYear(
      availableYears.includes(currentYear) ? currentYear : availableYears[0],
    );
  }, [availableYears, calendarYear]);

  const availableCategories = useMemo(
    () => Array.from(new Set(filteredCatalog.map((product) => product.category))).sort(),
    [filteredCatalog],
  );
  const availableBrands = useMemo(
    () => Array.from(new Set(filteredCatalog.map((product) => product.brand))).sort(),
    [filteredCatalog],
  );
  const availableStores = useMemo(
    () => Array.from(new Set(filteredCatalog.map((product) => product.retailer))).sort(),
    [filteredCatalog],
  );
  const availableProducts = useMemo(
    () => Array.from(new Set(filteredCatalog.map((product) => product.name))).sort(),
    [filteredCatalog],
  );

  // This page's own view controls (year/category/brand/store/product),
  // layered on top of whatever the shared "Filters" button already applied.
  const yearScopedCatalog = useMemo(
    () =>
      filteredCatalog.filter((product) => {
        const startYear = getYear(product.fromDate);
        const endYear = getYear(product.toDate);
        const touchesSelectedYear =
          startYear <= calendarYear && endYear >= calendarYear;
        return (
          touchesSelectedYear &&
          (calendarCategory === ALL || product.category === calendarCategory) &&
          (calendarBrand === ALL || product.brand === calendarBrand) &&
          (calendarStore === ALL || product.retailer === calendarStore) &&
          (calendarProduct === ALL || product.name === calendarProduct)
        );
      }),
    [filteredCatalog, calendarYear, calendarCategory, calendarBrand, calendarStore, calendarProduct],
  );

  // Benchmark/dummy products (seeded once, then expanded to every retailer —
  // see marketProducts.ts) are guaranteed to have data across all stores, so
  // surface them first, same ordering rule as the Promotions page. Within
  // each group (benchmark / non-benchmark), sort chronologically by
  // fromDate so the calendar reads top-to-bottom in the same left-to-right
  // order as the Gantt bars themselves. This is purely a display-order
  // change scoped to this page's own sort — it doesn't touch
  // BrandComparisonTable, which sorts its rows alphabetically by
  // brand/name and is unaffected by this.
  const sortedCampaigns = useMemo(() => {
    return [...yearScopedCatalog].sort((a, b) => {
      const aBench = isBenchmarkProduct(a);
      const bBench = isBenchmarkProduct(b);
      if (aBench !== bBench) return aBench ? -1 : 1;
      return a.fromDate.localeCompare(b.fromDate);
    });
  }, [yearScopedCatalog]);

  // One row per campaign now that brand-wise grouping is gone. Bars are
  // clipped to the selected year, so a campaign that spans a year boundary
  // (e.g. Nov 2025 - Feb 2026) only shows the portion inside this year
  // instead of being mis-plotted onto whichever month index it happens to
  // share with campaigns from a completely different year.
  const ganttRows = useMemo(() => {
    const yearStart = new Date(calendarYear, 0, 1);
    const yearEnd = new Date(calendarYear, 11, 31);
    return sortedCampaigns.map((product) => {
      const rawStart = new Date(product.fromDate);
      const rawEnd = new Date(product.toDate);
      const start = rawStart < yearStart ? yearStart : rawStart;
      const end = rawEnd > yearEnd ? yearEnd : rawEnd;
      const startMonth = start.getMonth();
      const endMonth = end.getMonth();

      const leftPercent = (startMonth / 12) * 100;
      const widthPercent = Math.max(
        ((endMonth - startMonth + 1) / 12) * 100,
        8,
      );

      return {
        ...product,
        leftPercent,
        widthPercent,
        durationMonths: endMonth - startMonth + 1,
        expired: product.toDate < today,
        benchmark: isBenchmarkProduct(product),
        spansBeyondYear: rawStart < yearStart || rawEnd > yearEnd,
      };
    });
  }, [sortedCampaigns, calendarYear]);

  const activeCount = ganttRows.filter((row) => !row.expired).length;
  const storeCount = new Set(ganttRows.map((row) => row.retailer)).size;
  const brandCount = new Set(ganttRows.map((row) => row.brand)).size;

  const pageCount = Math.max(1, Math.ceil(ganttRows.length / pageSize));
  const visibleRows = ganttRows.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [filters, calendarYear, calendarCategory, calendarBrand, calendarStore, calendarProduct]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const downloadUpdatedProducts = () => {
    if (!products.length) return;
    const headers = Object.keys(products[0]) as Array<keyof Product>;
    const table = `
      <table border="1">
        <thead>
          <tr>${headers.map((h) => `<th>${String(h)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${sortedCampaigns
            .map(
              (p) =>
                `<tr>${headers.map((h) => `<td>${String(p[h] ?? "")}</td>`).join("")}</tr>`,
            )
            .join("")}
        </tbody>
      </table>`;
    const blob = new Blob([table], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "promotional_gantt_timeline.xls";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Box className="flex flex-col gap-4">
      <Card
        elevation={0}
        className="rounded-2xl border border-[#e3e6ed] bg-white overflow-hidden shadow-[0_1px_2px_rgba(20,24,36,0.04)]"
      >
        {/* Toolbar */}
        <Box className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e3e6ed] bg-gradient-to-b from-white to-[#fafbfc] p-4">
          <Box className="flex items-center gap-3">
            <Box
              className="flex flex-col items-center justify-center rounded-xl border border-[#e3e6ed]"
              sx={{
                width: 44,
                height: 44,
                background: "linear-gradient(145deg, #1a1e2b, #000000)",
              }}
            >
              <CalendarMonthRounded sx={{ color: "#ffffff", fontSize: 20 }} />
            </Box>
            <Box>
              <Typography
                sx={{
                  color: "#141824",
                  fontSize: 16,
                  fontWeight: 700,
                  letterSpacing: "-0.01em",
                }}
              >
                Promotional Campaign Calendar
              </Typography>
              <Typography sx={{ color: "#525b75", fontSize: 12.5, mt: 0.25 }}>
                {ganttRows.length} campaign{ganttRows.length === 1 ? "" : "s"} in{" "}
                {calendarYear}, benchmark offers surfaced first.
              </Typography>
            </Box>
          </Box>
          <Box className="flex items-center gap-3">
            <Box className="hidden items-center gap-3 md:flex">
              {(Object.keys(categoryTints) as ProductCategory[]).map((category) => (
                <Box key={category} className="flex items-center gap-1.5">
                  <Box
                    className="rounded-full"
                    sx={{ width: 8, height: 8, backgroundColor: categoryTints[category].bar }}
                  />
                  <Typography sx={{ color: "#525b75", fontSize: 11, fontWeight: 600 }}>
                    {category}
                  </Typography>
                </Box>
              ))}
            </Box>
            <Button
              variant="contained"
              size="small"
              startIcon={<DownloadRounded sx={{ fontSize: 16 }} />}
              onClick={downloadUpdatedProducts}
              sx={{
                backgroundColor: "#000000",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: 12.5,
                textTransform: "none",
                borderRadius: "8px",
                boxShadow: "none",
                "&:hover": { backgroundColor: "#333333" },
              }}
            >
              Export Timeline
            </Button>
          </Box>
        </Box>

        {/* View controls - slice the calendar by year, category, brand,
            store, or a specific product, independent of the shared Filters
            modal (which still applies underneath these). */}
        <Box className="grid grid-cols-2 gap-3 border-b border-[#e3e6ed] bg-white p-4 sm:grid-cols-3 lg:grid-cols-5">
          <FormField
            type="select"
            label="Year"
            value={String(calendarYear)}
            onValueChange={(value) => setCalendarYear(Number(value))}
            options={availableYears.map((year) => ({
              label: String(year),
              value: String(year),
            }))}
          />
          <FormField
            type="select"
            label="Category"
            value={calendarCategory}
            onValueChange={(value) => setCalendarCategory(String(value))}
            options={[ALL, ...availableCategories].map((value) => ({
              label: value,
              value,
            }))}
          />
          <FormField
            type="select"
            label="Brand"
            value={calendarBrand}
            onValueChange={(value) => setCalendarBrand(String(value))}
            options={[ALL, ...availableBrands].map((value) => ({
              label: value,
              value,
            }))}
          />
          <FormField
            type="select"
            label="Store"
            value={calendarStore}
            onValueChange={(value) => setCalendarStore(String(value))}
            options={[ALL, ...availableStores].map((value) => ({
              label: value === ALL ? value : formatRetailerLabel(value),
              value,
            }))}
          />
          <FormField
            type="select"
            label="Product"
            value={calendarProduct}
            onValueChange={(value) => setCalendarProduct(String(value))}
            options={[ALL, ...availableProducts].map((value) => ({
              label: value,
              value,
            }))}
          />
        </Box>

        {/* At-a-glance counts for the current year + filter selection. */}
        <Box className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-[#e3e6ed] bg-[#fafbfc] px-4 py-3">
          {[
            { label: "Campaigns", value: ganttRows.length },
            { label: "Active now", value: activeCount },
            { label: "Stores", value: storeCount },
            { label: "Brands", value: brandCount },
          ].map((stat) => (
            <Box key={stat.label} className="flex items-baseline gap-1.5">
              <Typography sx={{ color: "#141824", fontSize: 15, fontWeight: 800 }}>
                {stat.value}
              </Typography>
              <Typography sx={{ color: "#525b75", fontSize: 11.5 }}>
                {stat.label}
              </Typography>
            </Box>
          ))}
        </Box>

        <Box className="w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <Box sx={{ minWidth: 1000 }}>
            {/* Timeline Header (Months) */}
            <Box className="sticky top-0 z-10 grid grid-cols-[220px_1fr] border-b border-[#e3e6ed] bg-[#f5f7fa]">
              <Typography
                sx={{
                  color: "#525b75",
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  px: 2,
                  py: 1.5,
                }}
              >
                Campaign
              </Typography>
              <Box className="grid grid-cols-12 text-center">
                {months.map((month, idx) => (
                  <Typography
                    key={month}
                    className={idx > 0 ? "border-l border-[#e3e6ed]" : ""}
                    sx={{ color: "#141824", fontSize: 11.5, fontWeight: 800, py: 1.5 }}
                  >
                    {month}
                  </Typography>
                ))}
              </Box>
            </Box>

            {/* Campaign rows */}
            <Box className="divide-y divide-[#eff2f6]">
              {visibleRows.length === 0 ? (
                <Box className="py-14 text-center">
                  <Typography sx={{ color: "#525b75", fontSize: 13 }}>
                    No campaigns found for the selected year and filters.
                  </Typography>
                </Box>
              ) : (
                visibleRows.map((item) => {
                  const tint = categoryTints[item.category] || defaultTint;
                  const laneHeight = 56;

                  return (
                    <Box
                      key={item.id}
                      className="grid grid-cols-[220px_1fr] transition-colors hover:bg-[#f5f7fa]/70"
                    >
                      {/* Left Sidebar Label */}
                      <Box className="flex flex-col justify-center gap-1 border-r border-[#e3e6ed] px-4 py-2.5">
                        <Box className="flex items-center gap-1.5">
                          <Typography
                            sx={{
                              color: "#141824",
                              fontSize: 12.5,
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: 170,
                            }}
                          >
                            {item.name}
                          </Typography>
                        </Box>
                        <Box className="flex items-center gap-1">
                          <Typography
                            sx={{
                              color: "#525b75",
                              fontSize: 11,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: 130,
                            }}
                          >
                            {item.brand} · {formatRetailerLabel(item.retailer)}
                          </Typography>
                        </Box>
                        <Chip
                          label={item.category}
                          size="small"
                          sx={{
                            height: 18,
                            fontSize: 10,
                            width: "fit-content",
                            bgcolor: tint.bg,
                            color: tint.fg,
                            fontWeight: 700,
                            borderRadius: "4px",
                          }}
                        />
                      </Box>

                      {/* Right Timeline Grid Canvas */}
                      <Box className="relative" sx={{ height: laneHeight, py: 0.5 }}>
                        {/* Month Grid Lines */}
                        <Box className="absolute inset-0 grid grid-cols-12 pointer-events-none">
                          {months.map((m, idx) => (
                            <Box
                              key={m}
                              className={idx > 0 ? "border-l border-[#eff2f6]" : ""}
                            />
                          ))}
                        </Box>

                        <Tooltip
                          arrow
                          placement="top"
                          title={
                            <Box className="p-1">
                              <Typography sx={{ fontSize: 12, fontWeight: 800 }}>
                                {item.name}
                              </Typography>
                              <Typography sx={{ fontSize: 11 }}>
                                Discount: {item.competitorDiscount}%
                              </Typography>
                              <Typography sx={{ fontSize: 11 }}>
                                Duration: {item.fromDate} to {item.toDate}
                                {item.spansBeyondYear ? ` (continues beyond ${calendarYear})` : ""}
                              </Typography>
                            </Box>
                          }
                        >
                          <Box
                            className="absolute flex flex-col justify-center px-3 transition-all hover:brightness-95 hover:shadow-sm cursor-pointer"
                            sx={{
                              left: `${item.leftPercent}%`,
                              width: `${item.widthPercent}%`,
                              top: 4,
                              height: laneHeight - 8,
                              backgroundColor: tint.bg,
                              borderLeft: `3px solid ${tint.bar}`,
                              // Squared-off corners on whichever side the bar
                              // is clipped hint that the campaign actually
                              // continues outside the selected year.
                              borderTopLeftRadius: item.leftPercent > 0 ? 8 : 2,
                              borderBottomLeftRadius: item.leftPercent > 0 ? 8 : 2,
                              borderTopRightRadius:
                                item.leftPercent + item.widthPercent < 100 ? 8 : 2,
                              borderBottomRightRadius:
                                item.leftPercent + item.widthPercent < 100 ? 8 : 2,
                              opacity: item.expired ? 0.6 : 1,
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: 11.5,
                                fontWeight: 800,
                                color: tint.fg,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {item.name}
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: 10.5,
                                fontWeight: 600,
                                color: "#525b75",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              -{item.competitorDiscount}% • {item.durationMonths}m • {formatRetailerLabel(item.retailer)}
                            </Typography>
                          </Box>
                        </Tooltip>
                      </Box>
                    </Box>
                  );
                })
              )}
            </Box>
          </Box>
        </Box>
        <AppPagination
          count={pageCount}
          page={page}
          onChange={setPage}
          total={ganttRows.length}
          pageSize={pageSize}
          itemLabel="campaigns"
        />
      </Card>
    </Box>
  );
}
