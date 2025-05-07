/// Mostly similar to https://codemirror.net/docs/ref/#codemirror.basicSetup
/// src: https://github.com/codemirror/basic-setup/blob/main/src/codemirror.ts
import type { Extension } from '@codemirror/state';
import {
	highlightActiveLineGutter,
	highlightSpecialChars,
	drawSelection,
	dropCursor,
	rectangularSelection,
	crosshairCursor,
	highlightActiveLine,
	keymap
} from '@codemirror/view';
export { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import {
	indentOnInput,
	syntaxHighlighting,
	defaultHighlightStyle,
	bracketMatching,
	foldKeymap
} from '@codemirror/language';
import { history, defaultKeymap, historyKeymap } from '@codemirror/commands';
import {
	closeBrackets,
	autocompletion,
	closeBracketsKeymap,
	completionKeymap
} from '@codemirror/autocomplete';
import { indentationMarkers } from './indentationMarkers';

export const basicSetup: Extension = /*@__PURE__*/ (() => [
	highlightActiveLineGutter(),
	highlightSpecialChars(),
	history(),
	drawSelection(),
	dropCursor(),
	EditorState.allowMultipleSelections.of(true),
	indentOnInput(),
	syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
	bracketMatching(),
	closeBrackets(),
	autocompletion(),
	rectangularSelection(),
	crosshairCursor(),
	highlightActiveLine(),
	keymap.of([
		...closeBracketsKeymap,
		...defaultKeymap,
		...historyKeymap,
		...foldKeymap,
		...completionKeymap
	]),
	indentationMarkers({
		highlightActiveBlock: false
	})
])();
