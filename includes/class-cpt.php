<?php

declare(strict_types=1);

namespace Blockshot;

defined('ABSPATH') || exit;

final class CPT {

	public const POST_TYPE = 'blockshot';

	public static function register(): void {
		register_post_type(self::POST_TYPE, [
			'labels' => [
				'name'                   => __('Blockshots', 'blockshot'),
				'singular_name'          => __('Blockshot', 'blockshot'),
				'add_new'                => __('Add New', 'blockshot'),
				'add_new_item'           => __('Add New Blockshot', 'blockshot'),
				'edit_item'              => __('Edit Blockshot', 'blockshot'),
				'new_item'               => __('New Blockshot', 'blockshot'),
				'view_item'              => __('View Blockshot', 'blockshot'),
				'search_items'           => __('Search Blockshots', 'blockshot'),
				'not_found'              => __('No blockshots found.', 'blockshot'),
				'not_found_in_trash'     => __('No blockshots found in Trash.', 'blockshot'),
				'all_items'              => __('All Blockshots', 'blockshot'),
				'menu_name'              => __('Blockshot', 'blockshot'),
				'item_updated'           => __('Blockshot updated.', 'blockshot'),
				'item_published'         => __('Blockshot published.', 'blockshot'),
				'item_scheduled'         => __('Blockshot scheduled.', 'blockshot'),
				'item_reverted_to_draft' => __('Blockshot reverted to draft.', 'blockshot'),
				'item_trashed'           => __('Blockshot moved to the Trash.', 'blockshot'),
				'item_untrashed'         => __('Blockshot restored from the Trash.', 'blockshot'),
			],
			'public'              => false,
			'publicly_queryable'  => true,
			'show_ui'             => true,
			'show_in_menu'        => true,
			'show_in_rest'        => true,
			'show_in_nav_menus'   => false,
			'menu_icon'           => 'data:image/svg+xml;base64,' . base64_encode('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="currentColor" d="M12 9.2c-2.2 0-3.9 1.8-3.9 4s1.8 4 3.9 4 4-1.8 4-4-1.8-4-4-4zm0 6.5c-1.4 0-2.4-1.1-2.4-2.5s1.1-2.5 2.4-2.5 2.5 1.1 2.5 2.5-1.1 2.5-2.5 2.5zM20.2 8c-.1 0-.3 0-.5-.1l-2.5-.8c-.4-.1-.8-.4-1.1-.8l-1-1.5c-.4-.5-1-.9-1.7-.9h-2.9c-.6.1-1.2.4-1.6 1l-1 1.5c-.3.3-.6.6-1.1.7l-2.5.8c-.2.1-.4.1-.6.1-1 .2-1.7.9-1.7 1.9v8.3c0 1 .9 1.9 2 1.9h16c1.1 0 2-.8 2-1.9V9.9c0-1-.7-1.7-1.8-1.9zm.3 10.1c0 .2-.2.4-.5.4H4c-.3 0-.5-.2-.5-.4V9.9c0-.1.2-.3.5-.4.2 0 .5-.1.8-.2l2.5-.8c.7-.2 1.4-.6 1.8-1.3l1-1.5c.1-.1.2-.2.4-.2h2.9c.2 0 .3.1.4.2l1 1.5c.4.7 1.1 1.1 1.9 1.4l2.5.8c.3.1.6.1.8.2.3 0 .4.2.4.4v8.1z"/></svg>'),
			'menu_position'       => 21,
			'supports'            => ['title', 'editor', 'revisions'],
			'has_archive'         => false,
			'rewrite'             => false,
			'exclude_from_search' => true,
			'capability_type'     => self::POST_TYPE,
			'map_meta_cap'        => true,
			'template'            => [
				['blockshot/canvas', [], [
					['core/paragraph'],
				]],
			],
			'template_lock'       => 'insert',
		]);

		self::grant_admin_capabilities();

		add_action('add_meta_boxes', [self::class, 'remove_meta_boxes'], 99);
		add_action('enqueue_block_editor_assets', [self::class, 'dequeue_block_visibility'], 999);
		add_action('enqueue_block_assets', [self::class, 'dequeue_block_visibility_styles'], 999);
	}

	/**
	 * Dequeue Block Visibility plugin scripts on the Blockshot CPT edit screen.
	 */
	public static function dequeue_block_visibility(): void {
		$screen = get_current_screen();
		if (!$screen || $screen->post_type !== self::POST_TYPE) {
			return;
		}

		wp_dequeue_script('block-visibility-editor-scripts');
		wp_dequeue_style('block-visibility-editor-styles');
	}

	/**
	 * Dequeue Block Visibility plugin styles on the Blockshot CPT edit screen.
	 */
	public static function dequeue_block_visibility_styles(): void {
		$screen = get_current_screen();
		if (!$screen || $screen->post_type !== self::POST_TYPE) {
			return;
		}

		wp_dequeue_style('block-visibility-contextual-indicator-styles');
	}

	/**
	 * Strip classic meta boxes that should not appear on the Blockshot CPT.
	 */
	public static function remove_meta_boxes(string $post_type): void {
		if ($post_type !== self::POST_TYPE) {
			return;
		}

		$meta_boxes_to_remove = [
			['wpseo_meta', 'normal'],
			['wpseo_meta', 'side'],
			['postcustom', 'normal'],
			['slugdiv', 'normal'],
			['authordiv', 'normal'],
		];

		foreach ($meta_boxes_to_remove as [$id, $context]) {
			remove_meta_box($id, self::POST_TYPE, $context);
		}
	}

	private static function grant_admin_capabilities(): void {
		$admin = get_role('administrator');
		if (!$admin) {
			return;
		}

		$caps = [
			'edit_blockshot',
			'read_blockshot',
			'delete_blockshot',
			'edit_blockshots',
			'edit_others_blockshots',
			'publish_blockshots',
			'read_private_blockshots',
			'delete_blockshots',
			'delete_private_blockshots',
			'delete_published_blockshots',
			'delete_others_blockshots',
			'edit_private_blockshots',
			'edit_published_blockshots',
			'create_blockshots',
		];

		foreach ($caps as $cap) {
			if (!$admin->has_cap($cap)) {
				$admin->add_cap($cap);
			}
		}
	}
}
