import { translate as t } from '@nextcloud/l10n';
import './imports/bootstrap';
import api from './imports/api';
import { showError } from '@nextcloud/dialogs';
import '@nextcloud/dialogs/style.css';

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';
import 'bpmn-js/dist/assets/bpmn-js.css';

import '@fortawesome/fontawesome-free/js/all.js';
import '@fortawesome/fontawesome-free/js/solid.js';

import './imports/Editor.scss';
import './imports/BPMNEditor';
import './imports/DMNEditor';
import './imports/CMMNEditor';
import './imports/Editor';

import type { IFileAction } from '@nextcloud/files';
import {
	addNewFileMenuEntry,
	DefaultType,
	registerFileAction,
} from '@nextcloud/files';
import './filelist.scss';

const bpmnicon = require('../img/icon-filetypes_bpmn.svg');
const dmnicon = require('../img/icon-filetypes_dmn.svg');
const cmmnicon = require('../img/icon-filetypes_cmmn.svg');

function fixFileIconForFileShare() {
	const dir = $('#dir').val();
	const mime = $('#mimetype').val();

	if (!dir && mime === 'application/x-bpmn') {
		$('#mimetypeIcon').val(bpmnicon); //OC.imagePath('files_bpm_ru', 'icon-filetypes_bpmn.svg'));
	}

	if (!dir && mime === 'application/x-dmn') {
		$('#mimetypeIcon').val(dmnicon); //OC.imagePath('files_bpm_ru', 'icon-filetypes_dmn.svg'));
	}

	if (!dir && mime === 'application/x-cmmn') {
		$('#mimetypeIcon').val(cmmnicon); //OC.imagePath('files_bpm_ru', 'icon-filetypes_dmn.svg'));
	}
}

function registerFileIcon() {
	if (OC?.MimeType?._mimeTypeIcons) {
		OC.MimeType._mimeTypeIcons['application/x-bpmn'] = OC.imagePath(
			'files_bpm_ru',
			'icon-filetypes_bpmn.svg',
		);
		OC.MimeType._mimeTypeIcons['application/x-dmn'] = OC.imagePath(
			'files_bpm_ru',
			'icon-filetypes_dmn.svg',
		);
		OC.MimeType._mimeTypeIcons['application/x-cmmn'] = OC.imagePath(
			'files_bpm_ru',
			'icon-filetypes_cmmn.svg',
		);
	}
}

//action when "New BPMN File" or "New DMN File"
async function createDiagram(folder: { path: string }, ext: string) {
	//const content = await this.getContent();
	const path = folder.path;
	const filename =
		'New-' +
		ext.toUpperCase() +
		'-file-' +
		new Date().getTime().toString() +
		'.' +
		ext;
	try {
		const result = await api.uploadFile(path, filename, '');

		if (result.statuscode >= 200 && result.statuscode <= 299) {
			return true;
		}
	} catch (e) {
		showError(t('files_bpm_ru', 'Ошибка создания нового файла'));
		return false;
	}
}

//NB: Nextcloud changed the file API in version 28, so the previous filemenu actions are no longer compatible
if (parseInt(OC.config.version.substring(0, 2)) >= 28) {
	//Thanks to : https://github.com/githubkoma/multiboards/blob/main/js/filesintegration/src/index.js
	const Mimes = {
		bpmn: {
			mime: 'application/x-bpmn',
			type: 'text',
			css: 'icon-filetype-bpmn',
			icon: bpmnicon, //'../img/icon-filetypes_bpmn.svg',
			newStr: t('files_bpm_ru', 'Новый BPMN файл'),
		},
		dmn: {
			mime: 'application/x-dmn',
			type: 'text',
			css: 'icon-filetype-dmn',
			icon: dmnicon, //OC.imagePath('files_bpm_ru', 'icon-filetypes_bpmn.svg'),
			newStr: t('files_bpm_ru', 'Новый DMN файл'),
		},
		cmmn: {
			mime: 'application/x-cmmn',
			type: 'text',
			css: 'icon-filetype-cmmn',
			icon: cmmnicon, //OC.imagePath('files_bpm_ru', 'icon-filetypes_bpmn.svg'),
			newStr: t('files_bpm_ru', 'Новый CMMN файл'),
		},
	};
	registerFileIcon();

	function registerAction(ext, attr) {
		const action: IFileAction = {
			id: ext,
			displayName() {
				return t('files_bpm_ru', 'Открыть в {ext} редакторе', { ext: ext.toUpperCase() });
			},
			enabled({ nodes }) {
				// Проверяем, это публичная ссылка (гость) или обычный вход
				const isPublic = window.location.pathname.indexOf('/s/') !== -1;

				// Если гость, мы игнорируем проверку OC.PERMISSION_READ (так как у гостя нет объекта OC.PERMISSION)
				if (isPublic) {
					return nodes.length === 1 && attr.mime === nodes[0].mime;
				}

				// Оригинальное правило для авторизованных пользователей
				return (
					nodes.length === 1 &&
					attr.mime === nodes[0].mime &&
					(nodes[0].permissions & OC.PERMISSION_READ) !== 0
				);
			},
			iconSvgInline: () => attr.icon,
			async exec(context) {
				const file = context.nodes[0] || undefined;
				if (!file) {
					return false;
				}

				const dirName = file.dirname;

				// Проверяем контекст публичной ссылки
				const isPublic = window.location.pathname.indexOf('/s/') !== -1;

				if (isPublic) {
					// Вытаскиваем токен публичной ссылки из текущего URL браузера
					const token = window.location.pathname.split('/').pop() || '';

					// Генерируем правильный роут в корень плагина (согласно 'url' => '/')
					window.location.href = OC.generateUrl(
						'/apps/files_bpm_ru/?fileId=' +
							file.fileid +
							'&sharingToken=' +
							token,
					);
				} else {
					// Оригинальный редирект для авторизованных пользователей
					window.location.href = OC.generateUrl(
						'/apps/' +
							'files_bpm_ru/?' +
							'dir=' +
							dirName +
							'&fileId=' +
							file.fileid,
					);
				}
				return true;
			},
			default: DefaultType.HIDDEN,
		};

		registerFileAction(action);
	}

	function addMenuEntry(ext, attr) {
		addNewFileMenuEntry({
			id: ext,
			displayName: attr.newStr,
			iconSvgInline: attr.icon,
			async handler(folder) {
				//Generate new BPMN/DMN diagram
				if (!window.OC.getCurrentUser().uid) {
					alert(t('files_bpm_ru', 'Не реализовано'));
				} else {
				try {
					const returnValue = await createDiagram(folder, ext);
					if (returnValue) {
						location.reload();
					}
					return true;
				} catch (e) {
					return false;
				}
				}
			},
		});
	}

	for (const ext in Mimes) {
		registerAction(ext, Mimes[ext]);

		addMenuEntry(ext, Mimes[ext]);
	}
} else {
	// Nextcloud versions lower than 28
	function startBPMNEditor(file, fileList) {
		import(/* webpackChunkName: "bpmn-editor" */ './imports/BPMNEditor').then(
			({ default: Editor }) => {
				const editor = new Editor(file, fileList);
				editor.start();
			},
		);
	}

	function startDMNEditor(file, fileList) {
		import(/* webpackChunkName: "dmn-editor" */ './imports/DMNEditor').then(
			({ default: Editor }) => {
				const editor = new Editor(file, fileList);
				editor.start();
			},
		);
	}
	function startCMMNEditor(file, fileList) {
		import(/* webpackChunkName: "cmmn-editor" */ './imports/CMMNEditor').then(
			({ default: Editor }) => {
				const editor = new Editor(file, fileList);
				editor.start();
			},
		);
	}

	const BpmFileMenuPlugin = {
		attach: function (menu) {
			menu.addMenuEntry({
				id: 'bpmn',
				displayName: t('files_bpm_ru', 'Новая BPMN диаграмма'),
				templateName: 'diagram.bpmn',
				iconClass: 'icon-filetype-bpmn',
				fileType: 'file',
				actionHandler(fileName: string) {
					const fileList = menu.fileList;
					const file = {
						name: fileName,
						path: fileList.getCurrentDirectory(),
						permissions: OC.PERMISSION_CREATE | OC.PERMISSION_UPDATE,
					};

					startBPMNEditor(file, fileList);
				},
			});

			menu.addMenuEntry({
				id: 'dmn',
				displayName: t('files_bpm_ru', 'Новая DMN диаграмма'),
				templateName: 'diagram.dmn',
				iconClass: 'icon-filetype-dmn',
				fileType: 'file',
				actionHandler(fileName: string) {
					const fileList = menu.fileList;

					const file = {
						name: fileName,
						path: fileList.getCurrentDirectory(),
						permissions: OC.PERMISSION_CREATE | OC.PERMISSION_UPDATE,
					};

					startDMNEditor(file, fileList);
				},
			});

			menu.addMenuEntry({
				id: 'cmmn',
				displayName: t('files_bpm_ru', 'Новая CMMN диаграмма'),
				templateName: 'diagram.cmmn',
				iconClass: 'icon-filetype-cmmn',
				fileType: 'file',
				actionHandler(fileName: string) {
					const fileList = menu.fileList;

					const file = {
						name: fileName,
						path: fileList.getCurrentDirectory(),
						permissions: OC.PERMISSION_CREATE | OC.PERMISSION_UPDATE,
					};

					startCMMNEditor(file, fileList);
				},
			});
		},
	};

	OC.Plugins.register('OCA.Files.NewFileMenu', BpmFileMenuPlugin);

	const BpmFileListPlugin = {
		ignoreLists: ['trashbin'],

		attach(fileList) {
			registerFileIcon();

			if (this.ignoreLists.includes(fileList.id)) {
				return;
			}

			fileList.fileActions.registerAction({
				name: 'bpmn',
				displayName: t('files_bpm_ru', 'BPMN диаграмма'),
				mime: 'application/x-bpmn',
				icon: OC.imagePath('files_bpm_ru', 'icon-filetypes_bpmn.svg'),
				permissions: OC.PERMISSION_READ,
				actionHandler(fileName: string, context) {
					// --- ДОБАВЬТЕ ЭТИ ДВЕ СТРОКИ СЮДА ---
					if (context && context.event) {
						context.event.preventDefault(); // Останавливает дефолтное действие Nextcloud
						context.event.stopPropagation(); // Не дает событию подняться к Sidebar
					}
					// ------------------------------------

					// 1. Пытаемся получить fileList из контекста, либо из глобального объекта (с учетом публичной зоны)
					let fileList = context.fileList;
					if (!fileList) {
						if (window.OCA && window.OCA.Files && window.OCA.Files.App) {
							fileList = window.OCA.Files.App.fileList;
						} else if (
							window.OCA &&
							window.OCA.Files &&
							(window.OCA.Files as any).Public
						) {
							fileList = (window.OCA.Files as any).Public;
						}
					}

					// 2. Безопасно парсим данные файла
					let file: any = null;
					if (fileList && typeof fileList.elementToFile === 'function') {
						file = fileList.elementToFile(context.$file);
					} else {
						// Если стандартный метод недоступен, собираем минимальный объект файла из data-атрибутов HTML DOM
						file = {
							id: parseInt(context.$file.attr('data-id') || '0', 10),
							name: fileName,
							path: context.$file.attr('data-path') || '/',
						};
					}

					// 3. Запускаем редактор
					startBPMNEditor(file, fileList);
				},
			});

			fileList.fileActions.setDefault('application/x-bpmn', 'bpmn');

			fileList.fileActions.registerAction({
				name: 'dmn',
				displayName: t('files_bpm_ru', 'DMN диаграмма'),
				mime: 'application/x-dmn',
				icon: OC.imagePath('files_bpm_ru', 'icon-filetypes_dmn.svg'),
				permissions: OC.PERMISSION_READ,
				actionHandler(fileName: string, context) {
					// --- ДОБАВЬТЕ ЭТИ ДВЕ СТРОКИ СЮДА ---
					if (context && context.event) {
						context.event.preventDefault(); // Останавливает дефолтное действие Nextcloud
						context.event.stopPropagation(); // Не дает событию подняться к Sidebar
					}
					// ------------------------------------

					// 1. Безопасно определяем fileList (поддерживает и обычный вход, и публичную ссылку)
					let fileList = context.fileList;
					if (!fileList) {
						if (window.OCA && window.OCA.Files && window.OCA.Files.App) {
							fileList = window.OCA.Files.App.fileList;
						} else if (
							window.OCA &&
							window.OCA.Files &&
							(window.OCA.Files as any).Public
						) {
							fileList = (window.OCA.Files as any).Public;
						}
					}

					// 2. Извлекаем данные файла
					let file: any = null;
					if (fileList && typeof fileList.elementToFile === 'function') {
						file = fileList.elementToFile(context.$file);
					} else {
						file = {
							id: parseInt(context.$file.attr('data-id') || '0', 10),
							name: fileName,
							path: context.$file.attr('data-path') || '/',
						};
					}

					// 3. Запускаем DMN-редактор
					startDMNEditor(file, fileList);
				},
			});

			fileList.fileActions.setDefault('application/x-dmn', 'dmn');

			fileList.fileActions.registerAction({
				name: 'cmmn',
				displayName: t('files_bpm_ru', 'CMMN диаграмма'),
				mime: 'application/x-cmmn',
				icon: OC.imagePath('files_bpm_ru', 'icon-filetypes_cmmn.svg'),
				permissions: OC.PERMISSION_READ,
				actionHandler(fileName: string, context) {
					// --- ДОБАВЬТЕ ЭТИ ДВЕ СТРОКИ СЮДА ---
					if (context && context.event) {
						context.event.preventDefault(); // Останавливает дефолтное действие Nextcloud
						context.event.stopPropagation(); // Не дает событию подняться к Sidebar
					}
					// ------------------------------------

					// Безопасное определение fileList для гостей и пользователей
					let fileList = context.fileList;
					if (!fileList) {
						if (window.OCA && window.OCA.Files && window.OCA.Files.App) {
							fileList = window.OCA.Files.App.fileList;
						} else if (
							window.OCA &&
							window.OCA.Files &&
							(window.OCA.Files as any).Public
						) {
							fileList = (window.OCA.Files as any).Public;
						}
					}

					let file: any = null;
					if (fileList && typeof fileList.elementToFile === 'function') {
						file = fileList.elementToFile(context.$file);
					} else {
						file = {
							id: parseInt(context.$file.attr('data-id') || '0', 10),
							name: fileName,
							path: context.$file.attr('data-path') || '/',
						};
					}

				startCMMNEditor(file, fileList);
			},
		});

		fileList.fileActions.setDefault('application/x-cmmn', 'cmmn');
		},
	};

	// 1. Стандартная регистрация плагина для обычных пользователей
	OC.Plugins.register('OCA.Files.FileList', BpmFileListPlugin);

	// 2. ИСПРАВЛЕННЫЙ БЕЗОПАСНЫЙ БЛОК ДЛЯ ГОСТЕЙ (Обходим TypeScript через строки)
	const globalOCA = window.OCA as any;
	if (
		globalOCA &&
		globalOCA.Files &&
		globalOCA.Files['Public'] &&
		globalOCA.Files['Public'].fileActions
	) {
		const publicFileList = {
			id: 'public',
			fileActions: globalOCA.Files['Public'].fileActions,
		};
		// Принудительно вызываем метод attach для гостевого контекста
		BpmFileListPlugin.attach(publicFileList as any);
	}
}
