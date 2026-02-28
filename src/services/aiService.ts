import { GoogleGenAI, Type } from "@google/genai";

export const aiService = {
  async suggestCategory(description: string, categories: any[]) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY not found");
      return null;
    }

    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-3-flash-preview";

    const categoriesList = categories.map(c => `${c.id}: ${c.name} (${c.type === 'income' ? 'Receita' : 'Despesa'})`).join("\n");

    const prompt = `
      Você é um assistente financeiro especializado em igrejas.
      Dada a descrição de um lançamento financeiro e uma lista de categorias, sugira a categoria mais adequada.
      
      Descrição: "${description}"
      
      Categorias Disponíveis:
      ${categoriesList}
      
      Responda APENAS com o ID da categoria sugerida. Se não tiver certeza, responda "null".
    `;

    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });

      const text = response.text?.trim();
      return text && text !== "null" ? text : null;
    } catch (error) {
      console.error("Error suggesting category:", error);
      return null;
    }
  },

  async analyzeFinancialHealth(stats: any) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return "Configure a chave de API para receber insights.";

    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-3-flash-preview";

    const prompt = `
      Analise os seguintes dados financeiros de uma igreja e forneça um insight curto (máximo 2 frases) e encorajador.
      Entradas: ${stats.income}
      Saídas: ${stats.expenses}
      Saldo Atual: ${stats.currentBalance}
      Saldo Mês Anterior: ${stats.previousBalance}
    `;

    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
      });
      return response.text;
    } catch (error) {
      return "Continue monitorando suas finanças com dedicação.";
    }
  }
};
