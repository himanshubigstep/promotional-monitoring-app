import { useEffect, useMemo, useRef, useState } from "react";
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
import { catalog } from "../../data/catalog";
import { askAssistant, humanizeToolName, isGeminiConfigured } from "../../services/geminiAssistant";
import type { AssistantDataContext } from "../../services/assistantTools";
import type { ChatMessage } from "../../types/assistant";
import AssistantResultView from "./AssistantResultView";

const SUGGESTIONS = [
  "Where can I see analytics?",
  "Which competitor has the highest discount right now?",
  "Show me all Lakmé products",
  "Summarize promotions from the last 10 days",
];

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

  const dataContext: AssistantDataContext = useMemo(
    () => ({
      catalog,
      productsList,
      promotions,
      retailers: Array.from(
        new Set([...catalog.map((p) => p.retailer), ...productsList.map((p) => p.retailer)]),
      ),
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
            backgroundColor: "#000000",
            color: "#ffffff",
            "&:hover": { backgroundColor: "#1a1a1a" },
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
        slotProps={{ paper: { sx: { width: { xs: "100%", sm: 420 } } } }}
      >
        <Box className="flex h-full flex-col bg-[#fafafa]">
          <Box className="flex items-center justify-between border-b border-[#e5e5e5] bg-white px-4 py-3.5">
            <Box className="flex items-center gap-2">
              <Box className="flex h-8 w-8 items-center justify-center rounded-lg bg-black">
                <AutoAwesomeRounded sx={{ fontSize: 17, color: "#e50043" }} />
              </Box>
              <Box>
                <Typography sx={{ color: "#000", fontSize: 14, fontWeight: 800 }}>
                  Promo Assistant
                </Typography>
                <Typography sx={{ color: "#8a8a8a", fontSize: 10.5 }}>
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
                        ? "bg-black text-white"
                        : message.isError
                          ? "border border-[#f3c8d3] bg-[#fff0f3]"
                          : "border border-[#e5e5e5] bg-white"
                    }`}
                  >
                    <Typography
                      sx={{
                        fontSize: 13,
                        color: message.role === "user" ? "#fff" : message.isError ? "#e50043" : "#1a1a1a",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {message.text}
                    </Typography>
                  </Box>
                  {message.toolName && (
                    <Chip
                      label={humanizeToolName(message.toolName)}
                      size="small"
                      sx={{
                        height: 17,
                        fontSize: 9.5,
                        fontWeight: 700,
                        backgroundColor: "#eee",
                        color: "#666",
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
                <Box className="flex items-center gap-2 rounded-xl border border-[#e5e5e5] bg-white px-3 py-2">
                  <CircularProgress size={14} sx={{ color: "#e50043" }} />
                  <Typography sx={{ color: "#8a8a8a", fontSize: 12.5 }}>Thinking…</Typography>
                </Box>
              )}
            </Box>
          </Box>

          {messages.length <= 1 && (
            <Box className="flex flex-wrap gap-1.5 border-t border-[#e5e5e5] bg-white px-3.5 py-2.5">
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

          <Box className="flex items-center gap-2 border-t border-[#e5e5e5] bg-white px-3 py-2.5">
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
              sx={{ backgroundColor: "#000", color: "#fff", "&:hover": { backgroundColor: "#1a1a1a" } }}
            >
              <SendRounded fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Drawer>
    </>
  );
}
