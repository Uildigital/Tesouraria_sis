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
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  organization_id: string;
}

export interface Department {
  id: string;
  name: string;
  organization_id: string;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  status: TransactionStatus;
  category_id: string;
  department_id?: string;
  organization_id: string;
  attachment_url?: string;
  created_at: string;
  // Joined data
  category?: Category;
  department?: Department;
}
