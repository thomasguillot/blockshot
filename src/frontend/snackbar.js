const CONTAINER_ID = 'blockshot-snackbar';
const AUTO_DISMISS_MS = 4000;

let timeout = null;

function getOrCreateContainer() {
	let container = document.getElementById( CONTAINER_ID );
	if ( ! container ) {
		container = document.createElement( 'div' );
		container.id = CONTAINER_ID;
		container.setAttribute( 'role', 'status' );
		container.setAttribute( 'aria-live', 'polite' );
		document.body.appendChild( container );
	}
	return container;
}

export function showSnackbar( message, type = 'success' ) {
	const container = getOrCreateContainer();

	if ( timeout ) {
		clearTimeout( timeout );
	}

	container.textContent = message;
	container.className = `blockshot-snackbar blockshot-snackbar--${ type } blockshot-snackbar--visible`;

	timeout = setTimeout( () => {
		container.classList.remove( 'blockshot-snackbar--visible' );
		timeout = null;
	}, AUTO_DISMISS_MS );
}
