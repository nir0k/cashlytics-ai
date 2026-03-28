export type ReceiptScanResult = {
  merchant: string | null;
  amount: number | null;
  date: string | null; // ISO "YYYY-MM-DD"
  currency: string | null;
  description: string | null;
  suggestedCategoryName: string | null;
  confidence: "high" | "medium" | "low";
};
