import { useState } from "react";
import {
  Box,
  Button,
  Card,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import {
  ExpandLessRounded,
  ExpandMoreRounded,
  NorthEastRounded,
  StorefrontRounded,
} from "@mui/icons-material";
import { Link } from "react-router-dom";
import type {
  AssistantResult,
  CellValue,
  ProductCardItem,
  PromotionCardItem,
} from "../../types/assistant";
import { renderInline } from "./FormattedText";

const fallbackImage =
  "https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=900&q=80";

// A large table/card list is now shown 5-at-a-time with a "View More"
// expander (see ExpandableSection below) instead of dumping 30+ rows into
// the chat at once — the full result is still there, just not all rendered
// up front.
const INITIAL_VISIBLE = 5;

function useExpandable<T>(items: T[], initialCount = INITIAL_VISIBLE) {
  const [expanded, setExpanded] = useState(false);
  const hasMore = items.length > initialCount;
  const visible = expanded ? items : items.slice(0, initialCount);
  return {
    visible,
    expanded,
    hasMore,
    hiddenCount: items.length - visible.length,
    toggle: () => setExpanded((current) => !current),
  };
}

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

// Deterministic, tool-computed findings (never LLM text) shown as a small
// bullet block above the table/cards — the "Key findings" layer from the
// task brief, grounded in the exact same data the table renders.
function InsightsList({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <Box className="flex flex-col gap-1 border-b border-[#f0f0f0] bg-[#fff8f9] px-3.5 py-2.5">
      {items.map((item, index) => (
        <Box key={index} className="flex items-start gap-1.5">
          <Box
            sx={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              backgroundColor: "#e50043",
              mt: "7px",
              flexShrink: 0,
            }}
          />
          <Typography sx={{ fontSize: 12, color: "#1a1a1a", lineHeight: 1.4 }}>
            {renderInline(item)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

function ShowMoreButton({
  hasMore,
  hiddenCount,
  expanded,
  onToggle,
}: {
  hasMore: boolean;
  hiddenCount: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  if (!hasMore) return null;
  return (
    <Box className="flex justify-center border-t border-[#f0f0f0] py-1.5">
      <Button
        size="small"
        onClick={onToggle}
        endIcon={expanded ? <ExpandLessRounded fontSize="small" /> : <ExpandMoreRounded fontSize="small" />}
        sx={{
          color: "#e50043",
          fontWeight: 700,
          fontSize: 12,
          textTransform: "none",
          "&:hover": { backgroundColor: "#fff0f3" },
        }}
      >
        {expanded ? "Show less" : `View more (${hiddenCount})`}
      </Button>
    </Box>
  );
}

// Shown between the header/insights and the table/cards, only while
// collapsed — self-evident once everything is visible, so it disappears on
// expand instead of saying "showing 30 of 30".
function ShowingCount({ visible, total, expanded }: { visible: number; total: number; expanded: boolean }) {
  if (expanded || visible >= total) return null;
  return (
    <Typography sx={{ fontSize: 10.5, color: "#8a8a8a", textAlign: "center", pt: 1 }}>
      Showing {visible} of {total} results
    </Typography>
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

function ExpandableTable({
  title,
  caption,
  insights,
  columns,
  rows,
}: {
  title: string;
  caption?: string;
  insights?: string[];
  columns: string[];
  rows: CellValue[][];
}) {
  const { visible, expanded, hasMore, hiddenCount, toggle } = useExpandable(rows);
  return (
    <ResultCard>
      <ResultHeader title={title} caption={caption} />
      {insights && <InsightsList items={insights} />}
      <DataTable columns={columns} rows={visible} />
      <ShowingCount visible={visible.length} total={rows.length} expanded={expanded} />
      <ShowMoreButton hasMore={hasMore} hiddenCount={hiddenCount} expanded={expanded} onToggle={toggle} />
    </ResultCard>
  );
}

function ProductCard({ item }: { item: ProductCardItem }) {
  return (
    <Box className="flex gap-2.5 rounded-lg border border-[#eee] p-2">
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
        <Typography noWrap sx={{ color: "#000", fontSize: 12, fontWeight: 800 }}>
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
              sx={{ height: 18, fontSize: 10, fontWeight: 800, backgroundColor: "#000", color: "#fff" }}
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
  );
}

function ExpandableProductCards({
  title,
  caption,
  insights,
  items,
}: {
  title: string;
  caption?: string;
  insights?: string[];
  items: ProductCardItem[];
}) {
  const { visible, expanded, hasMore, hiddenCount, toggle } = useExpandable(items);
  return (
    <ResultCard>
      <ResultHeader title={title} caption={caption} />
      {insights && <InsightsList items={insights} />}
      <Box className="grid grid-cols-1 gap-2.5 p-3 sm:grid-cols-2">
        {items.length === 0 && (
          <Typography sx={{ color: "#8a8a8a", fontSize: 12.5 }}>No matching products found.</Typography>
        )}
        {visible.map((item) => (
          <ProductCard key={item.id} item={item} />
        ))}
      </Box>
      <ShowingCount visible={visible.length} total={items.length} expanded={expanded} />
      <ShowMoreButton hasMore={hasMore} hiddenCount={hiddenCount} expanded={expanded} onToggle={toggle} />
    </ResultCard>
  );
}

function PromotionCard({ item }: { item: PromotionCardItem }) {
  return (
    <Box className="rounded-lg border border-[#eee] p-2.5">
      <Box className="flex items-center justify-between gap-2">
        <Typography sx={{ color: "#000", fontSize: 12.5, fontWeight: 800 }}>{item.name}</Typography>
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
  );
}

function ExpandablePromotionCards({
  title,
  caption,
  insights,
  items,
}: {
  title: string;
  caption?: string;
  insights?: string[];
  items: PromotionCardItem[];
}) {
  const { visible, expanded, hasMore, hiddenCount, toggle } = useExpandable(items);
  return (
    <ResultCard>
      <ResultHeader title={title} caption={caption} />
      {insights && <InsightsList items={insights} />}
      <Box className="flex flex-col gap-2 p-3">
        {items.length === 0 && (
          <Typography sx={{ color: "#8a8a8a", fontSize: 12.5 }}>No matching promotions found.</Typography>
        )}
        {visible.map((item) => (
          <PromotionCard key={item.id} item={item} />
        ))}
      </Box>
      <ShowingCount visible={visible.length} total={items.length} expanded={expanded} />
      <ShowMoreButton hasMore={hasMore} hiddenCount={hiddenCount} expanded={expanded} onToggle={toggle} />
    </ResultCard>
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
              <Link key={item.route} to={item.route} className="no-underline">
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
        <ExpandableTable
          title={result.title}
          caption={result.caption}
          insights={result.insights}
          columns={result.columns}
          rows={result.rows}
        />
      );

    case "summary":
      return (
        <ResultCard>
          <ResultHeader title={result.title} caption={result.caption} />
          <Box className="flex flex-col gap-1.5 p-3">
            {result.stats.map((stat) => (
              <Box key={stat.label} className="flex items-baseline gap-1.5">
                <Typography sx={{ color: "#1a1a1a", fontSize: 12.5 }}>
                  <strong style={{ fontWeight: 800, color: "#000" }}>{stat.label}:</strong>{" "}
                  {stat.value}
                </Typography>
              </Box>
            ))}
          </Box>
        </ResultCard>
      );

    case "product_cards":
      return (
        <ExpandableProductCards
          title={result.title}
          caption={result.caption}
          insights={result.insights}
          items={result.items}
        />
      );

    case "promotion_cards":
      return (
        <ExpandablePromotionCards
          title={result.title}
          caption={result.caption}
          insights={result.insights}
          items={result.items}
        />
      );

    default:
      return null;
  }
}
