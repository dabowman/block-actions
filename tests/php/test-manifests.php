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

	public function test_target_field_type_and_constraints_survive(): void {
		$fields = \Block_Actions\sanitize_manifest_fields(
			array(
				array(
					'key'           => 'panel',
					'type'          => 'target',
					'dataAttribute' => 'data-panel',
					'optional'      => true,
					'targets'       => array(
						'blocks' => array( 'core/group', 42 ),
						'shape'  => 'Dialog!',
					),
				),
			)
		);
		$this->assertSame( 'target', $fields[0]['type'] );
		$this->assertTrue( $fields[0]['optional'] );
		// Non-string block entries dropped; shape run through sanitize_key.
		$this->assertSame( array( 'core/group' ), $fields[0]['targets']['blocks'] );
		$this->assertSame( 'dialog', $fields[0]['targets']['shape'] );
	}

	public function test_reserved_data_attributes_dropped(): void {
		// data-action would overwrite the routing id; data-wp-* would
		// smuggle a live directive through the fields path.
		$fields = \Block_Actions\sanitize_manifest_fields(
			array(
				array( 'key' => 'a', 'dataAttribute' => 'data-action' ),
				array( 'key' => 'b', 'dataAttribute' => 'data-wp-bind--href' ),
				array( 'key' => 'c', 'dataAttribute' => 'data-wp-on--mouseover' ),
				array( 'key' => 'ok', 'dataAttribute' => 'data-speed' ),
			)
		);
		$this->assertCount( 1, $fields );
		$this->assertSame( 'ok', $fields[0]['key'] );
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

	public function test_window_and_document_scoped_directives_survive(): void {
		// The single-hyphen infix in on-window / on-document must pass —
		// global listeners are the headline manifest use case.
		$directives = \Block_Actions\sanitize_manifest_directives(
			array(
				'data-wp-on-window--resize'    => 'callbacks.onResize',
				'data-wp-on-document--keydown' => 'callbacks.onKeydown',
			)
		);
		$this->assertCount( 2, $directives );
	}

	public function test_reserved_directives_dropped(): void {
		// The transformer owns these: a manifest may add behavior but
		// never repoint the store, wipe the sanitized context, or replace
		// the guaranteed init/click wiring. Suffixed variants stay
		// available for additive handlers.
		$directives = \Block_Actions\sanitize_manifest_directives(
			array(
				'data-wp-interactive'   => 'other/ns',
				'data-wp-context'       => '{}',
				'data-wp-init'          => 'callbacks.hijack',
				'data-wp-on--click'     => 'actions.hijack',
				'data-wp-init---extra'  => 'callbacks.alsoInit',
				'data-wp-on--dblclick'  => 'actions.fine',
			)
		);
		$this->assertSame(
			array(
				'data-wp-init---extra' => 'callbacks.alsoInit',
				'data-wp-on--dblclick' => 'actions.fine',
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
