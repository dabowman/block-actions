/**
 * Scroll to Top — Interactivity API Store
 *
 * @since 2.0.0
 */

import { store } from '@wordpress/interactivity';
import {
	createFeedbackInit,
	createFeedbackAction,
} from '../utils/create-feedback-store';

const timers = new WeakMap();

store( 'block-actions/scroll-to-top', {
	actions: {
		scrollToTop: createFeedbackAction( timers, {
			perform() {
				window.scrollTo( { top: 0, behavior: 'smooth' } );
			},
			feedbackText: ( ctx ) => ctx.scrollingText || 'Scrolling...',
			duration: 500,
		} ),
	},
	callbacks: {
		init: createFeedbackInit( timers ),
	},
} );
