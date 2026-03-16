"use client";

import { useMemo, useState } from "react";
import styles from "./OnboardingWizard.module.css";

export interface WizardOption {
  value: string;
  title: string;
  description: string;
}

interface StepContent {
  title: string;
  subtitle: string;
}

interface OnboardingWizardProps {
  heading: string;
  description: string;
  runtimeOptions: WizardOption[];
  languageOptions: WizardOption[];
  runtimeValue: string | null;
  languageValue: string | null;
  saving?: boolean;
  error?: string | null;
  submitLabel: string;
  onRuntimeChange: (value: string) => void;
  onLanguageChange: (value: string) => void;
  onSubmit: () => void;
}

const STEPS: StepContent[] = [
  {
    title: "Runtime target",
    subtitle: "Choose where Render should optimize your generated app output.",
  },
  {
    title: "Language preference",
    subtitle: "Set your default language for generated snippets and scaffolds.",
  },
  {
    title: "Review and continue",
    subtitle: "Confirm defaults before continuing.",
  },
];

export function OnboardingWizard({
  heading,
  description,
  runtimeOptions,
  languageOptions,
  runtimeValue,
  languageValue,
  saving = false,
  error,
  submitLabel,
  onRuntimeChange,
  onLanguageChange,
  onSubmit,
}: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const canContinue = step === 0 ? !!runtimeValue : step === 1 ? !!languageValue : true;
  const progress = useMemo(() => ((step + 1) / STEPS.length) * 100, [step]);

  return (
    <div className={styles.page}>
      <div className={styles.gridBackground} />
      <div className={styles.card}>
        <div className={styles.progressWrap} aria-hidden>
          <div className={styles.progressTrack}>
            <div className={styles.progressBar} style={{ width: `${progress}%` }} />
          </div>
        </div>

        <h1 className={styles.heading}>{heading}</h1>
        <p className={styles.description}>{description}</p>
        <h2 className={styles.stepTitle}>{STEPS[step].title}</h2>
        <p className={styles.stepSubtitle}>{STEPS[step].subtitle}</p>

        {step === 0 && (
          <div className={styles.optionsGrid}>
            {runtimeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onRuntimeChange(option.value)}
                className={`${styles.optionCard} ${
                  runtimeValue === option.value ? styles.optionCardActive : ""
                }`}
              >
                <span className={styles.optionTitle}>{option.title}</span>
                <span className={styles.optionDescription}>{option.description}</span>
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className={styles.optionsList}>
            {languageOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onLanguageChange(option.value)}
                className={`${styles.optionRow} ${
                  languageValue === option.value ? styles.optionCardActive : ""
                }`}
              >
                <span className={styles.optionTitle}>{option.title}</span>
                <span className={styles.optionDescription}>{option.description}</span>
              </button>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className={styles.summary}>
            <div className={styles.summaryRow}>
              <span>Runtime</span>
              <strong>{runtimeOptions.find((o) => o.value === runtimeValue)?.title ?? "-"}</strong>
            </div>
            <div className={styles.summaryRow}>
              <span>Language</span>
              <strong>{languageOptions.find((o) => o.value === languageValue)?.title ?? "-"}</strong>
            </div>
          </div>
        )}

        {error && <p className={styles.errorText}>{error}</p>}

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => setStep((prev) => Math.max(0, prev - 1))}
            disabled={saving || step === 0}
          >
            Back
          </button>
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => setStep((prev) => Math.min(STEPS.length - 1, prev + 1))}
              disabled={!canContinue}
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={onSubmit}
              disabled={saving || !runtimeValue || !languageValue}
            >
              {saving ? "Saving..." : submitLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
