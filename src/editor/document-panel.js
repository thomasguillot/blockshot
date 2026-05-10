import { __ } from '@wordpress/i18n';
import { registerPlugin } from '@wordpress/plugins';
import { PluginDocumentSettingPanel } from '@wordpress/editor';
import { useState, useCallback, useRef } from '@wordpress/element';
import { useSelect, useDispatch } from '@wordpress/data';
import { Button, SelectControl } from '@wordpress/components';
import apiFetch from '@wordpress/api-fetch';

import { exportCanvas } from '../shared/export-canvas';

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

	const [ settings, setSettings ] = useState( getInitialSettings );
	const [ isSaving, setIsSaving ] = useState( false );
	const [ isExporting, setIsExporting ] = useState( false );

	// Monotonic counter so out-of-order REST responses cannot overwrite state
	// with a stale value when the user changes selects in quick succession.
	const requestIdRef = useRef( 0 );

	const persist = useCallback(
		( updater ) => {
			setSettings( ( prev ) => {
				const next = updater( prev );
				const myRequestId = ++requestIdRef.current;
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
						createNotice?.(
							'error',
							__(
								'Could not save Blockshot settings.',
								'blockshot'
							),
							{ type: 'snackbar' }
						);
					} )
					.finally( () => {
						if ( myRequestId === requestIdRef.current ) {
							setIsSaving( false );
						}
					} );
				return next;
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
			name="blockshot-export"
			title={ __( 'Blockshot', 'blockshot' ) }
			className="blockshot-document-panel"
		>
			<SelectControl
				label={ __( 'Format', 'blockshot' ) }
				value={ settings.format }
				options={ FORMAT_OPTIONS }
				onChange={ ( value ) =>
					persist( ( prev ) => ( { ...prev, format: value } ) )
				}
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>
			<SelectControl
				label={ __( 'Scale', 'blockshot' ) }
				value={ String( settings.scale ) }
				options={ SCALE_OPTIONS }
				onChange={ ( value ) =>
					persist( ( prev ) => ( {
						...prev,
						scale: Number( value ),
					} ) )
				}
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>
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
					onChange={ ( value ) =>
						persist( ( prev ) => ( {
							...prev,
							quality: Number( value ),
						} ) )
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

registerPlugin( 'blockshot-document-panel', { render: BlockshotPanel } );
