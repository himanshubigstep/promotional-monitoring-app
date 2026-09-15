import { CalendarMonthRounded, DownloadRounded } from "@mui/icons-material";
import { Box, Button, Card, Chip, Tooltip, Typography } from "@mui/material";
import { useMemo } from "react";
import type { Product } from "../../data/productTypes";
import { matchesPromotionFilters, useAppContext } from "../../context/AppContext";

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

const brandColors: Record<string, string> = {
  "L'Oréal": "#31374a",
  Nivea: "#e5780b",
  Dove: "#fa3b1d",
  Garnier: "#0097eb",
  "Sephora Collection": "#3874ff",
};

const brandTints: Record<string, { bg: string; fg: string }> = {
  "L'Oréal": { bg: "#eceef1", fg: "#31374a" },
  Nivea: { bg: "#fdf1e3", fg: "#e5780b" },
  Dove: { bg: "#ffe2dc", fg: "#c92e13" },
  Garnier: { bg: "#e3f4fd", fg: "#0097eb" },
  "Sephora Collection": { bg: "#eaf1ff", fg: "#3874ff" },
};

const defaultTint = { bg: "#eff2f6", fg: "#525b75" };
const defaultBarColor = "#9fa6bc";

export default function PromotionalCalendar() {
  const { filters, products } = useAppContext();
  const filteredCatalog = useMemo(
    () =>
      products.filter((product) => matchesPromotionFilters(product, filters)),
    [filters, products],
  );

  // Group campaigns for the Gantt view
  const ganttRows = useMemo(() => {
    return filteredCatalog.map((product) => {
      const start = new Date(product.fromDate);
      const end = new Date(product.toDate);
      const startMonth = start.getMonth(); // 0 - 11
      const endMonth = end.getMonth(); // 0 - 11

      // Calculate offset percentages for exact timeline placement
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
      };
    });
  }, [filteredCatalog]);

  // Group campaigns by brand so brands form the left-hand axis of the calendar
  const brandRows = useMemo(() => {
    const groups = new Map<string, typeof ganttRows>();
    ganttRows.forEach((item) => {
      const list = groups.get(item.brand) ?? [];
      list.push(item);
      groups.set(item.brand, list);
    });
    return Array.from(groups.entries())
      .map(([brand, campaigns]) => ({ brand, campaigns }))
      .sort((a, b) => a.brand.localeCompare(b.brand));
  }, [ganttRows]);

  const downloadUpdatedProducts = () => {
    if (!products.length) return;
    const headers = Object.keys(products[0]) as Array<keyof Product>;
    const table = `
      <table border="1">
        <thead>
          <tr>${headers.map((h) => `<th>${String(h)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${filteredCatalog
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
      {/* Main Calendar Card */}
      <Card
        elevation={0}
        className="rounded-2xl border border-[#e3e6ed] bg-white overflow-hidden"
      >
        {/* Toolbar */}
        <Box className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e3e6ed] p-4">
          <Box className="flex items-center gap-3">
            <Box
              className="flex flex-col items-center justify-center rounded-lg border border-[#e3e6ed]"
              sx={{ width: 44, height: 44, backgroundColor: "#f5f7fa" }}
            >
              <CalendarMonthRounded sx={{ color: "#3874ff", fontSize: 20 }} />
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
                Brands across the year, with campaign duration and offer intensity.
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            size="small"
            startIcon={<DownloadRounded sx={{ fontSize: 16 }} />}
            onClick={downloadUpdatedProducts}
            sx={{
              backgroundColor: "#3874ff",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: 12.5,
              textTransform: "none",
              borderRadius: "8px",
              "&:hover": { backgroundColor: "#2c5fd6" },
            }}
          >
            Export Timeline
          </Button>
        </Box>

        <Box className="w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <Box sx={{ minWidth: 1000 }}>
            {/* Timeline Header (Months) */}
            <Box className="grid grid-cols-[200px_1fr] border-b border-[#e3e6ed] bg-[#f5f7fa]">
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
                Brand
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

            {/* Brand rows */}
            <Box className="divide-y divide-[#e3e6ed]">
              {brandRows.length === 0 ? (
                <Box className="py-10 text-center">
                  <Typography sx={{ color: "#525b75", fontSize: 13 }}>
                    No campaigns found for the selected year and filters.
                  </Typography>
                </Box>
              ) : (
                brandRows.map(({ brand, campaigns }) => {
                  const tint = brandTints[brand] || defaultTint;
                  const barColor = brandColors[brand] || defaultBarColor;
                  const laneHeight = 52;

                  return (
                    <Box
                      key={brand}
                      className="grid grid-cols-[200px_1fr] hover:bg-[#f5f7fa]/60 transition-colors"
                    >
                      {/* Left Sidebar Label */}
                      <Box className="flex flex-col justify-center gap-1 px-4 py-3 border-r border-[#e3e6ed]">
                        <Typography
                          sx={{ color: "#141824", fontSize: 13, fontWeight: 700 }}
                        >
                          {brand}
                        </Typography>
                        <Chip
                          label={`${campaigns.length} campaign${campaigns.length === 1 ? "" : "s"}`}
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
                      <Box
                        className="relative"
                        sx={{ height: campaigns.length * laneHeight, py: 0.5 }}
                      >
                        {/* Month Grid Lines */}
                        <Box className="absolute inset-0 grid grid-cols-12 pointer-events-none">
                          {months.map((m, idx) => (
                            <Box
                              key={m}
                              className={idx > 0 ? "border-l border-[#eff2f6]" : ""}
                            />
                          ))}
                        </Box>

                        {campaigns.map((item, laneIndex) => (
                          <Tooltip
                            key={item.id}
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
                              className="absolute flex flex-col justify-center rounded-lg px-3 transition-all hover:brightness-95 cursor-pointer"
                              sx={{
                                left: `${item.leftPercent}%`,
                                width: `${item.widthPercent}%`,
                                top: laneIndex * laneHeight + 4,
                                height: laneHeight - 8,
                                backgroundColor: tint.bg,
                                borderLeft: `3px solid ${barColor}`,
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
                        ))}
                      </Box>
                    </Box>
                  );
                })
              )}
            </Box>
          </Box>
        </Box>
      </Card>
    </Box>
  );
}
