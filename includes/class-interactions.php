<?php
/**
 * Trigger × behavior × target: serialization and trigger wiring.
 *
 * Generalizes "a block has an action" into "a block has interactions",
 * each a tuple of { action, trigger, conditions }. The progressive
 * format keeps today's markup for today's behavior:
 *
 * - A single click-triggered, unconditioned interaction serializes as
 *   it always has (`data-action` + flat `data-*` fields) — canonical,
 *   not a back-compat shim.
 * - A non-default trigger or conditions ADD a `data-interactions` JSON
 *   attribute carrying the tuple; the classic attributes stay (they
 *   remain the config channel renderers read), so the rich attribute
 *   is pure trigger/condition metadata. kses entity-encodes the JSON
 *   for low-capability authors, and WP_HTML_Tag_Processor decodes it
 *   back byte-identical (verified on WP 7.0 — spike #2).
 *
 * v1 scope: ONE interaction per block, all five triggers, viewport +
 * reduced-motion conditions. Multiple interactions per block are
 * blocked on the context-multiplexing spike (#1), which needs
 * in-browser hydration verification.
 *
 * @since 3.1.0
 * @package Block_Actions
 */

namespace Block_Actions;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Interactions: tuple validation + trigger directive injection.
 *
 * @since 3.1.0
 */
class Interactions {

	/**
	 * The trigger vocabulary.
	 *
	 * @var string[]
	 */
	const TRIGGERS = array( 'click', 'hover', 'scroll-into-view', 'load', 'timer' );

	/**
	 * Hard cap on tuples in one data-interactions attribute.
	 */
	const MAX_TUPLES = 10;

	/**
	 * Default timer delay (ms) when the author didn't set one.
	 */
	const DEFAULT_DELAY = 4000;

	/**
	 * Parse and validate a data-interactions attribute for an action.
	 *
	 * Returns the validated tuple for this action — or the default
	 * (click, no conditions) when the attribute is absent, malformed,
	 * or fails validation. Validation is the same security posture as
	 * theme-action forwarding: allowlisted triggers and condition keys,
	 * numeric values through absint, everything else dropped.
	 *
	 * @since 3.1.0
	 *
	 * @param string|null $raw       Raw attribute value (already
	 *                               entity-decoded by the tag processor).
	 * @param string      $action_id The action being rendered.
	 * @param string[]    $allowed   Triggers this action supports.
	 * @return array{trigger: string, delay: int, conditions: array} Tuple.
	 */
	public static function parse( ?string $raw, string $action_id, array $allowed = self::TRIGGERS ): array {
		// The fallback trigger must itself be ALLOWED: an action that
		// deliberately omits click (a scroll-reveal-only theme action)
		// must not be silently wired to click anyway.
		$fallback = in_array( 'click', $allowed, true )
			? 'click'
			: ( $allowed[0] ?? 'click' );

		$default = array(
			'trigger'    => $fallback,
			'delay'      => self::DEFAULT_DELAY,
			'conditions' => array(),
		);

		if ( ! is_string( $raw ) || '' === $raw ) {
			return $default;
		}

		$tuples = json_decode( $raw, true );
		if ( ! is_array( $tuples ) ) {
			debug_log( sprintf( 'Ignoring malformed data-interactions on a "%s" block.', $action_id ) );
			return $default;
		}

		if ( count( $tuples ) > self::MAX_TUPLES ) {
			debug_log( sprintf( 'data-interactions carries more than %d tuples — extra entries ignored.', self::MAX_TUPLES ) );
			$tuples = array_slice( $tuples, 0, self::MAX_TUPLES );
		}

		foreach ( $tuples as $tuple ) {
			if ( ! is_array( $tuple ) || ( $tuple['action'] ?? '' ) !== $action_id ) {
				continue;
			}

			$trigger = $tuple['trigger'] ?? $fallback;
			if ( ! in_array( $trigger, self::TRIGGERS, true ) ) {
				debug_log( sprintf( 'Unknown trigger "%s" on a "%s" block — falling back to "%s".', (string) $trigger, $action_id, $fallback ) );
				$trigger = $fallback;
			}
			if ( ! in_array( $trigger, $allowed, true ) ) {
				debug_log( sprintf( 'Trigger "%s" is not supported by action "%s" — falling back to "%s".', $trigger, $action_id, $fallback ) );
				$trigger = $fallback;
			}

			$conditions = array();
			$raw_cond   = isset( $tuple['conditions'] ) && is_array( $tuple['conditions'] ) ? $tuple['conditions'] : array();
			if ( isset( $raw_cond['minWidth'] ) && absint( $raw_cond['minWidth'] ) > 0 ) {
				$conditions['minWidth'] = absint( $raw_cond['minWidth'] );
			}
			if ( isset( $raw_cond['maxWidth'] ) && absint( $raw_cond['maxWidth'] ) > 0 ) {
				$conditions['maxWidth'] = absint( $raw_cond['maxWidth'] );
			}
			if ( isset( $raw_cond['reducedMotion'] ) && 'skip' === $raw_cond['reducedMotion'] ) {
				$conditions['reducedMotion'] = 'skip';
			}

			return array(
				'trigger'    => $trigger,
				'delay'      => isset( $tuple['delay'] ) && absint( $tuple['delay'] ) > 0 ? absint( $tuple['delay'] ) : self::DEFAULT_DELAY,
				'conditions' => $conditions,
			);
		}

		return $default;
	}

	/**
	 * Inject the trigger wiring for a behavioral action.
	 *
	 * Fast path first: a click/hover tuple without conditions is pure
	 * directive injection against the action's own store — for the
	 * default click that output is byte-identical to the pre-trigger
	 * pipeline. Everything else routes through the dispatcher engine
	 * (`block-actions/interactions`), configured via validated
	 * `data-ba-*` attributes.
	 *
	 * @since 3.1.0
	 *
	 * @param \WP_HTML_Tag_Processor $p               Processor at the root element.
	 * @param string                 $store_namespace The action's store namespace.
	 * @param string                 $entry           Entry action ref (e.g. 'actions.toggle').
	 * @param array                  $tuple           Validated tuple from parse().
	 * @return bool True when the dispatcher engine is needed.
	 */
	public static function apply_trigger( \WP_HTML_Tag_Processor $p, string $store_namespace, string $entry, array $tuple ): bool {
		$has_conditions = ! empty( $tuple['conditions'] );

		if ( ! $has_conditions && 'click' === $tuple['trigger'] ) {
			$p->set_attribute( 'data-wp-on--click', $entry );
			return false;
		}

		if ( ! $has_conditions && 'hover' === $tuple['trigger'] ) {
			// Keyboard parity is wiring, not a checkbox: hover always
			// pairs with focus.
			$p->set_attribute( 'data-wp-on--mouseenter', $entry );
			$p->set_attribute( 'data-wp-on--focusin', $entry );
			return false;
		}

		// Engine path. The entry is armed as a directive against the
		// action's OWN store, listening for the engine's synthetic
		// ba-fire event — the RUNTIME then evaluates it in the element's
		// real namespace scope (a programmatic store(ns) call from the
		// engine would bind the wrong context; review #11). Config
		// travels as validated data-ba-* attributes read at fire time.
		$p->set_attribute( 'data-wp-on--ba-fire', $entry );
		$p->set_attribute( 'data-ba-trigger', $tuple['trigger'] );

		if ( 'timer' === $tuple['trigger'] ) {
			$p->set_attribute( 'data-ba-delay', (string) $tuple['delay'] );
		}
		if ( isset( $tuple['conditions']['minWidth'] ) ) {
			$p->set_attribute( 'data-ba-min-width', (string) $tuple['conditions']['minWidth'] );
		}
		if ( isset( $tuple['conditions']['maxWidth'] ) ) {
			$p->set_attribute( 'data-ba-max-width', (string) $tuple['conditions']['maxWidth'] );
		}
		if ( isset( $tuple['conditions']['reducedMotion'] ) ) {
			$p->set_attribute( 'data-ba-reduced-motion', 'skip' );
		}

		if ( 'click' === $tuple['trigger'] ) {
			$p->set_attribute( 'data-wp-on--click', 'block-actions/interactions::actions.dispatch' );
		} elseif ( 'hover' === $tuple['trigger'] ) {
			$p->set_attribute( 'data-wp-on--mouseenter', 'block-actions/interactions::actions.dispatch' );
			$p->set_attribute( 'data-wp-on--focusin', 'block-actions/interactions::actions.dispatch' );
		} else {
			// load / timer / scroll-into-view arm in the engine's init.
			// The suffixed directive is ADDITIVE — the action's own
			// data-wp-init (feedback stores, modal wiring) keeps running.
			$p->set_attribute( 'data-wp-init--ba-trigger', 'block-actions/interactions::callbacks.initTrigger' );
		}

		return true;
	}

	/**
	 * Enqueue the dispatcher engine's view module.
	 *
	 * @since 3.1.0
	 *
	 * @return void
	 */
	public static function enqueue_engine(): void {
		// One stat/include cycle per request — N engine-routed blocks on
		// a page would otherwise re-run it N times (the module registry
		// de-dupes, this work wouldn't).
		static $done = false;
		if ( $done ) {
			return;
		}
		$done = true;

		$js_path = 'build/actions/interactions/view.js';
		if ( ! file_exists( DIR . $js_path ) ) {
			return;
		}
		$asset_path = 'build/actions/interactions/view.asset.php';
		$asset      = file_exists( DIR . $asset_path )
			? include DIR . $asset_path
			: array(
				'dependencies' => array( '@wordpress/interactivity' ),
				'version'      => (string) filemtime( DIR . $js_path ),
			);

		wp_enqueue_script_module(
			'block-actions/interactions-view',
			URL . $js_path,
			$asset['dependencies'],
			$asset['version']
		);
	}
}
