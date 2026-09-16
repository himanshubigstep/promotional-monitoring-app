import React, { useMemo, useState } from "react";
import {
    Box, Card, CardContent, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, TextField, Typography,
    ToggleButton, ToggleButtonGroup, Paper, InputAdornment,
} from "@mui/material";
import {
    SearchRounded,
    StorefrontRounded,
    UnfoldMoreRounded,
    ScheduleRounded,
    TrendingUpRounded,
    TrendingDownRounded,
    TrendingFlatRounded,
} from "@mui/icons-material";
import { matchesPromotionFilters, useAppContext } from "../context/AppContext";
import { getMarketRetailers } from "../data/retailers";
import { isBenchmarkProduct } from "../data/marketProducts";
import AppPagination from "./AppPagination";

const today = new Date().toISOString().slice(0, 10);

const YOUR_STORE_PL = "sephora";
const YOUR_STORE_CZ = "CZ Demo Store Prague";
const ROWS_PER_PAGE = 10;

type MarketFilter = "PL" | "CZ";

interface RetailerCell {
    active: boolean;
    discount: number;
    price: number;
    priceAfterDiscount: number;
    fromDate: string;
    toDate: string;
    isYourStore: boolean;
}

interface Row {
    key: string;
    brand: string;
    name: string;
    category: string;
    market: "PL" | "CZ";
    retailers: Record<string, RetailerCell | undefined>;
    yourStoreRetailer: string;
    isBenchmark: boolean;
}

const BrandComparisonTable = () => {
    const { products, filters } = useAppContext();
    const [search, setSearch] = useState("");
    const [brandFilter, setBrandFilter] = useState("");
    const [page, setPage] = useState(1);
    const [selectedMarket, setSelectedMarket] = useState<MarketFilter>(
        filters.market === "CZ" ? "CZ" : "PL"
    );

    const yourStore = selectedMarket === "CZ" ? YOUR_STORE_CZ : YOUR_STORE_PL;

    const retailers = useMemo(() => {
        const all = getMarketRetailers(selectedMarket);
        return [
            ...(all.includes(yourStore) ? [yourStore] : []),
            ...all.filter((r) => r !== yourStore),
        ];
    }, [selectedMarket, yourStore]);

    const rows: Row[] = useMemo(() => {
        const filtered = products.filter((p) => {
            const matchesSearch =
                !search ||
                p.name.toLowerCase().includes(search.toLowerCase()) ||
                p.brand.toLowerCase().includes(search.toLowerCase());
            const matchesGlobalFilters = matchesPromotionFilters(p, filters);
            const matchesMarket = p.market === selectedMarket;
            const matchesBrand =
                !brandFilter ||
                p.brand.toLowerCase().includes(brandFilter.toLowerCase());
            return matchesGlobalFilters && matchesSearch && matchesMarket && matchesBrand;
        });

        const groups = new Map<string, Row>();

        filtered.forEach((p) => {
            const key = `${p.brand}::${p.name}`;
            if (!groups.has(key)) {
                groups.set(key, {
                    key,
                    brand: p.brand,
                    name: p.name,
                    category: p.category,
                    market: p.market as "PL" | "CZ",
                    retailers: {},
                    yourStoreRetailer: yourStore,
                    isBenchmark: isBenchmarkProduct(p),
                });
            }
            const row = groups.get(key)!;
            const isActive = p.fromDate <= today && p.toDate >= today;
            row.retailers[p.retailer] = {
                active: isActive,
                discount: p.competitorDiscount,
                price: p.price,
                priceAfterDiscount: p.priceAfterDiscount,
                fromDate: p.fromDate,
                toDate: p.toDate,
                isYourStore:
                    p.retailer === YOUR_STORE_PL || p.retailer === YOUR_STORE_CZ,
            };
        });

        // Only active data — a row qualifies if at least one retailer's
        // offer is currently running.
        let result = Array.from(groups.values()).filter((row) => {
            const cells = retailers.map((r) => row.retailers[r]);
            return cells.some((c) => c?.active);
        });

        return result.sort((a, b) => {
            if (a.isBenchmark !== b.isBenchmark) return a.isBenchmark ? -1 : 1;
            return a.brand === b.brand
                ? a.name.localeCompare(b.name)
                : a.brand.localeCompare(b.brand);
        });
    }, [products, filters, search, brandFilter, selectedMarket, retailers, yourStore]);

    const pageCount = Math.max(1, Math.ceil(rows.length / ROWS_PER_PAGE));
    const visibleRows = rows.slice(
        (page - 1) * ROWS_PER_PAGE,
        page * ROWS_PER_PAGE,
    );

    React.useEffect(() => {
        if (filters.market === "CZ" || filters.market === "PL") {
            setSelectedMarket(filters.market);
        }
    }, [filters.market]);

    React.useEffect(() => {
        setPage(1);
    }, [search, brandFilter, selectedMarket, filters]);

    React.useEffect(() => {
        if (page > pageCount) setPage(pageCount);
    }, [page, pageCount]);

    // Colors the discount % by its rank among every active offer in that
    // row (including Sephora's own) — the deepest discount in the row is
    // green, the shallowest is red, everything between is interpolated on
    // the same red-to-green gradient. Replaces the old "vs Sephora only"
    // scheme, which couldn't show how competitors ranked against each
    // other, only against Sephora.
    const rankColor = (t: number) => {
        const hue = Math.round(Math.max(0, Math.min(1, t)) * 120); // 0=red, 120=green
        return {
            bg: `hsl(${hue}, 75%, 92%)`,
            color: `hsl(${hue}, 65%, 28%)`,
        };
    };

    const renderCell = (
        cell: RetailerCell | undefined,
        isYourStore: boolean,
        rowMin: number | undefined,
        rowMax: number | undefined,
    ) => {
        if (!cell) {
            return (
                <Typography sx={{ fontSize: 13, color: "#cbd0dd", fontWeight: 600 }}>
                    -
                </Typography>
            );
        }

        let bg = "#eef1f6";
        let color = "#525b75";
        let icon = <TrendingFlatRounded sx={{ fontSize: 12 }} />;

        if (!cell.active) {
            bg = "#f2f2f2";
            color = "#9fa6bc";
            icon = <ScheduleRounded sx={{ fontSize: 12 }} />;
        } else if (rowMin !== undefined && rowMax !== undefined) {
            const t = rowMax === rowMin ? 0.5 : (cell.discount - rowMin) / (rowMax - rowMin);
            ({ bg, color } = rankColor(t));
            icon =
                cell.discount === rowMax ? (
                    <TrendingUpRounded sx={{ fontSize: 12 }} />
                ) : cell.discount === rowMin ? (
                    <TrendingDownRounded sx={{ fontSize: 12 }} />
                ) : (
                    <TrendingFlatRounded sx={{ fontSize: 12 }} />
                );
        }

        return (
            <Box className="flex flex-col items-center justify-center gap-0.5 py-1">
                <Box
                    className="inline-flex items-center gap-0.5 rounded-full"
                    sx={{ px: 1, py: 0.3, backgroundColor: bg, color }}
                >
                    {isYourStore && <StorefrontRounded sx={{ fontSize: 12 }} />}
                    {icon}
                    <Typography
                        sx={{ fontSize: "11px", fontWeight: 800, lineHeight: 1.2 }}
                    >
                        -{cell.discount}%
                    </Typography>
                </Box>
                <Typography sx={{ fontSize: "10.5px", fontWeight: 500, color: "#525b75" }}>
                    {cell.priceAfterDiscount}
                </Typography>
            </Box>
        );
    };

    return (
        <Card
            elevation={0}
            className="rounded-2xl border border-[#e3e6ed] bg-white"
            sx={{ overflow: "hidden" }}
        >
            <CardContent sx={{ p: { xs: 2, sm: 3.5 } }}>
                {/* Header Section */}
                <Box className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
                    <Box>
                        <Box className="flex items-center gap-2 mb-1">
                            <StorefrontRounded sx={{ color: "#000000", fontSize: 18 }} />
                            <Typography sx={{ fontSize: 17, fontWeight: 800, color: "#141824", letterSpacing: "-0.3px" }}>
                                Brand × Retailer Comparison
                            </Typography>
                        </Box>
                        <Typography sx={{ fontSize: 13, color: "#525b75" }}>
                            Discount % is colored by rank within each row: the deepest active offer is green, the shallowest is red, with everything else shaded in between. Grey cells are expired offers.
                        </Typography>
                    </Box>
                </Box>

                {/* Filters Section */}
                <Box className="flex flex-wrap items-center gap-3 mb-5 pb-4 border-b border-[#e3e6ed]">
                    <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={selectedMarket}
                        onChange={(_, val) => val && setSelectedMarket(val as MarketFilter)}
                        sx={{
                            backgroundColor: "#ffffff",
                            p: "2px",
                            borderRadius: "8px",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                            "& .MuiToggleButton-root": {
                                border: 0,
                                borderRadius: "6px",
                                textTransform: "none",
                                fontWeight: 500,
                                fontSize: "12px",
                                px: 2,
                                py: 0.5,
                                color: "#525b75",
                                "&.Mui-selected": {
                                    backgroundColor: "#000000",
                                    color: "#ffffff",
                                    "&:hover": { backgroundColor: "#333333" },
                                },
                            },
                        }}
                    >
                        <ToggleButton value="PL">Poland (PL)</ToggleButton>
                        <ToggleButton value="CZ">Czechia (CZ)</ToggleButton>
                    </ToggleButtonGroup>

                    <TextField
                        size="small"
                        placeholder="Search product or brand..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchRounded sx={{ color: "#9fa6bc", fontSize: 18 }} />
                                    </InputAdornment>
                                ),
                            },
                        }}
                        sx={{
                            minWidth: 220,
                            backgroundColor: "#ffffff",
                            "& .MuiOutlinedInput-root": {
                                borderRadius: "8px",
                                fontSize: "13px",
                                "& fieldset": { borderColor: "#cbd0dd" },
                            },
                        }}
                    />

                    <TextField
                        size="small"
                        placeholder="Filter by brand"
                        value={brandFilter}
                        onChange={(e) => setBrandFilter(e.target.value)}
                        sx={{
                            minWidth: 160,
                            backgroundColor: "#ffffff",
                            "& .MuiOutlinedInput-root": {
                                borderRadius: "8px",
                                fontSize: "13px",
                                "& fieldset": { borderColor: "#cbd0dd" },
                            },
                        }}
                    />
                </Box>

                {/* Table Section */}
                <TableContainer
                    component={Paper}
                    elevation={0}
                    sx={{
                        maxHeight: 620,
                        boxShadow: "none",
                        backgroundColor: "transparent",
                    }}
                >
                    <Table stickyHeader size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell
                                    sx={{
                                        fontWeight: 700,
                                        backgroundColor: "#ffffff",
                                        color: "#525b75",
                                        minWidth: 140,
                                        borderBottom: "1px solid #e3e6ed",
                                        fontSize: "11px",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.5px",
                                    }}
                                >
                                    <Box className="flex items-center gap-0.5">
                                        Brand
                                        <UnfoldMoreRounded sx={{ fontSize: 14, color: "#9fa6bc" }} />
                                    </Box>
                                </TableCell>
                                <TableCell
                                    sx={{
                                        fontWeight: 700,
                                        backgroundColor: "#ffffff",
                                        color: "#525b75",
                                        minWidth: 200,
                                        borderBottom: "1px solid #e3e6ed",
                                        fontSize: "11px",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.5px",
                                    }}
                                >
                                    <Box className="flex items-center gap-0.5">
                                        Product
                                        <UnfoldMoreRounded sx={{ fontSize: 14, color: "#9fa6bc" }} />
                                    </Box>
                                </TableCell>
                                {retailers.map((r) => {
                                    const isYour = r === yourStore;
                                    return (
                                        <TableCell
                                            key={r}
                                            align="center"
                                            sx={{
                                                fontWeight: 700,
                                                minWidth: 110,
                                                backgroundColor: isYour ? "#f2f2f2" : "#ffffff",
                                                color: isYour ? "#000000" : "#525b75",
                                                borderBottom: isYour ? "1px solid #cfe0ff" : "1px solid #e3e6ed",
                                                fontSize: "10.5px",
                                                letterSpacing: "0.3px",
                                            }}
                                        >
                                            {isYour ? `${r.toUpperCase()} (YOU)` : r.toUpperCase()}
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {visibleRows.map((row) => {
                                const activeDiscounts = retailers
                                    .map((r) => row.retailers[r])
                                    .filter((c): c is RetailerCell => !!c && c.active)
                                    .map((c) => c.discount);
                                const rowMin = activeDiscounts.length
                                    ? Math.min(...activeDiscounts)
                                    : undefined;
                                const rowMax = activeDiscounts.length
                                    ? Math.max(...activeDiscounts)
                                    : undefined;

                                return (
                                <TableRow
                                    key={row.key}
                                    sx={{
                                        "&:hover": { backgroundColor: "#f5f7fa" },
                                        transition: "background-color 0.15s ease",
                                        "& .MuiTableCell-root": { borderBottom: "1px solid #eff2f6" },
                                    }}
                                >
                                    <TableCell>
                                        <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: "#000000" }}>
                                            {row.brand}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Box className="flex items-center gap-1">
                                            <Typography sx={{ fontSize: 12.5, fontWeight: 500, color: "#141824" }}>
                                                {row.name}
                                            </Typography>
                                        </Box>
                                        <Typography sx={{ fontSize: 11, color: "#525b75", fontWeight: 500 }}>
                                            {row.category} • <span style={{ fontWeight: 500 }}>{row.market}</span>
                                        </Typography>
                                    </TableCell>
                                    {retailers.map((r) => {
                                        const cell = row.retailers[r];
                                        const isYour = r === yourStore;

                                        return (
                                            <TableCell
                                                key={r}
                                                align="center"
                                                sx={{
                                                    backgroundColor: isYour ? "rgba(0,0,0,0.04)" : "transparent",
                                                    px: 1,
                                                    py: 1,
                                                }}
                                            >
                                                {renderCell(cell, isYour, rowMin, rowMax)}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                                );
                            })}
                            {rows.length === 0 && (
                                <TableRow>
                                    <TableCell
                                        colSpan={retailers.length + 2}
                                        align="center"
                                        sx={{ py: 8, borderBottom: "none" }}
                                    >
                                        <Typography sx={{ color: "#525b75", fontSize: 13, fontWeight: 500 }}>
                                            No products match your filters.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {rows.length > 0 && (
                    <AppPagination
                        count={pageCount}
                        page={page}
                        onChange={setPage}
                        total={rows.length}
                        pageSize={ROWS_PER_PAGE}
                        itemLabel={`products across ${retailers.length} retailer${retailers.length === 1 ? "" : "s"}`}
                    />
                )}
            </CardContent>
        </Card>
    );
};

export default BrandComparisonTable;