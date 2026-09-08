import { ArrowBackIosNewRounded, ArrowForwardIosRounded } from "@mui/icons-material";
import { Box, IconButton, Typography } from "@mui/material";
import { filterYears } from "../context/AppContext";

export default function YearFilter({ selectedYear, onChange }: { selectedYear: string; onChange: (year: string) => void }) {
  const currentIndex = selectedYear ? filterYears.indexOf(selectedYear) : -1;
  const previousYear = currentIndex === -1 ? filterYears[filterYears.length - 1] : filterYears[currentIndex - 1] || "";
  const nextYear = currentIndex === -1 ? filterYears[0] : filterYears[currentIndex + 1] || "";

  return (
    <Box className="mt-4 flex items-center justify-between gap-3 border-t border-[#edf1ef] pt-4">
      <Typography sx={{ color: "#82908b", fontSize: 12 }}>Chart year</Typography>
      <Box className="flex items-center gap-2">
        <IconButton size="small" disabled={currentIndex === 0} onClick={() => onChange(previousYear)} aria-label="Previous year"><ArrowBackIosNewRounded sx={{ fontSize: 14 }} /></IconButton>
        <Typography sx={{ minWidth: 72, textAlign: "center", color: "#173c35", fontSize: 13, fontWeight: 800 }}>{selectedYear || "All years"}</Typography>
        <IconButton size="small" disabled={currentIndex === filterYears.length - 1} onClick={() => onChange(nextYear)} aria-label="Next year"><ArrowForwardIosRounded sx={{ fontSize: 14 }} /></IconButton>
      </Box>
    </Box>
  );
}
