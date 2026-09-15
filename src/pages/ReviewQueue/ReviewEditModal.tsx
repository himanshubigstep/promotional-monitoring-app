import { useEffect, useState } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import type { PendingPromotion, ReviewEditFields } from "../../lib/reviewQueue";

// Deliberately independent of PromotionFormModal: that component's edit mode
// only allows changing dates/discount/promo price (built for tweaking an
// already-saved promo). Reviewing scraped data needs to correct name/discount/
// dates/notes freely — reusing it would mean loosening a control that exists
// for a different, legitimate reason elsewhere in the app.
export default function ReviewEditModal({
  promotion,
  onClose,
  onSave,
}: {
  promotion: PendingPromotion | null;
  onClose: () => void;
  onSave: (id: string, fields: ReviewEditFields) => Promise<void>;
}) {
  const [fields, setFields] = useState<ReviewEditFields>({
    name: "",
    discount_text: "",
    threshold: "",
    notes: "",
    date_from: "",
    date_to: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!promotion) return;
    setFields({
      name: promotion.name,
      discount_text: promotion.discount_text ?? "",
      threshold: promotion.threshold ?? "",
      notes: promotion.notes ?? "",
      date_from: promotion.date_from,
      date_to: promotion.date_to,
    });
    setError("");
  }, [promotion]);

  const update = (key: keyof ReviewEditFields, value: string) =>
    setFields((current) => ({ ...current, [key]: value }));

  async function handleSave() {
    if (!promotion) return;
    if (!fields.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!fields.date_from || !fields.date_to) {
      setError("Both dates are required.");
      return;
    }
    setSaving(true);
    try {
      await onSave(promotion.id, fields);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!promotion} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Correct and approve promotion</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Name"
            value={fields.name}
            onChange={(event) => update("name", event.target.value)}
            fullWidth
          />
          <Stack direction="row" spacing={2}>
            <TextField
              label="From"
              type="date"
              value={fields.date_from}
              onChange={(event) => update("date_from", event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
            <TextField
              label="To"
              type="date"
              value={fields.date_to}
              onChange={(event) => update("date_to", event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              fullWidth
            />
          </Stack>
          <Stack direction="row" spacing={2}>
            <TextField
              label="Discount"
              placeholder="-25%"
              value={fields.discount_text}
              onChange={(event) => update("discount_text", event.target.value)}
              fullWidth
            />
            <TextField
              label="Threshold"
              placeholder="99 PLN"
              value={fields.threshold}
              onChange={(event) => update("threshold", event.target.value)}
              fullWidth
            />
          </Stack>
          <TextField
            label="Notes"
            value={fields.notes}
            onChange={(event) => update("notes", event.target.value)}
            multiline
            minRows={2}
            fullWidth
          />
          {error && (
            <div style={{ color: "#fa3b1d", fontSize: 13 }}>{error}</div>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>
          Save and approve
        </Button>
      </DialogActions>
    </Dialog>
  );
}
