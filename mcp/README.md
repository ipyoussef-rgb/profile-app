# kobil-profile-mcp

An [MCP](https://modelcontextprotocol.io) server that lets an AI agent (Claude
Desktop, Claude Code, Cursor, …) perform **profile / identity actions** against
KOBIL Identity — read a user, update attributes, and trigger password / email
changes — using the same `v3_user` flow the profile-app uses.

## Tools

| Tool | Mode | What it does |
|------|------|--------------|
| `kobil_get_user` | read | Fetch a user's profile (name, email, verification, attributes) |
| `kobil_update_profile` | write | Update firstName/lastName/phone/locale/birthdate/address |
| `kobil_set_attributes` | write | Set arbitrary custom attributes |
| `kobil_send_password_reset` | write | Email the user a secure link to set a new password (`UPDATE_PASSWORD`) |
| `kobil_send_email_update` | write | Email the user a secure link to change their email (`UPDATE_EMAIL`) |

Password/email changes never set a plaintext value — they use Keycloak's
`execute-actions-email`, which emails the user a one-time secure link.

## ⚠️ Security model — read before enabling writes

This server authenticates as the **KOBIL service client** (`client_credentials`).
It therefore acts with **that client's permissions across the whole realm**, not
on behalf of one logged-in user. Any agent you connect to it can act on any user
the client can reach. Mitigations built in:

- **Read-only by default.** Writes are refused unless `MCP_READONLY=0`.
- **Allowlist.** Set `MCP_ALLOWED_USERS` to restrict which users writes may target.
- **No plaintext passwords.** Credential/email changes go through Keycloak's
  email-link flow.
- Run it **locally over stdio** (not exposed on a network). Treat the service
  client secret like a production credential.

`kobil_send_password_reset` / `kobil_send_email_update` additionally require the
service account to hold realm-management **`manage-users`**. The read/update
tools require whatever permission your tenant's `v3_user` endpoint enforces
(see the profile-app's UMA notes).

## Setup

```bash
cd mcp
npm install
npm run build
cp .env.example .env   # fill in KOBIL_IDP_ISSUER + service client id/secret
```

## Register with an MCP client

### Claude Desktop / Claude Code (`mcpServers`)

```jsonc
{
  "mcpServers": {
    "kobil-profile": {
      "command": "node",
      "args": ["/absolute/path/to/profile-app/mcp/dist/index.js"],
      "env": {
        "KOBIL_IDP_ISSUER": "https://idp.<tenant>.kobil.com/auth/realms/<realm>",
        "KOBIL_SERVICE_CLIENT_ID": "…",
        "KOBIL_SERVICE_CLIENT_SECRET": "…",
        "MCP_READONLY": "1"
      }
    }
  }
}
```

Claude Code one-liner (add env to the generated entry afterwards):

```bash
claude mcp add kobil-profile -- node /absolute/path/to/profile-app/mcp/dist/index.js
```

## Example agent prompts

- "Get the KOBIL profile for `erika@example.com`." → `kobil_get_user`
- "Set Erika's phone to +49 170 1234567 and city to Köln." → `kobil_update_profile`
- "Send a password-reset email to user `c9399311-…`." → `kobil_send_password_reset`

## Re: user key (email vs UUID)

`kobil_get_user` / `kobil_update_profile` pass `user` straight into
`v3_user/{user}` — supply whichever your tenant keys by (email or UUID). The
`execute-actions-email` tools always need the **Keycloak UUID**.
