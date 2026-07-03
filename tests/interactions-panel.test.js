/**
 * Target shapes, target picker, and interaction validation tests.
 */

jest.mock( '@wordpress/i18n', () => ( {
	__: ( text ) => text,
	sprintf: ( fmt, ...args ) =>
		args.reduce( ( out, arg ) => out.replace( /%\d*\$?[sd]/, arg ), fmt ),
} ) );

const mockSelect = jest.fn();
const mockDispatch = jest.fn();
jest.mock( '@wordpress/data', () => ( {
	select: ( store ) => mockSelect( store ),
	dispatch: ( store ) => mockDispatch( store ),
	subscribe: jest.fn(),
} ) );

jest.mock( '@wordpress/components', () => ( {
	ComboboxControl: 'ComboboxControl',
} ) );

// JSX in the sources compiles to wp.element.createElement (babel pragma).
global.wp = global.wp || {};
global.wp.element = {
	createElement: ( type, props, ...children ) => ( {
		type,
		props,
		children,
	} ),
	Fragment: 'Fragment',
};

import { matchesTarget, getTargetShapes } from '../src/target-shapes';
import {
	getTargetCandidates,
	ensureAnchor,
	TargetPicker,
} from '../src/target-picker';
import { validateInteraction } from '../src/interaction-validation';

const dialogGroup = ( clientId, anchor ) => ( {
	clientId,
	name: 'core/group',
	attributes: { tagName: 'dialog', anchor },
	innerBlocks: [],
} );
const plainGroup = ( clientId, anchor ) => ( {
	clientId,
	name: 'core/group',
	attributes: anchor ? { anchor } : {},
	innerBlocks: [],
} );
const heading = ( clientId, anchor ) => ( {
	clientId,
	name: 'core/heading',
	attributes: anchor ? { anchor } : {},
	innerBlocks: [],
} );

describe( 'target shapes', () => {
	it( 'dialog shape accepts dialog groups and rejects the rest', () => {
		expect( matchesTarget( dialogGroup( 'a' ), { shape: 'dialog' } ) ).toBe(
			true
		);
		expect(
			typeof matchesTarget( plainGroup( 'b' ), { shape: 'dialog' } )
		).toBe( 'string' );
	} );

	it( 'block-type constraint applies before the shape', () => {
		expect(
			typeof matchesTarget( heading( 'h' ), {
				blocks: [ 'core/group' ],
			} )
		).toBe( 'string' );
		expect(
			matchesTarget( plainGroup( 'g' ), { blocks: [ 'core/group' ] } )
		).toBe( true );
	} );

	it( 'unconstrained targets accept anything', () => {
		expect( matchesTarget( heading( 'h' ), {} ) ).toBe( true );
	} );

	it( 'built-in shapes are exposed for the filter', () => {
		expect( typeof getTargetShapes().dialog ).toBe( 'function' );
		expect( typeof getTargetShapes().query ).toBe( 'function' );
	} );

	it( 'query shape requires an opted-in, non-inherited Query Loop', () => {
		const q = ( attrs ) => ( {
			clientId: 'q',
			name: 'core/query',
			attributes: attrs,
		} );
		expect(
			matchesTarget( q( { customAction: 'query-paginate' } ), {
				shape: 'query',
			} )
		).toBe( true );
		// No query action → the opt-in reason.
		expect( matchesTarget( q( {} ), { shape: 'query' } ) ).toContain(
			'query action'
		);
		// Inherited → the inheritance reason.
		expect(
			matchesTarget(
				q( {
					customAction: 'query-paginate',
					query: { inherit: true },
				} ),
				{ shape: 'query' }
			)
		).toContain( 'Inherit' );
		// Not a query at all.
		expect(
			typeof matchesTarget( heading( 'h' ), { shape: 'query' } )
		).toBe( 'string' );
	} );
} );

describe( 'getTargetCandidates', () => {
	it( 'filters by eligibility and excludes the trigger itself', () => {
		mockSelect.mockImplementation( ( store ) =>
			store === 'core/block-editor'
				? {
						getBlocks: () => [
							dialogGroup( 'dialog-1', 'm1' ),
							plainGroup( 'plain-1' ),
							{ ...dialogGroup( 'self' ), clientId: 'self' },
						],
				  }
				: undefined
		);

		const candidates = getTargetCandidates( { shape: 'dialog' }, 'self' );
		expect( candidates ).toHaveLength( 1 );
		expect( candidates[ 0 ].block.clientId ).toBe( 'dialog-1' );
	} );
} );

describe( 'ensureAnchor', () => {
	it( 'returns an existing anchor untouched', () => {
		expect( ensureAnchor( dialogGroup( 'a', 'keep-me' ) ) ).toBe(
			'keep-me'
		);
		expect( mockDispatch ).not.toHaveBeenCalled();
	} );

	it( 'generates a collision-safe anchor and writes it to the block', () => {
		const updateBlockAttributes = jest.fn();
		mockSelect.mockImplementation( () => ( {
			getBlocks: () => [
				plainGroup( 'x', 'ba-group-1' ),
				plainGroup( 'y', 'ba-group-2' ),
			],
		} ) );
		mockDispatch.mockImplementation( () => ( { updateBlockAttributes } ) );

		const anchor = ensureAnchor( plainGroup( 'new-block' ) );
		expect( anchor ).toBe( 'ba-group-3' );
		expect( updateBlockAttributes ).toHaveBeenCalledWith( 'new-block', {
			anchor: 'ba-group-3',
		} );
	} );
} );

describe( 'TargetPicker', () => {
	it( 'resolves a picked anchor-less candidate by generating its anchor', () => {
		const target = plainGroup( 'pick-me' );
		const updateBlockAttributes = jest.fn();
		mockSelect.mockImplementation( ( store ) => {
			if ( store === 'core/block-editor' ) {
				return {
					getBlocks: () => [ target ],
					getBlock: ( id ) => ( id === 'pick-me' ? target : null ),
				};
			}
			return undefined;
		} );
		mockDispatch.mockImplementation( () => ( { updateBlockAttributes } ) );

		const onChange = jest.fn();
		const element = TargetPicker( {
			field: { key: 'target', label: 'Target', targets: {} },
			value: '',
			clientId: 'trigger',
			onChange,
		} );

		// Simulate the user picking the anchor-less candidate.
		element.props.onChange( '__client:pick-me' );
		expect( onChange ).toHaveBeenCalledWith( 'ba-group-1' );
		expect( updateBlockAttributes ).toHaveBeenCalled();
	} );

	it( 'passes free text through unchanged', () => {
		mockSelect.mockImplementation( () => ( { getBlocks: () => [] } ) );
		const onChange = jest.fn();
		const element = TargetPicker( {
			field: { key: 'target', label: 'Target', targets: {} },
			value: '',
			clientId: 'trigger',
			onChange,
		} );
		element.props.onFilterValueChange( 'template-part-anchor' );
		expect( onChange ).toHaveBeenCalledWith( 'template-part-anchor' );
	} );
} );

describe( 'validateInteraction', () => {
	const targetField = {
		key: 'modal',
		type: 'target',
		label: 'Modal',
		required: true,
		targets: { blocks: [ 'core/group' ], shape: 'dialog' },
	};

	function block( actionData ) {
		return {
			clientId: 'trigger',
			attributes: { customAction: 'modal-toggle', actionData },
		};
	}

	it( 'flags an empty required field (firm)', () => {
		const issues = validateInteraction( block( {} ), [ targetField ], [] );
		expect( issues ).toHaveLength( 1 );
		expect( issues[ 0 ].code ).toBe( 'missing-required' );
		expect( issues[ 0 ].advisory ).toBe( false );
	} );

	it( 'flags an unresolved target as ADVISORY (template-part caveat)', () => {
		const issues = validateInteraction(
			block( { modal: 'elsewhere' } ),
			[ targetField ],
			[ plainGroup( 'g', 'other' ) ]
		);
		expect( issues[ 0 ].code ).toBe( 'unresolved-target' );
		expect( issues[ 0 ].advisory ).toBe( true );
		expect( issues[ 0 ].message ).toContain( 'template' );
	} );

	it( 'flags a duplicated anchor (firm)', () => {
		const issues = validateInteraction(
			block( { modal: 'm1' } ),
			[ targetField ],
			[ dialogGroup( 'a', 'm1' ), dialogGroup( 'b', 'm1' ) ]
		);
		expect( issues[ 0 ].code ).toBe( 'ambiguous-target' );
		expect( issues[ 0 ].advisory ).toBe( false );
	} );

	it( 'flags a wrong-shaped target with the predicate reason', () => {
		const issues = validateInteraction(
			block( { modal: 'm1' } ),
			[ targetField ],
			[ plainGroup( 'a', 'm1' ) ]
		);
		expect( issues[ 0 ].code ).toBe( 'wrong-shape' );
		expect( issues[ 0 ].message ).toContain( 'Dialog' );
	} );

	it( 'passes a clean interaction', () => {
		const issues = validateInteraction(
			block( { modal: 'm1' } ),
			[ targetField ],
			[ dialogGroup( 'a', 'm1' ) ]
		);
		expect( issues ).toEqual( [] );
	} );

	it( 'no action means no issues', () => {
		const issues = validateInteraction(
			{ clientId: 'x', attributes: {} },
			[ targetField ],
			[]
		);
		expect( issues ).toEqual( [] );
	} );
} );
