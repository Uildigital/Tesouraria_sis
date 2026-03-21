import React from 'react';
import { ArrowUpRight, ArrowDownRight, Calendar } from 'lucide-react';
import { formatCurrency, parseAmount, cn } from '../../lib/utils';
import { Transaction } from '../../types';

interface Props {
  transactions: Transaction[];
  activeAccountTab: 'Corrente' | 'Poupança';
}

export const TransactionSummaryCards: React.FC<Props> = ({ transactions, activeAccountTab }) => {
  const accountTransactions = transactions.filter(t => t.account === activeAccountTab);
  const income = accountTransactions.filter(t => t.type === 'income').reduce((acc, t) => acc + parseAmount(t.amount), 0);
  const expense = accountTransactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + parseAmount(t.amount), 0);
  const balance = income - expense;

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
      <div className="premium-card p-4 sm:p-6 flex items-center gap-3 sm:gap-4">
        <div className="rounded-xl sm:rounded-2xl bg-emerald-50 p-2 sm:p-3 text-emerald-600">
          <ArrowUpRight className="h-5 w-5 sm:h-6 sm:h-6" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Entradas ({activeAccountTab})</p>
          <p className="text-base sm:text-xl font-bold text-zinc-900 truncate">
            {formatCurrency(income)}
          </p>
        </div>
      </div>
      <div className="premium-card p-4 sm:p-6 flex items-center gap-3 sm:gap-4">
        <div className="rounded-xl sm:rounded-2xl bg-rose-50 p-2 sm:p-3 text-rose-600">
          <ArrowDownRight className="h-5 w-5 sm:h-6 sm:h-6" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Saídas ({activeAccountTab})</p>
          <p className="text-base sm:text-xl font-bold text-zinc-900 truncate">
            {formatCurrency(expense)}
          </p>
        </div>
      </div>
      <div className="premium-card p-4 sm:p-6 flex items-center gap-3 sm:gap-4 col-span-2 lg:col-span-1">
        <div className="rounded-xl sm:rounded-2xl bg-indigo-50 p-2 sm:p-3 text-indigo-600">
          <Calendar className="h-5 w-5 sm:h-6 sm:h-6" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Saldo ({activeAccountTab})</p>
          <p className={cn("text-base sm:text-xl font-bold", balance >= 0 ? "text-emerald-600" : "text-rose-600")}>
            {formatCurrency(balance)}
          </p>
        </div>
      </div>
    </div>
  );
};
