import React, { useEffect, useState, useMemo } from 'react';
import { 
  History, 
  User, 
  Activity, 
  Loader2, 
  LogIn, 
  LogOut, 
  ShieldAlert, 
  PlusCircle, 
  Edit3, 
  Trash2, 
  Search, 
  Settings as SettingsIcon, 
  Clock, 
  RefreshCw,
  Users,
  Database
} from 'lucide-react';
import { apiService } from '../services/apiService';
import { toast } from 'sonner';

type FilterCategory = 'todos' | 'acessos' | 'lancamentos' | 'configuracoes' | 'outros';

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterCategory>('todos');

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const data = await apiService.getAuditLogs();
      setLogs(data || []);
    } catch (error: any) {
      console.error('Error fetching logs:', error);
      toast.error('Erro ao carregar logs: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper to categorize an action
  const getActionCategory = (action: string = ''): FilterCategory => {
    const act = action.toLowerCase();
    if (act.includes('acesso') || act.includes('login') || act.includes('logout') || act.includes('bloqueado')) {
      return 'acessos';
    }
    if (act.includes('lançamento') || act.includes('lancamento')) {
      return 'lancamentos';
    }
    if (act.includes('configur') || act.includes('planilha')) {
      return 'configuracoes';
    }
    return 'outros';
  };

  // Helper for badge visual styling & icon
  const getActionBadge = (action: string = '') => {
    const act = action.toLowerCase();
    if (act.includes('login') || act.includes('acesso ao sistema')) {
      return {
        icon: LogIn,
        label: action,
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-500'
      };
    }
    if (act.includes('logout') || act.includes('saída do sistema')) {
      return {
        icon: LogOut,
        label: action,
        bg: 'bg-slate-100 text-slate-700 border-slate-200',
        dot: 'bg-slate-400'
      };
    }
    if (act.includes('falhou') || act.includes('bloqueado')) {
      return {
        icon: ShieldAlert,
        label: action,
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500'
      };
    }
    if (act.includes('criou') || act.includes('cadastro')) {
      return {
        icon: PlusCircle,
        label: action,
        bg: 'bg-blue-50 text-blue-700 border-blue-200',
        dot: 'bg-blue-500'
      };
    }
    if (act.includes('atualizou') || act.includes('patch')) {
      return {
        icon: Edit3,
        label: action,
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-500'
      };
    }
    if (act.includes('excluiu') || act.includes('resetou')) {
      return {
        icon: Trash2,
        label: action,
        bg: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500'
      };
    }
    if (act.includes('configur')) {
      return {
        icon: SettingsIcon,
        label: action,
        bg: 'bg-purple-50 text-purple-700 border-purple-200',
        dot: 'bg-purple-500'
      };
    }
    return {
      icon: Activity,
      label: action,
      bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      dot: 'bg-indigo-500'
    };
  };

  // Extract user full name from details or email
  const extractUserDisplay = (log: any) => {
    const details = log.details || '';
    // Check patterns like: Usuário "Nome da Pessoa" ... or Por "Nome da Pessoa": ...
    const matchQuote = details.match(/(?:Usuário|Por)\s*"([^"]+)"/i);
    const fullName = matchQuote ? matchQuote[1] : null;
    const email = log.user_email || 'sistema';

    // Get initials
    const nameForInitials = fullName || email;
    const initials = nameForInitials
      .split(/[@\s]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part: string) => part[0]?.toUpperCase())
      .join('');

    return {
      name: fullName,
      email,
      initials: initials || 'U'
    };
  };

  // Format date nicely
  const formatDateTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const today = new Date();
      const isToday = date.toDateString() === today.toDateString();
      
      const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const dateOnlyStr = date.toLocaleDateString('pt-BR');

      return {
        dateStr: isToday ? 'Hoje' : dateOnlyStr,
        timeStr,
        full: `${dateOnlyStr} às ${timeStr}`
      };
    } catch {
      return { dateStr: '-', timeStr: '-', full: dateStr };
    }
  };

  // Counts for tabs
  const counts = useMemo(() => {
    let acessos = 0;
    let lancamentos = 0;
    let configuracoes = 0;
    let outros = 0;

    logs.forEach(log => {
      const cat = getActionCategory(log.action);
      if (cat === 'acessos') acessos++;
      else if (cat === 'lancamentos') lancamentos++;
      else if (cat === 'configuracoes') configuracoes++;
      else outros++;
    });

    return {
      todos: logs.length,
      acessos,
      lancamentos,
      configuracoes,
      outros
    };
  }, [logs]);

  // Last login information
  const lastAccess = useMemo(() => {
    const accessLog = logs.find(log => {
      const act = (log.action || '').toLowerCase();
      return act.includes('acesso ao sistema') || act.includes('login');
    });
    if (!accessLog) return null;
    const userDisplay = extractUserDisplay(accessLog);
    const dt = formatDateTime(accessLog.created_at);
    return {
      name: userDisplay.name || userDisplay.email,
      when: dt.full
    };
  }, [logs]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Category filter
      if (selectedFilter !== 'todos') {
        const cat = getActionCategory(log.action);
        if (cat !== selectedFilter) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const email = (log.user_email || '').toLowerCase();
        const action = (log.action || '').toLowerCase();
        const details = (log.details || '').toLowerCase();
        return email.includes(query) || action.includes(query) || details.includes(query);
      }

      return true;
    });
  }, [logs, selectedFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="font-display text-2xl font-bold text-zinc-900 flex items-center gap-2">
            <History className="h-6 w-6 text-indigo-600" />
            Logs de Auditoria & Acesso
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            Histórico imutável de movimentações, logins, lançamentos e alterações no sistema
          </p>
        </div>

        <button 
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 hover:border-zinc-300 transition-all shadow-sm active:scale-95 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 text-indigo-600 ${loading ? 'animate-spin' : ''}`} />
          Atualizar Logs
        </button>
      </div>

      {/* KPI / Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total de Eventos</span>
            <Activity className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-zinc-900">{counts.todos}</div>
          <p className="text-[10px] text-zinc-400 mt-0.5">Registros em auditoria</p>
        </div>

        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 shadow-sm">
          <div className="flex items-center justify-between text-emerald-700 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Acessos (Logins)</span>
            <LogIn className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-900">{counts.acessos}</div>
          <p className="text-[10px] text-emerald-700/70 mt-0.5">Entradas e movimentações</p>
        </div>

        <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 shadow-sm">
          <div className="flex items-center justify-between text-blue-700 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Lançamentos</span>
            <Database className="h-4 w-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-900">{counts.lancamentos}</div>
          <p className="text-[10px] text-blue-700/70 mt-0.5">Criações e edições</p>
        </div>

        <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100 shadow-sm">
          <div className="flex items-center justify-between text-purple-700 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Último Acesso</span>
            <Clock className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-xs font-bold text-purple-950 truncate" title={lastAccess?.name || 'Nenhum'}>
            {lastAccess?.name || 'Nenhum'}
          </div>
          <p className="text-[10px] text-purple-700/80 mt-1 truncate">
            {lastAccess?.when || 'Sem registros recentes'}
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 rounded-2xl border border-zinc-200 shadow-sm">
        {/* Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedFilter('todos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              selectedFilter === 'todos'
                ? 'bg-zinc-900 text-white shadow-sm'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            Todos
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              selectedFilter === 'todos' ? 'bg-zinc-700 text-white' : 'bg-zinc-200 text-zinc-600'
            }`}>
              {counts.todos}
            </span>
          </button>

          <button
            onClick={() => setSelectedFilter('acessos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              selectedFilter === 'acessos'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <LogIn className="h-3 w-3" />
            Acessos ao Sistema
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              selectedFilter === 'acessos' ? 'bg-emerald-700 text-white' : 'bg-zinc-200 text-zinc-600'
            }`}>
              {counts.acessos}
            </span>
          </button>

          <button
            onClick={() => setSelectedFilter('lancamentos')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              selectedFilter === 'lancamentos'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <Database className="h-3 w-3" />
            Lançamentos
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              selectedFilter === 'lancamentos' ? 'bg-blue-700 text-white' : 'bg-zinc-200 text-zinc-600'
            }`}>
              {counts.lancamentos}
            </span>
          </button>

          <button
            onClick={() => setSelectedFilter('configuracoes')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              selectedFilter === 'configuracoes'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <SettingsIcon className="h-3 w-3" />
            Configurações
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              selectedFilter === 'configuracoes' ? 'bg-purple-700 text-white' : 'bg-zinc-200 text-zinc-600'
            }`}>
              {counts.configuracoes}
            </span>
          </button>

          <button
            onClick={() => setSelectedFilter('outros')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              selectedFilter === 'outros'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-zinc-600 hover:bg-zinc-100'
            }`}
          >
            <Users className="h-3 w-3" />
            Outros
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              selectedFilter === 'outros' ? 'bg-amber-700 text-white' : 'bg-zinc-200 text-zinc-600'
            }`}>
              {counts.outros}
            </span>
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por usuário, ação ou detalhe..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all placeholder:text-zinc-400"
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-[10px] font-bold uppercase tracking-widest text-zinc-500 border-b border-zinc-100">
              <tr>
                <th className="px-6 py-4">Usuário</th>
                <th className="px-6 py-4">Ação Realizada</th>
                <th className="px-6 py-4">Detalhes do Evento</th>
                <th className="px-6 py-4 text-right">Data & Hora</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center">
                    <Loader2 className="mx-auto h-8 w-8 animate-spin text-indigo-600 mb-2" />
                    <p className="text-xs text-zinc-500">Carregando histórico de auditoria...</p>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-16 text-center text-zinc-500">
                    <History className="mx-auto h-8 w-8 text-zinc-300 mb-2" />
                    <p className="text-sm font-medium text-zinc-700">Nenhum registro encontrado</p>
                    <p className="text-xs text-zinc-400 mt-1">
                      {searchQuery ? 'Tente alterar os termos da busca.' : 'Nenhum log corresponde ao filtro selecionado.'}
                    </p>
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="mt-3 text-xs font-semibold text-indigo-600 hover:underline"
                      >
                        Limpar busca
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const badge = getActionBadge(log.action);
                  const BadgeIcon = badge.icon;
                  const userDisplay = extractUserDisplay(log);
                  const dt = formatDateTime(log.created_at);

                  return (
                    <tr key={log.id} className="hover:bg-zinc-50/70 transition-colors">
                      {/* User Column */}
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white font-bold text-xs shadow-sm">
                            {userDisplay.initials}
                          </div>
                          <div className="flex flex-col">
                            {userDisplay.name ? (
                              <>
                                <span className="font-semibold text-zinc-900 text-xs">
                                  {userDisplay.name}
                                </span>
                                <span className="text-[11px] text-zinc-400">
                                  {userDisplay.email}
                                </span>
                              </>
                            ) : (
                              <span className="font-medium text-zinc-800 text-xs">
                                {userDisplay.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Action Column */}
                      <td className="px-6 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-bold border ${badge.bg}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                          <BadgeIcon className="h-3 w-3" />
                          {badge.label}
                        </span>
                      </td>

                      {/* Details Column */}
                      <td className="px-6 py-3.5 text-xs text-zinc-600 max-w-md">
                        <span className="line-clamp-2 leading-relaxed">
                          {log.details || '—'}
                        </span>
                      </td>

                      {/* Date Column */}
                      <td className="px-6 py-3.5 text-right whitespace-nowrap">
                        <div className="flex flex-col items-end">
                          <span className="text-xs font-medium text-zinc-700">
                            {dt.dateStr}
                          </span>
                          <span className="text-[10px] font-mono text-zinc-400">
                            {dt.timeStr}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        {!loading && filteredLogs.length > 0 && (
          <div className="px-6 py-3 bg-zinc-50/50 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
            <span>
              Exibindo <strong>{filteredLogs.length}</strong> de <strong>{logs.length}</strong> eventos registrados
            </span>
            <span className="text-[11px] text-zinc-400">
              Registros ordenados por data decrescente
            </span>
          </div>
        )}
      </div>

      {/* Security Tip */}
      <div className="rounded-2xl bg-amber-50 p-4 border border-amber-200/60 shadow-sm">
        <div className="flex gap-3">
          <Activity className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-amber-900 mb-0.5">Auditoria & Rastreabilidade do Sistema</h4>
            <p className="text-xs text-amber-800 leading-relaxed">
              Todos os acessos (logins e logouts) e movimentações de lançamentos e configurações são registrados automaticamente com data, hora e identificação do usuário responsável, assegurando total conformidade e segurança na gestão da tesouraria.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
