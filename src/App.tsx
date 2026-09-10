import React, { useState } from "react";
import {
  BarChartRounded,
  CalendarMonthRounded,
  ChevronLeftRounded,
  DashboardRounded,
  FilterAltRounded,
  LocalOfferRounded,
  MenuRounded,
  StorefrontRounded,
} from "@mui/icons-material";
import {
  AppBar,
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
  filterYears,
  getYearFilterValue,
  PromotionFilters,
  UserRole,
  useAppContext,
} from "./context/AppContext";
import BrandAnalytics from "./pages/BrandAnalytics/BrandAnalytics";
import ProductDetail from "./pages/ProductDetail/ProductDetail";
import Promotions from "./pages/Promotions/Promotions";
import PromotionalCalendar from "./pages/PromotionalCalendar/PromotionalCalendar";
import PromotionFilterModal from "./components/PromotionFilterModal";
import { sephoraTheme } from "./theme/sephoraTheme";

const drawerWidth = 260;
const navigation = [
  { label: "Dashboard", path: "/", icon: <DashboardRounded /> },
  {
    label: "Promotional calendar",
    path: "/calendar",
    icon: <CalendarMonthRounded />,
  },
  { label: "Promotions", path: "/promotions", icon: <LocalOfferRounded /> },
  { label: "Brand analytics", path: "/analytics", icon: <BarChartRounded /> },
  { label: "Store comparison", path: "/stores", icon: <StorefrontRounded /> },
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
              color: selected ? "#ffffff" : "#444444",
              backgroundColor: selected ? "#000000 !important" : "transparent",
              "&.Mui-selected": {
                backgroundColor: "#000000",
                color: "#ffffff",
                boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
              },
              "&.Mui-selected:hover": {
                backgroundColor: "#1a1a1a",
              },
              "&:hover": {
                backgroundColor: "#f5f5f5",
                //color: "#000000",
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 36,
                color: selected ? "#e50043" : "inherit",
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              sx={{
                "& .MuiListItemText-primary": {
                  fontSize: 13.5,
                  fontWeight: selected ? 700 : 500,
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
  const { role, setRole, filters, setFilters } = useAppContext();
  const [filterOpen, setFilterOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const location = useLocation();
  const currentPage =
    navigation.find((item) => item.path === location.pathname) ?? navigation[0];
  const selectedYear = getYearFilterValue(filters.fromDate);
  const setYear = (year: string) =>
    setFilters({
      ...filters,
      fromDate: year ? `${year}-01-01` : "",
      toDate: year ? `${year}-12-31` : "",
    });
  const drawer = (
    <Box className="flex h-full flex-col bg-white">
      {/* Sephora Iconic Stripe Top Accent */}
      <Box
        className="h-1.5 w-full sephora-stripes"
        sx={{ borderBottom: "1px solid #e5e5e5" }}
      />
      <Box className="flex items-center justify-between px-5 py-5 border-b border-[#f0f0f0]">
        <Box>
          <Box className="flex items-center gap-2">
            <Typography
              className="!font-black !tracking-widest"
              sx={{
                color: "#000000",
                fontSize: 20,
                letterSpacing: "0.18em",
                fontFamily: "Montserrat, sans-serif",
                textTransform: "uppercase",
              }}
            >
              SEPHORA
            </Typography>
            <Box
              sx={{
                backgroundColor: "#e50043",
                color: "white",
                fontSize: 9,
                fontWeight: 800,
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
              color: "#757575",
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

      <Box className="mx-3.5 my-3 rounded-lg bg-[#000000] p-3 text-white">
        <Typography
          sx={{
            color: "#e50043",
            fontSize: 10,
            fontWeight: 800,
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
            fontWeight: 700,
            mt: 0.25,
            letterSpacing: "0.02em",
          }}
        >
          Sephora Poland (sephora.pl)
        </Typography>
      </Box>

      <Navigation onNavigate={() => setMobileOpen(false)} />

      <Box className="mt-auto border-t border-[#f0f0f0] p-4 bg-[#fafafa]">
        <Box className="flex items-center gap-2">
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#10b981",
            }}
          />
          <Typography sx={{ color: "#757575", fontSize: 11, fontWeight: 500 }}>
            Catalog synced live • 2026
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box className="min-h-screen bg-[#f7f7f8]">
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          display: { md: "none" },
          backgroundColor: "#000000",
          color: "#ffffff",
          borderBottom: "1px solid #222222",
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
                fontFamily: "Montserrat, sans-serif",
              }}
            >
              SEPHORA
            </Typography>
          </Box>
          <Box
            sx={{
              backgroundColor: "#e50043",
              color: "white",
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
              borderRight: "1px solid #e5e5e5",
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      <Box component="main" className="min-h-screen p-4 md:p-6 md:ml-[260px]">
        <Box className="mx-auto max-w-7xl">
          <Box className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <Box>
              <Typography
                sx={{
                  color: "#000000",
                  fontSize: { xs: 24, md: 30 },
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  fontFamily: "Montserrat, sans-serif",
                }}
              >
                {currentPage.label}
              </Typography>
              <Typography sx={{ color: "#757575", fontSize: 13, mt: 0.5 }}>
                {location.pathname === "/"
                  ? `${getTimeGreeting()}, ${role} • Sephora Promotional Monitor`
                  : "Track competitor promotions, pricing trends, and market campaign analytics."}
              </Typography>
            </Box>

            <Box className="flex items-center gap-2.5">
              <Select
                size="small"
                displayEmpty
                value={selectedYear}
                onChange={(event) => setYear(event.target.value)}
                sx={{
                  display: { xs: "none", lg: "inline-flex" },
                  minWidth: 130,
                  backgroundColor: "white",
                  fontSize: 12.5,
                  fontWeight: 600,
                  borderColor: "#e5e5e5",
                }}
              >
                <MenuItem value="">Select Year</MenuItem>
                {filterYears.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>

              <Button
                variant="outlined"
                size="small"
                startIcon={<FilterAltRounded sx={{ color: "#e50043" }} />}
                onClick={() => setFilterOpen(true)}
                sx={{
                  display: { xs: "none", sm: "inline-flex" },
                  borderColor: "#d1d1d1",
                  color: "#000000",
                  backgroundColor: "#ffffff",
                  fontSize: 13,
                  fontWeight: 700,
                  px: 2,
                  py: 0.8,
                  "&:hover": {
                    borderColor: "#000000",
                    backgroundColor: "#f5f5f5",
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
                  fontWeight: 700,
                  borderColor: "#e5e5e5",
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
              <Route path="/products/:productId" element={<ProductDetail />} />
              <Route path="/analytics" element={<BrandAnalytics />} />
              <Route path="/stores" element={<StoreComparison />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </ThemeProvider>
  );
}

export default App;
