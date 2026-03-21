import 'dotenv/config';
import express from "express";
import bcrypt from 'bcryptjs';
import { supabase } from './api/lib/supabase';

console.log('Server starting with Supabase backend...');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// --- AUXILIARY FUNCTIONS ---
const sendError = (res: any, error: any, message = 'Erro interno no servidor') => {
  console.error(`[Server Error]:`, error);
  res.status(500).json({ 
    error: message, 
    details: error.message,
    hint: error.hint || undefined
  });
};

// --- API ROUTES ---

// Health Check
app.get(["/api/health", "/health"], (req, res) => {
  res.json({ 
    status: "ok", 
    message: "Servidor Local Supabase Ativo",
    timestamp: new Date().toISOString()
  });
});

// Settings
app.get("/api/settings", async (req, res) => {
  try {
    const { data, error } = await supabase.from('settings').select('*');
    if (error) throw error;
    
    const settings: any = {};
    data.forEach(s => settings[s.key] = s.value);
    res.json(settings);
  } catch (error) {
    sendError(res, error, 'Falha ao buscar configurações');
  }
});

app.post("/api/settings", async (req, res) => {
  try {
    const newSettings = req.body;
    const upsertData = Object.entries(newSettings).map(([key, value]) => ({ key, value }));
    
    const { error } = await supabase.from('settings').upsert(upsertData);
    if (error) throw error;
    
    res.json({ success: true });
  } catch (error) {
    sendError(res, error, 'Falha ao atualizar configurações');
  }
});

// Auth
app.post(["/api/auth/login", "/auth/login"], async (req, res) => {
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

    if (!user.is_active) {
      return res.status(403).json({ error: "Sua conta está desativada. Entre em contato com o administrador." });
    }

    const isHashed = user.password_hash?.startsWith('$2a$') || user.password_hash?.startsWith('$2b$');
    let isValid = false;

    if (isHashed) {
      isValid = await bcrypt.compare(password, user.password_hash);
    } else {
      isValid = user.password_hash === password;
      if (isValid) {
        const hash = await bcrypt.hash(password, 10);
        await supabase.from('users').update({ password_hash: hash }).eq('id', user.id);
      }
    }

    if (isValid) {
      const { password_hash: _, ...userWithoutPassword } = user;
      res.json({ success: true, user: userWithoutPassword });
    } else {
      res.status(401).json({ error: "Email ou senha inválidos" });
    }
  } catch (error) {
    sendError(res, error, 'Erro no login');
  }
});

app.post(["/api/auth/signup", "/auth/signup"], async (req, res) => {
  try {
    const { email, password, full_name, role, organization_id } = req.body;
    const password_hash = await bcrypt.hash(password, 10);
    
    const { data, error } = await supabase
      .from('users')
      .insert([{ email, password_hash, full_name, role: role || 'user', is_active: true, organization_id: organization_id || '' }])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return res.status(400).json({ error: "Email já cadastrado" });
      throw error;
    }

    const { password_hash: _, ...userWithoutPassword } = data;
    res.json({ success: true, user: userWithoutPassword });
  } catch (error) {
    sendError(res, error, 'Erro ao criar conta');
  }
});

// Transactions
app.get(["/api/transactions", "/transactions"], async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*, category:categories(*)');
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    sendError(res, error, 'Erro ao buscar transações');
  }
});

app.post(["/api/transactions", "/transactions"], async (req, res) => {
  try {
    const payload = req.body;
    const { data, error } = await supabase
      .from('transactions')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, id: data.id });
  } catch (error) {
    sendError(res, error, 'Erro ao salvar transação');
  }
});

app.put(["/api/transactions/:id", "/transactions/:id"], async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const { error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    sendError(res, error, 'Erro ao atualizar transação');
  }
});

app.delete(["/api/transactions/:id", "/transactions/:id"], async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    sendError(res, error, 'Erro ao excluir transação');
  }
});

// Categories
app.get(["/api/categories", "/categories"], async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*');
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    sendError(res, error, 'Erro ao buscar categorias');
  }
});

app.post(["/api/categories", "/categories"], async (req, res) => {
  try {
    const payload = req.body;
    const { data, error } = await supabase
      .from('categories')
      .insert([payload])
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, id: data.id });
  } catch (error) {
    sendError(res, error, 'Erro ao criar categoria');
  }
});

app.put(["/api/categories/:id", "/categories/:id"], async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const { error } = await supabase
      .from('categories')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    sendError(res, error, 'Erro ao atualizar categoria');
  }
});

app.delete(["/api/categories/:id", "/categories/:id"], async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check for transactions
    const { count, error: countError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id);

    if (countError) throw countError;
    if (count && count > 0) {
      return res.status(400).json({ error: "Não é possível excluir uma categoria que possui lançamentos vinculados." });
    }

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    sendError(res, error, 'Erro ao excluir categoria');
  }
});

// Users Management
app.get(["/api/users", "/users"], async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, role, is_active, created_at, organization_id');
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    sendError(res, error, 'Erro ao buscar usuários');
  }
});

app.post(["/api/users", "/users"], async (req, res) => {
  try {
    const { email, full_name, password, role, organization_id } = req.body;
    const password_hash = await bcrypt.hash(password, 10);
    
    const { data, error } = await supabase
      .from('users')
      .insert([{ email, full_name, password_hash, role, is_active: true, organization_id }])
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, id: data.id });
  } catch (error) {
    sendError(res, error, 'Erro ao criar usuário');
  }
});

app.put(["/api/users/:id", "/users/:id"], async (req, res) => {
  try {
    const { id } = req.params;
    const { email, full_name, password, role, is_active, organization_id } = req.body;
    
    const updates: any = { email, full_name, role, is_active, organization_id };
    if (password) {
      updates.password_hash = await bcrypt.hash(password, 10);
    }
    
    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    sendError(res, error, 'Erro ao atualizar usuário');
  }
});

app.delete(["/api/users/:id", "/users/:id"], async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    sendError(res, error, 'Erro ao deletar usuário');
  }
});

app.all("*", (req, res) => {
  res.status(404).json({ error: "Rota não encontrada", url: req.url });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
