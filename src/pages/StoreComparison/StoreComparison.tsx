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
  // Real client-vs-competitor split (retailers.is_client via Product.isClient),
  // replacing the previous placeholder that fabricated "your discount" as
  // `discount - 2` off the competitor's own number.
  const clientProducts = categoryProducts.filter((product) => product.isClient);
  const competitorProducts = categoryProducts.filter(
    (product) => !product.isClient,
  );
  const yourDiscount = clientProducts.length
    ? Math.round(
        clientProducts.reduce(
          (sum, product) => sum + product.competitorDiscount,
          0,
        ) / clientProducts.length,
      )
    : null;
  // Only competitor retailers become rows — comparing our own store against
  // itself isn't a meaningful comparison, so it's excluded rather than shown
  // as a nonsensical "Sephora vs Sephora" row.
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
    (retailer) => retailer[4] >= "2026-09-08",
  ).length;
  const bestCurrentOffer = retailers.length
    ? Math.max(...retailers.map((retailer) => Number(retailer[1])))
    : null;

  return (
    <Box className="flex flex-col gap-5">
      <Box className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {[
          [
            "Best Current Offer",
            bestCurrentOffer === null ? "No data" : `${bestCurrentOffer}%`,
          ],
          ["Average Market Discount", `${averageMarket}%`],
          [
            "Your Average Discount",
            yourDiscount === null ? "No data" : `${yourDiscount}%`,
          ],
          ["Active Retailer Campaigns", String(activeCount)],
        ].map(([label, value]) => (
          <Card
            key={label}
            elevation={0}
            className="rounded-2xl border border-[#e7eaee] bg-white transition-all hover:border-[#c8d0da]"
          >
            <Box className="p-5">
              <Typography
                sx={{
                  color: "#737b88",
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
                  color: "#20242b",
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
        className="rounded-2xl border border-[#e7eaee] bg-white"
      >
        <Box className="border-b border-[#e7eaee] px-5 py-4">
          <Box className="flex items-center gap-2">
            <FilterAltRounded sx={{ color: "#4f82f7", fontSize: 18 }} />
            <Typography
              sx={{
                color: "#20242b",
                fontSize: 16,
                fontWeight: 500,
                letterSpacing: "-0.01em",
              }}
            >
              Retailer Discount Comparison
            </Typography>
          </Box>
          <Typography sx={{ color: "#737b88", fontSize: 12.5, mt: 0.5 }}>
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
                      color: "#737b88",
                      fontSize: 11,
                      fontWeight: 500,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      backgroundColor: "#f4f6f8",
                    }}
                  >
                    {header}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {retailers.map((retailer) => {
                // retailer[2] (your real discount) can be null when no
                // client (is_client) promotions match the current filters —
                // don't fabricate a gap in that case, just say so.
                const hasYourDiscount = retailer[2] !== null;
                const gap = hasYourDiscount
                  ? Number(retailer[2]) - Number(retailer[1])
                  : null;
                const active = retailer[4] >= "2026-09-08";
                return (
                  <TableRow key={retailer[0]} hover>
                    <TableCell
                      sx={{ color: "#20242b", fontSize: 13, fontWeight: 500 }}
                    >
                      {retailer[0]}
                    </TableCell>
                    <TableCell
                      sx={{ color: "#4f82f7", fontSize: 13.5, fontWeight: 500 }}
                    >
                      -{retailer[1]}%
                    </TableCell>
                    <TableCell
                      sx={{ color: "#20242b", fontSize: 13.5, fontWeight: 500 }}
                    >
                      {hasYourDiscount ? `-${retailer[2]}%` : "No data"}
                    </TableCell>
                    <TableCell>
                      {gap === null ? (
                        <Typography sx={{ color: "#737b88", fontSize: 12.5 }}>
                          —
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
                            backgroundColor: gap >= 0 ? "#22252b" : "#fdecec",
                            color: gap >= 0 ? "#ffffff" : "#e5484d",
                            fontWeight: 500,
                            borderRadius: "6px",
                          }}
                        />
                      )}
                    </TableCell>
                    <TableCell sx={{ color: "#737b88", fontSize: 12.5 }}>
                      {retailer[3]} - {retailer[4]}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={active ? "Active" : "Expired"}
                        size="small"
                        sx={{
                          backgroundColor: active ? "#22252b" : "#eef1f4",
                          color: active ? "#ffffff" : "#737b88",
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
