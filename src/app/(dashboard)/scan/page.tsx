import { getTranslations } from "next-intl/server";
import { getAccounts } from "@/actions/account-actions";
import { getCategories } from "@/actions/category-actions";
import { isAiEnabled } from "@/lib/import/feature-gating";
import { ScanClient } from "./client";
import { ScanLine } from "lucide-react";

export default async function ScanPage() {
  const t = await getTranslations("receiptScan");

  if (!isAiEnabled()) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="bg-muted flex h-14 w-14 items-center justify-center rounded-xl">
          <ScanLine className="text-muted-foreground h-7 w-7" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">{t("notEnabledTitle")}</h1>
          <p className="text-muted-foreground mt-1 max-w-sm text-sm">
            {t("notEnabledDescription")}
          </p>
        </div>
      </div>
    );
  }

  const [accountsResult, categoriesResult] = await Promise.all([getAccounts(), getCategories()]);

  const accounts = accountsResult.success ? accountsResult.data : [];
  const categories = categoriesResult.success ? categoriesResult.data : [];

  return <ScanClient accounts={accounts} categories={categories} />;
}
