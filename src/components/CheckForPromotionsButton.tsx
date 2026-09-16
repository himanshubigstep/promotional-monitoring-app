import { useState } from "react";
import { CheckCircleRounded, KeyboardArrowDownRounded, RadioButtonUncheckedRounded } from "@mui/icons-material";
import { Button, ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import { supabase } from "../lib/supabaseClient";
import { useAppContext } from "../context/AppContext";

// Must match scraper/src/retailers.ts's retailerTargets (the promo-scrape
// list, not the smaller catalog-crawl one) and the "options" list in
// .github/workflows/scrape.yml's workflow_dispatch input.
const RETAILERS = ["Notino", "Superpharm", "Drogerienatura", "Flaconi"];

export default function CheckForPromotionsButton() {
  const { canEdit, showToast } = useAppContext();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [triggering, setTriggering] = useState(false);

  if (!canEdit) return null;

  async function trigger(retailer: string) {
    setAnchorEl(null);
    setTriggering(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        showToast("Sign in again to trigger a scrape.", "error");
        return;
      }

      const response = await fetch("/api/trigger-scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ retailer }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || `Request failed (${response.status})`);
      }

      showToast(
        retailer === "all"
          ? "Scrape triggered for all retailers - check the Review Queue in a few minutes."
          : `Scrape triggered for ${retailer} - check the Review Queue in a few minutes.`,
        "success",
      );
    } catch (err) {
      showToast("No Promotions Available for now", "error");
    } finally {
      setTriggering(false);
    }
  }

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        disabled={triggering}
        endIcon={<KeyboardArrowDownRounded />}
        onClick={(event) => setAnchorEl(event.currentTarget)}
        sx={{
          display: { xs: "none", sm: "inline-flex" },
          borderColor: "#cbd0dd",
          color: "#31374a",
          backgroundColor: "#ffffff",
          fontSize: 13,
          fontWeight: 500,
          px: 2,
          py: 0.8,
          "&:hover": { borderColor: "#3874ff", backgroundColor: "#eaf1ff" },
        }}
      >
        {triggering ? "Triggering…" : "Check for Promotions"}
      </Button>
      <Menu anchorEl={anchorEl} open={!!anchorEl} onClose={() => setAnchorEl(null)}>
        <MenuItem onClick={() => trigger("all")}>
          <ListItemIcon>
            <CheckCircleRounded fontSize="small" sx={{ color: "#3874ff" }} />
          </ListItemIcon>
          <ListItemText primary="All competitors" secondary="Default" />
        </MenuItem>
        {RETAILERS.map((retailer) => (
          <MenuItem key={retailer} onClick={() => trigger(retailer)}>
            <ListItemIcon>
              <RadioButtonUncheckedRounded fontSize="small" sx={{ color: "#a0a8b3" }} />
            </ListItemIcon>
            <ListItemText primary={retailer} />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
