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

/**
 * Dialogs this store opened and not yet accounted closed.
 *
 * Several triggers can target the same dialog, and each wires its own
 * `close` listener in init — so one native close event runs N listeners.
 * The shared open count must only move once per actual open/close, so
 * the close path consults this set: only the listener that finds the
 * dialog still in the set decrements.
 *
 * @type {WeakSet<HTMLElement>}
 */
const openModals = new WeakSet();

/**
 * All trigger contexts wired to a dialog, so open/close can sync every
 * trigger's `isOpen` (and therefore its aria-expanded binding) — not
 * just the one that was clicked.
 *
 * @type {WeakMap<HTMLElement, Set<Object>>}
 */
const modalContexts = new WeakMap();

/**
 * The context set for a dialog, created on first access.
 *
 * @since 3.0.0
 *
 * @param {HTMLElement} modal The dialog element.
 * @return {Set<Object>} Contexts of triggers wired to it.
 */
function contextsFor( modal ) {
	let set = modalContexts.get( modal );
	if ( ! set ) {
		set = new Set();
		modalContexts.set( modal, set );
	}
	return set;
}

/**
 * Account a dialog closed exactly once: remove it from the open set,
 * decrement the shared count, and restore body scroll when the last
 * open dialog is gone. Safe to call from the native close listener and
 * from trigger cleanup — the openModals guard makes it idempotent.
 *
 * @since 3.0.0
 *
 * @param {HTMLElement} modal The dialog element.
 */
function reconcileClosed( modal ) {
	if ( ! openModals.has( modal ) ) {
		return;
	}
	openModals.delete( modal );
	state.openCount = Math.max( 0, state.openCount - 1 );
	if ( state.openCount === 0 ) {
		document.body.style.overflow = state.priorBodyOverflow;
	}
}

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
				// If this trigger hydrated before its dialog was in the DOM,
				// init() bailed and wired no `close` listener — opening now
				// without one would lock body scroll forever. Wire listeners
				// here (idempotent per trigger) before showing the dialog.
				const { ref } = getElement();
				wireDialogListeners( ref, modal, ctx );

				if ( state.openCount === 0 ) {
					state.priorBodyOverflow = document.body.style.overflow;
				}
				modal.showModal();
				openModals.add( modal );
				state.openCount++;
				document.body.style.overflow = 'hidden';
				// Sync EVERY trigger wired to this dialog, not just the
				// clicked one — a second trigger's aria-expanded binding
				// must not announce "false" over a visibly open dialog.
				contextsFor( modal ).forEach( ( triggerCtx ) => {
					triggerCtx.isOpen = true;
				} );
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

			const { ref } = getElement();
			const modal = document.getElementById( ctx.modalId );
			if ( isDialog( modal ) ) {
				wireDialogListeners( ref, modal, ctx );
			} else if ( modal ) {
				// eslint-disable-next-line no-console
				console.warn(
					`[block-actions/modal-toggle] Target "#${ ctx.modalId }" is not a <dialog> element. Migrate your markup to <dialog id="${ ctx.modalId }">…</dialog>.`
				);
			}

			// ALWAYS return the cleanup, even when nothing was wired
			// above: toggle() wires listeners lazily when the dialog
			// wasn't in the DOM at hydration time, and those must still
			// be torn down with the trigger.
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
				contextsFor( priv.modal ).delete( priv.ctx );
				// A trigger unmounting while its dialog is open (router
				// region swap, conditional re-render) means the native
				// `close` event may never fire — without this, openCount
				// stays ≥ 1 and body scroll is locked for every later
				// view in the session.
				reconcileClosed( priv.modal );
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
 * Wire the close/backdrop/native-close listeners for a trigger's dialog.
 *
 * Idempotent per trigger (`ref`): a second call for an already-wired trigger
 * is a no-op, so it's safe to call from both `init()` (the normal path) and
 * `toggle()` (the recovery path when the dialog wasn't in the DOM at
 * hydration time). The shared open-count is decremented at most once per
 * actual close via the `openModals` WeakSet, even when several triggers
 * target — and each wire a `close` listener on — the same dialog.
 *
 * @since 3.0.0
 *
 * @param {HTMLElement} ref   The trigger element (cleanup key).
 * @param {HTMLElement} modal The target <dialog> element.
 * @param {Object}      ctx   The trigger's Interactivity context.
 */
function wireDialogListeners( ref, modal, ctx ) {
	if ( privateState.has( ref ) ) {
		return;
	}

	applyModalLabel( modal );

	const handleCloseClick = () => modal.close();
	const handleBackdropClick = ( e ) => {
		if ( e.target === modal ) {
			modal.close();
		}
	};
	const handleNativeClose = () => {
		reconcileClosed( modal );
		// Sync every wired trigger's context (idempotent — each wired
		// trigger's own close listener repeats this), plus this one in
		// case it was removed from the set by a partial teardown.
		contextsFor( modal ).forEach( ( triggerCtx ) => {
			triggerCtx.isOpen = false;
		} );
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

	contextsFor( modal ).add( ctx );
	privateState.set( ref, {
		closeButtons,
		handleCloseClick,
		handleBackdropClick,
		handleNativeClose,
		modal,
		ctx,
	} );
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
