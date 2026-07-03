/**
 * Query Loop actions store tests.
 *
 * The URL-building helpers and DOM resolution are exported pure(ish)
 * functions; the actions are exercised against the interactivity +
 * router mocks. Router region swapping itself is the router's job and
 * is not simulated here.
 */

const interactivityMock = require( '@wordpress/interactivity' );
const routerMock = require( '@wordpress/interactivity-router' );

let storeDefinition;
let helpers;

// Drive a generator that yields promises to completion.
async function run( gen ) {
	let result = gen.next();
	while ( ! result.done ) {
		try {
			// eslint-disable-next-line no-await-in-loop
			result = gen.next( await result.value );
		} catch ( error ) {
			result = gen.throw( error );
		}
	}
	return result.value;
}

beforeAll( () => {
	interactivityMock.store.mockImplementation( ( ns, def ) => def );
	helpers = require( '../../src/stores/query/view' );
	storeDefinition =
		interactivityMock.store.mock.calls[
			interactivityMock.store.mock.calls.length - 1
		][ 1 ];
} );

describe( 'buildFilterUrl', () => {
	const base = 'https://example.com/blog/';

	it( 'sets the prefixed taxonomy param', () => {
		expect( helpers.buildFilterUrl( base, 1, 'category', 'news' ) ).toBe(
			'https://example.com/blog/?bq-1-tax-category=news'
		);
	} );

	it( 'toggles off when the term is already active', () => {
		expect(
			helpers.buildFilterUrl(
				`${ base }?bq-1-tax-category=news`,
				1,
				'category',
				'news'
			)
		).toBe( 'https://example.com/blog/' );
	} );

	it( 'replaces the taxonomy term (one term per taxonomy)', () => {
		expect(
			helpers.buildFilterUrl(
				`${ base }?bq-1-tax-category=news`,
				1,
				'category',
				'events'
			)
		).toBe( 'https://example.com/blog/?bq-1-tax-category=events' );
	} );

	it( 'empty term clears the taxonomy (the All button)', () => {
		expect(
			helpers.buildFilterUrl(
				`${ base }?bq-1-tax-category=news`,
				1,
				'category',
				''
			)
		).toBe( 'https://example.com/blog/' );
	} );

	it( 'composes across taxonomies and leaves other queries alone', () => {
		const url = helpers.buildFilterUrl(
			`${ base }?bq-1-tax-category=news&bq-2-tax-category=other`,
			1,
			'post_tag',
			'coffee'
		);
		expect( url ).toContain( 'bq-1-tax-category=news' );
		expect( url ).toContain( 'bq-1-tax-post_tag=coffee' );
		expect( url ).toContain( 'bq-2-tax-category=other' );
	} );

	it( 'drops the page param on any filter change', () => {
		const url = helpers.buildFilterUrl(
			`${ base }?query-1-page=3&bq-1-tax-category=news`,
			1,
			'category',
			'events'
		);
		expect( url ).not.toContain( 'query-1-page' );
	} );
} );

describe( 'buildSearchUrl', () => {
	const base = 'https://example.com/blog/';

	it( 'sets the prefixed search param and drops the page param', () => {
		const url = helpers.buildSearchUrl(
			`${ base }?query-2-page=4`,
			2,
			'coffee'
		);
		expect( url ).toBe( 'https://example.com/blog/?bq-2-s=coffee' );
	} );

	it( 'clears the param on empty value', () => {
		expect(
			helpers.buildSearchUrl( `${ base }?bq-2-s=coffee`, 2, '' )
		).toBe( 'https://example.com/blog/' );
	} );

	it( 'never touches core search or other queries', () => {
		const url = helpers.buildSearchUrl(
			`${ base }?s=global&bq-9-s=other`,
			2,
			'x'
		);
		expect( url ).toContain( 's=global' );
		expect( url ).toContain( 'bq-9-s=other' );
	} );
} );

describe( 'resolveQueryId', () => {
	let warnSpy;

	beforeEach( () => {
		document.body.innerHTML = '';
		warnSpy = jest.spyOn( console, 'warn' ).mockImplementation( () => {} );
	} );
	afterEach( () => warnSpy.mockRestore() );

	function addRegion( id, anchor ) {
		const el = document.createElement( 'div' );
		el.setAttribute(
			'data-wp-router-region',
			`block-actions-query-${ id }`
		);
		if ( anchor ) {
			el.id = anchor;
		}
		document.body.appendChild( el );
		return el;
	}

	it( 'resolves an explicit anchor to its query id', () => {
		addRegion( 7, 'my-posts' );
		expect( helpers.resolveQueryId( 'my-posts' ) ).toBe( 7 );
	} );

	it( 'warns and returns null for an anchor without a region', () => {
		const plain = document.createElement( 'div' );
		plain.id = 'not-a-query';
		document.body.appendChild( plain );
		expect( helpers.resolveQueryId( 'not-a-query' ) ).toBeNull();
		expect( warnSpy ).toHaveBeenCalled();
	} );

	it( 'defaults to the single actions-enabled query', () => {
		addRegion( 3 );
		expect( helpers.resolveQueryId( '' ) ).toBe( 3 );
	} );

	it( 'warns and returns null when zero or several queries exist', () => {
		expect( helpers.resolveQueryId( '' ) ).toBeNull();
		addRegion( 1 );
		addRegion( 2 );
		expect( helpers.resolveQueryId( '' ) ).toBeNull();
		expect( warnSpy ).toHaveBeenCalledTimes( 2 );
	} );
} );

describe( 'parseNextPage', () => {
	const page = ( regionId, items, withNext ) => `
		<html><body>
		<div data-wp-router-region="${ regionId }">
			<ul class="wp-block-post-template">${ items }</ul>
			<nav class="wp-block-query-pagination">${
				withNext
					? '<a class="wp-block-query-pagination-next" href="/p3">Next</a>'
					: ''
			}</nav>
		</div>
		</body></html>`;

	it( 'extracts items and pagination for the matching region', () => {
		const result = helpers.parseNextPage(
			page( 'block-actions-query-1', '<li>a</li><li>b</li>', true ),
			'block-actions-query-1'
		);
		expect( result.items ).toHaveLength( 2 );
		expect(
			result.pagination.querySelector( '.wp-block-query-pagination-next' )
		).not.toBeNull();
	} );

	it( 'returns null when the region is missing', () => {
		expect(
			helpers.parseNextPage(
				page( 'block-actions-query-9', '<li>a</li>', true ),
				'block-actions-query-1'
			)
		).toBeNull();
	} );
} );

describe( 'actions', () => {
	beforeEach( () => {
		document.body.innerHTML = '';
		routerMock.__reset();
		storeDefinition.state.navigatingQueries = {};
		jest.useRealTimers();
	} );

	it( 'navigate: prevents default, routes via the router, clears loading', async () => {
		interactivityMock.__setContext( { queryId: 1 } );
		const link = document.createElement( 'a' );
		link.href = 'https://example.com/?query-1-page=2';
		document.body.appendChild( link );

		const event = { target: link, preventDefault: jest.fn() };
		await run( storeDefinition.actions.navigate( event ) );

		expect( event.preventDefault ).toHaveBeenCalled();
		expect( routerMock.actions.navigate ).toHaveBeenCalledWith(
			'https://example.com/?query-1-page=2',
			{}
		);
		expect( storeDefinition.state.navigatingQueries ).toEqual( {} );
	} );

	it( 'navigate: flags the query as loading while in flight', async () => {
		interactivityMock.__setContext( { queryId: 5 } );
		const link = document.createElement( 'a' );
		link.href = 'https://example.com/?query-5-page=2';
		document.body.appendChild( link );

		let resolveNav;
		routerMock.actions.navigate.mockImplementationOnce(
			() => new Promise( ( r ) => ( resolveNav = r ) )
		);

		const pending = run(
			storeDefinition.actions.navigate( {
				target: link,
				preventDefault: jest.fn(),
			} )
		);
		// Yield to let the generator reach the navigate call.
		await new Promise( ( r ) => setTimeout( r, 0 ) );
		expect( storeDefinition.state.navigatingQueries[ 5 ] ).toBe( true );

		resolveNav();
		await pending;
		expect( storeDefinition.state.navigatingQueries[ 5 ] ).toBeUndefined();
	} );

	it( 'applyFilter: builds the toggle URL against the resolved query', async () => {
		const region = document.createElement( 'div' );
		region.setAttribute( 'data-wp-router-region', 'block-actions-query-4' );
		region.id = 'my-grid';
		document.body.appendChild( region );

		interactivityMock.__setContext( {
			targetQuery: 'my-grid',
			taxonomy: 'category',
			term: 'news',
		} );

		await run(
			storeDefinition.actions.applyFilter( {
				preventDefault: jest.fn(),
			} )
		);

		const url = routerMock.actions.navigate.mock.calls[ 0 ][ 0 ];
		expect( url ).toContain( 'bq-4-tax-category=news' );
	} );

	it( 'search: debounces and navigates with replace', async () => {
		jest.useFakeTimers();
		const region = document.createElement( 'div' );
		region.setAttribute( 'data-wp-router-region', 'block-actions-query-2' );
		document.body.appendChild( region );

		const ctx = {
			targetQuery: '',
			debounce: 300,
			minChars: 2,
			timer: 0,
		};
		interactivityMock.__setContext( ctx );

		storeDefinition.actions.search( { target: { value: 'co' } } );
		storeDefinition.actions.search( { target: { value: 'cof' } } );

		jest.advanceTimersByTime( 300 );
		jest.useRealTimers();
		await new Promise( ( r ) => setTimeout( r, 0 ) );

		// Only the last keystroke navigated, with replace semantics.
		expect( routerMock.actions.navigate ).toHaveBeenCalledTimes( 1 );
		const [ url, opts ] = routerMock.actions.navigate.mock.calls[ 0 ];
		expect( url ).toContain( 'bq-2-s=cof' );
		expect( opts ).toEqual( { replace: true } );
	} );

	it( 'search: skips below minChars but always allows clearing', () => {
		jest.useFakeTimers();
		const ctx = { targetQuery: '', debounce: 100, minChars: 3, timer: 0 };
		interactivityMock.__setContext( ctx );

		storeDefinition.actions.search( { target: { value: 'ab' } } );
		jest.advanceTimersByTime( 200 );
		expect( routerMock.actions.navigate ).not.toHaveBeenCalled();
		jest.useRealTimers();
	} );

	it( 'isFilterActive: reflects the reactive URL state', () => {
		storeDefinition.state.currentSearch = '?bq-1-tax-category=news';
		interactivityMock.__setContext( {
			taxonomy: 'category',
			term: 'news',
		} );
		expect( storeDefinition.state.isFilterActive ).toBe( true );

		interactivityMock.__setContext( {
			taxonomy: 'category',
			term: 'events',
		} );
		expect( storeDefinition.state.isFilterActive ).toBe( false );

		interactivityMock.__setContext( { taxonomy: 'post_tag', term: '' } );
		expect( storeDefinition.state.isFilterActive ).toBe( false );
	} );
} );

describe( 'loadMore (fetch-and-append)', () => {
	function buildRegion() {
		document.body.innerHTML = `
			<div id="q" data-wp-router-region="block-actions-query-3">
				<ul class="wp-block-post-template"><li>one</li></ul>
				<nav class="wp-block-query-pagination">
					<a class="wp-block-query-pagination-next" href="http://localhost/?query-3-page=2">Next</a>
				</nav>
				<div class="ba-query-sentinel"></div>
			</div>`;
		return document.getElementById( 'q' );
	}

	const nextPageHtml = `
		<html><body>
		<div data-wp-router-region="block-actions-query-3">
			<ul class="wp-block-post-template"><li>two</li><li>three</li></ul>
			<nav class="wp-block-query-pagination">
				<a class="wp-block-query-pagination-next" href="http://localhost/?query-3-page=3">Next</a>
			</nav>
		</div>
		</body></html>`;

	beforeEach( () => {
		routerMock.__reset();
		storeDefinition.state.navigatingQueries = {};
		window.history.replaceState( null, '', '/' );
	} );

	it( 'appends the fetched items and advances the pagination', async () => {
		const region = buildRegion();
		const ctx = { queryId: 3, isFetching: false };
		interactivityMock.__setContext( ctx );
		interactivityMock.__setElement(
			region.querySelector( '.ba-query-sentinel' )
		);

		global.fetch = jest.fn( () =>
			Promise.resolve( { text: () => Promise.resolve( nextPageHtml ) } )
		);

		await run( storeDefinition.actions.loadMore() );

		const items = region.querySelectorAll( '.wp-block-post-template li' );
		expect( items ).toHaveLength( 3 );
		expect(
			region.querySelector( '.wp-block-query-pagination-next' ).href
		).toContain( 'query-3-page=3' );
		expect( window.location.search ).toContain( 'query-3-page=2' );
		expect( ctx.isFetching ).toBe( false );
	} );
} );
