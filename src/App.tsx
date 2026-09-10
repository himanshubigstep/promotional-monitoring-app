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

const drawerWidth = 250;
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
    <List className="flex flex-col gap-1 px-3 py-4">
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
            className="rounded-xl"
            sx={{
              color: selected ? "#1d1d1d" : "#5f5958",
              "&.Mui-selected": { backgroundColor: "#f3e4e1" },
              "&.Mui-selected:hover": { backgroundColor: "#efd6d2" },
              "&:hover": { backgroundColor: "#f8f1ee" },
            }}
          >
            <ListItemIcon sx={{ minWidth: 38, color: "inherit" }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText
              primary={item.label}
              sx={{
                "& .MuiListItemText-primary": {
                  fontSize: 14,
                  fontWeight: selected ? 700 : 500,
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
      <Box className="flex items-center justify-between px-5 py-5">
        <Box>
          <Typography
            className="!font-black !tracking-tight"
            sx={{ color: "#1b1b1b", fontSize: 22 }}
          >
            PromoPulse
          </Typography>
          <Typography
            sx={{
              color: "#8a9894",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 1.2,
              textTransform: "uppercase",
            }}
          >
            Retail intelligence
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
      <Box className="mx-4 mb-3 rounded-2xl bg-[#f5f8f7] px-4 py-3">
        <Typography
          sx={{
            color: "#8a9894",
            fontSize: 11,
            fontWeight: 700,
            textTransform: "uppercase",
          }}
        >
          Workspace
        </Typography>
        <Typography sx={{ color: "#28463f", fontSize: 14, fontWeight: 700 }}>
          Northstar Retail
        </Typography>
      </Box>
      <Navigation onNavigate={() => setMobileOpen(false)} />
      <Box className="mt-auto border-t border-[#edf1ef] px-5 py-5">
        <Typography sx={{ color: "#9aa7a3", fontSize: 12 }}>
          Last synced today at 09:42
        </Typography>
      </Box>
    </Box>
  );
  return (
    <Box className="min-h-screen bg-[#f7faf9]">
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          display: { md: "none" },
          backgroundColor: "white",
          color: "#173c35",
          borderBottom: "1px solid #edf1ef",
        }}
      >
        <Toolbar>
          <IconButton
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <MenuRounded />
          </IconButton>
          <Typography className="!font-black">PromoPulse</Typography>
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
              borderRight: "1px solid #edf1ef",
            },
          }}
        >
          {drawer}
        </Drawer>
      </Box>
      <Box component="main" className="min-h-screen p-4 md:ml-[250px]">
        <Box className="mx-auto">
          <Box className="mb-8 flex items-start justify-between">
            <Box>
              <Typography
                sx={{
                  color: "#173c35",
                  fontSize: { xs: 26, md: 32 },
                  fontWeight: 800,
                  letterSpacing: -1,
                }}
              >
                {currentPage.label}
              </Typography>
              <Typography sx={{ color: "#82908b", fontSize: 14, mt: 0.5 }}>
                {location.pathname === "/"
                  ? `${getTimeGreeting()}, ${role}`
                  : "Monitor your retail promotions with clarity."}
              </Typography>
            </Box>
            <Box className="flex items-center gap-3">
              <Select
                size="small"
                displayEmpty
                value={selectedYear}
                onChange={(event) => setYear(event.target.value)}
                sx={{
                  display: { xs: "none", lg: "inline-flex" },
                  width: 120,
                  backgroundColor: "white",
                  fontSize: 12,
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
                startIcon={<FilterAltRounded />}
                onClick={() => setFilterOpen(true)}
                sx={{
                  display: { xs: "none", sm: "inline-flex" },
                  borderColor: "#e7d9d4",
                  color: "#2d2d2d",
                  textTransform: "none",
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
                  backgroundColor: "#fffdfb",
                  borderRadius: 2,
                  fontSize: 12,
                  fontWeight: 700,
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
  );
}

export default App;
