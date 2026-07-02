/**
 * Query Loop Actions — Interactivity API Store
 *
 * One store drives all four query actions (query-paginate,
 * query-infinite-scroll, query-filter, query-live-search). The engine is
 * URL-driven: every state is a real GET URL, the server renders the
 * result, and the Interactivity Router swaps the query's router region
 * (`data-wp-router-region="block-actions-query-{queryId}"`). No REST
 * calls, no client-side querying — which is what keeps full-page caches
 * and no-JS visitors correct.
 *
 * The router (~3KB) is lazy-imported inside actions so it only loads for
 * visitors who actually interact.
 *
 * @since 3.1.0
 */

import {
	store,
	getContext,
	getElement,
	withSyncEvent,
	withScope,
} from '@wordpress/interactivity';

const REGION_PREFIX = 'block-actions-query-';

/**
 * Build the URL for a filter change against the current location.
 *
 * Toggle semantics: setting the taxonomy's current term clears it; an
 * empty term (the "All" button) always clears. Different taxonomies
 * compose. Any change drops the page param — page 3 of a different
 * result set may not exist.
 *
 * Exported for unit tests.
 *
 * @since 3.1.0
 *
 * @param {string} current  The current URL (absolute).
 * @param {number} queryId  Target query id.
 * @param {string} taxonomy Taxonomy name.
 * @param {string} term     Term slug ('' clears the taxonomy's filter).
 * @return {string} The target URL.
 */
export function buildFilterUrl( current, queryId, taxonomy, term ) {
	const url = new URL( current );
	const key = `bq-${ queryId }-tax-${ taxonomy }`;

	if ( ! term || url.searchParams.get( key ) === term ) {
		url.searchParams.delete( key );
	} else {
		url.searchParams.set( key, term );
	}

	url.searchParams.delete( `query-${ queryId }-page` );
	return url.toString();
}

/**
 * Build the URL for a search-term change against the current location.
 *
 * Exported for unit tests.
 *
 * @since 3.1.0
 *
 * @param {string} current The current URL (absolute).
 * @param {number} queryId Target query id.
 * @param {string} value   Search input value ('' clears).
 * @return {string} The target URL.
 */
export function buildSearchUrl( current, queryId, value ) {
	const url = new URL( current );
	const key = `bq-${ queryId }-s`;

	if ( value ) {
		url.searchParams.set( key, value );
	} else {
		url.searchParams.delete( key );
	}

	url.searchParams.delete( `query-${ queryId }-page` );
	return url.toString();
}

/**
 * Resolve a trigger's target query id from the DOM.
 *
 * Explicit `data-query` anchor wins; otherwise, when exactly ONE
 * actions-enabled query region exists on the page, bind to it. Zero or
 * several without an anchor is ambiguous: warn and return null.
 *
 * Exported for unit tests.
 *
 * @since 3.1.0
 *
 * @param {string}           targetQuery The trigger's data-query anchor ('' = unset).
 * @param {Document|Element} [root]      Search root (tests inject a fixture).
 * @return {number|null} The query id, or null when unresolvable.
 */
export function resolveQueryId( targetQuery, root = document ) {
	if ( targetQuery ) {
		const target = root.querySelector( `#${ CSS.escape( targetQuery ) }` );
		const region = target?.getAttribute( 'data-wp-router-region' ) || '';
		if ( region.startsWith( REGION_PREFIX ) ) {
			return Number( region.slice( REGION_PREFIX.length ) );
		}
		console.warn(
			`[block-actions/query] data-query="${ targetQuery }" does not resolve to an actions-enabled Query Loop. Give the Query Loop block that anchor and a query action (e.g. Query Pagination — Instant).`
		);
		return null;
	}

	const regions = root.querySelectorAll(
		`[data-wp-router-region^="${ REGION_PREFIX }"]`
	);
	if ( regions.length === 1 ) {
		const region = regions[ 0 ].getAttribute( 'data-wp-router-region' );
		return Number( region.slice( REGION_PREFIX.length ) );
	}

	console.warn(
		`[block-actions/query] ${
			regions.length === 0
				? 'No actions-enabled Query Loop found on this page.'
				: 'Several actions-enabled Query Loops found — set a Target Query (data-query) on the trigger.'
		}`
	);
	return null;
}

/**
 * Extract the fetched page's new posts and pagination for the append
 * path, keyed by region id.
 *
 * Exported for unit tests.
 *
 * @since 3.1.0
 *
 * @param {string} htmlText Raw HTML of the fetched next page.
 * @param {string} regionId The target region id.
 * @return {{items: Element[], pagination: Element|null}|null} Parsed
 *         pieces, or null when the region/list is missing.
 */
export function parseNextPage( htmlText, regionId ) {
	const doc = new window.DOMParser().parseFromString( htmlText, 'text/html' );
	const region = doc.querySelector(
		`[data-wp-router-region="${ regionId }"]`
	);
	const list = region?.querySelector( '.wp-block-post-template' );
	if ( ! list ) {
		return null;
	}
	return {
		items: Array.from( list.children ),
		pagination: region.querySelector( '.wp-block-query-pagination' ),
	};
}

const { state, actions } = store( 'block-actions/query', {
	state: {
		/**
		 * queryId → true while its region navigation is in flight.
		 * Global (not context) so it survives the region swap that
		 * replaces the context-carrying markup.
		 */
		navigatingQueries: {},

		/**
		 * The current URL's query string. Kept reactive by the store
		 * (location itself isn't a signal): updated after every
		 * navigation we perform and on popstate via actions.syncUrl.
		 */
		currentSearch:
			typeof window !== 'undefined' ? window.location.search : '',

		get isLoading() {
			const ctx = getContext();
			return !! state.navigatingQueries[ ctx.queryId ];
		},

		get isFilterActive() {
			const ctx = getContext();
			if ( ! ctx.taxonomy || ! ctx.term ) {
				return false;
			}
			const params = new URLSearchParams( state.currentSearch );
			for ( const [ key, value ] of params ) {
				if (
					/^bq-\d+-tax-/.test( key ) &&
					key.endsWith( `-tax-${ ctx.taxonomy }` ) &&
					value === ctx.term
				) {
					return true;
				}
			}
			return false;
		},
	},

	actions: {
		/**
		 * Region-swap navigation for pagination links.
		 */
		navigate: withSyncEvent( function* ( event ) {
			const link = event.target.closest( 'a[href]' );
			if ( ! link ) {
				return;
			}
			event.preventDefault();
			const ctx = getContext();
			yield* navigateTo( link.href, ctx.queryId );
		} ),

		prefetch() {
			const { ref } = getElement();
			const link = ref.closest( 'a[href]' );
			if ( link ) {
				prefetchUrl( link.href );
			}
		},

		applyFilter: withSyncEvent( function* ( event ) {
			event.preventDefault();
			const ctx = getContext();
			const queryId = resolveQueryId( ctx.targetQuery );
			if ( null === queryId ) {
				return;
			}
			const url = buildFilterUrl(
				window.location.href,
				queryId,
				ctx.taxonomy,
				ctx.term
			);
			yield* navigateTo( url, queryId );
		} ),

		prefetchFilter() {
			const ctx = getContext();
			const queryId = resolveQueryId( ctx.targetQuery );
			if ( null === queryId ) {
				return;
			}
			prefetchUrl(
				buildFilterUrl(
					window.location.href,
					queryId,
					ctx.taxonomy,
					ctx.term
				)
			);
		},

		/**
		 * Debounced live search. Each state is a real URL; replace (not
		 * push) so typing doesn't flood the history stack.
		 *
		 * @param {Event} event The input event.
		 */
		search( event ) {
			const ctx = getContext();
			const value = event.target.value.trim();

			if ( ctx.timer ) {
				clearTimeout( ctx.timer );
			}
			if ( value && value.length < ctx.minChars ) {
				return;
			}
			ctx.timer = setTimeout(
				withScope( () => {
					ctx.timer = 0;
					const queryId = resolveQueryId( ctx.targetQuery );
					if ( null === queryId ) {
						return;
					}
					const url = buildSearchUrl(
						window.location.href,
						queryId,
						value
					);
					// setTimeout won't drive a generator — run it.
					runGenerator(
						navigateTo( url, queryId, { replace: true } )
					);
				} ),
				ctx.debounce
			);
		},

		/**
		 * Keep state.currentSearch honest across back/forward.
		 */
		syncUrl() {
			state.currentSearch = window.location.search;
		},

		/**
		 * Fetch-and-append for infinite scroll. Fetches the REAL next
		 * page URL (same cacheable page pagination uses), appends the
		 * new posts, swaps the (hidden) pagination so the next URL
		 * advances, and replaceState()s the address bar.
		 */
		*loadMore() {
			const ctx = getContext();
			const { ref } = getElement();
			const region = ref.closest( '[data-wp-router-region]' );
			const nextLink = region?.querySelector(
				'.wp-block-query-pagination-next'
			);
			if ( ! region || ! nextLink || ctx.isFetching ) {
				return;
			}

			ctx.isFetching = true;
			// Imperative feedback: this region has no reactive bindings
			// (see the renderer — a re-render would clobber the appended
			// DOM), so the loading class is applied directly.
			region.classList.add( 'is-loading' );
			region.setAttribute( 'aria-busy', 'true' );
			try {
				const response = yield fetch( nextLink.href );
				const text = yield response.text();
				const next = parseNextPage(
					text,
					region.getAttribute( 'data-wp-router-region' )
				);
				if ( ! next ) {
					return;
				}

				const list = region.querySelector( '.wp-block-post-template' );
				next.items.forEach( ( item ) => list.appendChild( item ) );

				// Appended markup is static server HTML. Nested
				// interactive blocks inside appended posts do not
				// hydrate in v1 (spec: PR-3 spike).

				const pagination = region.querySelector(
					'.wp-block-query-pagination'
				);
				if ( next.pagination && pagination ) {
					pagination.replaceWith( next.pagination );
				} else if ( pagination && ! next.pagination ) {
					pagination.remove();
				}

				window.history.replaceState( null, '', nextLink.href );
				state.currentSearch = window.location.search;
			} catch ( error ) {
				console.error(
					'[block-actions/query] Failed to load the next page',
					error
				);
			} finally {
				ctx.isFetching = false;
				region.classList.remove( 'is-loading' );
				region.setAttribute( 'aria-busy', 'false' );
			}
		},
	},

	callbacks: {
		/**
		 * Arm the infinite-scroll sentinel. The pagination block stays in
		 * the markup as the no-JS fallback and the next-URL source; the
		 * class added here hides it only once JS has taken over.
		 */
		initInfiniteScroll() {
			const { ref } = getElement();
			const sentinel = ref.querySelector( '.ba-query-sentinel' );
			if ( ! sentinel ) {
				return;
			}

			if ( ! ref.querySelector( '.wp-block-query-pagination' ) ) {
				console.warn(
					'[block-actions/query] Infinite scroll needs a Query Pagination block inside the Query Loop — it is hidden automatically once JavaScript takes over, and serves as the no-JS fallback and the next-page URL source.'
				);
				return;
			}

			ref.classList.add( 'ba-infinite-scroll-on' );

			const observer = new IntersectionObserver(
				withScope( ( entries ) => {
					if ( ! entries.some( ( e ) => e.isIntersecting ) ) {
						return;
					}
					if (
						! ref.querySelector( '.wp-block-query-pagination-next' )
					) {
						observer.disconnect();
						return;
					}
					// The real runtime wraps store actions (calling
					// one runs its async flow); the test mock hands back
					// the raw generator — drive that case ourselves.
					const result = actions.loadMore();
					if ( result && typeof result.next === 'function' ) {
						runGenerator( result );
					}
				} ),
				{ rootMargin: '200px 0px' }
			);
			observer.observe( sentinel );

			return () => {
				observer.disconnect();
				ref.classList.remove( 'ba-infinite-scroll-on' );
			};
		},
	},
} );

/**
 * Shared navigation path: flags the query as loading, lazy-imports the
 * router, navigates, and keeps state.currentSearch in sync.
 *
 * @since 3.1.0
 *
 * @param {string} url     Target URL.
 * @param {number} queryId The query whose region is loading.
 * @param {Object} [opts]  Router navigate() options.
 */
function* navigateTo( url, queryId, opts = {} ) {
	state.navigatingQueries = {
		...state.navigatingQueries,
		[ queryId ]: true,
	};
	try {
		const { actions: routerActions } =
			// eslint-disable-next-line import/no-unresolved -- Provided by WordPress at runtime (externalized by the module build).
			yield import( '@wordpress/interactivity-router' );
		yield routerActions.navigate( url, opts );
		state.currentSearch = window.location.search;
	} finally {
		clearNavigating( queryId );
	}
}

/**
 * Clear a query's loading flag (new object so the signal updates).
 *
 * @since 3.1.0
 *
 * @param {number} queryId The query id.
 */
function clearNavigating( queryId ) {
	const rest = { ...state.navigatingQueries };
	delete rest[ queryId ];
	state.navigatingQueries = rest;
}

/**
 * Fire-and-forget prefetch of a URL via the router.
 *
 * @since 3.1.0
 *
 * @param {string} url The URL to prefetch.
 */
function prefetchUrl( url ) {
	// eslint-disable-next-line import/no-unresolved -- Provided by WordPress at runtime (externalized by the module build).
	import( '@wordpress/interactivity-router' )
		.then( ( routerModule ) => routerModule.actions.prefetch( url ) )
		.catch( () => {} );
}

/**
 * Drive a generator (possibly yielding promises) to completion.
 *
 * @since 3.1.0
 *
 * @param {Object} gen The generator to run.
 * @return {Promise} Resolves when the generator finishes.
 */
function runGenerator( gen ) {
	function step( result ) {
		if ( result.done ) {
			return Promise.resolve( result.value );
		}
		return Promise.resolve( result.value ).then(
			( value ) => step( gen.next( value ) ),
			( error ) => step( gen.throw( error ) )
		);
	}
	return step( gen.next() );
}

export { state, actions };
