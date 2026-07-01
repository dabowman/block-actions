/**
 * Anchor-uniqueness resolver tests.
 */

jest.mock( '@wordpress/data', () => ( {
	subscribe: jest.fn(),
	select: jest.fn(),
	dispatch: jest.fn(),
} ) );

import {
	flattenBlocks,
	resolveAnchorCollisions,
} from '../src/anchor-uniqueness';

// Deterministic id generator for assertions.
const genId = ( base ) => `${ base }-COPY`;

function trigger( clientId, action, key, value ) {
	return {
		clientId,
		attributes: { customAction: action, actionData: { [ key ]: value } },
	};
}
function target( clientId, anchor ) {
	return { clientId, attributes: { anchor } };
}

// Convenience: run the resolver with the given ids marked as new.
function resolve( blocks, newIds, gen = genId ) {
	return resolveAnchorCollisions( blocks, new Set( newIds ), gen );
}

describe( 'flattenBlocks', () => {
	it( 'flattens nested blocks in document order', () => {
		const tree = [
			{
				clientId: 'a',
				innerBlocks: [ { clientId: 'b', innerBlocks: [] } ],
			},
			{ clientId: 'c', innerBlocks: [] },
		];
		expect( flattenBlocks( tree ).map( ( b ) => b.clientId ) ).toEqual( [
			'a',
			'b',
			'c',
		] );
	} );
} );

describe( 'resolveAnchorCollisions', () => {
	it( 'returns no updates when anchors are unique', () => {
		const blocks = [
			trigger( 't1', 'modal-toggle', 'modal', 'm1' ),
			target( 'g1', 'm1' ),
		];
		expect( resolve( blocks, [ 't1', 'g1' ] ) ).toEqual( [] );
	} );

	it( 'leaves a single modal with multiple triggers alone', () => {
		// Two triggers, ONE target → not a collision (anchor appears once).
		const blocks = [
			trigger( 't1', 'modal-toggle', 'modal', 'm1' ),
			trigger( 't2', 'modal-toggle', 'modal', 'm1' ),
			target( 'g1', 'm1' ),
		];
		expect( resolve( blocks, [ 't1', 't2', 'g1' ] ) ).toEqual( [] );
	} );

	it( 'never touches pre-existing duplicates (no new blocks)', () => {
		// Saved content already collides — opening the post must not
		// mutate it.
		const blocks = [
			trigger( 't1', 'modal-toggle', 'modal', 'm1' ),
			target( 'g1', 'm1' ),
			trigger( 't2', 'modal-toggle', 'modal', 'm1' ),
			target( 'g2', 'm1' ),
		];
		expect( resolve( blocks, [] ) ).toEqual( [] );
	} );

	it( 'ignores duplicated anchors no action references', () => {
		// Two headings sharing an anchor are not ours to "fix", even
		// when newly inserted.
		const blocks = [ target( 'h1', 'intro' ), target( 'h2', 'intro' ) ];
		expect( resolve( blocks, [ 'h2' ] ) ).toEqual( [] );
	} );

	it( 're-keys a newly inserted copy against a pre-existing instance', () => {
		// Modal pattern inserted a second time: old t1/g1 keep m1; the
		// new t2/g2 are re-keyed together.
		const blocks = [
			trigger( 't1', 'modal-toggle', 'modal', 'm1' ),
			target( 'g1', 'm1' ),
			trigger( 't2', 'modal-toggle', 'modal', 'm1' ),
			target( 'g2', 'm1' ),
		];
		const updates = resolve( blocks, [ 't2', 'g2' ] );
		const byClient = Object.fromEntries(
			updates.map( ( u ) => [ u.clientId, u.attributes ] )
		);
		expect( byClient.g1 ).toBeUndefined();
		expect( byClient.t1 ).toBeUndefined();
		expect( byClient.g2 ).toEqual( { anchor: 'm1-COPY' } );
		expect( byClient.t2.actionData.modal ).toBe( 'm1-COPY' );
	} );

	it( 'keeps the old holder even when a new block precedes it', () => {
		// New copy pasted ABOVE the original: the original still keeps
		// its anchor; only the new blocks change.
		const blocks = [
			trigger( 't2', 'modal-toggle', 'modal', 'm1' ),
			target( 'g2', 'm1' ),
			trigger( 't1', 'modal-toggle', 'modal', 'm1' ),
			target( 'g1', 'm1' ),
		];
		const updates = resolve( blocks, [ 't2', 'g2' ] );
		const byClient = Object.fromEntries(
			updates.map( ( u ) => [ u.clientId, u.attributes ] )
		);
		expect( byClient.g1 ).toBeUndefined();
		expect( byClient.t1 ).toBeUndefined();
		expect( byClient.g2 ).toEqual( { anchor: 'm1-COPY' } );
		expect( byClient.t2.actionData.modal ).toBe( 'm1-COPY' );
	} );

	it( 'rewires every new trigger of a re-keyed target', () => {
		// A modal copy with TWO open buttons: both must follow the
		// re-keyed anchor (the old positional pairing updated only one).
		const blocks = [
			trigger( 't1', 'modal-toggle', 'modal', 'm1' ),
			target( 'g1', 'm1' ),
			trigger( 'tA', 'modal-toggle', 'modal', 'm1' ),
			trigger( 'tB', 'modal-toggle', 'modal', 'm1' ),
			target( 'g2', 'm1' ),
		];
		const updates = resolve( blocks, [ 'tA', 'tB', 'g2' ] );
		const byClient = Object.fromEntries(
			updates.map( ( u ) => [ u.clientId, u.attributes ] )
		);
		expect( byClient.tA.actionData.modal ).toBe( 'm1-COPY' );
		expect( byClient.tB.actionData.modal ).toBe( 'm1-COPY' );
		expect( byClient.t1 ).toBeUndefined();
	} );

	it( 'segments a multi-copy paste by nearest target (ties follow)', () => {
		// Disclosure pasted twice in ONE paste — all blocks new. First
		// copy keeps d1; second copy is re-keyed and its own trigger
		// follows it (t2 is equidistant between g1 and g2; the following
		// target wins, matching trigger-before-target patterns).
		const blocks = [
			trigger( 't1', 'toggle-visibility', 'target', 'd1' ),
			target( 'g1', 'd1' ),
			trigger( 't2', 'toggle-visibility', 'target', 'd1' ),
			target( 'g2', 'd1' ),
		];
		const updates = resolve( blocks, [ 't1', 'g1', 't2', 'g2' ] );
		const byClient = Object.fromEntries(
			updates.map( ( u ) => [ u.clientId, u.attributes ] )
		);
		expect( byClient.g1 ).toBeUndefined();
		expect( byClient.t1 ).toBeUndefined();
		expect( byClient.g2 ).toEqual( { anchor: 'd1-COPY' } );
		expect( byClient.t2.actionData.target ).toBe( 'd1-COPY' );
	} );

	it( 'leaves old triggers pointing at the kept anchor', () => {
		// An OLD trigger elsewhere on the page referencing m1 must not
		// be rewired when a new copy lands.
		const blocks = [
			trigger( 'tOld', 'modal-toggle', 'modal', 'm1' ),
			target( 'gOld', 'm1' ),
			target( 'gNew', 'm1' ),
		];
		const updates = resolve( blocks, [ 'gNew' ] );
		const byClient = Object.fromEntries(
			updates.map( ( u ) => [ u.clientId, u.attributes ] )
		);
		expect( byClient.tOld ).toBeUndefined();
		expect( byClient.gNew ).toEqual( { anchor: 'm1-COPY' } );
	} );

	it( 'default generator avoids existing anchors', () => {
		const blocks = [
			trigger( 't1', 'modal-toggle', 'modal', 'm1' ),
			target( 'g1', 'm1' ),
			trigger( 't2', 'modal-toggle', 'modal', 'm1' ),
			target( 'g2', 'm1' ),
			target( 'g3', 'm1-2' ), // m1-2 is taken; generator must skip it
		];
		// Call directly — no genId — so the default generator runs.
		const updates = resolveAnchorCollisions(
			blocks,
			new Set( [ 't2', 'g2' ] )
		);
		const g2 = updates.find( ( u ) => u.clientId === 'g2' );
		expect( g2.attributes.anchor ).toBe( 'm1-3' );
	} );
} );
