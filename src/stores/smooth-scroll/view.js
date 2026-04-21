/**
 * Smooth Scroll — Interactivity API Store
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

const { state } = store( 'block-actions/smooth-scroll', {
	state: {
		get buttonText() {
			return feedbackButtonText( getContext() );
		},
	},
	actions: {
		scrollToTarget: createFeedbackAction( timers, {
			perform( ctx ) {
				if ( ! ctx.targetId ) {
					return;
				}
				const targetElement = document.getElementById( ctx.targetId );
				if ( ! targetElement ) {
					return;
				}
				const targetPosition =
					targetElement.getBoundingClientRect().top +
					window.pageYOffset -
					ctx.offset;
				window.scrollTo( {
					top: targetPosition,
					behavior: 'smooth',
				} );
			},
			duration: 1000,
		} ),
	},
	callbacks: {
		init: createFeedbackInit( timers ),
	},
} );

export { state };
