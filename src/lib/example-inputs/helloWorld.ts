import { Template } from '@huggingface/jinja';
import { transformInput } from '$lib/utils/transformInput';

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
					content: 'Hello, how are you?'
				},
				{
					role: 'assistant',
					content: "I'm doing great. How can I help you today?"
				},
				{
					role: 'user',
					content: 'Can you tell me a joke?'
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
					content: 'Hello, how are you?'
				},
				{
					role: 'assistant',
					content: "I'm doing great. How can I help you today?"
				},
				{
					role: 'user',
					content: 'Can you tell me a joke?'
				}
			],
			add_generation_prompt: true
		}
	}
};

export function getExampleHelloWorld(templateStr: string): Record<string, unknown> | undefined {
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
