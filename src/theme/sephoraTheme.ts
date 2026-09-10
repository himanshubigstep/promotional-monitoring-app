import { createTheme } from "@mui/material/styles";

export const sephoraTheme = createTheme({
  palette: {
    primary: {
      main: "#000000",
      light: "#262626",
      dark: "#000000",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#e50043",
      light: "#ff3366",
      dark: "#c8003a",
      contrastText: "#ffffff",
    },
    text: {
      primary: "#111111",
      secondary: "#666666",
    },
    background: {
      default: "#f7f7f8",
      paper: "#ffffff",
    },
    divider: "#e5e5e5",
  },
  typography: {
    fontFamily: [
      "Montserrat",
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
    borderRadius: 8,
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
          backgroundColor: "#000000",
          color: "#ffffff",
          "&:hover": {
            backgroundColor: "#262626",
          },
        },
        outlined: {
          borderColor: "#000000",
          color: "#000000",
          "&:hover": {
            borderColor: "#000000",
            backgroundColor: "rgba(0, 0, 0, 0.04)",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: "1px solid #e5e5e5",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
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
          borderColor: "#e5e5e5",
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
