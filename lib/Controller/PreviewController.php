<?php

declare(strict_types=1);

namespace OCA\FilesBpmRU\Controller;

use OCA\FilesBpmRU\AppInfo\Application;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http;
use OCP\AppFramework\Http\DataResponse;
use OCP\IConfig;
use OCP\IRequest;

class PreviewController extends Controller {
	private IConfig $config;

	public function __construct(
		string $appName,
		IRequest $request,
		IConfig $config,
	) {
		parent::__construct($appName, $request);
		$this->config = $config;
	}

	public function check(?string $url) {
		if ($url === null || $url === '') {
			return new DataResponse(['result' => 'invalid-url'], Http::STATUS_BAD_REQUEST);
		}

		$allowedServer = $this->config->getAppValue(Application::APP_ID, 'preview.server', '');

		if ($allowedServer === '') {
			return new DataResponse(['result' => 'no-preview-server-configured'], Http::STATUS_BAD_REQUEST);
		}

		$normalizedUrl = rtrim($url, '/');
		$normalizedAllowed = rtrim($allowedServer, '/');

		if (!str_starts_with($normalizedUrl, $normalizedAllowed)) {
			return new DataResponse(['result' => 'invalid-url'], Http::STATUS_BAD_REQUEST);
		}

		$statusUrl = $normalizedUrl . '/status';

		$context = stream_context_create([
			'http' => [
				'method' => 'GET',
				'timeout' => 5,
				'ignore_errors' => true,
			],
		]);

		$response = @file_get_contents($statusUrl, false, $context);

		if ($response !== false) {
			$data = json_decode($response);

			if ($data !== null && isset($data->status) && $data->status === 'ok') {
				return new DataResponse(['result' => 'success']);
			}
		}

		return new DataResponse(['result' => 'invalid-url'], Http::STATUS_BAD_REQUEST);
	}
}
