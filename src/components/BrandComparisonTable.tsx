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
    CheckRounded,
    ScheduleRounded,
} from "@mui/icons-material";
import { matchesPromotionFilters, useAppContext } from "../context/AppContext";
import { getMarketRetailers } from "../data/retailers";

const today = new Date().toISOString().slice(0, 10);

const YOUR_STORE_PL = "sephora";
const YOUR_STORE_CZ = "CZ Demo Store Prague";

type StatusFilter = "all" | "active" | "expired";
type MarketFilter = "All" | "PL" | "CZ";

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
}

const BrandComparisonTable = () => {
    const { products, filters } = useAppContext();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [brandFilter, setBrandFilter] = useState("");
    const [selectedMarket, setSelectedMarket] = useState<MarketFilter>(
        (filters.market as MarketFilter) || "All"
    );

    const yourStore = selectedMarket === "CZ" ? YOUR_STORE_CZ : YOUR_STORE_PL;

    const retailers = useMemo(() => {
        const all =
            selectedMarket === "All"
                ? [
                    ...getMarketRetailers("PL"),
                    ...getMarketRetailers("CZ"),
                ]
                : getMarketRetailers(selectedMarket as "PL" | "CZ");
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
            const matchesMarket =
                selectedMarket === "All" || p.market === selectedMarket;
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

        let result = Array.from(groups.values());

        if (statusFilter !== "all") {
            result = result.filter((row) => {
                const cells = retailers.map((r) => row.retailers[r]);
                if (statusFilter === "active") return cells.some((c) => c?.active);
                if (statusFilter === "expired")
                    return cells.some((c) => c && !c.active);
                return true;
            });
        }

        return result.sort((a, b) =>
            a.brand === b.brand
                ? a.name.localeCompare(b.name)
                : a.brand.localeCompare(b.brand)
        );
    }, [products, filters, search, brandFilter, selectedMarket, retailers, statusFilter, yourStore]);

    React.useEffect(() => {
        setSelectedMarket(filters.market as MarketFilter);
    }, [filters.market]);

    const renderCell = (cell: RetailerCell | undefined) => {
        if (!cell) {
            return (
                <Typography sx={{ fontSize: 13, color: "#cbd0dd", fontWeight: 600 }}>
                    —
                </Typography>
            );
        }

        return (
            <Box className="flex flex-col items-center justify-center gap-0.5 py-1">
                <Box
                    className="inline-flex items-center gap-0.5 rounded-full"
                    sx={{
                        px: 1,
                        py: 0.3,
                        backgroundColor: cell.active ? "#d9fbd0" : "#ffe2dc",
                        color: cell.active ? "#1c6c09" : "#c92e13",
                    }}
                >
                    {cell.active ? (
                        <CheckRounded sx={{ fontSize: 12 }} />
                    ) : (
                        <ScheduleRounded sx={{ fontSize: 12 }} />
                    )}
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
                            <StorefrontRounded sx={{ color: "#3874ff", fontSize: 18 }} />
                            <Typography sx={{ fontSize: 17, fontWeight: 800, color: "#141824", letterSpacing: "-0.3px" }}>
                                Brand × Retailer Comparison
                            </Typography>
                        </Box>
                        <Typography sx={{ fontSize: 13, color: "#525b75" }}>
                            Overview of promotions across retailers. Active deals have a green background and expired deals have a red background.
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
                                    backgroundColor: "#3874ff",
                                    color: "#ffffff",
                                    "&:hover": { backgroundColor: "#2c5fd6" },
                                },
                            },
                        }}
                    >
                        <ToggleButton value="All">All Markets</ToggleButton>
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

                    <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={statusFilter}
                        onChange={(_, v) => v && setStatusFilter(v)}
                        sx={{
                            backgroundColor: "#ffffff",
                            p: "2px",
                            borderRadius: "8px",
                            ml: "auto",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                            "& .MuiToggleButton-root": {
                                border: 0,
                                borderRadius: "6px",
                                textTransform: "none",
                                fontWeight: 500,
                                fontSize: "12px",
                                px: 1.8,
                                py: 0.5,
                                color: "#525b75",
                                "&.Mui-selected": {
                                    backgroundColor: "#3874ff",
                                    color: "#ffffff",
                                    "&:hover": { backgroundColor: "#2c5fd6" },
                                },
                            },
                        }}
                    >
                        <ToggleButton value="all">All</ToggleButton>
                        <ToggleButton value="active">Active</ToggleButton>
                        <ToggleButton value="expired">Expired</ToggleButton>
                    </ToggleButtonGroup>
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
                                                backgroundColor: isYour ? "#eaf1ff" : "#ffffff",
                                                color: isYour ? "#3874ff" : "#525b75",
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
                            {rows.map((row) => (
                                <TableRow
                                    key={row.key}
                                    sx={{
                                        "&:hover": { backgroundColor: "#f5f7fa" },
                                        transition: "background-color 0.15s ease",
                                        "& .MuiTableCell-root": { borderBottom: "1px solid #eff2f6" },
                                    }}
                                >
                                    <TableCell>
                                        <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: "#3874ff" }}>
                                            {row.brand}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Typography sx={{ fontSize: 12.5, fontWeight: 500, color: "#141824" }}>
                                            {row.name}
                                        </Typography>
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
                                                    backgroundColor: isYour ? "rgba(56,116,255,0.04)" : "transparent",
                                                    px: 1,
                                                    py: 1,
                                                }}
                                            >
                                                {renderCell(cell)}
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ))}
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
                    <Box className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-[#e3e6ed]">
                        <Typography sx={{ fontSize: 12, color: "#525b75", fontWeight: 500 }}>
                            Showing {rows.length} product{rows.length === 1 ? "" : "s"} across {retailers.length} retailer{retailers.length === 1 ? "" : "s"}
                        </Typography>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};

export default BrandComparisonTable;