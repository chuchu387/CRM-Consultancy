export const VISA_STATUS_OPTIONS = [
  "Application Received",
  "Documents Pending",
  "Documents Under Review",
  "Submitted to Embassy",
  "Interview Scheduled",
  "Approved",
  "Rejected",
  "On Hold",
];

const statusThemeMap = {
  pending: {
    badge: "bg-amber-100 text-amber-700 ring-amber-200",
    dot: "bg-amber-500",
  },
  partial: {
    badge: "bg-amber-100 text-amber-700 ring-amber-200",
    dot: "bg-amber-500",
  },
  uploaded: {
    badge: "bg-purple-100 text-purple-700 ring-purple-200",
    dot: "bg-purple-500",
  },
  changes_requested: {
    badge: "bg-orange-100 text-orange-700 ring-orange-200",
    dot: "bg-orange-500",
  },
  approved: {
    badge: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  accepted: {
    badge: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  Approved: {
    badge: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  rejected: {
    badge: "bg-rose-100 text-rose-700 ring-rose-200",
    dot: "bg-rose-500",
  },
  Rejected: {
    badge: "bg-rose-100 text-rose-700 ring-rose-200",
    dot: "bg-rose-500",
  },
  rescheduled: {
    badge: "bg-blue-100 text-blue-700 ring-blue-200",
    dot: "bg-blue-500",
  },
  completed: {
    badge: "bg-teal-100 text-teal-700 ring-teal-200",
    dot: "bg-teal-500",
  },
  paid: {
    badge: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  overdue: {
    badge: "bg-rose-100 text-rose-700 ring-rose-200",
    dot: "bg-rose-500",
  },
  in_progress: {
    badge: "bg-blue-100 text-blue-700 ring-blue-200",
    dot: "bg-blue-500",
  },
  cancelled: {
    badge: "bg-zinc-100 text-zinc-700 ring-zinc-200",
    dot: "bg-zinc-500",
  },
  draft: {
    badge: "bg-slate-100 text-slate-700 ring-slate-200",
    dot: "bg-slate-500",
  },
  applied: {
    badge: "bg-blue-100 text-blue-700 ring-blue-200",
    dot: "bg-blue-500",
  },
  offer_received: {
    badge: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  offer_rejected: {
    badge: "bg-rose-100 text-rose-700 ring-rose-200",
    dot: "bg-rose-500",
  },
  visa_filed: {
    badge: "bg-indigo-100 text-indigo-700 ring-indigo-200",
    dot: "bg-indigo-500",
  },
  closed: {
    badge: "bg-zinc-100 text-zinc-700 ring-zinc-200",
    dot: "bg-zinc-500",
  },
  received: {
    badge: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  not_required: {
    badge: "bg-cyan-100 text-cyan-700 ring-cyan-200",
    dot: "bg-cyan-500",
  },
  not_applicable: {
    badge: "bg-cyan-100 text-cyan-700 ring-cyan-200",
    dot: "bg-cyan-500",
  },
  "Application Received": {
    badge: "bg-slate-100 text-slate-700 ring-slate-200",
    dot: "bg-slate-500",
  },
  "Documents Pending": {
    badge: "bg-orange-100 text-orange-700 ring-orange-200",
    dot: "bg-orange-500",
  },
  "Documents Under Review": {
    badge: "bg-yellow-100 text-yellow-800 ring-yellow-200",
    dot: "bg-yellow-500",
  },
  "Submitted to Embassy": {
    badge: "bg-indigo-100 text-indigo-700 ring-indigo-200",
    dot: "bg-indigo-500",
  },
  "Interview Scheduled": {
    badge: "bg-cyan-100 text-cyan-700 ring-cyan-200",
    dot: "bg-cyan-500",
  },
  "On Hold": {
    badge: "bg-zinc-100 text-zinc-700 ring-zinc-200",
    dot: "bg-zinc-500",
  },
  "Awaiting Acceptance": {
    badge: "bg-amber-100 text-amber-700 ring-amber-200",
    dot: "bg-amber-500",
  },
  "Accepted by Student": {
    badge: "bg-blue-100 text-blue-700 ring-blue-200",
    dot: "bg-blue-500",
  },
};

const fallbackTheme = {
  badge: "bg-slate-100 text-slate-700 ring-slate-200",
  dot: "bg-slate-500",
};

export const getStatusTheme = (status) => statusThemeMap[status] || fallbackTheme;
