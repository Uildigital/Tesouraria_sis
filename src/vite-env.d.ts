/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: "https://rzrgffegyvcaseyreanh.supabase.co"
  readonly VITE_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6cmdmZmVneXZjYXNleXJlYW5oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIyMTU0MzQsImV4cCI6MjA4Nzc5MTQzNH0.pSoU1WmjDfGtXWd_2vnxgQ2rMqwtfyznfR3dCsuxl9w"
  readonly VITE_N8N_WEBHOOK_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
