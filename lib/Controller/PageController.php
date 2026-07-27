<?php
namespace OCA\FilesBpmRU\Controller;

use OCP\AppFramework\Http\Attribute\PublicPage;
use OCP\IRequest;
use OCP\AppFramework\Http\TemplateResponse;
use OCP\AppFramework\Http\Template\PublicTemplateResponse;
use OCP\AppFramework\Http\DataResponse;
use OCP\AppFramework\Controller;
use OCP\AppFramework\Http\Attribute\NoAdminRequired;
use OCP\IURLGenerator;
use OCP\AppFramework\Http\RedirectResponse;
use OCP\AppFramework\Services\IInitialState;
use OCP\IConfig;
use OCP\Files\IRootFolder;

use OCP\AppFramework\Http;

//use OCP\ILogger;
use Psr\Log\LoggerInterface;

//Thanks to : https://github.com/githubkoma/multiboards/blob/main/js/filesintegration/src/index.js


class PageController extends Controller {
	private $userId;
	private IRootFolder $storage;
	private $logger;
	private $urlGenerator;
	/** @var \OCP\Share\IManager */
	private $shareManager;


	public function __construct($AppName,
					IRequest $request,
					IRootFolder
					$storage,
					$UserId,
					LoggerInterface $logger,
					IURLGenerator $urlGenerator,
					\OCP\Share\IManager $shareManager,
	){
		parent::__construct($AppName, $request);
		$this->userId = $UserId;
		$this->storage = $storage;
		$this->urlGenerator = $urlGenerator;
		$this->shareManager = $shareManager;
	}


	/**
	 * CAUTION: the @Stuff turns off security checks; for this page no admin is
	 *          required and no CSRF check. If you don't know what CSRF is, read
	 *          it up in the docs or you might create a security hole. This is
	 *          basically the only required method to add this exemption, don't
	 *          add it to any other method if you don't exactly know what it does
	 *
	 * @NoAdminRequired
	 * @NoCSRFRequired
	 * @PublicPage
	 */
	#[NoAdminRequired]
	#[PublicPage]
	public function index() {
		// Извлекаем токен из запроса, который мы настроили во фронтенде
		$token = $this->request->getParam('sharingToken', '');

		if ($this->userId == "") {
			// Если пользователя нет, но передан токен публичной ссылки — пускаем гостя!
			if (!empty($token)) {
				// Используем заготовленный автором PublicTemplateResponse для анонимов
				$template = new PublicTemplateResponse($this->appName, 'modeler', []);
				$template->setHeaderTitle('BPMN Files');
				$template->setHeaderDetails("Public View");
				$template->setFooterVisible(false);

				return $template; // <-- Отдаем интерфейс гостю, редирект на логин НЕ происходит!
			}

			// Если токена тоже нет (пользователь просто "с улицы" зашел на роут) — тогда отправляем на логин
			$redirectUrl = $this->urlGenerator->linkToRoute("core.login.showLoginForm", [
				"redirect_url" => $this->request->getRequestUri()
			]);
			return new RedirectResponse($redirectUrl);

		} else {
			// Обычный вход для авторизованного пользователя
			$response = $this->indexLoggedIn();
		}

		return $response;
	}

	/**
	 * CAUTION: the @Stuff turns off security checks; for this page no admin is
	 *          required and no CSRF check. If you don't know what CSRF is, read
	 *          it up in the docs or you might create a security hole. This is
	 *          basically the only required method to add this exemption, don't
	 *          add it to any other method if you don't exactly know what it does
	 *
	 * @NoAdminRequired
	 * @NoCSRFRequired
	 */
	#[NoAdminRequired]
	#[NoCSRFRequired]
	#[PublicPage]

	public function indexLoggedIn() {
		return new TemplateResponse($this->appName, 'modeler');  // templates/index.php
	}

  	/**
     * This is not a comment, it's a setting!
     * @NoAdminRequired
     */
	#[NoAdminRequired]
	private function getFile($fileId, $requireWrite = false) {
		$file = null;

		// 1. Проверка для авторизованных пользователей
		if ($this->userId !== null && $this->userId !== '') {
			try {
				$userFolder = $this->storage->getUserFolder($this->userId);
				$files = $userFolder->getById($fileId);
				if (!empty($files)) {
					$file = $files[0];
				}
			} catch (\OCP\Files\NotFoundException $e) {
				throw new StorageException('File does not exist');
			}
		} else {
			// 2. Проверка для анонимных гостей по публичной ссылке
			$token = $this->request->getParam('sharingToken', '');

			if (!empty($token)) {
				try {
					$share = $this->shareManager->getShareByToken($token);
					
					// --- СТРОГАЯ ПРОВЕРКА ПРАВ НА ЗАПИСЬ ---
					if ($requireWrite) {
						$permissions = $share->getPermissions();
						if (($permissions & \OCP\Constants::PERMISSION_UPDATE) === 0) {
							// Используем базовый класс Exception, чтобы не взрывать ядро Nextcloud
							throw new \Exception('Read-only share. You are not allowed to edit this file.');
						}
					}
					// ----------------------------------------

					$sharedNode = $share->getNode();

					// Если расшарена папка, ищем нужный файл внутри неё по его ID
					if ($sharedNode instanceof \OCP\Files\Folder) {
						$files = $sharedNode->getById($fileId);
						if (!empty($files)) {
							$file = $files[0];
						}
					} 
					// Если расшарен напрямую сам файл, и его ID совпадает
					elseif ($sharedNode instanceof \OCP\Files\File && (int)$sharedNode->getId() === (int)$fileId) {
						$file = $sharedNode;
					}
				} catch (\Exception $e) {
					throw new StorageException($e->getMessage());
				}
			}
		}

		if (!$file) {
			throw new StorageException('File does not exist or access denied');
		}

		// Дополнительная проверка оригинальных прав самого файла
		if ($requireWrite && !$file->isUpdateable()) {
			throw new \Exception('This file itself is not writeable.');
		} elseif (!$file->isReadable()) {
			throw new ForbiddenException();
		}

		if ($file instanceof \OCP\Files\File) {
			return $file;
		} else {
			throw new StorageException('Can not read from folder');
		}
	}


	 /**
     * This is not a comment, it's a setting!
     * @NoAdminRequired
     */
	#[NoAdminRequired]
	#[PublicPage]
	public function getFileInfo($fileId) {
		try
        {
            $file = $this->getFile($fileId);

            if ($file instanceof Folder) {
                return new DataResponse(['message' => 'You can not open a folder'], Http::STATUS_BAD_REQUEST);
            }

            // ПРОВЕРКА: Если зашел анонимный гость (userId пустой)
            if (empty($this->userId)) {
                return new DataResponse(
                    [
                        'id' => $file->getId(),
                        'size' => $file->getSize(),
                        'writeable' => true, // Разрешаем гостю интерактив (при условии прав на общую папку)
                        'mime' => $file->getMimeType(),
                        'path' => '/', // Для гостя корень — это сама общая папка
                        'name' => $file->getName(),
                        'owner' => 'public_share', // Заглушка владельца для гостя
                        'etag' => $file->getEtag(),
                        'mtime' => $file->getMTime(),
                        'created' => $file->getMTime(), // Безопасная заглушка времени
                        'instanceId' => \OC_Util::getInstanceId()
                    ],
                    Http::STATUS_OK
                );
            }

            // ОРИГИНАЛЬНЫЙ КОД ДЛЯ АВТОРИЗОВАННЫХ ПОЛЬЗОВАТЕЛЕЙ
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
                    'owner' => $file->getOwner()->getUID(),
                    'etag' => $file->getEtag(),
                    'mtime' => $file->getMTime(),
                    'created' => $file->getCreationTime() + $file->getUploadTime(),
                    'instanceId' => \OC_Util::getInstanceId()
                ],
                Http::STATUS_OK
            );
        }
        catch (\Exception $e) {
			$message ='An internal server error occurred.';
			return new DataResponse(['message' => $message], Http::STATUS_INTERNAL_SERVER_ERROR);
		}
    }

	/**
     * This is not a comment, it's a setting!
     * @NoAdminRequired
     */
	#[NoAdminRequired]
	#[PublicPage]
	public function getFileContent($fileId){
		try
        {
            $file = $this->getFile($fileId);

            if ($file instanceof Folder) {
                return new DataResponse(['message' => 'You can not open a folder'], Http::STATUS_BAD_REQUEST);
            }

			// Просто отдаем XML-код схемы. Метод getContent() у объекта File 
			// прекрасно работает для публичных нод, без вызова NoUserException.
			$content = $file->getContent();
			return new DataResponse($content, Http::STATUS_OK);
        }
        catch (\Exception $e) {
			$message ='An internal server error occurred.';
			return new DataResponse(['message' => $message], Http::STATUS_INTERNAL_SERVER_ERROR);
		}
	}

  /**
     * This is not a comment, it's a setting!
     * @NoAdminRequired
     */
	#[NoAdminRequired]
	#[PublicPage]
	public function testDummy($fileId){
		$message = 'This is only a test. File ID: ';
		return new DataResponse(['message'=> $message], 418);
	}

	/**
	 * @NoAdminRequired
	 * @NoCSRFRequired
	 */
	#[NoAdminRequired]
	#[NoCSRFRequired]
	#[PublicPage]
	public function saveFile($fileId, $content) {
		try {
			$file = $this->getFile($fileId, true);
			$file->putContent($content);

			return new DataResponse(['status' => 'success'], Http::STATUS_OK);
		} catch (\Exception $e) {
			// Возвращаем текст ошибки и статус 403 Forbidden без падения сервера в 500
			return new DataResponse(['message' => $e->getMessage()], 403);
		}
	}
}