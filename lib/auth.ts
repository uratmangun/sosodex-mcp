import "server-only";

import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { anonymous } from "better-auth/plugins";

import {
  getAppUrl,
  getAuthDatabase,
  getAuthSecret,
  getTrustedOrigins,
} from "@/lib/auth-db";

const appUrl = getAppUrl();

export const auth = betterAuth({
  appName: "SoSoValue Assistant",
  baseURL: appUrl,
  trustedOrigins: getTrustedOrigins(),
  secret: getAuthSecret(),
  database: getAuthDatabase(),
  plugins: [
    anonymous({
      generateName: () => "Guest",
      generateRandomEmail: () => {
        const id = crypto.randomUUID();
        return `guest-${id}@guest.sosodex.local`;
      },
    }),
    nextCookies(),
  ],
  socialProviders: {
    google: {
      clientId:
        process.env.GOOGLE_CLIENT_ID?.trim() ||
        process.env.AUTH_GOOGLE_ID?.trim() ||
        "",
      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET?.trim() ||
        process.env.AUTH_GOOGLE_SECRET?.trim() ||
        "",
      prompt: "select_account",
    },
  },
});

export type BetterAuthSession = NonNullable<
  Awaited<ReturnType<typeof auth.api.getSession>>
>;
