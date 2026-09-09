import { ArrowBackIosNewRounded, ArrowForwardIosRounded } from "@mui/icons-material";
import { Box, Button, IconButton, Typography } from "@mui/material";
import { filterYears } from "../context/AppContext";

export default function YearFilter({ selectedYear, onChange }: { selectedYear: string; onChange: (year: string) => void }) {
    // If selectedYear is empty/undefined or "All", treat as -1 (All Years mode)
    const isAllSelected = !selectedYear || selectedYear === "All";
    const currentIndex = isAllSelected ? -1 : filterYears.indexOf(selectedYear);

    const handlePrevious = () => {
        if (currentIndex > 0) {
            onChange(filterYears[currentIndex - 1]);
        } else if (currentIndex === 0) {
            onChange("All"); // Cycle back to All
        }
    };

    const handleNext = () => {
        if (isAllSelected) {
            onChange(filterYears[0]); // Select first year from All
        } else if (currentIndex < filterYears.length - 1) {
            onChange(filterYears[currentIndex + 1]);
        }
    };

    return (
        <Box className="flex items-center justify-end gap-3 border-t border-[#edf1ef] pt-4">
            <Box className="flex items-center gap-2">
                <IconButton
                    size="small"
                    disabled={isAllSelected}
                    onClick={handlePrevious}
                    aria-label="Previous year"
                >
                    <ArrowBackIosNewRounded sx={{ fontSize: 14 }} />
                </IconButton>

                <Typography
                    sx={{ minWidth: 72, textAlign: "center", color: "#173c35", fontSize: 13, fontWeight: 800 }}
                >
                    {isAllSelected ? "All Years" : selectedYear}
                </Typography>

                <IconButton
                    size="small"
                    disabled={currentIndex === filterYears.length - 1}
                    onClick={handleNext}
                    aria-label="Next year"
                >
                    <ArrowForwardIosRounded sx={{ fontSize: 14 }} />
                </IconButton>

                {/* Optional reset button to clear filter instantly */}
                {!isAllSelected && (
                    <Button
                        size="small"
                        onClick={() => onChange("All")}
                        sx={{ fontSize: 11, minWidth: "auto", px: 1, textTransform: "none", color: "#173c35" }}
                    >
                        Show All
                    </Button>
                )}
            </Box>
        </Box>
    );
}