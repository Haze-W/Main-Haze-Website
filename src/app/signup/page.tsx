"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import AuthLeftPanel from "@/components/auth/AuthLeftPanel";
import styles from "../auth/auth.module.css";

export default function SignupPage() {
  const { signup, signInWithGoogle, signInWithGithub } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGithubLoading, setIsGithubLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullName = `${firstName} ${lastName}`.trim();
    if (!firstName.trim() || !lastName.trim()) {
      setError("First name and last name are required.");
      return;
    }
    if (!agreed) {
      setError("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    const { error: err } = await signup(email, fullName, password);
    setIsSubmitting(false);
    if (err) {
      setError(err.message ?? "Sign up failed");
      return;
    }
    setEmailSent(true);
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <AuthLeftPanel slogan="Build real Tauri GUIs visually. Ship production-ready desktop apps." />
        <div className={styles.rightPanel}>
          <h1 className={styles.title}>Create an account</h1>
          <p className={styles.subtitle}>
            Already have an account?{" "}
            <Link href="/login">Log in</Link>
          </p>
          {emailSent ? (
            <div className={styles.successBlock}>
              <p className={styles.successTitle}>Check your email</p>
              <p className={styles.successText}>
                We sent a verification link to <strong>{email}</strong>. Click
                the link to verify your account, then you can log in.
              </p>
              <Link href="/login" className={styles.successLink}>
                Go to log in
              </Link>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
            <div className={styles.row}>
              <input
                type="text"
                className={styles.input}
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                autoComplete="given-name"
              />
              <input
                type="text"
                className={styles.input}
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                autoComplete="family-name"
              />
            </div>
            <input
              type="email"
              className={styles.input}
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <div className={styles.inputWrapper}>
              <input
                type={showPassword ? "text" : "password"}
                className={styles.input}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div className={styles.checkboxRow}>
              <input
                type="checkbox"
                id="terms"
                className={styles.checkbox}
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              <label htmlFor="terms" className={styles.checkboxLabel}>
                I agree to the{" "}
                <Link href="/terms" target="_blank" rel="noopener noreferrer">
                  Terms of Service
                </Link>
                {" "}and{" "}
                <Link href="/privacy" target="_blank" rel="noopener noreferrer">
                  Privacy Policy
                </Link>
              </label>
            </div>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating account…" : "Create account"}
            </button>
            <div className={styles.separator}>
              <span>Or register with</span>
            </div>
            <div className={styles.socialRow}>
              <button
                type="button"
                className={styles.socialBtn}
                disabled={isGoogleLoading || isGithubLoading}
                onClick={async () => {
                  setError(null);
                  setIsGoogleLoading(true);
                  const { error: err } = await signInWithGoogle("/onboarding");
                  if (err) setError(err.message ?? "Google sign in failed");
                  setIsGoogleLoading(false);
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                {isGoogleLoading ? "Signing up…" : "Google"}
              </button>
              <button
                type="button"
                className={styles.socialBtn}
                disabled={isGoogleLoading || isGithubLoading}
                onClick={async () => {
                  setError(null);
                  setIsGithubLoading(true);
                  const { error: err } = await signInWithGithub("/onboarding");
                  if (err) setError(err.message ?? "GitHub sign in failed");
                  setIsGithubLoading(false);
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
                {isGithubLoading ? "Signing up…" : "GitHub"}
              </button>
            </div>
            <div className={styles.authFooter}>
              <Link href="/terms">Terms of Service</Link>
              <Link href="/privacy">Privacy Policy</Link>
            </div>
          </form>
          )}
        </div>
      </div>
    </div>
  );
}
