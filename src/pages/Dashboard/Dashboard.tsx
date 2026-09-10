import {
  ChevronRightRounded,
  DeleteOutlineRounded,
  LocalOfferRounded,
  SearchRounded,
  StorefrontRounded,
  TrendingDownRounded,
  TrendingUpRounded,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import AppPagination from "../../components/AppPagination";
import YearFilter from "../../components/YearFilter";

const fallbackImage =
  "https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=900&q=80";
const today = new Date().toISOString().slice(0, 10);
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

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

const Dashboard = () => {
  const {
    filters,
    role,
    products: catalog,
    deleteProduct,
    canEdit,
  } = useAppContext();
  const [chartYear, setChartYear] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogPage, setCatalogPage] = useState(1);
  const [expiredPage, setExpiredPage] = useState(1);
  const catalogPageSize = 10;
  const expiredPageSize = 5;
  const filteredProducts = useMemo(
    () =>
      catalog
        .filter((product) => {
          const discountValue = product.competitorDiscount;
          const minimumDiscount =
            filters.discount === "All"
              ? 0
              : Number(filters.discount.replace("%+", ""));
          return (
            (product.name.toLowerCase().includes(catalogSearch.toLowerCase()) ||
              product.brand
                .toLowerCase()
                .includes(catalogSearch.toLowerCase()) ||
              product.category
                .toLowerCase()
                .includes(catalogSearch.toLowerCase())) &&
            (!filters.search ||
              product.name
                .toLowerCase()
                .includes(filters.search.toLowerCase()) ||
              product.brand
                .toLowerCase()
                .includes(filters.search.toLowerCase())) &&
            (filters.category === "All" ||
              product.category === filters.category) &&
            (filters.market === "All" || product.market === filters.market) &&
            (filters.retailer === "All" ||
              product.retailer === filters.retailer) &&
            discountValue >= minimumDiscount &&
            (!filters.fromDate || product.toDate >= filters.fromDate) &&
            (!filters.toDate || product.fromDate <= filters.toDate)
          );
        })
        .sort((a, b) => {
          const aActive = a.toDate >= today;
          const bActive = b.toDate >= today;
          if (aActive && !bActive) return -1;
          if (!aActive && bActive) return 1;
          return b.toDate.localeCompare(a.toDate);
        }),
    [catalog, catalogSearch, filters],
  );
  const chartProducts = filteredProducts.filter(
    (product) =>
      !chartYear ||
      chartYear === "All" ||
      product.fromDate.startsWith(chartYear),
  );
  const analytics = useMemo(() => {
    const monthValues = months.map((_, monthIndex) => {
      const month = String(monthIndex + 1).padStart(2, "0");
      const records = chartProducts.filter(
        (product) => product.fromDate.slice(5, 7) === month,
      );
      return records.length
        ? Math.round(
            records.reduce(
              (sum, product) => sum + product.competitorDiscount,
              0,
            ) / records.length,
          )
        : 0;
    });
    const average = chartProducts.length
      ? Math.round(
          chartProducts.reduce(
            (sum, product) => sum + product.competitorDiscount,
            0,
          ) / chartProducts.length,
        )
      : 0;
    const active = chartProducts.filter(
      (product) => product.fromDate <= today && product.toDate >= today,
    ).length;
    const peak = Math.max(...monthValues, 0);
    return {
      monthValues,
      average,
      active,
      peak,
      peakMonth: months[monthValues.indexOf(peak)],
    };
  }, [chartProducts]);
  const yearlyTrend = useMemo(
    () =>
      Array.from(
        new Set(
          catalog.flatMap((product) => [
            product.fromDate.slice(0, 4),
            product.toDate.slice(0, 4),
          ]),
        ),
      )
        .sort()
        .map((year) => {
          const yearProducts = filteredProducts.filter((product) =>
            product.fromDate.startsWith(year),
          );
          return {
            year,
            offers: yearProducts.length,
            open: yearProducts.length ? yearProducts[0].competitorDiscount : 0,
            close: yearProducts.length
              ? yearProducts[yearProducts.length - 1].competitorDiscount
              : 0,
            high: yearProducts.length
              ? Math.max(
                  ...yearProducts.map((product) => product.competitorDiscount),
                )
              : 0,
            low: yearProducts.length
              ? Math.min(
                  ...yearProducts.map((product) => product.competitorDiscount),
                )
              : 0,
          };
        }),
    [catalog, filteredProducts],
  );
  const catalogProducts = filteredProducts.slice(
    (catalogPage - 1) * catalogPageSize,
    catalogPage * catalogPageSize,
  );
  const expiredProducts = useMemo(
    () =>
      catalog.filter(
        (product) =>
          (filters.market === "All" || product.market === filters.market) &&
          product.toDate < today &&
          (filters.category === "All" ||
            product.category === filters.category) &&
          (filters.retailer === "All" ||
            product.retailer === filters.retailer) &&
          (!filters.fromDate || product.toDate >= filters.fromDate) &&
          (!filters.toDate || product.fromDate <= filters.toDate),
      ),
    [catalog, filters],
  );
  const visibleExpiredProducts = expiredProducts.slice(
    (expiredPage - 1) * expiredPageSize,
    expiredPage * expiredPageSize,
  );
  useEffect(() => {
    setCatalogPage(1);
    setExpiredPage(1);
  }, [filters]);

  useEffect(() => {
    const maxCatalogPage = Math.max(
      1,
      Math.ceil(filteredProducts.length / catalogPageSize),
    );
    if (catalogPage > maxCatalogPage) {
      setCatalogPage(maxCatalogPage);
    }
  }, [filteredProducts.length, catalogPage]);

  useEffect(() => {
    const maxExpiredPage = Math.max(
      1,
      Math.ceil(expiredProducts.length / expiredPageSize),
    );
    if (expiredPage > maxExpiredPage) {
      setExpiredPage(maxExpiredPage);
    }
  }, [expiredProducts.length, expiredPage]);
  return (
    <Box className="flex flex-col gap-4">
      <Card
        elevation={0}
        className="rounded-xl border border-[#e5e5e5] bg-[#000000] text-white relative overflow-hidden"
      >
        <Box className="absolute top-0 left-0 right-0 h-1" />
        <CardContent className="!p-6 pt-7">
          <Box className="flex items-center gap-2 mb-1">
            <Typography
              sx={{
                color: "#e50043",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Sephora Intelligence Hub
            </Typography>
            <Typography sx={{ color: "#757575", fontSize: 11 }}>•</Typography>
            <Typography
              sx={{ color: "#9e9e9e", fontSize: 11, fontWeight: 600 }}
            >
              {getGreeting()}, {role}
            </Typography>
          </Box>
          <Typography
            sx={{
              color: "#ffffff",
              fontSize: { xs: 22, md: 28 },
              fontWeight: 800,
              letterSpacing: "-0.02em",
              mt: 0.5,
            }}
          >
            Promotional & Competitor Monitor
          </Typography>
          <Typography
            sx={{
              color: "#b3b3b3",
              fontSize: 13.5,
              mt: 0.8,
              maxWidth: "700px",
            }}
          >
            Track Poland & international retail promotions, analyze discount
            depth across competitors, and optimize campaign timings.
          </Typography>
        </CardContent>
      </Card>

      <Box className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [
            "Offers tracked",
            filteredProducts.length,
            "Active catalog",
            <LocalOfferRounded sx={{ color: "#e50043" }} />,
          ],
          [
            "Active today",
            analytics.active,
            "across monitored retailers",
            <StorefrontRounded sx={{ color: "#000000" }} />,
          ],
          [
            "Average discount",
            `${analytics.average}%`,
            "across active campaigns",
            <TrendingUpRounded sx={{ color: "#c59a3f" }} />,
          ],
          [
            "Peak month",
            analytics.peakMonth || "No data",
            `${analytics.peak}% max monthly avg`,
            <TrendingDownRounded sx={{ color: "#e50043" }} />,
          ],
        ].map(([label, value, detail, icon]) => (
          <Card
            key={String(label)}
            elevation={0}
            className="rounded-xl border border-[#e5e5e5] bg-white transition-all hover:border-[#111111]"
          >
            <CardContent className="!p-5">
              <Box className="flex items-center justify-between">
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
                <Box>{icon}</Box>
              </Box>
              <Typography
                sx={{
                  color: "#000000",
                  fontSize: 26,
                  fontWeight: 800,
                  mt: 1,
                  letterSpacing: "-0.02em",
                }}
              >
                {value}
              </Typography>
              <Typography sx={{ color: "#757575", fontSize: 12, mt: 0.5 }}>
                {detail}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Box className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          elevation={0}
          className="rounded-xl border border-[#e5e5e5] bg-white"
        >
          <CardContent className="!p-6">
            <Box className="mb-5 flex flex-wrap items-start justify-between gap-3">
              <Box>
                <Typography
                  sx={{
                    color: "#000000",
                    fontSize: 16,
                    fontWeight: 800,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Poland Promotion Trend
                </Typography>
                <Typography sx={{ color: "#757575", fontSize: 12.5, mt: 0.5 }}>
                  Monthly discount movement for the selected year.
                </Typography>
              </Box>
              <Chip
                label={`${chartProducts.length} offers`}
                size="small"
                sx={{
                  backgroundColor: "#000000",
                  color: "#ffffff",
                  fontWeight: 700,
                  fontSize: 11,
                  borderRadius: "4px",
                }}
              />
            </Box>
            <Box className="flex h-48 items-end gap-2 border-b border-l border-[#e5e5e5] px-3 pb-2 sm:gap-4">
              {analytics.monthValues.map((value, index) => (
                <Box
                  key={months[index]}
                  className="flex h-full flex-1 flex-col items-center justify-end gap-2"
                >
                  <Typography
                    sx={{
                      color:
                        value === analytics.peak
                          ? "#e50043"
                          : value
                            ? "#111111"
                            : "#bdbdbd",
                      fontSize: 10,
                      fontWeight: 800,
                    }}
                  >
                    {value ? `${value}%` : "-"}
                  </Typography>
                  <Box
                    className="w-full max-w-10 rounded-t-sm transition-all"
                    sx={{
                      height: `${Math.max((value / Math.max(analytics.peak, 1)) * 125, value ? 10 : 2)}px`,
                      backgroundColor:
                        value === analytics.peak
                          ? "#e50043"
                          : value
                            ? "#111111"
                            : "#eeeeee",
                    }}
                  />
                  <Typography
                    sx={{ color: "#757575", fontSize: 10, fontWeight: 600 }}
                  >
                    {months[index]}
                  </Typography>
                </Box>
              ))}
            </Box>
            <YearFilter selectedYear={chartYear} onChange={setChartYear} />
          </CardContent>
        </Card>

        <Card
          elevation={0}
          className="rounded-xl border border-[#e5e5e5] bg-white"
        >
          <CardContent className="!p-6">
            <Typography
              sx={{
                color: "#000000",
                fontSize: 16,
                fontWeight: 800,
                letterSpacing: "-0.01em",
              }}
            >
              Promotion Pulse by Year
            </Typography>
            <Typography sx={{ color: "#757575", fontSize: 12.5, mt: 0.5 }}>
              All available years, with filtered offer volume.
            </Typography>
            <Box className="relative mt-5 flex h-52 items-end justify-around border-b border-l border-[#e5e5e5] px-3 pb-2">
              <Box className="absolute inset-x-3 top-0 border-t border-dashed border-[#e5e5e5]" />
              <Box className="absolute inset-x-3 top-1/2 border-t border-dashed border-[#e5e5e5]" />
              {yearlyTrend.map((item) => {
                const chartMax = Math.max(
                  ...yearlyTrend.map((trend) => trend.high),
                  1,
                );
                const scale = (value: number) =>
                  `${Math.max(5, (value / chartMax) * 145)}px`;
                const rising = item.close >= item.open;
                return (
                  <Box
                    key={item.year}
                    className="flex h-full min-w-12 flex-col items-center justify-end gap-1"
                  >
                    <Typography
                      sx={{
                        color: rising ? "#e50043" : "#757575",
                        fontSize: 10,
                        fontWeight: 800,
                      }}
                    >
                      {item.close}%
                    </Typography>
                    <Box
                      className="relative flex h-36 items-center justify-center"
                      title={`${item.year}: low ${item.low}%, open ${item.open}%, close ${item.close}%, high ${item.high}%`}
                    >
                      <Box
                        className="absolute w-px bg-[#757575]"
                        sx={{ height: scale(item.high) }}
                      />
                      <Box
                        className="relative w-6 rounded-sm"
                        sx={{
                          height: scale(Math.abs(item.close - item.open)),
                          minHeight: 8,
                          backgroundColor: rising ? "#e50043" : "#222222",
                          border: `1px solid ${rising ? "#c8003a" : "#000000"}`,
                        }}
                      />
                    </Box>
                    <Typography
                      sx={{ color: "#111111", fontSize: 11, fontWeight: 700 }}
                    >
                      {item.year}
                    </Typography>
                    <Typography sx={{ color: "#757575", fontSize: 10 }}>
                      {item.offers} offers
                    </Typography>
                  </Box>
                );
              })}
            </Box>
            <Box className="grid grid-cols-3 gap-2 mt-4">
              {yearlyTrend.map((item) => (
                <Box
                  key={item.year}
                  className="rounded-lg bg-[#f7f7f8] border border-[#eeeeee] px-2 py-1.5 text-center"
                >
                  <Typography
                    sx={{ color: "#757575", fontSize: 10, fontWeight: 600 }}
                  >
                    {item.year}
                  </Typography>
                  <Typography
                    sx={{ color: "#000000", fontSize: 12, fontWeight: 800 }}
                  >
                    {item.low}-{item.high}% range
                  </Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Card
        elevation={0}
        className="rounded-xl border border-[#e5e5e5] bg-white"
      >
        <CardContent className="!p-6">
          <Box className="mb-5 flex items-center justify-between">
            <Box>
              <Typography
                sx={{
                  color: "#000000",
                  fontSize: 16,
                  fontWeight: 800,
                  letterSpacing: "-0.01em",
                }}
              >
                Product Promotion Catalog
              </Typography>
              <Typography sx={{ color: "#757575", fontSize: 12.5, mt: 0.5 }}>
                Monitored products, competitor offers, and promotion end dates
              </Typography>
            </Box>
            <Button
              component={Link}
              to="/promotions"
              size="small"
              endIcon={<ChevronRightRounded />}
              sx={{
                color: "#000000",
                textTransform: "none",
                fontWeight: 700,
                "&:hover": { color: "#e50043" },
              }}
            >
              Manage promotions
            </Button>
          </Box>
          <TextField
            size="small"
            placeholder="Search products, brands, or categories"
            value={catalogSearch}
            onChange={(event) => {
              setCatalogSearch(event.target.value);
              setCatalogPage(1);
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <SearchRounded sx={{ color: "#9e9e9e", mr: 1 }} />
                ),
              },
            }}
            sx={{ mb: 3, minWidth: 320 }}
          />
          <Box className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {catalogProducts.map((product) => (
              <Box
                component={Link}
                to={`/products/${product.id}`}
                key={product.id}
                className="overflow-hidden rounded-xl border border-[#e5e5e5] no-underline bg-white transition-all hover:border-[#000000] hover:shadow-md"
              >
                <Box className="relative h-36 bg-[#f7f7f8]">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = fallbackImage;
                    }}
                  />
                  <Chip
                    label={product.toDate >= today ? "Active" : "Expired"}
                    size="small"
                    sx={{
                      position: "absolute",
                      left: 8,
                      top: 8,
                      backgroundColor:
                        product.toDate >= today ? "#000000" : "#eeeeee",
                      color: product.toDate >= today ? "#ffffff" : "#757575",
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      borderRadius: "4px",
                    }}
                  />
                  {canEdit && product.toDate < today && (
                    <IconButton
                      size="small"
                      title="Delete expired promotion"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        deleteProduct(product.id);
                      }}
                      sx={{
                        position: "absolute",
                        right: 6,
                        top: 6,
                        backgroundColor: "rgba(255, 255, 255, 0.95)",
                        color: "#e50043",
                        padding: "3px",
                        "&:hover": {
                          backgroundColor: "#fff0f3",
                          color: "#c8003a",
                        },
                      }}
                    >
                      <DeleteOutlineRounded sx={{ fontSize: 16 }} />
                    </IconButton>
                  )}
                  <Box className="absolute bottom-2 right-2 rounded bg-[#e50043] px-2 py-0.5 shadow-sm">
                    <Typography
                      sx={{
                        color: "#ffffff",
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: "0.02em",
                      }}
                    >
                      -{product.competitorDiscount}%
                    </Typography>
                  </Box>
                </Box>
                <Box className="p-3">
                  <Typography
                    sx={{
                      color: "#757575",
                      display: "block",
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}
                  >
                    {product.brand}
                  </Typography>
                  <Typography
                    sx={{
                      color: "#111111",
                      display: "block",
                      fontSize: 12.5,
                      fontWeight: 700,
                      lineHeight: 1.3,
                      mt: 0.25,
                    }}
                  >
                    {product.name}
                  </Typography>
                  <Typography
                    sx={{
                      color: "#757575",
                      display: "block",
                      fontSize: 11,
                      fontWeight: 600,
                      mt: 0.75,
                    }}
                  >
                    Ends {product.toDate}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
          <AppPagination
            count={Math.ceil(filteredProducts.length / catalogPageSize)}
            page={catalogPage}
            onChange={setCatalogPage}
            total={filteredProducts.length}
            pageSize={catalogPageSize}
            itemLabel="products"
          />
        </CardContent>
      </Card>

      <Card
        elevation={0}
        className="rounded-xl border border-[#e5e5e5] bg-white"
      >
        <CardContent className="!p-6">
          <Box className="mb-4 flex items-center justify-between">
            <Box>
              <Typography
                sx={{
                  color: "#000000",
                  fontSize: 16,
                  fontWeight: 800,
                  letterSpacing: "-0.01em",
                }}
              >
                Expired Promotions
              </Typography>
              <Typography sx={{ color: "#757575", fontSize: 12.5, mt: 0.5 }}>
                Historical discounts that are no longer active.
              </Typography>
            </Box>
            <Chip
              label={`${expiredProducts.length} archived`}
              size="small"
              sx={{
                backgroundColor: "#f5f5f5",
                color: "#757575",
                fontWeight: 700,
                borderRadius: "4px",
              }}
            />
          </Box>
          {expiredProducts.length === 0 ? (
            <Typography
              sx={{
                color: "#757575",
                fontSize: 13,
                py: 4,
                textAlign: "center",
              }}
            >
              No expired promotions found.
            </Typography>
          ) : (
            <Box className="grid grid-cols-1 gap-3 md:grid-cols-5">
              {visibleExpiredProducts.map((product) => (
                <Box
                  key={product.id}
                  component={Link}
                  to={`/products/${product.id}`}
                  className="group relative overflow-hidden rounded-xl border border-[#e5e5e5] no-underline bg-white transition-all hover:border-[#000000]"
                >
                  <Box className="relative h-32 bg-[#f7f7f8]">
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover grayscale-[30%]"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = fallbackImage;
                      }}
                    />
                    <Chip
                      label="Expired"
                      size="small"
                      sx={{
                        position: "absolute",
                        left: 8,
                        top: 8,
                        backgroundColor: "#eeeeee",
                        color: "#757575",
                        fontSize: 10,
                        fontWeight: 800,
                        borderRadius: "4px",
                      }}
                    />
                    {canEdit && (
                      <IconButton
                        size="small"
                        title="Delete expired promotion"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          deleteProduct(product.id);
                        }}
                        sx={{
                          position: "absolute",
                          right: 8,
                          top: 8,
                          backgroundColor: "rgba(255, 255, 255, 0.95)",
                          color: "#e50043",
                          padding: "4px",
                          "&:hover": {
                            backgroundColor: "#fff0f3",
                            color: "#c8003a",
                          },
                        }}
                      >
                        <DeleteOutlineRounded sx={{ fontSize: 16 }} />
                      </IconButton>
                    )}
                  </Box>
                  <Box className="p-3">
                    <Typography
                      sx={{ color: "#111111", fontSize: 12, fontWeight: 700 }}
                    >
                      {product.name}
                    </Typography>
                    <Typography
                      sx={{ color: "#757575", fontSize: 11, mt: 0.5 }}
                    >
                      {product.fromDate} - {product.toDate}
                    </Typography>
                    <Typography
                      sx={{
                        color: "#e50043",
                        fontSize: 11,
                        fontWeight: 800,
                        mt: 1,
                      }}
                    >
                      -{product.competitorDiscount}% discount
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
          {expiredProducts.length > 0 && (
            <AppPagination
              count={Math.ceil(expiredProducts.length / expiredPageSize)}
              page={expiredPage}
              onChange={setExpiredPage}
              total={expiredProducts.length}
              pageSize={expiredPageSize}
              itemLabel="archived promotions"
            />
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default Dashboard;
