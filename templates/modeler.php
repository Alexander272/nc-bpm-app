<?php
declare(strict_types=1);
use OCP\Util;

// SPDX-FileCopyrightText: Kirsten Hauck <kirstenhauck@proton.me>
// SPDX-License-Identifier: AGPL-3.0-or-later
  $appId = OCA\FilesBpmRU\AppInfo\Application::APP_ID;
  
  Util::addScript($appId, 'main');
?>
<div id="app-content">
<div id="canvas" class="bpmn-canvas">
  
</div>

</div>
