import api from './api';
import Editor from './Editor';
import { translate as t } from '@nextcloud/l10n';

import 'cmmn-js/dist/assets/diagram-js.css';
import 'cmmn-js/dist/assets/cmmn-font/css/cmmn.css';
import 'cmmn-js/dist/cmmn-modeler.development.js';
import 'cmmn-js-properties-panel/dist/assets/cmmn-js-properties-panel.css';

import propertiesPanelModule from 'cmmn-js-properties-panel';
import propertiesProviderModule from 'cmmn-js-properties-panel/lib/provider/camunda';

import Modeler from 'cmmn-js/lib/Modeler';
import Viewer from 'cmmn-js/lib/Viewer';
import { jsPDF } from 'jspdf';

let openPropertiesPanel = true;

const PLAIN_TEMPLATE = `<?xml version="1.0" encoding="UTF-8"?>
<cmmn:definitions xmlns:dc="http://www.omg.org/spec/CMMN/20151109/DC" xmlns:cmmndi="http://www.omg.org/spec/CMMN/20151109/CMMNDI" xmlns:cmmn="http://www.omg.org/spec/CMMN/20151109/MODEL" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" id="Definitions_0iu0xrq" targetNamespace="http://bpmn.io/schema/cmmn" exporter="cmmn-js (https://demo.bpmn.io/cmmn)" exporterVersion="0.20.0">
  <cmmn:case id="Case_17wsr0k">
    <cmmn:casePlanModel id="CasePlanModel_0t8rloj" name="New model">
      <cmmn:planItem id="PlanItem_0zsvbce" definitionRef="Task_0erv9sh" />
      <cmmn:task id="Task_0erv9sh" />
    </cmmn:casePlanModel>
  </cmmn:case>
  <cmmndi:CMMNDI>
    <cmmndi:CMMNDiagram id="CMMNDiagram_1">
      <cmmndi:Size width="500" height="500" />
      <cmmndi:CMMNShape id="DI_CasePlanModel_0t8rloj" cmmnElementRef="CasePlanModel_0t8rloj">
        <dc:Bounds x="156" y="99" width="534" height="389" />
        <cmmndi:CMMNLabel />
      </cmmndi:CMMNShape>
      <cmmndi:CMMNShape id="PlanItem_0zsvbce_di" cmmnElementRef="PlanItem_0zsvbce">
        <dc:Bounds x="192" y="132" width="100" height="80" />
        <cmmndi:CMMNLabel />
      </cmmndi:CMMNShape>
    </cmmndi:CMMNDiagram>
  </cmmndi:CMMNDI>
</cmmn:definitions>`;

export default class CMMNEditor extends Editor {
	private modeler: Modeler | Viewer;

	protected getContent(): Promise<string> {
		if (this.modeler) {
			let xmlresult: string | undefined;
			this.modeler.saveXML({ format: true }, function (err, xml) {
				if (err) {
					return;
				}
				xmlresult = xml;
			});
			return Promise.resolve(xmlresult ?? '');
		}

		if (this.file.etag || OCA.Sharing?.PublicApp) {
			return api.getFileContent(this.file.path, this.file.id ?? 0);
		}

		return Promise.resolve(PLAIN_TEMPLATE);
	}

	protected async getSVG(): Promise<string> {
		if (this.modeler) {
			let svgresult: string | undefined;
			this.modeler.saveSVG(function (err, svg) {
				if (err) {
					return;
				}
				svgresult = svg;
			});
			return Promise.resolve(svgresult ?? '');
		}

		throw new Error('Modeler not loaded');
	}

	protected async destroy(): Promise<void> {
		this.modeler && this.modeler.destroy();

		//this.removeResizeListener(this.onResize);
	}

	protected async downloadAsPDF(pdf: jsPDF): Promise<void> {
		let svgresult: string | undefined;
		this.modeler.saveSVG(function (err, svg) {
			if (err) {
				return;
			}
			svgresult = svg;
		});

		//for printing
		const svgContainer = $('<div>');
		svgContainer.css({
			position: 'fixed',
			bottom: '100%',
		});
		svgContainer.append(svgresult ?? '');
		svgContainer.appendTo(this.containerElement);

		const svgElement = svgContainer.find('svg').get(0);
		//const bounding = svgElement.getBoundingClientRect();

		if (svgElement) {
			const width =
				svgElement.width.baseVal.value < 620
					? svgElement.width.baseVal.value - 30
					: 600;
			const height =
				svgElement.height.baseVal.value < 375
					? svgElement.height.baseVal.value - 30
					: 375;
			await pdf.svg(svgElement, {
				x: 15,
				y: 45,
				width: width,
				height: height,
			}); //nb: width and height are a4 dimensions - 30 mm
		}

		//get subprocesses
	}
	protected async runEditor(): Promise<void> {
		let xmldata = await this.getContent();
		if (!xmldata || xmldata == '') {
			xmldata = PLAIN_TEMPLATE;
		}

		const modeler = this.getModeler();
		try {
			await modeler.importXML(xmldata);
		} catch (err) {
			this.showLoadingError(err.toString());
		}
	}

	private onResize = () => {
		this.modeler && this.modeler.resized();
	};

	private getModeler() {
		if (!this.modeler) {
			const containerElement = this.getAppContainerElement();
			const canvasElement = containerElement.find('.bpmn-canvas');
			const propertiesElement = containerElement.find('.bpmn-properties');

			this.modeler = this.isFileUpdatable()
				? new Modeler({
						container: canvasElement,
						propertiesPanel: {
							parent: propertiesElement,
						},
						additionalModules: [
							propertiesPanelModule,
							propertiesProviderModule,
						],
						keyboard: {
							bindTo: window,
						},
					})
				: new Viewer({
						container: canvasElement,
					});
			// if (openPropertiesPanel) {

			// 	$('<div>')
			// 		.addClass('entry close icon-close propertiespanel-close')
			// 		.attr('role', 'button')
			// 		.on('click', this.clickCallbackFactory(this.closeProp))
			// 		.appendTo(propertiesElement);
			// }
		}
		return this.modeler;
	}
	protected async closeProp(): Promise<void> {
		const containerElement = this.getAppContainerElement();
		const propertiesElement = containerElement.find('.bpmn-properties');
		propertiesElement.addClass('hidden');
	}

	protected getAppContainerElement(): JQuery {
		let newcontainer = false;
		if (!this.containerElement || this.containerElement.length === 0) {
			newcontainer = true;
		}

		const containerElement = super.getAppContainerElement();

		if (newcontainer) {
			const actionsgroup =
				document.getElementById('modeler-actions-group') ??
				$('#modeler-actions-group');
			$('<div>', { id: 'propertiesToggle' })
				.attr('role', 'button')
				.addClass('entry')
				.on('click', this.toggleProperties)
				.append(`<span>${t('files_bpm_ru', 'Свойства')}</span>`)
				.appendTo(actionsgroup);
		}

		return containerElement;
	}
	private toggleProperties = (ev: JQuery.ClickEvent) => {
		openPropertiesPanel = !openPropertiesPanel;

		const propertiesElement =
			this.getAppContainerElement().find('.bpmn-properties');
		propertiesElement.toggleClass('hidden');
	};
}
