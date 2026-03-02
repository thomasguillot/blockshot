import { InnerBlocks, useBlockProps } from '@wordpress/block-editor';

const DEFAULT_DIMENSIONS_MAP = {
	width: 1440,
	minHeight: 800,
}

const VERTICAL_ALIGNMENT_MAP = {
	top: 'flex-start',
	center: 'center',
	bottom: 'flex-end',
};

export default function save( { attributes } ) {
	const { verticalAlignment = 'top' } = attributes;
	const minHeight = attributes.minHeight || DEFAULT_DIMENSIONS_MAP.minHeight;
	const width = attributes.width || DEFAULT_DIMENSIONS_MAP.width;
	const hasCustomBackground =
		attributes.backgroundColor || attributes.style?.color?.background;
	const hasCustomText =
		attributes.textColor || attributes.style?.color?.text;

	const blockProps = useBlockProps.save( {
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
		<div { ...blockProps }>
			<InnerBlocks.Content />
		</div>
	);
}
