import { supabase } from '../lib/supabase';

const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL;

export const n8nService = {
  /**
   * Triggers an n8n workflow for heavy processing (e.g., bank statement parsing)
   */
  async processFile(file: File, organizationId: string, userId: string) {
    if (!N8N_WEBHOOK_URL) {
      console.warn('n8n Webhook URL not configured');
      return { success: false, message: 'Webhook não configurado' };
    }

    try {
      // 1. Upload file to Supabase Storage first to get a URL
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${organizationId}/processing/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      // 2. Send the URL and context to n8n
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileUrl: publicUrl,
          organizationId,
          userId,
          fileName: file.name,
          timestamp: new Date().toISOString()
        }),
      });

      if (!response.ok) throw new Error('Falha ao enviar para n8n');

      return { success: true, data: await response.json() };
    } catch (error: any) {
      console.error('n8n processing error:', error);
      return { success: false, error: error.message };
    }
  }
};
