<?php

namespace OCA\FilesBpmRU\AppInfo;

use OCA\Files\Event\LoadAdditionalScriptsEvent;
use OCA\Files_Sharing\Event\BeforeTemplateRenderedEvent;
use OCA\FilesBpmRU\Listener\LoadAdditionalScriptsListener;
use OCA\FilesBpmRU\Preview\BPMN;
use OCA\FilesBpmRU\Preview\DMN;
use OCP\AppFramework\App;
use OCP\AppFramework\Bootstrap\IBootContext;
use OCP\AppFramework\Bootstrap\IBootstrap;
use OCP\AppFramework\Bootstrap\IRegistrationContext;
use OCP\IPreview;

class Application extends App implements IBootstrap {
	public const APP_ID = 'files_bpm_ru';

	/**
	 * @param array $params
	 */
	public function __construct(array $params = []) {
		parent::__construct(self::APP_ID, $params);
	}

	public function register(IRegistrationContext $context): void {
		$context->registerEventListener(LoadAdditionalScriptsEvent::class, LoadAdditionalScriptsListener::class);
		$context->registerEventListener(BeforeTemplateRenderedEvent::class, LoadAdditionalScriptsListener::class);
	}

	public function boot(IBootContext $context): void {
		$context->injectFn(function (IPreview $previewManager, BPMN $bpmn, DMN $dmn) {
			$previewManager->registerProvider('/application\/x-bpmn/', function () use ($bpmn) {
				return $bpmn;
			});

			$previewManager->registerProvider('/application\/x-dmn/', function () use ($dmn) {
				return $dmn;
			});
		});
	}
}
