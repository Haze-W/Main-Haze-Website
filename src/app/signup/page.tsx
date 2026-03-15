"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import AuthLeftPanel from "@/components/auth/AuthLeftPanel";
import styles from "../auth/auth.module.css";

export default function SignupPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      setError("Please agree to the Terms of Service and Privacy Policy.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    const { error: err } = await signup(
      email,
      `${firstName} ${lastName}`.trim() || undefined,
      password
    );
    setIsSubmitting(false);
    if (err) {
      setError(err.message ?? "Sign up failed");
      return;
    }
    router.push("/dashboard");
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
              />
              <input
                type="text"
                className={styles.input}
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
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
              <button type="button" className={styles.socialBtn}>
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
                Google
              </button>
              <button type="button" className={styles.socialBtn}>
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                Apple
              </button>
            </div>
            <div className={styles.authFooter}>
              <Link href="/terms">Terms of Service</Link>
              <Link href="/privacy">Privacy Policy</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
