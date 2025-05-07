import { transformInput } from '$lib/utils/transformInput';
import { Template } from '@huggingface/jinja';

const variations = {
	variation1_with_system_prompt: {
		description: 'Variation with system prompt',
		example: {
			messages: [
				{
					role: 'system',
					content: 'You are a helpful assistant.'
				},
				{
					role: 'user',
					content: 'What is the capital of France?'
				},
				{
					role: 'assistant',
					content:
						'<think>The user is asking for the capital of France. This is a factual question. I know this information.</think>The capital of France is Paris.'
				},
				{
					role: 'user',
					content: 'What about Chile?'
				}
			],
			add_generation_prompt: true
		}
	},
	variation2_without_system_prompt: {
		description: 'Variation without system prompt',
		example: {
			messages: [
				{
					role: 'user',
					content: 'What is the capital of France?'
				},
				{
					role: 'assistant',
					content:
						'<think>The user is asking for the capital of France. This is a factual question. I know this information.</think>The capital of France is Paris.'
				},
				{
					role: 'user',
					content: 'What about Chile?'
				}
			],
			add_generation_prompt: true
		}
	}
};

export function getExampleReasoning(templateStr: string): Record<string, unknown> | undefined {
	if (!templateStr.includes('think>')) {
		return;
	}
	const template = new Template(templateStr);
	const variationSystemPrompt = variations.variation1_with_system_prompt.example;
	const variationSystemPromptRendered = template.render(
		transformInput(variationSystemPrompt, templateStr)
	);
	if (variationSystemPromptRendered.includes('You are a helpful assistant.')) {
		return variations.variation1_with_system_prompt.example;
	}
	return variations.variation2_without_system_prompt.example;
}
