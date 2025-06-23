import { useState } from "react";

interface UseAIReturn {
  isProcessing: boolean;
  improveText: (text: string) => Promise<string>;
  generateSummary: (text: string) => Promise<string>;
  suggestTags: (text: string) => Promise<string>;
}

// Sleep function for retry delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Real Google AI API call with retry logic
async function callAI(prompt: string, operation: "improve" | "summary" | "tags", retryCount = 0): Promise<string> {
  const API_KEY = "AIzaSyCABV_DqeSOeLSYrqcttxqjJGk4-NLGlgQ";
  
  let systemPrompt = "";
  let userContent = "";
  
  switch (operation) {
    case 'improve':
      systemPrompt = "Você é um especialista em escrita e edição. Sua tarefa é melhorar textos mantendo o significado original, mas aprimorando a gramática, clareza, fluidez e impacto. Responda apenas com o texto melhorado, sem explicações adicionais.";
      userContent = `Melhore este texto: "${prompt}"`;
      break;
    case 'summary':
      systemPrompt = "Você é um especialista em resumos. Crie resumos concisos e informativos que capturem os pontos principais do texto. Use bullet points e emojis quando apropriado.";
      userContent = `Crie um resumo detalhado deste texto: "${prompt}"`;
      break;
    case 'tags':
      systemPrompt = "Você é um especialista em categorização de conteúdo. Analise o texto e sugira tags relevantes em português usando hashtags. Foque em temas, categorias e palavras-chave principais.";
      userContent = `Sugira tags hashtag relevantes para este texto: "${prompt}"`;
      break;
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `${systemPrompt}\n\n${userContent}`
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800,
        }
      })
    });

    if (response.status === 429) {
      // Rate limit hit - retry with exponential backoff
      if (retryCount < 3) {
        const delayMs = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
        console.log(`Rate limit atingido. Tentando novamente em ${delayMs}ms...`);
        await sleep(delayMs);
        return callAI(prompt, operation, retryCount + 1);
      } else {
        throw new Error('RATE_LIMIT_EXCEEDED');
      }
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Erro ao processar resposta da IA.';
  } catch (error) {
    console.error('Erro na chamada da OpenAI:', error);
    
    if (error instanceof Error) {
      if (error.message === 'RATE_LIMIT_EXCEEDED') {
        throw new Error('Limite de uso da IA atingido. Tente novamente em alguns minutos.');
      }
      
      if (error.message.includes('429')) {
        throw new Error('Muitas solicitações à IA. Aguarde alguns segundos e tente novamente.');
      }
      
      if (error.message.includes('401')) {
        throw new Error('Erro de autenticação da IA. Verifique a chave da API.');
      }
      
      if (error.message.includes('403')) {
        throw new Error('Acesso negado à IA. Verifique suas permissões.');
      }
    }
    
    throw new Error('Erro ao conectar com a IA. Verifique sua conexão e tente novamente.');
  }
}

export function useAI(): UseAIReturn {
  const [isProcessing, setIsProcessing] = useState(false);

  const improveText = async (text: string): Promise<string> => {
    setIsProcessing(true);
    try {
      const result = await callAI(text, 'improve');
      return result;
    } finally {
      setIsProcessing(false);
    }
  };

  const generateSummary = async (text: string): Promise<string> => {
    setIsProcessing(true);
    try {
      const result = await callAI(text, 'summary');
      return result;
    } finally {
      setIsProcessing(false);
    }
  };

  const suggestTags = async (text: string): Promise<string> => {
    setIsProcessing(true);
    try {
      const result = await callAI(text, 'tags');
      return result;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    improveText,
    generateSummary,
    suggestTags
  };
}
