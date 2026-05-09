import { __ } from '@wordpress/i18n';
import { generateExport, triggerDownload } from './generate-export';

const HIDE_PLACEHOLDERS_CSS = `
[data-blockshot-canvas] {
	margin-left: 0 !important;
	margin-right: 0 !important;
}
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
`;

function getCanvasContext() {
	const iframe =
		typeof document !== 'undefined'
			? document.querySelector( 'iframe[name="editor-canvas"]' )
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

function slugify( title ) {
	const slug = ( title || '' )
		.toLowerCase()
		.replace( /[^a-z0-9]+/g, '-' )
		.replace( /^-|-$/g, '' );
	return slug || 'blockshot';
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
		createNotice?.( 'error', __( 'No canvas block found.', 'blockshot' ), {
			type: 'snackbar',
		} );
		return;
	}

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

		const { dataUrl, format: usedFormat } = await generateExport( {
			canvas,
			doc,
			format,
			scale,
			quality,
		} );

		triggerDownload(
			doc,
			dataUrl,
			`${ slugify( postTitle ) }.${ usedFormat }`
		);

		createNotice?.(
			'success',
			__( 'Image exported successfully.', 'blockshot' ),
			{ type: 'snackbar' }
		);
	} catch ( err ) {
		// eslint-disable-next-line no-console
		console.error( 'Blockshot export error:', err );

		createNotice?.(
			'error',
			__( 'Export failed. Please try again.', 'blockshot' ),
			{ type: 'snackbar' }
		);
	} finally {
		styleEl.remove();
		if ( writingFlow ) {
			writingFlow.style.transform = previousTransform;
			writingFlow.style.transformOrigin = previousTransformOrigin;
		}
	}
}
