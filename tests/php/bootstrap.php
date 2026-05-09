<?php
/**
 * PHPUnit bootstrap for Blockshot.
 *
 * @package Blockshot\Tests
 */

declare(strict_types=1);

$_tests_dir = getenv('WP_TESTS_DIR') ?: '/tmp/wordpress-tests-lib';

if (!file_exists($_tests_dir . '/includes/functions.php')) {
	fwrite(
		STDERR,
		"\n[Blockshot] WordPress test framework not found at $_tests_dir.\n"
		. "Run bin/install-wp-tests.sh <db-name> <db-user> <db-pass> [db-host] [wp-version]\n"
		. "or set WP_TESTS_DIR to an existing install. See README.md → Testing.\n\n"
	);
	exit(1);
}

// Point WP test bootstrap at locally-installed PHPUnit polyfills.
$_polyfills = dirname(__DIR__, 2) . '/vendor/yoast/phpunit-polyfills';
if (file_exists($_polyfills . '/phpunitpolyfills-autoload.php')) {
	define('WP_TESTS_PHPUNIT_POLYFILLS_PATH', $_polyfills);
}

require_once $_tests_dir . '/includes/functions.php';

tests_add_filter('muplugins_loaded', function (): void {
	require dirname(__DIR__, 2) . '/blockshot.php';
});

require $_tests_dir . '/includes/bootstrap.php';
