import 'dotenv/config';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { createClient } from '@supabase/supabase-js';
import { parse, format, isValid } from 'date-fns';

// ---------------------------------------------------------
// 1. SUPABASE SETUP
// ---------------------------------------------------------
const supabaseUrl = process.env.VITE_SUPABASE_URL;
// MUST BE SERVICE ROLE KEY to bypass RLS and create Auth users
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; 

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("ERRO: VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY obrigatórios no .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// ---------------------------------------------------------
// 2. GOOGLE SHEETS SETUP FROM CURRENT SYSTEM
// ---------------------------------------------------------
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const getAuth = () => {
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  if (!rawKey || !email) {
    throw new Error(`Faltam variáveis do Google no .env`);
  }
  const privateKey = rawKey.replace(/\\n/g, '\n').replace(/"/g, '').trim();
  return new JWT({ email, key: privateKey, scopes: SCOPES });
};

const getSheets = () => google.sheets('v4');
const getSpreadsheetId = () => process.env.GOOGLE_SHEET_ID || '';

async function getRows(range: string) {
  const auth = getAuth();
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();
  try {
    const response = await sheets.spreadsheets.values.get({ auth, spreadsheetId, range });
    return response.data.values || [];
  } catch (error: any) {
    return []; 
  }
}

// ---------------------------------------------------------
// 3. TRANSFORMERS
// ---------------------------------------------------------
// Converts "R$ 1.500,25" or "1500,25" to 1500.25
function parseAmount(val: string): number {
  if (!val) return 0;
  let cleaned = val.toString().replace(/[R$\s]/g, '');
  if (cleaned.includes(',') && cleaned.includes('.')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (cleaned.includes(',')) {
    cleaned = cleaned.replace(',', '.');
  }
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

// Converts "DD/MM/YYYY" or valid date string to "YYYY-MM-DD"
function parseDate(val: string): string {
  if (!val) return new Date().toISOString().split('T')[0];
  if (val.includes('/')) {
    const parsed = parse(val.trim(), 'dd/MM/yyyy', new Date());
    if (isValid(parsed)) return format(parsed, 'yyyy-MM-dd');
  }
  // Try JS native parse
  const d = new Date(val);
  if (isValid(d)) return d.toISOString().split('T')[0];
  return new Date().toISOString().split('T')[0]; // fallback
}

// ---------------------------------------------------------
// 4. MIGRATION RUNNER
// ---------------------------------------------------------
async function runMigration() {
  console.log('🚀 Iniciando Migração: Google Sheets -> Supabase...');

  // --- A. SETTINGS ---
  console.log('\n📦 Migrando Settings...');
  const settingsRows = await getRows('Settings!A:B');
  if (settingsRows.length > 1) {
    const settingsData = settingsRows.slice(1).map(r => ({
      key: r[0],
      value: r[1] || ''
    })).filter(s => s.key);
    
    if (settingsData.length > 0) {
      const { error } = await supabase.from('settings').upsert(settingsData);
      if (error) console.error('Erro Settings:', error);
      else console.log(`✓ ${settingsData.length} configs inseridas.`);
    }
  }

  // --- B. USERS (AUTH) & ID MAPPING ---
  console.log('\n👥 Migrando Usuários...');
  const usersRows = await getRows('Users!A:Z');
  // headers: id, email, password, full_name, role, is_active, created_at
  const oldToNewUserId: Record<string, string> = {};

  if (usersRows.length > 1) {
    const headers = usersRows[0];
    for (const row of usersRows.slice(1)) {
      const obj: any = {};
      headers.forEach((h: string, i: number) => { if (h) obj[h.toLowerCase().trim()] = row[i]; });
      
      const oldId = obj['id'];
      const email = obj['email']?.trim();
      const password = obj['password'] || 'SenhaPadrao123!';
      const fullName = obj['full_name'] || '';
      const role = obj['role'] || 'user';
      const isActive = obj['is_active'] !== 'FALSE';

      if (!email || !oldId) continue;

      // Create user in Supabase Auth via Admin API
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName, role }
      });

      if (authError && authError.message !== 'User already registered') {
        console.error(`Erro ao criar Auth User (${email}):`, authError.message);
        continue;
      }

      let newId = authData?.user?.id;
      // Se ele já existe (erro acima omitido), a gente busca o ID dele
      if (!newId) {
        const { data: existingUser } = await supabase.from('users').select('id').eq('email', email).single();
        if (existingUser) newId = existingUser.id;
      }

      if (newId) {
        oldToNewUserId[oldId] = newId;
        // Opsertiando no public.users
        const { error: dbError } = await supabase.from('users').upsert({
          id: newId,
          email,
          full_name: fullName,
          role,
          is_active: isActive
        });
        if (dbError) console.error(`Erro ao inserir public.user (${email}):`, dbError.message);
      }
    }
    console.log(`✓ Usuários migrados e mapeados com sucesso.`);
  }

  // --- C. CATEGORIES ---
  console.log('\n📂 Migrando Categorias...');
  const catRows = await getRows('Categories!A:Z');
  // headers: id, name, type, parent_id, created_at
  if (catRows.length > 1) {
    const headers = catRows[0];
    const catsData = catRows.slice(1).map(row => {
      const obj: any = {};
      headers.forEach((h: string, i: number) => { if (h) obj[h.toLowerCase().trim()] = row[i]; });
      
      return {
        id: obj['id'],
        name: obj['name'],
        type: obj['type'],
        parent_id: obj['parent_id'] || null,
        created_at: isValid(new Date(obj['created_at'])) ? new Date(obj['created_at']).toISOString() : new Date().toISOString()
      };
    }).filter(c => c.id && c.name);

    if (catsData.length > 0) {
      // Inserir parent=null primeiro para evitar violação de Foreign Key no self-reference
      const parents = catsData.filter(c => !c.parent_id);
      const children = catsData.filter(c => c.parent_id);
      
      const { error: pErr } = await supabase.from('categories').upsert(parents);
      if (pErr) console.error('Erro Categories Parent:', pErr);
      
      const { error: cErr } = await supabase.from('categories').upsert(children);
      if (cErr) console.error('Erro Categories Child:', cErr);
      
      if (!pErr && !cErr) console.log(`✓ ${catsData.length} categorias inseridas.`);
    }
  }

  // --- D. TRANSACTIONS ---
  console.log('\\n💸 Migrando Transações...');
  const transRows = await getRows('Transactions!A:Z');
  if (transRows.length > 1) {
    const headers = transRows[0];
    const transData = transRows.slice(1).map(row => {
      const obj: any = {};
      headers.forEach((h: string, i: number) => { if (h) obj[h.toLowerCase().trim()] = row[i]; });

      let mappedUserId = null;
      if (obj['user_id']) {
        mappedUserId = oldToNewUserId[obj['user_id']] || null;
      }

      let status = obj['status'] || 'completed';
      if (!['pending', 'completed', 'cancelled'].includes(status)) {
        status = 'completed'; // Força um padrão válido caso ainda venha lixo
      }

      return {
        id: obj['id'],
        date: parseDate(obj['date']),
        time: obj['time'] || '00:00',
        description: obj['description'],
        amount: parseAmount(obj['amount']),
        type: obj['type'],
        category_id: obj['category_id'] || null,
        user_id: mappedUserId,
        observation: obj['observation'] || '',
        attachment_url: obj['attachment_url'] || '',
        status: status,
        account: obj['account'] || 'Corrente',
        created_at: isValid(new Date(obj['created_at'])) ? new Date(obj['created_at']).toISOString() : new Date().toISOString()
      };
    }).filter(t => t.id && t.description);

    if (transData.length > 0) {
      // Upsert em lotes de 1000 se for muito grande
      const { error } = await supabase.from('transactions').upsert(transData, { onConflict: 'id' });
      if (error) console.error('Erro Transactions:', error.message, error.details);
      else console.log(`✓ ${transData.length} transações inseridas com IDs preservados.`);
    }
  }

  console.log('\n✅ Migração Finalizada!');
}

runMigration().catch(console.error);
