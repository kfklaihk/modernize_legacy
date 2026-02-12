import { useState } from 'react';
import { askDeepSeek, type ChatMessage } from '../lib/deepseek';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export function useAI() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm your AI stock market assistant powered by DeepSeek. Ask me anything about stocks, investing, or market analysis! 📈",
      timestamp: new Date(),
    },
  ]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async (question: string) => {
    if (!question.trim()) return;

    // Add user message
    const userMessage: Message = {
      role: 'user',
      content: question,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);

    setLoading(true);
    try {
      // Convert to ChatMessage format for API
      const conversationHistory: ChatMessage[] = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await askDeepSeek(question, conversationHistory);

      const assistantMessage: Message = {
        role: 'assistant',
        content: response.answer,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again later.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const clearMessages = () => {
    setMessages([
      {
        role: 'assistant',
        content: "Hi! I'm your AI stock market assistant. Ask me anything about stocks, investing, or market analysis! 📈",
        timestamp: new Date(),
      },
    ]);
  };

  return { messages, loading, sendMessage, clearMessages };
}
