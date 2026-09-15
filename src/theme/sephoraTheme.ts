import { createTheme } from "@mui/material/styles";

// Soft, pastel icon-badge tints used for stat/feature cards (dashboard KPIs,
// brand analytics summaries) — cycle through these instead of one flat color.
export const accentTints = [
  { bg: "#f2f2f2", fg: "#000000" },
  { bg: "#d9fbd0", fg: "#1c6c09" },
  { bg: "#e3e6ed", fg: "#31374a" },
  { bg: "#ffffff", fg: "#141824" },
];

export const dangerColor = { main: "#fa3b1d", dark: "#c92e13", light: "#ffe2dc" };

// Matches sephora.pl's real design tokens: --surface-brand/--text-primary (#000),
// hover/pressed states (#333/#4d4d4d), and --surface-promotion (#d60032) for emphasis.
export const brandRed = { main: "#d60032", dark: "#b0002a", light: "#ffe2ea" };

export const sephoraTheme = createTheme({
  palette: {
    primary: {
      main: "#000000",
      light: "#4d4d4d",
      dark: "#333333",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#f2f2f2",
      light: "#fafafa",
      dark: "#e0e0e0",
      contrastText: "#000000",
    },
    text: {
      primary: "#141824",
      secondary: "#525b75",
    },
    background: {
      default: "#f5f7fa",
      paper: "#ffffff",
    },
    divider: "#e3e6ed",
  },
  typography: {
    fontFamily: [
      "Nunito Sans",
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
    ].join(","),
    h1: {
      fontWeight: 700,
      letterSpacing: 0,
    },
    h2: {
      fontWeight: 700,
      letterSpacing: 0,
    },
    h3: {
      fontWeight: 700,
      letterSpacing: 0,
    },
    h4: {
      fontWeight: 700,
      letterSpacing: 0,
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
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 700,
          textTransform: "none",
          boxShadow: "none",
          "&:hover": {
            boxShadow: "none",
          },
        },
        contained: {
          backgroundColor: "#000000",
          color: "#ffffff",
          "&:hover": {
            backgroundColor: "#333333",
          },
        },
        outlined: {
          borderColor: "#cbd0dd",
          color: "#31374a",
          "&:hover": {
            borderColor: "#000000",
            backgroundColor: "#f2f2f2",
          },
        },
        text: {
          color: "#000000",
          "&:hover": {
            backgroundColor: "#f2f2f2",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          border: "1px solid #e3e6ed",
          boxShadow: "0 1px 3px rgba(20,24,36,0.06), 0 1px 2px rgba(20,24,36,0.04)",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 9999,
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
            borderColor: "#000000",
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
          color: "#525b75",
          backgroundColor: "#f5f7fa",
        },
      },
    },
  },
});
