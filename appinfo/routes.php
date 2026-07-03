<?php

return [
	'resources' => [],
	'routes' => [
		['name' => 'preview#check', 'url' => '/preview/check', 'verb' => 'POST'],
		['name' => 'page#index', 'url' => '/', 'verb' => 'GET'],
		["name" => "page#getFileInfo", "url" => "/page/getFileInfo", "verb" => "GET"],
		["name" => "page#getFileContent", "url" => "/page/getFileContent", "verb" => "GET"],
		["name" => "page#saveFile", "url" => "/page/saveFile", "verb" => "POST"],
	]
];