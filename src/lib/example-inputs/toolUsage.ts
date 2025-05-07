import { transformInput } from '$lib/utils/transformInput';
import { Template } from '@huggingface/jinja';

const variations = {
	variation1_qwen_xml_style: {
		description:
			"This variation reflects how Qwen-like models might structure tool definitions in the system message using XML-like tags and how tool responses are often wrapped. The assistant's tool invocation uses a standard `tool_calls` array which the template would then format into the model's expected string.",
		example: {
			messages: [
				{
					role: 'system',
					content:
						'You are a helpful assistant that can use tools to get information for the user.\n\n# Tools\n\nYou may call one or more functions to assist with the user query.\n\nYou are provided with function signatures within <tools></tools> XML tags:\n<tools>\n{"name": "get_weather", "description": "Get current weather information for a location", "parameters": {"type": "object", "properties": {"location": {"type": "string", "description": "The city and state, e.g. San Francisco, CA"}, "unit": {"type": "string", "enum": ["celsius", "fahrenheit"], "description": "The unit of temperature to use"}}, "required": ["location"]}}\n</tools>\n\nFor each function call, return a json object with function name and arguments within <tool_call></tool_call> XML tags.'
				},
				{
					role: 'user',
					content: "What's the weather like in New York?"
				},
				{
					role: 'assistant',
					content:
						"<think>\nThe user is asking about the weather in New York. I should use the weather tool to get this information.\n</think>\nI'll check the current weather in New York for you.",
					tool_calls: [
						{
							function: {
								name: 'get_weather',
								arguments: {
									location: 'New York',
									unit: 'celsius'
								}
							}
						}
					]
				},
				{
					role: 'user',
					content:
						'<tool_response>\n{"temperature": 22, "condition": "Sunny", "humidity": 45, "wind_speed": 10}\n</tool_response>'
				},
				{
					role: 'assistant',
					content:
						"The weather in New York is currently sunny with a temperature of 22°C. The humidity is at 45% with a wind speed of 10 km/h. It's a great day to be outside!"
				},
				{
					role: 'user',
					content: 'Thanks! What about Boston?'
				}
			],
			tools: [
				{
					name: 'get_weather',
					description: 'Get current weather information for a location',
					parameters: {
						type: 'object',
						properties: {
							location: {
								type: 'string',
								description: 'The city and state, e.g. San Francisco, CA'
							},
							unit: {
								type: 'string',
								enum: ['celsius', 'fahrenheit'],
								description: 'The unit of temperature to use'
							}
						},
						required: ['location']
					}
				}
			],
			add_generation_prompt: true
		}
	},
	variation3_deepseek_special_tags_style: {
		description:
			'This variation reflects DeepSeek-like models using specialized tags for tool calls. The `tool_calls` array in the assistant message would contain arguments as a JSON string, which the template then formats with specific tags and markdown.',
		example: {
			messages: [
				{
					role: 'system',
					content: 'You are a helpful assistant.'
				},
				{
					role: 'user',
					content: "What's the weather like in New York?"
				},
				{
					role: 'assistant',
					content:
						"<think>\nThe user is asking about the weather in New York. I should use the weather tool to get this information.\n</think>\nI'll check the current weather in New York for you.",
					tool_calls: [
						{
							type: 'function',
							function: {
								name: 'get_weather',
								arguments: '{"location": "New York", "unit": "celsius"}'
							}
						}
					]
				},
				{
					role: 'tool',
					content: '{"temperature": 22, "condition": "Sunny", "humidity": 45, "wind_speed": 10}'
				},
				{
					role: 'assistant',
					content:
						"The weather in New York is currently sunny with a temperature of 22°C. The humidity is at 45% with a wind speed of 10 km/h. It's a great day to be outside!"
				},
				{
					role: 'user',
					content: 'Thanks! What about Boston?'
				}
			],
			tools: [
				{
					name: 'get_weather',
					description: 'Get current weather information for a location',
					parameters: {
						type: 'object',
						properties: {
							location: {
								type: 'string',
								description: 'The city and state, e.g. San Francisco, CA'
							},
							unit: {
								type: 'string',
								enum: ['celsius', 'fahrenheit'],
								description: 'The unit of temperature to use'
							}
						},
						required: ['location']
					}
				}
			],
			add_generation_prompt: true
		}
	},
	variation4_mistral_tags_style: {
		description:
			"This variation demonstrates the Mistral-like approach using `[AVAILABLE_TOOLS]` (implicitly handled by the template from the 'tools' array), `[TOOL_CALLS]` with IDs, and `[TOOL_RESULTS]`.",
		example: {
			messages: [
				{
					role: 'system',
					content: 'You are a helpful assistant that can use tools to get information for the user.'
				},
				{
					role: 'user',
					content: "What's the weather like in New York?"
				},
				{
					role: 'assistant',
					content:
						"<think>\nThe user is asking about the weather in New York. I should use the weather tool to get this information.\n</think>\nI'll check the current weather in New York for you.",
					tool_calls: [
						{
							id: 'call_weather_nyc_001',
							function: {
								name: 'get_weather',
								arguments: {
									location: 'New York',
									unit: 'celsius'
								}
							}
						}
					]
				},
				{
					role: 'tool',
					tool_call_id: 'call_weather_nyc_001',
					content: '{"temperature": 22, "condition": "Sunny", "humidity": 45, "wind_speed": 10}'
				},
				{
					role: 'assistant',
					content:
						"The weather in New York is currently sunny with a temperature of 22°C. The humidity is at 45% with a wind speed of 10 km/h. It's a great day to be outside!"
				},
				{
					role: 'user',
					content: 'Thanks! What about Boston?'
				}
			],
			tools: [
				{
					name: 'get_weather',
					description: 'Get current weather information for a location',
					parameters: {
						type: 'object',
						properties: {
							location: {
								type: 'string',
								description: 'The city and state, e.g. San Francisco, CA'
							},
							unit: {
								type: 'string',
								enum: ['celsius', 'fahrenheit'],
								description: 'The unit of temperature to use'
							}
						},
						required: ['location']
					}
				}
			],
			add_generation_prompt: true
		}
	},
	variation5_generic_openai_anthropic_style: {
		description:
			'This is the generic style, often compatible with OpenAI and Anthropic models, similar to your provided example. It serves as a baseline.',
		example: {
			messages: [
				{
					role: 'system',
					content: 'You are a helpful assistant that can use tools to get information for the user.'
				},
				{
					role: 'user',
					content: "What's the weather like in New York?"
				},
				{
					role: 'assistant',
					content:
						"<think>\nThe user is asking about the weather in New York. I should use the weather tool to get this information.\n</think>\nI'll check the current weather in New York for you.",
					tool_calls: [
						{
							function: {
								name: 'get_weather',
								arguments: {
									location: 'New York',
									unit: 'celsius'
								}
							}
						}
					]
				},
				{
					role: 'tool',
					content: '{"temperature": 22, "condition": "Sunny", "humidity": 45, "wind_speed": 10}'
				},
				{
					role: 'assistant',
					content:
						"The weather in New York is currently sunny with a temperature of 22°C. The humidity is at 45% with a wind speed of 10 km/h. It's a great day to be outside!"
				},
				{
					role: 'user',
					content: 'Thanks! What about Boston?'
				}
			],
			tools: [
				{
					name: 'get_weather',
					description: 'Get current weather information for a location',
					parameters: {
						type: 'object',
						properties: {
							location: {
								type: 'string',
								description: 'The city and state, e.g. San Francisco, CA'
							},
							unit: {
								type: 'string',
								enum: ['celsius', 'fahrenheit'],
								description: 'The unit of temperature to use'
							}
						},
						required: ['location']
					}
				}
			],
			add_generation_prompt: true
		}
	},
	variation6_granite_style: {
		description:
			"This variation reflects Granite-like models where the tool call might be embedded directly in the assistant's content string, prefixed by a special tag like `<|tool_call|>`. The `available_tools` would be passed to the template engine.",
		example: {
			messages: [
				{
					role: 'system',
					content:
						"You are Granite, developed by IBM. You are a helpful assistant with access to the following tools. When a tool is required to answer the user's query, respond only with <|tool_call|> followed by a JSON list of tools used."
				},
				{
					role: 'user',
					content: "What's the weather like in New York?"
				},
				{
					role: 'assistant',
					content:
						'<think>\nThe user is asking about the weather in New York. I should use the weather tool to get this information.\n</think>\nI\'ll check the current weather in New York for you.\n<|tool_call|>[{"name": "get_weather", "arguments": {"location": "New York", "unit": "celsius"}}]'
				},
				{
					role: 'tool',
					content: '{"temperature": 22, "condition": "Sunny", "humidity": 45, "wind_speed": 10}'
				},
				{
					role: 'assistant',
					content:
						"The weather in New York is currently sunny with a temperature of 22°C. The humidity is at 45% with a wind speed of 10 km/h. It's a great day to be outside!"
				},
				{
					role: 'user',
					content: 'Thanks! What about Boston?'
				}
			],
			tools: [
				{
					name: 'get_weather',
					description: 'Get current weather information for a location',
					parameters: {
						type: 'object',
						properties: {
							location: {
								type: 'string',
								description: 'The city and state, e.g. San Francisco, CA'
							},
							unit: {
								type: 'string',
								enum: ['celsius', 'fahrenheit'],
								description: 'The unit of temperature to use'
							}
						},
						required: ['location']
					}
				}
			],
			add_generation_prompt: true
		}
	},
	variation2_llama3_style: {
		description:
			"This variation shows how Llama-3.1-like models might handle tool definitions passed within the first user message. The assistant's invocation uses a standard `tool_calls` array.",
		example: {
			messages: [
				{
					role: 'system',
					content:
						'Environment: ipython\nCutting Knowledge Date: December 2023\nToday Date: 2025-05-14\n\nYou are a helpful assistant.'
				},
				{
					role: 'user',
					content:
						'Given the following functions, please respond with a JSON for a function call with its proper arguments that best answers the given prompt.\n\nRespond in the format {"name": function name, "parameters": dictionary of argument name and its value}.\nDo not use variables.\n\n[\n  {\n    "name": "get_weather",\n    "description": "Get current weather information for a location",\n    "parameters": {\n      "type": "object",\n      "properties": {\n        "location": {\n          "type": "string",\n          "description": "The city and state, e.g. San Francisco, CA"\n        },\n        "unit": {\n          "type": "string",\n          "enum": ["celsius", "fahrenheit"],\n          "description": "The unit of temperature to use"\n        }\n      },\n      "required": ["location"]\n    }\n  }\n]\n\nWhat\'s the weather like in New York?'
				},
				{
					role: 'assistant',
					content:
						"<think>\nThe user is asking about the weather in New York. I should use the weather tool to get this information.\n</think>\nI'll check the current weather in New York for you.",
					tool_calls: [
						{
							function: {
								name: 'get_weather',
								arguments: {
									location: 'New York',
									unit: 'celsius'
								}
							}
						}
					]
				},
				{
					role: 'tool',
					content: '{"temperature": 22, "condition": "Sunny", "humidity": 45, "wind_speed": 10}'
				},
				{
					role: 'assistant',
					content:
						"The weather in New York is currently sunny with a temperature of 22°C. The humidity is at 45% with a wind speed of 10 km/h. It's a great day to be outside!"
				},
				{
					role: 'user',
					content: 'Thanks! What about Boston?'
				}
			],
			tools: null,
			add_generation_prompt: true
		}
	}
};

export function getExampleToolUsage(templateStr: string): Record<string, unknown> | undefined {
	const template = new Template(templateStr);
	for (const variation of Object.values(variations)) {
		try {
			const variationRendered = template.render(transformInput(variation.example, templateStr));
			if (variationRendered.includes('get_weather')) {
				return variation.example;
			}
		} catch (e) {
			console.error(e);
		}
	}
	return undefined;
}
