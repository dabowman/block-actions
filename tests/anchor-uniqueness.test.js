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
		expect( resolveAnchorCollisions( blocks, genId ) ).toEqual( [] );
	} );

	it( 'leaves a single modal with multiple triggers alone', () => {
		// Two triggers, ONE target → not a collision (anchor appears once).
		const blocks = [
			trigger( 't1', 'modal-toggle', 'modal', 'm1' ),
			trigger( 't2', 'modal-toggle', 'modal', 'm1' ),
			target( 'g1', 'm1' ),
		];
		expect( resolveAnchorCollisions( blocks, genId ) ).toEqual( [] );
	} );

	it( 're-keys the second instance of a duplicated pattern', () => {
		// Modal pattern inserted twice: trigger+target, trigger+target.
		const blocks = [
			trigger( 't1', 'modal-toggle', 'modal', 'm1' ),
			target( 'g1', 'm1' ),
			trigger( 't2', 'modal-toggle', 'modal', 'm1' ),
			target( 'g2', 'm1' ),
		];
		const updates = resolveAnchorCollisions( blocks, genId );

		// First instance (t1/g1) keeps m1; second (t2/g2) is re-keyed.
		const byClient = Object.fromEntries(
			updates.map( ( u ) => [ u.clientId, u.attributes ] )
		);
		expect( byClient.g1 ).toBeUndefined();
		expect( byClient.t1 ).toBeUndefined();
		expect( byClient.g2 ).toEqual( { anchor: 'm1-COPY' } );
		expect( byClient.t2.actionData.modal ).toBe( 'm1-COPY' );
	} );

	it( 'pairs the nearest preceding trigger with each re-keyed target', () => {
		// Disclosure pattern (toggle-visibility) twice.
		const blocks = [
			trigger( 't1', 'toggle-visibility', 'target', 'd1' ),
			target( 'g1', 'd1' ),
			trigger( 't2', 'toggle-visibility', 'target', 'd1' ),
			target( 'g2', 'd1' ),
		];
		const updates = resolveAnchorCollisions( blocks, genId );
		const byClient = Object.fromEntries(
			updates.map( ( u ) => [ u.clientId, u.attributes ] )
		);
		// t2 (nearest trigger before g2) is paired with g2, not t1.
		expect( byClient.t2.actionData.target ).toBe( 'd1-COPY' );
		expect( byClient.t1 ).toBeUndefined();
	} );

	it( 'default generator avoids existing anchors', () => {
		const blocks = [
			trigger( 't1', 'modal-toggle', 'modal', 'm1' ),
			target( 'g1', 'm1' ),
			trigger( 't2', 'modal-toggle', 'modal', 'm1' ),
			target( 'g2', 'm1' ),
			target( 'g3', 'm1-2' ), // m1-2 is taken; generator must skip it
		];
		const updates = resolveAnchorCollisions( blocks ); // default genId
		const g2 = updates.find( ( u ) => u.clientId === 'g2' );
		expect( g2.attributes.anchor ).toBe( 'm1-3' );
	} );
} );
