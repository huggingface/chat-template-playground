import type { ActionReturn } from 'svelte/action';

/// placement of the floating element around the anchor element
export type Placement =
	| 'left'
	| 'right'
	| 'top'
	| 'bottom'
	| 'auto'
	| 'prefer-left'
	| 'prefer-right'
	| 'prefer-top'
	| 'prefer-bottom';

/// placement axis
export type Axis = 'x' | 'y';

/// alignment of the floating element against the anchor element
export type Alignment = 'start' | 'center' | 'end' | 'screen' | 'auto' | 'prefer-center';

export interface AbsolutePosition {
	left: string;
	top: string;
	right: string;
	bottom: string;
}

export interface PositionOptions {
	placement?: Placement; /// preferred placement of the floating element
	alignment?: Alignment; /// preferred alignment of the floating element
	hitZoneXMargin?: number; /// page x margin before hitting the edge of the screen
	hitZoneYMargin?: number; /// page y margin before hitting the edge of the screen
	shift?: boolean; /// shift the floating element to center it against the anchor element
	arrowPadding?: number; /// padding for the arrow
	arrowSize?: number; /// size of the arrow
	minMargin?: number; /// minimum margin around the floating element in "screen" alignment
}

/**
 * Compute the best placement for the floating element based on
 * the anchor element position, the page size and a preferred placement.
 */
export function computePlacement(
	anchorBBox: DOMRect,
	floatBBox: DOMRect,
	preferredPlacement: Placement = 'auto',
	pageWidth: number,
	pageHeight: number,
	opts: {
		hitZoneXMargin: number;
		hitZoneYMargin: number;
	} = {
		hitZoneXMargin: 0,
		hitZoneYMargin: 0
	}
): Placement {
	let computedPlacement = preferredPlacement === 'auto' ? 'bottom' : preferredPlacement;
	if (pageHeight > 0 && pageWidth > 0) {
		if (preferredPlacement === 'auto') {
			/// check if the anchor is closer to the top or bottom of the page
			computedPlacement = anchorBBox.top > pageHeight / 2 ? 'top' : 'bottom';
		} else if (
			preferredPlacement === 'prefer-top' ||
			floatBBox.width + opts.hitZoneXMargin >= pageWidth
		) {
			/// check if the toast has enough space to be placed above the anchor
			computedPlacement =
				anchorBBox.top > floatBBox.height + opts.hitZoneYMargin ? 'top' : 'bottom';
		} else if (preferredPlacement === 'prefer-bottom') {
			/// check if the toast has enough space to be placed below the anchor
			computedPlacement =
				anchorBBox.top + anchorBBox.height + floatBBox.height + opts.hitZoneYMargin > pageHeight
					? 'top'
					: 'bottom';
		} else if (preferredPlacement === 'prefer-left') {
			/// check if the toast has enough space to be placed on the left of the anchor
			computedPlacement =
				anchorBBox.left > floatBBox.width + opts.hitZoneXMargin ? 'left' : 'right';
		} else if (preferredPlacement === 'prefer-right') {
			/// check if the toast has enough space to be placed on the right of the anchor
			computedPlacement =
				anchorBBox.left + anchorBBox.width + floatBBox.width + opts.hitZoneXMargin > pageWidth
					? 'left'
					: 'right';
		}
	}
	return computedPlacement;
}

/**
 * Compute the best alignment for the floating element based on
 * the anchor element position, the page size, the placement axis and a preferred alignment.
 */
export function computeAlignment(
	anchorBBox: DOMRect,
	floatingBBox: DOMRect,
	preferredAlignment: Alignment = 'auto',
	axis: Axis = 'y',
	pageWidth: number,
	pageHeight: number,
	opts: {
		hitZoneXMargin: number;
		hitZoneYMargin: number;
	} = {
		hitZoneXMargin: 0,
		hitZoneYMargin: 0
	}
): Alignment {
	let computedAlignment =
		preferredAlignment === 'auto' ? (axis === 'y' ? 'center' : 'start') : preferredAlignment;
	if (['prefer-center', 'auto'].includes(preferredAlignment) && pageWidth > 0) {
		if (floatingBBox.width + opts.hitZoneXMargin * 2 >= pageWidth) {
			/// on mobile, large popovers should be centered and screen wide
			computedAlignment = 'screen';
		} else if (
			axis === 'y' &&
			anchorBBox.left + floatingBBox.width > pageWidth - opts.hitZoneXMargin &&
			anchorBBox.left - floatingBBox.width - opts.hitZoneXMargin < 0
		) {
			/// if the floating element is too wide we center it
			computedAlignment = 'center';
		} else if (
			axis === 'y' &&
			anchorBBox.left + floatingBBox.width > pageWidth - opts.hitZoneXMargin
		) {
			/// align at the end of the anchor when the right edge of the page is too close
			computedAlignment = 'end';
		} else if (axis === 'y' && anchorBBox.left - floatingBBox.width - opts.hitZoneXMargin < 0) {
			/// align at the start of the anchor when the left edge of the page is too close
			computedAlignment = 'start';
		} else if (
			axis === 'x' &&
			anchorBBox.top + floatingBBox.height > pageHeight - opts.hitZoneYMargin
		) {
			/// when placed horizontally, align at the end of the anchor when the top edge of the page is too close
			computedAlignment = 'end';
		} else {
			/// start by default except if prefer-center is set
			computedAlignment = preferredAlignment === 'prefer-center' ? 'center' : 'start';
		}
	}
	return computedAlignment;
}

/**
 * Compute the position of the floating element
 */
export function computePosition(
	anchorBBox: DOMRect,
	floatBBox: DOMRect,
	{
		placement = 'auto',
		alignment = 'auto',
		hitZoneXMargin = 0,
		hitZoneYMargin = 0,
		shift = false,
		arrowPadding = 10,
		arrowSize = 8,
		minMargin = 20
	}: PositionOptions = {}
): { float: AbsolutePosition; arrow: AbsolutePosition } {
	const axis: Axis = ['auto', 'top', 'bottom', 'prefer-top', 'prefer-bottom'].includes(placement)
		? 'y'
		: 'x';

	const computedAlignment = computeAlignment(
		anchorBBox,
		floatBBox,
		alignment,
		axis,
		window.innerWidth,
		window.innerHeight,
		{ hitZoneXMargin, hitZoneYMargin }
	);
	const computedPlacement = computePlacement(
		anchorBBox,
		floatBBox,
		placement,
		window.innerWidth,
		window.innerHeight,
		{
			hitZoneXMargin,
			hitZoneYMargin
		}
	);

	/// position of the anchor element
	const left = anchorBBox.left + window.scrollX;
	const width = anchorBBox.width;
	const height = anchorBBox.height;

	const halfArrowSize = arrowSize / 2;

	let floatingLeft: string = '';
	let floatingTop: string = '';
	let floatingRight: string = '';
	let floatingBottom: string = '';
	let arrowLeft: string = '';
	let arrowTop: string = '';
	let arrowRight: string = '';
	let arrowBottom: string = '';

	switch (computedPlacement) {
		case 'top': {
			floatingBottom = `calc(100% + ${arrowSize}px)`;
			arrowTop = `calc(100% - ${halfArrowSize}px)`;
			break;
		}
		case 'bottom': {
			floatingTop = `calc(100% + ${arrowSize}px)`;
			arrowBottom = `calc(100% - ${halfArrowSize}px)`;
			break;
		}
		case 'left': {
			console.log('left');
			floatingRight = `calc(100% + ${arrowSize}px)`;
			arrowRight = `-${halfArrowSize}px`;
			break;
		}
		case 'right': {
			floatingLeft = `calc(100% + ${arrowSize}px)`;
			arrowLeft = `-${halfArrowSize}px`;
			break;
		}
		default: {
			break;
		}
	}
	if (axis === 'y') {
		/// shift the floating element so the arrow is exactly at the middle of the anchor
		const shiftFloating = shift ? width / 2 - halfArrowSize - arrowPadding : 0;
		switch (computedAlignment) {
			case 'start': {
				floatingLeft = `${shiftFloating}px`;
				floatingRight = 'auto';
				arrowLeft = `${arrowPadding}px`;
				break;
			}
			case 'center': {
				floatingLeft = `-${floatBBox.width / 2 - width / 2}px`;
				floatingRight = 'auto';
				arrowLeft = `calc(50% - ${halfArrowSize}px)`;
				break;
			}
			case 'end': {
				floatingLeft = 'auto';
				floatingRight = `${shiftFloating}px`;
				arrowRight = `${arrowPadding}px`;
				break;
			}
			case 'screen': {
				floatingLeft = `${minMargin - left}px`;
				floatingRight = 'auto';
				arrowLeft = `${left - minMargin + width / 2 - halfArrowSize}px`;
				break;
			}
			default:
				break;
		}
	} else {
		/// shift the floating element so the arrow is exactly at the middle of the anchor
		const popoverShift = shift ? height / 2 - halfArrowSize - arrowPadding : 0;
		switch (computedAlignment) {
			case 'start': {
				floatingTop = `${popoverShift}px`;
				arrowTop = `${floatBBox.height < arrowPadding * 2 ? floatBBox.height / 2 : arrowPadding}px`;
				break;
			}
			case 'center': {
				floatingTop = `-${floatBBox.height / 2 - height / 2}px`;
				arrowTop = `calc(50% - ${halfArrowSize}px)`;
				break;
			}
			case 'end': {
				floatingBottom = `${popoverShift}px`;
				arrowBottom = `${floatBBox.height < arrowPadding * 2 ? floatBBox.height / 2 : arrowPadding}px`;
				break;
			}
			case 'screen': {
				floatingLeft = `${minMargin - left}px`;
				floatingRight = `auto`;
				arrowLeft = `${left - minMargin + width / 2 - halfArrowSize}px`;
				break;
			}
			default:
				break;
		}
	}
	return {
		arrow: { left: arrowLeft, top: arrowTop, right: arrowRight, bottom: arrowBottom },
		float: { left: floatingLeft, top: floatingTop, right: floatingRight, bottom: floatingBottom }
	};
}

const defaultOptions: PositionOptions = {
	placement: 'prefer-top',
	alignment: 'prefer-center',
	hitZoneXMargin: 20,
	hitZoneYMargin: 20,
	shift: true,
	arrowPadding: 10,
	arrowSize: 8,
	minMargin: 10
};

/**
 * Tooltip svelte action,
 *
 * use it with the tooltip text content as a string.
 * ```html
 * <div use:tooltip={"Tooltip content"} />
 * ```
 * or with the tooltip options as an object.
 * ```html
 * <div use:tooltip={{ content: "Tooltip content", opts: { placement: "left", alignment: "end" } }} />
 * ```
 */
export function tooltip(
	node: HTMLElement,
	parameter:
		| string
		| {
				content: string | undefined;
				opts?: PositionOptions;
				showOn?: 'click' | 'hover' | 'hoverTouch' | 'always';
				disabled?: boolean;
		  }
		| undefined
): ActionReturn {
	/// if the tooltip is disabled, or without content, we do nothing
	if (
		parameter === undefined ||
		(typeof parameter === 'string' && !parameter) ||
		(typeof parameter === 'object' && (!parameter.content || parameter.disabled === true))
	) {
		return {};
	}

	let content: string;
	const opts: PositionOptions = { ...defaultOptions };
	let showOn = 'hover';
	if (typeof parameter === 'string') {
		content = parameter;
	} else {
		content = parameter.content as string;
		Object.assign(opts, parameter.opts);
		showOn = parameter.showOn ?? 'hover';
	}

	/// create elements
	const tooltipMask = document.createElement('div');
	tooltipMask.className = 'tooltip-mask hidden';

	const tooltipElt = document.createElement('div');
	tooltipElt.className = 'tooltip';
	tooltipElt.setAttribute('role', 'tooltip');

	const arrowElt = document.createElement('div');
	arrowElt.className = 'tooltip-arrow';

	tooltipElt.appendChild(arrowElt);
	tooltipElt.appendChild(document.createTextNode(content));
	tooltipMask.appendChild(tooltipElt);
	document.body.appendChild(tooltipMask);

	function updateElementPosition(
		element: HTMLElement,
		position: AbsolutePosition | { top: string; left?: string; width?: string; height?: string }
	) {
		for (const [key, value] of Object.entries(position)) {
			element.style[key] = value;
		}
	}

	function updatePositions() {
		updateElementPosition(tooltipMask, {
			top: `${node.getBoundingClientRect().top + window.scrollY}px`,
			left: `${node.getBoundingClientRect().left + window.scrollX}px`,
			width: `${node.getBoundingClientRect().width}px`,
			height: `${node.getBoundingClientRect().height}px`
		});

		const positions = computePosition(
			node.getBoundingClientRect(),
			tooltipElt.getBoundingClientRect(),
			opts
		);

		updateElementPosition(tooltipElt, positions.float);
		updateElementPosition(arrowElt, positions.arrow);
	}

	function show() {
		tooltipMask.classList.remove('hidden');
		updatePositions();

		// eslint-disable-next-line github/prefer-observers
		document.addEventListener('scroll', updatePositions);
		// eslint-disable-next-line github/prefer-observers
		document.addEventListener('resize', updatePositions);
	}

	function hide() {
		tooltipMask.classList.add('hidden');
		document.removeEventListener('scroll', updatePositions);
		document.removeEventListener('resize', updatePositions);
	}

	switch (showOn) {
		case 'click': {
			node.addEventListener('click', show);
			break;
		}
		case 'hoverTouch': {
			node.addEventListener('mouseenter', show);
			node.addEventListener('mouseleave', hide);
			node.addEventListener('touchstart', show);
			node.addEventListener('touchend', hide);
			break;
		}
		case 'hover': {
			node.addEventListener('mouseenter', show);
			node.addEventListener('mouseleave', hide);
			break;
		}
		case 'always': {
			show();
			break;
		}
	}

	return {
		destroy() {
			document.removeEventListener('scroll', updatePositions);
			document.removeEventListener('resize', updatePositions);

			switch (showOn) {
				case 'click': {
					node.removeEventListener('click', show);
					break;
				}
				case 'hoverTouch': {
					node.removeEventListener('mouseenter', show);
					node.removeEventListener('mouseleave', hide);
					node.removeEventListener('touchstart', show);
					node.removeEventListener('touchend', hide);
					break;
				}
				case 'hover': {
					node.removeEventListener('mouseenter', show);
					node.removeEventListener('mouseleave', hide);
					break;
				}
			}
			if (showOn === 'always') {
				tooltipElt.style.opacity = '0';
				setTimeout(() => document.body.removeChild(tooltipMask), 150);
			} else {
				document.body.removeChild(tooltipMask);
			}
		}
	};
}
