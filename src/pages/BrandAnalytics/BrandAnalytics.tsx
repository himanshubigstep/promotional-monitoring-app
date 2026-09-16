import {
  Box,
  Card,
  CardContent,
  FormControl,
  LinearProgress,
  MenuItem,
  Select,
  Tooltip,
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { BarChart } from "@mui/x-charts";
import React, { useState } from "react";
import type { Product, PromotionType } from "../../data/productTypes";
import { matchesPromotionFilters, useAppContext } from "../../context/AppContext";
import AppPagination from "../../components/AppPagination";
import { formatRetailerLabel } from "../../data/retailers";

const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Small, borderless dropdown used for the analytics filters below (year,
// heatmap dimension) - shares one style so every filter on this page looks
// the same regardless of which chart it controls.
function InlineSelect<T extends string | number>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { label: string; value: T }[];
}) {
  return (
    <FormControl size="small">
      <Select
        value={value}
        onChange={(event: SelectChangeEvent<T>) =>
          onChange(event.target.value as T)
        }
        sx={{
          fontSize: 11,
          fontWeight: 500,
          color: "#141824",
          backgroundColor: "#f5f7fa",
          borderRadius: "6px",
          "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e3e6ed" },
          "& .MuiSelect-select": { py: 0.5, px: 1.25 },
        }}
      >
        {options.map((option) => (
          <MenuItem
            key={option.value}
            value={option.value}
            sx={{ fontSize: 12 }}
          >
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

const getYear = (dateStr: string) => (dateStr ? Number(dateStr.slice(0, 4)) : NaN);
const getMonthIndex = (dateStr: string) => (dateStr ? Number(dateStr.slice(5, 7)) - 1 : -1);

type HeatmapDimension = "category" | "brand" | "store";

const getDimensionValue = (product: Product, dimension: HeatmapDimension) => {
  if (dimension === "brand") return product.brand;
  if (dimension === "store") return product.retailer;
  return product.category;
};

const promotionTypes: PromotionType[] = [
  "Fixed promotion",
  "Buy one get one free",
  "Custom",
];
const promotionTypeColors: Record<PromotionType, string> = {
  "Fixed promotion": "#000000",
  "Buy one get one free": "#7c5cfa",
  Custom: "#e5780b",
};

export default function BrandAnalytics() {
  const { filters, products: catalog } = useAppContext();
  const typedCatalog: Product[] = catalog;
  const [brandPage, setBrandPage] = useState(1);
  const [storePage, setStorePage] = useState(1);
  const [activityYear, setActivityYear] = useState<number | "all">("all");
  const [heatmapYear, setHeatmapYear] = useState<number | "all">("all");
  const [heatmapDimension, setHeatmapDimension] =
    useState<HeatmapDimension>("category");
  const [promoMixDimension, setPromoMixDimension] =
    useState<"brand" | "store">("brand");
  const [topDiscountsYear, setTopDiscountsYear] = useState<number | "all">("all");
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
      ["#000000", "#7c5cfa", "#e5780b", "#25b003"][index % 4],
    ] as const;
  });
  const brandsPerPage = 5;
  const brandPageCount = Math.ceil(brands.length / brandsPerPage);
  const visibleBrands = brands.slice(
    (brandPage - 1) * brandsPerPage,
    brandPage * brandsPerPage,
  );
  // Same shape as `brands` above, grouped by retailer instead - powers the
  // "Store vs. Store Discount Comparison" card.
  const stores = Array.from(
    new Set(filteredProducts.map((product) => product.retailer)),
  ).map((store, index) => {
    const offers = filteredProducts.filter(
      (product) => product.retailer === store,
    );
    const discount = Math.round(
      offers.reduce((sum, product) => sum + product.competitorDiscount, 0) /
      offers.length,
    );
    return [
      store,
      `${offers.length} offers`,
      discount,
      ["#000000", "#7c5cfa", "#e5780b", "#25b003"][index % 4],
    ] as const;
  });
  const storesPerPage = 5;
  const storePageCount = Math.ceil(stores.length / storesPerPage);
  const visibleStores = stores.slice(
    (storePage - 1) * storesPerPage,
    storePage * storesPerPage,
  );
  React.useEffect(() => {
    setBrandPage(1);
    setStorePage(1);
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
  // Every year actually present in the filtered data (by fromDate), newest
  // first, so the year selects below never offer a year with no data.
  const availableYears = Array.from(
    new Set(
      baseProducts
        .map((product) => getYear(product.fromDate))
        .filter((year) => Number.isFinite(year)),
    ),
  ).sort((a, b) => b - a);

  // Monthly (Jan-Dec) offer activity for the selected year, or summed across
  // every year when "All years" is selected.
  const activityProducts =
    activityYear === "all"
      ? summaryProducts
      : summaryProducts.filter(
        (product) => getYear(product.fromDate) === activityYear,
      );
  const monthlyActivity = months.map((month, index) => {
    const monthProducts = activityProducts.filter(
      (product) => getMonthIndex(product.fromDate) === index,
    );
    return {
      month,
      count: monthProducts.length,
      discount: monthProducts.length
        ? Math.round(
          monthProducts.reduce(
            (sum, product) => sum + product.competitorDiscount,
            0,
          ) / monthProducts.length,
        )
        : 0,
    };
  });

  // Heatmap: rows are whichever dimension is selected (category/brand/store),
  // capped to the 6 busiest values so the grid stays readable, columns are
  // always the 12 calendar months of the selected year.
  const heatmapYearProducts =
    heatmapYear === "all"
      ? heatmapProducts
      : heatmapProducts.filter(
        (product) => getYear(product.fromDate) === heatmapYear,
      );
  const heatmapRowValues = Array.from(
    new Map(
      heatmapYearProducts.map((product) => [
        getDimensionValue(product, heatmapDimension),
        true,
      ]),
    ).keys(),
  )
    .filter(Boolean)
    .map((value) => ({
      value,
      count: heatmapYearProducts.filter(
        (product) => getDimensionValue(product, heatmapDimension) === value,
      ).length,
    }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 6)
    .map((row) => row.value);
  const heatmapAvgDiscount = (rowValue: string, monthIndex: number) => {
    const monthProducts = heatmapYearProducts.filter(
      (product) =>
        getDimensionValue(product, heatmapDimension) === rowValue &&
        getMonthIndex(product.fromDate) === monthIndex,
    );
    return monthProducts.length
      ? Math.round(
        monthProducts.reduce(
          (sum, product) => sum + product.competitorDiscount,
          0,
        ) / monthProducts.length,
      )
      : 0;
  };
  const heatmapRows = heatmapRowValues.map((rowValue) => {
    let previousDiscount: number | null = null;
    const cells = months.map((month, monthIndex) => {
      const discount = heatmapAvgDiscount(rowValue, monthIndex);
      // "Hike ratio" = % change in average discount vs the previous month
      // in the same row - null (shown as "-") for January, where there's no
      // prior month within the selected year to compare against.
      const hikeRatio =
        previousDiscount === null
          ? null
          : previousDiscount === 0
            ? discount > 0
              ? 100
              : 0
            : Math.round(((discount - previousDiscount) / previousDiscount) * 100);
      previousDiscount = discount;
      return { month, discount, hikeRatio };
    });
    return {
      rowValue,
      // Only store names need first-letter capitalizing for display -
      // brand/category values are already properly cased in the data.
      displayValue: heatmapDimension === "store" ? formatRetailerLabel(rowValue) : rowValue,
      cells,
    };
  });
  const heatmapDimensionLabel =
    heatmapDimension === "brand"
      ? "Brand"
      : heatmapDimension === "store"
        ? "Store"
        : "Category";

  // The single highest-discounted product+store offers across the whole
  // filtered catalog - powers the "Top Discounts" chart.
  const topDiscountsProducts =
    topDiscountsYear === "all"
      ? baseProducts
      : baseProducts.filter((product) => getYear(product.fromDate) === topDiscountsYear);
  const topDiscountedOffers = [...topDiscountsProducts]
    .sort((left, right) => right.competitorDiscount - left.competitorDiscount)
    .slice(0, 12)
    .map((product) => ({
      label: `${product.name} · ${formatRetailerLabel(product.retailer)}`,
      discount: product.competitorDiscount,
    }));

  // Promotion mechanic (Fixed / BOGO / Custom) mix per brand or store -
  // powers the "Promotion Type Mix" stacked bars.
  const promoMixValue = (product: Product) =>
    promoMixDimension === "store" ? product.retailer : product.brand;
  const promoMixRows = Array.from(
    new Map(baseProducts.map((product) => [promoMixValue(product), true])).keys(),
  )
    .filter(Boolean)
    .map((value) => ({
      value,
      count: baseProducts.filter((product) => promoMixValue(product) === value).length,
    }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 5)
    .map(({ value }) => {
      const rowProducts = baseProducts.filter((product) => promoMixValue(product) === value);
      const total = rowProducts.length || 1;
      const segments = promotionTypes.map((type) => {
        const count = rowProducts.filter(
          (product) => (product.promotionType || "Fixed promotion") === type,
        ).length;
        return { type, count, pct: Math.round((count / total) * 100) };
      });
      return {
        value,
        // Only store names need first-letter capitalizing for display -
        // brand values are already properly cased in the data.
        displayValue: promoMixDimension === "store" ? formatRetailerLabel(value) : value,
        segments,
        total: rowProducts.length,
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
          className="rounded-2xl border border-[#e3e6ed] bg-white"
        >
          <CardContent className="!p-6">
            <Typography
              sx={{
                color: "#141824",
                fontSize: 16,
                fontWeight: 500,
                letterSpacing: "-0.01em",
              }}
            >
              Average Market Discount vs. Brand
            </Typography>
            <Typography
              sx={{ color: "#525b75", fontSize: 12.5, mb: 4, mt: 0.5 }}
            >
              Benchmark competitive discount pressure across beauty brands.
            </Typography>
            {visibleBrands.map(([name, revenue, score, color]) => (
              <Box key={name} className="mb-5">
                <Box className="mb-1.5 flex justify-between">
                  <Typography
                    sx={{ color: "#141824", fontSize: 13.5, fontWeight: 500 }}
                  >
                    {name}
                  </Typography>
                  <Box className="flex gap-3">
                    <Typography sx={{ color: "#525b75", fontSize: 12 }}>
                      Owns {averageDiscount}%
                    </Typography>
                    <Typography
                      sx={{ color: "#141824", fontSize: 12.5, fontWeight: 500 }}
                    >
                      Market {score}%
                    </Typography>
                  </Box>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Number(score)}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: "#eff2f6",
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
          className="overflow-hidden rounded-2xl border border-[#e3e6ed] bg-white"
        >
          <Box className="h-1 bg-[#000000]" />
          <CardContent className="!p-6">
            <Box className="flex items-start justify-between gap-3">
              <Box>
                <Typography
                  sx={{
                    color: "#000000",
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: 1.2,
                    textTransform: "uppercase",
                  }}
                >
                  Promotion Summary
                </Typography>
                <Typography sx={{ color: "#525b75", fontSize: 12, mt: 0.5 }}>
                  Campaign intensity snapshot
                </Typography>
              </Box>
              <Box className="rounded-md bg-[#f5f7fa] border border-[#e3e6ed] px-2.5 py-0.5">
                <Typography
                  sx={{ color: "#141824", fontSize: 11, fontWeight: 500 }}
                >
                  All years
                </Typography>
              </Box>
            </Box>
            <Typography
              sx={{
                color: "#141824",
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
              sx={{ color: "#525b75", fontSize: 13, lineHeight: 1.6, mt: 1.5 }}
            >
              {summaryProducts.length} offers are included, with an average
              discount of {averageDiscount}%. Compare brand campaigns before
              launching upcoming seasonal offers.
            </Typography>
            <Box className="mt-5 grid grid-cols-2 gap-3 border-t border-[#e3e6ed] pt-4">
              <Box className="rounded-lg border border-[#e3e6ed] bg-[#f5f7fa] p-3">
                <Typography
                  sx={{
                    color: "#525b75",
                    fontSize: 11,
                    fontWeight: 500,
                    textTransform: "uppercase",
                  }}
                >
                  Discount by category
                </Typography>
                <Box className="mt-3 flex h-24 items-end justify-around gap-2">
                  {categoryTotals.map((item) => (
                    <Box
                      key={item.category}
                      className="flex min-w-0 flex-1 flex-col items-center gap-1"
                    >
                      <Tooltip title={`${item.category}: ${item.discount}%`} arrow>
                        <Box
                          sx={{
                            width: 10,
                            height: `${Math.max(8, Math.min(item.discount * 2.5, 72))}px`,
                            borderRadius: "3px 3px 0 0",
                            backgroundColor:
                              item.category === strongestCategory
                                ? "#000000"
                                : "#141824",
                            opacity:
                              item.category === strongestCategory ? 1 : 0.65,
                            cursor: "default",
                          }}
                        />
                      </Tooltip>
                      <Typography
                        sx={{
                          color: "#525b75",
                          fontSize: 9,
                          fontWeight: 500,
                          textAlign: "center",
                          lineHeight: 1.2,
                        }}
                      >
                        {item.category}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
              <Box className="rounded-lg border border-[#e3e6ed] bg-[#f5f7fa] p-3">
                <Box className="flex items-center justify-between gap-2">
                  <Typography
                    sx={{
                      color: "#525b75",
                      fontSize: 11,
                      fontWeight: 500,
                      textTransform: "uppercase",
                    }}
                  >
                    Monthly offer activity
                  </Typography>
                  <InlineSelect
                    value={activityYear}
                    onChange={setActivityYear}
                    options={[
                      { label: "All years", value: "all" as const },
                      ...availableYears.map((year) => ({
                        label: String(year),
                        value: year,
                      })),
                    ]}
                  />
                </Box>
                <Box className="mt-3 flex h-24 items-end gap-1">
                  {monthlyActivity.map((item) => (
                    <Box
                      key={item.month}
                      className="flex min-w-0 flex-1 flex-col items-center gap-1"
                    >
                      <Tooltip
                        title={`${item.month}: ${item.count} offers, ${item.discount}% average discount`}
                        arrow
                      >
                        <Box
                          className="w-full rounded-t-sm"
                          sx={{
                            height: `${Math.max(8, Math.min((item.count / Math.max(activityProducts.length, 1)) * 72, 72))}px`,
                            backgroundColor: "#e5780b",
                            opacity: item.count ? 1 : 0.3,
                            cursor: "default",
                          }}
                        />
                      </Tooltip>
                      <Typography
                        sx={{ color: "#525b75", fontSize: 9, fontWeight: 500 }}
                      >
                        {item.month}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
            <Box
              className="mt-4 flex items-end justify-between gap-3 rounded-xl px-4 py-3 text-white"
              sx={{ backgroundImage: "linear-gradient(135deg, #000000 0%, #333333 100%)" }}
            >
              <Box>
                <Typography
                  sx={{ color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: 500 }}
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
                sx={{ color: "#ffffff", fontSize: 22, fontWeight: 700 }}
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
          className="rounded-2xl border border-[#e3e6ed] bg-white"
        >
          <CardContent className="!p-6">
            <Box className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <Box>
                <Typography
                  sx={{
                    color: "#141824",
                    fontSize: 16,
                    fontWeight: 500,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Promotion Intensity Heatmap
                </Typography>
                <Typography sx={{ color: "#525b75", fontSize: 12.5, mt: 0.5 }}>
                  Yearly seasonality, compared by {heatmapDimensionLabel.toLowerCase()}
                </Typography>
              </Box>
              <Box className="flex items-center gap-1">
                <Box className="h-3 w-3 rounded-xs bg-[#eff2f6]" />
                <Box className="h-3 w-3 rounded-xs bg-[#cfe0ff]" />
                <Box className="h-3 w-3 rounded-xs bg-[#8fb4ff]" />
                <Box className="h-3 w-3 rounded-xs bg-[#000000]" />
              </Box>
            </Box>
            <Box className="mb-4 flex flex-wrap items-center gap-2">
              <InlineSelect
                value={heatmapDimension}
                onChange={setHeatmapDimension}
                options={[
                  { label: "Category wise", value: "category" as const },
                  { label: "Brand wise", value: "brand" as const },
                  { label: "Store wise", value: "store" as const },
                ]}
              />
              <InlineSelect
                value={heatmapYear}
                onChange={setHeatmapYear}
                options={[
                  { label: "All years", value: "all" as const },
                  ...availableYears.map((year) => ({
                    label: String(year),
                    value: year,
                  })),
                ]}
              />
            </Box>
            {heatmapRows.length === 0 ? (
              <Typography sx={{ color: "#525b75", fontSize: 12 }}>
                No {heatmapDimensionLabel.toLowerCase()} data available for this
                selection.
              </Typography>
            ) : (
              <Box
                className="grid gap-2 text-center"
                sx={{ gridTemplateColumns: `minmax(72px, auto) repeat(${months.length}, 1fr)` }}
              >
                {heatmapRows.map((row) => (
                  <React.Fragment key={row.rowValue}>
                    <Typography
                      sx={{
                        color: "#141824",
                        fontSize: 11,
                        fontWeight: 500,
                        textAlign: "left",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {row.displayValue}
                    </Typography>
                    {row.cells.map((cell) => {
                      const intensity = Math.min(3, Math.floor(cell.discount / 10));
                      const backgroundColor = [
                        "#eff2f6",
                        "#cfe0ff",
                        "#8fb4ff",
                        "#000000",
                      ][intensity];
                      const hikeLabel =
                        cell.hikeRatio === null
                          ? "-"
                          : `${cell.hikeRatio > 0 ? "+" : ""}${cell.hikeRatio}%`;
                      return (
                        <Tooltip
                          key={`${row.rowValue}-${cell.month}`}
                          title={`${row.displayValue} • ${cell.month}: ${cell.discount}% avg discount, ${hikeLabel} hike vs previous month`}
                          arrow
                        >
                          <Box
                            className="h-8 rounded-sm transition-all flex items-center justify-center"
                            sx={{ backgroundColor, cursor: "default" }}
                          >
                            <Typography
                              sx={{
                                fontSize: 8,
                                fontWeight: 600,
                                color: intensity >= 2 ? "#ffffff" : "#525b75",
                              }}
                            >
                              {hikeLabel}
                            </Typography>
                          </Box>
                        </Tooltip>
                      );
                    })}
                  </React.Fragment>
                ))}
                <Box />
                {months.map((month) => (
                  <Typography
                    key={month}
                    sx={{ color: "#525b75", fontSize: 10, fontWeight: 500 }}
                  >
                    {month}
                  </Typography>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
        <Card
          elevation={0}
          className="rounded-2xl border border-[#e3e6ed] bg-white"
        >
          <CardContent className="!p-6">
            <Typography
              sx={{
                color: "#141824",
                fontSize: 16,
                fontWeight: 500,
                letterSpacing: "-0.01em",
              }}
            >
              Store vs. Store Discount Comparison
            </Typography>
            <Typography
              sx={{ color: "#525b75", fontSize: 12.5, mb: 4, mt: 0.5 }}
            >
              Benchmark competitive discount pressure across retailers.
            </Typography>
            {visibleStores.map(([name, revenue, score, color]) => (
              <Box key={name} className="mb-5">
                <Box className="mb-1.5 flex justify-between">
                  <Typography
                    sx={{ color: "#141824", fontSize: 13.5, fontWeight: 500 }}
                  >
                    {formatRetailerLabel(name)}
                  </Typography>
                  <Box className="flex gap-3">
                    <Typography sx={{ color: "#525b75", fontSize: 12 }}>
                      {revenue}
                    </Typography>
                    <Typography
                      sx={{ color: "#141824", fontSize: 12.5, fontWeight: 500 }}
                    >
                      Avg {score}%
                    </Typography>
                  </Box>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={Number(score)}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: "#eff2f6",
                    "& .MuiLinearProgress-bar": {
                      backgroundColor: color,
                      borderRadius: 4,
                    },
                  }}
                />
              </Box>
            ))}
            {storePageCount > 1 && (
              <AppPagination
                count={storePageCount}
                page={storePage}
                onChange={setStorePage}
                total={stores.length}
                pageSize={storesPerPage}
                itemLabel="stores"
              />
            )}
          </CardContent>
        </Card>
      </Box>

      <Box className="grid grid-cols-2 gap-4">
        <Box className="grid grid-cols-1 gap-4">
          <Card
            elevation={0}
            className="rounded-2xl border border-[#e3e6ed] bg-white"
          >
            <CardContent className="!p-6">
              <Box className="mb-1 flex flex-wrap items-start justify-between gap-3">
                <Box>
                  <Typography
                    sx={{
                      color: "#141824",
                      fontSize: 16,
                      fontWeight: 500,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Top Discounts
                  </Typography>
                  <Typography sx={{ color: "#525b75", fontSize: 12.5, mt: 0.5 }}>
                    Across every tracked store and product, which offers cut
                    the deepest.
                  </Typography>
                </Box>
                <InlineSelect
                  value={topDiscountsYear}
                  onChange={setTopDiscountsYear}
                  options={[
                    { label: "All years", value: "all" as const },
                    ...availableYears.map((year) => ({
                      label: String(year),
                      value: year,
                    })),
                  ]}
                />
              </Box>
              {topDiscountedOffers.length === 0 ? (
                <Typography sx={{ color: "#525b75", fontSize: 12, mt: 2 }}>
                  No data available for this selection.
                </Typography>
              ) : (
                <BarChart
                  height={320}
                  xAxis={[
                    {
                      scaleType: "band",
                      // A band scale needs a unique domain value per bar - the
                      // store name alone repeats across bars (several top
                      // offers share a retailer), which silently collapsed
                      // bars together. Rank numbers are always unique and
                      // short; the tooltip (series valueFormatter below) shows
                      // the actual product + store detail on hover.
                      data: topDiscountedOffers.map((_, index) => `#${index + 1}`),
                      categoryGapRatio: 0.5,
                      tickLabelStyle: { fontSize: 10, fill: "#525b75" },
                    },
                  ]}
                  yAxis={[{ valueFormatter: (value: number) => `${value}%` }]}
                  series={[
                    {
                      data: topDiscountedOffers.map((offer) => offer.discount),
                      color: "#e5780b",
                      valueFormatter: (value, context) =>
                        `${value}% · ${topDiscountedOffers[context.dataIndex]?.label ?? ""}`,
                    },
                  ]}
                  hideLegend
                  margin={{ top: 10, right: 20, bottom: 30, left: 40 }}
                  sx={{ "& .MuiBarElement-root": { maxWidth: 24 } }}
                />
              )}
            </CardContent>
          </Card>
        </Box>

        <Box className="grid grid-cols-1 gap-4">
          <Card
            elevation={0}
            className="rounded-2xl border border-[#e3e6ed] bg-white"
          >
            <CardContent className="!p-6">
              <Box className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <Box>
                  <Typography
                    sx={{
                      color: "#141824",
                      fontSize: 16,
                      fontWeight: 500,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    Promotion Type Mix
                  </Typography>
                  <Typography sx={{ color: "#525b75", fontSize: 12.5, mt: 0.5 }}>
                    Share of Fixed / BOGO / Custom mechanics.
                  </Typography>
                </Box>
                <InlineSelect
                  value={promoMixDimension}
                  onChange={setPromoMixDimension}
                  options={[
                    { label: "Brand wise", value: "brand" as const },
                    { label: "Store wise", value: "store" as const },
                  ]}
                />
              </Box>
              <Box className="mb-4 flex flex-wrap items-center gap-3">
                {promotionTypes.map((type) => (
                  <Box key={type} className="flex items-center gap-1.5">
                    <Box
                      className="h-2.5 w-2.5 rounded-full"
                      sx={{ backgroundColor: promotionTypeColors[type] }}
                    />
                    <Typography sx={{ color: "#525b75", fontSize: 11 }}>
                      {type}
                    </Typography>
                  </Box>
                ))}
              </Box>
              {promoMixRows.length === 0 ? (
                <Typography sx={{ color: "#525b75", fontSize: 12 }}>
                  No data available for this selection.
                </Typography>
              ) : (
                promoMixRows.map((row) => (
                  <Box key={row.value} className="mb-4">
                    <Box className="mb-1.5 flex justify-between">
                      <Typography
                        sx={{ color: "#141824", fontSize: 13, fontWeight: 500 }}
                      >
                        {row.displayValue}
                      </Typography>
                      <Typography sx={{ color: "#525b75", fontSize: 11 }}>
                        {row.total} offers
                      </Typography>
                    </Box>
                    <Box className="flex h-3 w-full overflow-hidden rounded-full bg-[#eff2f6]">
                      {row.segments
                        .filter((segment) => segment.pct > 0)
                        .map((segment) => (
                          <Tooltip
                            key={segment.type}
                            title={`${segment.type}: ${segment.count} offers (${segment.pct}%)`}
                            arrow
                          >
                            <Box
                              sx={{
                                width: `${segment.pct}%`,
                                backgroundColor: promotionTypeColors[segment.type],
                                cursor: "default",
                              }}
                            />
                          </Tooltip>
                        ))}
                    </Box>
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}
