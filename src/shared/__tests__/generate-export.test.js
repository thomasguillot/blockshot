/**
 * @jest-environment jsdom
 */
jest.mock( 'html-to-image', () => ( {
	toPng: jest.fn( async () => 'data:image/png;base64,UE5HRkFLRQ==' ),
	toJpeg: jest.fn( async () => 'data:image/jpeg;base64,SlBHRkFLRQ==' ),
} ) );

jest.mock( '../set-dpi', () => ( {
	setDpi: jest.fn( ( url ) => url + '#dpi-patched' ),
} ) );

jest.mock( '../inject-filter-defs', () => ( {
	injectFilterDefs: jest.fn( () => null ),
} ) );

import { toPng, toJpeg } from 'html-to-image';
import { setDpi } from '../set-dpi';
import { injectFilterDefs } from '../inject-filter-defs';
import { generateExport, triggerDownload } from '../generate-export';

beforeEach( () => {
	jest.clearAllMocks();
} );

describe( 'generateExport', () => {
	it( 'calls toPng with the correct pixelRatio for png format', async () => {
		const canvas = document.createElement( 'div' );
		const result = await generateExport( {
			canvas,
			doc: document,
			format: 'png',
			scale: 2,
			quality: 100,
		} );

		expect( toPng ).toHaveBeenCalledWith( canvas, { pixelRatio: 2 } );
		expect( toJpeg ).not.toHaveBeenCalled();
		expect( setDpi ).toHaveBeenCalledWith(
			'data:image/png;base64,UE5HRkFLRQ==',
			2,
			'png'
		);
		expect( result.dataUrl ).toBe(
			'data:image/png;base64,UE5HRkFLRQ==#dpi-patched'
		);
		expect( result.format ).toBe( 'png' );
	} );

	it( 'calls toJpeg with quality option for jpg format', async () => {
		const canvas = document.createElement( 'div' );
		await generateExport( {
			canvas,
			doc: document,
			format: 'jpg',
			scale: 3,
			quality: 75,
		} );

		expect( toJpeg ).toHaveBeenCalledWith( canvas, {
			pixelRatio: 3,
			quality: 0.75,
		} );
		expect( toPng ).not.toHaveBeenCalled();
	} );

	it( 'falls back to png for unknown formats', async () => {
		const canvas = document.createElement( 'div' );
		const result = await generateExport( {
			canvas,
			doc: document,
			format: 'webp',
			scale: 1,
			quality: 100,
		} );
		expect( toPng ).toHaveBeenCalled();
		expect( result.format ).toBe( 'png' );
	} );

	it( 'cleans up injected filter defs in the finally block', async () => {
		const canvas = document.createElement( 'div' );
		const fakeDefs = document.createElement( 'svg' );
		const removeSpy = jest.spyOn( fakeDefs, 'remove' );
		injectFilterDefs.mockReturnValueOnce( fakeDefs );

		await generateExport( {
			canvas,
			doc: document,
			format: 'png',
			scale: 1,
			quality: 100,
		} );

		expect( removeSpy ).toHaveBeenCalled();
	} );

	it( 'cleans up injected filter defs even when html-to-image throws', async () => {
		const canvas = document.createElement( 'div' );
		const fakeDefs = document.createElement( 'svg' );
		const removeSpy = jest.spyOn( fakeDefs, 'remove' );
		injectFilterDefs.mockReturnValueOnce( fakeDefs );
		toPng.mockRejectedValueOnce( new Error( 'boom' ) );

		await expect(
			generateExport( {
				canvas,
				doc: document,
				format: 'png',
				scale: 1,
				quality: 100,
			} )
		).rejects.toThrow( 'boom' );

		expect( removeSpy ).toHaveBeenCalled();
	} );
} );

describe( 'triggerDownload', () => {
	it( 'creates an anchor, attaches it, clicks it, and removes it', () => {
		const clickSpy = jest.fn();
		const origCreate = document.createElement.bind( document );
		const createSpy = jest
			.spyOn( document, 'createElement' )
			.mockImplementation( ( tag ) => {
				if ( tag === 'a' ) {
					const a = origCreate( 'a' );
					a.click = clickSpy;
					return a;
				}
				return origCreate( tag );
			} );

		triggerDownload( document, 'data:image/png;base64,X', 'foo.png' );

		expect( clickSpy ).toHaveBeenCalledTimes( 1 );
		// After triggerDownload, no anchors should remain in the body.
		expect( document.body.querySelectorAll( 'a' ) ).toHaveLength( 0 );
		createSpy.mockRestore();
	} );
} );
