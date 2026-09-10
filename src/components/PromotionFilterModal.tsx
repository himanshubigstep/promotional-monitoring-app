import { CloseRounded, FilterAltRounded } from "@mui/icons-material";
import { Box, Button, Modal } from "@mui/material";
import {
  emptyPromotionFilters,
  filterYears,
  getYearFilterValue,
  PromotionFilters,
} from "../context/AppContext";
import FormField from "./FormField";
import { czDummyRetailers, plRetailers } from "../data/retailers";

const categories = ["All", "Skincare", "Fragrance", "Makeup", "Haircare"];
const getVisibleRetailers = (market: string) => {
  if (market === "CZ") return ["All", ...czDummyRetailers];
  if (market === "PL") return ["All", ...plRetailers];
  return ["All", ...plRetailers, ...czDummyRetailers];
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
  const update = (
    field: keyof PromotionFilters,
    value: string | number | string[],
  ) => onApply({ ...filters, [field]: String(value) });
  const selectedYear = getYearFilterValue(filters.fromDate);
  const updateYear = (year: string) =>
    onApply({
      ...filters,
      fromDate: year ? `${year}-01-01` : "",
      toDate: year ? `${year}-12-31` : "",
    });

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="promotion-filter-title"
    >
      <Box className="absolute left-1/2 top-1/2 w-[calc(100%-32px)] max-w-[560px] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-5 shadow-2xl border border-[#e5e5e5]">
        <Box
          className="mb-4 flex items-start justify-between gap-4 border-b border-[#f0f0f0] pb-3"
          id="promotion-filter-title"
        >
          <Box>
            <Box className="flex items-center gap-2">
              <FilterAltRounded sx={{ color: "#e50043" }} />
              <span className="font-bold text-black text-base tracking-tight">
                Promotion Filters
              </span>
            </Box>
            <span className="text-xs text-[#757575] mt-0.5 block">
              Filter products, campaigns, and store offers across Sephora &
              competitors.
            </span>
          </Box>
          <Button onClick={onClose} sx={{ minWidth: 40, color: "#111111" }}>
            <CloseRounded />
          </Button>
        </Box>
        <Box className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            className="sm:col-span-2"
            label="Product or brand"
            placeholder="Search product name or brand"
            value={filters.search}
            onValueChange={(value) => update("search", value)}
          />
          <FormField
            type="select"
            label="Product category"
            value={filters.category}
            onValueChange={(value) => update("category", value)}
            options={options(categories)}
          />
          <FormField
            type="select"
            label="Retailer / store"
            value={filters.retailer}
            onValueChange={(value) => update("retailer", value)}
            options={options(getVisibleRetailers(filters.market))}
          />
          <FormField
            type="select"
            label="Discount level"
            value={filters.discount}
            onValueChange={(value) => update("discount", value)}
            options={options(discounts)}
          />
          <FormField
            type="select"
            label="Market"
            value={filters.market}
            onValueChange={(value) => update("market", value)}
            options={options(["All", "PL", "CZ"])}
          />
          <FormField
            className="sm:col-span-2"
            type="select"
            label="Promotion year"
            value={selectedYear}
            onValueChange={(value) => updateYear(String(value))}
            options={[
              { label: "Select Year", value: "" },
              ...options(filterYears),
            ]}
          />
        </Box>
        <Box className="mt-5 flex justify-end gap-2 border-t border-[#f0f0f0] pt-4">
          <Button
            onClick={() => onApply(emptyPromotionFilters)}
            sx={{
              color: "#666666",
              textTransform: "none",
              fontWeight: 600,
              fontSize: 13,
              "&:hover": { color: "#000000", backgroundColor: "#f5f5f5" },
            }}
          >
            Clear filters
          </Button>
          <Button
            onClick={onClose}
            variant="contained"
            sx={{
              backgroundColor: "#000000",
              color: "#ffffff",
              textTransform: "none",
              fontWeight: 700,
              fontSize: 13,
              px: 3,
              "&:hover": { backgroundColor: "#222222" },
            }}
          >
            Apply filters
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}
