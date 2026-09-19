export const reportReasonLabels = {
  spam: "Spam",
  inaccurate: "Inaccurate information",
  unsafe: "Unsafe information",
  private_information: "Private information",
  other: "Other",
} as const;

export type ReportReason = keyof typeof reportReasonLabels;
