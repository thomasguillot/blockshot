import { __ } from '@wordpress/i18n';
import { registerPlugin } from '@wordpress/plugins';
import { PluginDocumentSettingPanel } from '@wordpress/editor';
import { useState, useCallback, useRef, useEffect } from '@wordpress/element';
import { useSelect, useDispatch } from '@wordpress/data';
import { Button, SelectControl, Flex, FlexBlock } from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';

import { exportCanvas } from '../shared/export-canvas';

const PLUGIN_NAME = 'blockshot-document-panel';
const PANEL_NAME = 'blockshot-export';
// `PluginDocumentSettingPanel` registers its open state under
// `${pluginName}/${panelName}`. We force-open it on mount because the title bar
// is hidden in CSS, so the user can't toggle it back on themselves.
const FULL_PANEL_NAME = `${ PLUGIN_NAME }/${ PANEL_NAME }`;

const DEFAULTS = { format: 'png', quality: 100, scale: 2 };

const SCALE_OPTIONS = [
	{ label: '1x', value: '1' },
	{ label: '2x', value: '2' },
	{ label: '3x', value: '3' },
	{ label: '4x', value: '4' },
];

const FORMAT_OPTIONS = [
	{ label: 'PNG', value: 'png' },
	{ label: 'JPG', value: 'jpg' },
];

function getInitialSettings() {
	if ( typeof window === 'undefined' || ! window.blockshotSettings ) {
		return DEFAULTS;
	}
	const { format, quality, scale } = window.blockshotSettings;
	return {
		format: format || DEFAULTS.format,
		quality: Number.isFinite( Number( quality ) )
			? Number( quality )
			: DEFAULTS.quality,
		scale: Number.isFinite( Number( scale ) )
			? Number( scale )
			: DEFAULTS.scale,
	};
}

function BlockshotPanel() {
	const postType = useSelect(
		( select ) => select( 'core/editor' )?.getCurrentPostType?.(),
		[]
	);
	const postTitle = useSelect(
		( select ) =>
			select( 'core/editor' )?.getEditedPostAttribute?.( 'title' ) || '',
		[]
	);
	const { createNotice } = useDispatch( 'core/notices' );

	const isPanelOpened = useSelect( ( select ) => {
		const editorStore = select( 'core/editor' );
		if ( editorStore?.isEditorPanelOpened ) {
			return editorStore.isEditorPanelOpened( FULL_PANEL_NAME );
		}
		return true;
	}, [] );
	const { toggleEditorPanelOpened } = useDispatch( 'core/editor' );

	useEffect( () => {
		if ( ! isPanelOpened && toggleEditorPanelOpened ) {
			toggleEditorPanelOpened( FULL_PANEL_NAME );
		}
	}, [ isPanelOpened, toggleEditorPanelOpened ] );

	const [ settings, setSettings ] = useState( getInitialSettings );
	const [ isSaving, setIsSaving ] = useState( false );
	const [ isExporting, setIsExporting ] = useState( false );

	// Mirror state in a ref so persist() can capture the pre-save value for
	// rollback on failure without listing `settings` in its deps.
	const settingsRef = useRef( settings );
	settingsRef.current = settings;

	// Disabling the selects while isSaving covers the common case, but not
	// every concurrent call (rapid synchronous fires, programmatic callers).
	// A monotonic request id makes stale responses inert if they ever land
	// after a newer persist has taken over.
	const requestIdRef = useRef( 0 );

	const persist = useCallback(
		( next ) => {
			const prev = settingsRef.current;
			const myRequestId = ++requestIdRef.current;
			setSettings( next );
			setIsSaving( true );
			apiFetch( {
				path: '/blockshot/v1/settings',
				method: 'POST',
				data: next,
			} )
				.then( ( saved ) => {
					if ( myRequestId !== requestIdRef.current ) {
						return;
					}
					setSettings( saved );
					if ( typeof window !== 'undefined' ) {
						window.blockshotSettings = {
							...( window.blockshotSettings || {} ),
							...saved,
						};
					}
				} )
				.catch( () => {
					if ( myRequestId !== requestIdRef.current ) {
						return;
					}
					// Roll the optimistic update back so the UI reflects the
					// actual persisted option.
					setSettings( prev );
					createNotice?.(
						'error',
						__( 'Could not save Blockshot settings.', 'blockshot' ),
						{ type: 'snackbar' }
					);
				} )
				.finally( () => {
					if ( myRequestId === requestIdRef.current ) {
						setIsSaving( false );
					}
				} );
		},
		[ createNotice ]
	);

	const handleExport = useCallback( async () => {
		setIsExporting( true );
		try {
			await exportCanvas( {
				format: settings.format,
				quality: settings.quality,
				scale: settings.scale,
				postTitle,
				createNotice,
			} );
		} finally {
			setIsExporting( false );
		}
	}, [ settings, postTitle, createNotice ] );

	if ( postType !== 'blockshot' ) {
		return null;
	}

	return (
		<PluginDocumentSettingPanel
			name={ PANEL_NAME }
			title={ __( 'Blockshot', 'blockshot' ) }
			className="blockshot-document-panel"
		>
			<Flex align="flex-start" gap={ 3 }>
				<FlexBlock>
					<SelectControl
						label={ __( 'Format', 'blockshot' ) }
						value={ settings.format }
						options={ FORMAT_OPTIONS }
						disabled={ isSaving }
						onChange={ ( value ) =>
							persist( { ...settings, format: value } )
						}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
				</FlexBlock>
				<FlexBlock>
					<SelectControl
						label={ __( 'Scale', 'blockshot' ) }
						value={ String( settings.scale ) }
						options={ SCALE_OPTIONS }
						disabled={ isSaving }
						onChange={ ( value ) =>
							persist( { ...settings, scale: Number( value ) } )
						}
						__next40pxDefaultSize
						__nextHasNoMarginBottom
					/>
				</FlexBlock>
			</Flex>
			{ settings.format === 'jpg' && (
				<SelectControl
					label={ __( 'Quality', 'blockshot' ) }
					value={ String( settings.quality ) }
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
					disabled={ isSaving }
					onChange={ ( value ) =>
						persist( { ...settings, quality: Number( value ) } )
					}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
			) }
			<Button
				variant="secondary"
				isBusy={ isExporting }
				disabled={ isExporting || isSaving }
				onClick={ handleExport }
				style={ {
					width: '100%',
					justifyContent: 'center',
					marginTop: '12px',
				} }
				__next40pxDefaultSize
			>
				{ isExporting
					? __( 'Exporting…', 'blockshot' )
					: __( 'Export Blockshot', 'blockshot' ) }
			</Button>
		</PluginDocumentSettingPanel>
	);
}

registerPlugin( PLUGIN_NAME, { render: BlockshotPanel } );
