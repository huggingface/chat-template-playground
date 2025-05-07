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
			class="text-semibold flex items-center gap-x-2 border-b border-gray-500 bg-linear-to-r from-green-200 to-white px-3 py-1.5 text-lg dark:from-green-700 dark:to-green-900 dark:text-gray-200"
		>
			Chat template{formattedTemplates.length > 1 ? 's' : ''} for
			<a class="font-mono underline" href="https://huggingface.co/{modelId}" target="_blank"
				>{modelId}</a
			>
			<button
				class="btn ml-auto text-sm"
				on:click={() => {
					const newModelId = prompt('Enter model ID (ex: deepseek-ai/DeepSeek-R1)')?.trim();
					if (newModelId) {
						dispatch('modelIdChange', newModelId);
					}
				}}>change model</button
			>
		</div>
		<div class="flex items-center border-b px-3 py-2">
			{#if formattedTemplates.length > 1}
				<div class="my-1.5 flex flex-wrap items-center gap-x-1 gap-y-0.5">
					{#each formattedTemplates as template (template.name)}
						<button
							class="text-md flex items-center rounded-lg border px-1.5 py-1 leading-none select-none
								 {selectedTemplate?.name === template.name
								? 'border-gray-800 bg-black text-white dark:bg-gray-700'
								: 'cursor-pointer text-gray-500 opacity-90 hover:text-gray-700 hover:shadow-xs dark:hover:text-gray-200'}"
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
			<div class="ml-auto flex items-center gap-x-2">
				<!-- reset button -->
				{#if showFormattedTemplate ? selectedTemplate?.formattedTemplate !== selectedTemplate?.formattedTemplateUnedited : selectedTemplate?.template !== selectedTemplate?.templateUnedited}
					<button
						class="relative inline-flex h-6! cursor-pointer items-center justify-center rounded-md border border-gray-500 bg-white p-0! px-1.5! text-sm shadow-xs focus:outline-hidden dark:bg-gray-900 dark:text-white [&_svg]:translate-x-px! [&_svg]:translate-y-px! [&_svg]:text-base!"
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
						<span class="ml-1 text-sm select-none dark:text-gray-200!"> Reset </span>
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
					class="relative inline-flex h-6! cursor-pointer items-center justify-center rounded-md border border-gray-500 bg-white p-0! px-1.5! text-sm shadow-xs focus:outline-hidden dark:bg-gray-900 dark:text-white [&_svg]:translate-x-px! [&_svg]:translate-y-px! [&_svg]:text-base!"
					type="button"
					on:click={() => {
						showFormattedTemplate = !showFormattedTemplate;
					}}
					use:tooltip={'Format with @huggingface/jinja'}
					><IconCodeGeneration classNames={showFormattedTemplate ? 'opacity-100' : 'opacity-40'} />
					<span
						class="ml-1 text-sm select-none {showFormattedTemplate ? 'opacity-100' : 'opacity-40'}"
					>
						Formatted
					</span>
				</button>

				<LineWrapButton
					style="button-clear"
					bind:wrapLines
					classNames="[&_svg]:text-xs! size-6! p-0!"
				/>
			</div>
		</div>
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
