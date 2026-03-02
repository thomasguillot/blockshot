import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import {
	BlockControls,
	PlainText,
	useBlockProps,
} from '@wordpress/block-editor';
import { ToolbarButton, ToolbarGroup } from '@wordpress/components';
import DOMPurify from 'dompurify';

import './editor.scss';

export default function Edit( { attributes, setAttributes, isSelected } ) {
	const [ isPreview, setIsPreview ] = useState( false );

	const blockProps = useBlockProps( {
		className: 'blockshot-svg-block',
	} );

	const sanitizedSVG = DOMPurify.sanitize( attributes.content || '', {
		USE_PROFILES: { svg: true, svgFilters: true },
		ADD_TAGS: [ 'use' ],
	} );

	const hasContent = ( attributes.content || '' ).trim().length > 0;
	const showPreview = isSelected ? isPreview : hasContent;

	return (
		<div { ...blockProps }>
			{ isSelected && (
				<BlockControls>
					<ToolbarGroup>
						<ToolbarButton
							className="components-tab-button"
							isPressed={ ! isPreview }
							onClick={ () => setIsPreview( false ) }
						>
							{ __( 'SVG', 'blockshot' ) }
						</ToolbarButton>
						<ToolbarButton
							className="components-tab-button"
							isPressed={ isPreview }
							onClick={ () => setIsPreview( true ) }
						>
							{ __( 'Preview', 'blockshot' ) }
						</ToolbarButton>
					</ToolbarGroup>
				</BlockControls>
			) }

			{ showPreview ? (
				<div
					className="blockshot-svg-block__preview"
					dangerouslySetInnerHTML={ { __html: sanitizedSVG } }
				/>
			) : (
				<PlainText
					className="blockshot-svg-block__editor"
					value={ attributes.content || '' }
					onChange={ ( content ) => setAttributes( { content } ) }
					placeholder={ __( 'Enter SVG code…', 'blockshot' ) }
					aria-label={ __( 'SVG', 'blockshot' ) }
				/>
			) }
		</div>
	);
}
