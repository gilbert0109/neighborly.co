import { v } from "convex/values";
import { action, mutation, query, MutationCtx } from "./_generated/server";
import { api } from "./_generated/api";
import { requireUser } from "./users";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const FIVE_MINUTES_MS = 5 * 60 * 1000;
// Sandbox "code" prefix. Anything starting with this is treated as a mock.
const SANDBOX_CODE_PREFIX = "SANDBOX_";

// ─────────────────────────────────────────────────────────────────────────────
// Crypto helpers (Node 18+ / Web Crypto compatible)
// ─────────────────────────────────────────────────────────────────────────────

function randomToken(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return base64UrlEncode(buf);
}

function base64UrlEncode(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  // btoa is available in both the browser and Convex's Node 18+ action runtime.
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256Base64Url(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subtle: any = (globalThis as any).crypto.subtle;
  const digest = await subtle.digest("SHA-256", data);
  return base64UrlEncode(new Uint8Array(digest));
}

function isSandboxMode(): boolean {
  return !process.env.MITID_BROKER_URL;
}

async function buildAuthorizeUrl(opts: {
  state: string;
  codeChallenge: string;
  redirectUri: string;
}): Promise<string> {
  if (isSandboxMode()) {
    // Sandbox redirects to our local MitID login simulator (same origin).
    const params = new URLSearchParams({
      state: opts.state,
      code_challenge: opts.codeChallenge,
      code_challenge_method: "S256",
      redirect_uri: opts.redirectUri,
    });
    return `/mitid-sandbox?${params.toString()}`;
  }
  // Production: real OIDC authorize URL with PKCE.
  const brokerUrl = process.env.MITID_BROKER_URL!;
  const clientId = process.env.MITID_CLIENT_ID!;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: opts.redirectUri,
    scope: "openid profile", // + "nin" if CPR access is approved
    state: opts.state,
    code_challenge: opts.codeChallenge,
    code_challenge_method: "S256",
    // acr_values enforce the MitID identity assurance level (high = full MitID)
    acr_values: "https://data.gov.dk/concept/core/egain-ial http://eidas.europa.eu/LoA/high",
  });
  return `${brokerUrl}?${params.toString()}`;
}

async function exchangeCodeForClaims(opts: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<{ sub: string; name?: string; assurance?: "substantial" | "high" }> {
  // Defense in depth: never accept a sandbox-shaped code outside sandbox mode,
  // even if the env var is misconfigured.
  if (!isSandboxMode() && opts.code.startsWith(SANDBOX_CODE_PREFIX)) {
    throw new Error("MitID-verifikationen kunne ikke gennemføres.");
  }

  if (isSandboxMode() || opts.code.startsWith(SANDBOX_CODE_PREFIX)) {
    // Sandbox: derive a stable synthetic subject from the user-provided code
    // so the same "user" re-verifying maps to the same MitID subject.
    const sub = `mitid-sandbox-${opts.code.replace(SANDBOX_CODE_PREFIX, "")}`;
    return {
      sub,
      name: "Demo Bruger (MitID Sandbox)",
      assurance: "high",
    };
  }

  // Production: exchange the authorization code with the broker.
  const tokenUrl = process.env.MITID_BROKER_TOKEN_URL!;
  const clientId = process.env.MITID_CLIENT_ID!;
  const clientSecret = process.env.MITID_CLIENT_SECRET!;

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code: opts.code,
    redirect_uri: opts.redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
    code_verifier: opts.codeVerifier,
  });

  const tokenRes = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!tokenRes.ok) {
    const text = await tokenRes.text();
    throw new Error(`MitID token exchange failed: ${tokenRes.status} ${text}`);
  }

  const tokenJson = (await tokenRes.json()) as {
    id_token: string;
    access_token?: string;
  };

  // Decode JWT (without verifying signature for the demo — in production we'd
  // fetch the JWKS from the broker and verify it cryptographically).
  const [, payload] = tokenJson.id_token.split(".");
  const claims = JSON.parse(
    Buffer.from(payload, "base64url").toString("utf-8")
  ) as { sub: string; name?: string };

  // The broker returns mitid_ial in the userinfo endpoint if needed.
  return {
    sub: claims.sub,
    name: claims.name,
    assurance: "high",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the current MitID verification config.
 * Used by the front-end to know whether it's sandbox or production mode.
 */
export const getMitIDStatus = query({
  args: {},
  handler: async () => {
    return {
      mode: isSandboxMode() ? ("sandbox" as const) : ("production" as const),
      // For demo: advertise the broker name if configured, else "MitID Sandbox".
      brokerName: isSandboxMode()
        ? "MitID Testmiljø"
        : process.env.MITID_BROKER_NAME || "MitID",
    };
  },
});

/**
 * Builds a MitID OIDC-authorize URL with PKCE and returns it.
 * The user is redirected to this URL — either the broker (production) or
 * our local sandbox simulator (dev).
 */
export const startMitIDVerification = mutation({
  args: {
    origin: v.string(),
  },
  handler: async (
    ctx: MutationCtx,
    args: { origin: string }
  ): Promise<{ url: string; state: string; expiresAt: number; mode: "sandbox" | "production" }> => {
    const { userId } = await requireUser(ctx);

    // Generate PKCE pair
    const codeVerifier = randomToken(48); // 64 chars base64url
    const codeChallenge = await sha256Base64Url(codeVerifier);

    // Generate state + nonce
    const state = randomToken(24);
    const nonce = randomToken(24);

    const redirectUri = `${args.origin}/mitid-callback`;
    const createdAt = Date.now();
    const expiresAt = createdAt + FIVE_MINUTES_MS;
    const mode = isSandboxMode() ? "sandbox" : "production";

    await ctx.db.insert("mitidVerifications", {
      userId,
      state,
      nonce,
      codeVerifier,
      codeChallenge,
      redirectUri,
      mode,
      createdAt,
      expiresAt,
    });

    const url = await buildAuthorizeUrl({
      state,
      codeChallenge,
      redirectUri,
    });

    return { url, state, expiresAt, mode };
  },
});

/**
 * Completes the verification after the broker (or sandbox) redirects the
 * user back to /mitid-callback?code=...&state=...
 */
export const completeMitIDVerification = action({
  args: {
    code: v.string(),
    state: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireUser(ctx);

    // Look up the verification record by state.
    // We use runQuery-like access via ctx.db directly is not available in
    // actions — so we call into our own query through ctx.runQuery below.
    // However Convex actions support ctx.db directly for *read* operations.
    const record = await ctx.db
      .query("mitidVerifications")
      .withIndex("by_state", (q) => q.eq("state", args.state))
      .first();

    if (!record) throw new Error("MitID-verifikationen kunne ikke findes.");
    if (record.userId !== userId) throw new Error("Ikke din verifikation.");
    if (record.isConsumed) throw new Error("Verifikationen er allerede brugt.");
    if (record.expiresAt < Date.now()) {
      throw new Error("MitID-verifikationen er udløbet. Prøv igen.");
    }

    const claims = await exchangeCodeForClaims({
      code: args.code,
      codeVerifier: record.codeVerifier,
      redirectUri: record.redirectUri,
    });

    // Mark the verification consumed.
    await ctx.db.patch(record._id, {
      isConsumed: true,
      consumedAt: Date.now(),
    });

    // Persist identity on the user. Type-checked against the mutation's
    // declared validators through `api.mitid.commitMitIDVerification`.
    await ctx.runMutation(api.mitid.commitMitIDVerification, {
      sub: claims.sub,
      name: claims.name,
      assurance: claims.assurance,
    });

    return {
      success: true,
      sub: claims.sub,
      name: claims.name,
    };
  },
});

/**
 * Commit step (called by the action — keeps verification logic separate
 * from DB writes for clean audit trail).
 */
export const commitMitIDVerification = mutation({
  args: {
    sub: v.string(),
    name: v.optional(v.string()),
    assurance: v.optional(
      v.union(v.literal("substantial"), v.literal("high"))
    ),
  },
  handler: async (ctx, args) => {
    const { userId, user } = await requireUser(ctx);

    // Prevent two accounts from claiming the same MitID identity.
    // Uses the dedicated `by_mitid_sub` index for O(log n) lookup.
    const existing = await ctx.db
      .query("users")
      .withIndex("by_mitid_sub", (q) => q.eq("mitidSub", args.sub))
      .first();
    if (existing && existing._id !== userId) {
      throw new Error("Dette MitID er allerede knyttet til en anden konto.");
    }

    await ctx.db.patch(userId, {
      isVerified: true,
      verificationStatus: "verified",
      mitidSub: args.sub,
      mitidName: args.name,
      mitidVerifiedAt: Date.now(),
      mitidAssuranceLevel: args.assurance,
      // If the user didn't set their name yet, take the MitID one.
      ...(args.name && !user.name ? { name: args.name } : {}),
    });

    return { ok: true };
  },
});

/**
 * Allows a user to disconnect their MitID (e.g. if they want to re-verify
 * with a different MitID identity).
 */
export const revokeMitIDVerification = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireUser(ctx);
    await ctx.db.patch(userId, {
      isVerified: false,
      verificationStatus: "unverified",
      mitidSub: undefined,
      mitidName: undefined,
      mitidVerifiedAt: undefined,
      mitidAssuranceLevel: undefined,
    });
  },
});
