<?php

declare(strict_types=1);

namespace Blockshot;

defined('ABSPATH') || exit;

final class Settings {

	public const OPTION_NAME = 'blockshot_settings';
	public const PAGE_SLUG   = 'blockshot-settings';

	public const DEFAULTS = [
		'format'  => 'png',
		'quality' => 90,
		'scale'   => 2,
	];

	private const VALID_FORMATS = ['png', 'jpg'];
	private const VALID_SCALES  = [1, 2, 3, 4];

	public static function register(): void {
		register_setting(self::PAGE_SLUG, self::OPTION_NAME, [
			'type'              => 'object',
			'default'           => self::DEFAULTS,
			'sanitize_callback' => [self::class, 'sanitize'],
			'show_in_rest'      => [
				'schema' => [
					'type'       => 'object',
					'properties' => [
						'format'  => ['type' => 'string', 'enum' => self::VALID_FORMATS],
						'quality' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 100],
						'scale'   => ['type' => 'integer', 'enum' => self::VALID_SCALES],
					],
				],
			],
		]);
	}

	public static function register_rest_routes(): void {
		register_rest_route('blockshot/v1', '/settings', [
			[
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => [self::class, 'rest_get_settings'],
				'permission_callback' => function () {
					return current_user_can('manage_options');
				},
			],
			[
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => [self::class, 'rest_update_settings'],
				'permission_callback' => function () {
					return current_user_can('manage_options');
				},
				'args' => [
					'format' => [
						'type'     => 'string',
						'enum'     => self::VALID_FORMATS,
						'required' => false,
					],
					'quality' => [
						'type'     => 'integer',
						'minimum'  => 1,
						'maximum'  => 100,
						'required' => false,
					],
					'scale' => [
						'type'     => 'integer',
						'enum'     => self::VALID_SCALES,
						'required' => false,
					],
				],
			],
		]);
	}

	public static function rest_get_settings(\WP_REST_Request $request): \WP_REST_Response {
		$settings = get_option(self::OPTION_NAME, self::DEFAULTS);
		$settings = wp_parse_args($settings, self::DEFAULTS);

		return new \WP_REST_Response($settings, 200);
	}

	public static function rest_update_settings(\WP_REST_Request $request): \WP_REST_Response {
		$input = $request->get_json_params();
		$current = get_option(self::OPTION_NAME, self::DEFAULTS);
		$current = wp_parse_args($current, self::DEFAULTS);

		$merged = array_merge($current, $input);
		$sanitized = self::sanitize($merged);
		update_option(self::OPTION_NAME, $sanitized);

		return new \WP_REST_Response($sanitized, 200);
	}

	public static function sanitize(mixed $input): array {
		$clean = self::DEFAULTS;

		if (!is_array($input)) {
			return $clean;
		}

		if (isset($input['format']) && in_array($input['format'], self::VALID_FORMATS, true)) {
			$clean['format'] = $input['format'];
		}

		if (isset($input['quality'])) {
			$quality = absint($input['quality']);
			$clean['quality'] = max(1, min(100, $quality));
		}

		if (isset($input['scale'])) {
			$scale = absint($input['scale']);
			if (in_array($scale, self::VALID_SCALES, true)) {
				$clean['scale'] = $scale;
			}
		}

		return $clean;
	}
}
