<?php

declare(strict_types=1);

namespace OCA\FilesBpmRU\Preview;

use OCP\Preview\IProviderV2;

class CMMN extends PreviewServer implements IProviderV2 {
	public function getMimeType(): string {
		return 'application/x-cmmn';
	}
}
