import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AutoAwesomeRounded,
  CloseRounded,
  SendRounded,
  SmartToyRounded,
} from "@mui/icons-material";
import {
  Box,
  Chip,
  CircularProgress,
  Drawer,
  Fab,
  IconButton,
  TextField,
  Typography,
} from "@mui/material";
import { useAppContext } from "../../context/AppContext";
import { askAssistant, humanizeToolName, isGeminiConfigured } from "../../services/geminiAssistant";
import type { AssistantDataContext } from "../../services/assistantTools";
import type { ChatMessage } from "../../types/assistant";
import AssistantResultView from "./AssistantResultView";
import FormattedText from "./FormattedText";

const SUGGESTIONS = [
  "Where can I see analytics?",
  "Which competitor has the highest discount right now?",
  "Show me all Lakmé products",
  "Summarize promotions from the last 10 days",
];

// Resizable panel width (desktop only — the drawer stays full-width on
// mobile). Persisted across sessions so a user's preferred width sticks.
const MIN_PANEL_WIDTH = 320;
const MAX_PANEL_WIDTH = 900;
const DEFAULT_PANEL_WIDTH = 420;
const PANEL_WIDTH_STORAGE_KEY = "assistantPanelWidth";

function readStoredPanelWidth(): number {
  try {
    const stored = Number(localStorage.getItem(PANEL_WIDTH_STORAGE_KEY));
    if (Number.isFinite(stored) && stored >= MIN_PANEL_WIDTH && stored <= MAX_PANEL_WIDTH) {
      return stored;
    }
  } catch {
    // localStorage can throw in private/locked-down browser contexts —
    // fall back to the default rather than breaking the widget.
  }
  return DEFAULT_PANEL_WIDTH;
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: uid(),
      role: "assistant",
      text:
        "Hi! I'm the promotional monitoring assistant. Ask me how to use the app, or ask about stores, brands, products, and promotions.",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  // A request already in flight, tracked outside React state: `loading`
  // (state) is only guaranteed current after the next render, so a second
  // send() invoked before that commit (fast double-Enter, or Enter then a
  // click) would still read the old `loading=false` from its own closure and
  // fire a second concurrent request. This ref is set synchronously instead.
  const sendingRef = useRef(false);
  const { productsList, promotions, brandsByMarket } = useAppContext();

  const [panelWidth, setPanelWidth] = useState(readStoredPanelWidth);
  const panelWidthRef = useRef(panelWidth);
  const isResizingRef = useRef(false);
  panelWidthRef.current = panelWidth;

  // Drag-to-resize: mousedown on the handle starts tracking, mousemove
  // (attached to the window, not just the handle, so the drag keeps working
  // even if the cursor slips past the thin handle) updates the width live,
  // mouseup ends it and persists the final width. Listeners are attached
  // once on mount rather than re-attached on every width change.
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isResizingRef.current) return;
      const next = Math.min(
        MAX_PANEL_WIDTH,
        Math.max(MIN_PANEL_WIDTH, window.innerWidth - event.clientX),
      );
      setPanelWidth(next);
    };
    const stopResizing = () => {
      if (!isResizingRef.current) return;
      isResizingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      try {
        localStorage.setItem(PANEL_WIDTH_STORAGE_KEY, String(panelWidthRef.current));
      } catch {
        // Ignore storage errors — losing the remembered width isn't critical.
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, []);

  const startResizing = (event: React.MouseEvent) => {
    event.preventDefault();
    isResizingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const dataContext: AssistantDataContext = useMemo(
    () => ({
      // catalog and productsList were separate static/managed datasets
      // before the app was wired to Supabase; now both are the same
      // unified set of approved promotions (see Decisions.md).
      catalog: productsList,
      productsList,
      promotions,
      retailers: Array.from(new Set(productsList.map((p) => p.retailer))),
      // All markets, not just PL — `brandsByMarket.PL` alone would silently
      // treat every CZ-only brand as unknown to anything reading ctx.brands.
      brands: Array.from(new Set([...brandsByMarket.PL, ...brandsByMarket.CZ])),
    }),
    [productsList, promotions, brandsByMarket],
  );

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || sendingRef.current) return;
    sendingRef.current = true;
    const userMessage: ChatMessage = { id: uid(), role: "user", text: question };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    try {
      if (!isGeminiConfigured()) {
        throw new Error(
          "The assistant isn't configured yet: set REACT_APP_GEMINI_API_KEY in your .env.local file.",
        );
      }
      const answer = await askAssistant(question, nextMessages, dataContext);
      setMessages((current) => [
        ...current,
        {
          id: uid(),
          role: "assistant",
          text: answer.text,
          result: answer.result,
          toolName: answer.toolName,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: uid(),
          role: "assistant",
          text: error instanceof Error ? error.message : "Something went wrong.",
          isError: true,
        },
      ]);
    } finally {
      sendingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <>
      {!open && (
        <Fab
          onClick={() => setOpen(true)}
          sx={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 1300,
            backgroundColor: "#141824",
            color: "#ffffff",
            "&:hover": { backgroundColor: "#31374a" },
          }}
          aria-label="Open assistant"
        >
          <SmartToyRounded />
        </Fab>
      )}

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{ paper: { sx: { width: { xs: "100%", sm: panelWidth } } } }}
      >
        <Box className="relative flex h-full flex-col bg-[#f5f7fa]">
          {/* Drag handle: hidden on mobile, where the drawer is always
              full-width. Listens on mousedown only — the window-level
              listeners in the effect above handle the rest of the drag. */}
          <Box
            onMouseDown={startResizing}
            sx={{
              display: { xs: "none", sm: "block" },
              position: "absolute",
              // Fully inside the panel, never over the backdrop — straddling
              // the edge risked a stray pixel registering as a backdrop
              // click, which closes the whole drawer instead of resizing it.
              left: 0,
              top: 0,
              bottom: 0,
              width: 8,
              cursor: "col-resize",
              zIndex: 10,
              "&:hover, &:active": {
                backgroundColor: "rgba(0,0,0,0.12)",
              },
            }}
            aria-hidden="true"
          />
          <Box className="flex items-center justify-between border-b border-[#e3e6ed] bg-white px-4 py-3.5">
            <Box className="flex items-center gap-2">
              <Box className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1a1d23]">
                <AutoAwesomeRounded sx={{ fontSize: 17, color: "#4d4d4d" }} />
              </Box>
              <Box>
                <Typography sx={{ color: "#141824", fontSize: 14, fontWeight: 800 }}>
                  Promo Assistant
                </Typography>
                <Typography sx={{ color: "#525b75", fontSize: 10.5 }}>
                  Grounded in your live app data
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={() => setOpen(false)} size="small">
              <CloseRounded fontSize="small" />
            </IconButton>
          </Box>

          <Box ref={scrollRef} className="flex-1 overflow-y-auto px-3.5 py-3">
            <Box className="flex flex-col gap-3">
              {messages.map((message) => (
                <Box
                  key={message.id}
                  className={`flex flex-col gap-1.5 ${
                    message.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <Box
                    className={`max-w-[92%] rounded-xl px-3 py-2 ${
                      message.role === "user"
                        ? "bg-[#141824] text-white"
                        : message.isError
                          ? "border border-[#f5c6c6] bg-[#ffe2dc]"
                          : "border border-[#e3e6ed] bg-white"
                    }`}
                  >
                    {message.role === "user" || message.isError ? (
                      // The user's own text and error strings are shown as-is
                      // — only the assistant's replies use markdown (see the
                      // system prompt), so only they need FormattedText.
                      <Typography
                        sx={{
                          fontSize: 13,
                          color: message.role === "user" ? "#fff" : "#fa3b1d",
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {message.text}
                      </Typography>
                    ) : (
                      <FormattedText text={message.text} color="#141824" />
                    )}
                  </Box>
                  {message.toolName && (
                    <Chip
                      label={humanizeToolName(message.toolName)}
                      size="small"
                      sx={{
                        height: 17,
                        fontSize: 9.5,
                        fontWeight: 700,
                        backgroundColor: "#eff2f6",
                        color: "#525b75",
                      }}
                    />
                  )}
                  {message.result && (
                    <Box className="w-full max-w-[92%]">
                      <AssistantResultView result={message.result} />
                    </Box>
                  )}
                </Box>
              ))}
              {loading && (
                <Box className="flex items-center gap-2 rounded-xl border border-[#e3e6ed] bg-white px-3 py-2">
                  <CircularProgress size={14} sx={{ color: "#000000" }} />
                  <Typography sx={{ color: "#525b75", fontSize: 12.5 }}>Thinking…</Typography>
                </Box>
              )}
            </Box>
          </Box>

          {messages.length <= 1 && (
            <Box className="flex flex-wrap gap-1.5 border-t border-[#e3e6ed] bg-white px-3.5 py-2.5">
              {SUGGESTIONS.map((suggestion) => (
                <Chip
                  key={suggestion}
                  label={suggestion}
                  size="small"
                  onClick={() => send(suggestion)}
                  sx={{ fontSize: 11, cursor: "pointer" }}
                />
              ))}
            </Box>
          )}

          <Box className="flex items-center gap-2 border-t border-[#e3e6ed] bg-white px-3 py-2.5">
            <TextField
              fullWidth
              size="small"
              placeholder="Ask about promotions, brands, stores…"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") send(input);
              }}
              disabled={loading}
            />
            <IconButton
              onClick={() => send(input)}
              disabled={loading || !input.trim()}
              sx={{ backgroundColor: "#141824", color: "#fff", "&:hover": { backgroundColor: "#31374a" } }}
            >
              <SendRounded fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Drawer>
    </>
  );
}
