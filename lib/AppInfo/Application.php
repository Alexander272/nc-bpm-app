<?php

declare(strict_types=1);

namespace OCA\FilesBpmRU\AppInfo;

use OCA\Files\Event\LoadAdditionalScriptsEvent;
use OCA\Files_Sharing\Event\BeforeTemplateRenderedEvent;
use OCA\FilesBpmRU\Listener\LoadAdditionalScriptsListener;
use OCA\FilesBpmRU\Preview\BPMN;
use OCA\FilesBpmRU\Preview\CMMN;
use OCA\FilesBpmRU\Preview\DMN;
use OCP\AppFramework\App;
use OCP\AppFramework\Bootstrap\IBootContext;
use OCP\AppFramework\Bootstrap\IBootstrap;
use OCP\AppFramework\Bootstrap\IRegistrationContext;

class Application extends App implements IBootstrap {
	public const APP_ID = 'files_bpm_ru';

	/**
	 * @param array $params
	 */
	public function __construct(array $params = []) {
		parent::__construct(self::APP_ID, $params);
	}

	public function register(IRegistrationContext $context): void {
		// registerPreviewProvider() is the supported API since Nextcloud 23.0.0 and is
		// the only one available since Nextcloud 35 (IPreview::registerProvider was removed).
		$context->registerPreviewProvider(BPMN::class, '/application\/x-bpmn/');
		$context->registerPreviewProvider(DMN::class, '/application\/x-dmn/');
		$context->registerPreviewProvider(CMMN::class, '/application\/x-cmmn/');

		$context->registerEventListener(LoadAdditionalScriptsEvent::class, LoadAdditionalScriptsListener::class);
		$context->registerEventListener(BeforeTemplateRenderedEvent::class, LoadAdditionalScriptsListener::class);
	}

	public function boot(IBootContext $context): void {
	}
}
