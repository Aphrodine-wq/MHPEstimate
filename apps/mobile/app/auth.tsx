import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { supabase } from "@/lib/supabase";
import { colors } from "@/lib/theme";

const ALLOWED_DOMAIN = "@northmshomepros.com";

type AuthView = "login" | "signup" | "forgot-password" | "check-email";

function isAllowedEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(ALLOWED_DOMAIN);
}

export default function AuthScreen() {
  const [view, setView] = useState<AuthView>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const resetForm = useCallback(() => {
    setError("");
    setEmail("");
    setPassword("");
    setFullName("");
  }, []);

  const handleLogin = async () => {
    if (!supabase) {
      setError("Supabase is not configured.");
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
      setError(authError.message);
      return;
    }
    router.replace("/(tabs)");
  };

  const handleSignup = async () => {
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }
    if (!isAllowedEmail(email)) {
      setError(`Only ${ALLOWED_DOMAIN} emails can create accounts.`);
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
      options: { data: { full_name: fullName.trim() } },
    });

    if (authError) {
      setLoading(false);
      setError(authError.message);
      return;
    }

    if (data.user) {
      await supabase.from("team_members").insert({
        auth_id: data.user.id,
        full_name: fullName.trim(),
        email: email.trim(),
        role: "estimator",
      });
    }

    setLoading(false);

    if (data.user && !data.session) {
      setView("check-email");
      return;
    }

    router.replace("/(tabs)");
  };

  const handleForgotPassword = async () => {
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }
    if (!isAllowedEmail(email)) {
      setError(`Only ${ALLOWED_DOMAIN} emails are supported.`);
      return;
    }
    setError("");
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim());

    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setView("check-email");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand */}
        <View style={styles.brand}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>MHP</Text>
          </View>
          <Text style={styles.appName}>ProEstimate AI</Text>
          <Text style={styles.subtitle}>
            {view === "login" && "Sign in to continue"}
            {view === "signup" && "Create your account"}
            {view === "forgot-password" && "Reset your password"}
            {view === "check-email" && "Check your email"}
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {view === "check-email" && (
            <View style={styles.centered}>
              <Text style={styles.bodyText}>
                We sent a link to <Text style={styles.bold}>{email}</Text>
              </Text>
              <Text style={styles.captionText}>Click the link in the email to continue.</Text>
              <TouchableOpacity
                onPress={() => { resetForm(); setView("login"); }}
                style={styles.linkButton}
              >
                <Text style={styles.linkText}>Back to sign in</Text>
              </TouchableOpacity>
            </View>
          )}

          {view === "login" && (
            <>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@northmshomepros.com"
                placeholderTextColor={colors.gray3}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor={colors.gray3}
                secureTextEntry
                autoComplete="password"
              />
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.disabled]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>
                  {loading ? "Signing in..." : "Sign In"}
                </Text>
              </TouchableOpacity>
              <View style={styles.linkRow}>
                <TouchableOpacity onPress={() => { resetForm(); setView("forgot-password"); }}>
                  <Text style={styles.linkText}>Forgot password?</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { resetForm(); setView("signup"); }}>
                  <Text style={styles.linkText}>Create account</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {view === "signup" && (
            <>
              <Text style={styles.inputLabel}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="John Smith"
                placeholderTextColor={colors.gray3}
                autoComplete="name"
              />
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@northmshomepros.com"
                placeholderTextColor={colors.gray3}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <Text style={styles.inputHint}>Must be a @northmshomepros.com email</Text>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Min 8 characters"
                placeholderTextColor={colors.gray3}
                secureTextEntry
                autoComplete="new-password"
              />
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.disabled]}
                onPress={handleSignup}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>
                  {loading ? "Creating account..." : "Create Account"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { resetForm(); setView("login"); }}
                style={styles.centerLink}
              >
                <Text style={styles.linkText}>Already have an account? Sign in</Text>
              </TouchableOpacity>
            </>
          )}

          {view === "forgot-password" && (
            <>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@northmshomepros.com"
                placeholderTextColor={colors.gray3}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              <Text style={styles.inputHint}>Must be a @northmshomepros.com email</Text>
              <TouchableOpacity
                style={[styles.primaryButton, loading && styles.disabled]}
                onPress={handleForgotPassword}
                disabled={loading}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>
                  {loading ? "Sending..." : "Send Reset Link"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { resetForm(); setView("login"); }}
                style={styles.centerLink}
              >
                <Text style={styles.linkText}>Back to sign in</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        <Text style={styles.version}>v1.0.0</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f2f5",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  brand: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  logoText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 1,
  },
  appName: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: colors.secondary,
    marginTop: 4,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 3,
  },
  errorBox: {
    backgroundColor: "#ff3b300d",
    borderRadius: 8,
    padding: 10,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: colors.red,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.secondary,
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.gray5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.text,
  },
  inputHint: {
    fontSize: 10,
    color: colors.secondary,
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.5,
  },
  linkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  linkText: {
    fontSize: 13,
    color: colors.accent,
    fontWeight: "500",
  },
  centerLink: {
    alignItems: "center",
    marginTop: 16,
  },
  linkButton: {
    marginTop: 24,
  },
  centered: {
    alignItems: "center",
    paddingVertical: 16,
  },
  bodyText: {
    fontSize: 14,
    color: colors.text,
    textAlign: "center",
  },
  bold: {
    fontWeight: "600",
  },
  captionText: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 8,
    textAlign: "center",
  },
  version: {
    textAlign: "center",
    fontSize: 10,
    color: colors.tertiary,
    marginTop: 24,
  },
});
