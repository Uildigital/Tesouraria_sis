export type TransactionType = 'income' | 'expense';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
}

export interface Profile {
  id: string;
  organization_id: string;
  role: 'admin' | 'treasurer' | 'auditor' | 'viewer';
  full_name: string;
  email?: string;
  is_active: boolean;
}

export interface MonthlyClosure {
  id: string;
  year: number;
  month: number;
  account: 'Corrente' | 'Poupança';
  bank_balance: number;
  statement_url?: string;
  status: 'pending' | 'conferido';
  reviewed_by?: string;
  notes?: string;
  organization_id: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  organization_id: string;
  parent_id?: string | null;
  is_default?: boolean;
}

export interface Transaction {
  id: string;
  date: string;
  time: string;
  description: string;
  amount: number;
  type: TransactionType;
  category_id: string;
  organization_id: string;
  observation?: string;
  attachment_url?: string;
  created_at: string;
  account: 'Corrente' | 'Poupança';
  // Joined data
  category?: Category;
}
