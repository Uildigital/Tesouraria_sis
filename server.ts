import 'dotenv/config';
import app from './api/index.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`[Local Server] Executando na porta ${PORT}`);
  console.log(`[Supabase] URL: ${process.env.VITE_SUPABASE_URL ? 'Sim' : 'Não'}`);
});
