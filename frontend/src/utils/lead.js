export const LEAD_STATUS_OPTIONS = [
  "new",
  "contacted",
  "counseling",
  "documents_pending",
  "application_in_progress",
  "converted",
  "lost",
];

export const LEAD_STATUS_LABELS = {
  new: "New",
  contacted: "Contacted",
  counseling: "Counseling",
  documents_pending: "Documents Pending",
  application_in_progress: "Application In Progress",
  converted: "Converted",
  lost: "Lost",
};

export const LEAD_SOURCE_OPTIONS = [
  "walk_in",
  "website",
  "facebook",
  "instagram",
  "referral",
  "call",
  "whatsapp",
  "other",
];

export const LEAD_SOURCE_LABELS = {
  walk_in: "Walk-In",
  website: "Website",
  facebook: "Facebook",
  instagram: "Instagram",
  referral: "Referral",
  call: "Call",
  whatsapp: "WhatsApp",
  other: "Other",
};

export const CLOSED_LEAD_STATUSES = new Set(["converted", "lost"]);

export const formatLeadStatus = (status) => LEAD_STATUS_LABELS[status] || status || "Unknown";

export const formatLeadSource = (source) => LEAD_SOURCE_LABELS[source] || source || "Unknown";

export const isClosedLead = (status) => CLOSED_LEAD_STATUSES.has(status);
