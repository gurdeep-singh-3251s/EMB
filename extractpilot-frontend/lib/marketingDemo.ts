/** Fictional demo content for marketing UI only — not tied to any sample DB or other products. */
export const HERO_EMAIL_DEMO = {
  sender: "ap@harborlinefreight.com",
  subject: "Payment due — reference HL-20418",
  preview: "PDF attached with supplier, reference, total $1,840.50, due 15 Mar 2026.",
  extracted: {
    supplier: '"Harborline Freight"',
    document_ref: '"HL-20418"',
    total_usd: "1840.50",
    due_date: '"2026-03-15"',
  },
} as const;

export const API_RESULT_DEMO = {
  subject: "Load settlement — ref HL-20418",
  sender: "ap@harborlinefreight.com",
  extracted: {
    document_ref: "HL-20418",
    total_usd: 1840.5,
  },
  attachment: "settlement_march.pdf",
} as const;
