<?php
/**
 * @package Blockshot\Tests
 */

declare(strict_types=1);

use Blockshot\CPT;
use Blockshot\Security;

class Test_Blockshot_Security extends WP_UnitTestCase {

	private static int $admin_id;
	private static int $subscriber_id;

	public static function wpSetUpBeforeClass($factory): void {
		self::$admin_id = $factory->user->create(['role' => 'administrator']);
		self::$subscriber_id = $factory->user->create(['role' => 'subscriber']);

		// Ensure the administrator role has Blockshot caps. The plugin grants
		// these on activation; in the test environment we apply them directly.
		CPT::grant_admin_capabilities();
	}

	public function tearDown(): void {
		wp_set_current_user(0);
		parent::tearDown();
	}

	public function test_restrict_rest_access_allows_unrelated_routes(): void {
		$request = new WP_REST_Request('GET', '/wp/v2/posts');
		$result = Security::restrict_rest_access(null, rest_get_server(), $request);
		$this->assertNull($result);
	}

	public function test_restrict_rest_access_blocks_unauthorized_user_on_collection_route(): void {
		wp_set_current_user(self::$subscriber_id);

		$request = new WP_REST_Request('GET', '/wp/v2/' . CPT::POST_TYPE);
		$result = Security::restrict_rest_access(null, rest_get_server(), $request);

		$this->assertInstanceOf(WP_Error::class, $result);
		$this->assertSame('rest_forbidden', $result->get_error_code());
	}

	public function test_restrict_rest_access_blocks_unauthorized_user_on_item_route(): void {
		wp_set_current_user(self::$subscriber_id);

		$request = new WP_REST_Request('GET', '/wp/v2/' . CPT::POST_TYPE . '/123');
		$result = Security::restrict_rest_access(null, rest_get_server(), $request);

		$this->assertInstanceOf(WP_Error::class, $result);
	}

	public function test_restrict_rest_access_allows_authorized_user(): void {
		wp_set_current_user(self::$admin_id);

		$request = new WP_REST_Request('GET', '/wp/v2/' . CPT::POST_TYPE);
		$result = Security::restrict_rest_access(null, rest_get_server(), $request);

		$this->assertNull($result);
	}

	public function test_restrict_rest_access_does_not_match_similar_prefixed_routes(): void {
		// Reproduces review item #2: str_contains was too loose. Ensure a route
		// like /wp/v2/blockshots-foo (different post type sharing a prefix) is
		// not accidentally matched.
		wp_set_current_user(self::$subscriber_id);

		$request = new WP_REST_Request('GET', '/wp/v2/' . CPT::POST_TYPE . 'foo');
		$result = Security::restrict_rest_access(null, rest_get_server(), $request);

		$this->assertNull($result);
	}
}
