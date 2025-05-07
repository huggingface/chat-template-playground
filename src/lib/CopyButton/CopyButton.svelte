<script lang="ts">
	import type { SvelteComponent } from 'svelte';

	import { onDestroy } from 'svelte';

	import IconCopy from '../Icons/IconCopy.svelte';
	import { tooltip } from '../utils/tooltip';

	export const hydrate = true;

	export let classNames = '';
	export let label = '';
	export let noIcon = false;
	export let icon: typeof SvelteComponent | undefined = undefined;
	export let style: 'blank' | 'button' | 'button-clear' | 'text' = 'text';
	export let title = '';
	export let value: string;
	export let successType: 'tooltip' | 'text' = 'tooltip';
	export let successText: string = 'Copied';

	let isSuccess = false;
	let timeout: any;

	onDestroy(() => {
		if (timeout) {
			clearTimeout(timeout);
		}
	});

	function handleClick() {
		copyToClipboard(value);
		isSuccess = true;
		if (timeout) {
			clearTimeout(timeout);
		}
		timeout = setTimeout(() => {
			isSuccess = false;
		}, 1000);
	}

	function copyToClipboard(value: string): void {
		const textArea = document.createElement('textarea');
		document.body.appendChild(textArea);
		textArea.value = value;
		textArea.select();
		document.execCommand('copy');
		document.body.removeChild(textArea);
	}
</script>

{#key isSuccess}
	<button
		class="border-gray-500 {classNames}
		{style !== 'blank' ? 'inline-flex cursor-pointer items-center text-sm focus:outline-hidden' : ''}
		{['button', 'button-clear'].includes(style) ? 'bg-white dark:bg-gray-900' : ''}
		{style === 'text' ? 'mx-0.5' : ''}
		{style === 'button' ? 'btn' : ''}
		{style === 'button-clear' ? 'rounded-md border p-1 shadow-xs' : ''}
		{!isSuccess && ['button-clear', 'text'].includes(style) ? 'text-gray-600' : ''}
		{isSuccess && style !== 'blank' ? 'text-green-500' : ''}
	"
		on:click|preventDefault|stopPropagation={handleClick}
		title={title || label || 'Copy to clipboard'}
		type="button"
		use:tooltip={{
			content: successText,
			disabled: successType !== 'tooltip' || !isSuccess,
			showOn: 'always',
			opts: { placement: 'bottom' }
		}}
	>
		{#if !noIcon}
			<svelte:component this={icon ?? IconCopy} />
		{/if}
		{#if label}
			{#if isSuccess && successType === 'text'}
				<span class="ml-1.5">{successText}</span>
			{:else}
				<span class="ml-1.5 {style === 'text' ? 'underline' : ''}">
					{label}
				</span>
			{/if}
		{/if}
	</button>
{/key}
