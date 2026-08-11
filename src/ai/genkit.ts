import { genkit } from 'genkit';
import openAI, { gpt4oMini } from 'genkitx-openai';

export const ai = genkit({
  plugins: [openAI({ apiKey: process.env.OPENAI_API_KEY })],
  model: gpt4oMini,
});

