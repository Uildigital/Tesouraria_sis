import express from "express";
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

// --- API ROUTES ---

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", backend: "supabase", project: supabaseUrl });
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: "Email ou senha inválidos" });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Email ou senha inválidos" });
    }

    const { password_hash, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/transactions", async (req, res) => {
  try {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*, category:categories(*)');
    if (error) throw error;
    res.json(transactions);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/categories", async (req, res) => {
  try {
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*');
    if (error) throw error;
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, is_active, created_at');
    if (error) throw error;
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/users", async (req, res) => {
  try {
    const { full_name, email, password, role, is_active } = req.body;
    
    if (!email || !password || !full_name) {
      return res.status(400).json({ error: "Nome, email e senha são obrigatórios" });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const { data, error } = await supabase
      .from('users')
      .insert([
        { 
          full_name, 
          email, 
          password_hash, 
          role: role || 'user', 
          is_active: is_active ?? true,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, user: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active, role, full_name, email } = req.body;
    
    const updates: any = {};
    if (is_active !== undefined) updates.is_active = is_active;
    if (role !== undefined) updates.role = role;
    if (full_name !== undefined) updates.full_name = full_name;
    if (email !== undefined) updates.email = email;

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, user: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 Servidor Supabase Rodando!`);
  console.log(`🔗 Local: http://localhost:${PORT}`);
  console.log(`📦 Conectado ao projeto: ${supabaseUrl}\n`);
});
