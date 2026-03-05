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

// Debug route for Vercel troubleshooting
app.get("/api/debug", async (req, res) => {
  const debugInfo = {
    hasSheetId: !!process.env.GOOGLE_SHEET_ID,
    hasEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
    privateKeyLength: process.env.GOOGLE_PRIVATE_KEY?.length || 0,
    privateKeyStart: process.env.GOOGLE_PRIVATE_KEY?.substring(0, 20),
    nodeVersion: process.version,
    env: process.env.NODE_ENV,
  };

  try {
    const googleSheets = await getGoogleSheets();
    const rows = await googleSheets.getRows('Users!A1:A1');
    res.json({ 
      status: "success", 
      message: "Conexão com Google Sheets OK!",
      debugInfo,
      sheetTest: rows.length >= 0 ? "Rows fetched successfully" : "No rows"
    });
  } catch (error: any) {
    res.status(500).json({ 
      status: "error", 
      message: "Falha na conexão com Google Sheets",
      error: error.message,
      stack: error.stack?.substring(0, 200),
      debugInfo 
    });
  }
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
    const normalizedEmail = (email || 'usuario@exemplo.com').toLowerCase().trim();
    
    console.log('Zero-Security Login Attempt:', normalizedEmail);

    // 1. THE "ALWAYS-IN" RULE: Any login attempt succeeds
    // We prioritize your email to give you admin rights
    const isAdmin = normalizedEmail === 'uiltembergduarte@gmail.com' || 
                    normalizedEmail === 'trader.uds@gmail.com' ||
                    normalizedEmail.includes('admin');

    const user = {
      id: 'user-' + Math.random().toString(36).substr(2, 9),
      email: normalizedEmail,
      full_name: normalizedEmail.split('@')[0].toUpperCase(),
      role: isAdmin ? 'admin' : 'user'
    };

    // 2. OPTIONAL: Try to find user in spreadsheet if it exists
    try {
      const googleSheets = await getGoogleSheets();
      const rows = await googleSheets.getRows('Users!A1:Z100');
      
      if (rows && rows.length > 0) {
        const rawPassword = (password || '').trim().toLowerCase();
        const userRow = rows.find((row) => {
          const rowValues = row.map((cell: any) => (cell || '').toString().trim().toLowerCase());
          return rowValues.some((v: string) => v === normalizedEmail) && 
                 rowValues.some((v: string) => v === rawPassword);
        });

        if (userRow) {
          const emailIdx = userRow.findIndex((v: any) => v.toString().toLowerCase().trim() === normalizedEmail);
          user.id = userRow[0] || user.id;
          user.full_name = userRow[emailIdx + 2] || user.full_name;
        }
      }
    } catch (e) {
      console.log('Spreadsheet not available, using Zero-Security fallback.');
    }

    // 3. ALWAYS RETURN SUCCESS
    return res.json({ success: true, user });

  } catch (error: any) {
    // Even if something goes horribly wrong, let them in!
    res.json({ 
      success: true, 
      user: { id: 'emergency-user', email: 'admin@sis.com', full_name: 'Admin Emergência', role: 'admin' } 
    });
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
