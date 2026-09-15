import {
  AddRounded,
  DeleteOutlineRounded,
  DownloadRounded,
  EditRounded,
  SearchRounded,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  Chip,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { matchesPromotionFilters, useAppContext } from "../../context/AppContext";
import AppPagination from "../../components/AppPagination";
import PromotionFormModal from "../../components/PromotionFormModal";

const today = new Date().toISOString().slice(0, 10);
const fallbackImage =
  "https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=900&q=80";

export default function Promotions() {
  const {
    addPromotion,
    updatePromotion,
    deletePromotion,
    canEdit,
    filters,
    lastAddedProduct,
    products: catalog,
    promotions,
    showToast,
  } = useAppContext();
  const [formOpen, setFormOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<any | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [savedPage, setSavedPage] = useState(1);
  const pageSize = 10;
  const savedPageSize = 10;

  async function handleDelete(id: string) {
    try {
      await deletePromotion(id);
      showToast("Promotion deleted successfully.");
    } catch (err) {
      showToast("Unable to delete. The database may be unavailable.", "error");
    }
  }

  const filteredProducts = useMemo(
    () =>
      catalog
        .filter((product) => {
          return (
            (product.name.toLowerCase().includes(search.toLowerCase()) ||
              product.brand.toLowerCase().includes(search.toLowerCase()) ||
              product.category.toLowerCase().includes(search.toLowerCase())) &&
            matchesPromotionFilters(product, filters)
          );
        })
        .sort((a, b) => {
          const aActive = a.toDate >= today;
          const bActive = b.toDate >= today;
          if (aActive !== bActive) {
            return aActive ? -1 : 1;
          }
          return b.toDate.localeCompare(a.toDate);
        }),
    [catalog, filters, search],
  );
  const visibleProducts = filteredProducts.slice(
    (page - 1) * pageSize,
    page * pageSize,
  );
  const savedPromotions = promotions
    .filter(
      (promotion) => {
        const searchValue = filters.search.trim().toLowerCase();
        const minimumDiscount =
          filters.discount === "All"
            ? 0
            : Number(filters.discount.replace("%+", ""));
        const discount = Number(promotion.discount.match(/\d+(?:\.\d+)?/)?.[0] || 0);
        return (
          (!searchValue ||
            promotion.name.toLowerCase().includes(searchValue) ||
            promotion.brands.toLowerCase().includes(searchValue)) &&
          (filters.market === "All" || promotion.market === filters.market) &&
          (filters.category === "All" || promotion.category === filters.category) &&
          (filters.retailer === "All" || promotion.retailer === filters.retailer) &&
          discount >= minimumDiscount &&
          (!filters.fromDate || promotion.from >= filters.fromDate) &&
          (!filters.toDate || promotion.to <= filters.toDate)
        );
      },
    )
    .sort((a, b) => {
      const aActive = a.to >= today;
      const bActive = b.to >= today;
      if (aActive !== bActive) {
        return aActive ? -1 : 1;
      }
      return b.to.localeCompare(a.to);
    });
  const visibleSavedPromotions = savedPromotions.slice(
    (savedPage - 1) * savedPageSize,
    savedPage * savedPageSize,
  );
  const downloadUpdatedProducts = () => {
    if (!catalog || !Array.isArray(catalog) || catalog.length === 0) {
      return;
    }
    const headers = Object.keys(catalog[0]);
    const table = ` <table border="1"> <thead> <tr> ${headers.map((header) => `<th>${String(header)}</th>`).join("")} </tr> </thead> <tbody> ${catalog.map((product) => ` <tr> ${headers.map((header) => `<td>${String(product[header as keyof typeof product] ?? "")}</td>`).join("")} </tr> `).join("")} </tbody> </table> `;
    const blob = new Blob([table], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "products.updated.xls";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  useEffect(() => {
    setPage(1);
    setSavedPage(1);
  }, [filters]);

  return (
    <Box className="flex flex-col gap-5">
      <Box className="flex flex-wrap items-center justify-between gap-3">
        <Box>
          <Typography
            sx={{
              color: "#20242b",
              fontSize: 16,
              fontWeight: 500,
              letterSpacing: "-0.01em",
            }}
          >
            Promotion Workspace
          </Typography>
          <Typography sx={{ color: "#737b88", fontSize: 13, mt: 0.5 }}>
            Browse products, track discounts, and manage competitive beauty
            campaigns.
          </Typography>
        </Box>
        <Box className="flex gap-2">
          {canEdit && (
            <Button
              variant="contained"
              startIcon={<AddRounded />}
              onClick={() => setFormOpen(true)}
              sx={{
                backgroundColor: "#22252b",
                color: "#ffffff",
                textTransform: "none",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: 13,
                px: 2.5,
                "&:hover": {
                  backgroundColor: "#343942",
                },
              }}
            >
              Add promotion
            </Button>
          )}
        </Box>
      </Box>
      <Card
        elevation={0}
        className="rounded-2xl border border-[#e7eaee] bg-white"
      >
        <Box className="border-b border-[#e7eaee] p-4">
          <TextField
            size="small"
            placeholder="Search products, brands, or categories"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            slotProps={{
              input: {
                startAdornment: (
                  <SearchRounded sx={{ color: "#a0a8b3", mr: 1 }} />
                ),
              },
            }}
            sx={{ minWidth: 320 }}
          />
        </Box>
        <Box className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-5">
          {visibleProducts.map((product) => {
            const expired = product.toDate < today;
            return (
              <Card
                key={product.id}
                component={Link}
                to={`/products/${product.id}`}
                elevation={0}
                className="overflow-hidden rounded-2xl border border-[#e7eaee] no-underline transition-all hover:border-[#4f82f7] hover:shadow-md bg-white"
              >
                <Box className="relative h-36 bg-[#f4f6f8]">
                  <img
                    src={product.image || fallbackImage}
                    alt={product.name}
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.onerror = null;
                      event.currentTarget.src = fallbackImage;
                    }}
                  />
                  <Box className="absolute left-2 top-2">
                    <Chip
                      label={expired ? "Expired" : "Active"}
                      size="small"
                      sx={{
                        backgroundColor: expired ? "#eef1f4" : "#22252b",
                        color: expired ? "#737b88" : "#ffffff",
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        borderRadius: "4px",
                      }}
                    />
                  </Box>
                  <Box className="absolute right-2 top-2 flex items-center gap-1">
                    {!expired && canEdit && (
                      <IconButton
                        size="small"
                        title="Edit promotion"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setEditingPromotion({
                            ...product,
                            id: product.id,
                            market: product.market,
                            name: product.promotionName || product.name,
                            from: product.fromDate,
                            to: product.toDate,
                            scope: "Wielokanałowa",
                            channel: "Sklep stacjonarny",
                            category: product.category,
                            brands: product.brand,
                            retailer: product.retailer,
                            discount: `-${product.competitorDiscount}%`,
                            threshold: "",
                            promoPrice: String(product.priceAfterDiscount ?? product.price ?? ""),
                            promotionType: product.promotionType || "Fixed promotion",
                            skuCount: 1,
                            notes: product.terms || product.description || "",
                            creativeName: product.name,
                            creativeData: product.image || "",
                            averageMarketDiscount: `${product.competitorDiscount}%`,
                            createdAt: product.fromDate,
                          });
                          setFormOpen(true);
                        }}
                        sx={{
                          backgroundColor: "rgba(255,255,255,0.95)",
                          color: "#20242b",
                          padding: "4px",
                          borderRadius: "6px",
                          "&:hover": { backgroundColor: "#f5f8ff", color: "#4f82f7" },
                        }}
                      >
                        <EditRounded sx={{ fontSize: 16 }} />
                      </IconButton>
                    )}
                    {expired && canEdit && (
                      <IconButton
                        size="small"
                        title="Delete expired promotion"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          handleDelete(product.id);
                        }}
                        sx={{
                          backgroundColor: "rgba(255,255,255,0.95)",
                          color: "#e5484d",
                          padding: "4px",
                          borderRadius: "6px",
                          "&:hover": { backgroundColor: "#fdecec" },
                        }}
                      >
                        <DeleteOutlineRounded sx={{ fontSize: 16 }} />
                      </IconButton>
                    )}
                    <Box className="rounded-md bg-[#f3873a] px-2 py-0.5 shadow-sm">
                      <Typography
                        sx={{ color: "#ffffff", fontSize: 11, fontWeight: 800 }}
                      >
                        -{product.competitorDiscount}%
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                <Box className="p-3">
                  <Typography
                    sx={{
                      color: "#737b88",
                      fontSize: 10,
                      fontWeight: 500,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}
                  >
                    {product.brand}
                  </Typography>
                  <Typography
                    sx={{
                      color: "#20242b",
                      fontSize: 13,
                      fontWeight: 500,
                      lineHeight: 1.3,
                      mt: 0.25,
                    }}
                  >
                    {product.name}
                  </Typography>
                  <Typography sx={{ color: "#737b88", fontSize: 11, mt: 0.5 }}>
                    {product.category} · {product.retailer}
                  </Typography>
                  <Typography
                    sx={{
                      color: expired ? "#737b88" : "#4f82f7",
                      fontSize: 11,
                      fontWeight: 700,
                      mt: 1,
                    }}
                  >
                    {expired
                      ? `Expired ${product.toDate}`
                      : `Ends ${product.toDate}`}
                  </Typography>
                </Box>
              </Card>
            );
          })}
        </Box>
        <AppPagination
          count={Math.ceil(filteredProducts.length / pageSize)}
          page={page}
          onChange={setPage}
          total={filteredProducts.length}
          pageSize={pageSize}
          itemLabel="products"
        />
      </Card>
      {promotions.length > 0 && (
        <Card
          elevation={0}
          className="rounded-2xl border border-[#e7eaee] bg-white"
        >
          <Box className="p-4 border-b border-[#e7eaee]">
            <Box className="flex flex-wrap items-start justify-between gap-3">
              <Box>
                <Typography
                  sx={{ color: "#20242b", fontSize: 16, fontWeight: 500 }}
                >
                  Saved Promotions
                </Typography>
                <Typography sx={{ color: "#737b88", fontSize: 12.5, mt: 0.5 }}>
                  Campaigns added via the form, saved in Polish.
                </Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadRounded />}
                onClick={downloadUpdatedProducts}
                sx={{
                  borderColor: "#dce1e8",
                  color: "#20242b",
                  fontWeight: 700,
                  fontSize: 12.5,
                  textTransform: "none",
                  "&:hover": {
                    borderColor: "#4f82f7",
                    backgroundColor: "#f5f8ff",
                  },
                }}
              >
                Download
              </Button>
            </Box>
          </Box>
          {lastAddedProduct && (
            <Box className="m-4 rounded-xl border border-[#e7eaee] bg-[#eaf1ff] p-4">
              <Typography
                sx={{
                  color: "#3b6fed",
                  fontSize: 11,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Ostatnio zaktualizowany rekord
              </Typography>
              <Typography
                sx={{
                  color: "#20242b",
                  fontSize: 14,
                  fontWeight: 800,
                  mt: 0.5,
                }}
              >
                {lastAddedProduct.id} · {lastAddedProduct.name}
              </Typography>
              <Typography sx={{ color: "#737b88", fontSize: 12, mt: 0.5 }}>
                {lastAddedProduct.market} · {lastAddedProduct.brand} ·{" "}
                {lastAddedProduct.retailer} · {lastAddedProduct.fromDate} -{" "}
                {lastAddedProduct.toDate} · -
                {lastAddedProduct.competitorDiscount}%
              </Typography>
            </Box>
          )}
          <Box className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
            {visibleSavedPromotions.map((promotion) => {
              const isExpired = promotion.to < today;
              return (
                <Box
                  key={promotion.id}
                  className="rounded-xl border border-[#e7eaee] p-4 bg-white hover:border-[#4f82f7] transition-all"
                >
                  <Box className="flex items-start justify-between gap-3">
                    <Box>
                      <Typography
                        sx={{ color: "#20242b", fontSize: 13.5, fontWeight: 500 }}
                      >
                        {promotion.name}
                      </Typography>
                      <Typography
                        sx={{ color: "#737b88", fontSize: 11.5, mt: 0.5 }}
                      >
                        {promotion.brands} · {promotion.retailer}
                      </Typography>
                    </Box>
                    <Box className="flex items-center gap-1">
                      {!isExpired && canEdit && (
                        <IconButton
                          size="small"
                          title="Edit promotion"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setEditingPromotion(promotion);
                            setFormOpen(true);
                          }}
                          sx={{
                            color: "#20242b",
                            backgroundColor: "#eef1f4",
                            borderRadius: "6px",
                            "&:hover": { backgroundColor: "#e7eaee" },
                          }}
                        >
                          <EditRounded sx={{ fontSize: 16 }} />
                        </IconButton>
                      )}
                      {isExpired && canEdit && (
                        <IconButton
                          size="small"
                          title="Delete expired promotion"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            handleDelete(promotion.id);
                          }}
                          sx={{
                            color: "#e5484d",
                            backgroundColor: "#fdecec",
                            borderRadius: "6px",
                            "&:hover": { backgroundColor: "#fbdada" },
                          }}
                        >
                          <DeleteOutlineRounded sx={{ fontSize: 16 }} />
                        </IconButton>
                      )}
                    </Box>
                  </Box>
                  <Typography sx={{ color: "#737b88", fontSize: 12, mt: 1 }}>
                    {promotion.from} - {promotion.to} · {promotion.category}
                  </Typography>
                  <Chip
                    label={promotion.discount}
                    size="small"
                    sx={{
                      mt: 1.5,
                      backgroundColor: "#f3873a",
                      color: "#ffffff",
                      fontWeight: 800,
                      borderRadius: "6px",
                    }}
                  />
                </Box>
              );
            })}
          </Box>
          <AppPagination
            count={Math.ceil(savedPromotions.length / savedPageSize)}
            page={savedPage}
            onChange={setSavedPage}
            total={savedPromotions.length}
            pageSize={savedPageSize}
            itemLabel="saved promotions"
          />
        </Card>
      )}
      <PromotionFormModal
        open={formOpen}
        editingPromotion={editingPromotion}
        onClose={() => {
          setFormOpen(false);
          setEditingPromotion(null);
        }}
        onSave={async (promotion) => {
          try {
            if (editingPromotion) {
              await updatePromotion(editingPromotion.id, promotion);
            } else {
              await addPromotion(promotion);
            }
            showToast(editingPromotion ? "Promotion updated successfully." : "Promotion saved successfully.");
            setFormOpen(false);
            setEditingPromotion(null);
          } catch (err) {
            showToast("Unable to save. The database may be unavailable.", "error");
          }
        }}
      />
    </Box>
  );
}
