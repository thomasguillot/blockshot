import { toPng, toJpeg } from 'html-to-image';
import { setDpi } from './set-dpi';
import { injectFilterDefs } from './inject-filter-defs';

// `html-to-image` inlines `@font-face` rules synchronously when serializing the
// canvas, so any font that is still loading (or that the browser hasn't fetched
// yet because the user just applied it) silently falls back. Force the canvas
// document's FontFaceSet to settle before we serialize.
async function ensureFontsLoaded( doc ) {
	if ( ! doc?.fonts ) {
		return;
	}
	// Kick off loading for declared-but-unrequested faces. `.load()` is a
	// no-op once a face is loaded; failures are swallowed so one bad URL
	// can't block the whole export.
	for ( const fontFace of doc.fonts ) {
		fontFace.load().catch( () => {} );
	}
	await doc.fonts.ready;
}

export async function generateExport( {
	canvas,
	doc,
	format,
	scale,
	quality,
} ) {
	const safeFormat = format === 'jpg' || format === 'png' ? format : 'png';

	const rawScale = Number( scale );
	const safeScale = Number.isFinite( rawScale )
		? Math.min( 4, Math.max( 1, Math.round( rawScale ) ) )
		: 1;

	const rawQuality = Number( quality );
	const safeQuality = Number.isFinite( rawQuality )
		? Math.min( 100, Math.max( 1, Math.round( rawQuality ) ) )
		: 100;

	// eslint-disable-next-line @wordpress/no-unused-vars-before-return -- needed in finally for cleanup
	const filterDefsEl = injectFilterDefs( doc, canvas );

	try {
		await ensureFontsLoaded( doc );

		const fn = safeFormat === 'jpg' ? toJpeg : toPng;
		const options = {
			pixelRatio: safeScale,
			...( safeFormat === 'jpg' && {
				quality: safeQuality / 100,
			} ),
		};

		const rawDataUrl = await fn( canvas, options );
		return {
			dataUrl: setDpi( rawDataUrl, safeScale, safeFormat ),
			format: safeFormat,
		};
	} finally {
		filterDefsEl?.remove();
	}
}

export function triggerDownload( doc, dataUrl, filename ) {
	const link = doc.createElement( 'a' );
	link.download = filename;
	link.href = dataUrl;
	link.style.display = 'none';
	doc.body.appendChild( link );
	link.click();
	link.remove();
}
