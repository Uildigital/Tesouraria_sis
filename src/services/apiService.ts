import { Transaction, Category, Department } from '../types';

const API_BASE = '/api';

export const apiService = {
  // Transactions
  async getTransactions(): Promise<Transaction[]> {
    const res = await fetch(`${API_BASE}/transactions`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Falha ao buscar transações' }));
      throw new Error(errorData.details || errorData.error || 'Erro desconhecido ao buscar transações');
    }
    return res.json();
  },

  async createTransaction(data: Partial<Transaction>): Promise<{ success: boolean; id: string }> {
    const res = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Falha ao criar transação' }));
      throw new Error(errorData.details || errorData.error || 'Erro desconhecido ao criar transação');
    }
    return res.json();
  },

  // Categories
  async getCategories(): Promise<Category[]> {
    const res = await fetch(`${API_BASE}/categories`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Falha ao buscar categorias' }));
      throw new Error(errorData.details || errorData.error || 'Erro desconhecido ao buscar categorias');
    }
    return res.json();
  },

  async createCategory(data: Partial<Category>): Promise<{ success: boolean; id: string }> {
    const res = await fetch(`${API_BASE}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create category');
    return res.json();
  },

  // Departments
  async getDepartments(): Promise<Department[]> {
    const res = await fetch(`${API_BASE}/departments`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Falha ao buscar departamentos' }));
      throw new Error(errorData.details || errorData.error || 'Erro desconhecido ao buscar departamentos');
    }
    return res.json();
  },

  async createDepartment(data: Partial<Department>): Promise<{ success: boolean; id: string }> {
    const res = await fetch(`${API_BASE}/departments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Falha ao criar departamento' }));
      throw new Error(errorData.details || errorData.error || 'Erro desconhecido ao criar departamento');
    }
    return res.json();
  },

  async initSheets(): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/init`);
    if (!res.ok) throw new Error('Failed to initialize sheets');
    return res.json();
  },

  // Auth
  async login(credentials: any): Promise<{ success: boolean; user: any }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Erro desconhecido no servidor' }));
      throw new Error(errorData.error || errorData.details || 'Credenciais inválidas');
    }
    return res.json();
  },

  async signup(data: any): Promise<{ success: boolean; user: any }> {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Erro ao criar conta');
    }
    return res.json();
  },

  async getUsers(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/users`);
    if (!res.ok) throw new Error('Failed to fetch users');
    return res.json();
  },

  async createUser(data: any): Promise<{ success: boolean; id: string }> {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Erro ao criar usuário');
    }
    return res.json();
  }
};
