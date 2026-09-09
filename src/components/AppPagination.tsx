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
    <Box className="py-4 flex flex-wrap items-center justify-between gap-4 border-t border-[#edf1ef] px-4">
      <Typography sx={{ color: "#94a09c", fontSize: 12 }}>
        Showing {firstItem}-{lastItem} of {total} {itemLabel}
      </Typography>
      <Pagination
        count={Math.max(1, count)}
        page={page}
        onChange={(_, value) => onChange(value)}
        size="small"
        sx={{
          "& .MuiPaginationItem-root": { color: "#557069" },
          "& .Mui-selected": {
            backgroundColor: "#286e5e !important",
            color: "white",
          },
          "& .MuiPaginationItem-root:hover": {
            backgroundColor: "#e1f2ed",
          },
        }}
      />
    </Box>
  );
}
