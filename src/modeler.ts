import './imports/bootstrap';
import { translate as t } from '@nextcloud/l10n';

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
import { showError } from '@nextcloud/dialogs';

const urlParams = new URL(window.location.href).searchParams;
let fileId = urlParams.get('fileId') ?? '';
let dirName = urlParams.get('dir') ?? '/';
let extension = urlParams.get('ext') ?? 'bpmn';

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

	if (fileInfo.mime?.includes('bpmn')) {
		import(/* webpackChunkName: "bpmn-editor" */ './imports/BPMNEditor').then(({ default: Editor }) => {
			const editor = new Editor(fileInfo);
			editor.start();
		});
	} else if (fileInfo.mime?.includes('dmn')) {
		import(/* webpackChunkName: "dmn-editor" */ './imports/DMNEditor').then(({ default: Editor }) => {
			const editor = new Editor(fileInfo);
			editor.start();
		});
	} else if (fileInfo.mime?.includes('cmmn')) {
		import(/* webpackChunkName: "cmmn-editor" */ './imports/CMMNEditor').then(({ default: Editor }) => {
			const editor = new Editor(fileInfo);
			editor.start();
		});
	}
}

runEditor().catch(() => {
	showError(t('files_bpm_ru', 'Не удалось загрузить диаграмму'));
});
