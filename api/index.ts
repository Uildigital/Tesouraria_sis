import express from "express";
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

dotenv.config();

const app = express();
app.use(express.json());

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

// --- HELPERS ---
async function logAction(user_id: string | null, user_email: string | null, action: string, details: string) {
  try {
    const { error } = await supabase.from('audit_logs').insert([{
      user_email: user_email || 'sistema',
      action,
      details,
      created_at: new Date().toISOString()
    }]);
    if (error) {
      console.error('Supabase audit log insert error:', error.message || error);
    }
  } catch (error) {
    console.error('Audit log error:', error);
  }
}

function getUserFromReq(req: express.Request) {
  const user_id = (req.headers['x-user-id'] as string) || req.body?.user_id || null;
  const user_email = (req.headers['x-user-email'] as string) || req.body?.user_email || 'sistema';
  const rawName = (req.headers['x-user-name'] as string) || req.body?.user_name || '';
  const user_name = rawName ? decodeURIComponent(rawName) : (req.body?.full_name || '');
  return { user_id, user_email, user_name };
}

async function checkCanEdit(req: express.Request): Promise<{ allowed: boolean; user_email: string; user_name: string }> {
  const { user_id, user_email, user_name } = getUserFromReq(req);
  if (!user_email || user_email === 'sistema') {
    return { allowed: true, user_email, user_name };
  }
  
  try {
    const { data: users } = await supabase
      .from('users')
      .select('role, full_name')
      .ilike('email', user_email.trim());
      
    const user = users && users.length > 0 ? users[0] : null;
    if (user && (user.role === 'viewer' || user.role === 'conferente')) {
      return { allowed: false, user_email, user_name: user.full_name || user_name };
    }
    return { allowed: true, user_email, user_name: user?.full_name || user_name };
  } catch {
    return { allowed: true, user_email, user_name };
  }
}

// --- API ROUTES ---

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", backend: "supabase", project: supabaseUrl });
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = (email || '').toLowerCase().trim();
    
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .ilike('email', normalizedEmail);

    const user = users && users.length > 0 ? users[0] : null;

    if (error || !user) {
      await logAction(
        null,
        normalizedEmail || 'desconhecido',
        'Tentativa de Login Falhou',
        `Tentativa de acesso com email não cadastrado: "${normalizedEmail}"`
      );
      return res.status(401).json({ error: "Email ou senha inválidos" });
    }

    if (!user.is_active) {
      await logAction(
        user.id,
        user.email,
        'Acesso Bloqueado',
        `Usuário inativo tentou acessar o sistema: "${user.full_name || user.email}"`
      );
      return res.status(403).json({ error: "Sua conta está desativada. Contate o administrador." });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      await logAction(
        user.id,
        user.email,
        'Tentativa de Login Falhou',
        `Senha incorreta informada para o usuário "${user.full_name || user.email}"`
      );
      return res.status(401).json({ error: "Email ou senha inválidos" });
    }

    // Registra o log de auditoria da movimentação de acesso
    await logAction(
      user.id,
      user.email,
      'Acesso ao Sistema (Login)',
      `Usuário "${user.full_name || user.email}" acessou o sistema com sucesso [Perfil: ${user.role || 'user'}]`
    );

    const { password_hash, ...userWithoutPassword } = user;
    res.json({ success: true, user: userWithoutPassword });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  try {
    const { user_id, user_email, user_name } = getUserFromReq(req);
    await logAction(
      user_id || null,
      user_email || 'usuario',
      'Saída do Sistema (Logout)',
      `Usuário "${user_name || user_email || 'Usuário'}" encerrou a sessão no sistema`
    );
    res.json({ success: true });
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
          id: crypto.randomUUID(),
          full_name, 
          email: email.toLowerCase().trim(), 
          password_hash, 
          role: 'user', 
          is_active: true,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single();

    if (error) throw error;

    await logAction(
      data.id,
      data.email,
      'Cadastro de Usuário',
      `Novo usuário cadastrado no sistema: "${data.full_name}" [Perfil: ${data.role}]`
    );
    
    const { password_hash: _, ...userWithoutPassword } = data;
    res.json({ success: true, user: userWithoutPassword });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/audit-logs", async (req, res) => {
  try {
    const { user_id, user_email, action, details } = req.body;
    await logAction(user_id || null, user_email || 'sistema', action, details);
    res.json({ success: true });
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
    const { allowed, user_email, user_name } = await checkCanEdit(req);
    if (!allowed) {
      await logAction(
        null,
        user_email,
        'Tentativa de Alteração Bloqueada',
        `Usuário com perfil conferente "${user_name || user_email}" tentou criar lançamento sem permissão`
      );
      return res.status(403).json({ error: "Acesso negado: Perfil conferente possui apenas permissão de visualização." });
    }

    const { user_id } = getUserFromReq(req);
    const transactionData = { ...req.body };
    if (!transactionData.id) {
      transactionData.id = crypto.randomUUID();
    }

    const { data, error } = await supabase
      .from('transactions')
      .insert([transactionData])
      .select()
      .single();
    if (error) throw error;
      
    await logAction(
      user_id || transactionData.user_id,
      user_email,
      'Criou Lançamento',
      `Por "${user_name || user_email}": Desc: ${transactionData.description}, Valor: ${transactionData.amount}`
    );
      
    res.json({ success: true, id: data.id });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/transactions/:id", async (req, res) => {
  try {
    const { allowed, user_email, user_name } = await checkCanEdit(req);
    if (!allowed) {
      await logAction(
        null,
        user_email,
        'Tentativa de Alteração Bloqueada',
        `Usuário com perfil conferente "${user_name || user_email}" tentou atualizar lançamento sem permissão`
      );
      return res.status(403).json({ error: "Acesso negado: Perfil conferente possui apenas permissão de visualização." });
    }

    const { id } = req.params;
    const { user_id } = getUserFromReq(req);
    const { data, error } = await supabase
      .from('transactions')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
      
    await logAction(
      user_id,
      user_email,
      'Atualizou Lançamento',
      `Por "${user_name || user_email}": ID: ${id}, Status: ${req.body.status || 'Alteração de dados'}`
    );
      
    res.json({ success: true, transaction: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.patch("/api/transactions/:id", async (req, res) => {
  try {
    const { allowed, user_email, user_name } = await checkCanEdit(req);
    if (!allowed) {
      await logAction(
        null,
        user_email,
        'Tentativa de Alteração Bloqueada',
        `Usuário com perfil conferente "${user_name || user_email}" tentou alterar lançamento sem permissão`
      );
      return res.status(403).json({ error: "Acesso negado: Perfil conferente possui apenas permissão de visualização." });
    }

    const { id } = req.params;
    const { user_id } = getUserFromReq(req);
    const { data, error } = await supabase
      .from('transactions')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
      
    await logAction(
      user_id,
      user_email,
      'Patch Lançamento',
      `Por "${user_name || user_email}": ID: ${id}`
    );
      
    res.json({ success: true, transaction: data });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/transactions/:id", async (req, res) => {
  try {
    const { allowed, user_email, user_name } = await checkCanEdit(req);
    if (!allowed) {
      await logAction(
        null,
        user_email,
        'Tentativa de Alteração Bloqueada',
        `Usuário com perfil conferente "${user_name || user_email}" tentou excluir lançamento sem permissão`
      );
      return res.status(403).json({ error: "Acesso negado: Perfil conferente possui apenas permissão de visualização." });
    }

    const { id } = req.params;
    const { user_id } = getUserFromReq(req);
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);
    if (error) throw error;
      
    await logAction(
      user_id,
      user_email,
      'Excluiu Lançamento',
      `Por "${user_name || user_email}": ID: ${id}`
    );
      
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
      .limit(300);
      
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
    const categoryData = { ...req.body };
    if (!categoryData.id) {
      categoryData.id = crypto.randomUUID();
    }

    console.log('Tentando criar categoria com dados:', JSON.stringify(categoryData, null, 2));
    
    const { data, error } = await supabase
      .from('categories')
      .insert([categoryData])
      .select()
      .single();
    
    if (error) {
      console.error('ERRO SUPABASE CATEGORIES:', error);
      return res.status(500).json({ 
        error: "Erro no Banco de Dados", 
        details: error.message,
        hint: error.hint,
        code: error.code,
        sent_data: req.body 
      });
    }
    
    await logAction(null, 'user', 'Criou Categoria', `Nome: ${categoryData.name}, Tipo: ${categoryData.type}`);
    
    res.json({ success: true, id: data.id, category: data });
  } catch (error: any) {
    console.error('ERRO SERVIDOR CATEGORIES:', error);
    res.status(500).json({ 
      error: "Erro Interno do Servidor", 
      message: error.message,
      stack: error.stack
    });
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
          id: crypto.randomUUID(),
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
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.json(settingsObj);
  } catch (error: any) {
    res.json({});
  }
});

app.post("/api/settings", async (req, res) => {
  try {
    const { allowed, user_email, user_name } = await checkCanEdit(req);
    if (!allowed) {
      await logAction(
        null,
        user_email,
        'Tentativa de Alteração Bloqueada',
        `Usuário com perfil conferente "${user_name || user_email}" tentou alterar configurações sem permissão`
      );
      return res.status(403).json({ error: "Acesso negado: Perfil conferente possui apenas permissão de visualização." });
    }

    const settings = req.body;
    const { user_id } = getUserFromReq(req);
    const entries = Object.entries(settings).map(([key, value]) => ({
      key,
      value
    }));

    for (const entry of entries) {
      await supabase
        .from('settings')
        .upsert(entry, { onConflict: 'key' });
    }

    await logAction(
      user_id,
      user_email,
      'Atualizou Configurações',
      `Por "${user_name || user_email}": chaves atualizadas: [${Object.keys(settings).join(', ')}]`
    );

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default app;
