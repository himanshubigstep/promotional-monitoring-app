import {
  Box,
  Card,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import { NorthEastRounded, StorefrontRounded } from "@mui/icons-material";
import { Link } from "react-router-dom";
import type { AssistantResult } from "../../types/assistant";

const fallbackImage =
  "https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=900&q=80";

function ResultCard({ children }: { children: React.ReactNode }) {
  return (
    <Card
      elevation={0}
      className="rounded-lg border border-[#e5e5e5] bg-white"
    >
      {children}
    </Card>
  );
}

function ResultHeader({ title, caption }: { title: string; caption?: string }) {
  return (
    <Box className="border-b border-[#f0f0f0] px-3.5 py-2.5">
      <Typography sx={{ color: "#000000", fontSize: 13, fontWeight: 800 }}>
        {title}
      </Typography>
      {caption && (
        <Typography sx={{ color: "#8a8a8a", fontSize: 11, mt: 0.25 }}>
          {caption}
        </Typography>
      )}
    </Box>
  );
}

function DataTable({
  columns,
  rows,
}: {
  columns: string[];
  rows: (string | number | null)[][];
}) {
  return (
    <Box className="overflow-x-auto">
      <Table size="small">
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell
                key={col}
                sx={{
                  color: "#757575",
                  fontSize: 10.5,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  backgroundColor: "#fafafa",
                  whiteSpace: "nowrap",
                }}
              >
                {col}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                sx={{ color: "#8a8a8a", fontSize: 12.5, textAlign: "center", py: 3 }}
              >
                No matching data found.
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, rowIndex) => (
              <TableRow key={rowIndex} hover>
                {row.map((cell, cellIndex) => (
                  <TableCell
                    key={cellIndex}
                    sx={{ color: "#1a1a1a", fontSize: 12.5, whiteSpace: "nowrap" }}
                  >
                    {cell === null || cell === "" ? "—" : cell}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Box>
  );
}

export default function AssistantResultView({ result }: { result: AssistantResult }) {
  switch (result.type) {
    case "text":
      return (
        <Typography sx={{ color: "#1a1a1a", fontSize: 13 }}>{result.text}</Typography>
      );

    case "error":
      return (
        <Box className="rounded-lg border border-[#f3c8d3] bg-[#fff0f3] px-3 py-2">
          <Typography sx={{ color: "#e50043", fontSize: 12.5, fontWeight: 700 }}>
            {result.message}
          </Typography>
        </Box>
      );

    case "navigation":
      return (
        <ResultCard>
          <ResultHeader title={result.title} />
          <Box className="flex flex-col gap-2 p-3">
            {result.items.map((item) => (
              <Link
                key={item.route}
                to={item.route}
                className="no-underline"
              >
                <Box className="flex items-center justify-between rounded-md border border-[#eee] px-3 py-2 transition-colors hover:border-[#000]">
                  <Box>
                    <Typography sx={{ color: "#000", fontSize: 12.5, fontWeight: 800 }}>
                      {item.name}
                    </Typography>
                    <Typography sx={{ color: "#8a8a8a", fontSize: 11.5 }}>
                      {item.description}
                    </Typography>
                  </Box>
                  <NorthEastRounded sx={{ fontSize: 15, color: "#e50043" }} />
                </Box>
              </Link>
            ))}
          </Box>
        </ResultCard>
      );

    case "table":
    case "comparison_table":
      return (
        <ResultCard>
          <ResultHeader title={result.title} caption={result.caption} />
          <DataTable columns={result.columns} rows={result.rows} />
        </ResultCard>
      );

    case "summary":
      return (
        <ResultCard>
          <ResultHeader title={result.title} caption={result.caption} />
          <Box className="grid grid-cols-2 gap-2 p-3">
            {result.stats.map((stat) => (
              <Box
                key={stat.label}
                className="rounded-md border border-[#eee] px-2.5 py-2"
              >
                <Typography sx={{ color: "#8a8a8a", fontSize: 10.5, fontWeight: 700, textTransform: "uppercase" }}>
                  {stat.label}
                </Typography>
                <Typography sx={{ color: "#000", fontSize: 15, fontWeight: 800 }}>
                  {stat.value}
                </Typography>
              </Box>
            ))}
          </Box>
        </ResultCard>
      );

    case "product_cards":
      return (
        <ResultCard>
          <ResultHeader title={result.title} caption={result.caption} />
          <Box className="grid grid-cols-1 gap-2.5 p-3 sm:grid-cols-2">
            {result.items.length === 0 && (
              <Typography sx={{ color: "#8a8a8a", fontSize: 12.5 }}>
                No matching products found.
              </Typography>
            )}
            {result.items.map((item) => (
              <Box
                key={item.id}
                className="flex gap-2.5 rounded-lg border border-[#eee] p-2"
              >
                <img
                  src={item.image || fallbackImage}
                  alt={item.name}
                  className="h-16 w-16 shrink-0 rounded-md object-cover"
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = fallbackImage;
                  }}
                />
                <Box className="min-w-0 flex-1">
                  <Typography
                    noWrap
                    sx={{ color: "#000", fontSize: 12, fontWeight: 800 }}
                  >
                    {item.name}
                  </Typography>
                  <Typography sx={{ color: "#8a8a8a", fontSize: 11 }}>
                    {item.brand} • {item.retailer}
                  </Typography>
                  <Box className="mt-1 flex flex-wrap items-center gap-1.5">
                    {item.priceAfterDiscount !== null && item.priceAfterDiscount !== item.price ? (
                      <>
                        <Typography sx={{ color: "#e50043", fontSize: 12.5, fontWeight: 800 }}>
                          {item.priceAfterDiscount} {item.currency}
                        </Typography>
                        <Typography sx={{ color: "#bbb", fontSize: 11, textDecoration: "line-through" }}>
                          {item.price} {item.currency}
                        </Typography>
                      </>
                    ) : (
                      <Typography sx={{ color: "#000", fontSize: 12.5, fontWeight: 800 }}>
                        {item.price !== null ? `${item.price} ${item.currency}` : "—"}
                      </Typography>
                    )}
                    {item.discount !== null && item.discount > 0 && (
                      <Chip
                        label={`-${item.discount}%`}
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: 10,
                          fontWeight: 800,
                          backgroundColor: "#000",
                          color: "#fff",
                        }}
                      />
                    )}
                    <Chip
                      label={item.source === "ours" ? "Ours" : "Competitor"}
                      size="small"
                      variant="outlined"
                      sx={{ height: 18, fontSize: 9.5, fontWeight: 700 }}
                    />
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        </ResultCard>
      );

    case "promotion_cards":
      return (
        <ResultCard>
          <ResultHeader title={result.title} caption={result.caption} />
          <Box className="flex flex-col gap-2 p-3">
            {result.items.length === 0 && (
              <Typography sx={{ color: "#8a8a8a", fontSize: 12.5 }}>
                No matching promotions found.
              </Typography>
            )}
            {result.items.map((item) => (
              <Box key={item.id} className="rounded-lg border border-[#eee] p-2.5">
                <Box className="flex items-center justify-between gap-2">
                  <Typography sx={{ color: "#000", fontSize: 12.5, fontWeight: 800 }}>
                    {item.name}
                  </Typography>
                  <Chip
                    label={item.discount || "—"}
                    size="small"
                    sx={{ height: 18, fontSize: 10, fontWeight: 800, backgroundColor: "#fff0f3", color: "#e50043" }}
                  />
                </Box>
                <Box className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-[#8a8a8a]">
                  <StorefrontRounded sx={{ fontSize: 13 }} />
                  <Typography sx={{ fontSize: 11, color: "#8a8a8a" }}>
                    {item.retailer} • {item.brand} • {item.category}
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: 11, color: "#aaa", mt: 0.5 }}>
                  {item.from} → {item.to}
                </Typography>
              </Box>
            ))}
          </Box>
        </ResultCard>
      );

    default:
      return null;
  }
}
