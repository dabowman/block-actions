/**
 * Smooth Scroll — Interactivity API Store
 *
 * @since 2.0.0
 */

import { store } from '@wordpress/interactivity';
import {
    createFeedbackInit,
    createFeedbackAction,
} from '../utils/create-feedback-store';

const timers = new WeakMap();

store( 'block-actions/smooth-scroll', {
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
            feedbackText: ( ctx ) => ctx.scrollingText || 'Scrolling...',
            duration: 1000,
        } ),
    },
    callbacks: {
        init: createFeedbackInit( timers ),
    },
} );
