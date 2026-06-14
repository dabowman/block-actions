<?php
/**
 * Theme-action manifest parsing & validation (Task 5.6).
 *
 * @package Block_Actions
 */

class Test_Manifests extends WP_UnitTestCase {

	/* ---- sanitize_manifest_fields ---- */

	public function test_valid_field_is_kept(): void {
		$fields = \Block_Actions\sanitize_manifest_fields(
			array(
				array(
					'key'           => 'target',
					'type'          => 'text',
					'label'         => 'Target ID',
					'dataAttribute' => 'data-target',
					'required'      => true,
					'default'       => '',
				),
			)
		);
		$this->assertCount( 1, $fields );
		$this->assertSame( 'target', $fields[0]['key'] );
		$this->assertSame( 'data-target', $fields[0]['dataAttribute'] );
		$this->assertTrue( $fields[0]['required'] );
	}

	public function test_invalid_key_or_data_attribute_dropped(): void {
		$fields = \Block_Actions\sanitize_manifest_fields(
			array(
				array( 'key' => 'bad-key', 'dataAttribute' => 'data-x' ),     // hyphen in key
				array( 'key' => 'ok', 'dataAttribute' => 'href' ),            // not data-*
				array( 'key' => 'good', 'dataAttribute' => 'data-good' ),     // valid
				'not-an-array',
			)
		);
		$this->assertCount( 1, $fields );
		$this->assertSame( 'good', $fields[0]['key'] );
	}

	public function test_field_type_defaults_to_text(): void {
		$fields = \Block_Actions\sanitize_manifest_fields(
			array( array( 'key' => 'a', 'dataAttribute' => 'data-a', 'type' => 'bogus' ) )
		);
		$this->assertSame( 'text', $fields[0]['type'] );
	}

	/* ---- sanitize_manifest_directives ---- */

	public function test_only_data_wp_directives_survive(): void {
		$directives = \Block_Actions\sanitize_manifest_directives(
			array(
				'data-wp-on--keydown' => 'actions.handleKeydown',
				'data-wp-bind--hidden' => 'context.isHidden',
				'onclick'             => 'alert(1)',   // not data-wp-*
				'data-target'         => 'x',          // data-* but not data-wp-*
				'data-wp-text'        => array( 'nope' ), // non-string value
			)
		);
		$this->assertSame(
			array(
				'data-wp-on--keydown'  => 'actions.handleKeydown',
				'data-wp-bind--hidden' => 'context.isHidden',
			),
			$directives
		);
	}

	/* ---- read_action_manifest ---- */

	public function test_reads_sibling_manifest(): void {
		$dir = get_temp_dir() . 'ba-manifest-' . wp_rand();
		mkdir( $dir );
		$js   = $dir . '/my-action.js';
		$json = $dir . '/my-action.json';
		file_put_contents( $js, '// action' );
		file_put_contents(
			$json,
			wp_json_encode(
				array(
					'label'      => 'My Action',
					'fields'     => array(
						array( 'key' => 'target', 'dataAttribute' => 'data-target', 'label' => 'Target' ),
					),
					'directives' => array( 'data-wp-on--keydown' => 'actions.onKey' ),
				)
			)
		);

		$manifest = \Block_Actions\read_action_manifest( $js );

		$this->assertSame( 'My Action', $manifest['label'] );
		$this->assertCount( 1, $manifest['fields'] );
		$this->assertSame( 'actions.onKey', $manifest['directives']['data-wp-on--keydown'] );

		unlink( $js );
		unlink( $json );
		rmdir( $dir );
	}

	public function test_missing_manifest_returns_null(): void {
		$dir = get_temp_dir() . 'ba-manifest-' . wp_rand();
		mkdir( $dir );
		$js = $dir . '/solo.js';
		file_put_contents( $js, '// action' );

		$this->assertNull( \Block_Actions\read_action_manifest( $js ) );

		unlink( $js );
		rmdir( $dir );
	}

	public function test_invalid_json_returns_null(): void {
		$dir = get_temp_dir() . 'ba-manifest-' . wp_rand();
		mkdir( $dir );
		$js   = $dir . '/broken.js';
		$json = $dir . '/broken.json';
		file_put_contents( $js, '// action' );
		file_put_contents( $json, '{ not valid json' );

		$this->assertNull( \Block_Actions\read_action_manifest( $js ) );

		unlink( $js );
		unlink( $json );
		rmdir( $dir );
	}
}
