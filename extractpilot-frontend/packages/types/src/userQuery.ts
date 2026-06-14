export type UserQueryStatus = "active" | "paused" | "closed";

export interface ClassificationResult {
  relevant: boolean;
  confidence?: number;
  reason?: string;
  /** Schema field keys likely present in body and/or attachments (classify step only). */
  likelyFields?: string[];
}

export interface CreateUserQueryInput {
  userQuery: string;
  outputSchema: Record<string, unknown>;
}

export interface UserQueryRow {
  id: string;
  userQuery: string;
  outputSchema: Record<string, unknown>;
  status: UserQueryStatus;
  createdAt: Date;
}

/** Processed (or in-progress) email row for user-query results APIs. */
export type UserQueryEmailResult = {
  id: string;
  subject: string | null;
  sender: string | null;
  processingStatus: string;
  classificationResult: ClassificationResult | null;
  rawContent: string | null;
  /** Full worker output (email + attachments). */
  parsedJson: unknown;
  /** Convenience: `parsedJson.email` — extracted field values (customer_name, invoice_number, …). */
  extracted: Record<string, unknown> | null;
};
