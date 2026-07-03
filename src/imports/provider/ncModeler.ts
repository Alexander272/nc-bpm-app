
//NB: When adding new properties, also update descriptors/modelerVS.json

import { createGroup } from './ProviderUtil';
import{ PropertiesPanel }from '@bpmn-io/properties-panel';
const LOW_PRIORITY = 500;


/**
 * A provider with a `#getGroups(element)` method
 * that exposes groups for a diagram element.
 *
 * @param {PropertiesPanel} propertiesPanel
 * @param {Function} translate
 */
export default function NCPropertiesProvider(propertiesPanel:PropertiesPanel, translate): void{


	/**
	 * Return the groups provided for the given element.
	 *
	 * @param {DiagramElement} element
	 *
	 * @return {(Object[]) => (Object[])} groups middleware
	 */
	this.getGroups = function (element) {
		return function (groups) {
			const ncGroup = createGroup(element, translate);
			if (ncGroup.entries.length > 0) {
				groups.push(ncGroup);
			}
			return groups;
		};
	};

	// registration ////////



	// Register our custom magic properties provider.
	// Use a lower priority to ensure it is loaded after
	// the basic BPMN properties.
	propertiesPanel.registerProvider(LOW_PRIORITY, this);


}


NCPropertiesProvider.$inject = ['propertiesPanel', 'translate'];




//Set the dictionary