import express from "express";
import { v4 as uuidv4 } from 'uuid';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

const app = express();
const PORT = 3000;

app.use(express.json());

// --- GOOGLE SHEETS LOGIC INTEGRATED ---
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const getAuth = () => {
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  
  if (!rawKey || !email) {
    throw new Error(`Faltam variáveis de ambiente: ${!rawKey ? 'GOOGLE_PRIVATE_KEY ' : ''}${!email ? 'GOOGLE_SERVICE_ACCOUNT_EMAIL' : ''}`);
  }

  const privateKey = rawKey.replace(/\\n/g, '\n').replace(/"/g, '').trim();

  return new JWT({
    email: email,
    key: privateKey,
    scopes: SCOPES,
  });
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
  await sheets.spreadsheets.values.append({
    auth,
    spreadsheetId,
    range,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [values] },
  });
}

async function initializeSheets() {
  const auth = getAuth();
  const sheets = getSheets();
  const spreadsheetId = getSpreadsheetId();
  const sheetsToCreate = ['Transactions', 'Categories', 'Departments', 'Users'];
  const spreadsheet = await sheets.spreadsheets.get({ auth, spreadsheetId });
  const existingSheets = spreadsheet.data.sheets?.map(s => s.properties?.title) || [];

  for (const title of sheetsToCreate) {
    if (!existingSheets.includes(title)) {
      await sheets.spreadsheets.batchUpdate({
        auth,
        spreadsheetId,
        requestBody: { requests: [{ addSheet: { properties: { title } } }] },
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
          'admin123',
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

app.get(["/api/health", "/health"], (req, res) => {
  res.json({ status: "ok", message: "Servidor Completo Ativo" });
});

app.get(["/api/init", "/init"], async (req, res) => {
  try {
    await initializeSheets();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
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
    res.status(500).json({ error: error.message });
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
      const { password: _, ...userWithoutPassword } = obj;
      return { ...userWithoutPassword, is_active: true };
    });
    res.json(data);
  } catch (error: any) {
    res.json([]);
  }
});

// Server initialization logic
const startServer = async () => {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production mode, serve static files from dist
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer();

export { app };
