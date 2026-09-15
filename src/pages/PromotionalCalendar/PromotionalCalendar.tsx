import { CalendarMonthRounded, DownloadRounded } from "@mui/icons-material";
import { Box, Button, Card, Chip, Tooltip, Typography } from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import type { Product, ProductCategory } from "../../data/productTypes";
import { isBenchmarkProduct } from "../../data/marketProducts";
import { matchesPromotionFilters, useAppContext } from "../../context/AppContext";
import AppPagination from "../../components/AppPagination";

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

export default function PromotionalCalendar() {
  const { filters, products } = useAppContext();
  const [page, setPage] = useState(1);

  const filteredCatalog = useMemo(
    () =>
      products.filter((product) => matchesPromotionFilters(product, filters)),
    [filters, products],
  );

  // Benchmark/dummy products (seeded once, then expanded to every retailer —
  // see marketProducts.ts) are guaranteed to have data across all stores, so
  // surface them first, same ordering rule as the Promotions page. Active
  // campaigns rank ahead of expired ones within each group.
  const sortedCampaigns = useMemo(() => {
    return [...filteredCatalog].sort((a, b) => {
      const aBench = isBenchmarkProduct(a);
      const bBench = isBenchmarkProduct(b);
      if (aBench !== bBench) return aBench ? -1 : 1;
      const aActive = a.toDate >= today;
      const bActive = b.toDate >= today;
      if (aActive !== bActive) return aActive ? -1 : 1;
      return b.toDate.localeCompare(a.toDate);
    });
  }, [filteredCatalog]);

  // One row per campaign now that brand-wise grouping is gone.
  const ganttRows = useMemo(() => {
    return sortedCampaigns.map((product) => {
      const start = new Date(product.fromDate);
      const end = new Date(product.toDate);
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
      };
    });
  }, [sortedCampaigns]);

  const pageCount = Math.max(1, Math.ceil(ganttRows.length / pageSize));
  const visibleRows = ganttRows.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => {
    setPage(1);
  }, [filters]);

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
                {ganttRows.length} campaign{ganttRows.length === 1 ? "" : "s"} across the
                year, benchmark offers surfaced first.
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
                          {item.benchmark && (
                            <Chip
                              label="Benchmark"
                              size="small"
                              sx={{
                                height: 15,
                                fontSize: 8.5,
                                fontWeight: 800,
                                bgcolor: "#141824",
                                color: "#ffffff",
                                borderRadius: "4px",
                                "& .MuiChip-label": { px: 0.6 },
                              }}
                            />
                          )}
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
                            {item.brand} · {item.retailer}
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
                              </Typography>
                            </Box>
                          }
                        >
                          <Box
                            className="absolute flex flex-col justify-center rounded-lg px-3 transition-all hover:brightness-95 hover:shadow-sm cursor-pointer"
                            sx={{
                              left: `${item.leftPercent}%`,
                              width: `${item.widthPercent}%`,
                              top: 4,
                              height: laneHeight - 8,
                              backgroundColor: tint.bg,
                              borderLeft: `3px solid ${tint.bar}`,
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
                              -{item.competitorDiscount}% • {item.durationMonths}m • {item.retailer}
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
