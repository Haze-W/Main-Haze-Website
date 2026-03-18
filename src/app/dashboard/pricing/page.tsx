"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import styles from "./pricing.module.css";

const PLANS = [
  {
    id: "free",
    name: "Free",
    desc: "Perfect for hobbyists, students, or early-stage creators.",
    monthly: 0,
    yearly: 0,
    features: [
      "Access to a basic asset library",
      "15-second video animation",
      "Generate up to 10 scenes/month",
      "Watermarked exports",
      "Try basic AI prompts",
    ],
    cta: "You're on Creator",
    ctaStyle: "muted",
    highlighted: false,
  },
  {
    id: "creator",
    name: "Creator",
    desc: "For indie creators, and startups who need high-quality output.",
    monthly: 20,
    yearly: 16,
    features: [
      "Everything in Free",
      "Unlimited 3D scene generation",
      "Premium asset library access",
      "Animations up to 30 seconds",
      "20+ Video AI models",
    ],
    cta: "Current Plan",
    ctaStyle: "current",
    highlighted: true,
  },
  {
    id: "studio",
    name: "Studio",
    desc: "For teams and studios that need power, speed.",
    monthly: 40,
    yearly: 32,
    features: [
      "Everything in Creator",
      "Unlimited 3D scene generation",
      "Full access to premium asset library",
      "Animations up to 60 seconds",
      "Unlimited Video AI models",
    ],
    cta: "Get Studio",
    ctaStyle: "primary",
    highlighted: false,
  },
];

export default function PricingPage() {
  const [yearly, setYearly] = useState(false);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Choose your plan</h1>
      <div className={styles.toggle}>
        <button
          type="button"
          className={`${styles.toggleOption} ${!yearly ? styles.toggleActive : ""}`}
          onClick={() => setYearly(false)}
        >
          Pay monthly
        </button>
        <button
          type="button"
          className={`${styles.toggleOption} ${yearly ? styles.toggleActive : ""}`}
          onClick={() => setYearly(true)}
        >
          Pay yearly
          <span className={styles.toggleBadge} />
        </button>
      </div>

      <div className={styles.grid}>
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`${styles.card} ${plan.highlighted ? styles.cardHighlighted : ""}`}
          >
            <div className={styles.cardContent}>
              <h2 className={styles.cardTitle}>{plan.name}</h2>
              <p className={styles.cardDesc}>{plan.desc}</p>
              <div className={styles.price}>
                <span className={styles.priceAmount}>
                  ${yearly ? plan.yearly : plan.monthly}
                </span>
                <span className={styles.priceUnit}>USD / month</span>
              </div>
              <button
                type="button"
                className={`${styles.cta} ${styles[`cta${plan.ctaStyle.charAt(0).toUpperCase() + plan.ctaStyle.slice(1)}`]}`}
              >
                {plan.cta}
              </button>
              <ul className={styles.features}>
                {plan.features.map((f, i) => (
                  <li key={i}>
                    <Check size={18} strokeWidth={2} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
