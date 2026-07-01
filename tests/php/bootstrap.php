<?php
/**
 * PHPUnit bootstrap for Block Actions integration tests.
 *
 * Loads the WordPress test suite (provided by @wordpress/env in the
 * tests-cli container, or by bin/install-wp-tests.sh in CI), then loads
 * this plugin on `muplugins_loaded` so its hooks register before the
 * test WordPress finishes booting.
 *
 * @package Block_Actions
 */

$_tests_dir = getenv( 'WP_TESTS_DIR' );
if ( ! $_tests_dir ) {
	$_tests_dir = rtrim( sys_get_temp_dir(), '/\\' ) . '/wordpress-tests-lib';
}

$_functions = $_tests_dir . '/includes/functions.php';
if ( ! file_exists( $_functions ) ) {
	fwrite(
		STDERR,
		"Could not find the WordPress test suite at {$_tests_dir}.\n" .
		"Set WP_TESTS_DIR or run via `npm run test:php` (wp-env).\n"
	);
	exit( 1 );
}

require_once $_functions;

/**
 * Load the plugin under test.
 */
tests_add_filter(
	'muplugins_loaded',
	static function () {
		require dirname( __DIR__, 2 ) . '/block-actions.php';
	}
);

require $_tests_dir . '/includes/bootstrap.php';
