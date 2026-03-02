import { useEffect, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	BlockControls,
	InnerBlocks,
	InspectorControls,
	useBlockProps,
} from '@wordpress/block-editor';
import {
	BaseControl,
	PanelBody,
	RangeControl,
	ToolbarButton,
	ToolbarGroup,
	__experimentalUnitControl as UnitControl,
	__experimentalParseQuantityAndUnitFromRawValue as parseQuantityAndUnit,
} from '@wordpress/components';
import {
	justifyTop,
	justifyCenterVertical,
	justifyBottom,
} from '@wordpress/icons';

import './editor.scss';

const DEFAULT_DIMENSIONS_MAP = {
	width: 1440,
	minHeight: 800,
}

const VERTICAL_ALIGNMENT_MAP = {
	top: 'flex-start',
	center: 'center',
	bottom: 'flex-end',
};

function PxDimensionControl( { label, value, defaultValue, min = 100, max = 4096, onChange } ) {
	const [ quantity ] = parseQuantityAndUnit( value );
	const currentValue = quantity ?? defaultValue;

	return (
		<BaseControl label={ label }>
			<div className="blockshot-canvas__dimension-control">
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
	const { verticalAlignment = 'top' } = attributes;
	const wrapperRef = useRef( null );

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

	const minHeight = attributes.minHeight || DEFAULT_DIMENSIONS_MAP.minHeight;
	const width = attributes.width || DEFAULT_DIMENSIONS_MAP.width;
	const hasCustomBackground =
		attributes.backgroundColor || attributes.style?.color?.background;
	const hasCustomText =
		attributes.textColor || attributes.style?.color?.text;

	const blockProps = useBlockProps( {
		ref: wrapperRef,
		className: 'blockshot-canvas',
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
		<div
			{ ...blockProps }
			style={ {
				...blockProps.style,
				width,
				minHeight,
				backgroundColor: hasCustomBackground ? undefined : '#fff',
				color: hasCustomText ? undefined : '#1e1e1e',
			} }
		>
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
				</ToolbarGroup>
			</BlockControls>
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
