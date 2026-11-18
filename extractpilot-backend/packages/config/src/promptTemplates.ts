export type PromptTemplate = {
  id: string;
  name: string;
  category: string;
  description: string;
  /** What document types / attachments this template expects */
  documents?: string[];
  userQuery: string;
  outputSchema: Record<string, { type: string; description: string; nullable?: boolean }>;
};

/**
 * Production-ready starters. Prefer multi-document RE packs that read email body + attachments together.
 */
export const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: "re-title-pack",
    name: "Title / registry + NOC pack",
    category: "Real estate · Compliance",
    description:
      "One pass across title/registry extracts, NOCs, encumbrance certificates, and related PDFs attached to the same thread.",
    documents: [
      "Land / property registry extract",
      "NOC (society / bank / authority)",
      "Encumbrance certificate",
      "Mutation / khata / tax receipt",
      "Cover email",
    ],
    userQuery: `You are reviewing a real-estate compliance email and ALL attached documents together (PDF/images). Treat the body and every attachment as one case file.

Identify and extract facts from:
- Property registry / title extract / jamabandi / title deed summary
- NOC letters (society, bank, builder, municipal, airport, fire, environment — note which)
- Encumbrance certificate (EC)
- Mutation, khata, property tax, or utility ownership proof if present

Rules:
- Prefer values printed on documents over email prose when they conflict.
- If a field appears in multiple docs, use the most recent dated value and note the source doc name.
- Never invent registration numbers, survey numbers, or NOC reference IDs.
- Flag missing critical docs in missing_documents.
- Set documents_reviewed to a comma-separated list of attachment filenames / labels you used.
- For wire or bank account numbers: only set flags — never copy full account/IFSC/wire payloads.`,
    outputSchema: {
      property_address: { type: "string", description: "Full property / plot address", nullable: true },
      survey_or_plot_no: { type: "string", description: "Survey / plot / khata / unit number", nullable: true },
      village_city_district: { type: "string", description: "Locality / village / city / district", nullable: true },
      owner_names: { type: "string", description: "Current owner(s) as listed", nullable: true },
      previous_owner_names: { type: "string", description: "Prior owners if mentioned", nullable: true },
      registration_number: { type: "string", description: "Deed / registration number", nullable: true },
      registration_date: { type: "string", description: "Registration or deed date", nullable: true },
      registrar_office: { type: "string", description: "Sub-registrar / registry office", nullable: true },
      property_type: {
        type: "string",
        description: "plot | apartment | villa | commercial | agricultural | other",
        nullable: true,
      },
      area_value: { type: "number", description: "Area numeric value", nullable: true },
      area_unit: { type: "string", description: "sqft | sqm | acre | guntha | other", nullable: true },
      noc_present: { type: "string", description: "yes | no | partial", nullable: true },
      noc_issuer: { type: "string", description: "Who issued the NOC(s)", nullable: true },
      noc_reference: { type: "string", description: "NOC reference / letter number", nullable: true },
      noc_valid_until: { type: "string", description: "NOC validity / expiry if stated", nullable: true },
      noc_conditions: { type: "string", description: "Key conditions or restrictions", nullable: true },
      encumbrance_status: {
        type: "string",
        description: "clear | encumbered | partial | unknown",
        nullable: true,
      },
      encumbrance_period: { type: "string", description: "EC search period (from–to)", nullable: true },
      mortgage_or_lien_notes: { type: "string", description: "Mortgage, charge, or lien summary", nullable: true },
      tax_or_khata_status: { type: "string", description: "Tax / khata / mutation status", nullable: true },
      documents_reviewed: { type: "string", description: "Attachment names reviewed", nullable: true },
      missing_documents: { type: "string", description: "Critical docs not found in the pack", nullable: true },
      risk_flags: { type: "string", description: "Mismatch, expired NOC, open charge, etc.", nullable: true },
      confidence_notes: { type: "string", description: "Where values were uncertain", nullable: true },
    },
  },
  {
    id: "re-deal-dossier",
    name: "Full deal dossier (multi-doc)",
    category: "Real estate · Transactions",
    description:
      "Offer + agreement + KYC + payment proofs in one extraction across email and attachments.",
    documents: ["Offer / LOI", "Sale agreement / ATS", "KYC IDs", "Payment / receipt", "Broker email"],
    userQuery: `Process this transaction email and every attached document as one deal dossier.

Extract across:
- Offer letter / LOI / counter-offer
- Agreement to sell / sale deed draft / booking form
- Buyer & seller KYC (name matching only — do not store full ID numbers; last 4 digits max if needed)
- Payment receipts, cheque scans, or UTR confirmations
- Broker / TC cover notes

Rules:
- Merge parties and property identity across docs.
- List each document type found in documents_reviewed.
- Never invent consideration amounts or dates.
- If multiple offers exist, take the latest dated terms and note earlier ones in notes.`,
    outputSchema: {
      deal_stage: {
        type: "string",
        description: "inquiry | offer | accepted | agreement | closing | closed | unknown",
        nullable: true,
      },
      property_address: { type: "string", description: "Subject property", nullable: true },
      unit_or_plot: { type: "string", description: "Unit / plot / flat identifier", nullable: true },
      buyer_names: { type: "string", description: "Buyer(s)", nullable: true },
      seller_names: { type: "string", description: "Seller(s)", nullable: true },
      broker_or_agent: { type: "string", description: "Broker / agent name", nullable: true },
      offer_price: { type: "number", description: "Latest offer / consideration", nullable: true },
      currency: { type: "string", description: "Currency code or symbol", nullable: true },
      token_or_earnest: { type: "number", description: "Token / earnest amount", nullable: true },
      payment_received: { type: "number", description: "Amount already paid if stated", nullable: true },
      payment_mode: { type: "string", description: "cheque | NEFT | UPI | cash | other", nullable: true },
      agreement_date: { type: "string", description: "Agreement / booking date", nullable: true },
      proposed_closing_date: { type: "string", description: "Target registration / closing", nullable: true },
      contingencies: { type: "string", description: "Financing, inspection, title, etc.", nullable: true },
      financing_type: { type: "string", description: "cash | loan | mixed | unknown", nullable: true },
      lender_name: { type: "string", description: "Bank / NBFC if mentioned", nullable: true },
      kyc_complete: { type: "string", description: "yes | no | partial", nullable: true },
      documents_reviewed: { type: "string", description: "Docs found in the pack", nullable: true },
      outstanding_items: { type: "string", description: "What is still needed", nullable: true },
      notes: { type: "string", description: "Short deal summary", nullable: true },
    },
  },
  {
    id: "re-noc-bundle",
    name: "NOC & clearance bundle",
    category: "Real estate · Compliance",
    description: "Bank, society, builder, and authority NOCs — multiple clearances in one prompt.",
    documents: ["Bank NOC", "Society NOC", "Builder NOC", "Municipal / fire / other clearance"],
    userQuery: `Scan the email and all attached NOC / clearance letters.

For each NOC-like document, capture issuer, reference, property, party, validity, and conditions.
If several NOCs are attached, summarize them together and list issuers in noc_issuers.
Mark overall_status as clear only if every required NOC appears unrestricted; otherwise partial or blocked.
Do not invent letter numbers.`,
    outputSchema: {
      property_address: { type: "string", description: "Property referenced", nullable: true },
      party_name: { type: "string", description: "Applicant / borrower / owner", nullable: true },
      noc_issuers: { type: "string", description: "Comma-separated issuers found", nullable: true },
      primary_noc_type: {
        type: "string",
        description: "bank | society | builder | municipal | fire | other",
        nullable: true,
      },
      primary_reference: { type: "string", description: "Main letter / reference no.", nullable: true },
      issue_date: { type: "string", description: "Issue date", nullable: true },
      valid_until: { type: "string", description: "Validity end date", nullable: true },
      loan_account_last4: { type: "string", description: "Last 4 of loan a/c if any — never full", nullable: true },
      outstanding_dues: { type: "number", description: "Dues to clear if stated", nullable: true },
      currency: { type: "string", description: "Currency", nullable: true },
      conditions: { type: "string", description: "Conditions to satisfy", nullable: true },
      overall_status: { type: "string", description: "clear | partial | blocked | unknown", nullable: true },
      documents_reviewed: { type: "string", description: "NOC filenames reviewed", nullable: true },
      missing_noc_types: { type: "string", description: "Expected NOCs not present", nullable: true },
    },
  },
  {
    id: "re-buyer-leads",
    name: "Buyer / inbound leads",
    category: "Real estate · Sales",
    description: "Lead emails — contact, budget, areas, beds/baths, timeline.",
    documents: ["Inquiry email", "Optional brochure reply"],
    userQuery: `Find prospective buyer inquiries (body + any attached forms).
Extract contact details, budget range, preferred areas, beds/baths, buying timeline, and pre-approval status.
Do not invent values. Ignore newsletters and listing blasts.`,
    outputSchema: {
      lead_name: { type: "string", description: "Buyer full name", nullable: true },
      lead_email: { type: "string", description: "Buyer email", nullable: true },
      lead_phone: { type: "string", description: "Phone if present", nullable: true },
      budget_min: { type: "number", description: "Minimum budget", nullable: true },
      budget_max: { type: "number", description: "Maximum budget", nullable: true },
      currency: { type: "string", description: "Currency", nullable: true },
      preferred_areas: { type: "string", description: "Neighborhoods or cities", nullable: true },
      beds: { type: "number", description: "Bedrooms wanted", nullable: true },
      baths: { type: "number", description: "Bathrooms wanted", nullable: true },
      property_type: { type: "string", description: "apartment | villa | plot | other", nullable: true },
      timeline: { type: "string", description: "Buying timeline", nullable: true },
      preapproved: { type: "string", description: "yes | no | unknown", nullable: true },
      notes: { type: "string", description: "Short summary of the ask", nullable: true },
    },
  },
  {
    id: "re-seller-listings",
    name: "Seller / listing intake",
    category: "Real estate · Sales",
    description: "Owners wanting to list — address, price, property specs.",
    documents: ["Seller email", "Optional floor plan / photos captions"],
    userQuery: `Identify seller or listing intake emails and attachments.
Extract owner contact, property address, expected price, property type, beds/baths, area, occupancy, and motivation.
Prefer explicit facts over guesses.`,
    outputSchema: {
      owner_name: { type: "string", description: "Seller / owner name", nullable: true },
      owner_email: { type: "string", description: "Owner email", nullable: true },
      owner_phone: { type: "string", description: "Owner phone", nullable: true },
      property_address: { type: "string", description: "Full street address", nullable: true },
      city: { type: "string", description: "City", nullable: true },
      property_type: {
        type: "string",
        description: "house | condo | townhome | land | multi-family | other",
        nullable: true,
      },
      asking_price: { type: "number", description: "Expected or asking price", nullable: true },
      beds: { type: "number", description: "Bedrooms", nullable: true },
      baths: { type: "number", description: "Bathrooms", nullable: true },
      area_value: { type: "number", description: "Area value", nullable: true },
      area_unit: { type: "string", description: "sqft | sqm | other", nullable: true },
      occupancy: { type: "string", description: "owner-occupied | vacant | tenant | unknown", nullable: true },
      motivation: { type: "string", description: "Why they are selling if stated", nullable: true },
    },
  },
  {
    id: "re-showing-requests",
    name: "Showing & tour requests",
    category: "Real estate · Ops",
    description: "Tour scheduling with listing ID, times, access notes.",
    documents: ["Showing request email"],
    userQuery: `Extract showing or open-house tour requests.
Capture listing address or MLS id, preferred dates/times, attendees, agent, and access notes.`,
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
    id: "re-closing-escrow",
    name: "Closing, escrow & title updates",
    category: "Real estate · Transactions",
    description: "Escrow status, conditions, title company — flag wire mentions only.",
    documents: ["Escrow update", "Title commitment summary", "Condition list"],
    userQuery: `Extract closing and escrow status from email + attachments.
Capture file number, closing date, title company, outstanding conditions, and whether wire instructions are mentioned (flag only — never copy full wire details).`,
    outputSchema: {
      escrow_file_number: { type: "string", description: "Escrow or title file #", nullable: true },
      property_address: { type: "string", description: "Property address", nullable: true },
      closing_date: { type: "string", description: "Scheduled closing", nullable: true },
      title_company: { type: "string", description: "Title / escrow company", nullable: true },
      status: {
        type: "string",
        description: "open | clear-to-close | delayed | closed | unknown",
        nullable: true,
      },
      outstanding_items: { type: "string", description: "Open conditions or docs needed", nullable: true },
      wire_instructions_mentioned: {
        type: "string",
        description: "yes | no — never paste full wire data",
        nullable: true,
      },
      contact_name: { type: "string", description: "Escrow officer / closer", nullable: true },
      documents_reviewed: { type: "string", description: "Attachments reviewed", nullable: true },
    },
  },
  {
    id: "re-tenant-maintenance",
    name: "Tenant & maintenance",
    category: "Real estate · PM",
    description: "Maintenance tickets and lease issues from tenants.",
    documents: ["Tenant email", "Optional photo captions"],
    userQuery: `Classify tenant maintenance and lease emails.
Extract unit/address, issue type, urgency, description, and preferred access window.`,
    outputSchema: {
      tenant_name: { type: "string", description: "Tenant name", nullable: true },
      unit_address: { type: "string", description: "Unit or property address", nullable: true },
      issue_type: {
        type: "string",
        description: "plumbing | electrical | HVAC | appliance | other",
        nullable: true,
      },
      urgency: { type: "string", description: "low | medium | high | emergency", nullable: true },
      description: { type: "string", description: "Issue summary", nullable: true },
      access_window: { type: "string", description: "When tech may enter", nullable: true },
    },
  },
  {
    id: "invoice-accounts-payable",
    name: "Vendor invoices (AP)",
    category: "Finance",
    description: "Invoice PDFs + payment requests — vendor, amounts, due dates.",
    documents: ["Invoice PDF", "Payment request email"],
    userQuery: `Find invoices and payment requests in the email and attachments.
Extract vendor, invoice number, dates, totals, currency, and category.
Prefer values from the invoice PDF when both body and attachment exist.`,
    outputSchema: {
      vendor_name: { type: "string", description: "Vendor name", nullable: true },
      invoice_number: { type: "string", description: "Invoice number", nullable: true },
      invoice_date: { type: "string", description: "Invoice date", nullable: true },
      due_date: { type: "string", description: "Due date", nullable: true },
      total: { type: "number", description: "Total due", nullable: true },
      currency: { type: "string", description: "Currency", nullable: true },
      category: { type: "string", description: "marketing | utilities | contractor | other", nullable: true },
      documents_reviewed: { type: "string", description: "Invoice files reviewed", nullable: true },
    },
  },
  {
    id: "support-tickets",
    name: "Client support",
    category: "Customer success",
    description: "Client service issues with property context.",
    documents: ["Support email"],
    userQuery: `Extract client support emails: issue summary, related property, urgency, and requested action.`,
    outputSchema: {
      client_name: { type: "string", description: "Client name", nullable: true },
      property_address: { type: "string", description: "Related property", nullable: true },
      priority: { type: "string", description: "low | medium | high", nullable: true },
      requested_action: { type: "string", description: "What they want done", nullable: true },
      ticket_subject: { type: "string", description: "Short title", nullable: true },
    },
  },
];
