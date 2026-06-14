import type { Env } from "@repo/config";
import { EmailProvider } from "@repo/types/email";
import { inferImapProvider } from "@repo/types/imapProviders";
import type { MailProviderOverrides } from "@repo/types/mailProviderOverrides";
import { ImapMailProvider } from "./ImapMailProvider";
import type { MailProvider } from "./MailProvider";

export type { MailProviderOverrides } from "@repo/types/mailProviderOverrides";

function resolveImapCreds(env: Env, overrides?: MailProviderOverrides) {
  const imap = overrides?.imap ?? overrides?.imapGmail;
  return {
    host: imap?.host ?? env.imapGmail.host,
    port: imap?.port ?? env.imapGmail.port,
    user: imap?.user ?? env.imapGmail.user,
    password: imap?.password ?? env.imapGmail.password,
  };
}

export function getMailProviders(env: Env, overrides?: MailProviderOverrides): MailProvider[] {
  const { host, port, user, password } = resolveImapCreds(env, overrides);

  if (!user || !password) return [];

  const provider = overrides?.provider ?? inferImapProvider(host);

  return [
    new ImapMailProvider(
      {
        provider,
        host,
        port,
        user,
        password,
      },
      {
        sinceHours: overrides?.sinceHours ?? env.imapFetchSinceHours,
        unreadOnly: overrides?.unreadOnly ?? env.imapUnreadOnly,
        markSeenOnSuccess: overrides?.markSeenOnSuccess ?? env.imapMarkSeenOnEnqueue,
      },
      {
        attachmentsRoot: env.attachmentsRoot,
        maxAttachmentSizeMb: env.maxAttachmentSizeMb,
        maxAttachmentsPerEmail: env.maxAttachmentsPerEmail,
      },
    ),
  ];
}
