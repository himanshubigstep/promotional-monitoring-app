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

// Create a theme that overrides the primary color to remove blue
const datePickerTheme = createTheme({
    palette: {
        primary: {
            main: "#286e5e",
        },
    },
    components: {
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#286e5e !important",
                        borderWidth: "2px !important",
                    },
                    "&.Mui-error.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#b55a50 !important",
                        borderWidth: "2px !important",
                    },
                },
            },
        },
        MuiInputBase: {
            styleOverrides: {
                root: {
                    "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#286e5e !important",
                        borderWidth: "2px !important",
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
                    color: error ? "#b55a50" : "#48665d",
                    fontSize: 12,
                    fontWeight: 700,
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
                        color: "#286e5e",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        padding: 0,
                        lineHeight: 1.4,
                        textDecoration: "underline",
                        textUnderlineOffset: "2px",
                        whiteSpace: "nowrap",
                        fontFamily: "inherit",
                        '&:hover': {
                            color: "#1e534b",
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

        const handleChange = (
            event: SelectChangeEvent<string | string[]>,
        ) => {
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
                        input={
                            multiple ? <OutlinedInput label={props.label} /> : undefined
                        }
                        displayEmpty
                        MenuProps={{
                            sx: {
                                "& .MuiMenu-paper": {
                                    maxHeight: 280,
                                    overflow: "hidden",
                                    borderRadius: "12px",
                                    border: "1px solid #edf1ef",
                                    boxShadow: "0px 10px 30px rgba(17, 24, 39, 0.12)",
                                },
                                "& .MuiMenu-list": {
                                    maxHeight: 248,
                                    overflowY: "auto",
                                    padding: 0,
                                },
                            },
                        }}
                        renderValue={(selected) => {
                            if (!selected || (Array.isArray(selected) && selected.length === 0)) {
                                return (
                                    <Typography
                                        sx={{
                                            color: "#a0aaa7",
                                            fontSize: 14,
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
                                (opt) => opt.value === selected
                            );
                            return option?.label || selected;
                        }}
                        sx={{
                            borderRadius: "8px",
                            height: "48px",
                            backgroundColor: "#fff",

                            "& .MuiOutlinedInput-notchedOutline": {
                                borderColor: error ? "#b55a50" : "#dce6e2",
                            },

                            "&:hover .MuiOutlinedInput-notchedOutline": {
                                borderColor: error ? "#b55a50" : "#7dbba8",
                            },

                            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                                borderColor: error ? "#b55a50" : "#286e5e",
                                borderWidth: 2,
                            },

                            "& .MuiSelect-select": {
                                fontSize: 14,
                                minHeight: "auto",
                                padding: "12px 14px",
                                display: "flex",
                                alignItems: "center",
                                height: "48px",
                                boxSizing: "border-box",
                            },
                        }}
                    >
                        {!multiple && props.placeholder && (
                            <MenuItem
                                value=""
                                disabled
                                sx={{
                                    fontSize: 14,
                                    color: "#a0aaa7",
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
                                borderBottom: "1px solid #edf1ef",
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
                                            borderRadius: "8px",
                                            backgroundColor: "#f8fbfa",
                                            fontSize: 13,
                                            height: 36,
                                            "& fieldset": {
                                                borderColor: "#dce6e2",
                                            },
                                            "&:hover fieldset": {
                                                borderColor: "#7dbba8",
                                            },
                                            "&.Mui-focused fieldset": {
                                                borderColor: "#286e5e",
                                                borderWidth: "1px",
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
                                    fontSize: 14,

                                    "&.Mui-selected": {
                                        backgroundColor: "transparent",
                                    },

                                    "&.Mui-selected:hover": {
                                        backgroundColor: "#f5f9f7",
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
                                                color: "#286e5e",
                                            }}
                                        />
                                    )}

                                {option.label}
                            </MenuItem>
                        ))}
                    </Select>

                    {helperText && (
                        <FormHelperText>{helperText}</FormHelperText>
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
                                            height: "48px !important",
                                            backgroundColor: "#fff",
                                            minHeight: "48px !important",
                                            maxHeight: "48px !important",
                                            padding: 0,

                                            "& fieldset": {
                                                borderColor: error ? "#b55a50" : "#dce6e2",
                                                borderRadius: "8px !important",
                                                top: 0,
                                                height: "100%",
                                            },

                                            "&:hover fieldset": {
                                                borderColor: error ? "#b55a50" : "#7dbba8",
                                            },

                                            "&.Mui-focused fieldset": {
                                                borderColor: error ? "#b55a50" : "#286e5e",
                                                borderWidth: "2px !important",
                                            },
                                        },

                                        "& .MuiInputBase-input": {
                                            fontSize: 14,
                                            color: "#263b35",
                                            padding: "12px 14px !important",
                                            height: "48px !important",
                                            minHeight: "48px !important",
                                            maxHeight: "48px !important",
                                            boxSizing: "border-box",
                                            lineHeight: "24px",
                                        },

                                        "& .MuiSvgIcon-root": {
                                            color: "#286e5e",
                                            fontSize: 20,
                                        },

                                        "& .MuiInputAdornment-root": {
                                            marginRight: "8px",
                                            height: "48px",
                                            maxHeight: "48px",
                                        },

                                        "& .MuiInputAdornment-root button": {
                                            padding: "4px",
                                        },

                                        "& .MuiFormHelperText-root": {
                                            marginLeft: 0,
                                            fontSize: 12,
                                            color: error ? "#b55a50" : "#789088",
                                        },
                                    },
                                },

                                popper: {
                                    sx: {
                                        "& .MuiPaper-root": {
                                            borderRadius: "12px",
                                            border: "1px solid #e3ece8",
                                            boxShadow: "0px 8px 40px rgba(40, 110, 94, 0.15)",
                                            overflow: "hidden",
                                            marginTop: "4px",
                                        },

                                        "& .MuiPickersCalendarHeader-root": {
                                            padding: "16px 20px 8px 20px",
                                            backgroundColor: "#f8fbfa",
                                        },

                                        "& .MuiPickersCalendarHeader-label": {
                                            fontSize: 15,
                                            fontWeight: 600,
                                            color: "#263b35",
                                        },

                                        "& .MuiPickersCalendarHeader-switchViewButton": {
                                            borderRadius: "8px",
                                            padding: "4px",
                                            "&:hover": {
                                                backgroundColor: "#e8f3ef",
                                            },
                                        },

                                        "& .MuiPickersCalendarHeader-labelContainer": {
                                            gap: "4px",
                                        },

                                        "& .MuiDayCalendar-header": {
                                            padding: "8px 16px 0 16px",
                                        },

                                        "& .MuiDayCalendar-weekDayLabel": {
                                            fontSize: 12,
                                            fontWeight: 600,
                                            color: "#789088",
                                            width: "36px",
                                            height: "36px",
                                        },

                                        "& .MuiDayCalendar-monthContainer": {
                                            padding: "0 12px 12px 12px",
                                        },

                                        "& .MuiPickersDay-root": {
                                            fontSize: 13,
                                            fontWeight: 500,
                                            width: "36px",
                                            height: "36px",
                                            borderRadius: "8px",
                                            margin: "2px",
                                            transition: "all 0.15s ease-in-out",

                                            "&:hover": {
                                                backgroundColor: "#e8f3ef",
                                                transform: "scale(1.05)",
                                            },

                                            "&.Mui-selected": {
                                                backgroundColor: "#286e5e",
                                                color: "#fff",
                                                fontWeight: 600,
                                                "&:hover": {
                                                    backgroundColor: "#215c4f",
                                                },
                                            },

                                            "&.MuiPickersDay-today": {
                                                border: "2px solid #286e5e",
                                                fontWeight: 600,
                                            },

                                            "&.MuiPickersDay-today.Mui-selected": {
                                                border: "2px solid #286e5e",
                                            },
                                        },

                                        "& .MuiDayCalendar-slideTransition": {
                                            minHeight: "240px",
                                        },

                                        "& .MuiPickersArrowSwitcher-root": {
                                            padding: "0 4px",
                                            "& .MuiIconButton-root": {
                                                borderRadius: "8px",
                                                padding: "4px",
                                                color: "#48665d",
                                                "&:hover": {
                                                    backgroundColor: "#e8f3ef",
                                                },
                                            },
                                        },

                                        "& .MuiYearCalendar-root": {
                                            padding: "12px",
                                            "& .MuiPickersYear-yearButton": {
                                                borderRadius: "8px",
                                                fontSize: 14,
                                                fontWeight: 500,
                                                color: "#263b35",
                                                padding: "8px 12px",
                                                "&:hover": {
                                                    backgroundColor: "#e8f3ef",
                                                },
                                                "&.Mui-selected": {
                                                    backgroundColor: "#286e5e",
                                                    color: "#fff",
                                                    fontWeight: 600,
                                                    "&:hover": {
                                                        backgroundColor: "#215c4f",
                                                    },
                                                },
                                            },
                                        },

                                        "& .MuiMonthCalendar-root": {
                                            padding: "12px",
                                            "& .MuiPickersMonth-monthButton": {
                                                borderRadius: "8px",
                                                fontSize: 14,
                                                fontWeight: 500,
                                                color: "#263b35",
                                                padding: "8px 12px",
                                                "&:hover": {
                                                    backgroundColor: "#e8f3ef",
                                                },
                                                "&.Mui-selected": {
                                                    backgroundColor: "#286e5e",
                                                    color: "#fff",
                                                    fontWeight: 600,
                                                    "&:hover": {
                                                        backgroundColor: "#215c4f",
                                                    },
                                                },
                                            },
                                        },

                                        "& .MuiDialogActions-root": {
                                            padding: "8px 16px 16px 16px",
                                            borderTop: "1px solid #e3ece8",
                                            gap: "8px",
                                            "& .MuiButton-root": {
                                                borderRadius: "8px",
                                                fontSize: 13,
                                                fontWeight: 600,
                                                textTransform: "none",
                                                padding: "6px 16px",
                                                "&.MuiButton-text": {
                                                    color: "#48665d",
                                                    "&:hover": {
                                                        backgroundColor: "#e8f3ef",
                                                    },
                                                },
                                                "&.MuiButton-contained": {
                                                    backgroundColor: "#286e5e",
                                                    color: "#fff",
                                                    "&:hover": {
                                                        backgroundColor: "#215c4f",
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
                        // Only apply height for non-multiline fields
                        ...(!props.multiline && {
                            height: "48px",
                        }),

                        "& fieldset": {
                            borderColor: error ? "#b55a50" : "#dce6e2",
                        },

                        "&:hover fieldset": {
                            borderColor: error ? "#b55a50" : "#7dbba8",
                        },

                        "&.Mui-focused fieldset": {
                            borderColor: error ? "#b55a50" : "#286e5e",
                            borderWidth: 2,
                        },
                    },

                    "& .MuiInputBase-input": {
                        fontSize: 14,
                        color: "#263b35",
                        boxSizing: "border-box",
                        padding: "12px 14px",
                        // Only apply height for non-multiline fields
                        ...(!props.multiline && {
                            height: "48px",
                        }),
                    },

                    // For multiline textarea
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