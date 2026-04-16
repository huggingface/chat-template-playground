<script lang="ts">
	import CodeMirror from '$lib/CodeMirror/CodeMirror.svelte';
	import CopyButton from '$lib/CopyButton/CopyButton.svelte';
	import LineWrapButton from '$lib/LineWrapButton/LineWrapButton.svelte';
	import { EditorView } from '@codemirror/view';

	export let content = '';
	export let error;

	let wrapLines = true;
</script>

<div class="h-full overflow-scroll bg-white dark:bg-gray-900">
	<div class="sticky top-0 z-10 bg-white dark:bg-gray-900">
		<div
			class="flex items-center gap-x-2 border-b border-gray-200 px-3 py-1.5 dark:border-gray-700"
		>
			<span class="text-xs font-semibold text-gray-800 sm:text-sm dark:text-gray-200">Output</span>
			{#if !error}
				<div class="ml-auto flex items-center gap-x-2">
					<CopyButton
						label="Copy"
						value={content}
						style="button-clear"
						classNames="h-6! [&_svg]:text-[0.7rem]! px-1.5! text-black! dark:text-gray-200!"
					/>

					<LineWrapButton
						style="button-clear"
						bind:wrapLines
						classNames="[&_svg]:text-xs! size-6! p-0!"
					/>
				</div>
			{/if}
		</div>
		{#if error}
			<div class="alert alert-error">
				{error}
			</div>
		{/if}
	</div>
	{#if !error}
		<CodeMirror
			value={content}
			readonly
			extensions={[wrapLines ? [EditorView.lineWrapping] : []]}
		/>
	{/if}
</div>
