```markdown
# PreacherClan

[![GitHub Stars](https://img.shields.io/github/stars/Rheosta561/PreacherClan?style=social)](https://github.com/Rheosta561/PreacherClan)
[![GitHub Forks](https://img.shields.io/github/forks/Rheosta561/PreacherClan?style=social)](https://github.com/Rheosta561/PreacherClan)
[![GitHub Issues](https://img.shields.io/github/issues/Rheosta561/PreacherClan)](https://github.com/Rheosta561/PreacherClan/issues)
[![GitHub License](https://img.shields.io/github/license/Rheosta561/PreacherClan)](https://github.com/Rheosta561/PreacherClan/blob/master/LICENSE)

## Project Description

This is a centralised repository for the PreacherClan web application. It serves as the main source of truth for the project, encompassing all code, documentation, and related resources. This repository aims to facilitate collaboration, version control, and consistent development practices for the PreacherClan web application.

## About the Project

**PreacherClan** is a Viking-themed, community-driven fitness matchmaking platform designed to empower gym-goers and gym owners through interactive and gamified experiences.

Built to scale across **1,000+ gyms in 28 states**, PreacherClan connects users with compatible gym partners, fosters healthy competition, and enhances user engagement through a variety of innovative features:

### Core Features

- 🔄 **Swipe-Based Matchmaking**  
  Connect with gym partners based on fitness goals, workout preferences, and availability — promoting consistency and motivation.
  
- 📲 **QR-Based Workout Streak Tracking**  
  Scan QR codes at gym check-ins to maintain streaks and earn rewards.

- 🏆 **Dynamic Gym Leaderboards**  
  Drive friendly competition through real-time leaderboards showcasing top performers and most consistent members.

- 🎮 **B2B Gamified Tools for Gyms**  
  Equip gym owners with powerful promotional tools, gamification elements, and loyalty systems to boost memberships and engagement.

- 🔐 **Secure Google OAuth Login**  
  Provide users with a seamless and secure login experience using Google authentication.

- 📢 **Real-Time Notifications**  
  Keep users engaged with personalized notifications for milestones, gym events, and partner activity.

- 💳 **Integrated Membership Payments**  
  Handle payments and subscriptions through a secure, user-friendly interface.

- 🚀 **Designed for Scale**  
  Built using modern web technologies — **React, Next.js, Node.js, MongoDB** — and architected to support **1,000+ gyms and thousands of users**.


## Installation

To set up the PreacherClan web application locally, follow these steps:

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/Rheosta561/PreacherClan.git
    cd PreacherClan
    ```

2.  **Install dependencies:**

   

    ```bash
    npm install
    ```


3. **Configuration:**

You will need to set environment variables to securely store sensitive credentials such as API keys and authentication details.

- Copy the example environment file to `.env`:

    ```bash
    cp .env.example .env
    ```

- Open `.env` and update the following values with your own credentials:

    ```env
    # Google OAuth Credentials
    GOOGLE_CLIENT_ID=your-google-client-id
    GOOGLE_CLIENT_SECRET=your-google-client-secret

    # Gemini API Key
    GEMINI_API_KEY=your-gemini-api-key

    # Cloudinary API Keys
    CLOUDINARY_CLOUD_NAME=your-cloud-name
    CLOUDINARY_API_KEY=your-cloudinary-api-key
    CLOUDINARY_API_SECRET=your-cloudinary-api-secret

    # Resend transactional email
    RESEND_API_KEY=your-resend-api-key
    EMAIL_FROM="PreacherClan <notifications@your-verified-domain.com>"

    # User access and refresh token signing keys (generate independently)
    ACCESS_TOKEN_SECRET=replace-with-random-secret
    REFRESH_TOKEN_SECRET=replace-with-a-different-random-secret

    # MCP OAuth (use the real HTTPS origins in production)
    MCP_ISSUER_URL=http://localhost:3000
    MCP_RESOURCE_URL=http://localhost:3000/mcp
    MCP_CONSENT_URL=http://localhost:3001/auth/mcp/authorize
    MCP_ACCESS_TOKEN_SECRET=replace-with-an-independent-random-secret
    MCP_ALLOWED_ORIGINS=http://localhost:3001
    MCP_READ_RATE_LIMIT_PER_MINUTE=120
    MCP_WRITE_RATE_LIMIT_PER_MINUTE=20
    ```

The sender address must use a domain verified in Resend.
All outgoing mail is rendered through the shared email service with a dark theme, Montserrat font styling, and an inline Preacher Clan logo attachment.
Configure the JWT secrets in the backend environment before starting the API. Generate independent values with `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"` and do not commit them. MCP access tokens use a separate secret of at least 32 bytes; production requires `MCP_ACCESS_TOKEN_SECRET` to be set explicitly.

- **Important:** Never commit your `.env` file to GitHub! It contains sensitive data.

---

4.  **Database Setup :**

    

    *   Create a database.
    *   Update the `.env` file with the database connection details.
    *   Run migrations .

## Usage

After installation and configuration, you can run the PreacherClan web application. The exact command will depend on the technology stack.

### MCP server

The backend exposes a stateless MCP Streamable HTTP endpoint at `/mcp`. MCP clients authenticate through the server's OAuth 2.1 authorization-code flow with PKCE (S256). A normal Preacher Clan REST access token is used only on the consent page and is **not** an MCP bearer token.

```http
Authorization: Bearer <access-token>
```

The endpoint provides `get_user_context`, `get_current_workout_split`, and `update_workout_split`. Only public clients (`token_endpoint_auth_method: "none"`) using PKCE are supported. OAuth clients and grants are stored in MongoDB. Read scopes are requested by default; the optional `mcp:write:split` scope is never granted implicitly and is unchecked by default in the consent UI. Caller-supplied user IDs are ignored or rejected: tools use only the user bound to the OAuth grant.

Configure local development with:

```env
MCP_ISSUER_URL=http://localhost:3000
MCP_RESOURCE_URL=http://localhost:3000/mcp
MCP_CONSENT_URL=http://localhost:3001/auth/mcp/authorize
MCP_ACCESS_TOKEN_SECRET=<independent random value, at least 32 bytes>
MCP_ALLOWED_ORIGINS=http://localhost:3001
MCP_READ_RATE_LIMIT_PER_MINUTE=120
MCP_WRITE_RATE_LIMIT_PER_MINUTE=20
```

Production must configure `MCP_ISSUER_URL`, `MCP_RESOURCE_URL`, and `MCP_CONSENT_URL` with the actual public HTTPS URLs and allow the deployed frontend origin through `CLIENT_ORIGIN` or `MCP_ALLOWED_ORIGINS`. Generate `MCP_ACCESS_TOKEN_SECRET` independently of the REST JWT keys. When TLS terminates at a reverse proxy, configure `TRUST_PROXY` to the exact trusted hop count or proxy subnet so Express can verify HTTPS; do not trust arbitrary proxies.

Access tokens expire after 10 minutes by default, and refresh tokens rotate. Reuse of a rotated refresh token revokes its grant; revoking a refresh token invalidates all tokens in its grant. OAuth metadata is published at `/.well-known/oauth-authorization-server`; the protected-resource metadata for `/mcp` is at `/.well-known/oauth-protected-resource/mcp`. The OAuth endpoints are `/register`, `/authorize`, `/token`, and `/revoke`. Users see the requesting client's name, redirect host and permissions on the V2 consent page before approval.

| Scope | Tool |
| --- | --- |
| `mcp:read:user` | `get_user_context` |
| `mcp:read:split` | `get_current_workout_split` |
| `mcp:write:split` | `update_workout_split` |

For `update_workout_split`, each `day_overrides` entry replaces that whole day's exercise list. Use either weekday names or codes (`Saturday` or `Sa`); exercises require `name`, integer `sets` (1-20), and integer `reps` (1-100). Optional exercise fields can be omitted or passed as `null`. Use `"exercises": []` to clear a day.

When a user asks to add exercises without specifying whether they want video tutorials, the assistant should ask before updating the split. If requested, include only verified YouTube URLs in the `youtube` field; never guess or fabricate links.

Each tool enforces its required scope. Split writes use the existing ownership-checked service and write before/after audit records with OAuth client and scopes. MCP requests/tools also record user, client, scopes, operation, outcome and duration without storing prompts or tool payloads. Read and write tools use separate per-user/per-client limits of 120 and 20 calls per minute by default; override with `MCP_READ_RATE_LIMIT_PER_MINUTE` and `MCP_WRITE_RATE_LIMIT_PER_MINUTE`.

#### OpenCode

Add the remote MCP server to `opencode.json` (replace the backend host with your deployed HTTPS origin):

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "preacherclan": {
      "type": "remote",
      "url": "https://<backend-host>/mcp"
    }
  }
}
```

OpenCode automatically discovers OAuth and supports dynamic client registration. Start the browser sign-in flow with:

```bash
opencode mcp auth preacherclan
```

Keep OAuth enabled; do not configure a REST JWT as a static MCP header.

#### Claude Code

```bash
claude mcp add --transport http preacherclan https://<backend-host>/mcp
```

Then use Claude Code's MCP authorization flow (`/mcp`) and approve the scopes on the Preacher Clan page.

#### Python and LangChain

Use a standards-compliant MCP OAuth client/provider with dynamic registration and PKCE to obtain and refresh an MCP OAuth access token. Pass that token to the Streamable HTTP MCP transport; LangChain adapters can use the same token as the `Authorization` header:

```python
from langchain_mcp_adapters.client import MultiServerMCPClient

client = MultiServerMCPClient({
    "preacherclan": {
        "transport": "streamable_http",
        "url": "https://<backend-host>/mcp",
        "headers": {"Authorization": f"Bearer {mcp_access_token}"},
    }
})
```

`mcp_access_token` must come from this server's OAuth `/token` endpoint and be refreshed through OAuth; the token returned by `/auth/login` is not accepted by `/mcp`. OpenCode, Claude Code, custom Python agents and LangChain clients therefore use the same consent, scopes, authenticated user context and audit path.

Run the backend tests, including the MCP protocol and authentication integration tests, with:

```bash
npm test
```



```bash
npm start
```



## Contributing

We welcome contributions to the PreacherClan project! To contribute:

1.  **Fork the repository.**
2.  **Create a new branch for your feature or bug fix:**

    ```bash
    git checkout -b feature/your-feature-name
    ```

3.  **Make your changes and commit them with descriptive commit messages.**
4.  **Push your branch to your forked repository:**

    ```bash
    git push origin feature/your-feature-name
    ```

5.  **Create a pull request to the `master` branch of the PreacherClan repository.**

Please ensure that your code adheres to the project's coding standards and includes appropriate tests.  We will review your pull request and provide feedback.

## License

This project is licensed under the [MIT License](LICENSE) - see the [LICENSE](LICENSE) file for details.
```
