import {
  Box,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import type { Product } from "../../data/productTypes";
import { matchesPromotionFilters, useAppContext } from "../../context/AppContext";
import AppPagination from "../../components/AppPagination";

const weeks = ["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"];
export default function BrandAnalytics() {
  const { filters, products: catalog } = useAppContext();
  const typedCatalog: Product[] = catalog;
  const [brandPage, setBrandPage] = useState(1);
  const baseProducts = typedCatalog.filter(
    (product: Product) =>
      matchesPromotionFilters(product, filters),
  );
  const filteredProducts = baseProducts;
  const summaryProducts = baseProducts;
  const categoryProducts = baseProducts;
  const heatmapProducts = baseProducts;
  const brands = Array.from(
    new Set(filteredProducts.map((product) => product.brand)),
  ).map((brand, index) => {
    const offers = filteredProducts.filter(
      (product) => product.brand === brand,
    );
    const discount = Math.round(
      offers.reduce((sum, product) => sum + product.competitorDiscount, 0) /
        offers.length,
    );
    return [
      brand,
      `${offers.length} offers`,
      discount,
      ["#4f82f7", "#7c5cfa", "#f3873a", "#22b573"][index % 4],
    ] as const;
  });
  const brandsPerPage = 5;
  const brandPageCount = Math.ceil(brands.length / brandsPerPage);
  const visibleBrands = brands.slice(
    (brandPage - 1) * brandsPerPage,
    brandPage * brandsPerPage,
  );
  React.useEffect(() => {
    setBrandPage(1);
  }, [
    filters.market,
    filters.search,
    filters.category,
    filters.retailer,
  ]);
  const categoryTotals = ["Skincare", "Fragrance", "Makeup", "Haircare"]
    .map((category) => ({
      category,
      count: categoryProducts.filter((product) => product.category === category)
        .length,
      discount: Math.round(
        categoryProducts
          .filter((product) => product.category === category)
          .reduce((sum, product) => sum + product.competitorDiscount, 0) /
          Math.max(
            categoryProducts.filter((product) => product.category === category)
              .length,
            1,
          ),
      ),
    }))
    .sort((left, right) => right.discount - left.discount);
  const averageDiscount = summaryProducts.length
    ? Math.round(
        summaryProducts.reduce(
          (sum, product) => sum + product.competitorDiscount,
          0,
        ) / summaryProducts.length,
      )
    : 0;
  const weeklyActivity = weeks.map((week, index) => {
    const weekProducts = summaryProducts.filter((product) => {
      const day = Number(product.fromDate.slice(8, 10));
      return day >= index * 4 + 1 && day <= (index + 1) * 4;
    });
    return {
      week,
      count: weekProducts.length,
      discount: weekProducts.length
        ? Math.round(
            weekProducts.reduce(
              (sum, product) => sum + product.competitorDiscount,
              0,
            ) / weekProducts.length,
          )
        : 0,
    };
  });
  const strongestCategory = categoryTotals[0]?.category || "No category data";
  const latestYear = summaryProducts
    .reduce(
      (latest, product) => (product.toDate > latest ? product.toDate : latest),
      "",
    )
    .slice(0, 4);

  return (
    <Box className="flex flex-col gap-4">
      <Box className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          elevation={0}
          className="rounded-2xl border border-[#e7eaee] bg-white"
        >
          <CardContent className="!p-6">
            <Typography
              sx={{
                color: "#20242b",
                fontSize: 16,
                fontWeight: 500,
                letterSpacing: "-0.01em",
              }}
            >
              Average Market Discount vs. Brand
            </Typography>
            <Typography
              sx={{ color: "#737b88", fontSize: 12.5, mb: 4, mt: 0.5 }}
            >
              Benchmark competitive discount pressure across beauty brands.
            </Typography>
            {visibleBrands.map(([name, revenue, score, color]) => (
              <Box key={name} className="mb-5">
                <Box className="mb-1.5 flex justify-between">
                  <Typography
                    sx={{ color: "#20242b", fontSize: 13.5, fontWeight: 500 }}
                  >
                    {name}
                  </Typography>
                  <Box className="flex gap-3">
                    <Typography sx={{ color: "#737b88", fontSize: 12 }}>
                      Market {averageDiscount}%
                    </Typography>
                    <Typography
                      sx={{ color: "#20242b", fontSize: 12.5, fontWeight: 500 }}
                    >
                      Owns {score}%
                    </Typography>
                  </Box>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Number(score)}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: "#eef1f4",
                    "& .MuiLinearProgress-bar": {
                      backgroundColor: color,
                      borderRadius: 4,
                    },
                  }}
                />
              </Box>
            ))}
            {brandPageCount > 1 && (
              <AppPagination
                count={brandPageCount}
                page={brandPage}
                onChange={setBrandPage}
                total={brands.length}
                pageSize={brandsPerPage}
                itemLabel="brands"
              />
            )}
          </CardContent>
        </Card>
        <Card
          elevation={0}
          className="overflow-hidden rounded-2xl border border-[#e7eaee] bg-white"
        >
          <Box className="h-1 bg-[#4f82f7]" />
          <CardContent className="!p-6">
            <Box className="flex items-start justify-between gap-3">
              <Box>
                <Typography
                  sx={{
                    color: "#4f82f7",
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: 1.2,
                    textTransform: "uppercase",
                  }}
                >
                  Promotion Summary
                </Typography>
                <Typography sx={{ color: "#737b88", fontSize: 12, mt: 0.5 }}>
                  Campaign intensity snapshot
                </Typography>
              </Box>
              <Box className="rounded-md bg-[#f4f6f8] border border-[#e7eaee] px-2.5 py-0.5">
                <Typography
                  sx={{ color: "#20242b", fontSize: 11, fontWeight: 500 }}
                >
                  All years
                </Typography>
              </Box>
            </Box>
            <Typography
              sx={{
                color: "#20242b",
                fontSize: 22,
                fontWeight: 500,
                lineHeight: 1.3,
                mt: 2,
                letterSpacing: "-0.01em",
              }}
            >
              {strongestCategory} leads discount depth across monitored data.
            </Typography>
            <Typography
              sx={{ color: "#737b88", fontSize: 13, lineHeight: 1.6, mt: 1.5 }}
            >
              {summaryProducts.length} offers are included, with an average
              discount of {averageDiscount}%. Compare brand campaigns before
              launching upcoming seasonal offers.
            </Typography>
            <Box className="mt-5 grid grid-cols-2 gap-3 border-t border-[#e7eaee] pt-4">
              <Box className="rounded-lg border border-[#e7eaee] bg-[#f4f6f8] p-3">
                <Typography
                  sx={{
                    color: "#737b88",
                    fontSize: 11,
                    fontWeight: 500,
                    textTransform: "uppercase",
                  }}
                >
                  Discount by category
                </Typography>
                <Box className="mt-3 flex h-24 items-end gap-2">
                  {categoryTotals.map((item) => (
                    <Box
                      key={item.category}
                      className="flex min-w-0 flex-1 flex-col items-center gap-1"
                    >
                      <Box
                        className="w-full rounded-t-sm"
                        sx={{
                          height: `${Math.max(8, Math.min(item.discount * 2.5, 72))}px`,
                          backgroundColor:
                            item.category === strongestCategory
                              ? "#4f82f7"
                              : "#20242b",
                          opacity:
                            item.category === strongestCategory ? 1 : 0.65,
                        }}
                        title={`${item.category}: ${item.discount}%`}
                      />
                      <Typography
                        sx={{ color: "#737b88", fontSize: 9, fontWeight: 500 }}
                      >
                        {item.category.slice(0, 3)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box className="rounded-lg border border-[#e7eaee] bg-[#f4f6f8] p-3">
                <Typography
                  sx={{
                    color: "#737b88",
                    fontSize: 11,
                    fontWeight: 500,
                    textTransform: "uppercase",
                  }}
                >
                  Weekly offer activity
                </Typography>
                <Box className="mt-3 flex h-24 items-end gap-1">
                  {weeklyActivity.map((item) => (
                    <Box
                      key={item.week}
                      className="flex min-w-0 flex-1 flex-col items-center gap-1"
                    >
                      <Box
                        className="w-full rounded-t-sm"
                        sx={{
                          height: `${Math.max(8, Math.min((item.count / Math.max(summaryProducts.length, 1)) * 72, 72))}px`,
                          backgroundColor: "#f3873a",
                          opacity: item.count ? 1 : 0.3,
                        }}
                        title={`${item.week}: ${item.count} offers, ${item.discount}% average discount`}
                      />
                      <Typography
                        sx={{ color: "#737b88", fontSize: 9, fontWeight: 500 }}
                      >
                        {item.week}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
            <Box className="mt-4 flex items-end justify-between gap-3 rounded-xl bg-[#1a1d23] px-4 py-3 text-white">
              <Box>
                <Typography
                  sx={{ color: "#9199a6", fontSize: 11, fontWeight: 500 }}
                >
                  Latest promotion year
                </Typography>
                <Typography
                  sx={{
                    color: "white",
                    fontSize: 24,
                    fontWeight: 500,
                    mt: 0.25,
                  }}
                >
                  {latestYear || "All history"}
                </Typography>
              </Box>
              <Typography
                sx={{ color: "#78a1ff", fontSize: 22, fontWeight: 500 }}
              >
                {averageDiscount}% avg
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
      <Box className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          elevation={0}
          className="rounded-2xl border border-[#e7eaee] bg-white"
        >
          <CardContent className="!p-6">
            <Box className="mb-4 flex items-center justify-between">
              <Box>
                <Typography
                  sx={{
                    color: "#20242b",
                    fontSize: 16,
                    fontWeight: 500,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Promotion Intensity Heatmap
                </Typography>
                <Typography sx={{ color: "#737b88", fontSize: 12.5, mt: 0.5 }}>
                  Seasonality across the last eight weeks
                </Typography>
              </Box>
              <Box className="flex items-center gap-1">
                <Box className="h-3 w-3 rounded-xs bg-[#eef1f4]" />
                <Box className="h-3 w-3 rounded-xs bg-[#cfe0ff]" />
                <Box className="h-3 w-3 rounded-xs bg-[#8fb4ff]" />
                <Box className="h-3 w-3 rounded-xs bg-[#3b6fed]" />
              </Box>
            </Box>
            <Box className="grid grid-cols-9 gap-2 text-center">
              <Box />
              {weeks.map((week) => (
                <Typography
                  key={week}
                  sx={{ color: "#737b88", fontSize: 10, fontWeight: 500 }}
                >
                  {week}
                </Typography>
              ))}
              {["Skincare", "Fragrance", "Makeup", "Haircare"].map(
                (category, row) => (
                  <React.Fragment key={category}>
                    <Typography
                      sx={{
                        color: "#20242b",
                        fontSize: 11,
                        fontWeight: 500,
                        textAlign: "left",
                      }}
                    >
                      {category}
                    </Typography>
                    {weeks.map((week, column) => {
                      const categoryProducts = heatmapProducts.filter(
                        (product) => product.category === category,
                      );
                      const weekProducts = categoryProducts.filter(
                        (product) => {
                          const day = Number(product.fromDate.slice(8, 10));
                          return (
                            day >= column * 4 + 1 && day <= (column + 1) * 4
                          );
                        },
                      );
                      const intensity = weekProducts.length
                        ? Math.min(
                            3,
                            Math.floor(
                              weekProducts.reduce(
                                (sum, product) =>
                                  sum + product.competitorDiscount,
                                0,
                              ) /
                                weekProducts.length /
                                10,
                            ),
                          )
                        : 0;
                      return (
                        <Box
                          key={`${category}-${week}`}
                          className="h-8 rounded-sm transition-all"
                          sx={{
                            backgroundColor: [
                              "#eef1f4",
                              "#cfe0ff",
                              "#8fb4ff",
                              "#3b6fed",
                            ][intensity],
                          }}
                        />
                      );
                    })}
                  </React.Fragment>
                ),
              )}
            </Box>
          </CardContent>
        </Card>
        <Card
          elevation={0}
          className="rounded-2xl border border-[#e7eaee] bg-white"
        >
          <CardContent className="!p-6">
            <Typography
              sx={{
                color: "#20242b",
                fontSize: 16,
                fontWeight: 500,
                letterSpacing: "-0.01em",
              }}
            >
              Top-Promoted Categories
            </Typography>
            <Typography
              sx={{ color: "#737b88", fontSize: 12.5, mb: 4, mt: 0.5 }}
            >
              Ranked by discount level and SKU coverage
            </Typography>
            {categoryTotals.map((item, index) => (
              <Box key={item.category} className="mb-4 flex items-center gap-3">
                <Typography
                  sx={{
                    color: "#a0a8b3",
                    fontSize: 12,
                    fontWeight: 500,
                    width: 20,
                  }}
                >
                  0{index + 1}
                </Typography>
                <Box className="flex-1">
                  <Box className="mb-1 flex justify-between">
                    <Typography
                      sx={{ color: "#20242b", fontSize: 13, fontWeight: 500 }}
                    >
                      {item.category}
                    </Typography>
                    <Chip
                      label={`${item.discount}% avg`}
                      size="small"
                      sx={{
                        backgroundColor: "#eaf1ff",
                        color: "#3b6fed",
                        fontWeight: 500,
                        fontSize: 10,
                        borderRadius: "6px",
                      }}
                    />
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={item.discount * 3}
                    sx={{
                      height: 6,
                      borderRadius: 4,
                      backgroundColor: "#eef1f4",
                      "& .MuiLinearProgress-bar": {
                        backgroundColor: "#4f82f7",
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
