import { InnerBlocks, useBlockProps } from '@wordpress/block-editor';

import classnames from 'classnames';

import { DEFAULT_DIMENSIONS_MAP, VERTICAL_ALIGNMENT_MAP } from './constants';

export default function save( { attributes } ) {
	const { verticalAlignment = 'top' } = attributes;
	const minHeight = attributes.minHeight || DEFAULT_DIMENSIONS_MAP.minHeight;
	const width = attributes.width || DEFAULT_DIMENSIONS_MAP.width;
	const hasCustomBackground = attributes.backgroundColor;
	const hasCustomText = attributes.textColor;

	const blockProps = useBlockProps.save( {
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
			<InnerBlocks.Content />
		</div>
	);
}
