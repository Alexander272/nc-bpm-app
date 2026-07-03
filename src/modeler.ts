import './imports/bootstrap';
//import { loadState } from '@nextcloud/initial-state';
import axios from '@nextcloud/axios';
import { translate as t } from '@nextcloud/l10n';
import { loadState } from '@nextcloud/initial-state';
import './imports/bootstrap';


import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import 'bpmn-js/dist/assets/bpmn-js.css';

import '@fortawesome/fontawesome-free/js/all.js';
import '@fortawesome/fontawesome-free/js/solid.js';

import './imports/Editor.scss';
import './imports/BPMNEditor';
import './imports/DMNEditor';
import './imports/Editor';
import api from './imports/api';
import { NextcloudFile, NextcloudFileList } from './imports/Editor';
//import {File} from '@nextcloud/files';

const PLAIN_TEMPLATE = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn2:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" xsi:schemaLocation="http://www.omg.org/spec/BPMN/20100524/MODEL BPMN20.xsd" id="sample-diagram" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn2:process id="Process_1" isExecutable="false">
	<bpmn2:startEvent id="StartEvent_1"/>
  </bpmn2:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
	<bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
	  <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
		<dc:Bounds height="36.0" width="36.0" x="412.0" y="240.0"/>
	  </bpmndi:BPMNShape>
	</bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn2:definitions>`;

const urlParams = new URL(window.location.href).searchParams;
let fileId = urlParams.get('fileId') ?? '';
let dirName = urlParams.get('dir') ?? '/';
let extension = urlParams.get('ext') ?? 'bpmn';



//id, name, path, permissions
async function runEditor(){
	let fileInfo;
	if(!fileId){
		const datetime = new Date().toISOString();
		fileInfo = {
				name: 'diagram_'+datetime+'.'+extension,
				path: dirName,
				permissions: OC.PERMISSION_CREATE | OC.PERMISSION_UPDATE,
				mime: extension
		}
	}else{
		fileInfo = await api.getFileInfo(fileId);
	}

	//TEMP: Get mimetype properly
	if (fileInfo.mime?.includes('bpmn')) {

		import(/* webpackChunkName: "bpmn-editor" */ './imports/BPMNEditor').then(({ default: Editor }) => {
			const editor = new Editor(fileInfo);
			console.log('Starting BPMN editor');
			editor.start();
		});


	} else if (fileInfo.mime?.includes('dmn')) {
		import(/* webpackChunkName: "bpmn-editor" */ './imports/DMNEditor').then(({ default: Editor }) => {
			const editor = new Editor(fileInfo);
			console.log('Starting DMN editor');
			editor.start();
		});
	}else if (fileInfo.mime?.includes('cmmn')) {
		import(/* webpackChunkName: "bpmn-editor" */ './imports/CMMNEditor').then(({ default: Editor }) => {
			const editor = new Editor(fileInfo);
			console.log('Starting CMMN editor');
			editor.start();
		});
	}else{
		console.error('MimeType missing');
	}
}




runEditor();