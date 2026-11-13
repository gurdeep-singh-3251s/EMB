export type PromptTemplate = {
  id: string;
  name: string;
  category: string;
  description: string;
  userQuery: string;
  outputSchema: Record<string, { type: string; description: string; nullable?: boolean }>;
};

/** Curated extraction blueprints — unique onboarding accelerator for SaaS customers. */
export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: "invoice-accounts-payable",
    name: "Invoices & AP",
    category: "Finance",
    description: "Extract vendor, amounts, due dates, and PO numbers from invoice emails.",
    userQuery:
      "Find emails that are invoices, payment requests, or billing statements. Extract structured AP fields for ERP import.",
    outputSchema: {
      vendor_name: { type: "string", description: "Vendor or supplier name", nullable: true },
      invoice_number: { type: "string", description: "Invoice or reference number", nullable: true },
      invoice_date: { type: "string", description: "Invoice date (ISO or as written)", nullable: true },
      due_date: { type: "string", description: "Payment due date", nullable: true },
      currency: { type: "string", description: "ISO currency code if present", nullable: true },
      subtotal: { type: "number", description: "Subtotal before tax", nullable: true },
      tax: { type: "number", description: "Tax amount", nullable: true },
      total: { type: "number", description: "Total amount due", nullable: true },
      po_number: { type: "string", description: "Purchase order number", nullable: true },
    },
  },
  {
    id: "purchase-orders",
    name: "Purchase orders",
    category: "Operations",
    description: "Track PO confirmations, line items, and delivery expectations.",
    userQuery:
      "Identify purchase order confirmations and order updates. Extract buyer, seller, SKU-level details when available.",
    outputSchema: {
      po_number: { type: "string", description: "PO number", nullable: true },
      buyer: { type: "string", description: "Buying organization", nullable: true },
      supplier: { type: "string", description: "Supplier name", nullable: true },
      order_date: { type: "string", description: "Order date", nullable: true },
      expected_delivery: { type: "string", description: "Expected ship or delivery date", nullable: true },
      line_item_count: { type: "number", description: "Number of line items if stated", nullable: true },
      total_amount: { type: "number", description: "Order total", nullable: true },
    },
  },
  {
    id: "shipping-tracking",
    name: "Shipping & tracking",
    category: "Logistics",
    description: "Carrier, tracking IDs, ETA, and delivery exceptions.",
    userQuery:
      "Extract shipping notifications: tracking numbers, carriers, ETAs, and delivery status updates.",
    outputSchema: {
      carrier: { type: "string", description: "Carrier name (UPS, FedEx, DHL, etc.)", nullable: true },
      tracking_number: { type: "string", description: "Tracking or AWB number", nullable: true },
      status: { type: "string", description: "Shipment status", nullable: true },
      eta: { type: "string", description: "Estimated delivery", nullable: true },
      recipient: { type: "string", description: "Recipient or destination", nullable: true },
    },
  },
  {
    id: "hr-candidate",
    name: "HR & candidates",
    category: "People",
    description: "Résumé submissions and recruiter threads with candidate metadata.",
    userQuery:
      "Find job applications and candidate emails. Extract contact details and role interest without inventing experience.",
    outputSchema: {
      candidate_name: { type: "string", description: "Applicant full name", nullable: true },
      candidate_email: { type: "string", description: "Applicant email", nullable: true },
      role_applied: { type: "string", description: "Role or job title", nullable: true },
      years_experience: { type: "number", description: "Years of experience if stated", nullable: true },
      location: { type: "string", description: "City/region if stated", nullable: true },
    },
  },
  {
    id: "support-tickets",
    name: "Support tickets",
    category: "Customer success",
    description: "Helpdesk threads with priority, product area, and resolution ask.",
    userQuery:
      "Classify customer support emails. Extract issue summary, product area, urgency, and requested action.",
    outputSchema: {
      ticket_subject: { type: "string", description: "Short issue title", nullable: true },
      product: { type: "string", description: "Product or module", nullable: true },
      priority: { type: "string", description: "low | medium | high if inferable", nullable: true },
      customer_account: { type: "string", description: "Account or company name", nullable: true },
      requested_action: { type: "string", description: "What the customer wants", nullable: true },
    },
  },
];
