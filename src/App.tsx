import React, { useState } from "react";
import {
  BarChartRounded,
  CalendarMonthRounded,
  ChevronLeftRounded,
  DashboardRounded,
  FactCheckRounded,
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
  useAppContext,
} from "./context/AppContext";
import BrandAnalytics from "./pages/BrandAnalytics/BrandAnalytics";
import ProductDetail from "./pages/ProductDetail/ProductDetail";
import Promotions from "./pages/Promotions/Promotions";
import PromotionalCalendar from "./pages/PromotionalCalendar/PromotionalCalendar";
import PromotionFilterModal from "./components/PromotionFilterModal";
import AssistantWidget from "./components/Assistant/AssistantWidget";
import ReviewQueue from "./pages/ReviewQueue/ReviewQueue";
import Login from "./pages/Auth/Login";
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
              color: selected ? "#ffffff" : "#9199a6",
              backgroundColor: selected ? "#2b2f39 !important" : "transparent",
              "&.Mui-selected": {
                backgroundColor: "#2b2f39",
                color: "#ffffff",
                boxShadow: "0 2px 6px rgba(0,0,0,0.18)",
              },
              "&.Mui-selected:hover": {
                backgroundColor: "#323744",
              },
              "&:hover": {
                backgroundColor: "#22252c",
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 36,
                color: selected ? "#78a1ff" : "inherit",
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
  const { user, authRole, signOut, filters, setFilters } = useAppContext();
  const [filterOpen, setFilterOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const location = useLocation();
  const currentPage =
    navigation.find((item) => item.path === location.pathname) ?? navigation[0];
  const drawer = (
    <Box className="flex h-full flex-col bg-[#1a1d23]">
      <Box className="flex items-center justify-between px-5 py-5 border-b border-[#2b2f38]">
        <Box>
          <Box className="flex items-center gap-2">
            <Typography
              className="!tracking-widest"
              sx={{
                color: "#ffffff",
                fontSize: 20,
                letterSpacing: "0.18em",
                fontFamily: "Open Sans, sans-serif",
                textTransform: "uppercase",
              }}
            >
              SEPHORA
            </Typography>
            <Box
              sx={{
                backgroundColor: "#4f82f7",
                color: "white",
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
                color: "#aeb5c0",
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

        <Box className="mx-3.5 my-3 rounded-xl bg-[#23262e] p-3 text-white">
        <Typography
          sx={{
            color: "#78a1ff",
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

      <Box className="mt-auto border-t border-[#2b2f38] p-4 bg-[#14161b]">
        <Box className="flex items-center gap-2">
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: "#10b981",
            }}
          />
            <Typography sx={{ color: "#9199a6", fontSize: 11, fontWeight: 500 }}>
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
          backgroundColor: "#1a1d23",
          color: "#ffffff",
          borderBottom: "1px solid #2b2f38",
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
                fontFamily: "Open Sans, sans-serif",
              }}
            >
              SEPHORA
            </Typography>
          </Box>
          <Box
            sx={{
              backgroundColor: "#4f82f7",
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
                  fontFamily: "Open Sans, sans-serif",
                }}
              >
                {currentPage.label}
              </Typography>
              <Typography sx={{ color: "#737b88", fontSize: 13, mt: 0.5 }}>
                {location.pathname === "/"
                  ? `${getTimeGreeting()}, ${
                      user ? (authRole === "editor" ? "Editor" : "Analyst") : "Guest"
                    } • Sephora Promotional Monitor`
                  : "Track competitor promotions, pricing trends, and market campaign analytics."}
              </Typography>
            </Box>

            <Box className="flex items-center gap-2.5">
              <Button
                variant="outlined"
                size="small"
                startIcon={<FilterAltRounded sx={{ color: "#4f82f7" }} />}
                onClick={() => setFilterOpen(true)}
                sx={{
                  display: { xs: "none", sm: "inline-flex" },
                  borderColor: "#dce1e8",
                  color: "#20242b",
                  backgroundColor: "#ffffff",
                  fontSize: 13,
                  fontWeight: 500,
                  px: 2,
                  py: 0.8,
                  "&:hover": {
                    borderColor: "#4f82f7",
                    backgroundColor: "#f5f8ff",
                  },
                }}
              >
                Filters
              </Button>

              {user ? (
                <Box className="flex items-center gap-2">
                  <Box
                    sx={{
                      backgroundColor: "#ffffff",
                      border: "1px solid #e7eaee",
                      borderRadius: "8px",
                      px: 1.5,
                      py: 0.7,
                      fontSize: 12.5,
                      fontWeight: 500,
                      color: "#20242b",
                    }}
                  >
                    {authRole === "editor" ? "Editor" : "Analyst"} · {user.email}
                  </Box>
                  <Button
                    size="small"
                    onClick={() => signOut()}
                    sx={{
                      color: "#737b88",
                      textTransform: "none",
                      fontWeight: 600,
                      fontSize: 12.5,
                      "&:hover": { color: "#20242b", backgroundColor: "#f4f6f8" },
                    }}
                  >
                    Sign out
                  </Button>
                </Box>
              ) : (
                <Button
                  component={NavLink}
                  to="/login"
                  size="small"
                  variant="contained"
                  sx={{
                    backgroundColor: "#22252b",
                    color: "#ffffff",
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: 12.5,
                    px: 2,
                    "&:hover": { backgroundColor: "#343942" },
                  }}
                >
                  Sign in
                </Button>
              )}
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
    </Box>
  );
}

function App() {
  return (
    <ThemeProvider theme={sephoraTheme}>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            {/* Public — no AppLayout chrome, and deliberately no route guard
                anywhere else either: anon visitors keep seeing everything
                read-only (0005_anon_public_read.sql), this only adds real
                editor/analyst capability on top for whoever signs in. */}
            <Route path="/login" element={<Login />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/calendar" element={<PromotionalCalendar />} />
              <Route path="/promotions" element={<Promotions />} />
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
