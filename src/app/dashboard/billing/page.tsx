"use client";

import { useState } from "react";
import {
  FileText,
  DollarSign,
  Box,
  Clock,
  MessageCircle,
  Pencil,
  Check,
} from "lucide-react";
import styles from "./billing.module.css";

const PLAN_DETAILS = [
  { icon: FileText, label: "Tariff", value: "Basic Plan" },
  { icon: DollarSign, label: "Tariff Cost", value: "$49/m" },
  { icon: Box, label: "Monthly Requests Limit", value: "12,000" },
  { icon: Clock, label: "Renewal Date", value: "Aug 6, 2023" },
];

const PLANS = [
  {
    id: "basic",
    name: "Basic Plan",
    price: "$49",
    period: "/month",
    users: "1 user, billed annually",
    button: "Current plan",
    buttonDisabled: true,
    desc: "For small company",
    features: ["Basic features and tools"],
    gradient: null,
  },
  {
    id: "pro",
    name: "Pro Plan",
    price: "$99",
    period: "/month",
    users: "up to 5 users, billed annually",
    button: "Upgrade to Pro",
    buttonDisabled: false,
    desc: "For scaling business",
    features: [
      "Monthly limit of 30k requests",
      "Customizable dashboard",
    ],
    gradient: "orange-blue",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "$249",
    period: "/month",
    users: "unlimited users, billed annually",
    button: "Contact Sales",
    buttonDisabled: false,
    desc: "For large organizations",
    features: [
      "Unlimited users",
      "Customizable requests limit",
      "Advanced analytics",
      "Advanced management tools",
      "24/7 priority support",
    ],
    gradient: "purple-pink",
  },
];

export default function BillingPage() {
  const [sliderValue, setSliderValue] = useState(12000);

  return (
    <div className={styles.billing}>
      <div className={styles.bgBlur} aria-hidden />

      <section className={styles.subscriptionPanel}>
        <div className={styles.panelHeader}>
          <h1 className={styles.panelTitle}>Subscription</h1>
          <div className={styles.panelActions}>
            <button type="button" className={styles.btnSecondary}>
              <MessageCircle size={16} />
              Contact us
            </button>
            <button type="button" className={styles.btnPrimary}>
              <Pencil size={16} />
              Change plan
            </button>
          </div>
        </div>

        <div className={styles.detailsGrid}>
          {PLAN_DETAILS.map(({ icon: Icon, label, value }) => (
            <div key={label} className={styles.detailCard}>
              <Icon size={18} className={styles.detailIcon} />
              <div>
                <span className={styles.detailLabel}>{label}</span>
                <span className={styles.detailValue}>{value}</span>
              </div>
            </div>
          ))}
        </div>

        <div className={styles.sliderSection}>
          <label className={styles.sliderLabel}>
            Upgrade monthly requests limit
          </label>
          <div className={styles.sliderRow}>
            <span className={styles.sliderMin}>1,000</span>
            <input
              type="range"
              min={1000}
              max={12000}
              step={1000}
              value={sliderValue}
              onChange={(e) => setSliderValue(Number(e.target.value))}
              className={styles.slider}
            />
            <span className={styles.sliderMax}>
              <span className={styles.sliderHandle}>{sliderValue.toLocaleString()}</span>
            </span>
          </div>
        </div>
      </section>

      <section className={styles.planCards}>
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`${styles.planCard} ${
              plan.gradient ? styles[`gradient${plan.gradient.replace("-", "")}`] : ""
            }`}
          >
            <h3 className={styles.planName}>{plan.name}</h3>
            <p className={styles.planPrice}>
              {plan.price}
              <span className={styles.planPeriod}>{plan.period}</span>
            </p>
            <p className={styles.planUsers}>{plan.users}</p>
            <button
              type="button"
              className={
                plan.buttonDisabled ? styles.planBtnDisabled : styles.planBtn
              }
              disabled={plan.buttonDisabled}
            >
              {plan.button}
            </button>
            <p className={styles.planDesc}>{plan.desc}</p>
            <ul className={styles.planFeatures}>
              {plan.features.map((f) => (
                <li key={f}>
                  <Check size={14} className={styles.checkIcon} />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}
