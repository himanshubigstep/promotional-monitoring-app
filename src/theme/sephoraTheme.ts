import { createTheme } from "@mui/material/styles";

// Soft, pastel icon-badge tints used for stat/feature cards (dashboard KPIs,
// brand analytics summaries) — cycle through these instead of one flat color.
export const accentTints = [
  { bg: "#c1fbd4", fg: "#000000" },
  { bg: "#d4f9e0", fg: "#000000" },
  { bg: "#d4d4d8", fg: "#000000" },
  { bg: "#ffffff", fg: "#000000" },
];

export const dangerColor = { main: "#52525b", dark: "#3f3f46", light: "#d4d4d8" };

export const sephoraTheme = createTheme({
  palette: {
    primary: {
      main: "#000000",
      light: "#3f3f46",
      dark: "#000000",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#c1fbd4",
      light: "#d4f9e0",
      dark: "#99d9ad",
      contrastText: "#ffffff",
    },
    text: {
      primary: "#000000",
      secondary: "#71717a",
    },
    background: {
      default: "#fbfbf5",
      paper: "#ffffff",
    },
    divider: "#e4e4e7",
  },
  typography: {
    fontFamily: [
      "Inter",
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
    ].join(","),
    h1: {
      fontWeight: 500,
      letterSpacing: 0,
    },
    h2: {
      fontWeight: 500,
      letterSpacing: 0,
    },
    h3: {
      fontWeight: 500,
      letterSpacing: 0,
    },
    h4: {
      fontWeight: 500,
      letterSpacing: 0,
    },
    h5: {
      fontWeight: 500,
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
          borderRadius: 9999,
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
              backgroundColor: "#3f3f46",
          },
        },
        outlined: {
            borderColor: "#000000",
              color: "#000000",
          "&:hover": {
              borderColor: "#000000",
              backgroundColor: "#d4f9e0",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
            borderRadius: 12,
            border: "1px solid #e4e4e7",
            boxShadow: "0 8px 8px rgba(0,0,0,0.1), 0 4px 4px rgba(0,0,0,0.06)",
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
          color: "#71717a",
          backgroundColor: "#fbfbf5",
        },
      },
    },
  },
});
