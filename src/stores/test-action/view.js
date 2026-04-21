/**
 * Test Action — Interactivity API Store
 *
 * Demo action: click the button to briefly turn it red with
 * "it worked!" text, then restore.
 *
 * @since 2.0.0
 */

import { store, getContext } from '@wordpress/interactivity';
import {
	createFeedbackInit,
	createFeedbackAction,
} from '../utils/create-feedback-store';

const timers = new WeakMap();

const { state } = store( 'block-actions/test-action', {
	state: {
		get buttonText() {
			const ctx = getContext();
			return ctx.isScrolling ? 'it worked!' : ctx.originalText;
		},
		get backgroundColor() {
			return getContext().isScrolling ? 'red' : '';
		},
	},
	actions: {
		handleClick: createFeedbackAction( timers, {
			perform() {},
			duration: 2000,
		} ),
	},
	callbacks: {
		init: createFeedbackInit( timers ),
	},
} );

export { state };
