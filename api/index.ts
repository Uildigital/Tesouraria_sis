import express from "express";
import { v4 as uuidv4 } from 'uuid';
import * as googleSheets from './lib/googleSheetsService';

const app = express();
app.use(express.json());

// Health check
app.get(["/api/health", "/health"], (req, res) => {
  res.json({ 
    status: "ok", 
    message: "API Direta Ativa",
    env: process.env.NODE_ENV,
    vercel: !!process.env.VERCEL,
    url: req.url
  });
});

// INIT
app.get(["/api/init", "/init"], async (req, res) => {
  try {
    await googleSheets.initializeSheets();
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message, stack: error.stack });
  }
});

// LOGIN
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

// TRANSACTIONS
app.get(["/api/transactions", "/transactions"], async (req, res) => {
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
      message: error.message
    });
  }
});

app.post(["/api/transactions", "/transactions"], async (req, res) => {
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

// CATEGORIES
app.get(["/api/categories", "/categories"], async (req, res) => {
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

app.post(["/api/categories", "/categories"], async (req, res) => {
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
app.get(["/api/departments", "/departments"], async (req, res) => {
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

app.post(["/api/departments", "/departments"], async (req, res) => {
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

// CATCH ALL FOR DEBUGGING
app.all("*", (req, res) => {
  res.status(404).json({
    error: "Route not found in API",
    method: req.method,
    url: req.url,
    path: req.path
  });
});

export default app;
