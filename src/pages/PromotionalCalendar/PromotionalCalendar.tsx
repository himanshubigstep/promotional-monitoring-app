import { CalendarMonthRounded, DownloadRounded } from "@mui/icons-material";
import { Box, Button, Card, Chip, Tooltip, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import { catalog } from "../../data/catalog";
import type { Product } from "../../data/productTypes";
import { useAppContext } from "../../context/AppContext";
import YearFilter from "../../components/YearFilter";

const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", 
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const brandColors: Record<string, string> = {
  "L'Oréal": "#286e5e",
  Nivea: "#d88e3f",
  Dove: "#816bb3",
  Garnier: "#c46f76",
};

export default function PromotionalCalendar() {
  const { filters } = useAppContext();
  const [chartYear, setChartYear] = useState("");

  const filteredCatalog = useMemo(
    () =>
      catalog.filter((product) => {
        const minimumDiscount =
          filters.discount === "All"
            ? 0
            : Number(filters.discount.replace("%+", ""));
        return (
          (filters.market === "All" || product.market === filters.market) &&
          (!filters.search ||
            product.name.toLowerCase().includes(filters.search.toLowerCase()) ||
            product.brand.toLowerCase().includes(filters.search.toLowerCase())) &&
          (filters.category === "All" || product.category === filters.category) &&
          (filters.retailer === "All" || product.retailer === filters.retailer) &&
          product.competitorDiscount >= minimumDiscount &&
          (!chartYear || chartYear === "All" || product.fromDate.startsWith(chartYear))
        );
      }),
    [filters, chartYear],
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
      const widthPercent = Math.max(((endMonth - startMonth + 1) / 12) * 100, 8);

      return {
        ...product,
        leftPercent,
        widthPercent,
        durationMonths: endMonth - startMonth + 1,
      };
    });
  }, [filteredCatalog]);

  const downloadUpdatedProducts = () => {
    if (!catalog || !Array.isArray(catalog) || catalog.length === 0) return;
    const headers = Object.keys(catalog[0]) as Array<keyof Product>;
    const table = `
      <table border="1">
        <thead>
          <tr>${headers.map((h) => `<th>${String(h)}</th>`).join("")}</tr>
        </thead>
        <tbody>
          ${catalog
            .map(
              (p) =>
                `<tr>${headers.map((h) => `<td>${String(p[h] ?? "")}</td>`).join("")}</tr>`
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
            <CalendarMonthRounded sx={{ color: "#286e5e" }} />
            <Typography sx={{ color: "#173c35", fontSize: 22, fontWeight: 800 }}>
              Promotional Campaign Timeline
            </Typography>
          </Box>
          <Typography sx={{ color: "#82908b", fontSize: 13, mt: 0.5 }}>
            Gantt chart view of store campaigns, durations, and offer intensity.
          </Typography>
        </Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={<DownloadRounded />}
          onClick={downloadUpdatedProducts}
          sx={{ borderColor: "#dce6e2", color: "#286e5e", textTransform: "none" }}
        >
          Export Timeline
        </Button>
      </Box>

      {/* Main Gantt Chart Card */}
      <Card elevation={0} className="rounded-2xl border border-[#edf1ef] bg-white">
        <Box className="w-full overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <Box className="p-4" sx={{ minWidth: 1000 }}>
            {/* Timeline Header (Months) */}
            <Box className="grid grid-cols-[220px_1fr] border-b border-[#edf1ef] pb-3">
              <Typography sx={{ color: "#82908b", fontSize: 12, fontWeight: 800 }}>
                CAMPAIGN / STORE
              </Typography>
              <Box className="grid grid-cols-12 text-center">
                {months.map((month) => (
                  <Typography key={month} sx={{ color: "#173c35", fontSize: 12, fontWeight: 800 }}>
                    {month}
                  </Typography>
                ))}
              </Box>
            </Box>

            {/* Gantt Rows */}
            <Box className="divide-y divide-[#f4f7f6]">
              {ganttRows.length === 0 ? (
                <Box className="py-8 text-center">
                  <Typography sx={{ color: "#82908b", fontSize: 14 }}>
                    No campaigns found for the selected year and filters.
                  </Typography>
                </Box>
              ) : (
                ganttRows.map((item) => {
                  const barColor = brandColors[item.brand] || "#286e5e";
                  return (
                    <Box key={item.id} className="grid grid-cols-[220px_1fr] items-center py-2.5">
                      {/* Left Sidebar Label */}
                      <Box className="pr-3">
                        <Typography sx={{ color: "#173c35", fontSize: 13, fontWeight: 700, lineHeight: 1.2 }}>
                          {item.name}
                        </Typography>
                        <Box className="mt-1 flex items-center gap-1.5">
                          <Chip
                            label={item.retailer}
                            size="small"
                            sx={{ height: 18, fontSize: 10, bg: "#f0f4f2", color: "#48665d", fontWeight: 700 }}
                          />
                          <Typography sx={{ color: "#82908b", fontSize: 11 }}>
                            {item.brand}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Right Timeline Grid Canvas */}
                      <Box className="relative flex h-9 items-center rounded-lg bg-[#f9fbfa] px-1">
                        {/* Month Grid Lines */}
                        <Box className="absolute inset-0 grid grid-cols-12 pointer-events-none">
                          {months.map((m, idx) => (
                            <Box key={m} className={`h-full ${idx < 11 ? "border-r border-[#edf1ef]" : ""}`} />
                          ))}
                        </Box>

                        {/* Gantt Bar */}
                        <Tooltip
                          arrow
                          placement="top"
                          title={
                            <Box className="p-1">
                              <Typography sx={{ fontSize: 12, fontWeight: 800 }}>{item.name}</Typography>
                              <Typography sx={{ fontSize: 11 }}>Discount: {item.competitorDiscount}%</Typography>
                              <Typography sx={{ fontSize: 11 }}>
                                Duration: {item.fromDate} to {item.toDate}
                              </Typography>
                            </Box>
                          }
                        >
                          <Box
                            className="absolute flex h-7 items-center justify-between rounded-md px-2.5 transition-all hover:brightness-110 shadow-sm"
                            sx={{
                              left: `${item.leftPercent}%`,
                              width: `${item.widthPercent}%`,
                              backgroundColor: barColor,
                              color: "#fff",
                            }}
                          >
                            <Typography sx={{ fontSize: 11, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              -{item.competitorDiscount}%
                            </Typography>
                            <Typography sx={{ fontSize: 10, opacity: 0.85, fontWeight: 700, display: { xs: "none", sm: "block" } }}>
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

        {/* Footer Filter */}
        <Box className="border-t border-[#edf1ef] px-4 py-2">
          <YearFilter selectedYear={chartYear} onChange={setChartYear} />
        </Box>
      </Card>
    </Box>
  );
}