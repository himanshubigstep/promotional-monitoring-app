import { CalendarMonthRounded } from "@mui/icons-material";
import { Box, Card, Chip, Typography } from "@mui/material";
import { useMemo, useState } from "react";
import products from "../../data/products.json";
import type { Product } from "../../data/productTypes";
import { useAppContext } from "../../context/AppContext";
import YearFilter from "../../components/YearFilter";

const catalog = products as Product[];
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
const brandColors = ["#286e5e", "#d88e3f", "#816bb3", "#c46f76"];

export default function PromotionalCalendar() {
  const { filters } = useAppContext();
  const [chartYear, setChartYear] = useState("");
  const filteredCatalog = useMemo(
    () => catalog.filter((product) => {
      const minimumDiscount = filters.discount === "All" ? 0 : Number(filters.discount.replace("%+", ""));
      return (filters.market === "All" || product.market === filters.market) &&
        (filters.category === "All" || product.category === filters.category) &&
        (filters.retailer === "All" || product.retailer === filters.retailer) &&
        product.competitorDiscount >= minimumDiscount &&
        (!chartYear || product.fromDate.startsWith(chartYear));
    }),
    [filters, chartYear],
  );
  const brands = useMemo(() => Array.from(new Set(filteredCatalog.map((product) => product.brand))), [filteredCatalog]);
  const stores = useMemo(() => Array.from(new Set(filteredCatalog.map((product) => product.retailer))), [filteredCatalog]);
  const selectedYear = chartYear;
  const discountFor = (store: string, brand: string, monthIndex: number) => {
    const month = String(monthIndex + 1).padStart(2, "0");
    const matching = filteredCatalog.filter((product) => {
      const matchesPair = product.retailer === store && product.brand === brand;
      const matchesMonth = selectedYear
        ? product.fromDate.slice(0, 7) === `${selectedYear}-${month}`
        : product.fromDate.slice(5, 7) === month;
      return matchesPair && matchesMonth;
    });
    return matching.length ? Math.round(matching.reduce((sum, product) => sum + product.competitorDiscount, 0) / matching.length) : 0;
  };
  return (
    <Box className="flex flex-col gap-5">
      <Box className="flex flex-wrap items-center justify-between gap-3">
        <Box>
          <Box className="flex items-center gap-2">
            <CalendarMonthRounded sx={{ color: "#286e5e" }} />
            <Typography
              sx={{ color: "#173c35", fontSize: 22, fontWeight: 800 }}
            >
              Poland promotional history
            </Typography>
          </Box>
          <Typography sx={{ color: "#82908b", fontSize: 13, mt: 0.5 }}>
            Discount intensity by store, brand, and calendar month.
          </Typography>
        </Box>
      </Box>
      <Box className="flex flex-wrap items-center gap-2">
        <Chip
          label="Low: 8-14%"
          size="small"
          sx={{ backgroundColor: "#e7f3ee", color: "#286e5e", fontWeight: 700 }}
        />
        <Chip
          label="Medium: 15-24%"
          size="small"
          sx={{ backgroundColor: "#9ed0bd", color: "#174f42", fontWeight: 700 }}
        />
        <Chip
          label="High: 25%+"
          size="small"
          sx={{ backgroundColor: "#286e5e", color: "white", fontWeight: 700 }}
        />
        <Typography sx={{ color: "#82908b", fontSize: 12, ml: 1 }}>
          Each cell shows the average discount active in that month.
        </Typography>
      </Box>
      <Card
        elevation={0}
        className="rounded-2xl border border-[#edf1ef] bg-white"
      >
        <Box className="w-full overflow-x-auto">
          <Box
            className="p-5"
            sx={{
              minWidth: `${Math.max(1100, 170 + brands.length * 150 + Math.max(brands.length - 1, 0) * 8 + 40)}px`,
            }}
          >
          <Box className="mb-4 flex items-center justify-between">
            <Typography
              sx={{ color: "#173c35", fontSize: 17, fontWeight: 800 }}
            >
              Store and brand discount graph
            </Typography>
          </Box>
          <Box
            className="grid gap-2"
            sx={{
              gridTemplateColumns: `170px repeat(${Math.max(brands.length, 1)}, minmax(150px, 1fr))`,
            }}
          >
            <Box />
            {brands.map((brand, index) => (
              <Box
                key={brand}
                className="rounded-xl p-3 text-center"
                sx={{ backgroundColor: `${brandColors[index]}18` }}
              >
                <Typography
                  sx={{
                    color: brandColors[index],
                    fontSize: 13,
                    fontWeight: 800,
                  }}
                >
                  {brand}
                </Typography>
              </Box>
            ))}
            {stores.map((store) => (
              <>
                <Box
                  key={`${store}-label`}
                  className="flex items-center rounded-lg bg-[#f7faf9] px-3"
                >
                  <Typography
                    sx={{ color: "#48665d", fontSize: 12, fontWeight: 700 }}
                  >
                    {store}
                  </Typography>
                </Box>
                {brands.map((brand) => {
                  const monthValues = months.map((_, monthIndex) =>
                    discountFor(store, brand, monthIndex),
                  );
                  const average = Math.round(
                    monthValues.reduce((sum, value) => sum + value, 0) /
                      monthValues.length,
                  );
                  const peakMonth =
                    months[monthValues.indexOf(Math.max(...monthValues))];
                  return (
                    <Box
                      key={`${store}-${brand}`}
                      className="rounded-xl border border-white p-3"
                      sx={{
                        backgroundColor:
                          average >= 25
                            ? "#286e5e"
                            : average >= 15
                              ? "#9ed0bd"
                              : "#e7f3ee",
                        color: average >= 25 ? "white" : "#174f42",
                      }}
                    >
                      <Box className="flex items-end justify-between">
                        <Typography
                          sx={{
                            color: "inherit",
                            fontSize: 22,
                            fontWeight: 800,
                          }}
                        >
                          {average}%
                        </Typography>
                        <Typography
                          sx={{
                            color: "inherit",
                            fontSize: 10,
                            fontWeight: 700,
                          }}
                        >
                          {peakMonth} peak
                        </Typography>
                      </Box>
                      <Box className="mt-3 grid grid-cols-12 gap-1">
                        {monthValues.map((value, monthIndex) => (
                          <Box
                            key={months[monthIndex]}
                            className="h-4 rounded-sm"
                            title={`${months[monthIndex]}: ${value}%`}
                            sx={{
                              backgroundColor:
                                  value >= 25
                                  ? "#174f42"
                                  : value >= 15
                                    ? "#4d9d89"
                                    : "#d0e9df",
                            }}
                          />
                        ))}
                      </Box>
                    </Box>
                  );
                })}
              </>
            ))}
          </Box>
          </Box>
        </Box>
        <Box className="px-5 pb-5">
          <YearFilter selectedYear={chartYear} onChange={setChartYear} />
        </Box>
      </Card>
      <Card
        elevation={0}
        className="rounded-2xl border border-[#edf1ef] bg-white"
      >
        <Box className="p-6">
          <Typography sx={{ color: "#173c35", fontSize: 17, fontWeight: 800 }}>
            Calendar readout
          </Typography>
          <Box className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Box className="rounded-xl bg-[#e1f2ed] p-4">
              <Typography
                sx={{
                  color: "#52746a",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                Highest pressure
              </Typography>
              <Typography
                sx={{ color: "#173c35", fontSize: 18, fontWeight: 800, mt: 1 }}
              >
                September
              </Typography>
              <Typography sx={{ color: "#52746a", fontSize: 12, mt: 0.5 }}>
                Back-to-routine campaigns peak across stores.
              </Typography>
            </Box>
            <Box className="rounded-xl bg-[#fff2d9] p-4">
              <Typography
                sx={{
                  color: "#94703a",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                Best opportunity
              </Typography>
              <Typography
                sx={{ color: "#59451e", fontSize: 18, fontWeight: 800, mt: 1 }}
              >
                Fragrance
              </Typography>
              <Typography sx={{ color: "#94703a", fontSize: 12, mt: 0.5 }}>
                Use threshold offers to compete without over-discounting.
              </Typography>
            </Box>
            <Box className="rounded-xl bg-[#e9e4f8] p-4">
              <Typography
                sx={{
                  color: "#685595",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                Year coverage
              </Typography>
              <Typography
                sx={{ color: "#443568", fontSize: 18, fontWeight: 800, mt: 1 }}
              >
                12 months
              </Typography>
              <Typography sx={{ color: "#685595", fontSize: 12, mt: 0.5 }}>
                Compare seasonality before scheduling the next campaign.
              </Typography>
            </Box>
          </Box>
        </Box>
      </Card>
    </Box>
  );
}
