import { __ } from '@wordpress/i18n';
import { toPng, toJpeg } from 'html-to-image';
import { setDpi } from './set-dpi';

const HIDE_PLACEHOLDERS_CSS = `
[data-blockshot-canvas]:focus,
[data-blockshot-canvas]:focus-visible {
	box-shadow: none !important;
	outline: none !important;
}
[data-blockshot-canvas] [data-rich-text-placeholder],
[data-blockshot-canvas] [data-placeholder],
[data-blockshot-canvas] .rich-text.is-placeholder,
[data-blockshot-canvas] .block-editor-rich-text__editable[data-placeholder],
[data-blockshot-canvas] .block-editor-rich-text__editable[aria-label][data-empty="true"] {
	color: transparent !important;
	caret-color: transparent !important;
}
[data-blockshot-canvas] [data-rich-text-placeholder]::before,
[data-blockshot-canvas] [data-placeholder]::before,
[data-blockshot-canvas] .rich-text.is-placeholder::before,
[data-blockshot-canvas] .block-editor-rich-text__editable[data-placeholder]::before {
	content: none !important;
	display: none !important;
}
[data-blockshot-canvas] [data-empty="true"]::before {
	content: none !important;
	display: none !important;
}
[data-blockshot-canvas] .block-list-appender,
[data-blockshot-canvas] .block-editor-default-block-appender,
[data-blockshot-canvas] .block-editor-block-list__empty-block-inserter,
[data-blockshot-canvas] .block-editor-block-list__insertion-point {
	display: none !important;
}
.wp-block-post-content:has([data-blockshot-canvas]) {
	display: grid;
	place-items: center;
}
`;

function getCanvasContext() {
	const iframe =
		typeof document !== 'undefined'
			? document.querySelector( 'iframe[name=\"editor-canvas\"]' )
			: null;

	const doc = iframe?.contentDocument || document;
	const canvas = doc?.querySelector( '[data-blockshot-canvas]' ) || null;

	return { doc, canvas };
}

function injectExportStyles( doc ) {
	const style = doc.createElement( 'style' );
	style.setAttribute( 'data-blockshot-export', '' );
	style.textContent = HIDE_PLACEHOLDERS_CSS;
	doc.head.appendChild( style );
	return style;
}

export async function exportCanvas( {
	format,
	scale,
	quality,
	postTitle,
	createNotice,
} ) {
	const { doc, canvas } = getCanvasContext();

	if ( ! canvas ) {
		if ( createNotice ) {
			createNotice(
				'error',
				__( 'No canvas block found.', 'blockshot' ),
				{ type: 'snackbar' }
			);
		}
		return;
	}

	const safeFormat = format === 'jpg' || format === 'png' ? format : 'png';
	const safeScale = Number( scale ) || 1;
	const safeQuality = Number( quality ) || 100;

	const writingFlow =
		doc?.querySelector?.(
			'.editor-styles-wrapper.block-editor-writing-flow'
		) || null;
	const previousTransform = writingFlow?.style.transform ?? '';
	const previousTransformOrigin = writingFlow?.style.transformOrigin ?? '';

	const styleEl = injectExportStyles( doc );

	try {
		if ( writingFlow ) {
			writingFlow.style.transform = '';
			writingFlow.style.transformOrigin = '';
		}

		const fn = safeFormat === 'jpg' ? toJpeg : toPng;

		const options = {
			pixelRatio: safeScale,
			...( safeFormat === 'jpg' && {
				quality: safeQuality / 100,
			} ),
		};

		const rawDataUrl = await fn( canvas, options );
		const dataUrl = setDpi( rawDataUrl, safeScale, safeFormat );

		const baseName =
			( postTitle || 'blockshot' )
				.toLowerCase()
				.replace( /[^a-z0-9]+/g, '-' )
				.replace( /^-|-$/g, '' ) || 'blockshot';

		const link = doc.createElement( 'a' );
		link.download = `${ baseName }.${ safeFormat }`;
		link.href = dataUrl;
		link.click();

		if ( createNotice ) {
			createNotice(
				'success',
				__( 'Image exported successfully.', 'blockshot' ),
				{ type: 'snackbar' }
			);
		}
	} catch ( err ) {
		// eslint-disable-next-line no-console
		console.error( 'Blockshot export error:', err );

		if ( createNotice ) {
			createNotice(
				'error',
				__( 'Export failed. Please try again.', 'blockshot' ),
				{ type: 'snackbar' }
			);
		}
	} finally {
		styleEl.remove();
		if ( writingFlow ) {
			writingFlow.style.transform = previousTransform;
			writingFlow.style.transformOrigin = previousTransformOrigin;
		}
	}
}

