import {
  ArrowBackRounded,
  CalendarMonthRounded,
  LocalOfferRounded,
  StorefrontRounded,
} from "@mui/icons-material";
import { Box, Button, Card, Chip, Divider, Typography } from "@mui/material";
import { Link, useParams } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";

const fallbackImage =
  "https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=900&q=80";

export default function ProductDetail() {
  const { productId } = useParams();
  const { products } = useAppContext();
  const product = products.find((item) => item.id === productId);
  const isExpired = product ? product.toDate < "2026-09-08" : false;

  if (!product) {
    return (
      <Card
        elevation={0}
        className="rounded-2xl border border-[#e7eaee] bg-white p-6"
      >
        <Typography sx={{ color: "#20242b", fontWeight: 800 }}>
          Product not found
        </Typography>
        <Button
          component={Link}
          to="/promotions"
          startIcon={<ArrowBackRounded />}
          sx={{
            mt: 2,
            color: "#20242b",
            fontWeight: 700,
            textTransform: "none",
          }}
        >
          Back to promotions
        </Button>
      </Card>
    );
  }

  return (
    <Box className="flex flex-col gap-5">
      <Button
        component={Link}
        to="/promotions"
        startIcon={<ArrowBackRounded />}
        sx={{
          alignSelf: "flex-start",
          color: "#20242b",
          fontWeight: 700,
          textTransform: "none",
          "&:hover": { backgroundColor: "#f5f8ff", color: "#4f82f7" },
        }}
      >
        Back to promotions
      </Button>
      <Box className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card
          elevation={0}
          className="overflow-hidden rounded-2xl border border-[#e7eaee] bg-white"
        >
          <Box className="relative max-h-[420px] bg-[#f4f6f8]">
            <img
              src={product.image}
              alt={product.name}
              className="h-full max-h-[420px] w-full object-cover"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = fallbackImage;
              }}
            />
            <Box className="absolute left-4 top-4 rounded-md bg-[#f3873a] px-3 py-1.5 shadow">
              <Typography
                sx={{
                  color: "#ffffff",
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: "0.02em",
                }}
              >
                -{product.competitorDiscount}% COMPETITOR OFFER
              </Typography>
            </Box>
          </Box>
        </Card>
        <Card
          elevation={0}
          className="rounded-2xl border border-[#e7eaee] bg-white"
        >
          <Box className="p-6">
            <Box className="mb-4 flex items-center gap-2">
              <Chip
                label={product.market}
                size="small"
                sx={{
                  backgroundColor: "#eef1f4",
                  color: "#20242b",
                  fontWeight: 800,
                  fontSize: 11,
                  borderRadius: "6px",
                }}
              />
              <Chip
                label={isExpired ? "EXPIRED PROMO" : "ACTIVE PROMO"}
                size="small"
                sx={{
                  backgroundColor: isExpired ? "#eef1f4" : "#22252b",
                  color: isExpired ? "#737b88" : "#ffffff",
                  fontWeight: 800,
                  fontSize: 10,
                  borderRadius: "4px",
                  letterSpacing: "0.04em",
                }}
              />
              <Chip
                label={product.category}
                size="small"
                sx={{
                  backgroundColor: "#efeafd",
                  color: "#7c5cfa",
                  fontWeight: 800,
                  fontSize: 11,
                  borderRadius: "6px",
                }}
              />
            </Box>
            <Typography
              sx={{
                color: "#20242b",
                fontSize: { xs: 24, md: 30 },
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: "-0.01em",
              }}
            >
              {product.name}
            </Typography>
            <Typography
              sx={{
                color: "#737b88",
                fontSize: 14,
                fontWeight: 700,
                mt: 1,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {product.brand}
            </Typography>
            <Typography
              sx={{ color: "#737b88", fontSize: 14, lineHeight: 1.7, mt: 2.5 }}
            >
              {product.description}
            </Typography>
            <Divider sx={{ my: 3, borderColor: "#e7eaee" }} />
            <Box className="grid grid-cols-2 gap-4">
              <Box>
                <Typography
                  sx={{
                    color: "#737b88",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Regular Price
                </Typography>
                <Typography
                  sx={{
                    color: "#737b88",
                    fontSize: 20,
                    fontWeight: 600,
                    textDecoration: "line-through",
                    mt: 0.5,
                  }}
                >
                  {product.price} {product.currency}
                </Typography>
              </Box>
              <Box>
                <Typography
                  sx={{
                    color: "#f3873a",
                    fontSize: 11,
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Promo Price
                </Typography>
                <Typography
                  sx={{
                    color: "#f3873a",
                    fontSize: 24,
                    fontWeight: 800,
                    mt: 0.5,
                  }}
                >
                  {product.priceAfterDiscount} {product.currency}
                </Typography>
              </Box>
              <Box>
                <Typography
                  sx={{
                    color: "#737b88",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Rating
                </Typography>
                <Typography
                  sx={{
                    color: "#20242b",
                    fontSize: 15,
                    fontWeight: 700,
                    mt: 0.5,
                  }}
                >
                  ★ {product.rating} / 5
                </Typography>
              </Box>
              <Box>
                <Typography
                  sx={{
                    color: "#737b88",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Stock
                </Typography>
                <Typography
                  sx={{
                    color: "#20242b",
                    fontSize: 15,
                    fontWeight: 700,
                    mt: 0.5,
                  }}
                >
                  {product.stock} units
                </Typography>
              </Box>
            </Box>
          </Box>
        </Card>
      </Box>
      <Card
        elevation={0}
        className="rounded-2xl border border-[#e7eaee] bg-white"
      >
        <Box className="grid grid-cols-1 gap-5 p-6 md:grid-cols-3">
          <Box className="flex gap-3">
            <CalendarMonthRounded sx={{ color: "#3b6fed" }} />
            <Box>
              <Typography
                sx={{
                  color: "#737b88",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Promotion dates
              </Typography>
              <Typography
                sx={{
                  color: "#20242b",
                  fontSize: 14,
                  fontWeight: 800,
                  mt: 0.5,
                }}
              >
                {product.fromDate} — {product.toDate}
              </Typography>
            </Box>
          </Box>
          <Box className="flex gap-3">
            <LocalOfferRounded sx={{ color: "#7c5cfa" }} />
            <Box>
              <Typography
                sx={{
                  color: "#737b88",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Promotion Campaign
              </Typography>
              <Typography
                sx={{
                  color: "#20242b",
                  fontSize: 14,
                  fontWeight: 800,
                  mt: 0.5,
                }}
              >
                {product.promotionName}
              </Typography>
              <Typography sx={{ color: "#737b88", fontSize: 12, mt: 0.5 }}>
                {product.promotionDescription}
              </Typography>
            </Box>
          </Box>
          <Box className="flex gap-3">
            <StorefrontRounded sx={{ color: "#f3873a" }} />
            <Box>
              <Typography
                sx={{
                  color: "#737b88",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Terms and conditions
              </Typography>
              <Typography
                sx={{
                  color: "#737b88",
                  fontSize: 12.5,
                  lineHeight: 1.5,
                  mt: 0.5,
                }}
              >
                {product.terms}
              </Typography>
            </Box>
          </Box>
        </Box>
      </Card>
    </Box>
  );
}
