import express from "express";
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const app = express();
app.use(express.json());

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

// --- HELPERS ---
async function logAction(user_id: string | null, user_email: string | null, action: string, details: string) {
  try {
    await supabase.from('audit_logs').insert([{
      user_id,
      user_email: user_email || 'sistema',
      action,
      details,
      created_at: new Date().toISOString()
    }]);
  } catch (error) {
    console.error('Audit log error:', error);
  }
}

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

    if (!user.is_active) {
      return res.status(403).json({ error: "Sua conta está desativada." });
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

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { full_name, email, password } = req.body;
    
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
          role: 'user', 
          is_active: true,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;
    
    const { password_hash: _, ...userWithoutPassword } = data;
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

app.post("/api/transactions", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('transactions')
      .insert([req.body])
      .select()
      .single();
      if (error) throw error;
      
      await logAction(req.body.user_id, 'user', 'Criou Lançamento', `Desc: ${req.body.description}, Valor: ${req.body.amount}`);
      
      res.json({ success: true, id: data.id });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/transactions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { data, error } = await supabase
        .from('transactions')
        .update(req.body)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      
      await logAction(null, 'user', 'Atualizou Lançamento', `ID: ${id}, Status: ${req.body.status || 'Alteração de dados'}`);
      
      res.json({ success: true, transaction: data });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/transactions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { data, error } = await supabase
        .from('transactions')
        .update(req.body)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      
      await logAction(null, 'user', 'Patch Lançamento', `ID: ${id}`);
      
      res.json({ success: true, transaction: data });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/transactions/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
      if (error) throw error;
      
      await logAction(null, 'user', 'Excluiu Lançamento', `ID: ${id}`);
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/audit-logs", async (req, res) => {
    try {
      const { data: logs, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      res.json(logs);
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

app.post("/api/categories", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('categories')
      .insert([req.body])
      .select()
      .single();
    
    if (error) {
      console.error('Supabase error creating category:', error);
      return res.status(500).json({ 
        error: "Erro no Banco de Dados", 
        details: error.message,
        hint: error.hint,
        code: error.code 
      });
    }
    
    await logAction(null, 'user', 'Criou Categoria', `Nome: ${req.body.name}, Tipo: ${req.body.type}`);
    
    res.json({ success: true, id: data.id, category: data });
  } catch (error: any) {
    console.error('Server error creating category:', error);
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('categories')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    await logAction(null, 'user', 'Atualizou Categoria', `ID: ${id}, Nome: ${req.body.name}`);
    
    res.json({ success: true, category: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    await logAction(null, 'user', 'Excluiu Categoria', `ID: ${id}`);
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/reset-categories", async (req, res) => {
  try {
    const { error } = await supabase
      .from('categories')
      .delete()
      .not('id', 'is', null);
    
    if (error) throw error;
    
    await logAction(null, 'user', 'Resetou Categorias', 'Todas as categorias foram excluídas');
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/init-sheets", async (req, res) => {
  try {
    await logAction(null, 'user', 'Inicializou Planilhas', 'Comando de inicialização recebido');
    res.json({ success: true });
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

app.put("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active, role, full_name, email, password } = req.body;
    
    const updates: any = {};
    if (is_active !== undefined) updates.is_active = is_active;
    if (role !== undefined) updates.role = role;
    if (full_name !== undefined) updates.full_name = full_name;
    if (email !== undefined) updates.email = email;

    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      updates.password_hash = await bcrypt.hash(password, salt);
    }

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

app.patch("/api/users/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active, role, full_name, email, password } = req.body;
    
    const updates: any = {};
    if (is_active !== undefined) updates.is_active = is_active;
    if (role !== undefined) updates.role = role;
    if (full_name !== undefined) updates.full_name = full_name;
    if (email !== undefined) updates.email = email;

    if (password && password.trim() !== '') {
      const salt = await bcrypt.genSalt(10);
      updates.password_hash = await bcrypt.hash(password, salt);
    }

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

app.get("/api/settings", async (req, res) => {
  try {
    const { data: settings, error } = await supabase
      .from('settings')
      .select('*');
    if (error) throw error;
    
    const settingsObj = (settings || []).reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(settingsObj);
  } catch (error: any) {
    res.json({});
  }
});

app.post("/api/settings", async (req, res) => {
  try {
    const settings = req.body;
    const entries = Object.entries(settings).map(([key, value]) => ({
      key,
      value,
      updated_at: new Date().toISOString()
    }));

    for (const entry of entries) {
      await supabase
        .from('settings')
        .upsert(entry, { onConflict: 'key' });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default app;
