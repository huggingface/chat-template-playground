<!-- references are:
https://github.com/codemirror/search
https://codemirror.net/docs/ref/#search
-->
<script lang="ts">
	import type { EditorView } from '@codemirror/view';

	import { onMount, createEventDispatcher } from 'svelte';
	import {
		SearchQuery,
		findPrevious,
		findNext,
		setSearchQuery,
		replaceNext,
		replaceAll
	} from '@codemirror/search';

	import IconCaretV2 from '../Icons/IconCaretV2.svelte';
	import IconArrowLeft from '../Icons/IconArrowLeft.svelte';
	import IconCross from '../Icons/IconCross.svelte';
	import IconReplace from '../Icons/IconReplace.svelte';
	import IconReplaceAll from '../Icons/IconReplaceAll.svelte';

	export let view: EditorView;

	let el: HTMLDivElement;
	let searchTxtEl: HTMLInputElement;
	let searchTxt = '';
	let replaceTxt = '';
	let isCaseSensitive = false;
	let isRegexp = false;
	let isWholeWord = false;
	let isReplacePanelOpen = false;

	const dispatch = createEventDispatcher<{ close: void }>();

	$: query = new SearchQuery({
		search: searchTxt,
		caseSensitive: isCaseSensitive,
		wholeWord: isWholeWord,
		regexp: isRegexp,
		replace: replaceTxt
	});

	$: query, search();

	// positionSearchPanel is no longer needed since we use CSS for top-right positioning.

	function destroyDefaultPanel() {
		// hack to prevent default CodeMirror search box appearing
		// when you use {findNext, etc...} from @codemirror/search, it tries to automatically create default CodeMirror search box
		const el = document.querySelector('.codemirror-wrapper .cm-search');
		el?.parentElement?.removeChild(el);
	}

	function getSelectedText(editorView: EditorView) {
		const state = editorView.state;
		const selection = state.selection;
		const selectedText = selection.ranges
			.map((range) => state.doc.sliceString(range.from, range.to))
			.join('\n');
		return selectedText;
	}

	function search() {
		destroyDefaultPanel();
		view?.dispatch({ effects: setSearchQuery.of(query) });
		if (searchTxt && view) {
			findPrevious(view);
			findNext(view);
		} else {
			reset();
		}
	}

	function reset() {
		// send and empty query
		view?.dispatch({
			effects: setSearchQuery.of(
				new SearchQuery({
					search: ''
				})
			)
		});
	}

	function onKeyDownWindow(e: KeyboardEvent) {
		const { ctrlKey, metaKey, key, shiftKey } = e;
		const cmdKey = metaKey || ctrlKey;
		const isOpenShortcut = key === 'f3' || (cmdKey && key === 'f');
		const isNextOrPrevShortcut = cmdKey && key === 'g';
		const isCloseShortcut = key === 'Escape' || key === 'Esc';
		if (isOpenShortcut) {
			e.preventDefault();
			searchTxt = getSelectedText(view);
			searchTxtEl.focus();
		} else if (isNextOrPrevShortcut) {
			e.preventDefault();
			shiftKey ? findPrevious(view) : findNext(view);
		} else if (isCloseShortcut) {
			dispatch('close');
		}
	}

	function onKeyDownEl(e: KeyboardEvent) {
		const { key } = e;
		const isNextShortcut = key === 'Enter';
		if (isNextShortcut) {
			e.preventDefault();
			findNext(view);
		}
	}

	onMount(() => {
		searchTxt = getSelectedText(view);
		searchTxtEl.focus();

		// Switch from absolute to fixed and preserve position
		if (el) {
			const rect = el.getBoundingClientRect();
			el.style.position = 'fixed';
			el.style.top = rect.top + 'px';
			el.style.left = rect.left + 'px';
			el.style.right = 'auto'; // Remove right if present
			el.classList.remove('absolute');
			el.classList.add('fixed');
		}

		return reset;
	});
</script>

<svelte:window on:keydown={onKeyDownWindow} />

<div
	bind:this={el}
	class="absolute top-0 right-0 z-20 rounded-sm border border-gray-500 bg-white dark:bg-gray-900 dark:text-white"
	on:keydown={onKeyDownEl}
>
	<div class="flex border-b border-gray-500">
		<button
			type="button"
			class="border-r border-gray-500 px-0.5"
			on:click={() => (isReplacePanelOpen = !isReplacePanelOpen)}
		>
			<IconCaretV2 classNames="h-full {isReplacePanelOpen ? '' : '-rotate-90'}" />
		</button>
		<div class="my-1">
			<div class="flex items-center">
				<div class="flex w-[250px] items-center bg-gray-100 dark:bg-gray-800">
					<input
						type="text"
						class="w-full border-0 bg-transparent py-1 pr-[4.3rem] pl-2 text-sm"
						bind:value={searchTxt}
						bind:this={searchTxtEl}
					/>
					<!-- buttons: case sensetive, full word, regex -->
					<div
						class="-ml-[4.3rem] flex w-16 items-center justify-between gap-0.5 font-mono select-none"
					>
						<button
							type="button"
							title="Match Case"
							class="rounded-sm px-0.5 text-sm {isCaseSensitive ? 'bg-black text-white' : ''}"
							on:click={() => (isCaseSensitive = !isCaseSensitive)}
						>
							Aa
						</button>
						<button
							type="button"
							title="Match Whole Word"
							class="rounded-sm px-0.5 text-sm underline {isWholeWord ? 'bg-black text-white' : ''}"
							on:click={() => (isWholeWord = !isWholeWord)}
						>
							ab
						</button>
						<button
							type="button"
							title="Use Regular Expression"
							class="rounded-sm px-0.5 text-sm {isRegexp ? 'bg-black text-white' : ''}"
							on:click={() => (isRegexp = !isRegexp)}
						>
							re
						</button>
					</div>
				</div>
				<!-- buttons: find next, find previous, close search panel -->
				<div class="mx-2 flex items-center gap-0.5 select-none">
					<button type="button" title="Next Match" on:click={() => findNext(view)}>
						<IconArrowLeft classNames="-rotate-90" />
					</button>
					<button type="button" title="Previous Match" on:click={() => findPrevious(view)}>
						<IconArrowLeft classNames="rotate-90" />
					</button>
					<button type="button" title="Close" on:click={() => dispatch('close')}>
						<IconCross />
					</button>
				</div>
			</div>
			{#if isReplacePanelOpen}
				<div class="mt-1 flex items-center">
					<input
						type="text"
						bind:value={replaceTxt}
						class="w-[250px] border-0 bg-gray-100 py-1 pl-2 text-sm dark:bg-gray-800"
					/>
					<div class="ml-1 flex items-center gap-0.5 select-none">
						<button type="button" title="Replace" on:click={() => replaceNext(view)}>
							<IconReplace classNames="text-base" />
						</button>
						<button type="button" title="Replace All" on:click={() => replaceAll(view)}>
							<IconReplaceAll classNames="text-base" />
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>
