import { useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import mhpLogo from "../assets/mhp-logo.png";

const ALLOWED_DOMAIN = "@northmshomepros.com";

type AuthView = "login" | "signup" | "forgot-password" | "check-email" | "reset-password";

interface AuthScreenProps {
  onAuthenticated: () => void;
  initialView?: AuthView;
  onDevBypass?: () => void;
}

const isDev = import.meta.env.DEV;

function isAllowedEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(ALLOWED_DOMAIN);
}

export function AuthScreen({ onAuthenticated, initialView = "login", onDevBypass }: AuthScreenProps) {
  const [view, setView] = useState<AuthView>(initialView);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const resetForm = useCallback(() => {
    setError("");
    setSuccess("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setFullName("");
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError("Supabase is not configured. Check your environment variables.");
      return;
    }
    setError("");
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    setLoading(false);
    if (authError) {
      setError(
        authError.message === "Failed to fetch"
          ? "Unable to reach the server. Please check your internet connection."
          : authError.message
      );
      return;
    }
    onAuthenticated();
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError("Supabase is not configured. Check your environment variables.");
      return;
    }
    if (!isAllowedEmail(email)) {
      setError(`Only ${ALLOWED_DOMAIN} email addresses can create accounts.`);
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setError("");
    setLoading(true);

    const { data, error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: "proestimate://auth/callback",
      },
    });

    if (authError) {
      setLoading(false);
      setError(authError.message);
      return;
    }

    // Create team_member record linked to auth user
    if (data.user) {
      await supabase.from("team_members").insert({
        auth_id: data.user.id,
        full_name: fullName.trim(),
        email: email.trim(),
        role: "estimator",
      });
    }

    setLoading(false);

    // If email confirmation is required, show check-email view
    if (data.user && !data.session) {
      setView("check-email");
      return;
    }

    onAuthenticated();
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }
    if (!isAllowedEmail(email)) {
      setError(`Only ${ALLOWED_DOMAIN} email addresses are supported.`);
      return;
    }
    setError("");
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo: "proestimate://auth/callback" }
    );

    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setView("check-email");
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setError("");
    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSuccess("Password updated successfully!");
    setTimeout(() => {
      onAuthenticated();
    }, 1500);
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center"
      style={{ background: "#ffffff" }}
    >
      {/* Drag region for frameless window */}
      <div className="drag absolute inset-x-0 top-0 h-10" />

      {/* Background glow */}
      <div
        className="absolute rounded-full blur-[100px] opacity-15"
        style={{
          width: 400,
          height: 400,
          background: "var(--accent)",
        }}
      />

      <div className="relative w-full max-w-[400px] px-6">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <img src={mhpLogo} alt="MHP Construction" className="h-20 w-auto drop-shadow-sm" />
          <h1 className="mt-4 text-[20px] font-bold text-[var(--label)]" style={{ letterSpacing: "-0.03em", WebkitFontSmoothing: "antialiased" }}>
            MHP Estimate
          </h1>
          <p className="mt-1 text-[12px] font-medium text-[var(--tertiary)]">
            {view === "login" && "Sign in to continue"}
            {view === "signup" && "Create your account"}
            {view === "forgot-password" && "Reset your password"}
            {view === "check-email" && "Check your email"}
            {view === "reset-password" && "Set your new password"}
          </p>
        </div>

        {/* Card */}
        <div className="no-drag rounded-2xl bg-white p-6 shadow-[0_2px_24px_rgba(0,0,0,0.08)] border border-[var(--sep)]">
          {error && (
            <div className="mb-4 rounded-lg border border-[var(--red)]/30 bg-[#ff3b30]/10 px-3 py-2 text-[13px] text-[var(--red)]">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 rounded-lg border border-[var(--green)]/30 bg-[#34c759]/10 px-3 py-2 text-[13px] text-[var(--green)]">
              {success}
            </div>
          )}

          {view === "check-email" && (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent)]/10">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
              </div>
              <p className="text-[14px] text-[var(--label)]">
                We sent a link to <strong>{email}</strong>
              </p>
              <p className="mt-2 text-[12px] text-[var(--tertiary)]">
                Click the link in the email to continue.
              </p>
              <button
                onClick={() => { resetForm(); setView("login"); }}
                className="mt-6 text-[13px] font-medium text-[var(--accent)] hover:underline"
              >
                Back to sign in
              </button>
            </div>
          )}

          {view === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[var(--secondary)]">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                  className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3.5 py-2.5 text-[14px] text-[var(--label)] shadow-sm shadow-black/[0.02] outline-none transition-all placeholder:text-[var(--gray3)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10"
                  placeholder="you@northmshomepros.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[var(--secondary)]">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3.5 py-2.5 text-[14px] text-[var(--label)] shadow-sm shadow-black/[0.02] outline-none transition-all placeholder:text-[var(--gray3)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10"
                  placeholder="Enter your password"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm shadow-[var(--accent)]/20 transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
              >
                {loading ? "Signing in…" : "Sign In"}
              </button>
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => { resetForm(); setView("forgot-password"); }}
                  className="text-[12px] text-[var(--accent)] hover:underline"
                >
                  Forgot password?
                </button>
                <button
                  type="button"
                  onClick={() => { resetForm(); setView("signup"); }}
                  className="text-[12px] text-[var(--accent)] hover:underline"
                >
                  Create account
                </button>
              </div>
            </form>
          )}

          {view === "signup" && (
            <form onSubmit={handleSignup} className="space-y-4">
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[var(--secondary)]">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoFocus
                  autoComplete="name"
                  className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3.5 py-2.5 text-[14px] text-[var(--label)] shadow-sm shadow-black/[0.02] outline-none transition-all placeholder:text-[var(--gray3)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10"
                  placeholder="John Smith"
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[var(--secondary)]">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3.5 py-2.5 text-[14px] text-[var(--label)] shadow-sm shadow-black/[0.02] outline-none transition-all placeholder:text-[var(--gray3)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10"
                  placeholder="you@northmshomepros.com"
                />
                <p className="mt-1 text-[10px] text-[var(--secondary)]">Must be a @northmshomepros.com email</p>
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[var(--secondary)]">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3.5 py-2.5 text-[14px] text-[var(--label)] shadow-sm shadow-black/[0.02] outline-none transition-all placeholder:text-[var(--gray3)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10"
                  placeholder="Min 8 characters"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm shadow-[var(--accent)]/20 transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
              >
                {loading ? "Creating account…" : "Create Account"}
              </button>
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => { resetForm(); setView("login"); }}
                  className="text-[12px] text-[var(--accent)] hover:underline"
                >
                  Already have an account? Sign in
                </button>
              </div>
            </form>
          )}

          {view === "forgot-password" && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[var(--secondary)]">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  autoComplete="email"
                  className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3.5 py-2.5 text-[14px] text-[var(--label)] shadow-sm shadow-black/[0.02] outline-none transition-all placeholder:text-[var(--gray3)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10"
                  placeholder="you@northmshomepros.com"
                />
                <p className="mt-1 text-[10px] text-[var(--secondary)]">Must be a @northmshomepros.com email</p>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm shadow-[var(--accent)]/20 transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send Reset Link"}
              </button>
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => { resetForm(); setView("login"); }}
                  className="text-[12px] text-[var(--accent)] hover:underline"
                >
                  Back to sign in
                </button>
              </div>
            </form>
          )}

          {view === "reset-password" && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[var(--secondary)]">New Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoFocus
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3.5 py-2.5 text-[14px] text-[var(--label)] shadow-sm shadow-black/[0.02] outline-none transition-all placeholder:text-[var(--gray3)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10"
                  placeholder="Min 8 characters"
                />
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-[var(--secondary)]">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-[var(--sep)] bg-[var(--bg)] px-3.5 py-2.5 text-[14px] text-[var(--label)] shadow-sm shadow-black/[0.02] outline-none transition-all placeholder:text-[var(--gray3)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10"
                  placeholder="Re-enter your password"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-[var(--accent)] px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm shadow-[var(--accent)]/20 transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50"
              >
                {loading ? "Updating…" : "Update Password"}
              </button>
              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => { resetForm(); setView("login"); }}
                  className="text-[12px] text-[var(--accent)] hover:underline"
                >
                  Back to sign in
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Version */}
        <p className="mt-6 text-center text-[10px] text-[var(--gray3)]">v1.0.0</p>

        {/* Dev bypass — only in development */}
        {isDev && onDevBypass && (
          <button
            onClick={onDevBypass}
            className="mt-3 w-full rounded-lg border border-dashed border-[#374151] px-3 py-1.5 text-[11px] font-medium text-[var(--tertiary)] transition-colors hover:border-[#4b5563] hover:text-[var(--secondary)]"
          >
            Dev Bypass — Skip Auth
          </button>
        )}
      </div>
    </div>
  );
}
