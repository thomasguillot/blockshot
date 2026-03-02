import { toPng, toJpeg } from 'html-to-image';
import { setDpi } from '../shared/set-dpi';
import { showSnackbar } from './snackbar';
import { Icon, capturePhoto } from '@wordpress/icons';
import { createRoot } from '@wordpress/element';
import './style.scss';

function createButton() {
	const button = document.createElement( 'button' );
	button.className = 'blockshot-export-btn';
	button.type = 'button';
	button.setAttribute( 'aria-label', 'Export as image' );
	const root = createRoot( button );
	root.render(
		<Icon
			icon={ capturePhoto }
			className="blockshot-export-btn__icon"
		/>
	);
	document.body.appendChild( button );
	return button;
}

async function exportCanvas( button ) {
	const canvas = document.querySelector( '[data-blockshot-canvas]' );
	if ( ! canvas ) {
		showSnackbar( 'No canvas found on this page.', 'error' );
		return;
	}

	/* global blockshotSettings */
	const { format, quality, scale, filename } = blockshotSettings;

	button.classList.add( 'blockshot-export-btn--loading' );
	button.disabled = true;

	try {
		const fn = format === 'jpg' ? toJpeg : toPng;
		const options = {
			pixelRatio: Number( scale ),
			...( format === 'jpg' && { quality: Number( quality ) / 100 } ),
		};

		const rawDataUrl = await fn( canvas, options );
		const dataUrl = setDpi( rawDataUrl, scale, format );

		const link = document.createElement( 'a' );
		link.download = `${ filename }.${ format }`;
		link.href = dataUrl;
		link.click();

		showSnackbar( 'Image exported successfully.' );
	} catch ( err ) {
		// eslint-disable-next-line no-console
		console.error( 'Blockshot export error:', err );
		showSnackbar( 'Export failed. Please try again.', 'error' );
	} finally {
		button.classList.remove( 'blockshot-export-btn--loading' );
		button.disabled = false;
	}
}

document.addEventListener( 'DOMContentLoaded', () => {
	if ( ! document.querySelector( '[data-blockshot-canvas]' ) ) {
		return;
	}

	const button = createButton();
	button.addEventListener( 'click', () => exportCanvas( button ) );
} );
