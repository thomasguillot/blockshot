<?php
/**
 * @package Blockshot\Tests
 */

declare(strict_types=1);

use Blockshot\Settings;

class Test_Blockshot_Settings extends WP_UnitTestCase {

	public function tearDown(): void {
		delete_option(Settings::OPTION_NAME);
		parent::tearDown();
	}

	public function test_sanitize_returns_defaults_for_non_array_input(): void {
		$this->assertSame(Settings::DEFAULTS, Settings::sanitize(null));
		$this->assertSame(Settings::DEFAULTS, Settings::sanitize('not an array'));
		$this->assertSame(Settings::DEFAULTS, Settings::sanitize(42));
	}

	public function test_sanitize_accepts_valid_format(): void {
		$result = Settings::sanitize(['format' => 'jpg']);
		$this->assertSame('jpg', $result['format']);
	}

	public function test_sanitize_rejects_invalid_format(): void {
		$result = Settings::sanitize(['format' => 'webp']);
		$this->assertSame('png', $result['format']);
	}

	public function test_sanitize_clamps_quality_to_1_100_range(): void {
		$this->assertSame(100, Settings::sanitize(['quality' => 999])['quality']);
		$this->assertSame(1, Settings::sanitize(['quality' => 0])['quality']);
		$this->assertSame(75, Settings::sanitize(['quality' => 75])['quality']);
	}

	public function test_sanitize_only_accepts_valid_scales(): void {
		$this->assertSame(2, Settings::sanitize(['scale' => 5])['scale']); // 5 invalid -> default
		$this->assertSame(3, Settings::sanitize(['scale' => 3])['scale']);
	}

	public function test_rest_update_settings_handles_null_input_without_crashing(): void {
		// Reproduces DSGNEWS-161 review item #1: array_merge($current, null) used to TypeError.
		$request = new WP_REST_Request('POST', '/blockshot/v1/settings');
		$request->set_body(''); // Non-JSON body -> get_json_params() returns null.
		$request->set_header('content-type', 'application/json');

		$response = Settings::rest_update_settings($request);

		$this->assertInstanceOf(WP_REST_Response::class, $response);
		$this->assertSame(200, $response->get_status());
		$this->assertSame(Settings::DEFAULTS, $response->get_data());
	}

	public function test_rest_update_settings_persists_partial_update(): void {
		$request = new WP_REST_Request('POST', '/blockshot/v1/settings');
		$request->set_body(wp_json_encode(['format' => 'jpg', 'quality' => 50]));
		$request->set_header('content-type', 'application/json');

		$response = Settings::rest_update_settings($request);
		$data = $response->get_data();

		$this->assertSame('jpg', $data['format']);
		$this->assertSame(50, $data['quality']);
		$this->assertSame(Settings::DEFAULTS['scale'], $data['scale']);
		$this->assertSame($data, get_option(Settings::OPTION_NAME));
	}
}
