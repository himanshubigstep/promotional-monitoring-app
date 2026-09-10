import {
  ArrowDownwardRounded,
  ArrowUpwardRounded,
  FilterAltRounded,
} from "@mui/icons-material";
import {
  Box,
  Card,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { catalog } from "../../data/catalog";
import { useAppContext } from "../../context/AppContext";

export default function StoreComparison() {
  const { filters } = useAppContext();
  const categoryProducts = catalog.filter(
    (product) =>
      (filters.market === "All" || product.market === filters.market) &&
      (!filters.search ||
        product.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        product.brand.toLowerCase().includes(filters.search.toLowerCase())) &&
      (filters.category === "All" || product.category === filters.category) &&
      (filters.retailer === "All" || product.retailer === filters.retailer) &&
      (!filters.fromDate || product.toDate >= filters.fromDate) &&
      (!filters.toDate || product.fromDate <= filters.toDate),
  );
  const retailers = Array.from(
    new Set(categoryProducts.map((product) => product.retailer)),
  ).map((retailer) => {
    const offers = categoryProducts.filter(
      (product) => product.retailer === retailer,
    );
    const discount = Math.round(
      offers.reduce((sum, product) => sum + product.competitorDiscount, 0) /
        offers.length,
    );
    const latest = offers.reduce(
      (current, product) =>
        product.toDate > current.toDate ? product : current,
      offers[0],
    );
    const trend = offers
      .slice()
      .sort((left, right) => left.fromDate.localeCompare(right.fromDate))
      .map((product) => product.competitorDiscount);
    return [
      retailer,
      discount,
      Math.max(0, discount - 2),
      latest.fromDate,
      latest.toDate,
      trend,
    ] as const;
  });
  const averageMarket = Math.round(
    categoryProducts.reduce(
      (sum, product) => sum + product.competitorDiscount,
      0,
    ) / Math.max(categoryProducts.length, 1),
  );
  const activeCount = retailers.filter(
    (retailer) => retailer[4] >= "2026-09-08",
  ).length;

  return (
    <Box className="flex flex-col gap-5">
      <Box className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          [
            "Best Current Offer",
            `${Math.max(...retailers.map((retailer) => Number(retailer[1])))}%`,
          ],
          ["Average Market Discount", `${averageMarket}%`],
          ["Active Retailer Campaigns", String(activeCount)],
        ].map(([label, value]) => (
          <Card
            key={label}
            elevation={0}
            className="rounded-xl border border-[#e5e5e5] bg-white transition-all hover:border-[#111111]"
          >
            <Box className="p-5">
              <Typography
                sx={{
                  color: "#757575",
                  fontSize: 11.5,
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                {label}
              </Typography>
              <Typography
                sx={{
                  color: "#000000",
                  fontSize: 24,
                  fontWeight: 800,
                  mt: 1,
                  letterSpacing: "-0.01em",
                }}
              >
                {value}
              </Typography>
            </Box>
          </Card>
        ))}
      </Box>
      <Card
        elevation={0}
        className="rounded-xl border border-[#e5e5e5] bg-white"
      >
        <Box className="border-b border-[#e5e5e5] px-5 py-4">
          <Box className="flex items-center gap-2">
            <FilterAltRounded sx={{ color: "#e50043", fontSize: 18 }} />
            <Typography
              sx={{
                color: "#000000",
                fontSize: 16,
                fontWeight: 800,
                letterSpacing: "-0.01em",
              }}
            >
              Retailer Discount Comparison
            </Typography>
          </Box>
          <Typography sx={{ color: "#757575", fontSize: 12.5, mt: 0.5 }}>
            Sephora discount versus competitor stores, with campaign dates and
            status.
          </Typography>
        </Box>
        <Box className="overflow-x-auto">
          <Table sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow>
                {[
                  "Retailer",
                  "Their discount",
                  "Your discount",
                  "Gap",
                  "Campaign dates",
                  "Status",
                  "Trend",
                ].map((header) => (
                  <TableCell
                    key={header}
                    sx={{
                      color: "#757575",
                      fontSize: 11,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      backgroundColor: "#fafafa",
                    }}
                  >
                    {header}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {retailers.map((retailer) => {
                const gap = Number(retailer[2]) - Number(retailer[1]);
                const trendValues = retailer[5];
                const trendMin = Math.min(...trendValues, 0);
                const trendMax = Math.max(...trendValues, 1);
                const active = retailer[4] >= "2026-09-08";
                return (
                  <TableRow key={retailer[0]} hover>
                    <TableCell
                      sx={{ color: "#000000", fontSize: 13, fontWeight: 700 }}
                    >
                      {retailer[0]}
                    </TableCell>
                    <TableCell
                      sx={{ color: "#e50043", fontSize: 13.5, fontWeight: 800 }}
                    >
                      -{retailer[1]}%
                    </TableCell>
                    <TableCell
                      sx={{ color: "#000000", fontSize: 13.5, fontWeight: 800 }}
                    >
                      -{retailer[2]}%
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={`${gap >= 0 ? "+" : ""}${gap}%`}
                        icon={
                          gap >= 0 ? (
                            <ArrowUpwardRounded sx={{ fontSize: 14 }} />
                          ) : (
                            <ArrowDownwardRounded sx={{ fontSize: 14 }} />
                          )
                        }
                        size="small"
                        sx={{
                          backgroundColor: gap >= 0 ? "#000000" : "#fff0f3",
                          color: gap >= 0 ? "#ffffff" : "#e50043",
                          fontWeight: 800,
                          borderRadius: "4px",
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: "#666666", fontSize: 12.5 }}>
                      {retailer[3]} - {retailer[4]}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={active ? "Active" : "Expired"}
                        size="small"
                        sx={{
                          backgroundColor: active ? "#000000" : "#eeeeee",
                          color: active ? "#ffffff" : "#757575",
                          fontWeight: 800,
                          fontSize: 10,
                          borderRadius: "4px",
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Box
                        className="flex h-8 items-end gap-1"
                        title="Historical discount trend"
                      >
                        {trendValues.map((value, index) => (
                          <Box
                            key={index}
                            className="w-1.5 rounded-t bg-[#111111]"
                            sx={{
                              height: `${Math.max(18, ((value - trendMin) / Math.max(trendMax - trendMin, 1)) * 82)}%`,
                            }}
                          />
                        ))}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
      </Card>
    </Box>
  );
}
