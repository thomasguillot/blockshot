import './editor.scss';
import {
	registerPlugin,
	unregisterPlugin,
	getPlugins,
} from '@wordpress/plugins';
import { PluginDocumentSettingPanel } from '@wordpress/editor';
import { Button, SelectControl, __experimentalVStack as VStack } from '@wordpress/components';
import { useSelect, useDispatch, select, subscribe } from '@wordpress/data';
import { useState, useCallback, useRef, useEffect } from '@wordpress/element';
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
