/**
 * Test Action — Interactivity API Store
 *
 * @since 2.0.0
 */

import { store } from '@wordpress/interactivity';
import {
	createFeedbackInit,
	createFeedbackAction,
} from '../utils/create-feedback-store';
import { validateStyle } from '../utils/sanitize';

const timers = new WeakMap();

store( 'block-actions/test-action', {
	actions: {
		handleClick: createFeedbackAction( timers, {
			perform( ctx, ref, target ) {
				const activeColor = validateStyle( 'backgroundColor', 'red' );
				if ( activeColor ) {
					target.style.backgroundColor = activeColor;
				}
			},
			feedbackText: () => 'it worked!',
			duration: 2000,
			onRestore( ctx, target ) {
				target.removeAttribute( 'style' );
			},
		} ),
	},
	callbacks: {
		init: createFeedbackInit( timers ),
	},
} );
