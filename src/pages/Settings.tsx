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
  Globe,
  Church
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { CategoryManager } from '../components/CategoryManager';
import { AuditLogs } from '../components/AuditLogs';
import { apiService } from '../services/apiService';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

type SettingsView = 'menu' | 'org' | 'cats' | 'audit' | 'integrations';

export const Settings: React.FC = () => {
  const { canEdit } = useAuth();
  const [activeView, setActiveView] = useState<SettingsView>('menu');
  const [isSaving, setIsSaving] = useState(false);
  
  const [churchName, setChurchName] = useState('Minha Igreja');

  if (!canEdit) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <Shield className="h-16 w-16 text-zinc-200 mb-4" />
        <h2 className="text-2xl font-bold text-zinc-900 font-display">Acesso Restrito</h2>
        <p className="text-zinc-500 max-w-md mt-2">Apenas administradores podem acessar as configurações do sistema.</p>
      </div>
    );
  }

  const sections = [
    { id: 'cats', title: 'Categorias', description: 'Plano de contas e hierarquia de gastos', icon: Tags, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'audit', title: 'Logs de Auditoria', description: 'Histórico de ações e segurança', icon: History, color: 'text-rose-600', bg: 'bg-rose-50' },
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

  const handleTestConnection = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      if (data.status === 'ok' && data.sheets?.connected) {
        toast.success('Conexão com Google Sheets estabelecida!', {
          description: `Planilha: ${data.sheets.title}`
        });
      } else {
        toast.error('Falha na conexão', {
          description: data.sheets?.error || 'Verifique as variáveis de ambiente.'
        });
      }
    } catch (error: any) {
      toast.error('Erro ao testar conexão: ' + error.message);
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
          description: 'As abas Transactions e Categories foram criadas.'
        });
      }
    } catch (error: any) {
      toast.error('Erro ao configurar: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetCategories = async () => {
    if (!window.confirm('Isso irá apagar todas as categorias atuais e criar a nova estrutura hierárquica. Deseja continuar?')) return;
    
    setIsSaving(true);
    try {
      const res = await apiService.resetCategories();
      if (res.success) {
        toast.success('Estrutura de categorias atualizada!', {
          description: 'A nova hierarquia foi aplicada com sucesso.'
        });
      }
    } catch (error: any) {
      toast.error('Erro ao atualizar categorias: ' + error.message);
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
                    <Church className="h-4 w-4 text-white" />
                  </div>
                  <h4 className="text-sm font-bold">Plano Premium Ativo</h4>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-zinc-400 max-w-md">
                  Sua organização está utilizando todos os recursos avançados, incluindo relatórios em PDF e logs de auditoria.
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
            {renderHeader('Integrações')}
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
                    <div className="flex gap-2">
                      <button 
                        onClick={handleTestConnection}
                        disabled={isSaving}
                        className="rounded-xl bg-zinc-100 px-4 py-2 text-xs font-bold text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Testar Conexão'}
                      </button>
                      <button 
                        onClick={handleInitSheets}
                        disabled={isSaving}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Configurar Planilha'}
                      </button>
                      <button 
                        onClick={handleResetCategories}
                        disabled={isSaving}
                        className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Resetar Categorias (Hierarquia)'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
