import { injectFilterDefs } from '../inject-filter-defs';

const SVG_NS = 'http://www.w3.org/2000/svg';

function buildDuotoneFilter( id ) {
	const svg = document.createElementNS( SVG_NS, 'svg' );
	const defs = document.createElementNS( SVG_NS, 'defs' );
	const filter = document.createElementNS( SVG_NS, 'filter' );
	filter.setAttribute( 'id', id );
	defs.appendChild( filter );
	svg.appendChild( defs );
	return svg;
}

function setupCanvas() {
	const canvas = document.createElement( 'div' );
	canvas.setAttribute( 'data-blockshot-canvas', '' );
	const img = document.createElement( 'img' );
	canvas.appendChild( img );
	document.body.appendChild( canvas );
	return { canvas, img };
}

afterEach( () => {
	document.body.innerHTML = '';
	jest.restoreAllMocks();
} );

describe( 'injectFilterDefs', () => {
	it( 'returns null and does nothing when no filter URLs are referenced', () => {
		const { canvas, img } = setupCanvas();
		// jsdom getComputedStyle returns "" for filter by default — that's a no-op.
		jest.spyOn( window, 'getComputedStyle' ).mockReturnValue( {
			filter: 'none',
		} );

		const result = injectFilterDefs( document, canvas );

		expect( result ).toBeNull();
		expect( canvas.querySelectorAll( 'svg' ) ).toHaveLength( 0 );
		// silence "unused var" warning
		expect( img ).toBeDefined();
	} );

	it( 'clones a referenced <filter> def into the captured node', () => {
		const { canvas } = setupCanvas();
		document.body.appendChild( buildDuotoneFilter( 'wp-duotone-1' ) );

		jest.spyOn( window, 'getComputedStyle' ).mockImplementation( ( el ) =>
			el.tagName === 'IMG'
				? { filter: 'url("#wp-duotone-1")' }
				: { filter: 'none' }
		);

		const injected = injectFilterDefs( document, canvas );

		expect( injected ).not.toBeNull();
		expect( canvas.contains( injected ) ).toBe( true );
		const cloned = injected.querySelector( 'filter' );
		expect( cloned ).not.toBeNull();
		expect( cloned.getAttribute( 'id' ) ).toBe( 'wp-duotone-1' );
	} );

	it( 'deduplicates and clones multiple distinct filter ids', () => {
		const { canvas } = setupCanvas();
		const img2 = document.createElement( 'img' );
		canvas.appendChild( img2 );
		const img3 = document.createElement( 'img' );
		canvas.appendChild( img3 );

		document.body.appendChild( buildDuotoneFilter( 'wp-duotone-1' ) );
		document.body.appendChild( buildDuotoneFilter( 'wp-duotone-2' ) );

		jest.spyOn( window, 'getComputedStyle' ).mockImplementation( ( el ) => {
			if ( el === img2 ) {
				return { filter: 'url(#wp-duotone-1)' };
			}
			if ( el === img3 ) {
				return { filter: "url('#wp-duotone-2')" };
			}
			if ( el.tagName === 'IMG' ) {
				return { filter: 'url(#wp-duotone-1)' };
			}
			return { filter: 'none' };
		} );

		const injected = injectFilterDefs( document, canvas );
		const ids = [ ...injected.querySelectorAll( 'filter' ) ].map( ( f ) =>
			f.getAttribute( 'id' )
		);

		expect( ids ).toHaveLength( 2 );
		expect( ids ).toEqual(
			expect.arrayContaining( [ 'wp-duotone-1', 'wp-duotone-2' ] )
		);
	} );

	it( 'returns null when referenced ids do not point to <filter> elements', () => {
		const { canvas } = setupCanvas();

		jest.spyOn( window, 'getComputedStyle' ).mockImplementation( ( el ) =>
			el.tagName === 'IMG'
				? { filter: 'url(#missing-filter)' }
				: { filter: 'none' }
		);

		expect( injectFilterDefs( document, canvas ) ).toBeNull();
		expect( canvas.querySelectorAll( 'svg' ) ).toHaveLength( 0 );
	} );

	it( 'returns null when doc has no defaultView', () => {
		const fakeDoc = { defaultView: null };
		expect(
			injectFilterDefs( fakeDoc, document.createElement( 'div' ) )
		).toBeNull();
	} );
} );
