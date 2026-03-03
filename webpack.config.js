const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );
const path = require( 'path' );

module.exports = {
	...defaultConfig,
	entry: {
		...defaultConfig.entry(),
		'editor/index': path.resolve(
			process.cwd(),
			'src/editor/index.js'
		),
		'frontend/index': path.resolve(
			process.cwd(),
			'src/frontend/index.js'
		),
	},
};
