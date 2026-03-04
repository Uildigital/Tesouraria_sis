import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  Tags, 
  Bell, 
  Shield, 
  ChevronRight, 
  ArrowLeft,
  Save,
  Loader2,
  History,
  Sparkles,
  Globe,
  Church
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { CategoryManager } from '../components/CategoryManager';
import { DepartmentManager } from '../components/DepartmentManager';
import { AuditLogs } from '../components/AuditLogs';
import { apiService } from '../services/apiService';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

type SettingsView = 'menu' | 'org' | 'depts' | 'cats' | 'notifications' | 'audit' | 'integrations';

export const Settings: React.FC = () => {
  const { canEdit } = useAuth();
  const [activeView, setActiveView] = useState<SettingsView>('menu');
  const [isSaving, setIsSaving] = useState(false);
  
  const [churchName, setChurchName] = useState('Minha Igreja');

  const sections = [
    { id: 'depts', title: 'Departamentos', description: 'Gerenciar centros de custo e ministérios', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'cats', title: 'Categorias', description: 'Plano de contas e hierarquia de gastos', icon: Tags, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'audit', title: 'Logs de Auditoria', description: 'Histórico de ações e segurança', icon: History, color: 'text-rose-600', bg: 'bg-rose-50' },
    { id: 'notifications', title: 'Notificações', description: 'Alertas de aprovação e relatórios', icon: Bell, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'integrations', title: 'Integrações', description: 'Conectar com n8n e bancos', icon: Globe, color: 'text-violet-600', bg: 'bg-violet-50' },
  ];

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      // Logic to save general settings if needed
      toast.success('Configurações salvas!');
    } catch (error: any) {
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInitSheets = async () => {
    setIsSaving(true);
    try {
      const res = await apiService.initSheets();
      if (res.success) {
        toast.success('Google Sheets configurado com sucesso!', {
          description: 'As abas Transactions, Categories e Departments foram criadas.'
        });
      }
    } catch (error: any) {
      toast.error('Erro ao configurar: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const renderHeader = (title: string) => (
    <div className="mb-10 flex items-center gap-4">
      <button 
        onClick={() => setActiveView('menu')}
        className="rounded-2xl bg-white p-3 text-zinc-400 shadow-sm border border-zinc-100 hover:text-zinc-900 transition-all"
      >
        <ArrowLeft size={20} />
      </button>
      <div>
        <h2 className="font-display text-3xl font-bold text-zinc-900">{title}</h2>
        <p className="text-sm text-zinc-500">Configurações avançadas do sistema.</p>
      </div>
    </div>
  );

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto pb-12"
    >
      <AnimatePresence mode="wait">
        {activeView === 'menu' ? (
          <motion.div 
            key="menu"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-8"
          >
            <div>
              <h2 className="font-display text-4xl font-bold tracking-tight text-zinc-900">Configurações</h2>
              <p className="mt-1 text-zinc-500">Personalize sua experiência e gerencie sua organização.</p>
            </div>

            <div className="grid gap-4">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveView(section.id as SettingsView)}
                  className="premium-card group flex items-center justify-between p-6 text-left"
                >
                  <div className="flex items-center gap-5">
                    <div className={cn("rounded-2xl p-4 transition-transform group-hover:scale-110", section.bg)}>
                      <section.icon className={cn("h-7 w-7", section.color)} />
                    </div>
                    <div>
                      <h3 className="font-bold text-zinc-900">{section.title}</h3>
                      <p className="text-sm text-zinc-500">{section.description}</p>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-zinc-300 group-hover:text-zinc-900 transition-colors" />
                </button>
              ))}
            </div>

            <div className="rounded-3xl bg-zinc-900 p-8 text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-500 p-1.5">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <h4 className="text-sm font-bold">Plano Premium Ativo</h4>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-zinc-400 max-w-md">
                  Sua organização está utilizando todos os recursos avançados, incluindo IA, relatórios em PDF e logs de auditoria.
                </p>
                <button 
                  onClick={() => toast.info('Funcionalidade em desenvolvimento', { description: 'O gerenciamento de assinaturas estará disponível em breve.' })}
                  className="mt-6 rounded-xl bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-white/20 transition-all"
                >
                  Gerenciar Assinatura
                </button>
              </div>
              <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />
            </div>
          </motion.div>
        ) : activeView === 'depts' ? (
          <motion.div 
            key="depts"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderHeader('Departamentos')}
            <DepartmentManager />
          </motion.div>
        ) : activeView === 'cats' ? (
          <motion.div 
            key="cats"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderHeader('Categorias')}
            <CategoryManager />
          </motion.div>
        ) : activeView === 'audit' ? (
          <motion.div 
            key="audit"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {renderHeader('Logs de Auditoria')}
            <AuditLogs />
          </motion.div>
        ) : (
          <motion.div 
            key="other"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="premium-card p-12 text-center"
          >
            {renderHeader(activeView === 'notifications' ? 'Notificações' : 'Integrações')}
            {activeView === 'integrations' ? (
              <div className="py-12 space-y-8">
                <div className="flex flex-col items-center">
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
                    <Globe className="h-10 w-10 text-emerald-600" />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900">Integrações</h3>
                  <p className="mt-2 text-zinc-500">Conecte seu sistema com ferramentas externas.</p>
                </div>

                <div className="rounded-2xl border border-zinc-100 p-6 bg-zinc-50/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-white shadow-sm border border-zinc-100 flex items-center justify-center">
                        <img src="https://upload.wikimedia.org/wikipedia/commons/3/30/Google_Sheets_logo_%282014-2020%29.svg" alt="Google Sheets" className="h-6 w-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-zinc-900">Google Sheets</h4>
                        <p className="text-xs text-zinc-500">Use uma planilha como banco de dados principal.</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleInitSheets}
                      disabled={isSaving}
                      className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Configurar Planilha'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-50">
                  <Bell className="h-10 w-10 text-zinc-300" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900">Em Breve</h3>
                <p className="mt-2 text-zinc-500">Esta funcionalidade está sendo preparada para você.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
