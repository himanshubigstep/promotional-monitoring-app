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
import { matchesPromotionFilters, useAppContext } from "../../context/AppContext";

export default function StoreComparison() {
  const { filters, products } = useAppContext();
  const categoryProducts = products.filter((product) =>
    matchesPromotionFilters(product, filters),
  );
  const today = new Date().toISOString().slice(0, 10);

  const yourOffers = categoryProducts.filter((product) => product.isClient);
  const yourDiscount = yourOffers.length
    ? Math.round(
        yourOffers.reduce(
          (sum, product) => sum + product.competitorDiscount,
          0,
        ) / yourOffers.length,
      )
    : null;

  const competitorProducts = categoryProducts.filter(
    (product) => !product.isClient,
  );
  const retailers = Array.from(
    new Set(competitorProducts.map((product) => product.retailer)),
  ).map((retailer) => {
    const offers = competitorProducts.filter(
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
      yourDiscount,
      latest.fromDate,
      latest.toDate,
      trend,
    ] as const;
  });
  const averageMarket = Math.round(
    competitorProducts.reduce(
      (sum, product) => sum + product.competitorDiscount,
      0,
    ) / Math.max(competitorProducts.length, 1),
  );
  const activeCount = retailers.filter(
    (retailer) => retailer[3] <= today && retailer[4] >= today,
  ).length;
  const bestCurrentOffer = retailers.length
    ? Math.max(...retailers.map((retailer) => Number(retailer[1])))
    : null;

  return (
    <Box className="flex flex-col gap-5">
      <Box className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          [
            "Best Current Offer",
            bestCurrentOffer === null ? "No data" : `${bestCurrentOffer}%`,
          ],
          ["Average Market Discount", `${averageMarket}%`],
          ["Active Retailer Campaigns", String(activeCount)],
        ].map(([label, value]) => (
          <Card
            key={label}
            elevation={0}
            className="rounded-2xl border border-[#e3e6ed] bg-white transition-all hover:border-[#cbd0dd]"
          >
            <Box className="p-5">
              <Typography
                sx={{
                  color: "#525b75",
                  fontSize: 11.5,
                  fontWeight: 500,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                {label}
              </Typography>
              <Typography
                sx={{
                  color: "#141824",
                  fontSize: 24,
                  fontWeight: 500,
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
        className="rounded-2xl border border-[#e3e6ed] bg-white"
      >
        <Box className="border-b border-[#e3e6ed] px-5 py-4">
          <Box className="flex items-center gap-2">
            <FilterAltRounded sx={{ color: "#3874ff", fontSize: 18 }} />
            <Typography
              sx={{
                color: "#141824",
                fontSize: 16,
                fontWeight: 500,
                letterSpacing: "-0.01em",
              }}
            >
              Retailer Discount Comparison
            </Typography>
          </Box>
          <Typography sx={{ color: "#525b75", fontSize: 12.5, mt: 0.5 }}>
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
                ].map((header) => (
                  <TableCell
                    key={header}
                    sx={{
                      color: "#525b75",
                      fontSize: 11,
                      fontWeight: 500,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      backgroundColor: "#f5f7fa",
                    }}
                  >
                    {header}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {retailers.map((retailer) => {
                const yourRetailerDiscount = retailer[2];
                const gap =
                  yourRetailerDiscount === null
                    ? null
                    : yourRetailerDiscount - Number(retailer[1]);
                const status =
                  retailer[3] > today
                    ? "Upcoming"
                    : retailer[4] >= today
                      ? "Active"
                      : "Expired";
                return (
                  <TableRow key={retailer[0]} hover>
                    <TableCell
                      sx={{ color: "#141824", fontSize: 13, fontWeight: 500 }}
                    >
                      {retailer[0]}
                    </TableCell>
                    <TableCell
                      sx={{ color: "#3874ff", fontSize: 13.5, fontWeight: 500 }}
                    >
                      -{retailer[1]}%
                    </TableCell>
                    <TableCell
                      sx={{ color: "#141824", fontSize: 13.5, fontWeight: 500 }}
                    >
                      {yourRetailerDiscount === null
                        ? "No data"
                        : `-${yourRetailerDiscount}%`}
                    </TableCell>
                    <TableCell>
                      {gap === null ? (
                        <Typography sx={{ color: "#525b75", fontSize: 12.5 }}>
                          No data
                        </Typography>
                      ) : (
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
                            backgroundColor: gap >= 0 ? "#141824" : "#ffe2dc",
                            color: gap >= 0 ? "#ffffff" : "#fa3b1d",
                            fontWeight: 500,
                            borderRadius: "6px",
                          }}
                        />
                      )}
                    </TableCell>
                    <TableCell sx={{ color: "#525b75", fontSize: 12.5 }}>
                      {retailer[3]} - {retailer[4]}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={status}
                        size="small"
                        sx={{
                          backgroundColor:
                            status === "Active"
                              ? "#141824"
                              : status === "Upcoming"
                                ? "#eaf1ff"
                                : "#eff2f6",
                          color:
                            status === "Active"
                              ? "#ffffff"
                              : status === "Upcoming"
                                ? "#3874ff"
                                : "#525b75",
                          fontWeight: 500,
                          fontSize: 10,
                          borderRadius: "4px",
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                        }}
                      />
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
