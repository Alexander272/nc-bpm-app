// src/imports/translate/customTranslate.ts
import translations from './ru';

export default function customTranslate(
	template: string,
	replacements: Record<string, string> = {},
): string {
	// Ищем перевод, если нет — оставляем исходный текст
	let translated =
		translations[template as keyof typeof translations] || template;
	// Заменяем плейсхолдеры вида {key}
	return translated.replace(
		/{([^}]+)}/g,
		(_, key) => replacements[key] || `{${key}}`,
	);
}
