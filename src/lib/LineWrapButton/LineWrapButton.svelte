<script lang="ts">
	import { tooltip } from '$lib/utils/tooltip';
	import IconLineWrap from '../Icons/IconLineWrap.svelte';

	export const hydrate = true;

	export let classNames = '';
	export let wrapLines = false;
	export let style: 'blank' | 'button' | 'button-clear' | 'text' = 'text';

	function toggleWrapLines() {
		wrapLines = !wrapLines;
	}

	function onKeyDown(e: KeyboardEvent) {
		const { key, code, altKey } = e;
		// support QWERTY & AZERTY (key "Â" for mac os AZERTY)
		if (((key === 'z' || code === 'KeyZ') && altKey) || key === 'Â') {
			e.preventDefault();
			toggleWrapLines();
		}
	}
</script>

<svelte:window on:keydown={onKeyDown} />

{#key wrapLines}
	<button
		class="border-gray-500 {classNames}
	{style !== 'blank'
			? 'inline-flex cursor-pointer items-center justify-center text-sm focus:outline-hidden'
			: ''}
	{['button', 'button-clear'].includes(style) ? 'bg-white dark:bg-gray-900 dark:text-white' : ''}
	{style === 'text' ? 'mx-0.5' : ''}
	{style === 'button' ? 'btn' : ''}
	{style === 'button-clear' ? 'rounded-md border p-1 shadow-xs' : ''}
"
		type="button"
		on:click={toggleWrapLines}
		use:tooltip={wrapLines ? 'Unwrap lines' : 'Wrap lines'}
		><IconLineWrap classNames={wrapLines ? 'opacity-100' : 'opacity-40'} /></button
	>
{/key}
