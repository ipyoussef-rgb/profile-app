#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  assertAllowed,
  assertWritable,
  birthdateIsoToKobil,
  executeActionsEmail,
  getUser,
  loadEnv,
  updateUser,
  type UpdatePatch,
} from "./kobil.js";

const env = loadEnv();

const server = new McpServer({
  name: "kobil-profile-mcp",
  version: "0.1.0",
});

// Text helpers — MCP tool results are { content: [{type:"text", text}] }.
const ok = (text: string) => ({ content: [{ type: "text" as const, text }] });
const fail = (text: string) => ({ content: [{ type: "text" as const, text }], isError: true });

async function guarded<T>(fn: () => Promise<T>): Promise<ReturnType<typeof ok>> {
  try {
    const r = await fn();
    return ok(typeof r === "string" ? r : JSON.stringify(r, null, 2));
  } catch (e) {
    return fail(`Error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

// ── Read ──────────────────────────────────────────────────────────────────
server.tool(
  "kobil_get_user",
  "Read a user's KOBIL identity profile (name, email, verification status, and stored attributes such as phone/address/birthdate). `user` is the email or the UUID, depending on how your tenant keys v3_user.",
  { user: z.string().min(1).describe("User email or UUID") },
  async ({ user }) =>
    guarded(async () => {
      const u = await getUser(env, user);
      if (!u) return `No user found for "${user}".`;
      // Surface a compact, explicit view (don't dump unknown attribute blobs).
      return {
        id: u.id ?? null,
        username: u.username ?? null,
        email: u.email ?? null,
        emailVerified: u.emailVerified ?? null,
        firstName: u.firstName ?? null,
        lastName: u.lastName ?? null,
        attributes: u.attributes ?? {},
      };
    }),
);

// ── Update identity / attributes ────────────────────────────────────────────
server.tool(
  "kobil_update_profile",
  "Update a user's KOBIL identity fields. Only provided fields change. firstName/lastName are top-level; phone/locale/birthdate/address are stored as attributes (matching the profile app). Requires MCP_READONLY=0.",
  {
    user: z.string().min(1).describe("User email or UUID"),
    firstName: z.string().max(80).optional(),
    lastName: z.string().max(80).optional(),
    phone: z.string().max(40).optional().describe("E.164, e.g. +49170…"),
    locale: z.string().max(16).optional().describe("BCP 47, e.g. de-DE"),
    birthdate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional()
      .describe("YYYY-MM-DD; stored as DD.MM.YYYY"),
    address: z
      .object({
        street: z.string().max(120).optional(),
        locality: z.string().max(80).optional(),
        postalCode: z.string().max(20).optional(),
        country: z.string().length(2).optional().describe("ISO 3166-1 alpha-2"),
      })
      .optional(),
  },
  async ({ user, firstName, lastName, phone, locale, birthdate, address }) =>
    guarded(async () => {
      assertWritable(env);
      assertAllowed(env, user);

      const attributes: Record<string, string[]> = {};
      if (phone) attributes.phone = [phone];
      if (locale) attributes.locale = [locale];
      if (birthdate) {
        const k = birthdateIsoToKobil(birthdate);
        if (k) attributes.birthdate = [k];
      }
      if (address) {
        if (address.street) attributes.street = [address.street];
        if (address.locality) attributes.locality = [address.locality];
        if (address.postalCode) attributes.postal_code = [address.postalCode];
        if (address.country) attributes.country = [address.country.toUpperCase()];
      }

      const patch: UpdatePatch = {};
      if (firstName) patch.firstName = firstName;
      if (lastName) patch.lastName = lastName;
      if (Object.keys(attributes).length) patch.attributes = attributes;

      if (!Object.keys(patch).length) return "Nothing to update — no fields provided.";

      await updateUser(env, user, patch);
      const changed = [
        ...Object.keys(patch).filter((k) => k !== "attributes"),
        ...Object.keys(attributes),
      ];
      return `Updated ${user}: ${changed.join(", ")}.`;
    }),
);

server.tool(
  "kobil_set_attributes",
  "Set arbitrary KOBIL user attributes (each value stored as a string array). Use for custom attributes not covered by kobil_update_profile. Requires MCP_READONLY=0.",
  {
    user: z.string().min(1).describe("User email or UUID"),
    attributes: z
      .record(z.union([z.string(), z.array(z.string())]))
      .describe('e.g. { "nationality": "DE", "tags": ["a","b"] }'),
  },
  async ({ user, attributes }) =>
    guarded(async () => {
      assertWritable(env);
      assertAllowed(env, user);
      const normalized: Record<string, string[]> = {};
      for (const [k, v] of Object.entries(attributes)) normalized[k] = Array.isArray(v) ? v : [v];
      if (!Object.keys(normalized).length) return "Nothing to set — attributes empty.";
      await updateUser(env, user, { attributes: normalized });
      return `Set attributes on ${user}: ${Object.keys(normalized).join(", ")}.`;
    }),
);

// ── Credential / email change (interactive, via secure email link) ──────────
server.tool(
  "kobil_send_password_reset",
  "Email the user a secure link to set a new password (Keycloak UPDATE_PASSWORD required action). No plaintext password is set. `userId` MUST be the Keycloak UUID. Requires MCP_READONLY=0 and the service client must hold realm-management 'manage-users'.",
  {
    userId: z.string().min(1).describe("Keycloak user UUID (not email)"),
    redirectUri: z.string().url().optional().describe("Where to send the user after completion"),
    clientId: z.string().optional().describe("OIDC client_id for the redirect (if redirectUri set)"),
  },
  async ({ userId, redirectUri, clientId }) =>
    guarded(async () => {
      assertWritable(env);
      assertAllowed(env, userId);
      await executeActionsEmail(env, userId, ["UPDATE_PASSWORD"], { redirectUri, clientId });
      return `Password-reset email sent to user ${userId} (UPDATE_PASSWORD).`;
    }),
);

server.tool(
  "kobil_send_email_update",
  "Email the user a secure link to change + verify their email address (Keycloak UPDATE_EMAIL). `userId` MUST be the Keycloak UUID. Requires MCP_READONLY=0 and realm-management 'manage-users'.",
  {
    userId: z.string().min(1).describe("Keycloak user UUID (not email)"),
    redirectUri: z.string().url().optional(),
    clientId: z.string().optional(),
  },
  async ({ userId, redirectUri, clientId }) =>
    guarded(async () => {
      assertWritable(env);
      assertAllowed(env, userId);
      await executeActionsEmail(env, userId, ["UPDATE_EMAIL"], { redirectUri, clientId });
      return `Email-update link sent to user ${userId} (UPDATE_EMAIL).`;
    }),
);

const transport = new StdioServerTransport();
await server.connect(transport);
// Protocol uses stdout; diagnostics go to stderr.
console.error(
  `kobil-profile-mcp ready — realm="${env.realm}", mode=${env.readOnly ? "READ-ONLY" : "READ-WRITE"}` +
    `${env.allowedUsers ? `, allowlist=${env.allowedUsers.length} user(s)` : ""}`,
);
