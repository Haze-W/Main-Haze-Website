import { betterAuth } from "better-auth";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { eq } from "drizzle-orm";
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
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/sign-up/email" || !ctx.body?.email) return;
      const [existing] = await db
        .select()
        .from(schema.user)
        .where(eq(schema.user.email, String(ctx.body.email)))
        .limit(1);
      if (existing) {
        throw new APIError("CONFLICT", {
          message: "An account with this email already exists. Please log in.",
        });
      }
    }),
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      void sendEmail({
        to: user.email,
        subject: "Verify your email – Haze",
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
