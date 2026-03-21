import { Transaction, Category } from '../types';
import { supabase } from '../lib/supabase';

export const apiService = {
  // Transactions
  async getTransactions(): Promise<Transaction[]> {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, category:categories(*)');
    
    if (error) throw new Error(error.message);
    return data || [];
  },

  async createTransaction(data: Partial<Transaction>): Promise<{ success: boolean; id: string }> {
    const { data: inserted, error } = await supabase
      .from('transactions')
      .insert(data)
      .select('id')
      .single();
      
    if (error) throw new Error(error.message);
    return { success: true, id: inserted.id };
  },

  async updateTransaction(id: string, data: Partial<Transaction>): Promise<{ success: boolean }> {
    const { error } = await supabase
      .from('transactions')
      .update(data)
      .eq('id', id);
      
    if (error) throw new Error(error.message);
    return { success: true };
  },

  async deleteTransaction(id: string): Promise<{ success: boolean }> {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);
      
    if (error) throw new Error(error.message);
    return { success: true };
  },

  // Categories
  async getCategories(): Promise<Category[]> {
    const { data, error } = await supabase.from('categories').select('*');
    if (error) throw new Error(error.message);
    return data || [];
  },

  async createCategory(data: Partial<Category>): Promise<{ success: boolean; id: string }> {
    if (!data.id) {
       data.id = 'cat_' + Date.now(); // Supabase id is TEXT in our schema
    }
    const { data: inserted, error } = await supabase
      .from('categories')
      .insert(data)
      .select('id')
      .single();
      
    if (error) throw new Error(error.message);
    return { success: true, id: inserted.id };
  },
  
  async updateCategory(id: string, data: Partial<Category>): Promise<{ success: boolean }> {
    const { error } = await supabase
      .from('categories')
      .update(data)
      .eq('id', id);
      
    if (error) throw new Error(error.message);
    return { success: true };
  },
  
  async deleteCategory(id: string): Promise<{ success: boolean }> {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
      
    if (error) throw new Error(error.message);
    return { success: true };
  },

  async resetCategories(): Promise<{ success: boolean }> {
    return { success: true };
  },

  async initSheets(): Promise<{ success: boolean }> {
    return { success: true };
  },

  // Auth
  async login(credentials: any): Promise<{ success: boolean; user: any }> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });
    
    if (error) throw new Error(error.message);
    
    if (data.user) {
      const { data: profile } = await supabase.from('users').select('*').eq('id', data.user.id).single();
      // Verificando is_active
      if (profile && profile.is_active === false) {
        throw new Error("Sua conta está desativada. Entre em contato com o administrador.");
      }
      return { success: true, user: profile || data.user };
    }
    throw new Error("Erro no login");
  },

  async signup(data: any): Promise<{ success: boolean; user: any }> {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });
    
    if (error) throw new Error(error.message);
    
    if (authData.user) {
      const profile = {
        id: authData.user.id,
        email: data.email,
        full_name: data.full_name,
        role: data.role || 'user',
        is_active: true
      };
      await supabase.from('users').upsert(profile);
      return { success: true, user: profile };
    }
    throw new Error("Erro ao criar conta");
  },

  async getUsers(): Promise<any[]> {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw new Error(error.message);
    return data || [];
  },

  async createUser(data: any): Promise<{ success: boolean; id: string }> {
    throw new Error('Use o formulário de Signup real ou integre o Admin API para criar contas fechadas.');
  },

  async deleteUser(id: string): Promise<{ success: boolean }> {
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true };
  },

  async updateUser(id: string, data: any): Promise<{ success: boolean }> {
    const { error } = await supabase.from('users').update(data).eq('id', id);
    if (error) throw new Error(error.message);
    return { success: true };
  },

  // Settings
  async getSettings(): Promise<any> {
    const { data, error } = await supabase.from('settings').select('*');
    if (error) throw new Error(error.message);
    
    const settings: any = {};
    if (data) {
      data.forEach((item: any) => {
        settings[item.key] = item.value;
      });
    }
    return settings;
  },

  async updateSettings(data: any): Promise<{ success: boolean }> {
    const upserts = Object.keys(data).map(key => ({
      key,
      value: data[key]
    }));
    
    const { error } = await supabase.from('settings').upsert(upserts);
    if (error) throw new Error(error.message);
    
    return { success: true };
  }
};
