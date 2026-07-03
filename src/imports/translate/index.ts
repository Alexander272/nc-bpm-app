// src/imports/translate/index.ts
import customTranslate from './translate';

export default {
	__init__: ['translate'],
	translate: ['value', customTranslate],
};
