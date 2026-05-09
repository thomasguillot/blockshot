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
	 * Block users without edit_blockshots from viewing blockshot posts on the
	 * frontend. Returns 404 instead of 403 to avoid leaking the existence of
	 * the URL.
	 */
	public static function restrict_frontend_access(): void {
		if (!is_singular(CPT::POST_TYPE)) {
			return;
		}

		if (current_user_can('edit_blockshots')) {
			return;
		}

		global $wp_query;
		$wp_query->set_404();
		status_header(404);
		nocache_headers();

		$template = get_query_template('404');
		if ($template) {
			include $template;
			exit;
		}

		// Theme didn't ship a 404 template — fall back to a minimal one so
		// the response isn't a blank body.
		wp_die(
			esc_html__('The page you were looking for could not be found.', 'blockshot'),
			esc_html__('Not Found', 'blockshot'),
			['response' => 404]
		);
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
	 * Restrict REST API access to the blockshot CPT endpoints.
	 *
	 * The CPT itself uses granular capabilities via map_meta_cap, but those only
	 * gate write operations. Reads default to public when show_in_rest is true,
	 * so we additionally require edit_blockshots on the collection routes.
	 */
	public static function restrict_rest_access(mixed $result, \WP_REST_Server $server, \WP_REST_Request $request): mixed {
		$route = $request->get_route();
		$prefix = '/wp/v2/' . CPT::POST_TYPE;

		$matches_collection = $route === $prefix;
		$matches_item = str_starts_with($route, $prefix . '/');

		if (!$matches_collection && !$matches_item) {
			return $result;
		}

		if (current_user_can('edit_blockshots')) {
			return $result;
		}

		return new \WP_Error(
			'rest_forbidden',
			__('You do not have permission to access this resource.', 'blockshot'),
			['status' => rest_authorization_required_code()]
		);
	}
}
