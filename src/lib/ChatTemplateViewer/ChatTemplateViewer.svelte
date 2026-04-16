<script lang="ts">
	import { StreamLanguage } from '@codemirror/language';
	import CodeMirror from '$lib/CodeMirror/CodeMirror.svelte';
	import { jinja2 } from '@codemirror/legacy-modes/mode/jinja2';
	import { EditorView, lineNumbers } from '@codemirror/view';
	import CopyButton from '$lib/CopyButton/CopyButton.svelte';
	import IconCodeGeneration from '$lib/Icons/IconCodeGeneration.svelte';
	import { tooltip } from '$lib/utils/tooltip';
	import type { FormattedChatTemplate } from './types';
	import LineWrapButton from '$lib/LineWrapButton/LineWrapButton.svelte';
	import { createEventDispatcher } from 'svelte';
	import IconRestart from '$lib/Icons/IconRestart.svelte';

	export let modelId: string;
	export let formattedTemplates: FormattedChatTemplate[] = [];
	export let selectedTemplate: FormattedChatTemplate | undefined = undefined;
	export let showFormattedTemplate = true;

	let wrapLines = true;

	const dispatch = createEventDispatcher<{ modelIdChange: string; templateChange: string }>();

	async function handleUpdateEditor(e: CustomEvent<string>) {
		const currentCode = e.detail;
		if (selectedTemplate) {
			showFormattedTemplate
				? (selectedTemplate.formattedTemplate = currentCode)
				: (selectedTemplate.template = currentCode);
		}
	}
</script>

<div class="h-full overflow-scroll bg-white dark:bg-gray-900">
	<div class="sticky top-0 z-10 bg-white dark:bg-gray-900">
		<div
			class="flex items-center gap-x-2 border-b border-gray-200 px-3 py-1.5 dark:border-gray-700"
		>
			<span class="hidden text-sm font-semibold text-gray-800 sm:inline dark:text-gray-200">
				Chat template{formattedTemplates.length > 1 ? 's' : ''} for
			</span>
			<a
				class="truncate font-mono text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
				href="https://huggingface.co/{modelId}"
				target="_blank">{modelId}</a
			>
			<div class="ml-auto flex items-center gap-x-2">
				<!-- reset button -->
				{#if showFormattedTemplate ? selectedTemplate?.formattedTemplate !== selectedTemplate?.formattedTemplateUnedited : selectedTemplate?.template !== selectedTemplate?.templateUnedited}
					<button
						class="relative inline-flex h-6! cursor-pointer items-center justify-center rounded-md border border-gray-200 bg-white p-0! px-1.5! text-sm focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white [&_svg]:text-base!"
						type="button"
						on:click={() => {
							if (selectedTemplate) {
								showFormattedTemplate
									? (selectedTemplate.formattedTemplate =
											selectedTemplate.formattedTemplateUnedited)
									: (selectedTemplate.template = selectedTemplate.templateUnedited);
							}
						}}
						use:tooltip={'Reset template to original'}
						><IconRestart classNames="dark:text-gray-200!" />
						<span class="ml-1 hidden text-sm select-none sm:inline dark:text-gray-200!">
							Reset
						</span>
					</button>
				{/if}

				<CopyButton
					label="Copy"
					value={showFormattedTemplate
						? (selectedTemplate?.formattedTemplate ?? '')
						: (selectedTemplate?.template ?? '')}
					style="button-clear"
					classNames="h-6! [&_svg]:text-[0.7rem]! px-1.5! text-black! dark:text-gray-200!"
				/>

				<!-- format button -->
				<button
					class="relative inline-flex h-6! cursor-pointer items-center justify-center rounded-md border border-gray-200 bg-white p-0! px-1.5! text-sm focus:outline-hidden dark:border-gray-700 dark:bg-gray-800 dark:text-white [&_svg]:text-base!"
					type="button"
					on:click={() => {
						showFormattedTemplate = !showFormattedTemplate;
					}}
					use:tooltip={'Format with @huggingface/jinja'}
					><IconCodeGeneration classNames={showFormattedTemplate ? 'opacity-100' : 'opacity-40'} />
					<span
						class="ml-1 hidden text-sm select-none sm:inline {showFormattedTemplate
							? 'opacity-100'
							: 'opacity-40'}"
					>
						Formatted
					</span>
				</button>

				<LineWrapButton
					style="button-clear"
					bind:wrapLines
					classNames="[&_svg]:text-xs! size-6! p-0!"
				/>

				<button
					class="btn text-xs"
					on:click={() => {
						const newModelId = prompt('Enter model ID (ex: deepseek-ai/DeepSeek-R1)')?.trim();
						if (newModelId) {
							dispatch('modelIdChange', newModelId);
						}
					}}
					><span class="hidden sm:inline">change model</span><span class="sm:hidden">...</span
					></button
				>
			</div>
		</div>
		{#if formattedTemplates.length > 1}
			<div
				class="flex flex-wrap items-center gap-x-1 gap-y-0.5 border-b border-gray-200 px-3 py-1.5 dark:border-gray-700"
			>
				{#each formattedTemplates as template (template.name)}
					<button
						class="flex items-center rounded-md border px-1.5 py-0.5 text-xs leading-none select-none
							 {selectedTemplate?.name === template.name
							? 'border-gray-800 bg-black text-white dark:bg-gray-700'
							: 'cursor-pointer border-gray-200 text-gray-500 opacity-90 hover:bg-gray-50 hover:text-gray-700 dark:border-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-200'}"
						type="button"
						on:click={() => {
							selectedTemplate = template;
							dispatch('templateChange', template.name);
						}}
					>
						{template.name}
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<CodeMirror
		value={showFormattedTemplate
			? (selectedTemplate?.formattedTemplate ?? '')
			: (selectedTemplate?.template ?? '')}
		on:change={handleUpdateEditor}
		extensions={[
			lineNumbers(),
			StreamLanguage.define(jinja2),
			...[wrapLines ? [EditorView.lineWrapping] : []]
		]}
	/>
</div>
