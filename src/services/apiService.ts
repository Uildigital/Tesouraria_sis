import { Transaction, Category } from '../types';

const API_BASE = '/api';

export const apiService = {
  // Transactions
  async getTransactions(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/transactions`);
    if (!res.ok) throw new Error('Erro ao buscar transações');
    return res.json();
  },

  async createTransaction(data: any): Promise<{ success: boolean; id: string }> {
    const res = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Erro ao criar transação');
    return res.json();
  },

  async updateTransaction(id: string, data: any): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/transactions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Erro ao atualizar transação');
    return res.json();
  },

  async deleteTransaction(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/transactions/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Erro ao excluir transação');
    return res.json();
  },

  // Categories
  async getCategories(): Promise<Category[]> {
    const res = await fetch(`${API_BASE}/categories`);
    if (!res.ok) throw new Error('Erro ao buscar categorias');
    return res.json();
  },

  async createCategory(data: any): Promise<{ success: boolean; id: string }> {
    const res = await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Erro ao criar categoria');
    return res.json();
  },

  async updateCategory(id: string, data: any): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Erro ao atualizar categoria');
    return res.json();
  },

  async deleteCategory(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/categories/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Erro ao excluir categoria');
    return res.json();
  },

  async resetCategories(): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/reset-categories`, { method: 'POST' });
    if (!res.ok) throw new Error('Erro ao resetar categorias');
    return res.json();
  },

  async initSheets(): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/init-sheets`, { method: 'POST' });
    if (!res.ok) throw new Error('Erro ao inicializar');
    return res.json();
  },

  // Auth
  async login(credentials: any): Promise<{ success: boolean; user: any }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('Falha ao parsear JSON. Resposta bruta:', text);
      throw new Error(`Resposta inválida do servidor: ${text.substring(0, 100)}...`);
    }

    if (!res.ok) throw new Error(data.error || 'Erro no login');
    return data;
  },

  async signup(data: any): Promise<{ success: boolean; user: any }> {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Erro ao criar conta');
    return result;
  },

  async getUsers(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/users`);
    if (!res.ok) throw new Error('Erro ao buscar usuários');
    return res.json();
  },

  async createUser(data: any): Promise<{ success: boolean; id: string }> {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Erro ao criar usuário');
    return res.json();
  },

  async deleteUser(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Erro ao excluir usuário');
    return res.json();
  },

  async updateUser(id: string, data: any): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Erro ao atualizar usuário');
    return res.json();
  },

  // Audit Logs
  async getAuditLogs(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/audit-logs`);
    if (!res.ok) throw new Error('Erro ao buscar logs de auditoria');
    return res.json();
  },

  // Settings
  async getSettings(): Promise<any> {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Erro ao buscar configurações');
    return res.json();
  },

  async updateSettings(data: any): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Erro ao atualizar configurações');
    return res.json();
  }
};
