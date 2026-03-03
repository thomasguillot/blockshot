import { useEffect, useRef, useState, useCallback } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	BlockControls,
	InnerBlocks,
	InspectorControls,
	useBlockProps,
} from '@wordpress/block-editor';
import {
	BaseControl,
	Button,
	PanelBody,
	RangeControl,
	SelectControl,
	ToolbarButton,
	ToolbarGroup,
	__experimentalUnitControl as UnitControl,
	__experimentalParseQuantityAndUnitFromRawValue as parseQuantityAndUnit,
} from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import {
	justifyTop,
	justifyCenterVertical,
	justifyBottom,
	justifySpaceBetweenVertical,
} from '@wordpress/icons';

import './editor.scss';

import classnames from 'classnames';
import { exportCanvas } from '../../shared/export-canvas';

const DEFAULT_DIMENSIONS_MAP = {
	width: 1440,
	minHeight: 800,
}

const VERTICAL_ALIGNMENT_MAP = {
	top: 'flex-start',
	center: 'center',
	bottom: 'flex-end',
	'space-between': 'space-between',
};

function PxDimensionControl( { label, value, defaultValue, min = 100, max = 4096, onChange } ) {
	const [ quantity ] = parseQuantityAndUnit( value );
	const currentValue = quantity ?? defaultValue;

	return (
		<BaseControl label={ label }>
			<div className="blockshot-canvas__grid-control" style={ { '--gap': '8px' } }>
				<UnitControl
					value={ value }
					units={ { value: 'px', label: 'px' } }
					onChange={ ( next ) => {
						const [ quantity ] = parseQuantityAndUnit( next );
						onChange( quantity ?? defaultValue );
					} }
					__next40pxDefaultSize
				/>
				<RangeControl
					value={ currentValue }
					min={ min }
					max={ max }
					step={ 1 }
					withInputField={ false }
					onChange={ ( num ) => onChange( num ) }
					__next40pxDefaultSize
				/>
			</div>
		</BaseControl>
	);
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		verticalAlignment = 'top',
		exportFormat,
		exportQuality,
		exportScale,
	} = attributes;

	const [ isExporting, setIsExporting ] = useState( false );
	const wrapperRef = useRef( null );

	const { createNotice } = useDispatch( 'core/notices' );

	const postTitle = useSelect(
		( select ) =>
			select( 'core/editor' )?.getEditedPostAttribute?.( 'title' ) || '',
		[]
	);

	useEffect( () => {
		const updates = {};

		if ( ! attributes.backgroundColor && ! attributes.style?.color?.background ) {
			updates.style = {
				...( updates.style || attributes.style || {} ),
				color: {
					...( updates.style?.color || attributes.style?.color || {} ),
					background: '#ffffff',
				},
			};
		}

		if ( ! attributes.textColor && ! attributes.style?.color?.text ) {
			updates.style = {
				...( updates.style || attributes.style || {} ),
				color: {
					...( updates.style?.color || attributes.style?.color || {} ),
					text: '#1e1e1e',
				},
			};
		}

		if ( Object.keys( updates ).length ) {
			setAttributes( updates );
		}
	}, [] ); // eslint-disable-line react-hooks/exhaustive-deps

	useEffect( () => {
		/* global blockshotSettings */
		const defaults =
			typeof window !== 'undefined' && window.blockshotSettings
				? window.blockshotSettings
				: {
						format: 'png',
						quality: 100,
						scale: 2,
					};

		const updates = {};

		if ( exportFormat === undefined ) {
			updates.exportFormat = defaults.format;
		}

		if ( exportQuality === undefined ) {
			updates.exportQuality = defaults.quality;
		}

		if ( exportScale === undefined ) {
			updates.exportScale = defaults.scale;
		}

		if ( Object.keys( updates ).length ) {
			setAttributes( updates );
		}
	}, [] ); // eslint-disable-line react-hooks/exhaustive-deps

	const minHeight = attributes.minHeight || DEFAULT_DIMENSIONS_MAP.minHeight;
	const width = attributes.width || DEFAULT_DIMENSIONS_MAP.width;
	const hasCustomBackground = attributes.backgroundColor;
	const hasCustomText = attributes.textColor;

	const effectiveExportFormat = exportFormat || 'png';
	const effectiveExportQuality =
		typeof exportQuality === 'number' ? exportQuality : 100;
	const effectiveExportScale =
		typeof exportScale === 'number' ? exportScale : 2;

	const handleExport = useCallback( async () => {
		setIsExporting( true );
		try {
			await exportCanvas( {
				format: effectiveExportFormat,
				quality: effectiveExportQuality,
				scale: effectiveExportScale,
				postTitle,
				createNotice,
			} );
		} finally {
			setIsExporting( false );
		}
	}, [
		effectiveExportFormat,
		effectiveExportQuality,
		effectiveExportScale,
		postTitle,
		createNotice,
	] );

	const blockProps = useBlockProps( {
		ref: wrapperRef,
		className: classnames('blockshot-canvas', `blockshot-canvas__layout-${ verticalAlignment }`),
		'data-blockshot-canvas': true,
		style: {
			backgroundColor: hasCustomBackground ? undefined : '#fff',
			color: hasCustomText ? undefined : '#1e1e1e',
			display: 'flex',
			flexDirection: 'column',
			justifyContent: VERTICAL_ALIGNMENT_MAP[ verticalAlignment ] || 'flex-start',
			width,
			minHeight,
		},
	} );

	return (
		<div { ...blockProps }>
			<BlockControls>
				<ToolbarGroup>
					<ToolbarButton
						icon={ justifyTop }
						label={ __( 'Align top', 'blockshot' ) }
						isPressed={ verticalAlignment === 'top' }
						onClick={ () =>
							setAttributes( { verticalAlignment: 'top' } )
						}
					/>
					<ToolbarButton
						icon={ justifyCenterVertical }
						label={ __( 'Align middle', 'blockshot' ) }
						isPressed={ verticalAlignment === 'center' }
						onClick={ () =>
							setAttributes( { verticalAlignment: 'center' } )
						}
					/>
					<ToolbarButton
						icon={ justifyBottom }
						label={ __( 'Align bottom', 'blockshot' ) }
						isPressed={ verticalAlignment === 'bottom' }
						onClick={ () =>
							setAttributes( { verticalAlignment: 'bottom' } )
						}
					/>
					<ToolbarButton
						icon={ justifySpaceBetweenVertical }
						label={ __( 'Space between', 'blockshot' ) }
						isPressed={ verticalAlignment === 'space-between' }
						onClick={ () =>
							setAttributes( { verticalAlignment: 'space-between' } )
						}
					/>
				</ToolbarGroup>
			</BlockControls>
			<InspectorControls>
				<PanelBody title={ __( 'Export', 'blockshot' ) }>
					<div className="blockshot-canvas__grid-control">
						<SelectControl
							label={ __( 'Scale', 'blockshot' ) }
							value={ String( effectiveExportScale ) }
							options={ [
								{ label: '1x', value: '1' },
								{ label: '2x', value: '2' },
								{ label: '3x', value: '3' },
								{ label: '4x', value: '4' },
							] }
							onChange={ ( val ) =>
								setAttributes( {
									exportScale: Number( val ),
								} )
							}
							hideLabelFromVision
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
						<SelectControl
							label={ __( 'Format', 'blockshot' ) }
							value={ effectiveExportFormat }
							options={ [
								{ label: 'PNG', value: 'png' },
								{ label: 'JPG', value: 'jpg' },
							] }
							onChange={ ( val ) =>
								setAttributes( { exportFormat: val } )
							}
							hideLabelFromVision
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
						{ effectiveExportFormat === 'jpg' && (
							<SelectControl
								label={ __( 'Quality', 'blockshot' ) }
								value={ String( effectiveExportQuality ) }
								options={ [
									{
										label: __(
											'High quality',
											'blockshot'
										),
										value: '100',
									},
									{
										label: __(
											'Medium quality',
											'blockshot'
										),
										value: '75',
									},
									{
										label: __(
											'Low quality',
											'blockshot'
										),
										value: '50',
									},
								] }
								onChange={ ( val ) =>
									setAttributes( {
										exportQuality: Number( val ),
									} )
								}
								hideLabelFromVision
								__next40pxDefaultSize
								__nextHasNoMarginBottom
							/>
						) }
					</div>
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
				</PanelBody>
			</InspectorControls>
			<InspectorControls group="styles">
				<PanelBody className="blockshot-canvas__dimension-panel">
					<PxDimensionControl
						label={ __( 'Width', 'blockshot' ) }
						value={ width }
						defaultValue={ DEFAULT_DIMENSIONS_MAP.width }
						onChange={ ( value ) =>
							setAttributes( { width: value } )
						}
					/>
					<PxDimensionControl
						label={ __( 'Minimum height', 'blockshot' ) }
						value={ minHeight }
						defaultValue={ DEFAULT_DIMENSIONS_MAP.minHeight }
						onChange={ ( value ) =>
							setAttributes( { minHeight: value } )
						}
					/>
				</PanelBody>
			</InspectorControls>
			<InnerBlocks templateLock={ false } />
		</div>
	);
}
