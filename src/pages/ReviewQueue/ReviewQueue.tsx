import { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  approvePromotion,
  editAndApprovePromotion,
  fetchPendingPromotions,
  rejectPromotion,
  type PendingPromotion,
  type ReviewEditFields,
} from "../../lib/reviewQueue";
import ReviewEditModal from "./ReviewEditModal";
import { useAppContext } from "../../context/AppContext";
import { getNoImagePlaceholder } from "../../lib/media";
import { formatRetailerLabel } from "../../data/retailers";

// Color-codes Gemini's self-reported extraction confidence so the sketchiest
// scraped rows are visually obvious before a reviewer reads a single field.
// Thresholds are a judgment call, not a calibrated cutoff — the model's
// confidence is a rough signal, not a guarantee.
function confidenceChipProps(confidence: number | null): { label: string; color: "error" | "warning" | "success" } | null {
  if (confidence === null) return null;
  if (confidence < 0.5) return { label: `Low confidence (${Math.round(confidence * 100)}%)`, color: "error" };
  if (confidence < 0.8) return { label: `Medium confidence (${Math.round(confidence * 100)}%)`, color: "warning" };
  return { label: `High confidence (${Math.round(confidence * 100)}%)`, color: "success" };
}

export default function ReviewQueue() {
  const { canEdit } = useAppContext();
  const [items, setItems] = useState<PendingPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [editingPromotion, setEditingPromotion] = useState<PendingPromotion | null>(null);
  const [rejectingPromotion, setRejectingPromotion] = useState<PendingPromotion | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const data = await fetchPendingPromotions();
      setItems(data);
    } catch (err) {
      setLoadError(
        err instanceof Error
          ? err.message
          : "Failed to load the review queue. Are you signed in as an editor?",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleApprove(promotion: PendingPromotion) {
    setBusyId(promotion.id);
    setActionError(null);
    try {
      await approvePromotion(promotion.id);
      setItems((current) => current.filter((item) => item.id !== promotion.id));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to approve.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject() {
    if (!rejectingPromotion) return;
    setBusyId(rejectingPromotion.id);
    setActionError(null);
    try {
      await rejectPromotion(rejectingPromotion.id, rejectReason);
      setItems((current) => current.filter((item) => item.id !== rejectingPromotion.id));
      setRejectingPromotion(null);
      setRejectReason("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to reject.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleEditSave(id: string, fields: ReviewEditFields) {
    setActionError(null);
    try {
      await editAndApprovePromotion(id, fields);
      setItems((current) => current.filter((item) => item.id !== id));
      setEditingPromotion(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to save.");
    }
  }

  return (
    <Box className="flex flex-col gap-5">
      <Typography sx={{ color: "#525b75", fontSize: 13 }}>
        Scraped and OCR-sourced promotions wait here until an editor approves, corrects, or
        rejects them. Nothing here is visible anywhere else in the app yet.
      </Typography>

      {actionError && (
        <Box sx={{ color: "#fa3b1d", fontSize: 13 }}>{actionError}</Box>
      )}

      {loading && <Typography sx={{ color: "#525b75" }}>Loading…</Typography>}

      {!loading && loadError && (
        <Box sx={{ color: "#fa3b1d", fontSize: 13 }}>{loadError}</Box>
      )}

      {!loading && !loadError && items.length === 0 && (
        <Typography sx={{ color: "#525b75" }}>Nothing waiting for review.</Typography>
      )}

      <Box className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Card key={item.id} className="flex flex-col overflow-hidden" sx={{ borderRadius: "16px", border: "1px solid #e3e6ed" }}>
            <img
              src={item.screenshotUrl || getNoImagePlaceholder()}
              alt={item.name}
              className="w-full h-40 object-cover bg-[#f5f7fa]"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = getNoImagePlaceholder();
              }}
            />
            <Box className="flex flex-col gap-2 p-4">
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
                <Chip
                  size="small"
                  label={item.retailer?.name ? formatRetailerLabel(item.retailer.name) : "Unknown retailer"}
                />
                {item.category?.name && <Chip size="small" label={item.category.name} variant="outlined" />}
                {item.discount_text && (
                  <Chip size="small" color="error" label={item.discount_text} />
                )}
                {(() => {
                  const confidence = confidenceChipProps(item.extraction_confidence);
                  return confidence ? (
                    <Chip size="small" color={confidence.color} variant="outlined" label={confidence.label} />
                  ) : null;
                })()}
                {!!item.uncertain_fields?.length && (
                  <Chip
                    size="small"
                    color="warning"
                    variant="outlined"
                    label={`Unsure: ${item.uncertain_fields.join(", ")}`}
                  />
                )}
              </Stack>
              <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{item.name}</Typography>
              <Typography sx={{ color: "#525b75", fontSize: 12.5 }}>
                {item.date_from} – {item.date_to}
                {item.threshold ? ` • min. ${item.threshold}` : ""}
              </Typography>
              {item.brands.length > 0 && (
                <Typography sx={{ color: "#525b75", fontSize: 12.5 }}>
                  Brands: {item.brands.map((brand) => brand.name).join(", ")}
                </Typography>
              )}
              {item.notes && (
                <Typography sx={{ color: "#525b75", fontSize: 12.5 }}>{item.notes}</Typography>
              )}
              {canEdit ? (
                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Button
                    size="small"
                    variant="contained"
                    disabled={busyId === item.id}
                    onClick={() => handleApprove(item)}
                  >
                    Approve
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={busyId === item.id}
                    onClick={() => setEditingPromotion(item)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    disabled={busyId === item.id}
                    onClick={() => setRejectingPromotion(item)}
                  >
                    Reject
                  </Button>
                </Stack>
              ) : (
                // RLS already blocks non-editors from writing (promotions_update/
                // promotions_delete require is_editor()) — this is just an
                // honest UX hint instead of showing buttons that would 403.
                <Typography sx={{ color: "#a0a8b3", fontSize: 11.5, mt: 1 }}>
                  Sign in as an editor to approve, edit, or reject.
                </Typography>
              )}
            </Box>
          </Card>
        ))}
      </Box>

      <ReviewEditModal
        promotion={editingPromotion}
        onClose={() => setEditingPromotion(null)}
        onSave={handleEditSave}
      />

      <Dialog open={!!rejectingPromotion} onClose={() => setRejectingPromotion(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Reject promotion</DialogTitle>
        <DialogContent>
          <TextField
            label="Reason (optional)"
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            fullWidth
            multiline
            minRows={2}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectingPromotion(null)}>Cancel</Button>
          <Button onClick={handleReject} color="error" variant="contained">
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
