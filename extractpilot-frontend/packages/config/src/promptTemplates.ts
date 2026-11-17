export type PromptTemplate = {
  id: string;
  name: string;
  category: string;
  description: string;
  userQuery: string;
  outputSchema: Record<string, { type: string; description: string; nullable?: boolean }>;
};

/** Curated extraction blueprints — real-estate first for brokerage demos. */
export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: "re-buyer-leads",
    name: "Buyer leads",
    category: "Real estate",
    description: "Capture buyer inquiries: budget, beds/baths, areas, timeline, and contact.",
    userQuery:
      "Find emails from prospective buyers asking about homes, tours, or availability. Extract contact details, budget, preferred areas, beds/baths, and buying timeline. Do not invent values.",
    outputSchema: {
      lead_name: { type: "string", description: "Buyer full name", nullable: true },
      lead_email: { type: "string", description: "Buyer email", nullable: true },
      lead_phone: { type: "string", description: "Phone if present", nullable: true },
      budget_min: { type: "number", description: "Minimum budget", nullable: true },
      budget_max: { type: "number", description: "Maximum budget", nullable: true },
      currency: { type: "string", description: "Currency code if stated", nullable: true },
      preferred_areas: { type: "string", description: "Neighborhoods or cities of interest", nullable: true },
      beds: { type: "number", description: "Bedrooms wanted", nullable: true },
      baths: { type: "number", description: "Bathrooms wanted", nullable: true },
      timeline: { type: "string", description: "Buying timeline (e.g. 30 days, this quarter)", nullable: true },
      preapproved: { type: "string", description: "yes | no | unknown if mortgage pre-approval mentioned", nullable: true },
      notes: { type: "string", description: "Short summary of the ask", nullable: true },
    },
  },
  {
    id: "re-seller-listings",
    name: "Seller & listing intake",
    category: "Real estate",
    description: "Homeowners wanting to list — address, price expectations, property type.",
    userQuery:
      "Identify seller or listing intake emails. Extract property address, expected price, property type, occupancy, and owner contact. Prefer explicit facts over guesses.",
    outputSchema: {
      owner_name: { type: "string", description: "Seller / owner name", nullable: true },
      owner_email: { type: "string", description: "Owner email", nullable: true },
      owner_phone: { type: "string", description: "Owner phone", nullable: true },
      property_address: { type: "string", description: "Full street address", nullable: true },
      city: { type: "string", description: "City", nullable: true },
      property_type: { type: "string", description: "house | condo | townhome | land | multi-family | other", nullable: true },
      asking_price: { type: "number", description: "Expected or asking price", nullable: true },
      beds: { type: "number", description: "Bedrooms", nullable: true },
      baths: { type: "number", description: "Bathrooms", nullable: true },
      sqft: { type: "number", description: "Interior square footage", nullable: true },
      occupancy: { type: "string", description: "owner-occupied | vacant | tenant | unknown", nullable: true },
      motivation: { type: "string", description: "Why they are selling if stated", nullable: true },
    },
  },
  {
    id: "re-showing-requests",
    name: "Showing & tour requests",
    category: "Real estate",
    description: "Tour scheduling: listing ID/address, preferred times, agent.",
    userQuery:
      "Extract showing or open-house tour requests. Capture listing address or MLS id, preferred dates/times, attendees, and any access notes.",
    outputSchema: {
      listing_address: { type: "string", description: "Property address", nullable: true },
      mls_id: { type: "string", description: "MLS or listing ID", nullable: true },
      requester_name: { type: "string", description: "Who requested the tour", nullable: true },
      requester_email: { type: "string", description: "Requester email", nullable: true },
      preferred_datetime: { type: "string", description: "Requested date/time window", nullable: true },
      party_size: { type: "number", description: "Number of attendees", nullable: true },
      agent_name: { type: "string", description: "Buyer agent if mentioned", nullable: true },
      access_notes: { type: "string", description: "Lockbox / gate / pet notes", nullable: true },
    },
  },
  {
    id: "re-offer-terms",
    name: "Offer & LOI terms",
    category: "Real estate",
    description: "Offers and letters of intent — price, contingencies, close date.",
    userQuery:
      "Find purchase offers, counter-offers, or LOIs. Extract offer price, earnest money, contingencies, financing type, and proposed closing date. Never invent legal terms.",
    outputSchema: {
      property_address: { type: "string", description: "Subject property", nullable: true },
      offer_price: { type: "number", description: "Offered purchase price", nullable: true },
      earnest_money: { type: "number", description: "Earnest / deposit amount", nullable: true },
      financing_type: { type: "string", description: "cash | conventional | FHA | VA | other", nullable: true },
      contingencies: { type: "string", description: "Inspection, appraisal, financing, etc.", nullable: true },
      closing_date: { type: "string", description: "Proposed close date", nullable: true },
      buyer_name: { type: "string", description: "Buyer name", nullable: true },
      seller_name: { type: "string", description: "Seller name", nullable: true },
      expiration: { type: "string", description: "Offer expiration", nullable: true },
    },
  },
  {
    id: "re-closing-escrow",
    name: "Closing & escrow updates",
    category: "Real estate",
    description: "Title/escrow status, wire info flags, milestone dates.",
    userQuery:
      "Extract closing and escrow status emails. Capture file number, closing date, title company, outstanding conditions, and whether wire instructions are mentioned (flag only — do not copy full wire details).",
    outputSchema: {
      escrow_file_number: { type: "string", description: "Escrow or title file #", nullable: true },
      property_address: { type: "string", description: "Property address", nullable: true },
      closing_date: { type: "string", description: "Scheduled closing", nullable: true },
      title_company: { type: "string", description: "Title / escrow company", nullable: true },
      status: { type: "string", description: "open | clear-to-close | delayed | closed | unknown", nullable: true },
      outstanding_items: { type: "string", description: "Open conditions or docs needed", nullable: true },
      wire_instructions_mentioned: { type: "string", description: "yes | no — never paste full wire data", nullable: true },
      contact_name: { type: "string", description: "Escrow officer / closer", nullable: true },
    },
  },
  {
    id: "re-tenant-maintenance",
    name: "Tenant & maintenance",
    category: "Real estate",
    description: "Property management tickets from tenants.",
    userQuery:
      "Classify tenant maintenance and lease emails. Extract unit/address, issue type, urgency, and preferred access window.",
    outputSchema: {
      tenant_name: { type: "string", description: "Tenant name", nullable: true },
      unit_address: { type: "string", description: "Unit or property address", nullable: true },
      issue_type: { type: "string", description: "plumbing | electrical | HVAC | appliance | other", nullable: true },
      urgency: { type: "string", description: "low | medium | high | emergency", nullable: true },
      description: { type: "string", description: "Issue summary", nullable: true },
      access_window: { type: "string", description: "When tech may enter", nullable: true },
    },
  },
  {
    id: "invoice-accounts-payable",
    name: "Vendor invoices (AP)",
    category: "Finance",
    description: "Office vendors, marketing, and contractor invoices.",
    userQuery:
      "Find invoices and payment requests for the brokerage. Extract vendor, amounts, due dates, and reference numbers.",
    outputSchema: {
      vendor_name: { type: "string", description: "Vendor name", nullable: true },
      invoice_number: { type: "string", description: "Invoice number", nullable: true },
      invoice_date: { type: "string", description: "Invoice date", nullable: true },
      due_date: { type: "string", description: "Due date", nullable: true },
      total: { type: "number", description: "Total due", nullable: true },
      currency: { type: "string", description: "Currency", nullable: true },
      category: { type: "string", description: "marketing | utilities | contractor | other", nullable: true },
    },
  },
  {
    id: "support-tickets",
    name: "Client support",
    category: "Customer success",
    description: "Client service issues after closing or during lease.",
    userQuery:
      "Extract client support emails: issue summary, property, urgency, and requested action.",
    outputSchema: {
      client_name: { type: "string", description: "Client name", nullable: true },
      property_address: { type: "string", description: "Related property", nullable: true },
      priority: { type: "string", description: "low | medium | high", nullable: true },
      requested_action: { type: "string", description: "What they want done", nullable: true },
      ticket_subject: { type: "string", description: "Short title", nullable: true },
    },
  },
];
