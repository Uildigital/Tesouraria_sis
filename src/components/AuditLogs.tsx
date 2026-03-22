import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { formatDate, cn } from '../lib/utils';
import { apiService } from '../services/apiService';
import { History, User, Activity, Loader2 } from 'lucide-react';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await apiService.getAuditLogs();
      setLogs(data);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-2xl font-bold text-zinc-900 flex items-center">
          <History className="mr-2 h-6 w-6 text-indigo-600" />
          Logs de Auditoria
        </h3>
        <div className="flex gap-4">
          <button 
            onClick={fetchLogs}
            className="text-xs font-bold uppercase tracking-widest text-indigo-600 hover:text-indigo-700"
          >
            Atualizar
          </button>
          <button 
            onClick={async () => {
              if (confirm('Deseja limpar todos os registros de auditoria?')) {
                setLoading(true);
                try {
                  await apiService.clearAuditLogs();
                  setLogs([]);
                } catch (error) {
                  console.error(error);
                } finally {
                  setLoading(false);
                }
              }
            }}
            className="text-xs font-bold uppercase tracking-widest text-rose-600 hover:text-rose-700"
          >
            Limpar Logs
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-100 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              <tr>
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">Ação</th>
                <th className="px-6 py-4">Detalhes</th>
                <th className="px-6 py-4 text-right">Data/Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                    Nenhum log registrado.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="rounded-full bg-zinc-100 p-1.5">
                          <User className="h-3 w-3 text-zinc-500" />
                        </div>
                        <span className="font-medium text-zinc-700">{log.user_email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-lg bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-500">{log.details}</td>
                    <td className="px-6 py-4 text-right text-zinc-400 font-mono text-[10px]">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="rounded-2xl bg-amber-50 p-4 border border-amber-100">
        <div className="flex gap-3">
          <Activity className="h-5 w-5 text-amber-600" />
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>Dica de Segurança:</strong> Os logs de auditoria são imutáveis e garantem a transparência de todas as operações críticas realizadas no sistema.
          </p>
        </div>
      </div>
    </div>
  );
};
