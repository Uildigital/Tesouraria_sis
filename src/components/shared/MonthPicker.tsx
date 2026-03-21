import React from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Props {
  selectedMonth: number; // 0-11
  selectedYear: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  className?: string;
}

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

export const MonthPicker: React.FC<Props> = ({ selectedMonth, selectedYear, onMonthChange, onYearChange, className }) => {
  return (
    <div className={cn("flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 shadow-sm hover:border-zinc-300 transition-colors", className)}>
      <Calendar className="h-4 w-4 text-emerald-600" />
      <select 
        value={selectedMonth} 
        onChange={(e) => onMonthChange(parseInt(e.target.value))}
        className="bg-transparent text-sm font-medium text-zinc-600 focus:outline-none cursor-pointer"
      >
        {MONTHS.map((m, i) => (
          <option key={m} value={i}>{m}</option>
        ))}
      </select>
      <select 
        value={selectedYear} 
        onChange={(e) => onYearChange(parseInt(e.target.value))}
        className="bg-transparent text-sm font-medium text-zinc-600 focus:outline-none cursor-pointer border-l border-zinc-100 pl-2"
      >
        {YEARS.map(y => (
          <option key={y} value={y}>{y}</option>
        ))}
      </select>
    </div>
  );
};
