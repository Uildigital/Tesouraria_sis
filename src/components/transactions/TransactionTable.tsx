import React from 'react';
import { FileText, Edit2, Trash2, Eye, Loader2, CheckCircle2, Clock, AlertCircle, Plus } from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../../lib/utils';
import { Transaction } from '../../types';

interface Props {
  transactions: Transaction[];
  loading: boolean;
  canEdit: boolean;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, currentStatus: string) => void;
  onNew: () => void;
}

export const TransactionTable: React.FC<Props> = ({ transactions, loading, canEdit, onEdit, onDelete, onToggleStatus, onNew }) => {
  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="min-w-[800px]">
        <table className="w-full text-left text-sm">
        <thead className="bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
          <tr>
            <th className="px-6 py-4">Data/Hora</th>
            <th className="px-6 py-4">Descrição</th>
            <th className="px-6 py-4">Conta</th>
            <th className="px-6 py-4">Categoria</th>
            <th className="px-6 py-4">Valor</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4 text-right">Ações</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {loading ? (
            <tr>
              <td colSpan={7} className="px-6 py-12 text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
              </td>
            </tr>
          ) : transactions.map((t) => (
            <tr key={t.id} className="hover:bg-zinc-50/50 transition-colors">
              <td className="px-6 py-4">
                <div className="flex flex-col">
                  <span className="text-zinc-600 font-medium">{formatDate(t.date)}</span>
                  <span className="text-[10px] text-zinc-400">{t.time || '--:--'}</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-col">
                  <span className="font-semibold text-zinc-900">{t.description}</span>
                  {t.observation && <span className="text-xs text-zinc-400 italic">{t.observation}</span>}
                  {t.attachment_url && (
                    <a href={t.attachment_url} target="_blank" rel="noreferrer" className="mt-1 flex items-center text-xs text-emerald-600 hover:underline">
                      <FileText className="mr-1 h-3 w-3" /> Ver comprovante
                    </a>
                  )}
                </div>
              </td>
              <td className="px-6 py-4">
                <span className={cn(
                  "inline-flex items-center rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider",
                  t.account === 'Poupança' ? "bg-indigo-50 text-indigo-700" : "bg-zinc-100 text-zinc-700"
                )}>
                  {t.account || 'Corrente'}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-col">
                  <span className="text-zinc-700">{t.category?.name}</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <span className={cn(
                  "font-bold",
                  t.type === 'income' ? "text-emerald-600" : "text-red-600"
                )}>
                  {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                </span>
              </td>
              <td className="px-6 py-4">
                <button 
                  onClick={() => canEdit && onToggleStatus(t.id, t.status)}
                  disabled={!canEdit}
                  className={cn(
                    "flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
                    t.status === 'conciliated' ? "bg-emerald-50 text-emerald-700" : 
                    t.status === 'pending' ? "bg-amber-50 text-amber-700" :
                    "bg-blue-50 text-blue-700",
                    !canEdit && "cursor-default"
                  )}
                >
                  {t.status === 'conciliated' ? (
                    <><CheckCircle2 className="mr-1 h-3 w-3" /> Conciliado</>
                  ) : t.status === 'pending' ? (
                    <><Clock className="mr-1 h-3 w-3" /> Pendente</>
                  ) : (
                    <><AlertCircle className="mr-1 h-3 w-3" /> Aprovação</>
                  )}
                </button>
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-2">
                  {t.attachment_url && (
                    <a 
                      href={t.attachment_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="rounded-lg p-1 text-zinc-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                      title="Ver Comprovante"
                    >
                      <Eye className="h-5 w-5" />
                    </a>
                  )}
                  {canEdit && (
                    <>
                      <button 
                        onClick={() => onEdit(t)}
                        className="rounded-lg p-1 text-zinc-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button 
                        onClick={() => onDelete(t.id)}
                        className="rounded-lg p-1 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {transactions.length === 0 && !loading && (
            <tr>
              <td colSpan={7} className="px-6 py-24 text-center">
                <div className="flex flex-col items-center justify-center">
                  <div className="mb-4 rounded-full bg-zinc-50 p-4">
                    <FileText className="h-10 w-10 text-zinc-300" />
                  </div>
                  <h3 className="text-lg font-bold text-zinc-900">Nenhum lançamento encontrado</h3>
                  <p className="mt-1 text-sm text-zinc-500">Comece registrando a primeira movimentação da igreja.</p>
                  {canEdit && (
                    <button 
                      onClick={onNew}
                      className="mt-6 flex items-center justify-center rounded-xl bg-zinc-900 px-6 py-2.5 text-sm font-bold text-white hover:bg-zinc-800 transition-all"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Novo Lançamento
                    </button>
                  )}
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>
    </div>
  );
};
