import React, { useState } from "react";
import {
  BarChartRounded,
  CalendarMonthRounded,
  ChevronLeftRounded,
  DashboardRounded,
  FactCheckRounded,
  FilterAltRounded,
  Inventory2Rounded,
  LocalOfferRounded,
  MenuRounded,
  StorefrontRounded,
} from "@mui/icons-material";
import {
  AppBar,
  Alert,
  Box,
  Button,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Select,
  Snackbar,
  ThemeProvider,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  BrowserRouter,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import Dashboard from "./pages/Dashboard/Dashboard";
import StoreComparison from "./pages/StoreComparison/StoreComparison";
import {
  AppProvider,
  PromotionFilters,
  UserRole,
  useAppContext,
} from "./context/AppContext";
import BrandAnalytics from "./pages/BrandAnalytics/BrandAnalytics";
import ProductDetail from "./pages/ProductDetail/ProductDetail";
import Promotions from "./pages/Promotions/Promotions";
import Products from "./pages/Products/Products";
import PromotionalCalendar from "./pages/PromotionalCalendar/PromotionalCalendar";
import PromotionFilterModal from "./components/PromotionFilterModal";
import AssistantWidget from "./components/Assistant/AssistantWidget";
import ReviewQueue from "./pages/ReviewQueue/ReviewQueue";
import { sephoraTheme } from "./theme/sephoraTheme";

const drawerWidth = 244;
const navigation = [
  { label: "Dashboard", path: "/", icon: <DashboardRounded /> },
  {
    label: "Promotional calendar",
    path: "/calendar",
    icon: <CalendarMonthRounded />,
  },
  { label: "Promotions", path: "/promotions", icon: <LocalOfferRounded /> },
  { label: "Product catalog", path: "/product-catalog", icon: <Inventory2Rounded /> },
  { label: "Brand analytics", path: "/analytics", icon: <BarChartRounded /> },
  { label: "Store comparison", path: "/stores", icon: <StorefrontRounded /> },
  { label: "Review queue", path: "/review-queue", icon: <FactCheckRounded /> },
];

function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

function Navigation({ onNavigate }: { onNavigate: () => void }) {
  const location = useLocation();
  return (
    <List className="flex flex-col gap-1.5 px-3 py-4">
      {navigation.map((item) => {
        const selected =
          item.path === "/"
            ? location.pathname === "/"
            : location.pathname.startsWith(item.path);
        return (
          <ListItemButton
            key={item.path}
            component={NavLink}
            to={item.path}
            selected={selected}
            onClick={onNavigate}
            className="rounded-lg transition-all"
            sx={{
              color: selected ? "#ffffff" : "#a1a1aa",
              backgroundColor: selected ? "#1e2c31 !important" : "transparent",
              "&.Mui-selected": {
                backgroundColor: "#1e2c31",
                color: "#ffffff",
                boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
              },
              "&.Mui-selected:hover": {
                backgroundColor: "#3f3f46",
              },
              "&:hover": {
                backgroundColor: "#0a0a0a",
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 36,
                color: selected ? "#c1fbd4" : "inherit",
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              sx={{
                "& .MuiListItemText-primary": {
                  fontSize: 13.5,
                  fontWeight: selected ? 500 : 500,
                  letterSpacing: "0.01em",
                },
              }}
            />
          </ListItemButton>
        );
      })}
    </List>
  );
}

function AppLayout() {
  const { role, setRole, filters, setFilters, toast, clearToast } = useAppContext();
  const [filterOpen, setFilterOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const location = useLocation();
  const currentPage =
    navigation.find((item) => item.path === location.pathname) ?? navigation[0];
  const drawer = (
    <Box className="flex h-full flex-col bg-[#000000]">
      <Box className="flex items-center justify-between px-5 py-5 border-b border-[#1e2c31]">
        <Box>
          <Box className="flex items-center gap-2">
            <Typography
              className="!tracking-widest"
              sx={{
                color: "#ffffff",
                fontSize: 20,
                letterSpacing: "0.18em",
                fontFamily: "Inter, sans-serif",
                textTransform: "uppercase",
              }}
            >
              SEPHORA
            </Typography>
            <Box
              sx={{
                backgroundColor: "#c1fbd4",
                color: "#000000",
                fontSize: 9,
                fontWeight: 600,
                px: 0.8,
                py: 0.2,
                borderRadius: 0.5,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              PROMO
            </Box>
          </Box>
          <Typography
            sx={{
                color: "#a1a1aa",
              fontSize: 10.5,
              fontWeight: 600,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              mt: 0.5,
            }}
          >
            Competitive Intelligence
          </Typography>
        </Box>
        {isMobile && (
          <IconButton
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          >
            <ChevronLeftRounded />
          </IconButton>
        )}
      </Box>

        <Box className="mx-3.5 my-3 rounded-xl bg-[#0a0a0a] p-3 text-white">
        <Typography
          sx={{
            color: "#c1fbd4",
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: 1.2,
            textTransform: "uppercase",
          }}
        >
          Active Market
        </Typography>
        <Typography
          sx={{
            color: "#ffffff",
            fontSize: 13,
            fontWeight: 600,
            mt: 0.25,
            letterSpacing: "0.02em",
          }}
        >
          Sephora Poland
        </Typography>
      </Box>

      <Navigation onNavigate={() => setMobileOpen(false)} />

      <Box className="mt-auto border-t border-[#1e2c31] p-4 bg-[#0a0a0a]">
        <Box className="flex items-center gap-2">
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#10b981",
            }}
          />
            <Typography sx={{ color: "#a1a1aa", fontSize: 11, fontWeight: 500 }}>
            Catalog synced live • 2026
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box className="min-h-screen bg-[#f4f6f8]">
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          display: { md: "none" },
          backgroundColor: "#000000",
          color: "#ffffff",
          borderBottom: "1px solid #1e2c31",
        }}
      >
        <Toolbar className="justify-between">
          <Box className="flex items-center gap-2">
            <IconButton
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
              sx={{ color: "#ffffff" }}
            >
              <MenuRounded />
            </IconButton>
            <Typography
              className="!font-black !tracking-widest"
              sx={{
                fontSize: 18,
                letterSpacing: "0.15em",
                fontFamily: "Inter, sans-serif",
              }}
            >
              SEPHORA
            </Typography>
          </Box>
          <Box
            sx={{
              backgroundColor: "#c1fbd4",
              color: "#000000",
              fontSize: 10,
              fontWeight: 800,
              px: 1,
              py: 0.3,
              borderRadius: 0.5,
              textTransform: "uppercase",
            }}
          >
            PROMO
          </Box>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant={isMobile ? "temporary" : "permanent"}
          open={isMobile ? mobileOpen : true}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: drawerWidth,
              borderRight: "1px solid #e7eaee",
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

        <Box component="main" className="min-h-screen p-4 md:p-7 md:ml-[244px]">
        <Box className="mx-auto max-w-['100%']">
          <Box className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <Box>
              <Typography
                sx={{
                  color: "#20242b",
                  fontSize: { xs: 24, md: 30 },
                  fontWeight: 500,
                  letterSpacing: "-0.02em",
                  fontFamily: "Inter, sans-serif",
                }}
              >
                {currentPage.label}
              </Typography>
              <Typography sx={{ color: "#737b88", fontSize: 13, mt: 0.5 }}>
                {location.pathname === "/"
                  ? `${getTimeGreeting()}, ${role} • Sephora Promotional Monitor`
                  : "Track competitor promotions, pricing trends, and market campaign analytics."}
              </Typography>
            </Box>

            <Box className="flex items-center gap-2.5">
              <Button
                variant="outlined"
                size="small"
                startIcon={<FilterAltRounded sx={{ color: "#000000" }} />}
                onClick={() => setFilterOpen(true)}
                sx={{
                  display: { xs: "none", sm: "inline-flex" },
                  borderColor: "#000000",
                  color: "#000000",
                  backgroundColor: "#ffffff",
                  fontSize: 13,
                  fontWeight: 500,
                  px: 2,
                  py: 0.8,
                  "&:hover": {
                    borderColor: "#000000",
                    backgroundColor: "#d4f9e0",
                  },
                }}
              >
                Filters
              </Button>

              <Select
                size="small"
                value={role}
                onChange={(event) => setRole(event.target.value as UserRole)}
                sx={{
                  minWidth: 145,
                  backgroundColor: "#ffffff",
                  fontSize: 12.5,
                  fontWeight: 500,
                  borderColor: "#e7eaee",
                }}
              >
                <MenuItem value="Admin">Admin</MenuItem>
                <MenuItem value="Data Analytics">Data Analytics</MenuItem>
                <MenuItem value="Viewer">Viewer</MenuItem>
              </Select>
            </Box>
          </Box>

          <Outlet />
        </Box>
      </Box>

      <PromotionFilterModal
        open={filterOpen}
        filters={filters}
        onClose={() => setFilterOpen(false)}
        onApply={(nextFilters: PromotionFilters) => {
          setFilters(nextFilters);
          setFilterOpen(false);
        }}
      />
      <AssistantWidget />
      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4500}
        onClose={clearToast}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        {toast ? (
          <Alert onClose={clearToast} severity={toast.severity} variant="filled" sx={{ width: "100%" }}>
            {toast.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}

function App() {
  return (
    <ThemeProvider theme={sephoraTheme}>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/calendar" element={<PromotionalCalendar />} />
              <Route path="/promotions" element={<Promotions />} />
              <Route path="/product-catalog" element={<Products />} />
              <Route path="/products/:productId" element={<ProductDetail />} />
              <Route path="/analytics" element={<BrandAnalytics />} />
              <Route path="/stores" element={<StoreComparison />} />
              <Route path="/review-queue" element={<ReviewQueue />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
