import { generateRemoteUrl, getRootUrl } from '@nextcloud/router';
import axios from '@nextcloud/axios';
import { generateUrl } from '@nextcloud/router';
import { translate as t } from '@nextcloud/l10n';

import { NextcloudFile } from './Editor';
import { showError } from '@nextcloud/dialogs';

function getSharingToken(): string {
	const urlParams = new URLSearchParams(window.location.search);
	const tokenFromParam = urlParams.get('sharingToken');
	if (tokenFromParam) {
		return tokenFromParam;
	}

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

	public async getFileContent(_path: string, fileId: number): Promise<string> {
		if (fileId == 0) {
			throw new Error(t('files_bpm_ru', 'ID файла не указан'));
		}

		const token = getSharingToken();

		let pathWithParams =
			'/apps/files_bpm_ru/page/getFileContent?fileId=' + fileId;
		if (token) {
			pathWithParams += '&sharingToken=' + token;
		}

		const url = generateUrl(pathWithParams);
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
		const fileId = parseInt(urlParams.get('fileId') || '0', 10);

		let saveUrl = '/apps/files_bpm_ru/page/saveFile?fileId=' + fileId;
		if (token) {
			saveUrl += '&sharingToken=' + token;
		}

		let response;
		try {
			response = await axios.post(generateUrl(saveUrl), {
				content: data,
				path: path,
				name: name,
			});
		} catch (error) {
			if (!error.response) {
				throw error;
			}
			showError(t('files_bpm_ru', 'Ошибка сохранения файла'));
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

		const url = generateUrl(pathWithParams);
		const response = await axios.get(url);
		return response.data;
	}
}

const api = new Api();

export default api;
