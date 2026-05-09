/**
 * @jest-environment jsdom
 */
import { setDpi } from '../set-dpi';

// Smallest valid 1x1 PNG (red pixel) as a base64 data URL.
const RED_PNG_BASE64 =
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';
const RED_PNG = `data:image/png;base64,${ RED_PNG_BASE64 }`;

// Minimal JFIF JPEG: SOI + APP0(JFIF) + SOS + EOI. Constructed by hand below
// rather than embedded as a base64 string so the structure is auditable.
function buildJfifBytes( versionMajor = 1, versionMinor = 1 ) {
	return new Uint8Array( [
		0xff, 0xd8, // SOI
		0xff, 0xe0, // APP0 marker
		0x00, 0x10, // segment length (16)
		0x4a, 0x46, 0x49, 0x46, 0x00, // "JFIF\0"
		versionMajor, versionMinor, // version 1.1
		0x00, // density units (none)
		0x00, 0x48, // X density (72)
		0x00, 0x48, // Y density (72)
		0x00, 0x00, // thumbnail w/h
		0xff, 0xd9, // EOI
	] );
}

function bytesToDataUrl( bytes, mime ) {
	let bin = '';
	for ( let i = 0; i < bytes.length; i++ ) {
		bin += String.fromCharCode( bytes[ i ] );
	}
	return `data:${ mime };base64,${ btoa( bin ) }`;
}

function dataUrlToBytes( dataUrl ) {
	const bin = atob( dataUrl.split( ',' )[ 1 ] );
	const out = new Uint8Array( bin.length );
	for ( let i = 0; i < bin.length; i++ ) {
		out[ i ] = bin.charCodeAt( i );
	}
	return out;
}

describe( 'setDpi', () => {
	it( 'returns the original data URL when scale is 1', () => {
		expect( setDpi( RED_PNG, 1, 'png' ) ).toBe( RED_PNG );
	} );

	it( 'inserts a pHYs chunk into a PNG when scale is > 1', () => {
		const out = setDpi( RED_PNG, 2, 'png' );
		expect( out ).not.toBe( RED_PNG );

		const bytes = dataUrlToBytes( out );

		// Find "pHYs" type marker in the byte stream.
		let pHYsIndex = -1;
		for ( let i = 0; i < bytes.length - 4; i++ ) {
			if (
				bytes[ i ] === 0x70 &&
				bytes[ i + 1 ] === 0x48 &&
				bytes[ i + 2 ] === 0x59 &&
				bytes[ i + 3 ] === 0x73
			) {
				pHYsIndex = i;
				break;
			}
		}
		expect( pHYsIndex ).toBeGreaterThan( 0 );

		// 4 bytes of length precede the type. Data follows the type.
		// Expected ppm = round(144 / 0.0254) = 5669.
		const dv = new DataView( bytes.buffer );
		const ppmX = dv.getUint32( pHYsIndex + 4, false );
		const ppmY = dv.getUint32( pHYsIndex + 8, false );
		expect( ppmX ).toBe( 5669 );
		expect( ppmY ).toBe( 5669 );
		expect( bytes[ pHYsIndex + 12 ] ).toBe( 1 ); // unit = meter
	} );

	it( 'patches a JFIF JPEG with DPI density at scale > 1', () => {
		const jpeg = buildJfifBytes();
		const dataUrl = bytesToDataUrl( jpeg, 'image/jpeg' );

		const out = setDpi( dataUrl, 2, 'jpg' );
		const outBytes = dataUrlToBytes( out );

		// Density unit byte sits at offset 13: 2 (SOI) + 4 (APP0 marker+length)
		// + 5 ("JFIF\0") + 2 (version) — i.e. jfifOffset (6) + 7 in the source.
		const densityOffset = 13;
		expect( outBytes[ densityOffset ] ).toBe( 1 ); // units = DPI
		const dpiX =
			( outBytes[ densityOffset + 1 ] << 8 ) | outBytes[ densityOffset + 2 ];
		const dpiY =
			( outBytes[ densityOffset + 3 ] << 8 ) | outBytes[ densityOffset + 4 ];
		expect( dpiX ).toBe( 144 );
		expect( dpiY ).toBe( 144 );
	} );

	it( 'returns the JPEG unchanged with a console warning when no JFIF APP0 is present', () => {
		// Build a JPEG without APP0/JFIF segment.
		const noJfif = new Uint8Array( [
			0xff, 0xd8, // SOI
			0xff, 0xd9, // EOI immediately
		] );
		const dataUrl = bytesToDataUrl( noJfif, 'image/jpeg' );

		const warnSpy = jest.spyOn( console, 'warn' ).mockImplementation();
		const out = setDpi( dataUrl, 2, 'jpg' );
		const outBytes = dataUrlToBytes( out );

		expect( outBytes ).toEqual( noJfif );
		expect( warnSpy ).toHaveBeenCalledWith(
			expect.stringContaining( 'JFIF APP0' )
		);
		warnSpy.mockRestore();
	} );
} );
