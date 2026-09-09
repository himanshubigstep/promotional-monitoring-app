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
import products from "../../data/products.json";
import type { Product } from "../../data/productTypes";
import { useAppContext } from "../../context/AppContext";

export default function StoreComparison() {
  const { filters } = useAppContext();
  const catalog: Product[] = products as Product[];
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
            "Best current offer",
            `${Math.max(...retailers.map((retailer) => Number(retailer[1])))}%`,
          ],
          ["Average market discount", `${averageMarket}%`],
          ["Active retailer campaigns", String(activeCount)],
        ].map(([label, value]) => (
          <Card
            key={label}
            elevation={0}
            className="rounded-2xl border border-[#edf1ef] bg-white"
          >
            <Box className="p-5">
              <Typography
                sx={{
                  color: "#8a9894",
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                {label}
              </Typography>
              <Typography
                sx={{ color: "#173c35", fontSize: 22, fontWeight: 800, mt: 1 }}
              >
                {value}
              </Typography>
            </Box>
          </Card>
        ))}
      </Box>
      <Card
        elevation={0}
        className="rounded-2xl border border-[#edf1ef] bg-white"
      >
        <Box className="border-b border-[#edf1ef] px-5 py-4">
          <Box className="flex items-center gap-2">
            <FilterAltRounded sx={{ color: "#286e5e", fontSize: 18 }} />
            <Typography
              sx={{ color: "#173c35", fontSize: 17, fontWeight: 800 }}
            >
              Retailer discount comparison
            </Typography>
          </Box>
          <Typography sx={{ color: "#8a9894", fontSize: 13, mt: 0.5 }}>
            Your discount versus competitor stores, with campaign dates and
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
                      color: "#8a9894",
                      fontSize: 11,
                      fontWeight: 800,
                      textTransform: "uppercase",
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
                      sx={{ color: "#274a41", fontSize: 13, fontWeight: 800 }}
                    >
                      {retailer[0]}
                    </TableCell>
                    <TableCell
                      sx={{ color: "#b25b52", fontSize: 14, fontWeight: 800 }}
                    >
                      -{retailer[1]}%
                    </TableCell>
                    <TableCell
                      sx={{ color: "#28715f", fontSize: 14, fontWeight: 800 }}
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
                          backgroundColor: gap >= 0 ? "#e1f2ed" : "#fce7e3",
                          color: gap >= 0 ? "#28715f" : "#b25b52",
                          fontWeight: 800,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ color: "#687b74", fontSize: 13 }}>
                      {retailer[3]} - {retailer[4]}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={active ? "Active" : "Expired"}
                        size="small"
                        sx={{
                          backgroundColor: active ? "#e1f2ed" : "#f0f2f1",
                          color: active ? "#28715f" : "#687b74",
                          fontWeight: 800,
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
                            className="w-1.5 rounded-t bg-[#80bbaa]"
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
