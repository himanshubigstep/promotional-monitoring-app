import { CheckRounded } from "@mui/icons-material";
import {
  Box,
  FormControl,
  FormHelperText,
  ListSubheader,
  MenuItem,
  OutlinedInput,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";
import { createTheme, ThemeProvider } from "@mui/material/styles";

export type FormFieldOption = {
  label: string;
  value: string;
};

type LabelAction = {
  label: string;
  onClick: () => void;
};

type CommonProps = {
  label: string;
  value: string | number | string[];
  onValueChange: (value: string | number | string[]) => void;
  required?: boolean;
  error?: boolean | string;
  helperText?: ReactNode;
  placeholder?: string;
  fullWidth?: boolean;
  className?: string;
  labelAction?: LabelAction;
};

type TextFieldProps = CommonProps & {
  type?: "text" | "date" | "number";
  multiline?: boolean;
  minRows?: number;
  options?: never;
};

type SelectFieldProps = CommonProps & {
  type: "select" | "multiselect";
  options: FormFieldOption[];
  multiline?: never;
  minRows?: never;
};

export type FormFieldProps = TextFieldProps | SelectFieldProps;

function getErrorMessage(
  error: FormFieldProps["error"],
  helperText: ReactNode,
) {
  return typeof error === "string" ? error : helperText;
}

// Create a theme that overrides the primary color for Sephora styling
const datePickerTheme = createTheme({
  palette: {
    primary: {
      main: "#000000",
    },
    secondary: {
      main: "#e50043",
    },
  },
  typography: {
    fontFamily: "Montserrat, sans-serif",
  },
  components: {
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#000000 !important",
            borderWidth: "1.5px !important",
          },
          "&.Mui-error.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#e50043 !important",
            borderWidth: "1.5px !important",
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#000000 !important",
            borderWidth: "1.5px !important",
          },
        },
      },
    },
  },
});

export default function FormField(props: FormFieldProps) {
  const error = Boolean(props.error);
  const helperText = getErrorMessage(props.error, props.helperText);
  const isSelectField = props.type === "select" || props.type === "multiselect";
  const [searchText, setSearchText] = useState("");

  const filteredOptions = useMemo(() => {
    if (!isSelectField) return [];

    const query = searchText.trim().toLowerCase();
    if (!query) return props.options ?? [];

    return (props.options ?? []).filter((option) => {
      const label = option.label.toLowerCase();
      const val = option.value.toLowerCase();
      return label.includes(query) || val.includes(query);
    });
  }, [isSelectField, props.options, searchText]);

  const renderFieldLabel = () => (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1,
        mb: 0.75,
      }}
    >
      <Typography
        component="label"
        sx={{
          display: "block",
          color: error ? "#e50043" : "#222222",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.02em",
          lineHeight: 1.4,
        }}
      >
        {props.label}
        {props.required ? " *" : ""}
      </Typography>

      {props.labelAction && (
        <Box
          component="button"
          type="button"
          onClick={props.labelAction.onClick}
          sx={{
            border: "none",
            background: "transparent",
            color: "#e50043",
            fontSize: 12,
            fontWeight: 700,
            cursor: "pointer",
            padding: 0,
            lineHeight: 1.4,
            textDecoration: "underline",
            textUnderlineOffset: "2px",
            whiteSpace: "nowrap",
            fontFamily: "inherit",
            "&:hover": {
              color: "#c8003a",
            },
          }}
        >
          {props.labelAction.label}
        </Box>
      )}
    </Box>
  );

  /*
   * --------------------------------------------------------------------------
   * SELECT / MULTISELECT
   * --------------------------------------------------------------------------
   */
  if (isSelectField) {
    const multiple = props.type === "multiselect";

    const value = multiple
      ? Array.isArray(props.value)
        ? props.value
        : []
      : Array.isArray(props.value)
        ? props.value[0] || ""
        : String(props.value);

    const handleChange = (event: SelectChangeEvent<string | string[]>) => {
      const nextValue = event.target.value;

      props.onValueChange(
        multiple
          ? typeof nextValue === "string"
            ? nextValue.split(",")
            : nextValue
          : nextValue,
      );
    };

    return (
      <Box className={props.className}>
        {renderFieldLabel()}

        <FormControl
          fullWidth={props.fullWidth !== false}
          required={props.required}
          error={error}
        >
          <Select
            multiple={multiple}
            value={value}
            onChange={handleChange}
            onOpen={() => setSearchText("")}
            onClose={() => setSearchText("")}
            input={multiple ? <OutlinedInput label={props.label} /> : undefined}
            displayEmpty
            MenuProps={{
              sx: {
                "& .MuiMenu-paper": {
                  maxHeight: 280,
                  overflow: "hidden",
                  borderRadius: "8px",
                  border: "1px solid #e5e5e5",
                  boxShadow: "0px 10px 30px rgba(0, 0, 0, 0.12)",
                },
                "& .MuiMenu-list": {
                  maxHeight: 248,
                  overflowY: "auto",
                  padding: 0,
                },
              },
            }}
            renderValue={(selected) => {
              if (
                !selected ||
                (Array.isArray(selected) && selected.length === 0)
              ) {
                return (
                  <Typography
                    sx={{
                      color: "#9e9e9e",
                      fontSize: 13.5,
                    }}
                  >
                    {props.placeholder || "Wybierz opcję"}
                  </Typography>
                );
              }
              if (multiple && Array.isArray(selected)) {
                return selected.join(", ");
              }
              const option = props.options.find(
                (opt) => opt.value === selected,
              );
              return option?.label || selected;
            }}
            sx={{
              borderRadius: "8px",
              height: "44px",
              backgroundColor: "#fff",

              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: error ? "#e50043" : "#e0e0e0",
              },

              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: error ? "#e50043" : "#000000",
              },

              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: error ? "#e50043" : "#000000",
                borderWidth: 1.5,
              },

              "& .MuiSelect-select": {
                fontSize: 13.5,
                minHeight: "auto",
                padding: "10px 14px",
                display: "flex",
                alignItems: "center",
                height: "44px",
                boxSizing: "border-box",
              },
            }}
          >
            {!multiple && props.placeholder && (
              <MenuItem
                value=""
                disabled
                sx={{
                  fontSize: 13.5,
                  color: "#9e9e9e",
                  fontStyle: "italic",
                }}
              >
                {props.placeholder}
              </MenuItem>
            )}
            <ListSubheader
              component="div"
              sx={{
                position: "sticky",
                top: 0,
                zIndex: 2,
                backgroundColor: "#fff",
                borderBottom: "1px solid #eeeeee",
                padding: "8px 10px",
                lineHeight: 1.2,
              }}
            >
              <TextField
                size="small"
                fullWidth
                value={searchText}
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Search..."
                slotProps={{
                  input: {
                    sx: {
                      borderRadius: "6px",
                      backgroundColor: "#f7f7f8",
                      fontSize: 13,
                      height: 34,
                      "& fieldset": {
                        borderColor: "#e0e0e0",
                      },
                      "&:hover fieldset": {
                        borderColor: "#000000",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#000000",
                        borderWidth: "1.5px",
                      },
                    },
                  },
                }}
              />
            </ListSubheader>
            {filteredOptions.map((option) => (
              <MenuItem
                key={option.value}
                value={option.value}
                sx={{
                  fontSize: 13.5,

                  "&.Mui-selected": {
                    backgroundColor: "#f5f5f5",
                    fontWeight: 700,
                  },

                  "&.Mui-selected:hover": {
                    backgroundColor: "#eeeeee",
                  },
                }}
              >
                {(multiple
                  ? value.includes(option.value)
                  : value === option.value) && (
                  <CheckRounded
                    sx={{
                      mr: 1,
                      fontSize: 18,
                      color: "#e50043",
                    }}
                  />
                )}

                {option.label}
              </MenuItem>
            ))}
          </Select>

          {helperText && (
            <FormHelperText sx={{ color: error ? "#e50043" : "#757575" }}>
              {helperText}
            </FormHelperText>
          )}
        </FormControl>
      </Box>
    );
  }

  if (props.type === "date") {
    const dateValue =
      typeof props.value === "string" && props.value
        ? dayjs(props.value)
        : null;

    return (
      <Box className={props.className}>
        {renderFieldLabel()}

        <ThemeProvider theme={datePickerTheme}>
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              value={dateValue}
              onChange={(newValue) => {
                props.onValueChange(
                  newValue ? newValue.format("YYYY-MM-DD") : "",
                );
              }}
              format="DD/MM/YYYY"
              slotProps={{
                textField: {
                  fullWidth: props.fullWidth !== false,
                  error,
                  helperText,
                  size: "small",
                  sx: {
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "8px !important",
                      height: "44px !important",
                      backgroundColor: "#fff",
                      minHeight: "44px !important",
                      maxHeight: "44px !important",
                      padding: 0,

                      "& fieldset": {
                        borderColor: error ? "#e50043" : "#e0e0e0",
                        borderRadius: "8px !important",
                        top: 0,
                        height: "100%",
                      },

                      "&:hover fieldset": {
                        borderColor: error ? "#e50043" : "#000000",
                      },

                      "&.Mui-focused fieldset": {
                        borderColor: error ? "#e50043" : "#000000",
                        borderWidth: "1.5px !important",
                      },
                    },

                    "& .MuiInputBase-input": {
                      fontSize: 13.5,
                      color: "#111111",
                      padding: "10px 14px !important",
                      height: "44px !important",
                      minHeight: "44px !important",
                      maxHeight: "44px !important",
                      boxSizing: "border-box",
                      lineHeight: "24px",
                    },

                    "& .MuiSvgIcon-root": {
                      color: "#000000",
                      fontSize: 20,
                    },

                    "& .MuiInputAdornment-root": {
                      marginRight: "8px",
                      height: "44px",
                      maxHeight: "44px",
                    },

                    "& .MuiInputAdornment-root button": {
                      padding: "4px",
                    },

                    "& .MuiFormHelperText-root": {
                      marginLeft: 0,
                      fontSize: 12,
                      color: error ? "#e50043" : "#757575",
                    },
                  },
                },

                popper: {
                  sx: {
                    "& .MuiPaper-root": {
                      borderRadius: "10px",
                      border: "1px solid #e5e5e5",
                      boxShadow: "0px 8px 32px rgba(0, 0, 0, 0.12)",
                      overflow: "hidden",
                      marginTop: "4px",
                    },

                    "& .MuiPickersCalendarHeader-root": {
                      padding: "14px 18px 8px 18px",
                      backgroundColor: "#fafafa",
                      borderBottom: "1px solid #f0f0f0",
                    },

                    "& .MuiPickersCalendarHeader-label": {
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#111111",
                    },

                    "& .MuiPickersCalendarHeader-switchViewButton": {
                      borderRadius: "6px",
                      padding: "4px",
                      "&:hover": {
                        backgroundColor: "#eeeeee",
                      },
                    },

                    "& .MuiPickersCalendarHeader-labelContainer": {
                      gap: "4px",
                    },

                    "& .MuiDayCalendar-header": {
                      padding: "8px 14px 0 14px",
                    },

                    "& .MuiDayCalendar-weekDayLabel": {
                      fontSize: 11.5,
                      fontWeight: 700,
                      color: "#757575",
                      width: "36px",
                      height: "36px",
                    },

                    "& .MuiDayCalendar-monthContainer": {
                      padding: "0 10px 10px 10px",
                    },

                    "& .MuiPickersDay-root": {
                      fontSize: 13,
                      fontWeight: 500,
                      width: "36px",
                      height: "36px",
                      borderRadius: "6px",
                      margin: "1px",
                      transition: "all 0.12s ease-in-out",

                      "&:hover": {
                        backgroundColor: "#f5f5f5",
                      },

                      "&.Mui-selected": {
                        backgroundColor: "#000000",
                        color: "#fff",
                        fontWeight: 700,
                        "&:hover": {
                          backgroundColor: "#222222",
                        },
                      },

                      "&.MuiPickersDay-today": {
                        border: "1.5px solid #000000",
                        fontWeight: 700,
                      },

                      "&.MuiPickersDay-today.Mui-selected": {
                        border: "1.5px solid #000000",
                      },
                    },

                    "& .MuiDayCalendar-slideTransition": {
                      minHeight: "230px",
                    },

                    "& .MuiPickersArrowSwitcher-root": {
                      padding: "0 4px",
                      "& .MuiIconButton-root": {
                        borderRadius: "6px",
                        padding: "4px",
                        color: "#111111",
                        "&:hover": {
                          backgroundColor: "#eeeeee",
                        },
                      },
                    },

                    "& .MuiYearCalendar-root": {
                      padding: "10px",
                      "& .MuiPickersYear-yearButton": {
                        borderRadius: "6px",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#111111",
                        padding: "8px 12px",
                        "&:hover": {
                          backgroundColor: "#f5f5f5",
                        },
                        "&.Mui-selected": {
                          backgroundColor: "#000000",
                          color: "#fff",
                          fontWeight: 700,
                          "&:hover": {
                            backgroundColor: "#222222",
                          },
                        },
                      },
                    },

                    "& .MuiMonthCalendar-root": {
                      padding: "10px",
                      "& .MuiPickersMonth-monthButton": {
                        borderRadius: "6px",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "#111111",
                        padding: "8px 12px",
                        "&:hover": {
                          backgroundColor: "#f5f5f5",
                        },
                        "&.Mui-selected": {
                          backgroundColor: "#000000",
                          color: "#fff",
                          fontWeight: 700,
                          "&:hover": {
                            backgroundColor: "#222222",
                          },
                        },
                      },
                    },

                    "& .MuiDialogActions-root": {
                      padding: "8px 16px 14px 16px",
                      borderTop: "1px solid #eeeeee",
                      gap: "8px",
                      "& .MuiButton-root": {
                        borderRadius: "6px",
                        fontSize: 12.5,
                        fontWeight: 700,
                        textTransform: "none",
                        padding: "6px 14px",
                        "&.MuiButton-text": {
                          color: "#444444",
                          "&:hover": {
                            backgroundColor: "#f5f5f5",
                          },
                        },
                        "&.MuiButton-contained": {
                          backgroundColor: "#000000",
                          color: "#fff",
                          "&:hover": {
                            backgroundColor: "#222222",
                          },
                        },
                      },
                    },
                  },
                },
              }}
            />
          </LocalizationProvider>
        </ThemeProvider>
      </Box>
    );
  }

  return (
    <Box className={props.className}>
      {renderFieldLabel()}

      <TextField
        required={props.required}
        type={props.type || "text"}
        label={undefined}
        placeholder={props.placeholder}
        value={props.value}
        error={error}
        helperText={helperText}
        fullWidth={props.fullWidth !== false}
        multiline={props.multiline}
        minRows={props.minRows}
        size="small"
        sx={{
          "& .MuiOutlinedInput-root": {
            borderRadius: "8px",
            backgroundColor: "#fff",
            ...(!props.multiline && {
              height: "44px",
            }),

            "& fieldset": {
              borderColor: error ? "#e50043" : "#e0e0e0",
            },

            "&:hover fieldset": {
              borderColor: error ? "#e50043" : "#000000",
            },

            "&.Mui-focused fieldset": {
              borderColor: error ? "#e50043" : "#000000",
              borderWidth: 1.5,
            },
          },

          "& .MuiInputBase-input": {
            fontSize: 13.5,
            color: "#111111",
            boxSizing: "border-box",
            padding: "10px 14px",
            ...(!props.multiline && {
              height: "44px",
            }),
          },

          "& .MuiInputBase-root.MuiInputBase-multiline": {
            padding: "8px 0",
            minHeight: "auto !important",

            "& .MuiInputBase-input": {
              padding: "8px 14px",
              minHeight: "auto !important",
              height: "auto !important",
            },
          },
        }}
        onChange={(event) =>
          props.onValueChange(
            props.type === "number"
              ? Number(event.target.value)
              : event.target.value,
          )
        }
      />
    </Box>
  );
}
