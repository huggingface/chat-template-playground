// original: https://github.com/replit/codemirror-indentation-markers/tree/f2f8ccdc58fcc51dbe6a82784f2f83fa6ac4648c/src/
// combined all 3 files (index.ts, map.ts, utils.ts) from original source into this one file
import { getIndentUnit } from '@codemirror/language';
import type { EditorState, Extension, Line } from '@codemirror/state';
import { combineConfig, Facet, RangeSetBuilder } from '@codemirror/state';
import type { DecorationSet, ViewUpdate, PluginValue } from '@codemirror/view';
import { Decoration, ViewPlugin, EditorView } from '@codemirror/view';

/**
 * Gets the visible lines in the editor. Lines will not be repeated.
 *
 * @param view - The editor view to get the visible lines from.
 * @param state - The editor state. Defaults to the view's current one.
 */
export function getVisibleLines(view: EditorView, state = view.state): Set<Line> {
	const lines = new Set<Line>();

	for (const { from, to } of view.visibleRanges) {
		let pos = from;

		while (pos <= to) {
			const line = state.doc.lineAt(pos);

			if (!lines.has(line)) {
				lines.add(line);
			}

			pos = line.to + 1;
		}
	}

	return lines;
}

/**
 * Gets the line at the position of the primary cursor.
 *
 * @param state - The editor state from which to extract the line.
 */
export function getCurrentLine(state: EditorState): Line {
	const currentPos = state.selection.main.head;
	return state.doc.lineAt(currentPos);
}

/**
 * Returns the number of columns that a string is indented, controlling for
 * tabs. This is useful for determining the indentation level of a line.
 *
 * Note that this only returns the number of _visible_ columns, not the number
 * of whitespace characters at the start of the string.
 *
 * @param str - The string to check.
 * @param tabSize - The size of a tab character. Usually 2 or 4.
 */
export function numColumns(str: string, tabSize: number): number {
	// as far as I can tell, this is pretty much the fastest way to do this,
	// at least involving iteration. `str.length - str.trimStart().length` is
	// much faster, but it has some edge cases that are hard to deal with.

	let col = 0;

	// eslint-disable-next-line no-restricted-syntax, @typescript-eslint/prefer-for-of
	loop: for (let i = 0; i < str.length; i++) {
		switch (str[i]) {
			case ' ': {
				col += 1;
				continue loop;
			}

			case '\t': {
				// if the current column is a multiple of the tab size, we can just
				// add the tab size to the column. otherwise, we need to add the
				// difference between the tab size and the current column.
				col += tabSize - (col % tabSize);
				continue loop;
			}

			case '\r': {
				continue loop;
			}

			default: {
				break loop;
			}
		}
	}

	return col;
}

export interface IndentEntry {
	line: Line;
	col: number;
	level: number;
	empty: boolean;
	active?: number;
}

/**
 * Indentation map for a set of lines.
 *
 * This map will contain the indentation for lines that are not a part of the given set,
 * but this is because calculating the indentation for those lines was necessary to
 * calculate the indentation for the lines provided to the constructor.
 *
 * @see {@link IndentEntry}
 */
export class IndentationMap {
	/** The {@link EditorState} indentation is derived from. */
	private state: EditorState;

	/** The set of lines that are used as an entrypoint. */
	private lines: Set<Line>;

	/** The internal mapping of line numbers to {@link IndentEntry} objects. */
	private map: Map<number, IndentEntry>;

	/** The width of the editor's indent unit. */
	private unitWidth: number;

	/**
	 * @param lines - The set of lines to get the indentation map for.
	 * @param state - The {@link EditorState} to derive the indentation map from.
	 * @param unitWidth - The width of the editor's indent unit.
	 */
	constructor(lines: Set<Line>, state: EditorState, unitWidth: number) {
		this.lines = lines;
		this.state = state;
		this.map = new Map();
		this.unitWidth = unitWidth;

		for (const line of this.lines) {
			this.add(line);
		}

		if (this.state.facet(indentationMarkerConfig).highlightActiveBlock) {
			this.findAndSetActiveLines();
		}
	}

	/**
	 * Checks if the indentation map has an entry for the given line.
	 *
	 * @param line - The {@link Line} or line number to check for.
	 */
	has(line: Line | number): boolean {
		return this.map.has(typeof line === 'number' ? line : line.number);
	}

	/**
	 * Returns the {@link IndentEntry} for the given line.
	 *
	 * Note that this function will throw an error if the line does not exist in the map.
	 *
	 * @param line - The {@link Line} or line number to get the entry for.
	 */
	get(line: Line | number): IndentEntry {
		const entry = this.map.get(typeof line === 'number' ? line : line.number);

		if (!entry) {
			throw new Error('Line not found in indentation map');
		}

		return entry;
	}

	/**
	 * Sets the {@link IndentEntry} for the given line.
	 *
	 * @param line - The {@link Line} to set the entry for.
	 * @param col - The visual beginning whitespace width of the line.
	 * @param level - The indentation level of the line.
	 */
	private set(line: Line, col: number, level: number) {
		const empty = !line.text.trim().length;
		const entry: IndentEntry = { line, col, level, empty };
		this.map.set(entry.line.number, entry);

		return entry;
	}

	/**
	 * Adds a line to the indentation map.
	 *
	 * @param line - The {@link Line} to add to the map.
	 */
	private add(line: Line) {
		if (this.has(line)) {
			return this.get(line);
		}

		// empty lines continue their indentation from surrounding lines
		if (!line.length || !line.text.trim().length) {
			// the very first line, if empty, is just ignored and set as a 0 indent level
			if (line.number === 1) {
				return this.set(line, 0, 0);
			}

			// if we're at the end, we'll just use the previous line's indentation
			if (line.number === this.state.doc.lines) {
				const prev = this.closestNonEmpty(line, -1);

				return this.set(line, 0, prev.level);
			}

			const prev = this.closestNonEmpty(line, -1);
			const next = this.closestNonEmpty(line, 1);

			// if the next line ends the block, we'll use the previous line's indentation
			if (prev.level >= next.level) {
				return this.set(line, 0, prev.level);
			}

			// having an indent marker that starts from an empty line looks weird
			if (prev.empty && prev.level === 0 && next.level !== 0) {
				return this.set(line, 0, 0);
			}

			// if the next indentation level is greater than the previous,
			// we'll only increment up to the next indentation level. this prevents
			// a weirdly "backwards propagating" indentation.
			if (next.level > prev.level) {
				return this.set(line, 0, prev.level + 1);
			}

			// else, we default to the next line's indentation
			return this.set(line, 0, next.level);
		}

		const col = numColumns(line.text, this.state.tabSize);
		const level = Math.floor(col / this.unitWidth);

		return this.set(line, col, level);
	}

	/**
	 * Finds the closest non-empty line, starting from the given line.
	 *
	 * @param from - The {@link Line} to start from.
	 * @param dir - The direction to search in. Either `1` or `-1`.
	 */
	private closestNonEmpty(from: Line, dir: -1 | 1) {
		let lineNo = from.number + dir;

		while (dir === -1 ? lineNo >= 1 : lineNo <= this.state.doc.lines) {
			if (this.has(lineNo)) {
				const entry = this.get(lineNo);
				if (!entry.empty) {
					return entry;
				}
			}

			// we can check if the line is empty, if it's not, we can
			// just create a new entry for it and return it.
			// this prevents us from hitting the beginning/end of the document unnecessarily.

			const line = this.state.doc.line(lineNo);

			if (line.text.trim().length) {
				const col = numColumns(line.text, this.state.tabSize);
				const level = Math.floor(col / this.unitWidth);

				return this.set(line, col, level);
			}

			lineNo += dir;
		}

		// if we're here, we didn't find anything.
		// that means we're at the beginning/end of the document,
		// and the first/last line is empty.

		const line = this.state.doc.line(dir === -1 ? 1 : this.state.doc.lines);

		return this.set(line, 0, 0);
	}

	/**
	 * Finds the state's active block (via the current selection) and sets all
	 * the active indent level for the lines in the block.
	 */
	private findAndSetActiveLines() {
		const currentLine = getCurrentLine(this.state);

		if (!this.has(currentLine)) {
			return;
		}

		let current = this.get(currentLine);

		// check if the current line is starting a new block, if yes, we want to
		// start from inside the block.
		if (this.has(current.line.number + 1)) {
			const next = this.get(current.line.number + 1);
			if (next.level > current.level) {
				current = next;
			}
		}

		// same, but if the current line is ending a block
		if (this.has(current.line.number - 1)) {
			const prev = this.get(current.line.number - 1);
			if (prev.level > current.level) {
				current = prev;
			}
		}

		if (current.level === 0) {
			return;
		}

		current.active = current.level;

		let start: number;
		let end: number;

		// iterate to the start of the block
		for (start = current.line.number; start > 1; start--) {
			if (!this.has(start - 1)) {
				continue;
			}

			const prev = this.get(start - 1);

			if (prev.level < current.level) {
				break;
			}

			prev.active = current.level;
		}

		// iterate to the end of the block
		for (end = current.line.number; end < this.state.doc.lines; end++) {
			if (!this.has(end + 1)) {
				continue;
			}

			const next = this.get(end + 1);

			if (next.level < current.level) {
				break;
			}

			next.active = current.level;
		}
	}
}

// CSS classes:
// - .cm-indent-markers

// CSS variables:
// - --indent-marker-bg-part
// - --indent-marker-active-bg-part

/** Color of inactive indent markers. Based on RUI's var(--background-higher) */
const MARKER_COLOR_LIGHT = '#F0F1F2';
const MARKER_COLOR_DARK = '#2B3245';

/** Color of active indent markers. Based on RUI's var(--background-highest) */
const MARKER_COLOR_ACTIVE_LIGHT = '#E4E5E6';
const MARKER_COLOR_ACTIVE_DARK = '#3C445C';

/** Thickness of indent markers. Probably should be integer pixel values. */
const MARKER_THICKNESS = '1px';

const indentTheme = EditorView.baseTheme({
	'&light': {
		'--indent-marker-bg-color': MARKER_COLOR_LIGHT,
		'--indent-marker-active-bg-color': MARKER_COLOR_ACTIVE_LIGHT
	},

	'&dark': {
		'--indent-marker-bg-color': MARKER_COLOR_DARK,
		'--indent-marker-active-bg-color': MARKER_COLOR_ACTIVE_DARK
	},

	'.cm-line': {
		position: 'relative'
	},

	// this pseudo-element is used to draw the indent markers,
	// while still allowing the line to have its own background.
	'.cm-indent-markers::before': {
		content: '""',
		position: 'absolute',
		top: 0,
		left: '2px',
		right: 0,
		bottom: 0,
		background: 'var(--indent-markers)',
		pointerEvents: 'none'
		// zIndex:        '-1',
	}
});

function createGradient(
	markerCssProperty: string,
	indentWidth: number,
	startOffset: number,
	columns: number
) {
	const gradient = `repeating-linear-gradient(to right, var(${markerCssProperty}) 0 ${MARKER_THICKNESS}, transparent ${MARKER_THICKNESS} ${indentWidth}ch)`;
	// Subtract one pixel from the background width to get rid of artifacts of pixel rounding
	return `${gradient} ${startOffset * indentWidth}.5ch/calc(${indentWidth * columns}ch - 1px) no-repeat`;
}

function makeBackgroundCSS(
	entry: IndentEntry,
	indentWidth: number,
	hideFirstIndent: boolean
): string {
	const { level, active } = entry;
	if (hideFirstIndent && level === 0) {
		return '';
	}
	const startAt = hideFirstIndent ? 1 : 0;
	const backgrounds: string[] = [];

	if (active !== undefined) {
		const markersBeforeActive = active - startAt - 1;
		if (markersBeforeActive > 0) {
			backgrounds.push(
				createGradient('--indent-marker-bg-color', indentWidth, startAt, markersBeforeActive)
			);
		}
		backgrounds.push(createGradient('--indent-marker-active-bg-color', indentWidth, active - 1, 1));
		if (active !== level) {
			backgrounds.push(
				createGradient('--indent-marker-bg-color', indentWidth, active, level - active)
			);
		}
	} else {
		backgrounds.push(
			createGradient('--indent-marker-bg-color', indentWidth, startAt, level - startAt)
		);
	}

	return backgrounds.join(',');
}

interface IndentationMarkerConfiguration {
	/**
	 * Determines whether active block marker is styled differently.
	 */
	highlightActiveBlock?: boolean;

	/**
	 * Determines whether markers in the first column are omitted.
	 */
	hideFirstIndent?: boolean;
}

export const indentationMarkerConfig = Facet.define<
	IndentationMarkerConfiguration,
	Required<IndentationMarkerConfiguration>
>({
	combine(configs) {
		return combineConfig(configs, {
			highlightActiveBlock: true,
			hideFirstIndent: false
		});
	}
});

class IndentMarkersClass implements PluginValue {
	view: EditorView;
	decorations!: DecorationSet;

	private unitWidth: number;
	private currentLineNumber: number;

	constructor(view: EditorView) {
		this.view = view;
		this.unitWidth = getIndentUnit(view.state);
		this.currentLineNumber = getCurrentLine(view.state).number;
		this.generate(view.state);
	}

	update(update: ViewUpdate) {
		const unitWidth = getIndentUnit(update.state);
		const unitWidthChanged = unitWidth !== this.unitWidth;
		if (unitWidthChanged) {
			this.unitWidth = unitWidth;
		}
		const lineNumber = getCurrentLine(update.state).number;
		const lineNumberChanged = lineNumber !== this.currentLineNumber;
		this.currentLineNumber = lineNumber;
		const activeBlockUpdateRequired =
			update.state.facet(indentationMarkerConfig).highlightActiveBlock && lineNumberChanged;
		if (
			update.docChanged ||
			update.viewportChanged ||
			unitWidthChanged ||
			activeBlockUpdateRequired
		) {
			this.generate(update.state);
		}
	}

	private generate(state: EditorState) {
		const builder = new RangeSetBuilder<Decoration>();

		const lines = getVisibleLines(this.view, state);
		const map = new IndentationMap(lines, state, this.unitWidth);
		const { hideFirstIndent } = state.facet(indentationMarkerConfig);

		for (const line of lines) {
			const entry = map.get(line.number);

			if (!entry?.level) {
				continue;
			}

			const backgrounds = makeBackgroundCSS(entry, this.unitWidth, hideFirstIndent);

			builder.add(
				line.from,
				line.from,
				Decoration.line({
					class: 'cm-indent-markers',
					attributes: {
						style: `--indent-markers: ${backgrounds}`
					}
				})
			);
		}

		this.decorations = builder.finish();
	}
}

export function indentationMarkers(config: IndentationMarkerConfiguration = {}): Extension {
	return [
		indentationMarkerConfig.of(config),
		indentTheme,
		ViewPlugin.fromClass(IndentMarkersClass, {
			decorations: (v) => v.decorations
		})
	];
}
