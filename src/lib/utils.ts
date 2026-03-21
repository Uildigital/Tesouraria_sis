import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string) {
  const num = typeof value === 'number' ? value : parseAmount(value);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
}

export function parseAmount(value: any): number {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  
  // Convert to string and clean up
  let str = String(value).trim();
  
  // If it's a Brazilian format like 1.234,56
  if (str.includes('.') && str.includes(',')) {
    // Check if the last separator is a comma
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      // Unusual format, but let's try to handle it
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    // Only comma, e.g., 1234,56
    str = str.replace(',', '.');
  }
  
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

export function formatDate(date: string) {
  if (!date) return '-';
  const [year, month, day] = date.split('-');
  if (!year || !month || !day) return date;
  return `${day}/${month}/${year}`;
}
