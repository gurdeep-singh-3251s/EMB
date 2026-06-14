"use client";

import { Panel } from "@/components/ui/Panel";
import { LinkButton } from "@/components/ui/LinkButton";

const FLOW = [
  { method: "POST", path: "/api/v1/user-query", desc: "Define extraction query + JSON output schema" },
  { method: "PUT", path: "/api/v1/mailbox/config", desc: "Connect IMAP (Gmail, Outlook, Zoho, custom)" },
  { method: "POST", path: "/api/v1/mailbox/extract-emails", desc: "Fetch mail and run extraction pipeline" },
  { method: "GET", path: "/api/v1/user-query/current/results", desc: "Poll structured extraction results" },
];

export default function DevelopersPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <p className="section-label">Integrations</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-slate-950">Developer integration guide</h1>
        <p className="mt-2 text-slate-600">
          Embed ExtractPilot in your backend, scripts, or automation — without using Swagger. This is the customer-facing
          reference for REST integration.
        </p>
      </div>

      <Panel title="Authentication">
        <p className="text-sm text-slate-700">
          When <code className="rounded bg-slate-100 px-1">REST_API_KEY</code> is set on the server, every{" "}
          <code className="rounded bg-slate-100 px-1">/api/v1/*</code> request must include:
        </p>
        <pre className="code-block mt-4">{`Authorization: Bearer YOUR_API_KEY
# or
X-API-Key: YOUR_API_KEY`}</pre>
        <p className="mt-4 text-sm text-slate-600">
          Configure your key in{" "}
          <LinkButton href="/dashboard/settings" variant="secondary" size="sm" className="inline-flex">
            Settings
          </LinkButton>{" "}
          so the dashboard sends it automatically.
        </p>
      </Panel>

      <Panel title="Recommended flow">
        <ol className="space-y-4">
          {FLOW.map((step, i) => (
            <li key={step.path} className="rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Step {i + 1}</p>
              <p className="mt-1 font-mono text-sm">
                <span className="font-bold text-blue-700">{step.method}</span> {step.path}
              </p>
              <p className="mt-1 text-sm text-slate-600">{step.desc}</p>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel title="Example: create extraction query">
        <pre className="code-block">{`curl -X POST http://localhost:3002/api/v1/user-query \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "userQuery": "Extract invoice number and total from billing emails",
    "outputSchema": {
      "invoice_number": { "type": "string", "nullable": true },
      "total_amount": { "type": "number", "nullable": true }
    }
  }'`}</pre>
      </Panel>

      <Panel title="Example: connect mailbox (any IMAP provider)">
        <pre className="code-block">{`curl -X PUT http://localhost:3002/api/v1/mailbox/config \\
  -H "Authorization: Bearer $API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "providerPreset": "outlook",
    "user": "you@company.com",
    "password": "app-password",
    "host": "outlook.office365.com",
    "port": 993
  }'`}</pre>
      </Panel>

      <Panel title="Response envelope">
        <pre className="code-block">{`{ "success": true, "message": null, "data": { ... } }
{ "success": false, "message": "Human-readable error", "error": null }`}</pre>
      </Panel>

      <Panel title="Results payload">
        <p className="text-sm text-slate-700">
          Each row in <code className="rounded bg-slate-100 px-1">extractedData</code> includes{" "}
          <code className="rounded bg-slate-100 px-1">source</code> with the original email body and attachment
          metadata alongside <code className="rounded bg-slate-100 px-1">extracted</code> schema fields.
        </p>
        <pre className="code-block mt-4">{`{
  "emailId": "...",
  "subject": "Invoice #1042",
  "sender": "billing@vendor.com",
  "processingStatus": "completed",
  "extracted": { "invoice_number": "1042", "total_amount": 1200 },
  "source": {
    "rawContent": "Full email body text…",
    "attachments": [{ "filename": "inv.pdf", "mimeType": "application/pdf", "status": "completed" }]
  }
}`}</pre>
      </Panel>

      <Panel title="Plan limits & usage">
        <p className="text-sm text-slate-700">
          Check <code className="rounded bg-slate-100 px-1">GET /api/v1/plans</code> and{" "}
          <code className="rounded bg-slate-100 px-1">GET /api/v1/usage</code> for tier limits. Exceeding limits
          returns HTTP 400. Rate limits return HTTP 429 when exceeding requests/minute for your plan.
        </p>
      </Panel>

      <Panel title="Billing (disabled during closed beta)">
        <p className="text-sm text-slate-700">
          Stripe checkout and paid plans are turned off until official launch. During beta, all invited users run on
          the free demo tier. When billing opens, integrators will use{" "}
          <code className="rounded bg-slate-100 px-1">POST /api/v1/billing/checkout</code> (requires{" "}
          <code className="rounded bg-slate-100 px-1">ENABLE_BILLING=true</code> on the server).
        </p>
      </Panel>

      <p className="text-sm text-slate-500">
        Machine-readable OpenAPI (for codegen) lives at{" "}
        <a href="/api/openapi.json" className="font-semibold text-blue-700 hover:underline" target="_blank" rel="noreferrer">
          /api/openapi.json
        </a>{" "}
        — separate from this guide.
      </p>
    </div>
  );
}
