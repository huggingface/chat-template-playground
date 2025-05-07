<script lang="ts">
	import JsonEditor from '$lib/JsonEditor/JsonEditor.svelte';
	import ChatTemplateViewer from '$lib/ChatTemplateViewer/ChatTemplateViewer.svelte';
	import OutputViewer from '$lib/OutputViewer/OutputViewer.svelte';
	import type { ChatTemplate, FormattedChatTemplate } from '$lib/ChatTemplateViewer/types';
	import { onMount } from 'svelte';
	import { Template } from '@huggingface/jinja';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let modelId = $page.url.searchParams.get('modelId') ?? 'Qwen/Qwen3-235B-A22B';
	let formattedTemplates: FormattedChatTemplate[] = [];
	let selectedTemplate: FormattedChatTemplate | undefined = undefined;
	let showFormattedTemplate = true;
	let selectedExampleInputId = '';

	let leftWidth = 50; // percent
	let isDraggingVertical = false;

	let topHeight = 50; // percent (for right pane)
	let isDraggingHorizontal = false;

	let error = '';
	let output = '';

	let input = {
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
	};

	$: {
		try {
			if (!input.messages) {
				error = "Invalid JSON: missing 'messages' key";
			}

			if (selectedTemplate) {
				const template = new Template(
					showFormattedTemplate ? selectedTemplate.formattedTemplate : selectedTemplate.template
				);
				output = template.render(input);
				error = '';
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Unknown error';
		}
	}

	function startDragVertical(e: MouseEvent) {
		isDraggingVertical = true;
		document.body.style.cursor = 'col-resize';
	}

	function stopDragVertical() {
		isDraggingVertical = false;
		document.body.style.cursor = '';
	}

	function onDragVertical(e: MouseEvent) {
		if (!isDraggingVertical) return;
		const playground = document.getElementById('playground-container');
		if (!playground) return;
		const rect = playground.getBoundingClientRect();
		const offsetX = e.clientX - rect.left;
		let percent = (offsetX / rect.width) * 100;
		if (percent < 10) percent = 10;
		if (percent > 90) percent = 90;
		leftWidth = percent;
	}

	function startDragHorizontal(e: MouseEvent) {
		isDraggingHorizontal = true;
		document.body.style.cursor = 'row-resize';
	}

	function stopDragHorizontal() {
		isDraggingHorizontal = false;
		document.body.style.cursor = '';
	}

	function onDragHorizontal(e: MouseEvent) {
		if (!isDraggingHorizontal) return;
		const rightPane = document.getElementById('right-pane');
		if (!rightPane) return;
		const rect = rightPane.getBoundingClientRect();
		const offsetY = e.clientY - rect.top;
		let percent = (offsetY / rect.height) * 100;
		if (percent < 10) percent = 10;
		if (percent > 90) percent = 90;
		topHeight = percent;
	}

	async function getChatTemplate(modelId: string) {
		try {
			const res = await fetch('https://huggingface.co/api/models/' + modelId);

			if (!res.ok) {
				alert(`Failed to fetch model "${modelId}": ${res.status} ${res.statusText}`);
				return;
			}

			const model = await res.json();

			let chatTemplate: ChatTemplate | undefined = undefined;

			if (model.config?.chat_template_jinja) {
				//  model.config.chat_template_jinja & optional model.config.additional_chat_templates
				chatTemplate = model.config.chat_template_jinja;
				if (model.config?.additional_chat_templates) {
					chatTemplate = [
						{
							name: 'default',
							template: model.config.chat_template_jinja
						},
						...(model.config?.additional_chat_templates
							? Object.keys(model.config.additional_chat_templates).map((name) => ({
									name,
									template: model.config?.additional_chat_templates?.[name] ?? ''
								}))
							: [])
					];
				}
			} else if (model.config?.processor_config?.chat_template) {
				// for backward compatibility VLM
				chatTemplate = model.config.processor_config.chat_template;
			} else if (model.config?.tokenizer_config?.chat_template) {
				// for backward compatibility
				chatTemplate = model.config.tokenizer_config.chat_template;
			} else if (model.gguf?.chat_template) {
				// for GGUF models
				chatTemplate = model.gguf.chat_template;
			}

			const formattedTemplates: FormattedChatTemplate[] = (
				typeof chatTemplate === 'string'
					? [{ name: 'default', template: chatTemplate }]
					: chatTemplate
			) // Convert string template to array for unified handling
				.map(({ name, template }) => ({
					name,
					template,
					formattedTemplate: (() => {
						try {
							return new Template(template).format();
						} catch (error) {
							console.error(`Error formatting chat template ${name}:`, error);
							return template; // Return the original template in case of an error
						}
					})()
				})) // add formatted template attribute
				.map(({ name, template, formattedTemplate }) => ({
					name,
					template,
					formattedTemplate,
					templateUnedited: template,
					formattedTemplateUnedited: formattedTemplate
				}));

			let selectedTemplate =
				formattedTemplates.find(({ name }) => name === $page.url.searchParams.get('template')) ??
				formattedTemplates[0];

			return { formattedTemplates, selectedTemplate, model };
		} catch (error) {
			console.error(error);
		}
	}

	async function handleModelIdChange(newModelId: string, opts?: { replaceState?: boolean }) {
		const modelTemplate = await getChatTemplate(newModelId);
		if (modelTemplate) {
			modelId = newModelId;
			formattedTemplates = modelTemplate.formattedTemplates;
			selectedTemplate = modelTemplate.selectedTemplate;
			const model = modelTemplate.model;
			input = {
				...input,
				bos_token: model?.config?.tokenizer_config?.bos_token?.content ?? model?.gguf?.bos_token,
				eos_token: model?.config?.tokenizer_config?.eos_token?.content ?? model?.gguf?.eos_token,
				pad_token: model?.config?.tokenizer_config?.pad_token?.content ?? model?.gguf?.pad_token,
				unk_token: model?.config?.tokenizer_config?.unk_token?.content ?? model?.gguf?.unk_token
			};

			if (opts?.replaceState) {
				updateParams();
			}
		}
	}

	function updateParams() {
		let searchParams = '?modelId=' + modelId;
		if (selectedTemplate && selectedTemplate.name !== 'default') {
			searchParams += '&template=' + selectedTemplate.name;
		}
		if (selectedExampleInputId) {
			searchParams += '&example=' + selectedExampleInputId;
		}

		goto(searchParams, { replaceState: true });

		// post message to parent
		const parentOrigin = 'https://huggingface.co';
		window.parent.postMessage({ queryString: searchParams }, parentOrigin);
	}

	onMount(async () => {
		await handleModelIdChange(modelId);
	});
</script>

<svelte:window
	on:mousemove={onDragVertical}
	on:mouseup={stopDragVertical}
	on:mousemove={onDragHorizontal}
	on:mouseup={stopDragHorizontal}
/>

<div
	id="playground-container"
	class="relative flex h-screen w-full overflow-hidden border bg-white shadow select-none dark:bg-gray-950"
>
	<div class="overflow-auto" style="width: {leftWidth}%">
		{#if formattedTemplates.length}
			<ChatTemplateViewer
				{modelId}
				{formattedTemplates}
				bind:selectedTemplate
				bind:showFormattedTemplate
				on:modelIdChange={(e) => handleModelIdChange(e.detail, { replaceState: true })}
				on:templateChange={(e) => updateParams()}
			/>
		{/if}
	</div>

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="hidden h-full w-1 cursor-col-resize items-center justify-center bg-gray-100 select-none hover:bg-blue-200 active:bg-blue-200 sm:flex dark:bg-gray-700 dark:hover:bg-blue-900 dark:active:bg-blue-900"
		style="left: calc({leftWidth}% - 4px); z-index:10;"
		on:mousedown={startDragVertical}
	>
		<div class="h-12 w-[0.05rem] rounded-full bg-gray-400"></div>
	</div>

	<div
		id="right-pane"
		class="relative flex h-full flex-col bg-gray-100"
		style="width: {100 - leftWidth}%"
	>
		{#key `${modelId}-${selectedTemplate?.name}`}
			<div class="w-full" style="height: {topHeight}%">
				<!-- Right top pane -->
				<JsonEditor
					bind:error
					bind:content={input}
					bind:selectedTemplate
					bind:selectedExampleInputId
					on:exampleChange={(e) => updateParams()}
				/>
			</div>
		{/key}

		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="hidden h-1 w-full cursor-row-resize items-center justify-center bg-gray-100 select-none hover:bg-blue-200 active:bg-blue-200 sm:flex dark:bg-gray-700 dark:hover:bg-blue-900 dark:active:bg-blue-900"
			style="top: calc({topHeight}% - 4px); z-index:10;"
			on:mousedown={startDragHorizontal}
		>
			<div class="h-[0.05rem] w-12 rounded-full bg-gray-400"></div>
		</div>

		<div class="w-full" style="height: {100 - topHeight}%">
			<!-- Right bottom pane -->
			<OutputViewer content={output} {error} />
		</div>
	</div>
</div>
