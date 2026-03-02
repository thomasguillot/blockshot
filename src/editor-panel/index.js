import './editor.scss';
import {
	registerPlugin,
	unregisterPlugin,
	getPlugins,
} from '@wordpress/plugins';
import { PluginDocumentSettingPanel } from '@wordpress/editor';
import {
	Button,
	Dropdown,
	MenuGroup,
	MenuItemsChoice,
	SelectControl,
	__experimentalVStack as VStack,
} from '@wordpress/components';
import { SVG, Path } from '@wordpress/primitives';
import { useSelect, useDispatch, select, subscribe } from '@wordpress/data';
import { useState, useCallback, useRef, useEffect, createPortal } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import apiFetch from '@wordpress/api-fetch';
import { toPng, toJpeg } from 'html-to-image';
import { setDpi } from '../shared/set-dpi';
import { capturePhoto } from '@wordpress/icons';

function getCanvasContext() {
	const iframe = document.querySelector(
		'iframe[name="editor-canvas"]'
	);
	const doc = iframe?.contentDocument || document;
	const canvas = doc.querySelector( '[data-blockshot-canvas]' );
	return { doc, canvas };
}

const HIDE_PLACEHOLDERS_CSS = `
[data-blockshot-canvas] [data-rich-text-placeholder]::before {
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

function injectExportStyles( doc ) {
	const style = doc.createElement( 'style' );
	style.setAttribute( 'data-blockshot-export', '' );
	style.textContent = HIDE_PLACEHOLDERS_CSS;
	doc.head.appendChild( style );
	return style;
}

function ExportPanel() {
	const [ isExporting, setIsExporting ] = useState( false );
	const { createNotice } = useDispatch( 'core/notices' );

	/* global blockshotSettings */
	const [ exportSettings, setExportSettings ] = useState( {
		format: blockshotSettings.format,
		quality: blockshotSettings.quality,
		scale: blockshotSettings.scale,
	} );

	const didMountRef = useRef( false );
	const saveTimeoutRef = useRef();

	useEffect( () => {
		if ( ! didMountRef.current ) {
			didMountRef.current = true;
			return;
		}
		clearTimeout( saveTimeoutRef.current );
		saveTimeoutRef.current = setTimeout( () => {
			apiFetch( {
				path: '/blockshot/v1/settings',
				method: 'POST',
				data: exportSettings,
			} ).catch( () => {} );
		}, 600 );
		return () => clearTimeout( saveTimeoutRef.current );
	}, [ exportSettings ] );

	const updateSettings = useCallback( ( updates ) => {
		setExportSettings( ( prev ) => ( { ...prev, ...updates } ) );
	}, [] );

	const postTitle = useSelect(
		( select ) => select( 'core/editor' ).getEditedPostAttribute( 'title' ),
		[]
	);

	const postType = useSelect(
		( select ) => select( 'core/editor' ).getCurrentPostType(),
		[]
	);

	const { format, quality, scale } = exportSettings;

	const handleExport = useCallback( async () => {
		const { doc, canvas } = getCanvasContext();
		if ( ! canvas ) {
			createNotice(
				'error',
				__( 'No canvas block found.', 'blockshot' ),
				{ type: 'snackbar' }
			);
			return;
		}

		setIsExporting( true );

		const styleEl = injectExportStyles( doc );

		try {
			const fn = format === 'jpg' ? toJpeg : toPng;
			const options = {
				pixelRatio: Number( scale ),
				...( format === 'jpg' && {
					quality: Number( quality ) / 100,
				} ),
			};

			const rawDataUrl = await fn( canvas, options );
			const dataUrl = setDpi( rawDataUrl, scale, format );

			const filename =
				( postTitle || 'blockshot' )
					.toLowerCase()
					.replace( /[^a-z0-9]+/g, '-' )
					.replace( /^-|-$/g, '' ) || 'blockshot';

			const link = document.createElement( 'a' );
			link.download = `${ filename }.${ format }`;
			link.href = dataUrl;
			link.click();

			createNotice(
				'success',
				__( 'Image exported successfully.', 'blockshot' ),
				{ type: 'snackbar' }
			);
		} catch ( err ) {
			// eslint-disable-next-line no-console
			console.error( 'Blockshot export error:', err );
			createNotice(
				'error',
				__( 'Export failed. Please try again.', 'blockshot' ),
				{ type: 'snackbar' }
			);
		} finally {
			styleEl.remove();
			setIsExporting( false );
		}
	}, [ format, quality, scale, postTitle ] );

	if ( postType !== 'blockshot' ) {
		return null;
	}

	return (
		<>
			<ZoomControl />
			<PluginDocumentSettingPanel className="blockshot-export" name="blockshot-export">
				<VStack spacing={ 4 }>
					<div className="blockshot-export__controls">
						<SelectControl
							label={ __( 'Scale', 'blockshot' ) }
							value={ String( scale ) }
							options={ [
								{ label: '1x', value: '1' },
								{ label: '2x', value: '2' },
								{ label: '3x', value: '3' },
								{ label: '4x', value: '4' },
							] }
							onChange={ ( val ) =>
								updateSettings( { scale: Number( val ) } )
							}
							hideLabelFromVision
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
						<SelectControl
							label={ __( 'Format', 'blockshot' ) }
							value={ format }
							options={ [
								{ label: 'PNG', value: 'png' },
								{ label: 'JPG', value: 'jpg' },
							] }
							onChange={ ( val ) =>
								updateSettings( { format: val } )
							}
							hideLabelFromVision
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
					</div>

					{ format === 'jpg' && (
						<SelectControl
							label={ __( 'Quality', 'blockshot' ) }
							value={ String( quality ) }
							options={ [
								{
									label: __( 'High quality', 'blockshot' ),
									value: '100',
								},
								{
									label: __( 'Medium quality', 'blockshot' ),
									value: '75',
								},
								{
									label: __( 'Low quality', 'blockshot' ),
									value: '50',
								},
							] }
							onChange={ ( val ) =>
								updateSettings( { quality: Number( val ) } )
							}
							hideLabelFromVision
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
					) }
		
					<Button
						variant="secondary"
						isBusy={ isExporting }
						disabled={ isExporting }
						onClick={ handleExport }
						style={ { width: '100%', justifyContent: 'center' } }
						__next40pxDefaultSize
					>
						{ isExporting
							? __( 'Exporting…', 'blockshot' )
							: __( 'Export Canvas', 'blockshot' ) }
					</Button>
				</VStack>
			</PluginDocumentSettingPanel>
		</>
	);
}

registerPlugin( 'blockshot-export-panel', {
	render: ExportPanel,
	icon: capturePhoto,
} );

const BLOCKSHOT_PLUGIN_WHITELIST = [ 'blockshot-export-panel' ];

const unsubscribePluginCleanup = subscribe( () => {
	const postType = select( 'core/editor' ).getCurrentPostType();
	if ( ! postType ) {
		return;
	}

	unsubscribePluginCleanup();

	if ( postType !== 'blockshot' ) {
		return;
	}

	getPlugins().forEach( ( plugin ) => {
		if ( ! BLOCKSHOT_PLUGIN_WHITELIST.includes( plugin.name ) ) {
			unregisterPlugin( plugin.name );
		}
	} );
} );
