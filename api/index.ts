import express from "express";
import { v4 as uuidv4 } from 'uuid';
import * as googleSheets from './lib/googleSheetsService';

const app = express();
app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "API Direta Ativa",
    env: process.env.NODE_ENV,
    vercel: !!process.env.VERCEL
  });
});

// INIT
app.get("/api/init", async (req, res) => {
  try {
    await googleSheets.initializeSheets();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
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
    const rows = await googleSheets.getRows('Transactions!A:I');
    if (!rows || rows.length <= 1) return res.json([]);
    
    const headers = rows[0];
    const data = rows.slice(1).map((row: any) => {
      const obj: any = {};
      headers.forEach((header: string, index: number) => {
        obj[header] = row[index];
      });
      return obj;
    });
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ 
      error: "Transactions fetch failed", 
      message: error.message,
      stack: error.stack 
    });
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
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// CATEGORIES
app.get("/api/categories", async (req, res) => {
  try {
    const rows = await googleSheets.getRows('Categories!A:E');
    if (!rows || rows.length <= 1) return res.json([]);
    const headers = rows[0];
    const data = rows.slice(1).map((row: any) => {
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

// DEPARTMENTS
app.get("/api/departments", async (req, res) => {
  try {
    const rows = await googleSheets.getRows('Departments!A:C');
    if (!rows || rows.length <= 1) return res.json([]);
    const headers = rows[0];
    const data = rows.slice(1).map((row: any) => {
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

export default app;
