import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Box, Button, Card, TextField, Typography } from "@mui/material";
import { supabase } from "../../lib/supabaseClient";

// Email/password only — no self-service sign-up, per AUTH_LOGIN_PLAN.md
// (provisioning stays manual, matching Decisions.md's accepted "no admin
// UI yet" model). This does not gate the rest of the app: anon visitors
// still see everything read-only without ever hitting this page — see
// App.tsx and AUTH_LOGIN_PLAN.md for why there's no route guard here.
export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const redirectTo =
    (location.state as { from?: string } | null)?.from ?? "/";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setSubmitting(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    navigate(redirectTo, { replace: true });
  }

  return (
    <Box className="flex min-h-screen items-center justify-center bg-[#f4f6f8] p-4">
      <Card
        elevation={0}
        className="w-full max-w-[380px] rounded-2xl border border-[#e7eaee] bg-white p-7"
      >
        <Typography
          sx={{
            color: "#20242b",
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: "-0.01em",
          }}
        >
          Sign in
        </Typography>
        <Typography sx={{ color: "#737b88", fontSize: 13, mt: 0.5, mb: 3 }}>
          Sephora Promotional Monitor - editor &amp; analyst access.
        </Typography>

        <Box component="form" onSubmit={handleSubmit} className="flex flex-col gap-3">
          <TextField
            label="Email"
            type="email"
            size="small"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoFocus
            autoComplete="email"
          />
          <TextField
            label="Password"
            type="password"
            size="small"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
          />
          {error && (
            <Typography sx={{ color: "#e5484d", fontSize: 12.5 }}>
              {error}
            </Typography>
          )}
          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
            sx={{
              mt: 1,
              backgroundColor: "#22252b",
              textTransform: "none",
              fontWeight: 700,
              fontSize: 13.5,
              py: 1,
              "&:hover": { backgroundColor: "#343942" },
            }}
          >
            {submitting ? "Signing in…" : "Sign in"}
          </Button>
        </Box>

        <Typography sx={{ color: "#a0a8b3", fontSize: 11.5, mt: 3 }}>
          Don't have an account? Ask a teammate to provision one - accounts
          aren't self-serve yet.
        </Typography>
      </Card>
    </Box>
  );
}
