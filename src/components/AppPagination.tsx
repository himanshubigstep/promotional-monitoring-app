import { Box, Pagination, Typography } from "@mui/material";

type AppPaginationProps = {
  count: number;
  page: number;
  onChange: (page: number) => void;
  total: number;
  pageSize: number;
  itemLabel?: string;
};

export default function AppPagination({
  count,
  page,
  onChange,
  total,
  pageSize,
  itemLabel = "items",
}: AppPaginationProps) {
  const firstItem = total ? (page - 1) * pageSize + 1 : 0;
  const lastItem = Math.min(page * pageSize, total);

  return (
    <Box className="py-3.5 flex flex-wrap items-center justify-between gap-4 border-t border-[#e5e5e5] px-4">
      <Typography sx={{ color: "#757575", fontSize: 12, fontWeight: 500 }}>
        Showing {firstItem}-{lastItem} of {total} {itemLabel}
      </Typography>
      <Pagination
        count={Math.max(1, count)}
        page={page}
        onChange={(_, value) => onChange(value)}
        size="small"
        sx={{
          "& .MuiPaginationItem-root": {
            color: "#444444",
            fontWeight: 600,
            fontSize: 12,
            borderRadius: "6px",
          },
          "& .Mui-selected": {
            backgroundColor: "#000000 !important",
            color: "white !important",
            fontWeight: 700,
          },
          "& .MuiPaginationItem-root:hover": {
            backgroundColor: "#eeeeee",
          },
        }}
      />
    </Box>
  );
}
