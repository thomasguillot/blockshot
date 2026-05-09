// html-to-image only resolves SVG defs reached via <use xlink:href>, so CSS
// `filter: url(#id)` references (e.g. WordPress duotone) become dangling once
// the captured node is cloned. Inject any referenced <filter> defs into the
// node itself so they survive serialization. Caller must remove the returned
// element after export.
export function injectFilterDefs( doc, root ) {
	const win = doc.defaultView;
	if ( ! win ) {
		return null;
	}

	const ids = new Set();
	const elements = [ root, ...root.querySelectorAll( '*' ) ];
	for ( const el of elements ) {
		const filterValue = win.getComputedStyle( el ).filter;
		if ( ! filterValue || filterValue === 'none' ) {
			continue;
		}
		const matches = filterValue.matchAll( /url\(["']?#([^"')]+)["']?\)/g );
		for ( const match of matches ) {
			ids.add( match[ 1 ] );
		}
	}

	if ( ! ids.size ) {
		return null;
	}

	const svgNs = 'http://www.w3.org/2000/svg';
	const svg = doc.createElementNS( svgNs, 'svg' );
	svg.setAttribute( 'aria-hidden', 'true' );
	svg.setAttribute( 'focusable', 'false' );
	svg.setAttribute( 'width', '0' );
	svg.setAttribute( 'height', '0' );
	svg.style.cssText =
		'position:absolute;left:-9999px;top:auto;width:0;height:0;overflow:hidden;';
	const defs = doc.createElementNS( svgNs, 'defs' );
	svg.appendChild( defs );

	for ( const id of ids ) {
		const original = doc.getElementById( id );
		if ( original?.tagName?.toLowerCase() === 'filter' ) {
			defs.appendChild( original.cloneNode( true ) );
		}
	}

	if ( ! defs.children.length ) {
		return null;
	}

	root.appendChild( svg );
	return svg;
}
