import express from "express";
import { v4 as uuidv4 } from 'uuid';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

const app = express();
app.use(express.json());

// --- GOOGLE SHEETS LOGIC INTEGRATED ---
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const getAuth = () => {
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  
  if (!rawKey || !email) {
    throw new Error(`Faltam variáveis de ambiente: ${!rawKey ? 'GOOGLE_PRIVATE_KEY ' : ''}${!email ? 'GOOGLE_SERVICE_ACCOUNT_EMAIL' : ''}`);
  }

  // Robust key formatting
  const privateKey = rawKey
    .replace(/\\n/g, '\n')
    .replace(/"/g, '')
    .trim();

  return new JWT({
    email: email,
    key: privateKey,
    scopes: SCOPES,
  });
};

const getSheets = () => google.sheets('v4');

const getSpreadsheetId = () => {
  const id = process.env.GOOGLE_SHEET_ID;
  if (!id) throw new Error('GOOGLE_SHEET_ID não configurado');
  return id;
};

async function getRows(range: string) {
  const auth = getAuth();
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();
  try {
    const response = await sheets.spreadsheets.values.get({
      auth,
      spreadsheetId,
      range,
    });
    return response.data.values || [];
  } catch (error: any) {
    // Se a aba não existir, não trava o app, apenas retorna vazio
    if (error.message.includes('Unable to parse range') || error.message.includes('not found')) {
      console.warn(`Aba não encontrada: ${range}`);
      return []; 
    }
    throw error;
  }
}

async function appendRow(range: string, values: any[]) {
  const auth = getAuth();
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();
  try {
    await sheets.spreadsheets.values.append({
      auth,
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [values],
      },
    });
  } catch (error: any) {
    // If sheet doesn't exist, try to initialize first
    if (error.message.includes('not found')) {
      throw new Error(`A aba ou planilha não foi encontrada. Vá em Configurações e clique em 'Configurar Planilha'. Erro original: ${error.message}`);
    }
    throw error;
  }
}

async function deleteRow(sheetName: string, id: string) {
  const auth = getAuth();
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();
  
  const rows = await getRows(`${sheetName}!A:A`);
  const rowIndex = rows.findIndex(row => row[0] === id);
  
  if (rowIndex === -1) return false;

  const sheetResponse = await sheets.spreadsheets.get({ auth, spreadsheetId });
  const sheet = sheetResponse.data.sheets?.find(s => s.properties?.title === sheetName);
  const sheetId = sheet?.properties?.sheetId;

  if (sheetId === undefined) return false;

  await sheets.spreadsheets.batchUpdate({
    auth,
    spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        },
      ],
    },
  });
  return true;
}

async function updateRow(sheetName: string, id: string, values: any[]) {
  const auth = getAuth();
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();
  
  const rows = await getRows(`${sheetName}!A:A`);
  const rowIndex = rows.findIndex(row => row[0] === id);
  
  if (rowIndex === -1) return false;

  await sheets.spreadsheets.values.update({
    auth,
    spreadsheetId,
    range: `${sheetName}!A${rowIndex + 1}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  });
  return true;
}

async function initializeSheets() {
  const auth = getAuth();
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();
  const sheetsToCreate = ['Transactions', 'Categories', 'Users', 'Settings'];
  
  const spreadsheet = await sheets.spreadsheets.get({
    auth,
    spreadsheetId,
  });

  const existingSheets = spreadsheet.data.sheets?.map(s => s.properties?.title) || [];

  for (const title of sheetsToCreate) {
    if (!existingSheets.includes(title)) {
      await sheets.spreadsheets.batchUpdate({
        auth,
        spreadsheetId,
        requestBody: {
          requests: [{ addSheet: { properties: { title } } }],
        },
      });
      
      let headers: string[] = [];
      if (title === 'Transactions') headers = ['id', 'date', 'time', 'description', 'amount', 'type', 'category_id', 'user_id', 'observation', 'attachment_url', 'created_at'];
      if (title === 'Categories') headers = ['id', 'name', 'type', 'parent_id', 'created_at'];
      if (title === 'Users') headers = ['id', 'email', 'password', 'full_name', 'role', 'is_active', 'created_at'];
      if (title === 'Settings') headers = ['key', 'value'];

      await sheets.spreadsheets.values.update({
        auth,
        spreadsheetId,
        range: `${title}!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [headers] },
      });

      // Add default settings
      if (title === 'Settings') {
        const defaultSettings = [
          ['app_name', 'ChurchFinance'],
          ['app_logo', ''],
        ];
        await sheets.spreadsheets.values.append({
          auth,
          spreadsheetId,
          range: 'Settings!A:B',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: defaultSettings },
        });
      }

      // Add default categories if it's the Categories sheet
      if (title === 'Categories') {
        const defaultCategories = [
          // Receitas
          { id: 'inc_1', name: '1. ARRECADAÇÃO DIRETA', type: 'income', parent_id: '' },
          { id: 'inc_1_1', name: '1.1. Ofertas', type: 'income', parent_id: 'inc_1' },
          { id: 'inc_1_1_1', name: '1.1.1. Gasofilácio (Dinheiro/Espécie)', type: 'income', parent_id: 'inc_1_1' },
          { id: 'inc_1_1_2', name: '1.1.2. PIX / Transferência', type: 'income', parent_id: 'inc_1_1' },
          { id: 'inc_1_2', name: '1.2. Dízimos', type: 'income', parent_id: 'inc_1' },
          { id: 'inc_1_2_1', name: '1.2.1. PIX / Transferência', type: 'income', parent_id: 'inc_1_2' },
          { id: 'inc_1_2_2', name: '1.2.2. Espécie', type: 'income', parent_id: 'inc_1_2' },
          { id: 'inc_2', name: '2. DOAÇÕES E OUTROS', type: 'income', parent_id: '' },
          { id: 'inc_2_1', name: '2.1. Doação Específica (Ex: Campanhas, Construção)', type: 'income', parent_id: 'inc_2' },
          { id: 'inc_2_2', name: '2.2. Doação Geral', type: 'income', parent_id: 'inc_2' },
          { id: 'inc_3', name: '3. RENDIMENTOS E RESERVAS', type: 'income', parent_id: '' },
          { id: 'inc_3_1', name: '3.1. Rendimentos', type: 'income', parent_id: 'inc_3' },
          { id: 'inc_3_1_1', name: '3.1.1. Rendimento de Aplicação (CDB/Investimentos)', type: 'income', parent_id: 'inc_3_1' },
          { id: 'inc_3_1_2', name: '3.1.2. Rendimento de Poupança', type: 'income', parent_id: 'inc_3_1' },
          { id: 'inc_3_2', name: '3.2. Transferências Internas', type: 'income', parent_id: 'inc_3' },
          { id: 'inc_3_2_1', name: '3.2.1. Entrada de Transferência p/ Poupança', type: 'income', parent_id: 'inc_3_2' },
          // Despesas
          { id: 'exp_4', name: '4. MANUTENÇÃO E INFRAESTRUTURA', type: 'expense', parent_id: '' },
          { id: 'exp_4_1', name: '4.1. Reparos e Obras', type: 'expense', parent_id: 'exp_4' },
          { id: 'exp_4_1_1', name: '4.1.1. Pintura', type: 'expense', parent_id: 'exp_4_1' },
          { id: 'exp_4_1_2', name: '4.1.2. Serralharia / Portas', type: 'expense', parent_id: 'exp_4_1' },
          { id: 'exp_4_1_3', name: '4.1.3. Elétrica / Hidráulica', type: 'expense', parent_id: 'exp_4_1' },
          { id: 'exp_4_2', name: '4.2. Limpeza e Conservação', type: 'expense', parent_id: 'exp_4' },
          { id: 'exp_5', name: '5. PESSOAL E ENCARGOS', type: 'expense', parent_id: '' },
          { id: 'exp_5_1', name: '5.1. Folha de Pagamento', type: 'expense', parent_id: 'exp_5' },
          { id: 'exp_5_1_1', name: '5.1.1. Salários', type: 'expense', parent_id: 'exp_5_1' },
          { id: 'exp_5_1_2', name: '5.1.2. Pró-labore / Prebenda Ministerial', type: 'expense', parent_id: 'exp_5_1' },
          { id: 'exp_5_2', name: '5.2. Encargos Sociais', type: 'expense', parent_id: 'exp_5' },
          { id: 'exp_5_2_1', name: '5.2.1. INSS / FGTS / Impostos', type: 'expense', parent_id: 'exp_5_2' },
          { id: 'exp_6', name: '6. DESPESAS OPERACIONAIS', type: 'expense', parent_id: '' },
          { id: 'exp_6_1', name: '6.1. Taxas Bancárias', type: 'expense', parent_id: 'exp_6' },
          { id: 'exp_6_1_1', name: '6.1.1. Tarifas de Conta', type: 'expense', parent_id: 'exp_6_1' },
          { id: 'exp_6_1_2', name: '6.1.2. Juros / IOF', type: 'expense', parent_id: 'exp_6_1' },
          { id: 'exp_6_2', name: '6.2. Contas de Consumo', type: 'expense', parent_id: 'exp_6' },
          { id: 'exp_6_2_1', name: '6.2.1. Energia / Água / Internet', type: 'expense', parent_id: 'exp_6_2' },
        ];

        const createdAt = new Date().toISOString();
        const values = defaultCategories.map(c => [c.id, c.name, c.type, c.parent_id, createdAt]);
        await sheets.spreadsheets.values.append({
          auth,
          spreadsheetId,
          range: 'Categories!A:E',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values },
        });
      }

      // Add default admin if it's the Users sheet
      if (title === 'Users') {
        const defaultAdmin = [
          uuidv4(),
          'trader.uds@gmail.com',
          'admin123', // In a real app, this should be hashed
          'Administrador Mestre',
          'admin',
          'TRUE',
          new Date().toISOString()
        ];
        await appendRow('Users!A:G', defaultAdmin);
      }
    } else {
      // Ensure headers are up to date even if sheet exists
      let headers: string[] = [];
      if (title === 'Transactions') headers = ['id', 'date', 'time', 'description', 'amount', 'type', 'category_id', 'user_id', 'observation', 'attachment_url', 'created_at'];
      if (title === 'Categories') headers = ['id', 'name', 'type', 'parent_id', 'created_at'];
      if (title === 'Users') headers = ['id', 'email', 'password', 'full_name', 'role', 'is_active', 'created_at'];
      
      if (headers.length > 0) {
        await sheets.spreadsheets.values.update({
          auth,
          spreadsheetId,
          range: `${title}!A1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [headers] },
        });
      }
    }
  }
}

// --- API ROUTES ---

app.get("/api/settings", async (req, res) => {
  try {
    const rows = await getRows('Settings!A:B');
    if (!rows || rows.length <= 1) return res.json({});
    const data: any = {};
    rows.slice(1).forEach((row: any) => {
      if (row[0]) data[row[0]] = row[1] || '';
    });
    res.json(data);
  } catch (error: any) {
    console.error('Error in GET /api/settings:', error);
    res.json({});
  }
});

app.post("/api/settings", async (req, res) => {
  try {
    const newSettings = req.body;
    const auth = getAuth();
    const sheets = getSheets();
    const spreadsheetId = getSpreadsheetId();

    const rows = await getRows('Settings!A:B');
    const settingsMap = new Map();
    
    // Keep the header or use default
    const header = (rows && rows.length > 0) ? rows[0] : ['key', 'value'];
    
    // Load existing settings (skip header)
    if (rows && rows.length > 1) {
      rows.slice(1).forEach((row: any) => {
        if (row[0]) settingsMap.set(row[0], row[1] || '');
      });
    }
    
    // Merge new settings
    for (const [key, value] of Object.entries(newSettings)) {
      settingsMap.set(key, value);
    }
    
    // Prepare all rows starting with header
    const allRows = [header];
    settingsMap.forEach((value, key) => {
      allRows.push([key, value]);
    });
    
    // Overwrite the sheet with all settings
    await sheets.spreadsheets.values.update({
      auth,
      spreadsheetId,
      range: 'Settings!A:B',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: allRows },
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error in POST /api/settings:', error);
    res.status(500).json({ 
      error: 'Falha ao atualizar configurações', 
      details: error.message 
    });
  }
});

app.get(["/api/health", "/health"], async (req, res) => {
  const diagnostics: any = {
    status: "ok",
    env: {
      hasKey: !!process.env.GOOGLE_PRIVATE_KEY,
      hasEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      hasSheetId: !!process.env.GOOGLE_SHEET_ID,
      nodeEnv: process.env.NODE_ENV
    }
  };

  try {
    const auth = getAuth();
    const sheets = getSheets();
    const spreadsheetId = getSpreadsheetId();
    const spreadsheet = await sheets.spreadsheets.get({ auth, spreadsheetId });
    diagnostics.sheets = {
      connected: true,
      title: spreadsheet.data.properties?.title,
      sheets: spreadsheet.data.sheets?.map(s => s.properties?.title)
    };
  } catch (error: any) {
    diagnostics.status = "error";
    diagnostics.sheets = {
      connected: false,
      error: error.message
    };
  }

  res.json(diagnostics);
});

app.post(["/api/init-sheets", "/init-sheets"], async (req, res) => {
  try {
    await initializeSheets();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ 
      error: "Falha na inicialização", 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.get(["/api/init", "/init"], async (req, res) => {
  try {
    await initializeSheets();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ 
      error: "Falha na inicialização", 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.post(["/api/reset-categories", "/reset-categories"], async (req, res) => {
  try {
    const auth = getAuth();
    const sheets = getSheets();
    const spreadsheetId = getSpreadsheetId();
    
    // Clear Categories sheet (except header)
    await sheets.spreadsheets.values.clear({
      auth,
      spreadsheetId,
      range: 'Categories!A2:E1000',
    });

    const defaultCategories = [
      // Receitas
      { id: 'inc_1', name: '1. ARRECADAÇÃO DIRETA', type: 'income', parent_id: '' },
      { id: 'inc_1_1', name: '1.1. Ofertas', type: 'income', parent_id: 'inc_1' },
      { id: 'inc_1_1_1', name: '1.1.1. Gasofilácio (Dinheiro/Espécie)', type: 'income', parent_id: 'inc_1_1' },
      { id: 'inc_1_1_2', name: '1.1.2. PIX / Transferência', type: 'income', parent_id: 'inc_1_1' },
      { id: 'inc_1_2', name: '1.2. Dízimos', type: 'income', parent_id: 'inc_1' },
      { id: 'inc_1_2_1', name: '1.2.1. PIX / Transferência', type: 'income', parent_id: 'inc_1_2' },
      { id: 'inc_1_2_2', name: '1.2.2. Espécie', type: 'income', parent_id: 'inc_1_2' },
      { id: 'inc_2', name: '2. DOAÇÕES E OUTROS', type: 'income', parent_id: '' },
      { id: 'inc_2_1', name: '2.1. Doação Específica (Ex: Campanhas, Construção)', type: 'income', parent_id: 'inc_2' },
      { id: 'inc_2_2', name: '2.2. Doação Geral', type: 'income', parent_id: 'inc_2' },
      { id: 'inc_3', name: '3. RENDIMENTOS E RESERVAS', type: 'income', parent_id: '' },
      { id: 'inc_3_1', name: '3.1. Rendimentos', type: 'income', parent_id: 'inc_3' },
      { id: 'inc_3_1_1', name: '3.1.1. Rendimento de Aplicação (CDB/Investimentos)', type: 'income', parent_id: 'inc_3_1' },
      { id: 'inc_3_1_2', name: '3.1.2. Rendimento de Poupança', type: 'income', parent_id: 'inc_3_1' },
      { id: 'inc_3_2', name: '3.2. Transferências Internas', type: 'income', parent_id: 'inc_3' },
      { id: 'inc_3_2_1', name: '3.2.1. Entrada de Transferência p/ Poupança', type: 'income', parent_id: 'inc_3_2' },
      // Despesas
      { id: 'exp_4', name: '4. MANUTENÇÃO E INFRAESTRUTURA', type: 'expense', parent_id: '' },
      { id: 'exp_4_1', name: '4.1. Reparos e Obras', type: 'expense', parent_id: 'exp_4' },
      { id: 'exp_4_1_1', name: '4.1.1. Pintura', type: 'expense', parent_id: 'exp_4_1' },
      { id: 'exp_4_1_2', name: '4.1.2. Serralharia / Portas', type: 'expense', parent_id: 'exp_4_1' },
      { id: 'exp_4_1_3', name: '4.1.3. Elétrica / Hidráulica', type: 'expense', parent_id: 'exp_4_1' },
      { id: 'exp_4_2', name: '4.2. Limpeza e Conservação', type: 'expense', parent_id: 'exp_4' },
      { id: 'exp_5', name: '5. PESSOAL E ENCARGOS', type: 'expense', parent_id: '' },
      { id: 'exp_5_1', name: '5.1. Folha de Pagamento', type: 'expense', parent_id: 'exp_5' },
      { id: 'exp_5_1_1', name: '5.1.1. Salários', type: 'expense', parent_id: 'exp_5_1' },
      { id: 'exp_5_1_2', name: '5.1.2. Pró-labore / Prebenda Ministerial', type: 'expense', parent_id: 'exp_5_1' },
      { id: 'exp_5_2', name: '5.2. Encargos Sociais', type: 'expense', parent_id: 'exp_5' },
      { id: 'exp_5_2_1', name: '5.2.1. INSS / FGTS / Impostos', type: 'expense', parent_id: 'exp_5_2' },
      { id: 'exp_6', name: '6. DESPESAS OPERACIONAIS', type: 'expense', parent_id: '' },
      { id: 'exp_6_1', name: '6.1. Taxas Bancárias', type: 'expense', parent_id: 'exp_6' },
      { id: 'exp_6_1_1', name: '6.1.1. Tarifas de Conta', type: 'expense', parent_id: 'exp_6_1' },
      { id: 'exp_6_1_2', name: '6.1.2. Juros / IOF', type: 'expense', parent_id: 'exp_6_1' },
      { id: 'exp_6_2', name: '6.2. Contas de Consumo', type: 'expense', parent_id: 'exp_6' },
      { id: 'exp_6_2_1', name: '6.2.1. Energia / Água / Internet', type: 'expense', parent_id: 'exp_6_2' },
    ];

    const createdAt = new Date().toISOString();
    const values = defaultCategories.map(c => [c.id, c.name, c.type, c.parent_id, createdAt]);
    await sheets.spreadsheets.values.append({
      auth,
      spreadsheetId,
      range: 'Categories!A:E',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values },
    });

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post(["/api/auth/login", "/auth/login"], async (req, res) => {
  try {
    const { email, password } = req.body;
    const rows = await getRows('Users!A:G');
    if (!rows || rows.length <= 1) {
      return res.status(401).json({ error: "Nenhum usuário cadastrado. Use o botão de inicialização." });
    }

    const headers = rows[0];
    const users = rows.slice(1).map((row: any) => {
      const obj: any = {};
      headers.forEach((header: string, index: number) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    const user = users.find((u: any) => u.email === email && u.password === password);

    if (user) {
      if (user.is_active === 'FALSE') {
        return res.status(403).json({ error: "Sua conta está desativada. Entre em contato com o administrador." });
      }
      const { password: _, ...userWithoutPassword } = user;
      res.json({ success: true, user: { ...userWithoutPassword, is_active: true } });
    } else {
      res.status(401).json({ error: "Email ou senha inválidos" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post(["/api/auth/signup", "/auth/signup"], async (req, res) => {
  try {
    const { email, password, full_name, role } = req.body;
    const rows = await getRows('Users!A:G');
    
    const headers = rows[0] || ['id', 'email', 'password', 'full_name', 'role', 'is_active', 'created_at'];
    const users = rows.slice(1).map((row: any) => {
      const obj: any = {};
      headers.forEach((header: string, index: number) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    if (users.find((u: any) => u.email === email)) {
      return res.status(400).json({ error: "Email já cadastrado" });
    }

    const id = uuidv4();
    const createdAt = new Date().toISOString();
    const newUser = [id, email, password, full_name, role || 'user', 'TRUE', createdAt];
    
    await appendRow('Users!A:G', newUser);
    
    res.json({ 
      success: true, 
      user: { id, email, full_name, role: role || 'user' } 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get(["/api/transactions", "/transactions"], async (req, res) => {
  try {
    const [transRows, catRows] = await Promise.all([
      getRows('Transactions!A:K'),
      getRows('Categories!A:E')
    ]);

    if (!transRows || transRows.length <= 1) return res.json([]);
    
    const transHeaders = transRows[0];
    const catHeaders = catRows[0];
    
    const categories = catRows.slice(1).map((row: any) => {
      const obj: any = {};
      catHeaders.forEach((header: string, index: number) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    const data = transRows.slice(1).map((row: any) => {
      const obj: any = {};
      transHeaders.forEach((header: string, index: number) => {
        obj[header] = row[index] || '';
      });
      
      // Join category
      obj.category = categories.find((c: any) => c.id === obj.category_id);
      
      return obj;
    });
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ 
      error: "Erro ao buscar transações", 
      details: error.message 
    });
  }
});

app.post(["/api/transactions", "/transactions"], async (req, res) => {
  try {
    const { date, time, description, amount, type, category_id, user_id, observation, attachment_url } = req.body;
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    await appendRow('Transactions!A:K', [id, date, time, description, amount, type, category_id, user_id, observation || '', attachment_url || '', createdAt]);
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put(["/api/transactions/:id", "/transactions/:id"], async (req, res) => {
  try {
    const { id } = req.params;
    const { date, time, description, amount, type, category_id, user_id, observation, attachment_url } = req.body;
    
    const rows = await getRows('Transactions!A:K');
    const rowIndex = rows.findIndex(row => row[0] === id);
    if (rowIndex === -1) return res.status(404).json({ error: "Transação não encontrada" });
    
    const headers = rows[0];
    const oldRow = rows[rowIndex];
    const oldObj: any = {};
    headers.forEach((h, i) => oldObj[h] = oldRow[i] || '');

    const newRow = [
      id,
      date || oldObj.date,
      time || oldObj.time,
      description || oldObj.description,
      amount || oldObj.amount,
      type || oldObj.type,
      category_id || oldObj.category_id,
      user_id || oldObj.user_id,
      observation !== undefined ? observation : oldObj.observation,
      attachment_url !== undefined ? attachment_url : oldObj.attachment_url,
      oldObj.created_at
    ];

    await updateRow('Transactions', id, newRow);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete(["/api/transactions/:id", "/transactions/:id"], async (req, res) => {
  try {
    const { id } = req.params;
    const success = await deleteRow('Transactions', id);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Transação não encontrada" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get(["/api/categories", "/categories"], async (req, res) => {
  try {
    console.log("Fetching categories...");
    const rows = await getRows('Categories!A:E');
    if (!rows || rows.length <= 1) return res.json([]);
    const headers = rows[0];
    const data = rows.slice(1).map((row: any) => {
      const obj: any = {};
      headers.forEach((header: string, index: number) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });
    res.json(data);
  } catch (error: any) {
    console.error("Categories error:", error.message);
    res.status(500).json({ 
      error: "Erro ao buscar categorias", 
      details: error.message,
      hint: "Verifique se o GOOGLE_SHEET_ID está correto e se o e-mail do Service Account tem permissão de Editor na planilha."
    });
  }
});

app.post(["/api/categories", "/categories"], async (req, res) => {
  try {
    const { name, type, parent_id } = req.body;
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    await appendRow('Categories!A:E', [id, name, type, parent_id || '', createdAt]);
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get(["/api/users", "/users"], async (req, res) => {
  try {
    const rows = await getRows('Users!A:G');
    if (!rows || rows.length === 0) return res.json([]);
    
    let headers = rows[0];
    
    // Auto-fix headers if missing is_active
    if (!headers.includes('is_active')) {
      headers = ['id', 'email', 'password', 'full_name', 'role', 'is_active', 'created_at'];
      const auth = getAuth();
      const sheets = getSheets();
      const spreadsheetId = getSpreadsheetId();
      await sheets.spreadsheets.values.update({
        auth,
        spreadsheetId,
        range: 'Users!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [headers] },
      });
    }

    const data = rows.slice(1).map((row: any) => {
      const obj: any = {};
      headers.forEach((header: string, index: number) => {
        obj[header] = row[index] || '';
      });
      // Remove password for security
      const { password: _, ...userWithoutPassword } = obj;
      
      // If the row was shorter than headers, obj.is_active might be empty
      const isActiveValue = obj.is_active;
      return { 
        ...userWithoutPassword, 
        is_active: isActiveValue !== 'FALSE' 
      };
    });
    res.json(data);
  } catch (error: any) {
    res.json([]);
  }
});

app.post(["/api/users", "/users"], async (req, res) => {
  try {
    const { email, full_name, password, role } = req.body;
    
    // Check if user already exists
    const rows = await getRows('Users!A:G');
    if (rows && rows.length > 1) {
      const headers = rows[0];
      const emailIndex = headers.indexOf('email');
      const exists = rows.slice(1).some((row: any) => row[emailIndex] === email);
      if (exists) {
        return res.status(400).json({ error: "Usuário com este email já existe" });
      }
    }

    const id = uuidv4();
    const createdAt = new Date().toISOString();
    // headers: ['id', 'email', 'password', 'full_name', 'role', 'is_active', 'created_at']
    await appendRow('Users!A:G', [id, email, password, full_name, role, 'TRUE', createdAt]);
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete(["/api/users/:id", "/users/:id"], async (req, res) => {
  try {
    const { id } = req.params;
    const success = await deleteRow('Users', id);
    if (success) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Usuário não encontrado" });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put(["/api/users/:id", "/users/:id"], async (req, res) => {
  try {
    const { id } = req.params;
    const { email, full_name, password, role, is_active } = req.body;
    
    const rows = await getRows('Users!A:G');
    const rowIndex = rows.findIndex(row => row[0] === id);
    if (rowIndex === -1) return res.status(404).json({ error: "Usuário não encontrado" });
    
    const headers = rows[0];
    const oldUserRow = rows[rowIndex];
    
    // Map old user data to object for easier manipulation
    const oldUserObj: any = {};
    headers.forEach((header, index) => {
      oldUserObj[header] = oldUserRow[index] || '';
    });

    // Prepare new user data based on standard 7-column structure
    const newUserRow = [
      id,
      email || oldUserObj.email || '',
      password || oldUserObj.password || '',
      full_name || oldUserObj.full_name || '',
      role || oldUserObj.role || 'viewer',
      is_active !== undefined 
        ? (is_active ? 'TRUE' : 'FALSE') 
        : (oldUserObj.is_active || 'TRUE'),
      oldUserObj.created_at || new Date().toISOString()
    ];
    
    await updateRow('Users', id, newUserRow);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.all("*", (req, res) => {
  res.status(404).json({ error: "Rota não encontrada", url: req.url });
});

export default app;
