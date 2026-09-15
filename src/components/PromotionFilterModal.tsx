import { CloseRounded, FilterAltRounded } from "@mui/icons-material";
import { Box, Button, Modal } from "@mui/material";
import {
  emptyPromotionFilters,
  PromotionFilters,
  useAppContext,
} from "../context/AppContext";
import FormField from "./FormField";
import { useEffect, useState } from "react";

const getVisibleRetailerNames = (
  retailers: { name: string; market: "PL" | "CZ" }[],
  market: string,
) => {
  const names = retailers
    .filter((r) => market === "All" || r.market === market)
    .map((r) => r.name);
  return ["All", ...names];
};
const discounts = ["All", "10%+", "20%+", "25%+", "30%+"];
const options = (values: string[]) =>
  values.map((value) => ({ label: value, value }));

export default function PromotionFilterModal({
  open,
  filters,
  onClose,
  onApply,
}: {
  open: boolean;
  filters: PromotionFilters;
  onClose: () => void;
  onApply: (filters: PromotionFilters) => void;
}) {
  const { retailers, categories } = useAppContext();
  const [draftFilters, setDraftFilters] = useState(filters);

  useEffect(() => {
    if (open) setDraftFilters(filters);
  }, [filters, open]);

  const update = (
    field: keyof PromotionFilters,
    value: string | number | string[],
  ) => setDraftFilters((current) => ({ ...current, [field]: String(value) }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="promotion-filter-title"
    >
      <Box className="absolute left-1/2 top-1/2 w-[calc(100%-32px)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-5 shadow-2xl border border-[#e3e6ed]">
        <Box
          className="mb-4 flex items-start justify-between gap-4 border-b border-[#e3e6ed] pb-3"
          id="promotion-filter-title"
        >
          <Box>
            <Box className="flex items-center gap-2">
              <FilterAltRounded sx={{ color: "#3874ff" }} />
              <span className="font-bold text-[#141824] text-base tracking-tight">
                Promotion Filters
              </span>
            </Box>
            <span className="text-xs text-[#525b75] mt-0.5 block">
              Filter products, campaigns, and store offers across Sephora &
              competitors.
            </span>
          </Box>
          <Button onClick={onClose} sx={{ minWidth: 40, color: "#141824" }}>
            <CloseRounded />
          </Button>
        </Box>
        <Box className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            className="sm:col-span-2"
            label="Product or brand"
            placeholder="Search product name or brand"
            value={draftFilters.search}
            onValueChange={(value) => update("search", value)}
          />
          <FormField
            type="select"
            label="Product category"
            value={draftFilters.category}
            onValueChange={(value) => update("category", value)}
            options={options(["All", ...categories.map((c) => c.name)])}
          />
          <FormField
            type="select"
            label="Retailer / store"
            value={draftFilters.retailer}
            onValueChange={(value) => update("retailer", value)}
            options={options(getVisibleRetailerNames(retailers, draftFilters.market))}
          />
          <FormField
            type="select"
            label="Discount level"
            value={draftFilters.discount}
            onValueChange={(value) => update("discount", value)}
            options={options(discounts)}
          />
          <FormField
            type="select"
            label="Market"
            value={draftFilters.market}
            onValueChange={(value) => update("market", value)}
            options={options(["All", "PL", "CZ"])}
          />
          <FormField
            type="date"
            label="Start date"
            value={draftFilters.fromDate}
            onValueChange={(value) => update("fromDate", value)}
          />
          <FormField
            type="date"
            label="End date"
            value={draftFilters.toDate}
            onValueChange={(value) => update("toDate", value)}
          />
        </Box>
        <Box className="mt-5 flex justify-end gap-2 border-t border-[#e3e6ed] pt-4">
          <Button
            onClick={() => {
              onApply(emptyPromotionFilters);
              onClose();
            }}
            sx={{
              color: "#525b75",
              textTransform: "none",
              fontWeight: 600,
              fontSize: 13,
              "&:hover": { color: "#141824", backgroundColor: "#f5f7fa" },
            }}
          >
            Clear filters
          </Button>
          <Button
            onClick={() => {
              onApply(draftFilters);
              onClose();
            }}
            variant="contained"
            sx={{
              backgroundColor: "#141824",
              color: "#ffffff",
              textTransform: "none",
              fontWeight: 700,
              fontSize: 13,
              px: 3,
              "&:hover": { backgroundColor: "#31374a" },
            }}
          >
            Apply filters
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}
