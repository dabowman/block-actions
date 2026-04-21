/**
 * Scroll to Top — Interactivity API Store
 *
 * @since 2.0.0
 */

import { store, getContext } from '@wordpress/interactivity';
import {
	createFeedbackInit,
	createFeedbackAction,
	feedbackButtonText,
} from '../utils/create-feedback-store';

const timers = new WeakMap();

const { state } = store( 'block-actions/scroll-to-top', {
	state: {
		get buttonText() {
			return feedbackButtonText( getContext() );
		},
	},
	actions: {
		scrollToTop: createFeedbackAction( timers, {
			perform() {
				window.scrollTo( { top: 0, behavior: 'smooth' } );
			},
			duration: 500,
		} ),
	},
	callbacks: {
		init: createFeedbackInit( timers ),
	},
} );

export { state };
