import { isPaste } from 'diagram-js/lib/features/keyboard/KeyboardUtil';


/**
*	A factory function that returns a reviver to be
*	used with JSON#parse to reinstantiate moddle instances.
*
* @param  {Moddle} moddle
*
* @return {Function}
*/
function createReviver(moddle) {

	var elCache = {};

	/**
	 * The actual reviewer that creates model instances
	 * for elements with a $type attribute.
	 *
	 * Elements with ids will be re-used, if already
	 * created.
	 *
	 * @param  {String} key
	 * @param  {Object} object
	 *
	 * @return {Object} actual element
	 */
	return function (key, object) {

		if (typeof object === 'object' && typeof object.$type === 'string') {

			var objectId = object.id;

			if (objectId && elCache[objectId]) {
				return elCache[objectId];
			}

			var type = object.$type;
			var attrs = Object.assign({}, object);

			delete attrs.$type;

			var newEl = moddle.create(type, attrs);

			if (objectId) {
				elCache[objectId] = newEl;
			}

			return newEl;
		}

		return object;
	};
}


export default function CopyPasteModule(keyboard, eventBus, moddle, clipboard) {


	// persist into local storage whenever
	// copy took place
	eventBus.on('copyPaste.elementsCopied', event => {
		const { tree } = event;

		console.log('PUT localStorage', tree);

		// persist in local storage, encoded as json
		localStorage.setItem('bpmnClipboard', JSON.stringify(tree));
	});

	// eventBus.on('copyPaste.pasteElements', event => {

	keyboard.addListener(2000, event => {
		const { keyEvent } = event;

		if (!isPaste(keyEvent)) {
			return;
		}

		// retrieve from local storage
		const serializedCopy = localStorage.getItem('bpmnClipboard');

		if (!serializedCopy) {
			return;
		}

		// parse tree, reinstantiating contained objects
		const parsedCopy = JSON.parse(serializedCopy, createReviver(moddle));

		console.log('GET localStorage', parsedCopy);

		// put into clipboard
		clipboard.set(parsedCopy);
	});
}


CopyPasteModule.$inject = ['keyboard', 'eventBus', 'moddle', 'clipboard']