import OpenAI from 'openai';

interface Options {
  prompt: string;
}

export const deepseekstreamStreamUseCase = async (
    DEEPSEEKER: OpenAI,
  { prompt }: Options,
) => {
  const response = await DEEPSEEKER.chat.completions.create({
    model: 'deepseek-chat',
    temperature:1.3,

  

    messages: [
      {
        role: 'system',
        content: `
                daras la mejor respuesta
                `,
      },
      //--------------------------------------------
      {
        role: 'user',
        content: prompt,
      },
    ],

    store: true,
  });

    return response.choices[0].message;
};
