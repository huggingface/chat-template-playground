<!-- original from: https://github.com/touchifyapp/svelte-codemirror-editor/blob/main/src/lib/CodeMirror.svelte -->
<script lang="ts">
	import type { ViewUpdate } from '@codemirror/view';

	import { createEventDispatcher, onMount } from 'svelte';
	import { EditorView, keymap, placeholder as placeholderExt } from '@codemirror/view';
	import { StateEffect, EditorState, type Extension } from '@codemirror/state';
	import { indentWithTab } from '@codemirror/commands';
	import { oneDark } from '@codemirror/theme-one-dark';

	import IconSpin from '../Icons/IconSpin.svelte';

	import { basicSetup } from './basicSetup';
	import CodeMirrorSearch from '$lib/CodeMirrorSearch/CodeMirrorSearch.svelte';

	export let classNames = '';
	export let loaderClassNames = '';
	export let value = '';
	export let fontSize: string | undefined = undefined;

	export let basic = true;
	export let extensions: Extension[] = [];

	export let useTab = true;

	export let editable = true;
	export let readonly = false;
	export let placeholder: string | HTMLElement | null | undefined = undefined;
	export let focusOnMount = false;
	export let view: EditorView | undefined = undefined;

	const isBrowser = typeof window !== 'undefined';
	const dispatch = createEventDispatcher<{ change: string }>();
	let element: HTMLDivElement;
	let isSearchOpen = false;

	$: reconfigure(), extensions;
	$: setDoc(value);

	function setDoc(newDoc: string) {
		if (view && newDoc !== view.state.doc.toString()) {
			view.dispatch({
				changes: {
					from: 0,
					to: view.state.doc.length,
					insert: newDoc
				}
			});
		}
	}

	function createEditorView(): EditorView {
		return new EditorView({
			parent: element,
			state: createEditorState(value)
		});
	}

	function handleChange(vu: ViewUpdate): void {
		if (vu.docChanged) {
			const doc = vu.state.doc;
			const text = doc.toString();
			dispatch('change', text);
		}
	}

	function getExtensions() {
		const stateExtensions = [
			...getBaseExtensions(basic, useTab, placeholder, editable, readonly),
			...getTheme(),
			...extensions
		];
		return stateExtensions;
	}

	function createEditorState(value: string | null | undefined): EditorState {
		return EditorState.create({
			doc: value ?? undefined,
			extensions: getExtensions()
		});
	}

	function getBaseExtensions(
		basic: boolean,
		useTab: boolean,
		placeholder: string | HTMLElement | null | undefined,
		editable: boolean,
		readonly: boolean
	): Extension[] {
		const extensions: Extension[] = [
			EditorView.editable.of(editable),
			EditorState.readOnly.of(readonly)
		];

		if (basic) {
			extensions.push(basicSetup);
		}
		if (useTab) {
			extensions.push(keymap.of([indentWithTab]));
		}
		if (placeholder) {
			extensions.push(placeholderExt(placeholder));
		}
		if (fontSize) {
			extensions.push(
				EditorView.theme({
					'&': {
						fontSize: fontSize
					}
				})
			);
		}

		extensions.push(EditorView.updateListener.of(handleChange));
		return extensions;
	}

	function getTheme(): Extension[] {
		const extensions: Extension[] = [];
		const isDarkMode = document.querySelector('body')?.classList.contains('dark') ?? false;
		if (isDarkMode) {
			extensions.push(oneDark);
		}
		return extensions;
	}

	function reconfigure(): void {
		view?.dispatch({
			effects: StateEffect.reconfigure.of(getExtensions())
		});
	}

	function onKeyDown(e: KeyboardEvent) {
		const { ctrlKey, metaKey, key } = e;
		const isOpenShortcut = key === 'f3' || ((metaKey || ctrlKey) && key === 'f');
		if (isOpenShortcut) {
			isSearchOpen = true;
			e.preventDefault();
		}
	}

	onMount(() => {
		view = createEditorView();
		if (view && focusOnMount) {
			const tr = view.state.update({
				selection: { anchor: view.state.doc.length }
			});
			view.dispatch(tr);
			view.focus();
		}
		return () => view?.destroy();
	});
</script>

{#if isBrowser}
	<div class="relative">
		<div class="codemirror-wrapper {classNames}" bind:this={element} on:keydown={onKeyDown} />
		{#if isSearchOpen && view}
			<CodeMirrorSearch {view} on:close={() => (isSearchOpen = false)} />
		{/if}
	</div>
{:else}
	<div class="flex h-64 items-center justify-center {loaderClassNames}">
		<IconSpin classNames="animate-spin text-xs" />
	</div>
{/if}
