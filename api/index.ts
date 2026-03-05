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

      // Add default admin if it's the Users sheet
      if (title === 'Users') {
        const defaultAdmin = [
          uuidv4(),
          'trader.uds@gmail.com',
          'admin123', // In a real app, this should be hashed
          'Administrador Mestre',
          'admin',
          new Date().toISOString()
        ];
        await appendRow('Users!A:F', defaultAdmin);
      }
    }
  }
}

// --- API ROUTES ---

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

app.post(["/api/auth/login", "/auth/login"], async (req, res) => {
  try {
    const { email, password } = req.body;
    const rows = await getRows('Users!A:F');
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
      const { password: _, ...userWithoutPassword } = user;
      res.json({ success: true, user: userWithoutPassword });
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
    const rows = await getRows('Users!A:F');
    
    const headers = rows[0] || ['id', 'email', 'password', 'full_name', 'role', 'created_at'];
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
    const newUser = [id, email, password, full_name, role || 'user', createdAt];
    
    await appendRow('Users!A:F', newUser);
    
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
    res.status(500).json({ 
      error: "Erro ao buscar transações", 
      details: error.message 
    });
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

app.get(["/api/users", "/users"], async (req, res) => {
  try {
    const rows = await getRows('Users!A:F');
    if (!rows || rows.length <= 1) return res.json([]);
    const headers = rows[0];
    const data = rows.slice(1).map((row: any) => {
      const obj: any = {};
      headers.forEach((header: string, index: number) => {
        obj[header] = row[index] || '';
      });
      // Remove password for security
      const { password: _, ...userWithoutPassword } = obj;
      return { ...userWithoutPassword, is_active: true }; // Assume active for now
    });
    res.json(data);
  } catch (error: any) {
    res.json([]);
  }
});

app.all("*", (req, res) => {
  res.status(404).json({ error: "Rota não encontrada", url: req.url });
});

export default app;
