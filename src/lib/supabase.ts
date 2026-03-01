import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://rzrgffegyvcaseyreanh.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6cmdmZmVneXZjYXNleXJlYW5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMTU0MzQsImV4cCI6MjA4Nzc5MTQzNH0.pSoU1WmjDfGtXWd_2vnxgQ2rMqwtfyznfR3dCsuxl9w';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn(
    'AVISO: Variáveis de ambiente do Supabase não encontradas no ambiente.\n' +
    'Usando valores padrão do projeto. Para produção, configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
