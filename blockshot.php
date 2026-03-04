<?php
/**
 * Plugin Name: Blockshot
 * Description: Create block art with Gutenberg blocks and export as JPG or PNG images.
 * Version:     1.0.3
 * Requires at least: 6.9
 * Requires PHP: 8.1
 * Author:      Thomas Guillot
 * Author URI:  https://thomasguillot.com
 * License:     GPL-2.0-or-later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: blockshot
 * Domain Path: /languages
 */

declare(strict_types=1);

defined('ABSPATH') || exit;

define('BLOCKSHOT_VERSION', '1.0.3');
define('BLOCKSHOT_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('BLOCKSHOT_PLUGIN_URL', plugin_dir_url(__FILE__));
define('BLOCKSHOT_PLUGIN_FILE', __FILE__);

require_once BLOCKSHOT_PLUGIN_DIR . 'includes/class-cpt.php';
require_once BLOCKSHOT_PLUGIN_DIR . 'includes/class-security.php';
require_once BLOCKSHOT_PLUGIN_DIR . 'includes/class-settings.php';

add_action('init', [Blockshot\CPT::class, 'register']);
add_action('init', [Blockshot\Settings::class, 'register']);
add_action('init', 'blockshot_register_block');
add_action('init', 'blockshot_register_template');
add_action('rest_api_init', [Blockshot\Settings::class, 'register_rest_routes']);
add_action('enqueue_block_editor_assets', 'blockshot_enqueue_editor');
add_action('wp_enqueue_scripts', 'blockshot_enqueue_frontend');

Blockshot\Security::init();

add_filter('allowed_block_types_all', 'blockshot_allowed_block_types', 10, 2);

/**
 * Register blocks.
 */
function blockshot_register_block(): void {
	if (file_exists(BLOCKSHOT_PLUGIN_DIR . 'build/blocks/canvas')) {
		register_block_type(BLOCKSHOT_PLUGIN_DIR . 'build/blocks/canvas');
	}

	if (file_exists(BLOCKSHOT_PLUGIN_DIR . 'build/blocks/svg')) {
		register_block_type(BLOCKSHOT_PLUGIN_DIR . 'build/blocks/svg');
	}
}

/**
 * Restrict Blockshot blocks to the Blockshot CPT and hide them from other post types.
 *
 * @param bool|string[] $allowed_block_types Array of allowed block types or true for all.
 * @param WP_Block_Editor_Context $block_editor_context The editor context.
 * @return bool|string[]
 */
function blockshot_allowed_block_types($allowed_block_types, $block_editor_context) {
	$blockshot_blocks = [
		'blockshot/canvas',
		'blockshot/svg',
	];

	$post = $block_editor_context->post ?? null;

	if (!$post) {
		return $allowed_block_types;
	}

	if ($post->post_type === 'blockshot') {
		return $allowed_block_types;
	}

	if (!is_array($allowed_block_types)) {
		$all_block_types = array_keys(\WP_Block_Type_Registry::get_instance()->get_all_registered());
		$allowed_block_types = array_values(array_diff($all_block_types, $blockshot_blocks));
	} else {
		$allowed_block_types = array_values(array_diff($allowed_block_types, $blockshot_blocks));
	}

	return $allowed_block_types;
}

/**
 * Register the single-blockshot block template via register_block_template().
 */
function blockshot_register_template(): void {
	if (!function_exists('register_block_template')) {
		return;
	}

	$template_path = BLOCKSHOT_PLUGIN_DIR . 'templates/single-blockshot.html';
	$content = file_exists($template_path)
		? file_get_contents($template_path)
		: '<!-- wp:post-content /-->';

	register_block_template('blockshot//single-blockshot', [
		'title'      => __('Blockshot Canvas', 'blockshot'),
		'description' => __('Minimal template for Blockshot image export.', 'blockshot'),
		'content'    => $content,
		'post_types' => ['blockshot'],
	]);
}

/**
 * Enqueue the editor script on blockshot CPT screens only.
 */
function blockshot_enqueue_editor(): void {
	$screen = get_current_screen();
	if (!$screen || $screen->post_type !== 'blockshot') {
		return;
	}

	$asset_file = BLOCKSHOT_PLUGIN_DIR . 'build/editor/index.asset.php';
	if (!file_exists($asset_file)) {
		return;
	}

	$asset = require $asset_file;

	wp_enqueue_script(
		'blockshot-editor',
		BLOCKSHOT_PLUGIN_URL . 'build/editor/index.js',
		$asset['dependencies'],
		$asset['version'],
		true
	);

	$settings = get_option('blockshot_settings', Blockshot\Settings::DEFAULTS);
	$settings = wp_parse_args($settings, Blockshot\Settings::DEFAULTS);

	wp_localize_script('blockshot-editor', 'blockshotSettings', [
		'format'   => $settings['format'],
		'quality'  => (int) $settings['quality'],
		'scale'    => (int) $settings['scale'],
		'filename' => '',
	]);
}

/**
 * Enqueue editor styles in the iframe-compatible way.
 */
function blockshot_enqueue_editor_styles(): void {
	if (!is_admin()) {
		return;
	}

	$screen = get_current_screen();
	if (!$screen || $screen->post_type !== 'blockshot') {
		return;
	}

	$asset_file = BLOCKSHOT_PLUGIN_DIR . 'build/editor/index.asset.php';
	if (!file_exists($asset_file)) {
		return;
	}

	$asset = require $asset_file;

	if (file_exists(BLOCKSHOT_PLUGIN_DIR . 'build/editor/index.css')) {
		wp_enqueue_style(
			'blockshot-editor',
			BLOCKSHOT_PLUGIN_URL . 'build/editor/index.css',
			[],
			$asset['version']
		);
	}
}
add_action('enqueue_block_assets', 'blockshot_enqueue_editor_styles');

/**
 * Enqueue the frontend camera button on singular blockshot pages for admins.
 */
function blockshot_enqueue_frontend(): void {
	if (!is_singular('blockshot') || !current_user_can('manage_options')) {
		return;
	}

	$asset_file = BLOCKSHOT_PLUGIN_DIR . 'build/frontend/index.asset.php';
	if (!file_exists($asset_file)) {
		return;
	}

	$asset = require $asset_file;

	wp_enqueue_script(
		'blockshot-frontend',
		BLOCKSHOT_PLUGIN_URL . 'build/frontend/index.js',
		$asset['dependencies'],
		$asset['version'],
		true
	);

	wp_enqueue_style(
		'blockshot-frontend',
		BLOCKSHOT_PLUGIN_URL . 'build/frontend/style-index.css',
		[],
		$asset['version']
	);

	$settings = get_option('blockshot_settings', Blockshot\Settings::DEFAULTS);
	$settings = wp_parse_args($settings, Blockshot\Settings::DEFAULTS);

	wp_localize_script('blockshot-frontend', 'blockshotSettings', [
		'format'   => $settings['format'],
		'quality'  => (int) $settings['quality'],
		'scale'    => (int) $settings['scale'],
		'filename' => sanitize_file_name(get_the_title()),
	]);
}
