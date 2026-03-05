import express from "express";

const app = express();
const PORT = 3000;

app.use(express.json());

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Servidor Ultra Básico Ativo" });
});

// LOGIN TOTALMENTE ABERTO E SEM DEPENDÊNCIAS
app.post("/api/auth/login", (req, res) => {
  console.log('Login ultra básico recebido');
  res.json({ 
    success: true, 
    user: { 
      id: 'admin-id', 
      email: 'admin@exemplo.com', 
      full_name: 'Administrador', 
      role: 'admin' 
    } 
  });
});

// Rota de teste para ver se o Vercel está lendo o arquivo
app.get("/api/test", (req, res) => {
  res.send("O servidor está respondendo!");
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
}

export { app };
