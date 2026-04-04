/** Community / external links used across dashboard & editor. Override via env in production. */
export const DISCORD_COMMUNITY_URL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_DISCORD_INVITE_URL) ||
  "https://discord.com";

export const CONTACT_EMAIL =
  (typeof process !== "undefined" && process.env.NEXT_PUBLIC_CONTACT_EMAIL) || "hello@haze.app";
