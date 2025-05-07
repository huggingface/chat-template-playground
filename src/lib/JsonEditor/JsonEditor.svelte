<script lang="ts">
	import CodeMirror from '$lib/CodeMirror/CodeMirror.svelte';
	import { EditorView, lineNumbers } from '@codemirror/view';
	import CopyButton from '$lib/CopyButton/CopyButton.svelte';
	import { javascript } from '@codemirror/lang-javascript';
	import { linter, lintGutter, type Diagnostic } from '@codemirror/lint';
	import LineWrapButton from '$lib/LineWrapButton/LineWrapButton.svelte';
	import JSON5 from 'json5';
	import type { FormattedChatTemplate } from '../ChatTemplateViewer/types';
	import { getExampleHelloWorld } from '$lib/example-inputs/helloWorld';
	import { onMount } from 'svelte';
	import { getExampleToolUsage } from '$lib/example-inputs/toolUsage';
	import { foldGutter } from '@codemirror/language';
	import { getExampleReasoning } from '$lib/example-inputs/reasoning';
	import { tooltip } from '$lib/utils/tooltip';
	import IconRestart from '$lib/Icons/IconRestart.svelte';
	import { createEventDispatcher } from 'svelte';
	import { page } from '$app/stores';
	import { transformInput } from '$lib/utils/transformInput';

	export let content: Record<string, unknown> = {};
	export let error = '';
	export let selectedTemplate: FormattedChatTemplate | undefined = undefined;
	export let selectedExampleInputId = '';

	const dispatch = createEventDispatcher<{ exampleChange: void }>();

	let value = JSON5.stringify(content, null, 2);
	let wrapLines = true;
	let exampleInputs: { id: string; label: string; content: Record<string, unknown> }[] = [];
	let exampleValue = '';

	async function handleUpdateEditor(e: CustomEvent<string>) {
		const currentCode = e.detail;
		try {
			content = JSON5.parse(currentCode);
			value = currentCode;
			error = '';
		} catch (e) {
			console.error(e);
			error = 'Error in input JSON';
		}
	}

	function jsonLinter() {
		return (view: EditorView): Diagnostic[] => {
			const diagnostics: Diagnostic[] = [];
			const text = view.state.doc.toString();

			try {
				// Attempt to parse the JSON5
				JSON5.parse(text);
			} catch (e) {
				let pos = 0;
				let errorMessage = '';

				if (e && typeof e === 'object') {
					errorMessage = e.message || '';
					// Prefer JSON5 error properties if available
					const line = e.lineNumber;
					const column = e.columnNumber;
					if (typeof line === 'number' && typeof column === 'number') {
						// Convert line/column to character offset
						let runningPos = 0;
						let currentLine = 1;
						for (let i = 0; i < text.length; i++) {
							if (currentLine === line && runningPos === column - 1) {
								pos = i;
								break;
							}
							if (text[i] === '\n') {
								currentLine++;
								runningPos = 0;
							} else {
								runningPos++;
							}
						}
					} else {
						// Fallback: try to extract from message
						const match = /at position (\d+)/.exec(errorMessage);
						if (match) {
							pos = parseInt(match[1], 10);
						} else {
							const lineMatch = /line (\d+) column (\d+)/.exec(errorMessage);
							if (lineMatch) {
								const l = parseInt(lineMatch[1], 10);
								const c = parseInt(lineMatch[2], 10);
								let runningPos = 0;
								let currentLine = 1;
								for (let i = 0; i < text.length; i++) {
									if (currentLine === l && runningPos === c - 1) {
										pos = i;
										break;
									}
									if (text[i] === '\n') {
										currentLine++;
										runningPos = 0;
									} else {
										runningPos++;
									}
								}
							}
						}
					}
				}
				diagnostics.push({
					from: Math.max(0, pos - 1),
					to: Math.min(text.length, pos + 1),
					severity: 'error',
					message: `JSON Error: ${errorMessage}`
				});
			}

			return diagnostics;
		};
	}

	function handleExampleInputChange(e: Event) {
		const target = e.target as HTMLSelectElement;
		const selectedId = target.value;
		const selectedExampleInput = exampleInputs.find(
			(exampleInput) => exampleInput.id === selectedId
		);
		if (selectedExampleInput) {
			selectedExampleInputId = selectedId;
			content = selectedExampleInput.content;
			value = JSON5.stringify(content, null, 2);
			exampleValue = value;
			dispatch('exampleChange');
		}
	}

	onMount(() => {
		if (selectedTemplate) {
			const exampleHelloWorld = getExampleHelloWorld(selectedTemplate.template);
			if (exampleHelloWorld) {
				exampleInputs = [
					...exampleInputs,
					{
						id: 'hello-world',
						label: 'hello world example',
						content: transformInput(exampleHelloWorld, selectedTemplate.template)
					}
				];
			}

			const exampleReasoning = getExampleReasoning(selectedTemplate.template);
			if (exampleReasoning) {
				exampleInputs = [
					...exampleInputs,
					{
						id: 'reasoning',
						label: 'reasoning example',
						content: transformInput(exampleReasoning, selectedTemplate.template)
					}
				];
			}

			const exampleToolUsage = getExampleToolUsage(selectedTemplate.template);
			if (exampleToolUsage) {
				exampleInputs = [
					...exampleInputs,
					{
						id: 'tool-usage',
						label: 'tool usage example',
						content: transformInput(exampleToolUsage, selectedTemplate.template)
					}
				];
			}

			const exampleFromQuery = $page.url.searchParams.get('example');
			if (exampleFromQuery) {
				const exampleInput = exampleInputs.find(
					(exampleInput) => exampleInput.id === exampleFromQuery
				);
				if (exampleInput) {
					content = exampleInput.content;
					value = JSON5.stringify(content, null, 2);
					exampleValue = value;
					selectedExampleInputId = exampleInput.id;
					return;
				}
			}

			content = exampleInputs.at(-1)?.content ?? {};
			selectedExampleInputId = exampleInputs.at(-1)?.id ?? '';
			value = JSON5.stringify(content, null, 2);
			exampleValue = value;
		}
	});
</script>

<div class="h-full overflow-scroll bg-white dark:bg-gray-900">
	<div class="sticky top-0 z-10 bg-white dark:bg-gray-900">
		<div
			class="text-semibold flex items-center gap-x-2 border-b border-gray-500 bg-linear-to-r from-orange-200 to-white px-3 py-1.5 text-lg dark:from-orange-700 dark:to-orange-900 dark:text-gray-200"
		>
			JSON Input

			{#if exampleInputs.length > 1}
				<select
					class="ml-auto rounded border px-1 py-0.5 text-sm"
					on:change={handleExampleInputChange}
				>
					{#each exampleInputs as exampleInput}
						<option value={exampleInput.id} selected={exampleInput.id === selectedExampleInputId}
							>{exampleInput.label}</option
						>
					{/each}
				</select>
			{/if}
		</div>
		<div class="flex items-center border-b px-3 py-2">
			<div class="ml-auto flex items-center gap-x-2">
				<!-- reset button -->
				{#if exampleValue && exampleValue !== value}
					<button
						class="relative inline-flex h-6! cursor-pointer items-center justify-center rounded-md border border-gray-500 bg-white p-0! px-1.5! text-sm shadow-xs focus:outline-hidden dark:bg-gray-900 dark:text-white [&_svg]:translate-x-px! [&_svg]:translate-y-px! [&_svg]:text-base!"
						type="button"
						on:click={() => {
							value = exampleValue;
						}}
						use:tooltip={'Reset example to original'}
						><IconRestart classNames="dark:text-gray-200!" />
						<span class="ml-1 text-sm select-none dark:text-gray-200!"> Reset </span>
					</button>
				{/if}

				<CopyButton
					label="Copy"
					{value}
					style="button-clear"
					classNames="h-6! [&_svg]:text-[0.7rem]! px-1.5! text-black! dark:text-gray-200!"
				/>

				<LineWrapButton
					style="button-clear"
					bind:wrapLines
					classNames="[&_svg]:text-xs! size-6! p-0!"
				/>
			</div>
		</div>
	</div>
	<CodeMirror
		{value}
		on:change={handleUpdateEditor}
		extensions={[
			lineNumbers(),
			javascript({ jsx: false, typescript: false }),
			linter(jsonLinter()),
			lintGutter(),
			foldGutter(),
			...[wrapLines ? [EditorView.lineWrapping] : []]
		]}
	/>
</div>
