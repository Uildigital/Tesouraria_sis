import express from "express";
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());

// Lazy load googleSheets to avoid heavy imports at startup
const getGoogleSheets = async () => {
  try {
    return await import("../src/lib/googleSheetsService");
  } catch (e) {
    console.error("Failed to load googleSheetsService", e);
    return null;
  }
};

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "API Direta com Resiliência Ativa" });
});

// LOGIN TOTALMENTE ABERTO
app.post("/api/auth/login", (req, res) => {
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

// TRANSACTIONS
app.get("/api/transactions", async (req, res) => {
  try {
    const googleSheets = await getGoogleSheets();
    if (!googleSheets) return res.json([]);
    const rows = await googleSheets.getRows('Transactions!A:I');
    if (!rows || rows.length <= 1) return res.json([]);
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
    console.error("Transactions error:", error);
    res.json([]); // Return empty array on error to avoid crashing UI
  }
});

app.post("/api/transactions", async (req, res) => {
  try {
    const googleSheets = await getGoogleSheets();
    if (!googleSheets) throw new Error("Sheets service not available");
    const { date, description, amount, type, category_id, department_id, user_id } = req.body;
    const id = uuidv4();
    const createdAt = new Date().toISOString();
    await googleSheets.appendRow('Transactions!A:I', [id, date, description, amount, type, category_id, department_id, user_id, createdAt]);
    res.json({ success: true, id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// CATEGORIES
app.get("/api/categories", async (req, res) => {
  try {
    const googleSheets = await getGoogleSheets();
    if (!googleSheets) return res.json([]);
    const rows = await googleSheets.getRows('Categories!A:E');
    if (!rows || rows.length <= 1) return res.json([]);
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
    res.json([]);
  }
});

// DEPARTMENTS
app.get("/api/departments", async (req, res) => {
  try {
    const googleSheets = await getGoogleSheets();
    if (!googleSheets) return res.json([]);
    const rows = await googleSheets.getRows('Departments!A:C');
    if (!rows || rows.length <= 1) return res.json([]);
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
    res.json([]);
  }
});

export default app;
