<?php

declare(strict_types=1);

namespace Blockshot;

defined('ABSPATH') || exit;

final class Security {

	public static function init(): void {
		add_action('template_redirect', [self::class, 'restrict_frontend_access']);
		add_action('pre_get_posts', [self::class, 'exclude_from_queries']);
		add_filter('wp_headers', [self::class, 'add_noindex_header']);
		add_action('wp_head', [self::class, 'add_noindex_meta'], 1);
		add_filter('wp_sitemaps_post_types', [self::class, 'exclude_from_sitemap']);
		add_filter('rest_pre_dispatch', [self::class, 'restrict_rest_access'], 10, 3);
	}

	/**
	 * Block non-admin visitors from viewing blockshot posts on the frontend.
	 */
	public static function restrict_frontend_access(): void {
		if (!is_singular(CPT::POST_TYPE)) {
			return;
		}

		if (!current_user_can('manage_options')) {
			wp_die(
				esc_html__('You do not have permission to view this page.', 'blockshot'),
				esc_html__('Forbidden', 'blockshot'),
				['response' => 403]
			);
		}
	}

	/**
	 * Exclude blockshot from feeds. The CPT is already excluded from most
	 * public queries via public => false, but this is belt-and-braces for feeds.
	 */
	public static function exclude_from_queries(\WP_Query $query): void {
		if (is_admin() || !$query->is_main_query()) {
			return;
		}

		if ($query->is_feed()) {
			$post_type = $query->get('post_type');
			if (empty($post_type) || $post_type === 'any') {
				$query->set('post_type', 'post');
			}
		}
	}

	/**
	 * Send X-Robots-Tag header on blockshot pages.
	 */
	public static function add_noindex_header(array $headers): array {
		if (is_singular(CPT::POST_TYPE)) {
			$headers['X-Robots-Tag'] = 'noindex, nofollow';
		}
		return $headers;
	}

	/**
	 * Output noindex meta tag in <head> for blockshot pages.
	 */
	public static function add_noindex_meta(): void {
		if (is_singular(CPT::POST_TYPE)) {
			echo '<meta name="robots" content="noindex, nofollow">' . "\n";
		}
	}

	/**
	 * Remove blockshot from the sitemap.
	 */
	public static function exclude_from_sitemap(array $post_types): array {
		unset($post_types[CPT::POST_TYPE]);
		return $post_types;
	}

	/**
	 * Restrict REST API access to blockshot endpoints for non-admins.
	 */
	public static function restrict_rest_access(mixed $result, \WP_REST_Server $server, \WP_REST_Request $request): mixed {
		$route = $request->get_route();

		if (str_contains($route, '/wp/v2/' . CPT::POST_TYPE)) {
			if (!current_user_can('manage_options')) {
				return new \WP_Error(
					'rest_forbidden',
					__('You do not have permission to access this resource.', 'blockshot'),
					['status' => 403]
				);
			}
		}

		return $result;
	}
}
