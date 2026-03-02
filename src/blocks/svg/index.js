import { registerBlockType } from '@wordpress/blocks';
import { SVG, Path } from '@wordpress/primitives';

import './style.scss';

import metadata from './block.json';
import Edit from './edit';
import save from './save';

const icon = (
	<SVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
		<Path d="M13.9854 5.89746L11.4854 18.3975L10.0146 18.1025L12.5146 5.60254L13.9854 5.89746ZM8.76074 9.2998L5.85254 12L8.76074 14.7002L7.73926 15.7998L3.64746 12L7.73926 8.2002L8.76074 9.2998ZM20.3525 12L16.2607 15.7998L15.2393 14.7002L18.1465 12L15.2393 9.2998L16.2607 8.2002L20.3525 12Z" />
	</SVG>
);

registerBlockType( metadata.name, {
	icon,
	edit: Edit,
	save,
} );
