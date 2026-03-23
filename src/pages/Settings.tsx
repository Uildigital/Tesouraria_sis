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
  Church,
  Image as ImageIcon,
  Upload,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { CategoryManager } from '../components/CategoryManager';
import { AuditLogs } from '../components/AuditLogs';
import { apiService } from '../services/apiService';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

type SettingsView = 'menu' | 'org' | 'cats' | 'audit' | 'integrations';

export const Settings: React.FC = () => {
  const { canEdit } = useAuth();
  const { settings, updateSettings: saveGlobalSettings } = useSettings();
  const [activeView, setActiveView] = useState<SettingsView>('menu');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [churchName, setChurchName] = useState(settings.app_name);
  const [logoUrl, setLogoUrl] = useState(settings.app_logo);

  useEffect(() => {
    setChurchName(settings.app_name);
    setLogoUrl(settings.app_logo);
  }, [settings]);

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
    { id: 'org', title: 'Organização', description: 'Nome da igreja e identidade visual', icon: Building2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { id: 'cats', title: 'Categorias', description: 'Plano de contas e hierarquia de gastos', icon: Tags, color: 'text-amber-600', bg: 'bg-amber-50' },
    { id: 'audit', title: 'Logs de Auditoria', description: 'Histórico de ações e segurança', icon: History, color: 'text-rose-600', bg: 'bg-rose-50' },
  ];

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { url } = await apiService.uploadFile(file);
      setLogoUrl(url);
      toast.success('Logo carregada com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao subir imagem: ' + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await saveGlobalSettings({
        app_name: churchName,
        app_logo: logoUrl
      });
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

  const handleClearLogs = async () => {
    if (!window.confirm('Deseja apagar todos os logs de auditoria? Esta ação é irreversível.')) return;
    setIsSaving(true);
    try {
      await apiService.clearAuditLogs();
      toast.success('Logs de auditoria removidos!');
    } catch (error: any) {
      toast.error('Erro ao limpar logs: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearTransactions = async () => {
    if (!window.confirm('PERIGO: Isso apagará TODOS os lançamentos financeiros do sistema. Deseja continuar?')) return;
    setIsSaving(true);
    try {
      await apiService.clearTransactions();
      toast.success('Todos os lançamentos foram removidos!');
    } catch (error: any) {
      toast.error('Erro ao limpar lançamentos: ' + error.message);
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
        ) : activeView === 'org' ? (
          <motion.div 
            key="org"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-8"
          >
            {renderHeader('Organização')}
            
            <div className="premium-card p-8 space-y-8">
              <div className="grid gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-700">Nome da Igreja / Organização</label>
                  <div className="relative">
                    <Church className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input 
                      type="text"
                      value={churchName}
                      onChange={(e) => setChurchName(e.target.value)}
                      placeholder="Ex: Igreja Batista Central"
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 pl-12 pr-4 text-zinc-900 outline-none transition-all focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-zinc-700">Logo da Igreja</label>
                  {logoUrl ? (
                    <div className="group relative flex h-40 w-full items-center justify-center rounded-2xl border border-zinc-200 bg-zinc-50 p-4 transition-all hover:bg-zinc-100">
                      <img 
                        src={logoUrl} 
                        alt="Logo da Igreja" 
                        className="h-full w-full object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://via.placeholder.com/150?text=Logo+Invalida';
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100 rounded-2xl">
                        <label className="cursor-pointer rounded-xl bg-white p-3 text-zinc-900 shadow-xl transition-transform hover:scale-110">
                          <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={isUploading} />
                          {isUploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <RefreshCw className="h-6 w-6" />}
                        </label>
                      </div>
                    </div>
                  ) : (
                    <label className={cn(
                      "flex h-40 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-zinc-50 p-8 transition-all hover:bg-zinc-100",
                      isUploading && "opacity-50 cursor-not-allowed"
                    )}>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleLogoUpload} 
                        disabled={isUploading} 
                      />
                      <div className="rounded-2xl bg-white p-4 shadow-sm border border-zinc-100 mb-4">
                        {isUploading ? <Loader2 className="h-8 w-8 animate-spin text-emerald-600" /> : <Upload className="h-8 w-8 text-zinc-400" />}
                      </div>
                      <p className="text-sm font-bold text-zinc-600">Clique para enviar a logo</p>
                      <p className="text-xs text-zinc-400">PNG, JPG ou SVG (Máx. 2MB)</p>
                    </label>
                  )}
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Identidade Visual</p>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3 font-bold text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 hover:shadow-emerald-600/40 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save size={20} />}
                  Salvar Alterações
                </button>
              </div>
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
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
};
