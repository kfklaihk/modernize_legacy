import axios from 'axios';

const DEEPSEEK_API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY;
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  answer: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Ask a question to DeepSeek AI
 */
export async function askDeepSeek(
  question: string,
  conversationHistory: ChatMessage[] = []
): Promise<ChatResponse> {
  try {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are a helpful and knowledgeable stock market analyst assistant. 
Your role is to help users understand:
- Stock market concepts and terminology
- Investment strategies and risk management
- Analysis of specific stocks and market trends
- Portfolio management advice
- Economic indicators and their impact on markets

Guidelines:
- Be concise and clear in your explanations
- Provide accurate, factual information
- If you're unsure, say so instead of guessing
- Always remind users that this is educational information, not financial advice
- Use simple language when possible, but be thorough
- Include relevant examples when helpful

Focus on Hong Kong, China, and US stock markets as the user primarily trades in these markets.`
      },
      ...conversationHistory,
      {
        role: 'user',
        content: question
      }
    ];

    const response = await axios.post(
      `${DEEPSEEK_BASE_URL}/chat/completions`,
      {
        model: 'deepseek-chat',
        messages: messages,
        max_tokens: 500,
        temperature: 0.7,
        stream: false
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        }
      }
    );

    const answer = response.data.choices[0].message.content;
    const usage = response.data.usage;

    return {
      answer,
      usage
    };
  } catch (error: any) {
    console.error('DeepSeek API Error:', error.response?.data || error.message);
    
    // Return a helpful error message
    if (error.response?.status === 401) {
      return {
        answer: "I'm having trouble connecting to the AI service. Please check if the API key is configured correctly."
      };
    } else if (error.response?.status === 429) {
      return {
        answer: "I'm receiving too many requests right now. Please try again in a moment."
      };
    } else {
      return {
        answer: "I'm sorry, I encountered an error. Please try rephrasing your question or try again later."
      };
    }
  }
}

/**
 * Ask a question about a specific stock
 */
export async function askAboutStock(
  symbol: string,
  market: string,
  question: string
): Promise<string> {
  const enhancedQuestion = `
I have a question about ${symbol} stock in the ${market} market.

Question: ${question}

Please provide insights and analysis.
  `.trim();

  const response = await askDeepSeek(enhancedQuestion);
  return response.answer;
}

/**
 * Get market analysis
 */
export async function getMarketAnalysis(market: string): Promise<string> {
  const question = `Can you provide a brief overview of the current state of the ${market} stock market? What are the key trends and factors affecting it?`;
  
  const response = await askDeepSeek(question);
  return response.answer;
}

/**
 * Get investment advice (general)
 */
export async function getInvestmentAdvice(
  riskLevel: 'low' | 'medium' | 'high'
): Promise<string> {
  const question = `What are some general investment strategies for someone with a ${riskLevel} risk tolerance? Focus on stocks in Hong Kong, China, and US markets.`;
  
  const response = await askDeepSeek(question);
  return response.answer;
}

/**
 * Example questions for users
 */
export const EXAMPLE_QUESTIONS = [
  "What's the difference between Hong Kong and Shanghai stock exchanges?",
  "How do I calculate P/E ratio and what does it mean?",
  "What factors should I consider before buying a stock?",
  "How can I diversify my portfolio across HK, CN, and US markets?",
  "What are the risks of investing in Chinese stocks?",
  "Explain market capitalization and why it matters",
  "What is dividend yield and how is it calculated?",
  "How do economic indicators affect stock prices?",
  "What's the best strategy for long-term investing?",
  "How do I manage risk in my stock portfolio?"
];
