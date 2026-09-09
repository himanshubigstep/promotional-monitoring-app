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
        className="rounded-2xl border border-[#edf1ef] bg-white p-6"
      >
        <Typography sx={{ color: "#173c35", fontWeight: 800 }}>
          Product not found
        </Typography>
        <Button
          component={Link}
          to="/promotions"
          startIcon={<ArrowBackRounded />}
          sx={{ mt: 2, color: "#286e5e", textTransform: "none" }}
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
          color: "#286e5e",
          textTransform: "none",
        }}
      >
        Back to promotions
      </Button>
      <Box className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_1fr]">
        <Card
          elevation={0}
          className="overflow-hidden rounded-2xl border border-[#edf1ef] bg-white"
        >
          <Box className="relative max-h-[400px] bg-[#e7f3ee]">
            <img
              src={product.image}
              alt={product.name}
              className="h-full max-h-[400px] w-full object-cover"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = fallbackImage;
              }}
            />
            <Box className="absolute left-5 top-5 rounded-full bg-white/90 px-3 py-2">
              <Typography
                sx={{ color: "#b25b52", fontSize: 13, fontWeight: 800 }}
              >
                -{product.competitorDiscount}% competitor offer
              </Typography>
            </Box>
          </Box>
        </Card>
        <Card
          elevation={0}
          className="rounded-2xl border border-[#edf1ef] bg-white"
        >
          <Box className="p-6">
            <Box className="mb-4 flex items-center gap-2">
              <Chip
                label={product.market}
                size="small"
                sx={{
                  backgroundColor: "#e9eefb",
                  color: "#52658d",
                  fontWeight: 800,
                }}
              />
              <Chip
                label={isExpired ? "Expired promotion" : "Active promotion"}
                size="small"
                sx={{
                  backgroundColor: isExpired ? "#f0f2f1" : "#e1f2ed",
                  color: isExpired ? "#687b74" : "#28715f",
                  fontWeight: 800,
                }}
              />
              <Chip
                label={product.category}
                size="small"
                sx={{
                  backgroundColor: "#e1f2ed",
                  color: "#28715f",
                  fontWeight: 800,
                }}
              />
            </Box>
            <Typography
              sx={{
                color: "#173c35",
                fontSize: { xs: 26, md: 34 },
                fontWeight: 800,
                lineHeight: 1.1,
              }}
            >
              {product.name}
            </Typography>
            <Typography sx={{ color: "#52746a", fontSize: 15, mt: 1 }}>
              {product.brand}
            </Typography>
            <Typography
              sx={{ color: "#687b74", fontSize: 14, lineHeight: 1.7, mt: 3 }}
            >
              {product.description}
            </Typography>
            <Divider sx={{ my: 3 }} />
            <Box className="grid grid-cols-2 gap-4">
              <Box>
                <Typography
                  sx={{
                    color: "#8a9894",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  Current price
                </Typography>
                <Typography
                  sx={{
                    color: "#173c35",
                    fontSize: 22,
                    fontWeight: 800,
                    mt: 0.5,
                  }}
                >
                  {product.price} {product.currency}
                </Typography>
              </Box>
              <Box>
                <Typography
                  sx={{
                    color: "#8a9894",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  After discount
                </Typography>
                <Typography
                  sx={{
                    color: "#286e5e",
                    fontSize: 22,
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
                    color: "#8a9894",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  Rating
                </Typography>
                <Typography
                  sx={{
                    color: "#31534a",
                    fontSize: 15,
                    fontWeight: 700,
                    mt: 0.5,
                  }}
                >
                  {product.rating} / 5
                </Typography>
              </Box>
              <Box>
                <Typography
                  sx={{
                    color: "#8a9894",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  Stock
                </Typography>
                <Typography
                  sx={{
                    color: "#31534a",
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
        className="rounded-2xl border border-[#edf1ef] bg-white"
      >
        <Box className="grid grid-cols-1 gap-5 p-6 md:grid-cols-3">
          <Box className="flex gap-3">
            <CalendarMonthRounded sx={{ color: "#286e5e" }} />
            <Box>
              <Typography
                sx={{
                  color: "#8a9894",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                Promotion dates
              </Typography>
              <Typography
                sx={{
                  color: "#31534a",
                  fontSize: 15,
                  fontWeight: 800,
                  mt: 0.5,
                }}
              >
                {product.fromDate} - {product.toDate}
              </Typography>
            </Box>
          </Box>
          <Box className="flex gap-3">
            <LocalOfferRounded sx={{ color: "#286e5e" }} />
            <Box>
              <Typography
                sx={{
                  color: "#8a9894",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                Promotion
              </Typography>
              <Typography
                sx={{
                  color: "#31534a",
                  fontSize: 15,
                  fontWeight: 800,
                  mt: 0.5,
                }}
              >
                {product.promotionName}
              </Typography>
              <Typography sx={{ color: "#687b74", fontSize: 12, mt: 0.5 }}>
                {product.promotionDescription}
              </Typography>
            </Box>
          </Box>
          <Box className="flex gap-3">
            <StorefrontRounded sx={{ color: "#286e5e" }} />
            <Box>
              <Typography
                sx={{
                  color: "#8a9894",
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase",
                }}
              >
                Terms and conditions
              </Typography>
              <Typography
                sx={{
                  color: "#687b74",
                  fontSize: 13,
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
