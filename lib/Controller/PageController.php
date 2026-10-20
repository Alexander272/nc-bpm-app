<?php

declare(strict_types=1);

namespace OCA\FilesBpmRU\Controller;

use OCP\AppFramework\Controller;
use OCP\AppFramework\Http;
use OCP\AppFramework\Http\DataResponse;
use OCP\AppFramework\Http\RedirectResponse;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\AppFramework\Http\Template\PublicTemplateResponse;
use OCP\AppFramework\Http\Attribute\NoAdminRequired;
use OCP\AppFramework\Http\Attribute\NoCSRFRequired;
use OCP\AppFramework\Http\Attribute\PublicPage;
use OCP\IConfig;
use OCP\IL10N;
use OCP\IRequest;
use OCP\IURLGenerator;
use OCP\Files\IRootFolder;
use Psr\Log\LoggerInterface;

class PageController extends Controller {
	private string $userId;
	private IRootFolder $storage;
	private LoggerInterface $logger;
	private IURLGenerator $urlGenerator;
	private \OCP\Share\IManager $shareManager;
	private IL10N $l10n;

	private IConfig $config;

	public function __construct(
		string $AppName,
		IRequest $request,
		IRootFolder $storage,
		?string $userId,
		LoggerInterface $logger,
		IURLGenerator $urlGenerator,
		\OCP\Share\IManager $shareManager,
		IL10N $l10n,
		IConfig $config,
	) {
		parent::__construct($AppName, $request);
		$this->userId = $userId ?? '';
		$this->storage = $storage;
		$this->logger = $logger;
		$this->urlGenerator = $urlGenerator;
		$this->shareManager = $shareManager;
		$this->l10n = $l10n;
		$this->config = $config;
	}

	#[NoAdminRequired]
	#[NoCSRFRequired]
	#[PublicPage]
	public function index() {
		$token = $this->request->getParam('sharingToken', '');

		if ($this->userId === '') {
			if (!empty($token)) {
				$template = new PublicTemplateResponse($this->appName, 'modeler', []);
				$template->setHeaderTitle($this->l10n->t('BPMN Файлы'));
				$template->setHeaderDetails($this->l10n->t('Публичный просмотр'));
				$template->setFooterVisible(false);

				return $template;
			}

			$redirectUrl = $this->urlGenerator->linkToRoute('core.login.showLoginForm', [
				'redirect_url' => $this->request->getRequestUri(),
			]);
			return new RedirectResponse($redirectUrl);
		}

		return $this->indexLoggedIn();
	}

	#[NoAdminRequired]
	public function indexLoggedIn() {
		return new TemplateResponse($this->appName, 'modeler');
	}

	#[NoAdminRequired]
	#[NoCSRFRequired]
	#[PublicPage]
	public function getFileInfo($fileId) {
		try {
			$file = $this->getFile((int)$fileId);

			if ($file instanceof \OCP\Files\Folder) {
				return new DataResponse(['message' => 'You can not open a folder'], Http::STATUS_BAD_REQUEST);
			}

			if ($this->userId === '') {
				$share = $this->getShareForGuest();
				$permissions = $share->getPermissions();
				$isWriteable = ($permissions & \OCP\Constants::PERMISSION_UPDATE) !== 0;

				return new DataResponse(
					[
						'id' => $file->getId(),
						'size' => $file->getSize(),
						'writeable' => $isWriteable,
						'mime' => $file->getMimeType(),
						'path' => '/',
						'name' => $file->getName(),
						'owner' => 'public_share',
						'etag' => $file->getEtag(),
						'mtime' => $file->getMTime(),
						'created' => $file->getCreationTime(),
						'instanceId' => $this->config->getSystemValue('instanceid', ''),
					],
					Http::STATUS_OK
				);
			}

			$baseFolder = $this->storage->getUserFolder($this->userId);
			$relativePath = dirname($baseFolder->getRelativePath($file->getPath()));

			return new DataResponse(
				[
					'id' => $file->getId(),
					'size' => $file->getSize(),
					'writeable' => $file->isUpdateable(),
					'mime' => $file->getMimeType(),
					'path' => $relativePath,
					'name' => $file->getName(),
					'owner' => $file->getOwner()?->getUID() ?? 'unknown',
					'etag' => $file->getEtag(),
					'mtime' => $file->getMTime(),
					'created' => $file->getCreationTime(),
					'instanceId' => $this->config->getSystemValue('instanceid', ''),
				],
				Http::STATUS_OK
			);
		} catch (\Exception $e) {
			$this->logger->error('Error getting file info: ' . $e->getMessage());
			return new DataResponse(['message' => 'An internal server error occurred.'], Http::STATUS_INTERNAL_SERVER_ERROR);
		}
	}

	#[NoAdminRequired]
	#[NoCSRFRequired]
	#[PublicPage]
	public function getFileContent($fileId) {
		try {
			$file = $this->getFile((int)$fileId);

			if ($file instanceof \OCP\Files\Folder) {
				return new DataResponse(['message' => 'You can not open a folder'], Http::STATUS_BAD_REQUEST);
			}

			$content = $file->getContent();
			return new DataResponse($content, Http::STATUS_OK);
		} catch (\Exception $e) {
			$this->logger->error('Error getting file content: ' . $e->getMessage());
			return new DataResponse(['message' => 'An internal server error occurred.'], Http::STATUS_INTERNAL_SERVER_ERROR);
		}
	}

	#[NoAdminRequired]
	#[NoCSRFRequired]
	#[PublicPage]
	public function saveFile() {
		$fileId = (int)$this->request->getParam('fileId', '0');
		$body = file_get_contents('php://input');
		$data = json_decode($body, true) ?: [];
		$content = $data['content'] ?? '';
		$path = $data['path'] ?? '/';
		$name = $data['name'] ?? '';

		try {
			if ($fileId > 0) {
				$file = $this->getFile($fileId, true);
				$file->putContent($content);
			} else {
				$file = $this->createFile($path, $name, $content);
			}

			return new DataResponse([
				'status' => 'success',
				'id' => $file->getId(),
			], Http::STATUS_OK);
		} catch (\Exception $e) {
			$this->logger->warning('Error saving file: ' . $e->getMessage());
			return new DataResponse(['message' => $e->getMessage()], Http::STATUS_FORBIDDEN);
		}
	}

	/**
	 * @throws \RuntimeException
	 */
	private function createFile(string $path, string $name, string $content): \OCP\Files\File {
		if ($this->userId === '') {
			throw new \RuntimeException('Authentication required to create files');
		}

		if (empty($name)) {
			throw new \RuntimeException('File name is required');
		}

		$userFolder = $this->storage->getUserFolder($this->userId);

		if ($path === '/' || $path === '') {
			$folder = $userFolder;
		} else {
			try {
				$folder = $userFolder->get($path);
			} catch (\Exception $e) {
				throw new \RuntimeException('Target folder does not exist');
			}
		}

		if (!($folder instanceof \OCP\Files\Folder)) {
			throw new \RuntimeException('Target path is not a folder');
		}

		if (!$folder->isCreatable()) {
			throw new \RuntimeException('You do not have permission to create files here');
		}

		$file = $folder->newFile($name, $content);

		return $file;
	}

	/**
	 * @throws \RuntimeException
	 */
	private function getFile(int $fileId, bool $requireWrite = false): \OCP\Files\File {
		$file = null;

		if ($this->userId !== '') {
			try {
				$userFolder = $this->storage->getUserFolder($this->userId);
				$files = $userFolder->getById($fileId);
				if (!empty($files)) {
					$file = $files[0];
				}
			} catch (\OCP\Files\NotFoundException $e) {
				throw new \RuntimeException('File does not exist');
			}
		} else {
			$token = $this->request->getParam('sharingToken', '');

			if (!empty($token)) {
				try {
					$share = $this->shareManager->getShareByToken($token);

					if ($requireWrite) {
						$permissions = $share->getPermissions();
						if (($permissions & \OCP\Constants::PERMISSION_UPDATE) === 0) {
							throw new \RuntimeException('Read-only share. You are not allowed to edit this file.');
						}
					}

					$sharedNode = $share->getNode();

					if ($sharedNode instanceof \OCP\Files\Folder) {
						$files = $sharedNode->getById($fileId);
						if (!empty($files)) {
							$file = $files[0];
						}
					} elseif ($sharedNode instanceof \OCP\Files\File && (int)$sharedNode->getId() === $fileId) {
						$file = $sharedNode;
					}
				} catch (\RuntimeException $e) {
					throw $e;
				} catch (\Exception $e) {
					throw new \RuntimeException('Access denied');
				}
			}
		}

		if (!$file) {
			throw new \RuntimeException('File does not exist or access denied');
		}

		if ($requireWrite && !$file->isUpdateable()) {
			throw new \RuntimeException('This file is not writeable.');
		}

		if (!$file->isReadable()) {
			throw new \RuntimeException('This file is not readable.');
		}

		if ($file instanceof \OCP\Files\File) {
			return $file;
		}

		throw new \RuntimeException('Can not read from folder');
	}

	/**
	 * @return \OCP\Share\IShare
	 * @throws \RuntimeException
	 */
	private function getShareForGuest(): \OCP\Share\IShare {
		$token = $this->request->getParam('sharingToken', '');

		if (empty($token)) {
			throw new \RuntimeException('No share token provided');
		}

		return $this->shareManager->getShareByToken($token);
	}
}
