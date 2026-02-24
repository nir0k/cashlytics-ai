'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, CalendarDays, Pencil } from 'lucide-react';
import { IncomeForm } from '@/components/organisms/income-form';
import { deleteIncome } from '@/actions/income-actions';
import { useToast } from '@/hooks/use-toast';
import { useSettings } from '@/lib/settings-context';
import { useTranslations } from 'next-intl';
import type { Account, IncomeWithAccount, Income } from '@/types/database';

interface IncomeClientProps {
  accounts: Account[];
  initialIncomes: IncomeWithAccount[];
}

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat().format(new Date(date));
}

export function IncomeClient({
  accounts,
  initialIncomes,
}: IncomeClientProps) {
  const { toast } = useToast();
  const { formatCurrency: fmt } = useSettings();
  const t = useTranslations('income');
  const tCommon = useTranslations('common');
  const tRecurrence = useTranslations('recurrence');
  const formatCurrency = (amount: string | number) => fmt(typeof amount === 'string' ? parseFloat(amount) : amount);
  const [incomes, setIncomes] = useState(initialIncomes);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');

  const filteredIncomes = selectedAccountId === 'all' ? incomes : incomes.filter(i => i.accountId === selectedAccountId);

  const getDebitLabel = (recurrenceType: string, startDate: Date | string): string => {
    const date = new Date(startDate);
    const day = date.getDate();
    const month = date.toLocaleDateString(undefined, { month: 'short' });
    switch (recurrenceType) {
      case 'monthly': return tRecurrence('monthly');
      case 'yearly': return `${day}. ${month} (${tRecurrence('yearly')})`;
      default: return formatDate(startDate);
    }
  };

  const handleSuccess = (data: { id: string; accountId?: string; [key: string]: unknown }) => {
    const newIncome = {
      ...data,
      account: accounts.find(a => a.id === data.accountId) || null,
    } as IncomeWithAccount;
    setIncomes(prev => [newIncome, ...prev]);
  };

  const handleEditSuccess = (data: { id: string; accountId?: string; [key: string]: unknown }) => {
    const updatedIncome = {
      ...data,
      account: accounts.find(a => a.id === data.accountId) || null,
    } as IncomeWithAccount;
    setIncomes(prev => prev.map(i => i.id === data.id ? updatedIncome : i));
    setEditingIncome(null);
    setEditDialogOpen(false);
    toast({ title: t('updated'), description: t('updatedDesc') });
  };

  const handleDelete = async (id: string, source: string) => {
    if (!confirm(t('deleteConfirm', { source }))) return;
    
    const result = await deleteIncome(id);
    if (result.success) {
      setIncomes(prev => prev.filter(i => i.id !== id));
      toast({ title: tCommon('delete'), description: `"${source}" wurde entfernt.` });
    } else {
      toast({ title: t('deleteFailed'), variant: 'destructive' });
    }
  };

  const handleEdit = (income: IncomeWithAccount) => {
    setEditingIncome(income);
    setEditDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-[2rem] font-bold tracking-[-0.03em] leading-none bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">{t('title')}</h2>
          <p className="text-sm text-muted-foreground/60 mt-1.5">{t('description')}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {accounts.length > 1 && (
            <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tCommon('allAccounts')}</SelectItem>
                {accounts.map(account => (
                  <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <IncomeForm accounts={accounts} onSuccess={handleSuccess} />
        </div>
      </div>

      <IncomeForm
        accounts={accounts}
        editIncome={editingIncome}
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) setEditingIncome(null);
        }}
        onSuccess={handleEditSuccess}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('allIncome', { count: filteredIncomes.length })}</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredIncomes.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {t('noIncome')}
            </p>
          ) : (
            <div className="space-y-2">
              {filteredIncomes.map(income => (
                <div
                  key={income.id}
                  className="flex items-start gap-3 p-4 rounded-xl hover:bg-accent/30 dark:hover:bg-white/5 transition-colors duration-200"
                >
                  <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-lg bg-gradient-to-br from-emerald-500/20 to-emerald-500/5">
                    💰
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Zeile 1: Name + Buttons */}
                    <div className="flex items-start justify-between gap-1">
                      <p className="font-medium">{income.source}</p>
                      <div className="flex items-center gap-0.5 flex-shrink-0 -mt-1 -mr-2">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(income)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(income.id, income.source)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    {/* Zeile 2: Konto & Intervall */}
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {income.account?.name ?? t('unknownAccount')} • {tRecurrence(income.recurrenceType)}
                    </p>
                    {/* Zeile 3: Datum-Info + Betrag */}
                    <div className="flex items-end justify-between mt-1.5 gap-2">
                      <div>
                        {income.recurrenceType !== 'once' && (
                          <div className="flex items-center gap-1">
                            <CalendarDays className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                            <span className="text-xs font-medium text-emerald-500">
                              {t('credit')} {getDebitLabel(income.recurrenceType, income.startDate)}
                            </span>
                          </div>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">{t('since')} {formatDate(income.startDate)}</p>
                      </div>
                      <p className="font-semibold text-emerald-500 whitespace-nowrap flex-shrink-0">{formatCurrency(income.amount)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
