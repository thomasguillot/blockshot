import { __ } from '@wordpress/i18n';
import { generateExport, triggerDownload } from '../shared/generate-export';
import { showSnackbar } from './snackbar';
import './style.scss';

const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="blockshot-export-btn__icon" aria-hidden="true" focusable="false"><path d="M12 9.2c-2.2 0-3.9 1.8-3.9 4s1.8 4 3.9 4 4-1.8 4-4-1.8-4-4-4zm0 6.5c-1.4 0-2.4-1.1-2.4-2.5s1.1-2.5 2.4-2.5 2.5 1.1 2.5 2.5-1.1 2.5-2.5 2.5zM20.2 8c-.1 0-.3 0-.5-.1l-2.5-.8c-.4-.1-.8-.4-1.1-.8l-1-1.5c-.4-.5-1-.9-1.7-.9h-2.9c-.6.1-1.2.4-1.6 1l-1 1.5c-.3.3-.6.6-1.1.7l-2.5.8c-.2.1-.4.1-.6.1-1 .2-1.7.9-1.7 1.9v8.3c0 1 .9 1.9 2 1.9h16c1.1 0 2-.8 2-1.9V9.9c0-1-.7-1.7-1.8-1.9zm.3 10.1c0 .2-.2.4-.5.4H4c-.3 0-.5-.2-.5-.4V9.9c0-.1.2-.3.5-.4.2 0 .5-.1.8-.2l2.5-.8c.7-.2 1.4-.6 1.8-1.3l1-1.5c.1-.1.2-.2.4-.2h2.9c.2 0 .3.1.4.2l1 1.5c.4.7 1.1 1.1 1.9 1.4l2.5.8c.3.1.6.1.8.2.3 0 .4.2.4.4v8.1z"/></svg>`;

function createButton() {
	const button = document.createElement( 'button' );
	button.className = 'blockshot-export-btn';
	button.type = 'button';
	button.setAttribute( 'aria-label', __( 'Export as image', 'blockshot' ) );
	button.innerHTML = ICON_SVG;
	document.body.appendChild( button );
	return button;
}

async function handleExport( button ) {
	const canvas = document.querySelector( '[data-blockshot-canvas]' );
	if ( ! canvas ) {
		showSnackbar(
			__( 'No canvas found on this page.', 'blockshot' ),
			'error'
		);
		return;
	}

	const {
		format = 'png',
		quality = 100,
		scale = 2,
		filename = 'blockshot',
	} = window.blockshotSettings || {};

	button.classList.add( 'blockshot-export-btn--loading' );
	button.disabled = true;

	try {
		const { dataUrl, format: usedFormat } = await generateExport( {
			canvas,
			doc: document,
			format,
			scale,
			quality,
		} );

		triggerDownload(
			document,
			dataUrl,
			`${ filename || 'blockshot' }.${ usedFormat }`
		);
		showSnackbar( __( 'Image exported successfully.', 'blockshot' ) );
	} catch ( err ) {
		// eslint-disable-next-line no-console
		console.error( 'Blockshot export error:', err );
		showSnackbar(
			__( 'Export failed. Please try again.', 'blockshot' ),
			'error'
		);
	} finally {
		button.classList.remove( 'blockshot-export-btn--loading' );
		button.disabled = false;
	}
}

function init() {
	if ( ! document.querySelector( '[data-blockshot-canvas]' ) ) {
		return;
	}
	const button = createButton();
	button.addEventListener( 'click', () => handleExport( button ) );
}

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', init );
} else {
	init();
}
