// aiChat.use-case.ts - AI Chat streaming service
import OpenAI from 'openai';

interface AiChatOptions {
  prompt: string;
}

export const aiChatStreamUseCase = async (
  aiClient: OpenAI,
  { prompt }: AiChatOptions,
) => {
  const response = await aiClient.chat.completions.create({
    model: 'deepseek-chat',
    temperature: 0.7,
    stream: true,
    messages: [
      {
        role: 'system',
        content: `You are a helpful and knowledgeable assistant. Provide clear, precise, and direct answers to user questions. Respond professionally and avoid inventing specific information about projects, companies, or data that you are not certain about.`,
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    store: true,
  });

  return response;
};
