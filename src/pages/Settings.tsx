import React from 'react';
import { Church, Users, Shield, Bell, Globe } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Settings: React.FC = () => {
  const { organization, profile } = useAuth();

  const sections = [
    { name: 'Dados da Igreja', icon: Church, description: 'Nome, CNPJ, Endereço e Logo' },
    { name: 'Departamentos', icon: Users, description: 'Gerenciar centros de custo' },
    { name: 'Categorias', icon: Shield, description: 'Plano de contas (Receitas/Despesas)' },
    { name: 'Notificações', icon: Bell, description: 'Alertas de aprovação e vencimentos' },
    { name: 'Integrações', icon: Globe, description: 'Conectar com n8n e bancos' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Configurações</h2>
        <p className="text-zinc-500">Gerencie as preferências da sua organização.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="mb-6 text-lg font-semibold text-zinc-900">Perfil da Organização</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-20 w-20 rounded-2xl bg-zinc-100 flex items-center justify-center border border-zinc-200">
                  {organization?.logo_url ? (
                    <img src={organization.logo_url} alt="Logo" className="h-full w-full object-cover rounded-2xl" />
                  ) : (
                    <Church className="h-10 w-10 text-zinc-400" />
                  )}
                </div>
                <button className="text-sm font-semibold text-emerald-600 hover:text-emerald-700">Alterar Logo</button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500 uppercase">Nome da Igreja</label>
                  <input type="text" defaultValue={organization?.name} className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-zinc-500 uppercase">Slug (URL)</label>
                  <input type="text" defaultValue={organization?.slug} disabled className="w-full rounded-xl border border-zinc-200 bg-zinc-100 px-3 py-2 text-sm text-zinc-500" />
                </div>
              </div>
              <button className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Salvar Alterações</button>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-zinc-900">Configurações de Aprovação</h3>
            <p className="mb-6 text-sm text-zinc-500">Defina o limite para aprovação obrigatória de lançamentos.</p>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-zinc-500 uppercase">Valor Limite (R$)</label>
                <input type="number" defaultValue={500} className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm focus:border-emerald-500 focus:bg-white focus:outline-none" />
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-xs font-medium text-zinc-500 uppercase">Status</label>
                <div className="flex items-center h-9">
                  <span className="text-sm text-zinc-600">Ativado</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 content-start">
          {sections.map((section) => (
            <button key={section.name} className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition-all hover:border-emerald-500 hover:shadow-md group">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-zinc-50 p-3 group-hover:bg-emerald-50 transition-colors">
                  <section.icon className="h-6 w-6 text-zinc-600 group-hover:text-emerald-600" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900">{section.name}</h4>
                  <p className="text-xs text-zinc-500">{section.description}</p>
                </div>
              </div>
              <div className="h-8 w-8 rounded-full bg-zinc-50 flex items-center justify-center text-zinc-400 group-hover:bg-emerald-50 group-hover:text-emerald-600">
                →
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
