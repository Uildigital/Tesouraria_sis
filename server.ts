import express from "express";
import { createServer as createViteServer } from "vite";
import * as googleSheets from "./src/lib/googleSheetsService.ts";
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Users
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, password, full_name, role } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    
    // Check if user exists
    const rows = await googleSheets.getRows('Users!A:E');
    const exists = rows.some(row => (row[1] || '').toString().toLowerCase().trim() === normalizedEmail);
    if (exists) return res.status(400).json({ error: 'Usuário já existe' });

    await googleSheets.appendRow('Users!A:F', [id, normalizedEmail, password, full_name, role || 'admin', createdAt]);
    res.json({ success: true, user: { id, email: normalizedEmail, full_name, role: role || 'admin' } });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();
    const rows = await googleSheets.getRows('Users!A1:Z100');
    
    if (rows.length === 0) {
      return res.status(401).json({ error: 'A planilha de usuários está vazia. Cadastre-se primeiro.' });
    }

    // Flexible search: find a row where one cell matches email and another matches password
    const userRow = rows.find((row, index) => {
      // Skip header if it contains "email" or "password"
      const isHeader = row.some(cell => 
        cell?.toString().toLowerCase().includes('email') || 
        cell?.toString().toLowerCase().includes('senha') ||
        cell?.toString().toLowerCase().includes('password')
      );
      if (isHeader && index === 0) return false;

      const rowValues = row.map(cell => (cell || '').toString().trim());
      const hasEmail = rowValues.some(v => v.toLowerCase() === normalizedEmail);
      const hasPassword = rowValues.some(v => v === password.trim());
      
      return hasEmail && hasPassword;
    });
    
    // Fallback for developer access
    if (!userRow && normalizedEmail === 'trader.uds@gmail.com') {
      const devUser = {
        id: 'dev-admin',
        email: normalizedEmail,
        full_name: 'Developer Admin',
        role: 'admin'
      };
      return res.json({ success: true, user: devUser });
    }

    if (!userRow) {
      return res.status(401).json({ 
        error: 'Credenciais inválidas.',
        details: 'Verifique se o e-mail e a senha estão corretos na sua planilha Google (aba Users).'
      });
    }

    // Map found row to user object (try to guess columns or use defaults)
    const emailIdx = userRow.findIndex(v => v.toString().toLowerCase().trim() === normalizedEmail);
    const user = {
      id: userRow[0] || uuidv4(),
      email: userRow[emailIdx],
      full_name: userRow[emailIdx + 2] || userRow[emailIdx - 1] || userRow[emailIdx].split('@')[0],
      role: userRow.find(v => ['admin', 'treasurer', 'viewer'].includes(v.toString().toLowerCase())) || 'admin'
    };

    res.json({ success: true, user });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Erro no servidor: ' + error.message });
  }
});

// API Routes
app.get("/api/init", async (req, res) => {
  try {
    await googleSheets.initializeSheets();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Transactions
app.get("/api/transactions", async (req, res) => {
  try {
    const rows = await googleSheets.getRows('Transactions!A:I');
    const headers = rows[0];
    const data = rows.slice(1).map(row => {
      const obj: any = {};
      headers.forEach((header: string, index: number) => {
        obj[header] = row[index];
      });
      return obj;
    });
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/transactions", async (req, res) => {
  try {
    const { date, description, amount, type, category_id, department_id, user_id } = req.body;
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    await googleSheets.appendRow('Transactions!A:I', [id, date, description, amount, type, category_id, department_id, user_id, createdAt]);
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Categories
app.get("/api/categories", async (req, res) => {
  try {
    const rows = await googleSheets.getRows('Categories!A:E');
    if (rows.length === 0) return res.json([]);
    const headers = rows[0];
    const data = rows.slice(1).map(row => {
      const obj: any = {};
      headers.forEach((header: string, index: number) => {
        obj[header] = row[index];
      });
      return obj;
    });
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/categories", async (req, res) => {
  try {
    const { name, type, parent_id } = req.body;
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    await googleSheets.appendRow('Categories!A:E', [id, name, type, parent_id || '', createdAt]);
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Departments
app.get("/api/departments", async (req, res) => {
  try {
    const rows = await googleSheets.getRows('Departments!A:C');
    if (rows.length === 0) return res.json([]);
    const headers = rows[0];
    const data = rows.slice(1).map(row => {
      const obj: any = {};
      headers.forEach((header: string, index: number) => {
        obj[header] = row[index];
      });
      return obj;
    });
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/departments", async (req, res) => {
  try {
    const { name } = req.body;
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    await googleSheets.appendRow('Departments!A:C', [id, name, createdAt]);
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export { app };
