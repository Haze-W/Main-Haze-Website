import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { sendEmail } from "@/lib/email";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    onExistingUserSignUp: async ({ user }) => {
      const loginUrl = `${process.env.BETTER_AUTH_URL ?? "http://localhost:3000"}/login`;
      void sendEmail({
        to: user.email,
        subject: "Sign-up attempt with your email – Render",
        text: `Someone tried to create an account using your email. If that was you, you can log in here: ${loginUrl}\n\nIf it wasn't you, you can safely ignore this email.`,
        html: `<p>Someone tried to create an account using your email.</p><p>If that was you, <a href="${loginUrl}">log in here</a>.</p><p>If it wasn't you, you can safely ignore this email.</p>`,
      });
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      void sendEmail({
        to: user.email,
        subject: "Verify your email – Render",
        text: `Verify your email by opening this link:\n\n${url}\n\nIf you didn't create an account, you can ignore this email.`,
        html: `<p>Verify your email by clicking the link below.</p><p><a href="${url}">Verify email</a></p><p>If you didn't create an account, you can ignore this email.</p>`,
      });
    },
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
  },
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
});
