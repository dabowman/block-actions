/**
 * Modal Toggle — Interactivity API Store
 *
 * Opens and closes a native <dialog> element. The browser handles focus
 * trap, ESC to close, and focus restore; this store adds:
 *
 *   - Body scroll lock while any modal is open (restored to the pre-open
 *     value when the last one closes — tracked via state.openCount and
 *     state.priorBodyOverflow so instances share the count).
 *   - Click-backdrop-to-close (dialog clicks where e.target === modal).
 *   - Convenience close-button selectors (.modal-close, [data-modal-close]).
 *   - aria-labelledby fallback if the author didn't supply one.
 *   - Context sync on native close events so data-wp-bind--aria-expanded
 *     on the trigger stays accurate when ESC or a form[method=dialog]
 *     submission closes the dialog.
 *
 * Modal elements live outside the interactive region, so listener wire-up
 * and label inference happen imperatively in `callbacks.init`. This is an
 * intentional exception to the "a11y attributes belong in PHP" rule — PHP
 * only controls the trigger markup, not the dialog body.
 *
 * Requires the target element to be a <dialog>. Prior <div hidden> modals
 * won't work — migrate markup to `<dialog id="…">…</dialog>`.
 *
 * @since 2.0.0
 */

import {
	store,
	getContext,
	getElement,
	withSyncEvent,
} from '@wordpress/interactivity';

/**
 * Per-trigger listener references for cleanup.
 *
 * @type {WeakMap<HTMLElement, Object>}
 */
const privateState = new WeakMap();

const { state } = store( 'block-actions/modal-toggle', {
	state: {
		openCount: 0,
		priorBodyOverflow: '',
	},
	actions: {
		toggle: withSyncEvent( function ( event ) {
			event.preventDefault();
			const ctx = getContext();
			if ( ! ctx.modalId ) {
				return;
			}

			const modal = document.getElementById( ctx.modalId );
			if ( ! isDialog( modal ) ) {
				return;
			}

			if ( modal.open ) {
				modal.close();
			} else {
				if ( state.openCount === 0 ) {
					state.priorBodyOverflow = document.body.style.overflow;
				}
				modal.showModal();
				state.openCount++;
				document.body.style.overflow = 'hidden';
				ctx.isOpen = true;
			}
		} ),
	},
	callbacks: {
		init() {
			const ctx = getContext();
			if ( ! ctx.modalId ) {
				return;
			}

			const modal = document.getElementById( ctx.modalId );
			if ( ! isDialog( modal ) ) {
				if ( modal ) {
					// eslint-disable-next-line no-console
					console.warn(
						`[block-actions/modal-toggle] Target "#${ ctx.modalId }" is not a <dialog> element. Migrate your markup to <dialog id="${ ctx.modalId }">…</dialog>.`
					);
				}
				return;
			}

			applyModalLabel( modal );

			const { ref } = getElement();

			const handleCloseClick = () => modal.close();
			const handleBackdropClick = ( e ) => {
				if ( e.target === modal ) {
					modal.close();
				}
			};
			const handleNativeClose = () => {
				state.openCount = Math.max( 0, state.openCount - 1 );
				if ( state.openCount === 0 ) {
					document.body.style.overflow = state.priorBodyOverflow;
				}
				ctx.isOpen = false;
			};

			const closeButtons = modal.querySelectorAll(
				'.modal-close, [data-modal-close]'
			);
			closeButtons.forEach( ( button ) => {
				button.addEventListener( 'click', handleCloseClick );
			} );
			modal.addEventListener( 'click', handleBackdropClick );
			modal.addEventListener( 'close', handleNativeClose );

			privateState.set( ref, {
				closeButtons,
				handleCloseClick,
				handleBackdropClick,
				handleNativeClose,
				modal,
			} );

			return () => {
				const priv = privateState.get( ref );
				if ( ! priv ) {
					return;
				}
				priv.closeButtons.forEach( ( button ) => {
					button.removeEventListener(
						'click',
						priv.handleCloseClick
					);
				} );
				priv.modal.removeEventListener(
					'click',
					priv.handleBackdropClick
				);
				priv.modal.removeEventListener(
					'close',
					priv.handleNativeClose
				);
				privateState.delete( ref );
			};
		},
	},
} );

/**
 * True when the element exists and supports the HTMLDialogElement API.
 *
 * @since 2.1.0
 *
 * @param {Element|null} el The element to check.
 * @return {boolean} Whether the element is a functional dialog.
 */
function isDialog( el ) {
	return !! el && typeof el.showModal === 'function';
}

/**
 * Wire an aria-labelledby reference to the first heading if the author
 * didn't supply one. Generates an id on the heading if needed so the
 * reference resolves.
 *
 * @since 2.1.0
 *
 * @param {HTMLElement} modal The dialog element.
 */
function applyModalLabel( modal ) {
	if ( modal.hasAttribute( 'aria-labelledby' ) ) {
		return;
	}
	const heading = modal.querySelector( 'h1, h2, h3, h4, h5, h6' );
	if ( ! heading ) {
		return;
	}
	if ( ! heading.id ) {
		heading.id = `${ modal.id || 'block-actions-modal' }__heading`;
	}
	modal.setAttribute( 'aria-labelledby', heading.id );
}

export { state };
