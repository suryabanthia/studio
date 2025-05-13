// src/ai/flows/prompt-optimizer.ts
'use server';
/**
 * @fileOverview An AI-powered prompt optimizer flow.
 *
 * This file defines a Genkit flow that takes a prompt as input and provides suggestions
 * for improving its quality and effectiveness. It exports the PromptOptimizerInput,
 * PromptOptimizerOutput types, and the optimizePrompt function to be used by the Next.js
 * application.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const PromptOptimizerInputSchema = z.object({
  prompt: z.string().describe('The prompt to be optimized.'),
});
export type PromptOptimizerInput = z.infer<typeof PromptOptimizerInputSchema>;

const PromptOptimizerOutputSchema = z.object({
  suggestions: z.array(
    z.string().describe('Suggestions for improving the prompt.')
  ).describe('A list of suggestions to improve the prompt.')
});
export type PromptOptimizerOutput = z.infer<typeof PromptOptimizerOutputSchema>;

export async function optimizePrompt(input: PromptOptimizerInput): Promise<PromptOptimizerOutput> {
  return optimizePromptFlow(input);
}

const optimizePromptPrompt = ai.definePrompt({
  name: 'optimizePromptPrompt',
  input: {schema: PromptOptimizerInputSchema},
  output: {schema: PromptOptimizerOutputSchema},
  prompt: `You are an AI prompt optimizer.  Given a prompt, you will provide a list of suggestions for improving its quality and effectiveness.  Be specific and actionable.

Prompt: {{{prompt}}}`,
});

const optimizePromptFlow = ai.defineFlow(
  {
    name: 'optimizePromptFlow',
    inputSchema: PromptOptimizerInputSchema,
    outputSchema: PromptOptimizerOutputSchema,
  },
  async input => {
    const {output} = await optimizePromptPrompt(input);
    return output!;
  }
);
