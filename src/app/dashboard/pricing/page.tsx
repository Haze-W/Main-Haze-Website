"use client";

import { useState } from "react";
import { useToast } from "@/components/Toast";
import { CONTACT_EMAIL } from "@/lib/site-links";
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
    desc: "For indie creators, and startups who need high-quality output",
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

function CheckIcon() {
  return (
    <svg className={styles.checkSvg} width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path
        d="M15.384 4.343a.89.89 0 0 1 1.286-.126c.388.334.443.931.121 1.334L8.729 15.657a.89.89 0 0 1-1.246.157L3.37 12.656a.97.97 0 0 1-.191-1.325.89.89 0 0 1 1.277-.198l3.417 2.623 7.51-9.413z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function PricingPage() {
  const [yearly, setYearly] = useState(false);

  return (
    <div className={styles.wrapper}>
      <div className={styles.center}>
        <h1 className={styles.title}>Choose your plan</h1>
        <div className={styles.toggleWrap}>
          <div className={styles.toggle}>
            <div
              className={styles.togglePill}
              style={{ transform: yearly ? "translateX(calc(100% + 3px))" : "translateX(0)" }}
            />
            <button
              type="button"
              className={`${styles.toggleBtn} ${!yearly ? styles.toggleBtnActive : ""}`}
              onClick={() => setYearly(false)}
            >
              Pay monthly
            </button>
            <button
              type="button"
              className={`${styles.toggleBtn} ${yearly ? styles.toggleBtnActive : ""} ${styles.toggleBtnLast}`}
              onClick={() => setYearly(true)}
            >
              Pay yearly
            </button>
          </div>
        </div>

        <div className={styles.grid}>
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`${styles.card} ${plan.highlighted ? styles.cardHighlighted : ""}`}
            >
              {plan.highlighted && (
                <div className={styles.cardImageWrap}>
                  <img
                    src="/images/bg-pricing.png"
                    alt=""
                    className={styles.cardImage}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                  <div className={styles.cardImageFallback} aria-hidden />
                </div>
              )}
              {plan.highlighted ? (
                <h2 className={styles.cardTitleOverlay}>{plan.name}</h2>
              ) : (
                <h2 className={styles.cardTitle}>{plan.name}</h2>
              )}
              <div className={styles.cardInner}>
                <p className={styles.cardDesc}>{plan.desc}</p>
                <div className={styles.priceBox}>
                  <div className={styles.priceRow}>
                    <span className={styles.priceDollar}>$</span>
                    <span className={styles.priceAmount}>
                      {yearly ? plan.yearly : plan.monthly}
                    </span>
                    <span className={styles.priceUnit}>
                      USD /<br />month
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`${styles.cta} ${styles[`cta${plan.ctaStyle.charAt(0).toUpperCase() + plan.ctaStyle.slice(1)}`]}`}
                    onClick={() => handlePlanCta(plan)}
                  >
                    {plan.cta}
                  </button>
                </div>
                <ul className={styles.features}>
                  {plan.features.map((f, i) => (
                    <li key={i}>
                      <CheckIcon />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
