import { getAccounts } from "@/actions/account-actions";
import { getExpenses } from "@/actions/expense-actions";
import { getIncomes } from "@/actions/income-actions";
import { getTransfers } from "@/actions/transfer-actions";
import { AccountsClient } from "./client";

export default async function AccountsPage() {
  const [accountsResult, expensesResult, incomesResult, transfersResult] = await Promise.all([
    getAccounts(),
    getExpenses(),
    getIncomes(),
    getTransfers(),
  ]);

  const accounts = accountsResult.success ? accountsResult.data : [];
  const expenses = expensesResult.success ? expensesResult.data : [];
  const incomes = incomesResult.success ? incomesResult.data : [];
  const transfers = transfersResult.success ? transfersResult.data : [];

  return (
    <AccountsClient
      initialAccounts={accounts}
      initialExpenses={expenses}
      initialIncomes={incomes}
      initialTransfers={transfers}
    />
  );
}
