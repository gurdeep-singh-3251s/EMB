const fieldSpecSchema = {
  type: "object",
  description:
    "JSON object: each key is a field name you want back. Value describes type (string, number, boolean, etc.) and whether it can be null.",
  additionalProperties: {
    type: "object",
    required: ["type"],
    properties: {
      type: {
        type: "string",
        enum: ["string", "number", "boolean", "enum", "array", "object"],
      },
      nullable: { type: "boolean" },
      description: { type: "string" },
      values: { type: "array", items: { type: "string" } },
    },
  },
};

const extractedFieldsExample = {
  priority: "high",
  customer_name: "Sarah Mitchell",
  invoice_number: "INV-7842",
};

const startHereDescription = `
## Start here (recommended order)

1. **Set user query** — \`POST /api/v1/user-query\`  
   Write *what* you want to find in emails and *which fields* you want back (JSON shape).

2. **Connect mailbox** — \`PUT /api/v1/mailbox/config\` (or use \`.env\`)  
   Store Gmail/IMAP credentials for this server session. \`GET /api/v1/mailbox/config\` to verify.

3. **Time range options** — \`GET /api/v1/mailbox/lookback-options\`  
   Choose how far back to read mail (\`1hour\`, \`1day\`, \`1week\`, etc.) before extracting.

4. **Extract emails** — \`POST /api/v1/mailbox/extract-emails\`  
   Fetches mail, enqueues processing, and optionally waits for AI extraction (can take **up to several minutes** when \`waitForResults\` is true).

5. **Read results** — \`GET /api/v1/user-query/current/results\`  
   Returns structured \`extracted\` field values. Use \`timeRange\` (\`1hour\`, \`1day\`, \`1week\`, \`1month\`, \`all\`) plus \`limit\` / \`offset\` for pagination.
`.trim();

const extractionResultsQueryParameters = [
  {
    name: "timeRange",
    in: "query",
    description:
      "Filter by when the email was received (or ingested if no received date). `1hour` = last hour, `1day` = last day, `1week` = last week, `1month` = last month, `all` = no time filter.",
    schema: { type: "string", enum: ["1hour", "1day", "1week", "1month", "all"], default: "all" },
  },
  {
    name: "limit",
    in: "query",
    description: "Page size (1–100)",
    schema: { type: "integer", minimum: 1, maximum: 100, default: 50 },
  },
  {
    name: "offset",
    in: "query",
    description: "Pagination offset (0-based)",
    schema: { type: "integer", minimum: 0, default: 0 },
  },
  {
    name: "includeInProgress",
    in: "query",
    description: "Include pending/processing/failed emails, not only completed/partial",
    schema: { type: "boolean", default: false },
  },
];

export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Email Parser API",
    version: "1.0.0",
    description: startHereDescription,
  },
  servers: [
    {
      url:
        process.env.NODE_ENV === "production"
          ? "https://em-production.up.railway.app"
          : "http://localhost:3002",
      description: "API Server",
    },
  ],
  tags: [
    {
      name: "1 — User query",
      description: "Step 1 & 5: define what to extract, then read structured results.",
    },
    {
      name: "2 — Mailbox",
      description: "Step 2–4: mailbox status, time range, fetch + extract emails.",
    },
    {
      name: "3 — Emails",
      description: "Optional: browse raw email records stored in the database.",
    },
  ],
  paths: {
    // ── Step 1: User query ─────────────────────────────────────────────────────
    "/api/v1/user-query": {
      post: {
        tags: ["1 — User query"],
        operationId: "setUserQuery",
        summary: "Set user query (what to extract + output format)",
        description: [
          "Creates or updates the **active extraction query** for this server.",
          "",
          "**`userQuery`** — Plain-language instructions: what to look for in each email (e.g. billing issues, invoice numbers, urgency).",
          "",
          "**`outputSchema`** — The exact JSON fields you want back. Each key is a field name; set `type` and `nullable` per field.",
          "",
          "This does **not** fetch or parse emails yet. Run mailbox extract after this.",
        ].join("\n"),
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SetUserQueryRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "User query saved and set active",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UserQueryResponse" },
              },
            },
          },
          "400": {
            description: "Invalid request body",
            content: {
              "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } },
            },
          },
        },
      },
    },
    "/api/v1/user-query/current": {
      get: {
        tags: ["1 — User query"],
        operationId: "getCurrentUserQuery",
        summary: "Get current user query",
        description:
          "Returns the active `userQuery` and `outputSchema` currently used for extraction. Call this before extract if you need to confirm what is configured.",
        responses: {
          "200": {
            description: "Active user query",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/UserQueryResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/user-query/current/results": {
      get: {
        tags: ["1 — User query"],
        operationId: "getCurrentUserQueryResults",
        summary: "Get extraction results for current user query",
        description: [
          "Returns emails processed with the **active user query**, including `extracted` field values.",
          "",
          "Use after `POST /api/v1/mailbox/extract-emails` (and after the worker has finished, unless you used `waitForResults: true` on extract).",
          "",
          "Set `includeInProgress=true` to include pending/processing rows.",
        ].join("\n"),
        parameters: extractionResultsQueryParameters,
        responses: {
          "200": {
            description: "Extraction results",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ExtractionResultsResponse" },
                example: {
                  success: true,
                  message: null,
                  data: {
                    userQueryId: "00000000-0000-4000-8000-000000000001",
                    timeRange: "1day",
                    limit: 50,
                    offset: 0,
                    total: 1,
                    count: 1,
                    completedCount: 1,
                    hasMore: false,
                    extractedData: [
                      {
                        emailId: "00000000-0000-4000-8000-000000000002",
                        subject: "Billing issue",
                        sender: "customer@example.com",
                        processingStatus: "completed",
                        extracted: extractedFieldsExample,
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    },
    "/api/v1/user-query/{userQueryId}/results": {
      get: {
        tags: ["1 — User query"],
        operationId: "getUserQueryResultsById",
        summary: "Get extraction results by user-query id",
        description:
          "Same as current results, but for a specific saved user-query id (UUID). Supports `timeRange` filter and `limit` / `offset` pagination.",
        parameters: [
          { name: "userQueryId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
          ...extractionResultsQueryParameters,
        ],
        responses: {
          "200": {
            description: "Extraction results",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ExtractionResultsResponse" },
              },
            },
          },
        },
      },
    },

    // ── Step 2–4: Mailbox ──────────────────────────────────────────────────────
    "/api/v1/mailbox/config": {
      get: {
        tags: ["2 — Mailbox"],
        operationId: "getMailboxConfig",
        summary: "Mailbox connection status",
        description:
          "Shows whether IMAP is configured. Uses **runtime credentials** from `PUT /api/v1/mailbox/config` first, otherwise falls back to `.env` (`IMAP_GMAIL_*`).",
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/MailboxConfigStatus" },
              },
            },
          },
        },
      },
      put: {
        tags: ["2 — Mailbox"],
        operationId: "putMailboxConfig",
        summary: "Connect Gmail (IMAP)",
        description: [
          "Stores Gmail/IMAP credentials **in server memory** for this process (survives hot reload).",
          "",
          "Use a [Gmail App Password](https://myaccount.google.com/apppasswords), not your normal login password.",
          "After connect, run `POST /api/v1/mailbox/extract-emails`.",
          "",
          "Alternative: set `IMAP_GMAIL_USER` and `IMAP_GMAIL_PASSWORD` in `.env` (persists across restarts).",
        ].join("\n"),
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/MailboxCredentials" },
            },
          },
        },
        responses: {
          "200": {
            description: "Connected",
            content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessResponse" } } },
          },
          "400": {
            description: "Invalid credentials body",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
      delete: {
        tags: ["2 — Mailbox"],
        operationId: "deleteMailboxConfig",
        summary: "Disconnect Gmail",
        description:
          "Clears runtime credentials set via `PUT`. Does not remove `.env` values — restart or change `.env` to clear env-based config.",
        responses: {
          "200": {
            description: "Disconnected",
            content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessResponse" } } },
          },
        },
      },
    },
    "/api/v1/mailbox/lookback-options": {
      get: {
        tags: ["2 — Mailbox"],
        operationId: "getLookbackOptions",
        summary: "Time range options",
        description: [
          "Lists allowed **lookback** values for `POST /api/v1/mailbox/extract-emails` (e.g. `1day` = last 24 hours).",
          "",
          "Call this before extract if you are building a UI dropdown for time range.",
        ].join("\n"),
        responses: {
          "200": {
            description: "Lookback options",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LookbackOptionsResponse" },
              },
            },
          },
        },
      },
    },
    "/api/v1/mailbox/extract-emails": {
      post: {
        tags: ["2 — Mailbox"],
        operationId: "extractEmails",
        summary: "Extract emails (fetch + process)",
        description: [
          "**Step 4 in the flow.** Fetches messages from Gmail/IMAP for the chosen lookback window, stores them, and enqueues AI extraction using the **current user query**.",
          "",
          "**Timing:**",
          "- With `waitForResults: false` (default): returns quickly after enqueue; poll `GET /api/v1/user-query/current/results`.",
          "- With `waitForResults: true`: the HTTP request **blocks** until processing finishes or `waitTimeoutSeconds` is reached (often **30s–120s+** depending on volume and worker speed).",
          "",
          "Requires an active user query (`POST /api/v1/user-query`) and configured IMAP in `.env`.",
        ].join("\n"),
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ExtractEmailsRequest" },
              example: {
                lookback: "1day",
                unreadOnly: false,
                waitForResults: true,
                waitTimeoutSeconds: 120,
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Fetch/enqueue succeeded (and optionally waited for results)",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/ExtractEmailsResponse" },
                example: {
                  success: true,
                  message: null,
                  data: {
                    imapFetched: 1,
                    enqueued: 1,
                    extractedData: [
                      {
                        emailId: "00000000-0000-4000-8000-000000000002",
                        processingStatus: "completed",
                        extracted: extractedFieldsExample,
                      },
                    ],
                  },
                },
              },
            },
          },
          "400": {
            description: "Mailbox not configured, no active user query, or invalid body",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } },
          },
        },
      },
    },

    // ── Optional: Emails ───────────────────────────────────────────────────────
    "/api/v1/emails": {
      get: {
        tags: ["3 — Emails"],
        operationId: "listEmails",
        summary: "List stored emails",
        description: "Paginated list of email records in the database (raw storage, not filtered by user query).",
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
          { name: "offset", in: "query", schema: { type: "integer", default: 0 } },
        ],
        responses: {
          "200": {
            description: "OK",
            content: { "application/json": { schema: { $ref: "#/components/schemas/SuccessResponse" } } },
          },
        },
      },
    },
    "/api/v1/emails/{emailId}": {
      get: {
        tags: ["3 — Emails"],
        operationId: "getEmailById",
        summary: "Get email by id",
        description: "Single email record plus `extracted` JSON when processing has completed.",
        parameters: [{ name: "emailId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": {
            description: "OK",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/EmailDetailResponse" },
                example: {
                  success: true,
                  message: null,
                  data: {
                    id: "00000000-0000-4000-8000-000000000002",
                    subject: "Billing issue",
                    sender: "customer@example.com",
                    extracted: extractedFieldsExample,
                  },
                },
              },
            },
          },
        },
      },
    },
  },

  components: {
    schemas: {
      SetUserQueryRequest: {
        type: "object",
        required: ["userQuery", "outputSchema"],
        properties: {
          userQuery: {
            type: "string",
            maxLength: 4000,
            description:
              "What you want to find in each email, in plain language (e.g. “Extract customer name, invoice number, and priority from support threads”).",
          },
          outputSchema: fieldSpecSchema,
        },
        example: {
          userQuery: "Find billing issues, customer names, priority, and invoice numbers in support emails.",
          outputSchema: {
            customer_name: { type: "string", nullable: true, description: "Customer full name" },
            invoice_number: { type: "string", nullable: true },
            priority: { type: "string", nullable: true },
          },
        },
      },
      UserQuery: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid", description: "User-query id (use in results URL)" },
          userQuery: { type: "string", description: "Your extraction instructions" },
          outputSchema: fieldSpecSchema,
          status: { type: "string", enum: ["active", "paused", "closed"] },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      UserQueryResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          message: { type: "string", nullable: true },
          data: { $ref: "#/components/schemas/UserQuery" },
        },
      },
      ExtractedEmailRow: {
        type: "object",
        properties: {
          emailId: { type: "string", format: "uuid" },
          subject: { type: "string", nullable: true },
          sender: { type: "string", nullable: true },
          processingStatus: { type: "string", description: "pending | processing | completed | partial | failed" },
          extracted: {
            type: "object",
            additionalProperties: true,
            nullable: true,
            description: "Field values matching your outputSchema",
            example: extractedFieldsExample,
          },
        },
      },
      ExtractionResultsResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          message: { type: "string", nullable: true },
          data: {
            type: "object",
            properties: {
              userQueryId: { type: "string", format: "uuid", description: "Id of the user query used for extraction" },
              timeRange: {
                type: "string",
                enum: ["1hour", "1day", "1week", "1month", "all"],
                description: "Time window applied to this response",
              },
              limit: { type: "integer", description: "Page size used for this request" },
              offset: { type: "integer", description: "Pagination offset used for this request" },
              total: {
                type: "integer",
                description: "Total emails matching user query + time filter (all pages)",
              },
              count: { type: "integer", description: "Number of rows in this page (extractedData.length)" },
              completedCount: {
                type: "integer",
                description: "Rows in this page with status completed or partial",
              },
              hasMore: {
                type: "boolean",
                description: "True when offset + count < total (fetch next page with offset + limit)",
              },
              extractedData: {
                type: "array",
                items: { $ref: "#/components/schemas/ExtractedEmailRow" },
              },
            },
          },
        },
      },
      MailboxCredentials: {
        type: "object",
        required: ["user", "password"],
        properties: {
          host: { type: "string", example: "imap.gmail.com" },
          port: { type: "integer", example: 993 },
          user: { type: "string", format: "email" },
          password: { type: "string", format: "password" },
        },
      },
      MailboxConfigData: {
        type: "object",
        properties: {
          configured: { type: "boolean" },
          host: { type: "string" },
          port: { type: "integer" },
          user: { type: "string", nullable: true },
        },
      },
      MailboxConfigStatus: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          message: { type: "string", nullable: true },
          data: { $ref: "#/components/schemas/MailboxConfigData" },
        },
      },
      ExtractEmailsRequest: {
        type: "object",
        properties: {
          lookback: {
            type: "string",
            enum: ["1hour", "6hours", "12hours", "1day", "3days", "1week"],
            default: "1day",
            description: "How far back to read mail. Use GET /api/v1/mailbox/lookback-options for labels.",
          },
          unreadOnly: {
            type: "boolean",
            default: false,
            description: "When true, only unread messages are fetched.",
          },
          markSeenOnEnqueue: {
            type: "boolean",
            description: "When true, mark messages seen after enqueue.",
          },
          waitForResults: {
            type: "boolean",
            default: false,
            description:
              "When true, this request waits until extraction finishes (or timeout). **Increases response time significantly.**",
          },
          waitTimeoutSeconds: {
            type: "integer",
            default: 120,
            minimum: 5,
            maximum: 300,
            description: "Max seconds to wait when waitForResults is true (5–300).",
          },
        },
      },
      ExtractEmailsData: {
        type: "object",
        properties: {
          imapFetched: { type: "integer", description: "Messages read from IMAP" },
          enqueued: { type: "integer", description: "Messages queued for AI extraction" },
          count: { type: "integer" },
          completedCount: { type: "integer" },
          timedOut: {
            type: "boolean",
            description: "True when waitForResults timed out before all rows completed",
          },
          extractedData: {
            type: "array",
            items: { $ref: "#/components/schemas/ExtractedEmailRow" },
          },
        },
      },
      ExtractEmailsResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          message: { type: "string", nullable: true },
          data: { $ref: "#/components/schemas/ExtractEmailsData" },
        },
      },
      LookbackOptionsData: {
        type: "object",
        properties: {
          options: {
            type: "array",
            items: {
              type: "object",
              properties: {
                key: { type: "string", example: "1day", description: "Value for extract-emails `lookback`" },
                hours: { type: "integer", example: 24 },
                label: { type: "string", example: "Last day" },
              },
            },
          },
          defaultEnvHours: { type: "integer", example: 1, description: "Server default from .env" },
        },
      },
      LookbackOptionsResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          message: { type: "string", nullable: true },
          data: { $ref: "#/components/schemas/LookbackOptionsData" },
        },
      },
      EmailDetailResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          message: { type: "string", nullable: true },
          data: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              subject: { type: "string", nullable: true },
              sender: { type: "string", nullable: true },
              extracted: {
                type: "object",
                additionalProperties: true,
                nullable: true,
                example: extractedFieldsExample,
              },
            },
            additionalProperties: true,
          },
        },
      },
      SuccessResponse: {
        type: "object",
        properties: {
          success: { type: "boolean" },
          message: { type: "string", nullable: true },
          data: {},
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string" },
          error: {},
        },
      },
    },
  },
} as const;
