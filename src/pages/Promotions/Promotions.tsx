import {
  AddRounded,
  DeleteOutlineRounded,
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
    products: catalog,
    showToast,
  } = useAppContext();
  const [formOpen, setFormOpen] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

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

  useEffect(() => {
    setPage(1);
  }, [filters]);

  return (
    <Box className="flex flex-col gap-5">
      <Box className="flex flex-wrap items-center justify-between gap-3">
        <Box>
          <Typography
            sx={{
              color: "#141824",
              fontSize: 16,
              fontWeight: 500,
              letterSpacing: "-0.01em",
            }}
          >
            Promotion Workspace
          </Typography>
          <Typography sx={{ color: "#525b75", fontSize: 13, mt: 0.5 }}>
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
                backgroundColor: "#141824",
                color: "#ffffff",
                textTransform: "none",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: 13,
                px: 2.5,
                "&:hover": {
                  backgroundColor: "#31374a",
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
        className="rounded-2xl border border-[#e3e6ed] bg-white"
      >
        <Box className="border-b border-[#e3e6ed] p-4">
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
                  <SearchRounded sx={{ color: "#9fa6bc", mr: 1 }} />
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
                className="overflow-hidden rounded-2xl border border-[#e3e6ed] no-underline transition-all hover:border-[#3874ff] hover:shadow-md bg-white"
              >
                <Box className="relative h-36 bg-[#f5f7fa]">
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
                        backgroundColor: expired ? "#eff2f6" : "#141824",
                        color: expired ? "#525b75" : "#ffffff",
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
                          color: "#141824",
                          padding: "4px",
                          borderRadius: "6px",
                          "&:hover": { backgroundColor: "#eaf1ff", color: "#3874ff" },
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
                          color: "#fa3b1d",
                          padding: "4px",
                          borderRadius: "6px",
                          "&:hover": { backgroundColor: "#ffe2dc" },
                        }}
                      >
                        <DeleteOutlineRounded sx={{ fontSize: 16 }} />
                      </IconButton>
                    )}
                    <Box className="rounded-md bg-[#e5780b] px-2 py-0.5 shadow-sm">
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
                      color: "#525b75",
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
                      color: "#141824",
                      fontSize: 13,
                      fontWeight: 500,
                      lineHeight: 1.3,
                      mt: 0.25,
                    }}
                  >
                    {product.name}
                  </Typography>
                  <Typography sx={{ color: "#525b75", fontSize: 11, mt: 0.5 }}>
                    {product.category} · {product.retailer}
                  </Typography>
                  <Typography
                    sx={{
                      color: expired ? "#525b75" : "#3874ff",
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
