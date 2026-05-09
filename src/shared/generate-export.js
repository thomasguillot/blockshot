import { toPng, toJpeg } from 'html-to-image';
import { setDpi } from './set-dpi';
import { injectFilterDefs } from './inject-filter-defs';

export async function generateExport( {
	canvas,
	doc,
	format,
	scale,
	quality,
} ) {
	const safeFormat = format === 'jpg' || format === 'png' ? format : 'png';
	const safeScale = Number( scale ) || 1;
	const safeQuality = Number( quality ) || 100;

	// eslint-disable-next-line @wordpress/no-unused-vars-before-return -- needed in finally for cleanup
	const filterDefsEl = injectFilterDefs( doc, canvas );

	try {
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
