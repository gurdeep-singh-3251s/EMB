import { z } from "zod";
import type { RestHandlerDeps } from "@repo/types/restTypes";
import { BaseRestController } from "../helper/init";
import { getRequestTenantUserId } from "../requestContext";
import { EmailProvider } from "@repo/types/email";
import { inferImapProvider, presetById, type ImapProviderPresetId } from "@repo/types/imapProviders";
import { activateMailbox, deleteMailbox, listMailboxes, upsertMailbox } from "../../tenant/mailboxRepo";
import { secretsEncryptionReady } from "../../auth/secretBox";
import { imapCredentialsBodySchema } from "../swagger/schemas";

class MailboxesHandler extends BaseRestController {
  private requireTenant(): string | Response {
    const userId = getRequestTenantUserId();
    if (!userId) {
      return Response.json({ success: false, message: "Sign in required", error: null }, { status: 401 });
    }
    if (!secretsEncryptionReady(this.deps.env)) {
      return this.validationError(
        "Server missing SECRETS_ENCRYPTION_KEY — cannot store mailbox passwords securely.",
        null,
      );
    }
    return userId;
  }

  async list(): Promise<Response> {
    const userId = this.requireTenant();
    if (userId instanceof Response) return userId;
    const mailboxes = await listMailboxes(this.deps.getDb(), userId);
    return this.success({ mailboxes }, null, 200);
  }

  async activate(req: Request): Promise<Response> {
    const userId = this.requireTenant();
    if (userId instanceof Response) return userId;
    const body = await this.readJson(req);
    const parsed = z.object({ mailboxId: z.string().uuid() }).safeParse(body);
    if (!parsed.success) {
      return this.validationError("mailboxId must be a UUID", parsed.error.flatten());
    }
    await activateMailbox(this.deps.getDb(), userId, parsed.data.mailboxId);
    const mailboxes = await listMailboxes(this.deps.getDb(), userId);
    return this.success({ mailboxes }, "Active mailbox updated", 200);
  }

  async connect(req: Request): Promise<Response> {
    const userId = this.requireTenant();
    if (userId instanceof Response) return userId;
    const body = await this.readJson(req);
    const parsed = z
      .object({
        label: z.string().min(1).max(80).optional(),
        setActive: z.boolean().optional(),
      })
      .merge(imapCredentialsBodySchema)
      .safeParse(body);
    if (!parsed.success) {
      return this.validationError(parsed.error.message, parsed.error.flatten());
    }
    const preset = parsed.data.providerPreset ? presetById(parsed.data.providerPreset) : null;
    let host = preset?.host ?? parsed.data.host ?? "imap.gmail.com";
    if (parsed.data.host?.length) host = parsed.data.host;
    let port = preset?.port ?? parsed.data.port ?? 993;
    if (parsed.data.port !== undefined) port = parsed.data.port;
    let provider: EmailProvider = preset?.provider ?? inferImapProvider(host);
    if (parsed.data.provider) provider = parsed.data.provider as EmailProvider;

    const record = await upsertMailbox(this.deps.getDb(), this.deps.env, userId, {
      label: parsed.data.label ?? parsed.data.user,
      provider,
      providerPreset: parsed.data.providerPreset ?? null,
      host,
      port,
      imapUser: parsed.data.user,
      password: parsed.data.password,
      setActive: parsed.data.setActive !== false,
    });
    const mailboxes = await listMailboxes(this.deps.getDb(), userId);
    return this.success({ mailbox: record, mailboxes }, "Mailbox connected", 201);
  }

  async remove(mailboxId: string): Promise<Response> {
    const userId = this.requireTenant();
    if (userId instanceof Response) return userId;
    const ok = await deleteMailbox(this.deps.getDb(), userId, mailboxId);
    if (!ok) return this.notFound("Mailbox not found");
    const mailboxes = await listMailboxes(this.deps.getDb(), userId);
    return this.success({ mailboxes }, "Mailbox removed", 200);
  }
}

export async function handleMailboxesRouter(req: Request, deps: RestHandlerDeps): Promise<Response | null> {
  const url = new URL(req.url);
  const path = url.pathname;
  const handler = new MailboxesHandler(deps);

  if (path === "/api/v1/mailboxes" && req.method === "GET") {
    return handler.list();
  }
  if (path === "/api/v1/mailboxes" && req.method === "POST") {
    return handler.connect(req);
  }
  if (path === "/api/v1/mailboxes/activate" && req.method === "POST") {
    return handler.activate(req);
  }
  const match = path.match(/^\/api\/v1\/mailboxes\/([^/]+)$/);
  if (match && req.method === "DELETE") {
    return handler.remove(match[1]!);
  }
  return null;
}
