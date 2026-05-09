/* eslint-disable @wordpress/no-unsafe-wp-apis -- UnitControl and parseQuantityAndUnit remain marked experimental but are stable in core. */
import { useRef, useState, useCallback, useId } from '@wordpress/element';
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
import { DEFAULT_DIMENSIONS_MAP, VERTICAL_ALIGNMENT_MAP } from './constants';

function PxDimensionControl( {
	label,
	value,
	defaultValue,
	min = 100,
	max = 4096,
	onChange,
} ) {
	const id = useId();
	const [ quantity ] = parseQuantityAndUnit( value );
	const currentValue = quantity ?? defaultValue;

	return (
		<BaseControl id={ id } label={ label }>
			<div
				className="blockshot-canvas__grid-control"
				style={ { '--gap': '8px' } }
			>
				<UnitControl
					id={ id }
					value={ value }
					units={ { value: 'px', label: 'px' } }
					onChange={ ( next ) => {
						const [ nextQuantity ] = parseQuantityAndUnit( next );
						onChange( nextQuantity ?? defaultValue );
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

	const minHeight = attributes.minHeight || DEFAULT_DIMENSIONS_MAP.minHeight;
	const width = attributes.width || DEFAULT_DIMENSIONS_MAP.width;
	const hasCustomBackground = attributes.backgroundColor;
	const hasCustomText = attributes.textColor;

	const settings =
		( typeof window !== 'undefined' && window.blockshotSettings ) || null;

	const effectiveExportFormat = exportFormat || settings?.format || 'png';
	const effectiveExportQuality =
		typeof exportQuality === 'number'
			? exportQuality
			: Number( settings?.quality ) || 100;
	const effectiveExportScale =
		typeof exportScale === 'number'
			? exportScale
			: Number( settings?.scale ) || 2;

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
		className: classnames(
			'blockshot-canvas',
			`blockshot-canvas__layout-${ verticalAlignment }`
		),
		'data-blockshot-canvas': true,
		style: {
			backgroundColor: hasCustomBackground ? undefined : '#fff',
			color: hasCustomText ? undefined : '#1e1e1e',
			display: 'flex',
			flexDirection: 'column',
			justifyContent:
				VERTICAL_ALIGNMENT_MAP[ verticalAlignment ] || 'flex-start',
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
							setAttributes( {
								verticalAlignment: 'space-between',
							} )
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
										label: __( 'Low quality', 'blockshot' ),
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
