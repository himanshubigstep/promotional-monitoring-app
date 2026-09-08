import {
  Box,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import products from "../../data/products.json";
import { useAppContext } from "../../context/AppContext";
import YearFilter from "../../components/YearFilter";

const weeks = ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"];
export default function BrandAnalytics() {
  const { filters } = useAppContext();
  const [brandYear, setBrandYear] = useState("");
  const [heatmapYear, setHeatmapYear] = useState("");
  const baseProducts = products.filter((product) => (filters.market === "All" || product.market === filters.market) &&
    (filters.category === "All" || product.category === filters.category) &&
    (filters.retailer === "All" || product.retailer === filters.retailer));
  const filteredProducts = baseProducts.filter((product) => !brandYear || product.fromDate.startsWith(brandYear));
  const heatmapProducts = baseProducts.filter((product) => !heatmapYear || product.fromDate.startsWith(heatmapYear));
  const brands = Array.from(new Set(filteredProducts.map((product) => product.brand))).map((brand, index) => {
    const offers = filteredProducts.filter((product) => product.brand === brand);
    const discount = Math.round(offers.reduce((sum, product) => sum + product.competitorDiscount, 0) / offers.length);
    return [brand, `${offers.length} offers`, discount, ["#286e5e", "#e09b48", "#8670bb", "#d27679"][index % 4]] as const;
  });
  const categoryTotals = ["Skincare", "Fragrance", "Makeup", "Haircare"]
    .map((category) => ({
      category,
      count: filteredProducts.filter((product) => product.category === category).length,
      discount: Math.round(
        filteredProducts
          .filter((product) => product.category === category)
          .reduce((sum, product) => sum + product.competitorDiscount, 0) /
          Math.max(filteredProducts.filter((product) => product.category === category).length, 1),
      ),
    }))
    .sort((left, right) => right.discount - left.discount);
  const averageDiscount = filteredProducts.length
    ? Math.round(filteredProducts.reduce((sum, product) => sum + product.competitorDiscount, 0) / filteredProducts.length)
    : 0;
  const strongestCategory = categoryTotals[0]?.category || "No category data";
  const latestYear = filteredProducts.reduce((latest, product) => product.toDate > latest ? product.toDate : latest, "").slice(0, 4);

  return (
    <Box className="flex flex-col gap-5">
      <Box className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_1fr]">
        <Card
          elevation={0}
          className="rounded-2xl border border-[#edf1ef] bg-white"
        >
          <CardContent className="!p-6">
            <Typography
              sx={{ color: "#173c35", fontSize: 17, fontWeight: 800 }}
            >
              Average market discount vs. brand
            </Typography>
            <Typography sx={{ color: "#8a9894", fontSize: 13, mb: 5, mt: 0.5 }}>
              Benchmark the competitive pressure before setting your offer.
            </Typography>
            {brands.map(([name, revenue, score, color]) => (
              <Box key={name} className="mb-6">
                <Box className="mb-2 flex justify-between">
                  <Typography
                    sx={{ color: "#34534a", fontSize: 14, fontWeight: 700 }}
                  >
                    {name}
                  </Typography>
                  <Box className="flex gap-3">
                    <Typography sx={{ color: "#8a9894", fontSize: 12 }}>
                      Market {averageDiscount}%
                    </Typography>
                    <Typography
                      sx={{ color: "#5f746c", fontSize: 13, fontWeight: 700 }}
                    >
                      Brand {score}%
                    </Typography>
                  </Box>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Number(score)}
                  sx={{
                    height: 9,
                    borderRadius: 5,
                    backgroundColor: "#edf2ef",
                    "& .MuiLinearProgress-bar": {
                      backgroundColor: color,
                      borderRadius: 5,
                    },
                  }}
                />
              </Box>
            ))}
          </CardContent>
        </Card>
        <Card
          elevation={0}
          className="rounded-2xl border border-[#edf1ef] bg-[#173c35] text-white"
        >
          <CardContent className="!p-6">
            <Typography
              sx={{
                color: "#a9d4c8",
                fontSize: 12,
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              Promotion summary
            </Typography>
            <Typography
              sx={{
                color: "white",
                fontSize: 25,
                fontWeight: 800,
                lineHeight: 1.2,
                mt: 2,
              }}
            >
              {strongestCategory} has the highest average discount in the selected data.
            </Typography>
            <Typography
              sx={{ color: "#b9d0c9", fontSize: 13, lineHeight: 1.7, mt: 2 }}
            >
              {filteredProducts.length} Polish offers are included, with an average discount of {averageDiscount}%. Use this view to compare brand pressure before setting a campaign.
            </Typography>
            <Box className="mt-8 border-t border-[#3b6259] pt-4">
              <Typography sx={{ color: "#a9d4c8", fontSize: 12 }}>
                Latest promotion year
              </Typography>
              <Typography
                sx={{ color: "white", fontSize: 32, fontWeight: 800, mt: 1 }}
              >
                {latestYear || "All history"}
              </Typography>
            </Box>
            <YearFilter selectedYear={brandYear} onChange={setBrandYear} />
          </CardContent>
        </Card>
      </Box>
      <Box className="grid grid-cols-1 gap-5 lg:grid-cols-[1.3fr_1fr]">
        <Card
          elevation={0}
          className="rounded-2xl border border-[#edf1ef] bg-white"
        >
          <CardContent className="!p-6">
            <Box className="mb-4 flex items-center justify-between">
              <Box>
                <Typography
                  sx={{ color: "#173c35", fontSize: 17, fontWeight: 800 }}
                >
                  Promotion intensity heatmap
                </Typography>
                <Typography sx={{ color: "#8a9894", fontSize: 13, mt: 0.5 }}>
                  Seasonality across the last eight weeks
                </Typography>
              </Box>
              <Box className="flex gap-1">
                <Box className="h-3 w-3 rounded-sm bg-[#e7f3ee]" />
                <Box className="h-3 w-3 rounded-sm bg-[#9ed0bd]" />
                <Box className="h-3 w-3 rounded-sm bg-[#4d9d89]" />
                <Box className="h-3 w-3 rounded-sm bg-[#236653]" />
              </Box>
            </Box>
            <Box className="grid grid-cols-9 gap-2 text-center">
              <Box />
              {weeks.map((week) => (
                <Typography key={week} sx={{ color: "#9aa7a3", fontSize: 10 }}>
                  {week}
                </Typography>
              ))}
              {["Skincare", "Fragrance", "Makeup", "Haircare"].map(
                (category, row) => (
                  <React.Fragment key={category}>
                    <Typography
                      sx={{
                        color: "#557069",
                        fontSize: 11,
                        fontWeight: 700,
                        textAlign: "left",
                      }}
                    >
                      {category}
                    </Typography>
                    {weeks.map((week, column) => {
                      const categoryProducts = heatmapProducts.filter((product) => product.category === category);
                      const weekProducts = categoryProducts.filter((product) => {
                        const day = Number(product.fromDate.slice(8, 10));
                        return day >= column * 4 + 1 && day <= (column + 1) * 4;
                      });
                      const intensity = weekProducts.length
                        ? Math.min(3, Math.floor(weekProducts.reduce((sum, product) => sum + product.competitorDiscount, 0) / weekProducts.length / 10))
                        : 0;
                      return (
                      <Box
                        key={`${category}-${week}`}
                        className="h-8 rounded-md"
                        sx={{
                          backgroundColor: ["#e7f3ee", "#9ed0bd", "#4d9d89", "#236653"][intensity],
                        }}
                      />
                      );
                    })}
                  </React.Fragment>
                ),
              )}
            </Box>
            <YearFilter selectedYear={heatmapYear} onChange={setHeatmapYear} />
          </CardContent>
        </Card>
        <Card
          elevation={0}
          className="rounded-2xl border border-[#edf1ef] bg-white"
        >
          <CardContent className="!p-6">
            <Typography
              sx={{ color: "#173c35", fontSize: 17, fontWeight: 800 }}
            >
              Top-promoted categories
            </Typography>
            <Typography sx={{ color: "#8a9894", fontSize: 13, mb: 4, mt: 0.5 }}>
              Ranked by discount level and SKU coverage
            </Typography>
            {categoryTotals.map((item, index) => (
              <Box key={item.category} className="mb-4 flex items-center gap-3">
                <Typography
                  sx={{
                    color: "#a0aca8",
                    fontSize: 13,
                    fontWeight: 800,
                    width: 18,
                  }}
                >
                  0{index + 1}
                </Typography>
                <Box className="flex-1">
                  <Box className="mb-1 flex justify-between">
                    <Typography
                      sx={{ color: "#34534a", fontSize: 13, fontWeight: 700 }}
                    >
                      {item.category}
                    </Typography>
                    <Chip
                      label={`${item.discount}% avg`}
                      size="small"
                      sx={{
                        backgroundColor: "#e1f2ed",
                        color: "#28715f",
                        fontWeight: 700,
                        fontSize: 10,
                      }}
                    />
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={item.discount * 3}
                    sx={{
                      height: 6,
                      borderRadius: 4,
                      backgroundColor: "#edf2ef",
                      "& .MuiLinearProgress-bar": {
                        backgroundColor: "#73b8a5",
                        borderRadius: 4,
                      },
                    }}
                  />
                </Box>
              </Box>
            ))}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
