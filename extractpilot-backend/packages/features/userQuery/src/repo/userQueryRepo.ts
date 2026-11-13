import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { emails, userQueries } from "@repo/db/schema";
import type {
  ClassificationResult,
  CreateUserQueryInput,
  UserQueryEmailResult,
  UserQueryRow,
} from "@repo/types/userQuery";
import type { ParsedEmailResult } from "@repo/types/parsedEmail";
import { wrapOutputSchema } from "../schema/outputSchema";
import type {
  IUserQueryRepo,
  ListUserQueryResultsOptions,
  UserQueryRepoDeps,
  UserQueryStatusCounts,
} from "./iUserQueryRepo";

const EMPTY_STATUS_COUNTS: UserQueryStatusCounts = {
  pending: 0,
  processing: 0,
  completed: 0,
  partial: 0,
  skipped: 0,
  failed: 0,
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function toRow(row: typeof userQueries.$inferSelect): UserQueryRow {
  const schema = asRecord(row.outputSchema);
  const emailFields = schema.email && typeof schema.email === "object" ? asRecord(schema.email) : schema;
  return {
    id: row.id,
    name: row.name ?? null,
    userQuery: row.userQuery,
    outputSchema: emailFields,
    classifyModel: row.classifyModel ?? null,
    extractModel: row.extractModel ?? null,
    status: row.status as UserQueryRow["status"],
    createdAt: row.createdAt,
  };
}

function buildResultsWhere(userQueryId: string, options: ListUserQueryResultsOptions) {
  const base = options.completedOnly
    ? and(
        eq(emails.userQueryId, userQueryId),
        inArray(emails.processingStatus, ["completed", "partial"]),
      )
    : eq(emails.userQueryId, userQueryId);

  if (options.since === null) {
    return base;
  }

  return and(
    base,
    sql`COALESCE(${emails.receivedAt}, ${emails.createdAt}) >= ${options.since}::timestamptz`,
  );
}

export class UserQueryRepo implements IUserQueryRepo {
  constructor(private readonly deps: UserQueryRepoDeps) {}

  private tenantWhere(extra?: ReturnType<typeof eq>) {
    const clauses = [];
    if (this.deps.ownerUserId) {
      clauses.push(eq(userQueries.ownerUserId, this.deps.ownerUserId));
    }
    if (extra) clauses.push(extra);
    if (clauses.length === 0) return undefined;
    if (clauses.length === 1) return clauses[0];
    return and(...clauses);
  }

  async deactivateAllActive(): Promise<void> {
    await this.deps.db
      .update(userQueries)
      .set({ status: "closed" })
      .where(this.tenantWhere(eq(userQueries.status, "active")));
  }

  async createActive(input: CreateUserQueryInput): Promise<UserQueryRow> {
    await this.deactivateAllActive();
    const [inserted] = await this.deps.db
      .insert(userQueries)
      .values({
        name: input.name?.trim() || null,
        userQuery: input.userQuery,
        outputSchema: wrapOutputSchema(input.outputSchema),
        classifyModel: input.classifyModel?.trim() || null,
        extractModel: input.extractModel?.trim() || null,
        status: "active",
        ownerUserId: this.deps.ownerUserId ?? null,
      })
      .returning();
    return toRow(inserted!);
  }

  async getActive(): Promise<UserQueryRow | null> {
    const [row] = await this.deps.db
      .select()
      .from(userQueries)
      .where(this.tenantWhere(eq(userQueries.status, "active")))
      .orderBy(desc(userQueries.createdAt))
      .limit(1);
    return row ? toRow(row) : null;
  }

  async byId(id: string): Promise<UserQueryRow | null> {
    const [row] = await this.deps.db
      .select()
      .from(userQueries)
      .where(this.tenantWhere(eq(userQueries.id, id)))
      .limit(1);
    return row ? toRow(row) : null;
  }

  async listRecent(limit: number, offset: number): Promise<{ items: UserQueryRow[]; total: number }> {
    const where = this.tenantWhere();
    const [totalRow] = await this.deps.db.select({ total: count() }).from(userQueries).where(where);
    const total = Number(totalRow?.total ?? 0);
    const rows = await this.deps.db
      .select()
      .from(userQueries)
      .where(where)
      .orderBy(desc(userQueries.createdAt))
      .limit(limit)
      .offset(offset);
    return { items: rows.map(toRow), total };
  }

  async activateById(id: string): Promise<UserQueryRow | null> {
    const existing = await this.byId(id);
    if (!existing) return null;
    await this.deps.db
      .update(userQueries)
      .set({ status: "closed" })
      .where(this.tenantWhere(eq(userQueries.status, "active")));
    const [updated] = await this.deps.db
      .update(userQueries)
      .set({ status: "active" })
      .where(this.tenantWhere(eq(userQueries.id, id)))
      .returning();
    return updated ? toRow(updated) : null;
  }

  async listResults(
    userQueryId: string,
    limit: number,
    offset: number,
    options: ListUserQueryResultsOptions,
  ): Promise<import("./iUserQueryRepo").UserQueryResultsList> {
    const where = buildResultsWhere(userQueryId, options);

    const [totalRow] = await this.deps.db
      .select({ total: count() })
      .from(emails)
      .where(where);

    const total = Number(totalRow?.total ?? 0);

    const rows = await this.deps.db
      .select({
        id: emails.id,
        subject: emails.subject,
        sender: emails.sender,
        processingStatus: emails.processingStatus,
        classificationResult: emails.classificationResult,
        parsedJson: emails.parsedJson,
        rawContent: emails.rawContent,
      })
      .from(emails)
      .where(where)
      .orderBy(desc(sql`COALESCE(${emails.receivedAt}, ${emails.createdAt})`))
      .limit(limit)
      .offset(offset);

    let statusCounts: UserQueryStatusCounts | undefined;
    if (!options.completedOnly) {
      statusCounts = await this.statusCountsForUserQuery(userQueryId, options);
    }

    return {
      items: rows.map((row) => mapUserQueryEmailResult(row)),
      total,
      statusCounts,
    };
  }

  private async statusCountsForUserQuery(
    userQueryId: string,
    options: ListUserQueryResultsOptions,
  ): Promise<UserQueryStatusCounts> {
    const where = buildResultsWhere(userQueryId, { ...options, completedOnly: false });
    const rows = await this.deps.db
      .select({ status: emails.processingStatus, total: count() })
      .from(emails)
      .where(where)
      .groupBy(emails.processingStatus);

    const counts = { ...EMPTY_STATUS_COUNTS };
    for (const row of rows) {
      const key = row.status as keyof UserQueryStatusCounts;
      if (key in counts) {
        counts[key] = Number(row.total);
      }
    }
    return counts;
  }
}

function asClassification(value: unknown): ClassificationResult | null {
  if (!value || typeof value !== "object") return null;
  const o = value as { relevant?: unknown };
  if (typeof o.relevant !== "boolean") return null;
  return {
    relevant: o.relevant,
    confidence: typeof (o as { confidence?: unknown }).confidence === "number"
      ? (o as { confidence: number }).confidence
      : undefined,
    reason: typeof (o as { reason?: unknown }).reason === "string"
      ? (o as { reason: string }).reason
      : undefined,
    likelyFields: Array.isArray((o as { likelyFields?: unknown }).likelyFields)
      ? ((o as { likelyFields: unknown[] }).likelyFields.filter((x) => typeof x === "string") as string[])
      : undefined,
  };
}

function mapUserQueryEmailResult(row: {
  id: string;
  subject: string | null;
  sender: string | null;
  processingStatus: string;
  classificationResult: unknown;
  parsedJson: unknown;
  rawContent: string | null;
}): UserQueryEmailResult {
  const parsed = row.parsedJson as ParsedEmailResult | null;
  const emailFields =
    parsed?.email && typeof parsed.email === "object" && !Array.isArray(parsed.email)
      ? (parsed.email as Record<string, unknown>)
      : null;

  return {
    id: row.id,
    subject: row.subject,
    sender: row.sender,
    processingStatus: row.processingStatus,
    classificationResult: asClassification(row.classificationResult),
    rawContent: row.rawContent,
    parsedJson: row.parsedJson,
    extracted: emailFields,
  };
}
