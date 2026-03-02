import { registerBlockType } from '@wordpress/blocks';
import { brush as icon } from '@wordpress/icons';

import './style.scss';

import metadata from './block.json';
import Edit from './edit';
import save from './save';

registerBlockType( metadata.name, {
	icon,
	edit: Edit,
	save,
} );
