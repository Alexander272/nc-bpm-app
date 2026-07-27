import api from './api';
import Editor from './Editor';
import 'dmn-js/dist/assets/diagram-js.css';
import 'dmn-js/dist/assets/dmn-js-decision-table-controls.css';
import 'dmn-js/dist/assets/dmn-js-decision-table.css';
import 'dmn-js/dist/assets/dmn-js-drd.css';
import 'dmn-js/dist/assets/dmn-js-literal-expression.css';
import 'dmn-js/dist/assets/dmn-js-shared.css';
import 'dmn-js/dist/assets/dmn-font/css/dmn.css';
import 'dmn-js-properties-panel/dist/assets/properties-panel.css';
import { DMSModeler, DMSViewer } from './vendor/dms-js';
import { DmnPropertiesPanelModule, DmnPropertiesProviderModule } from 'dmn-js-properties-panel';
//import drdAdapterModule from 'dmn-js-properties-panel/lib/adapter/drd';
import camundaModdleDescriptor from 'camunda-dmn-moddle/resources/camunda.json';
import { jsPDF } from 'jspdf';


const PLAIN_TEMPLATE = `<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="https://www.omg.org/spec/DMN/20191111/MODEL/" xmlns:dmndi="https://www.omg.org/spec/DMN/20191111/DMNDI/" xmlns:dc="http://www.omg.org/spec/DMN/20180521/DC/" id="definitions_0xcty6c" name="definitions" namespace="http://camunda.org/schema/1.0/dmn" exporter="dmn-js (https://demo.bpmn.io/dmn)" exporterVersion="10.1.0">
  <decision id="decision_0k1xeln" name="">
    <decisionTable id="decisionTable_0h35w5w">
      <input id="input1" label="">
        <inputExpression id="inputExpression1" typeRef="string">
          <text></text>
        </inputExpression>
      </input>
      <output id="output1" label="" name="" typeRef="string" />
    </decisionTable>
  </decision>
  <dmndi:DMNDI>
    <dmndi:DMNDiagram id="DMNDiagram_0wcate9">
      <dmndi:DMNShape id="DMNShape_0pi5rd3" dmnElementRef="decision_0k1xeln">
        <dc:Bounds height="80" width="180" x="150" y="80" />
      </dmndi:DMNShape>
    </dmndi:DMNDiagram>
  </dmndi:DMNDI>
</definitions>`;

export default class DMNEditor extends Editor {
	private modeler: DMSModeler;
	protected getContent(): Promise<string> {

		if (this.modeler) {
			return this.modeler.saveXML();
		}

		if (this.file.etag || OCA.Sharing?.PublicApp) {
			return api.getFileContent(this.file.path, this.file.id ?? 0);
		}

		return Promise.resolve(PLAIN_TEMPLATE);
	}

	protected async getSVG(): Promise<string> {
		if (this.modeler) {
			const active = await this.modeler.getActiveViewer();
			const temp = await this.modeler.getActiveView();
			if (temp.type == 'drd') {
				// currently in DRD; creating SVG
			}
			else {
				const drd = this.modeler.getViews().filter(a => a.type == 'drd')[0];
				await this.modeler.open(drd);
			}
			const svg = (await this.modeler.getActiveViewer().saveSVG()).svg;

			await this.modeler.open(temp);
			return svg;
		}

		throw new Error('Modeler not loaded');
	}

	protected async destroy(): Promise<void> {
		this.modeler && this.modeler.destroy();

		//this.removeResizeListener(this.onResize);
	}

	protected async downloadAsPDF(pdf: jsPDF): Promise<void> {
		//for printing
		const svgContainer = $('<div>');
		svgContainer.css({
			position: 'fixed',
			bottom: '100%',
		});
		svgContainer.append(await this.getSVG());
		svgContainer.appendTo(this.containerElement);

		const svgElement = svgContainer.find('svg').get(0);
		if (svgElement) {
			//modeler-specific additional features (BPMN subprocesses, DMN to be seen)

			const width = svgElement.width.baseVal.value < 620? svgElement.width.baseVal.value - 30 : 600;
			const height = svgElement.height.baseVal.value < 375? svgElement.height.baseVal.value - 30 : 375;

			try {
				await pdf.svg(svgElement, {
					x: 15,
					y: 30,
					width: width,
					height: height,
				}); //nb: width and height are a4 dimensions - 30 mm

			} catch (err) {
				svgContainer.remove();

				throw err;
			}
		}

		svgContainer.remove();
	}
	protected async runEditor(): Promise<void> {
		let xmldata = await this.getContent();
		if (!xmldata || xmldata == '') {
			xmldata = PLAIN_TEMPLATE;
		}

		const modeler = this.getModeler();
		try {
			const result = await modeler.importXML(xmldata);
			this.attachChangeListener();
			const containerElement = this.getAppContainerElement();
			const propertiesElement = containerElement.find('.bpmn-properties');

			$('<div>')
				.addClass('entry close icon-close propertiespanel-close')
				.attr('role', 'button')
				.on('click', this.clickCallbackFactory(this.closeProp))
				.appendTo(propertiesElement);

			this.modeler.getActiveViewer().on('propertiesPanel.updated', () => {
				propertiesElement.removeClass('hidden');
			})


		} catch (err) {
			this.showLoadingError(err.toString());
		}
	}

	private onResize = () => {
		this.modeler && this.modeler.resized();
	}

	private getModeler() {
		if (!this.modeler) {
			const containerElement = this.getAppContainerElement();
			const canvasElement = containerElement.find('.bpmn-canvas');
			const propertiesElement = containerElement.find('.bpmn-properties');

			this.modeler = this.isFileUpdatable() ? new DMSModeler({
				container: canvasElement,
				common: {
					keyboard: {
						bindTo: window,
					},
				},
				drd: {
					propertiesPanel: {
						parent: propertiesElement,
						layout: {
							open: true,
							groups: {
								general: { open: true },
								documentation: { open: true },
							},
						},
					},
					additionalModules: [
						DmnPropertiesPanelModule, DmnPropertiesProviderModule,
						//drdAdapterModule,
					],
				},
				moddleExtensions: {
					camunda: camundaModdleDescriptor,
				},
			}) : new DMSViewer({
				container: canvasElement,
			});
		}

		return this.modeler;
	}
	protected async closeProp(): Promise<void> {
		const containerElement = this.getAppContainerElement();
		const propertiesElement = containerElement.find('.bpmn-properties');
		propertiesElement.addClass('hidden');

	}
	private attachChangeListener() {
		let viewer = this.modeler.getActiveViewer();

		if (!viewer) {
			return;
		}

		const containerElement = this.getAppContainerElement();

		viewer.on('element.changed', () => {
			if (!this.hasUnsavedChanges) {
				this.hasUnsavedChanges = true;
				containerElement.attr('data-state', 'unsaved');
			}
		});
		//todo: figure out event for changes in a DRD, and set that -> unsaved changes

	}

	protected getAppContainerElement(): JQuery {
		const containerElement = super.getAppContainerElement();
		return containerElement;
	}
}