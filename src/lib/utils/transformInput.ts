export function transformInput(input: Record<string, unknown>, templateStr: string) {
	// handle cohere special case
	if (templateStr.includes('safety_mode')) {
		input.safety_mode = '';
	}
	return input;
}
