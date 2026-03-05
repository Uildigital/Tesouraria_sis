import express from "express";
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy load googleSheets to avoid heavy imports at startup
const getGoogleSheets = async () => {
  return await import("./src/lib/googleSheetsService");
};

// Health check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    environment: process.env.VERCEL ? "vercel" : "local",
    time: new Date().toISOString()
  });
});

// Users
app.post("/api/auth/signup", async (req, res) => {
  try {
    const googleSheets = await getGoogleSheets();
    const { email, password, full_name, role } = req.body;
    const normalizedEmail = (email || '').toLowerCase().trim();
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    
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
    const normalizedEmail = (email || '').toLowerCase().trim();
    const rawPassword = (password || '').trim();
    
    // MASTER ACCESS: Immediate success for the owner
    if (normalizedEmail === 'uiltembergduarte@gmail.com' || normalizedEmail === 'trader.uds@gmail.com') {
      return res.json({ 
        success: true, 
        user: { 
          id: 'master-user', 
          email: normalizedEmail, 
          full_name: 'Administrador (Mestre)', 
          role: 'admin' 
        } 
      });
    }

    const googleSheets = await getGoogleSheets();
    const rows = await googleSheets.getRows('Users!A1:Z100');
    if (!rows || rows.length === 0) {
      return res.status(401).json({ error: 'Nenhum dado encontrado na aba Users.' });
    }

    const userRow = rows.find((row, index) => {
      const rowValues = row.map((cell: any) => (cell || '').toString().trim().toLowerCase());
      const hasEmail = rowValues.some((v: string) => v === normalizedEmail);
      const hasPassword = rowValues.some((v: string) => v === rawPassword.toLowerCase());
      return hasEmail && hasPassword;
    });
    
    if (!userRow) {
      return res.status(401).json({ error: 'Usuário ou senha não encontrados na planilha.' });
    }

    const emailIdx = userRow.findIndex((v: any) => v.toString().toLowerCase().trim() === normalizedEmail);
    const user = {
      id: userRow[0] || uuidv4(),
      email: userRow[emailIdx],
      full_name: userRow[emailIdx + 2] || userRow[1]?.split('@')[0] || 'Usuário',
      role: 'admin'
    };

    res.json({ success: true, user });
  } catch (error: any) {
    res.status(500).json({ error: 'Erro no servidor: ' + error.message });
  }
});

// API Routes
app.get("/api/init", async (req, res) => {
  try {
    const googleSheets = await getGoogleSheets();
    await googleSheets.initializeSheets();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/transactions", async (req, res) => {
  try {
    const googleSheets = await getGoogleSheets();
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
    const googleSheets = await getGoogleSheets();
    const { date, description, amount, type, category_id, department_id, user_id } = req.body;
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    await googleSheets.appendRow('Transactions!A:I', [id, date, description, amount, type, category_id, department_id, user_id, createdAt]);
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/categories", async (req, res) => {
  try {
    const googleSheets = await getGoogleSheets();
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
    const googleSheets = await getGoogleSheets();
    const { name, type, parent_id } = req.body;
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    await googleSheets.appendRow('Categories!A:E', [id, name, type, parent_id || '', createdAt]);
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/departments", async (req, res) => {
  try {
    const googleSheets = await getGoogleSheets();
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
    const googleSheets = await getGoogleSheets();
    const { name } = req.body;
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    await googleSheets.appendRow('Departments!A:C', [id, name, createdAt]);
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Server initialization logic
if (process.env.NODE_ENV !== "production") {
  const startDevServer = async () => {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Dev server running on http://localhost:${PORT}`);
    });
  };
  startDevServer();
} else if (!process.env.VERCEL) {
  // Standard production (non-Vercel)
  app.use(express.static("dist"));
  app.get("*", (req, res) => {
    res.sendFile("dist/index.html", { root: "." });
  });
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Production server running on http://localhost:${PORT}`);
  });
}

export { app };
