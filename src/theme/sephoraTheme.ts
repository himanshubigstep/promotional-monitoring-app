import { createTheme } from "@mui/material/styles";

// Soft, pastel icon-badge tints used for stat/feature cards (dashboard KPIs,
// brand analytics summaries) — cycle through these instead of one flat color.
export const accentTints = [
  { bg: "#eaf1ff", fg: "#3b6fed" }, // blue
  { bg: "#efeafd", fg: "#7c5cfa" }, // purple
  { bg: "#fff1e6", fg: "#f3873a" }, // orange
  { bg: "#e9f9f0", fg: "#22b573" }, // green
];

export const dangerColor = { main: "#e5484d", dark: "#c9302c", light: "#fdecec" };

export const sephoraTheme = createTheme({
  palette: {
    primary: {
      main: "#22252b",
      light: "#3a3f48",
      dark: "#17191d",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#4f82f7",
      light: "#78a1ff",
      dark: "#2e63d4",
      contrastText: "#ffffff",
    },
    text: {
      primary: "#20242b",
      secondary: "#737b88",
    },
    background: {
      default: "#f4f6f8",
      paper: "#ffffff",
    },
    divider: "#e7eaee",
  },
  typography: {
    fontFamily: [
      "Open Sans",
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
    ].join(","),
    h1: {
      fontWeight: 800,
      letterSpacing: "-0.03em",
    },
    h2: {
      fontWeight: 800,
      letterSpacing: "-0.02em",
    },
    h3: {
      fontWeight: 800,
      letterSpacing: "-0.02em",
    },
    h4: {
      fontWeight: 700,
      letterSpacing: "-0.01em",
    },
    h5: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 700,
    },
    subtitle1: {
      fontWeight: 600,
    },
    subtitle2: {
      fontWeight: 600,
      fontSize: "0.8125rem",
    },
    button: {
      fontWeight: 700,
      textTransform: "none",
      letterSpacing: "0.02em",
    },
    overline: {
      fontWeight: 800,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
            fontWeight: 700,
          textTransform: "none",
          boxShadow: "none",
          "&:hover": {
            boxShadow: "none",
          },
        },
        contained: {
            backgroundColor: "#22252b",
          color: "#ffffff",
          "&:hover": {
              backgroundColor: "#343942",
          },
        },
        outlined: {
            borderColor: "#dce1e8",
            color: "#20242b",
          "&:hover": {
              borderColor: "#4f82f7",
              backgroundColor: "#f5f8ff",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
            borderRadius: 16,
            border: "1px solid #e7eaee",
            boxShadow: "0 2px 10px rgba(31, 38, 48, 0.04)",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 700,
          fontSize: "0.75rem",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderColor: "#4f82f7",
            borderWidth: "1.5px",
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: "12px 16px",
        },
        head: {
          fontWeight: 700,
          fontSize: "0.75rem",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          color: "#757575",
          backgroundColor: "#fafafa",
        },
      },
    },
  },
});
