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
import { supabase } from '../lib/supabase';
import { CategoryManager } from '../components/CategoryManager';
import { DepartmentManager } from '../components/DepartmentManager';
import { AuditLogs } from '../components/AuditLogs';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

type SettingsView = 'menu' | 'org' | 'depts' | 'cats' | 'notifications' | 'audit' | 'integrations';

export const Settings: React.FC = () => {
  const { organization } = useAuth();
  const [activeView, setActiveView] = useState<SettingsView>('menu');
  const [isSaving, setIsSaving] = useState(false);
  
  const [orgName, setOrgName] = useState(organization?.name || '');
  const [approvalLimit, setApprovalLimit] = useState(500);

  useEffect(() => {
    if (organization) {
      setOrgName(organization.name);
    }
  }, [organization]);

  const sections = [
    { id: 'org', title: 'Perfil da Igreja', description: 'Nome, logo e dados da organização', icon: Building2, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { id: 'depts', title: 'Departamentos', description: 'Gerenciar centros de custo e ministérios', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'cats', title: 'Categorias', description: 'Plano de contas e hierarquia de gastos', icon: Tags, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'audit', title: 'Logs de Auditoria', description: 'Histórico de ações e segurança', icon: History, color: 'text-rose-600', bg: 'bg-rose-50' },
    { id: 'notifications', title: 'Notificações', description: 'Alertas de aprovação e relatórios', icon: Bell, color: 'text-blue-600', bg: 'bg-blue-50' },
    { id: 'integrations', title: 'Integrações', description: 'Conectar com n8n e bancos', icon: Globe, color: 'text-violet-600', bg: 'bg-violet-50' },
  ];

  const handleSaveOrg = async () => {
    if (!organization) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ name: orgName })
        .eq('id', organization.id);
      
      if (error) throw error;
      alert('Configurações salvas com sucesso!');
      window.location.reload();
    } catch (error: any) {
      alert('Erro ao salvar: ' + error.message);
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
                <button className="mt-6 rounded-xl bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-widest text-white hover:bg-white/20 transition-all">
                  Gerenciar Assinatura
                </button>
              </div>
              <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />
            </div>
          </motion.div>
        ) : activeView === 'org' ? (
          <motion.div 
            key="org"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            {renderHeader('Perfil da Igreja')}
            <div className="premium-card p-8 space-y-8">
              <div className="flex items-center gap-6">
                <div className="h-24 w-24 rounded-3xl bg-zinc-50 flex items-center justify-center border border-zinc-100 shadow-inner">
                  {organization?.logo_url ? (
                    <img src={organization.logo_url} alt="Logo" className="h-full w-full object-cover rounded-3xl" />
                  ) : (
                    <Church className="h-10 w-10 text-zinc-300" />
                  )}
                </div>
                <div>
                  <h4 className="font-bold text-zinc-900">Logo da Organização</h4>
                  <p className="text-xs text-zinc-500 mb-3">Recomendado: 512x512px (PNG ou JPG)</p>
                  <button className="text-xs font-bold uppercase tracking-widest text-emerald-600 hover:text-emerald-700">Alterar Imagem</button>
                </div>
              </div>

              <div className="grid gap-8 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Nome da Igreja</label>
                  <input 
                    type="text" 
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Slug (URL)</label>
                  <input 
                    type="text" 
                    disabled
                    value={organization?.slug}
                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-100 px-4 py-3 text-sm text-zinc-500 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="space-y-4 border-t border-zinc-100 pt-8">
                <h4 className="text-sm font-bold text-zinc-900 flex items-center">
                  <Shield className="mr-2 h-4 w-4 text-emerald-600" />
                  Configurações de Aprovação
                </h4>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-zinc-400">Valor Limite para Aprovação</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">R$</span>
                      <input 
                        type="number" 
                        value={approvalLimit}
                        onChange={(e) => setApprovalLimit(Number(e.target.value))}
                        className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 pl-10 pr-4 py-3 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-400 italic">Lançamentos acima deste valor exigirão aprovação do Pastor.</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button 
                  onClick={handleSaveOrg}
                  disabled={isSaving}
                  className="flex items-center rounded-2xl bg-zinc-900 px-8 py-3 text-sm font-bold text-white hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                  Salvar Alterações
                </button>
              </div>
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
            <div className="py-12">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-50">
                {activeView === 'notifications' ? <Bell className="h-10 w-10 text-zinc-300" /> : <Globe className="h-10 w-10 text-zinc-300" />}
              </div>
              <h3 className="text-xl font-bold text-zinc-900">Em Breve</h3>
              <p className="mt-2 text-zinc-500">Esta funcionalidade está sendo preparada para você.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
