<?php

declare(strict_types=1);

namespace OCA\FilesBpmRU\Preview;

use OCA\FilesBpmRU\AppInfo\Application;
use OCP\Files\File;
use OCP\Files\FileInfo;
use OCP\Http\Client\IClientService;
use OCP\IConfig;
use OCP\IImage;
use OCP\Preview\IProviderV2;
use Psr\Log\LoggerInterface;

abstract class PreviewServer implements IProviderV2 {
	protected IConfig $config;
	protected LoggerInterface $logger;
	protected IClientService $clientService;

	public function __construct(IConfig $config, LoggerInterface $logger, IClientService $clientService) {
		$this->config = $config;
		$this->logger = $logger;
		$this->clientService = $clientService;
	}

	abstract public function getMimeType(): string;

	public function isAvailable(FileInfo $file): bool {
		return $this->getPreviewServerUrl() !== '';
	}

	public function getThumbnail(File $file, int $maxX, int $maxY): ?IImage {
		$url = $this->getPreviewServerUrl();

		if ($url === '') {
			return null;
		}

		try {
			$preview = $this->requestPreview($url, $file->getContent());
		} catch (\Exception $exception) {
			$this->logger->warning('Could not get image from preview server', ['exception' => $exception]);
			return null;
		}

		$image = new \OCP\Image();
		$image->loadFromData($preview);
		$image->fixOrientation();

		if ($image->valid()) {
			$image->scaleDownToFit($maxX, $maxY);

			return $image;
		}

		return null;
	}

	protected function requestPreview(string $url, string $content): string {
		$client = $this->clientService->newClient();

		$response = $client->post($url, [
			'headers' => [
				'Content-Type' => $this->getMimeType(),
				'Accept' => 'image/png',
			],
			'body' => $content,
			'timeout' => 30,
		]);

		$body = $response->getBody();

		if ($body === null || $body === '') {
			throw new \Exception('Got invalid response');
		}

		return $body;
	}

	protected function getPreviewServerUrl(): string {
		$server = $this->config->getAppValue(Application::APP_ID, 'preview.server', '');

		return $server !== '' ? rtrim($server, '/') . '/preview' : '';
	}
}
