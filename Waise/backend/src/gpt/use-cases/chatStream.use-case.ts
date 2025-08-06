// chatStream.use-case.ts - Chat streaming service
import OpenAI from 'openai';
import { ChatStreamOptions } from './types';
import { generateInternetContext } from './internetGenerator.use-case';

// Simple chat streaming with optional web search
export const chatStreamUseCase = async (openai: OpenAI, options: ChatStreamOptions) => {
  const { prompt, messageHistory = [], useWebSearch = false, selectedLibraries = [], focus = '', ragContext = '' } = options;
  console.log(`[CHAT STREAM] Processing query: "${prompt}"`);
  console.log(`[CHAT STREAM] Web search enabled: ${useWebSearch}`);
  console.log(`[CHAT STREAM] RAG context available: ${ragContext ? 'Yes' : 'No'}`);
  
  // Get web search context if enabled
  let webContext = '';
  if (useWebSearch) {
    try {
      console.log('[CHAT STREAM] Fetching web search context...');
      webContext = await generateInternetContext(prompt);
      console.log('[CHAT STREAM] Web context retrieved successfully');
    } catch (error) {
      console.error('[CHAT STREAM] Web search error:', error);
      webContext = 'Web search was requested but encountered an error.';
    }
  }

  // Prepare system message
  let systemContent = 'You are a helpful and knowledgeable legal assistant specialized in Chilean law. Provide clear, precise, and direct answers to user questions. Respond professionally and avoid inventing specific information that you are not certain about.';
  
  // Add RAG context if available
  if (ragContext) {
    systemContent += '\n\nYou have access to the user\'s uploaded legal documents. Use this information to provide accurate, context-specific answers based on their documents:\n\n--- LEGAL DOCUMENTS CONTEXT ---\n' + ragContext + '\n--- END CONTEXT ---\n\nWhen answering, prioritize information from the user\'s documents and cite the specific documents when relevant.';
  }
  
  // Add web search context if enabled
  if (useWebSearch && webContext) {
    systemContent += '\n\nYou also have access to current web search results for up-to-date information:\n\n--- WEB SEARCH RESULTS ---\n' + webContext + '\n--- END WEB RESULTS ---';
  }

  // Direct response with optional web search context
  const messages = [
    {
      role: 'system' as const,
      content: systemContent
    },
    // Add message history if exists
    ...messageHistory.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content
    })),
    {
      role: 'user' as const,
      content: prompt
    }
  ];

  const stream = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages,
    stream: true,
    temperature: 0.7,
    max_tokens: 1000
  });

  return stream;
};