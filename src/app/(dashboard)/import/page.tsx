import { notFound } from "next/navigation";
import { getAccounts } from "@/actions/account-actions";
import { isAiEnabled } from "@/lib/import/feature-gating";
import { ImportClient } from "./client";

export default async function ImportPage() {
  if (!isAiEnabled()) {
    notFound();
  }

  const accountsResult = await getAccounts();
  const accounts = accountsResult.success ? accountsResult.data : [];

  return <ImportClient accounts={accounts} />;
}
