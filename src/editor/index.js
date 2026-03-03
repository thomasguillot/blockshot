import './editor.scss';
import { registerPlugin } from '@wordpress/plugins';
import { Dropdown, MenuGroup, MenuItemsChoice, Button } from '@wordpress/components';
import { SVG, Path } from '@wordpress/primitives';
import { useSelect } from '@wordpress/data';
import { useState, useRef, useEffect, createPortal } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { capturePhoto } from '@wordpress/icons';

function getCanvasContext() {
	const iframe = document.querySelector(
		'iframe[name="editor-canvas"]'
	);
	const doc = iframe?.contentDocument || document;
	const canvas = doc.querySelector( '[data-blockshot-canvas]' );
	return { doc, canvas };
}

const ZOOM_CHOICES = [
	{ label: '50%', value: '0.5' },
	{ label: '100%', value: '1' },
	{ label: '200%', value: '2' },
];

const ZOOM_LABELS = { '0.5': '50%', '1': '100%', '2': '200%' };

const zoomIn = (
	<SVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<Path d="M13.75 10.25H15.75V11.75H13.75V13.75H12.25V11.75H10.25V10.25H12.25V8.25H13.75V10.25Z" />
		<Path d="M13 5c-3.3 0-6 2.7-6 6 0 1.4.5 2.7 1.3 3.7l-3.8 3.8 1.1 1.1 3.8-3.8c1 .8 2.3 1.3 3.7 1.3 3.3 0 6-2.7 6-6S16.3 5 13 5zm0 10.5c-2.5 0-4.5-2-4.5-4.5s2-4.5 4.5-4.5 4.5 2 4.5 4.5-2 4.5-4.5 4.5z" />
	</SVG>
);

function ZoomControl() {
	const [ zoom, setZoom ] = useState( '1' );
	const [ targetDoc, setTargetDoc ] = useState( null );
	const containerRef = useRef( null );

	useEffect( () => {
		if ( typeof document === 'undefined' ) {
			return;
		}

		const { doc } = getCanvasContext();
		setTargetDoc( doc );

		const headerSettings =
			document.querySelector( '.edit-post-header__settings' ) ||
			document.querySelector( '.editor-header__settings' );

		if ( ! headerSettings ) {
			return;
		}

		const container = document.createElement( 'div' );
		container.className = 'blockshot-zoom-control';
		headerSettings.prepend( container );
		containerRef.current = container;

		return () => {
			if ( containerRef.current?.parentNode ) {
				containerRef.current.parentNode.removeChild( containerRef.current );
			}
			containerRef.current = null;

			if ( ! doc ) {
				return;
			}

			const writingFlow = doc.querySelector(
				'.editor-styles-wrapper.block-editor-writing-flow'
			);
			if ( writingFlow ) {
				writingFlow.style.transform = '';
				writingFlow.style.transformOrigin = '';
			}
		};
	}, [] );

	useEffect( () => {
		if ( ! targetDoc ) {
			return;
		}

		const writingFlow = targetDoc.querySelector(
			'.editor-styles-wrapper.block-editor-writing-flow'
		);

		if ( ! writingFlow ) {
			return;
		}

		const value = Number( zoom ) || 1;

		if ( value === 1 ) {
			writingFlow.style.transform = '';
			writingFlow.style.transformOrigin = '';
			return;
		}

		writingFlow.style.transformOrigin = 'top center';
		writingFlow.style.transform = `scale(${ value })`;
	}, [ zoom, targetDoc ] );

	if ( ! containerRef.current ) {
		return null;
	}

	return createPortal(
		<Dropdown
			className="blockshot-zoom-control__dropdown"
			popoverProps={ { placement: 'bottom-end' } }
			renderToggle={ ( { isOpen, onToggle } ) => (
				<Button
					variant="secondary"
					icon={ zoomIn }
					onClick={ onToggle }
					aria-expanded={ isOpen }
					size="compact"
				>
					{ ZOOM_LABELS[ zoom ] || '100%' }
				</Button>
			) }
			renderContent={ ( { onClose } ) => (
				<MenuGroup label={ __( 'Zoom', 'blockshot' ) }>
					<MenuItemsChoice
						choices={ ZOOM_CHOICES }
						value={ zoom }
						onSelect={ ( nextZoom ) => {
							setZoom( nextZoom );
							onClose();
						} }
					/>
				</MenuGroup>
			) }
		/>,
		containerRef.current
	);
}

function ZoomPanel() {
	const postType = useSelect(
		( select ) => select( 'core/editor' )?.getCurrentPostType?.(),
		[]
	);

	if ( postType !== 'blockshot' ) {
		return null;
	}

	return <ZoomControl />;
}

registerPlugin( 'blockshot-zoom-panel', {
	render: ZoomPanel,
	icon: capturePhoto,
} );
