export type TransactionStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'conciliated' | 'pending';
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
  role: 'admin' | 'treasurer' | 'viewer';
  full_name: string;
  email?: string;
  is_active: boolean;
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
  description: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  category_id: string;
  organization_id: string;
  attachment_url?: string;
  created_at: string;
  // Joined data
  category?: Category;
}
