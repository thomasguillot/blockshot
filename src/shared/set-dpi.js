const BASE_DPI = 72;

function crc32( buf ) {
	let crc = -1;
	for ( let i = 0; i < buf.length; i++ ) {
		crc ^= buf[ i ];
		for ( let j = 0; j < 8; j++ ) {
			crc = ( crc >>> 1 ) ^ ( crc & 1 ? 0xedb88320 : 0 );
		}
	}
	return ( crc ^ -1 ) >>> 0;
}

function dataUrlToUint8Array( dataUrl ) {
	const base64 = dataUrl.split( ',' )[ 1 ];
	const binary = atob( base64 );
	const bytes = new Uint8Array( binary.length );
	for ( let i = 0; i < binary.length; i++ ) {
		bytes[ i ] = binary.charCodeAt( i );
	}
	return bytes;
}

function uint8ArrayToDataUrl( bytes, mime ) {
	let binary = '';
	for ( let i = 0; i < bytes.length; i++ ) {
		binary += String.fromCharCode( bytes[ i ] );
	}
	return `data:${ mime };base64,${ btoa( binary ) }`;
}

function setPngDpi( data, dpi ) {
	const ppm = Math.round( dpi / 0.0254 );

	const pHYsData = new Uint8Array( 13 );
	const view = new DataView( pHYsData.buffer );
	pHYsData.set(
		[ 0x70, 0x48, 0x59, 0x73 ],
		0
	); // "pHYs"
	view.setUint32( 4, ppm, false );
	view.setUint32( 8, ppm, false );
	pHYsData[ 12 ] = 1; // unit = meter

	const crcValue = crc32( pHYsData );

	const chunk = new Uint8Array( 4 + 4 + 9 + 4 );
	const chunkView = new DataView( chunk.buffer );
	chunkView.setUint32( 0, 9, false ); // data length
	chunk.set( pHYsData, 4 );
	chunkView.setUint32( 17, crcValue, false );

	const ihdrEnd = 8 + 4 + 4 + 13 + 4; // signature + IHDR length + type + data + crc
	const before = data.slice( 0, ihdrEnd );
	const after = data.slice( ihdrEnd );

	const result = new Uint8Array( before.length + chunk.length + after.length );
	result.set( before, 0 );
	result.set( chunk, before.length );
	result.set( after, before.length + chunk.length );
	return result;
}

function setJpegDpi( data, dpi ) {
	for ( let i = 0; i < data.length - 1; i++ ) {
		if ( data[ i ] === 0xff && data[ i + 1 ] === 0xe0 ) {
			const jfifOffset = i + 4;
			if (
				data[ jfifOffset ] === 0x4a && // J
				data[ jfifOffset + 1 ] === 0x46 && // F
				data[ jfifOffset + 2 ] === 0x49 && // I
				data[ jfifOffset + 3 ] === 0x46 // F
			) {
				const densityOffset = jfifOffset + 7;
				data[ densityOffset ] = 1; // units = DPI
				data[ densityOffset + 1 ] = ( dpi >> 8 ) & 0xff;
				data[ densityOffset + 2 ] = dpi & 0xff;
				data[ densityOffset + 3 ] = ( dpi >> 8 ) & 0xff;
				data[ densityOffset + 4 ] = dpi & 0xff;
				return data;
			}
		}
	}
	return data;
}

export function setDpi( dataUrl, scale, format ) {
	const dpi = BASE_DPI * Number( scale );
	if ( dpi === BASE_DPI ) {
		return dataUrl;
	}

	const data = dataUrlToUint8Array( dataUrl );
	const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';

	const patched =
		format === 'jpg' ? setJpegDpi( data, dpi ) : setPngDpi( data, dpi );

	return uint8ArrayToDataUrl( patched, mime );
}
