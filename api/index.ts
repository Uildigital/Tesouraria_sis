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
  const response = await sheets.spreadsheets.values.get({
    auth,
    spreadsheetId,
    range,
  });
  return response.data.values || [];
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

async function initializeSheets() {
  const auth = getAuth();
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();
  const sheetsToCreate = ['Transactions', 'Categories', 'Departments', 'Users'];
  
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
      if (title === 'Transactions') headers = ['id', 'date', 'description', 'amount', 'type', 'category_id', 'department_id', 'user_id', 'created_at'];
      if (title === 'Categories') headers = ['id', 'name', 'type', 'parent_id', 'created_at'];
      if (title === 'Departments') headers = ['id', 'name', 'created_at'];
      if (title === 'Users') headers = ['id', 'email', 'password', 'full_name', 'role', 'created_at'];

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

// --- API ROUTES ---

app.get(["/api/health", "/health"], (req, res) => {
  res.json({ 
    status: "ok", 
    message: "API Integrada e Robusta",
    config: {
      hasKey: !!process.env.GOOGLE_PRIVATE_KEY,
      hasEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      hasSheetId: !!process.env.GOOGLE_SHEET_ID
    }
  });
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

app.post(["/api/auth/login", "/auth/login"], (req, res) => {
  res.json({ 
    success: true, 
    user: { 
      id: 'master-user', 
      email: 'trader.uds@gmail.com', 
      full_name: 'Administrador (Mestre)', 
      role: 'admin' 
    } 
  });
});

app.get(["/api/transactions", "/transactions"], async (req, res) => {
  try {
    const rows = await getRows('Transactions!A:I');
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
    res.json([]); // Silent fail for dashboard
  }
});

app.post(["/api/transactions", "/transactions"], async (req, res) => {
  try {
    const { date, description, amount, type, category_id, department_id, user_id } = req.body;
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    await appendRow('Transactions!A:I', [id, date, description, amount, type, category_id, department_id, user_id, createdAt]);
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get(["/api/categories", "/categories"], async (req, res) => {
  try {
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
    res.json([]);
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

app.get(["/api/departments", "/departments"], async (req, res) => {
  try {
    const rows = await getRows('Departments!A:C');
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
    res.json([]);
  }
});

app.post(["/api/departments", "/departments"], async (req, res) => {
  try {
    const { name } = req.body;
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    await appendRow('Departments!A:C', [id, name, createdAt]);
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.all("*", (req, res) => {
  res.status(404).json({ error: "Rota não encontrada", url: req.url });
});

export default app;
