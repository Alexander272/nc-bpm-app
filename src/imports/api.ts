import { generateRemoteUrl, getRootUrl } from '@nextcloud/router';
import axios from '@nextcloud/axios';
import { generateUrl } from '@nextcloud/router';

import { NextcloudFile } from './Editor';
import { showError } from '@nextcloud/dialogs';
import { emit } from '@nextcloud/event-bus';

function getSharingToken(): string {
	// 1. Проверяем, есть ли токен в параметрах URL (когда мы уже внутри редактора)
	const urlParams = new URLSearchParams(window.location.search);
	const tokenFromParam = urlParams.get('sharingToken');
	if (tokenFromParam) {
		return tokenFromParam;
	}

	// 2. Если нет в параметрах, ищем в пути публичной папки (когда мы еще в списке файлов)
	const isPublic = window.location.pathname.indexOf('/s/') !== -1;
	if (isPublic) {
		return window.location.pathname.split('/').pop() || '';
	}

	return '';
}

class Api {
	public async checkPreviewServer(
		serverUrl: string,
	): Promise<'success' | 'invalid-url'> {
		const url = OC.generateUrl('apps/files_bpm_ru/preview/check');
		const response = await axios.post(url, { url: serverUrl });

		return response.data.result;
	}

	// public async getFileContent(path: string, name: string): Promise<string> {
	// 	const fullPath = this.getDownloadPath(path, name);
	// 	const response = await axios.get(fullPath);

	// 	return response.data;
	// }

	public async getFileContent(path: string, fileId: number): Promise<string> {
		if (fileId == 0) {
			showError('File ID is missing!');
		}

		const token = getSharingToken();

		let pathWithParams =
			'/apps/files_bpm_ru/page/getFileContent?fileId=' + fileId;
		if (token) {
			pathWithParams += '&sharingToken=' + token;
		}

		var url = generateUrl(pathWithParams);
		const response = await axios.get(url);
		return response.data;
	}

	public getDownloadPath(path: string, name: string): string {
		path = encodeURI(path);
		name = encodeURIComponent(name);
		if (OCA.Sharing?.PublicApp) {
			return $('#downloadURL').val() as string;
		}

		return generateRemoteUrl(`files${path}/${name}`);
	}

	public async uploadFile(
		path: string,
		name: string,
		data: any,
		etag?: string,
		contentType = 'text/xml',
	) {
		const urlParams = new URLSearchParams(window.location.search);
		const token = urlParams.get('sharingToken') || '';

		// Извлекаем fileId из параметров URL браузера
		const fileId = parseInt(urlParams.get('fileId') || '0', 10);

		// Формируем URL к нашему собственному контроллеру сохранения
		let saveUrl = '/apps/files_bpm_ru/page/saveFile?fileId=' + fileId;
		if (token) {
			saveUrl += '&sharingToken=' + token;
		}

		let response;
		try {
			// Отправляем POST запрос с XML-данными схемы (data)
			response = await axios.post(generateUrl(saveUrl), {
				content: data, // Передаем XML-строку в параметре content
			});
		} catch (error) {
			if (!error.response) {
				console.log(error);
				throw error;
			}
			showError('Problem saving file, please check the console');
			response = error.response;
		}

		return {
			data: response.data,
			statuscode: response.status,
			header: {
				etag: response.headers ? this.parseEtag(response.headers.etag) : '',
			},
		};
	}

	public getUploadBase() {
		// Если передан токен (в скрытом поле или в параметрах URL) — значит мы в публичном режиме
		const hasToken = $('#sharingToken').val() || getSharingToken();

		if (OCA.Sharing?.PublicApp || hasToken) {
			return this.generatePublicUrl('webdav');
		}

		return generateRemoteUrl('webdav');
	}

	public generatePublicUrl(service: string) {
		return (
			window.location.protocol +
			'//' +
			window.location.host +
			getRootUrl() +
			'/public.php/' +
			service
		);
	}

	private parseEtag(etag: string): string {
		if (etag && etag.charAt(0) === '"') {
			return etag.split('"')[1];
		}
		return etag;
	}

	public async getFileInfo(fileId: string): Promise<NextcloudFile> {
		const token = getSharingToken();

		let pathWithParams = '/apps/files_bpm_ru/page/getFileInfo?fileId=' + fileId;
		if (token) {
			pathWithParams += '&sharingToken=' + token;
		}

		var url = generateUrl(pathWithParams);
		const response = await axios.get(url);
		return response.data;
	}
}

const api = new Api();

export default api;
