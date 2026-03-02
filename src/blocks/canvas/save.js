import { InnerBlocks, useBlockProps } from '@wordpress/block-editor';

import classnames from 'classnames';

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

export default function save( { attributes } ) {
	const { verticalAlignment = 'top' } = attributes;
	const minHeight = attributes.minHeight || DEFAULT_DIMENSIONS_MAP.minHeight;
	const width = attributes.width || DEFAULT_DIMENSIONS_MAP.width;
	const hasCustomBackground = attributes.backgroundColor;
	const hasCustomText = attributes.textColor;

	const blockProps = useBlockProps.save( {
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
			<InnerBlocks.Content />
		</div>
	);
}
