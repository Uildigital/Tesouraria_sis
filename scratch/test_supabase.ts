import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

console.log('Testing connection to:', url);

const supabase = createClient(url, key);

async function test() {
  console.log('\n--- Checking Tables ---');
  
  const tables = ['Usuarios', 'transacoes', 'categorias', 'configuracoes'];
  
  for (const table of tables) {
    const { data, error, count } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`❌ ${table}: Error - ${error.message}`);
    } else {
      console.log(`✅ ${table}: OK (${count} records)`);
    }
  }

  console.log('\n--- Checking Column Names for Usuarios ---');
  const { data: userSample, error: userError } = await supabase
    .from('Usuarios')
    .select('*')
    .limit(1);
  
  if (userSample && userSample.length > 0) {
    console.log('Columns in Usuarios:', Object.keys(userSample[0]));
  }
}

test();
