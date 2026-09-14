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
  "L'Oréal": "#000000",
  Nivea: "#c59a3f",
  Dove: "#e50043",
  Garnier: "#333333",
  "Sephora Collection": "#000000",
};

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
      {/* Header */}
      <Box className="flex flex-wrap items-center justify-between gap-3">
        <Box>
          <Box className="flex items-center gap-2">
            <CalendarMonthRounded sx={{ color: "#4f82f7" }} />
            <Typography
              sx={{
                color: "#20242b",
                fontSize: 16,
                fontWeight: 500,
                letterSpacing: "-0.01em",
              }}
            >
              Promotional Campaign Timeline
            </Typography>
          </Box>
          <Typography sx={{ color: "#737b88", fontSize: 13, mt: 0.5 }}>
            Gantt chart view of store campaigns, durations, and offer intensity.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={<DownloadRounded />}
          onClick={downloadUpdatedProducts}
          sx={{
            borderColor: "#dce1e8",
            color: "#20242b",
            fontWeight: 700,
            fontSize: 12.5,
            textTransform: "none",
            "&:hover": { borderColor: "#4f82f7", backgroundColor: "#f5f8ff" },
          }}
        >
          Export Timeline
        </Button>
      </Box>

      {/* Main Gantt Chart Card */}
      <Card
        elevation={0}
        className="rounded-2xl border border-[#e7eaee] bg-white"
      >
        <Box className="w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <Box className="p-4" sx={{ minWidth: 1000 }}>
            {/* Timeline Header (Months) */}
            <Box className="grid grid-cols-[220px_1fr] border-b border-[#e7eaee] pb-3">
              <Typography
                sx={{
                  color: "#737b88",
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                CAMPAIGN / STORE
              </Typography>
              <Box className="grid grid-cols-12 text-center">
                {months.map((month) => (
                  <Typography
                    key={month}
                    sx={{ color: "#20242b", fontSize: 12, fontWeight: 800 }}
                  >
                    {month}
                  </Typography>
                ))}
              </Box>
            </Box>

            {/* Gantt Rows */}
            <Box className="divide-y divide-[#e7eaee]">
              {ganttRows.length === 0 ? (
                <Box className="py-8 text-center">
                  <Typography sx={{ color: "#737b88", fontSize: 13 }}>
                    No campaigns found for the selected year and filters.
                  </Typography>
                </Box>
              ) : (
                ganttRows.map((item) => {
                  const barColor = brandColors[item.brand] || "#000000";
                  return (
                    <Box
                      key={item.id}
                      className="grid grid-cols-[220px_1fr] items-center py-2.5"
                    >
                      {/* Left Sidebar Label */}
                      <Box className="pr-3">
                        <Typography
                          sx={{
                            color: "#20242b",
                            fontSize: 13,
                            fontWeight: 700,
                            lineHeight: 1.2,
                          }}
                        >
                          {item.name}
                        </Typography>
                        <Box className="mt-1 flex items-center gap-1.5">
                          <Chip
                            label={item.retailer}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: 10,
                              bgcolor: "#eef1f4",
                              color: "#20242b",
                              fontWeight: 700,
                              borderRadius: "4px",
                            }}
                          />
                          <Typography sx={{ color: "#737b88", fontSize: 11 }}>
                            {item.brand}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Right Timeline Grid Canvas */}
                      <Box className="relative flex h-9 items-center rounded-lg bg-[#f4f6f8] px-1">
                        {/* Month Grid Lines */}
                        <Box className="absolute inset-0 grid grid-cols-12 pointer-events-none">
                          {months.map((m, idx) => (
                            <Box
                              key={m}
                              className={`h-full ${idx < 11 ? "border-r border-[#e7eaee]" : ""}`}
                            />
                          ))}
                        </Box>

                        {/* Gantt Bar */}
                        <Tooltip
                          arrow
                          placement="top"
                          title={
                            <Box className="p-1">
                              <Typography
                                sx={{ fontSize: 12, fontWeight: 800 }}
                              >
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
                            className="absolute flex h-7 items-center justify-between rounded px-2.5 transition-all hover:brightness-110 shadow-sm cursor-pointer"
                            sx={{
                              left: `${item.leftPercent}%`,
                              width: `${item.widthPercent}%`,
                              backgroundColor: barColor,
                              color: "#fff",
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: 11,
                                fontWeight: 800,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              -{item.competitorDiscount}%
                            </Typography>
                            <Typography
                              sx={{
                                fontSize: 10,
                                opacity: 0.9,
                                fontWeight: 700,
                                display: { xs: "none", sm: "block" },
                              }}
                            >
                              {item.durationMonths}m
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

      </Card>
    </Box>
  );
}
