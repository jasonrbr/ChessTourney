export function textFromForm(form: FormData, name: string, fallback = '') {
	return String(form.get(name) ?? fallback).trim();
}

export function nullableTextFromForm(form: FormData, name: string) {
	return textFromForm(form, name) || null;
}

export function dateFromInput(value: string) {
	return new Date(`${value}T00:00:00`);
}

export function optionalIntFromForm(value: FormDataEntryValue | null) {
	const text = String(value ?? '').trim();
	if (!text) return null;

	const number = Number(text);
	return Number.isInteger(number) ? number : null;
}

export function wholeNumberFromText(value: string) {
	if (!value) return null;

	const number = Number(value);
	return Number.isInteger(number) && number >= 0 ? number : undefined;
}

export function positiveIntFromForm(value: FormDataEntryValue | null, fallback: number) {
	const number = optionalIntFromForm(value);
	return number != null && number > 0 ? number : fallback;
}

export function enumFromForm<T extends string>(
	value: FormDataEntryValue | null,
	allowed: readonly T[],
	fallback: T
): T {
	const text = String(value ?? '');
	return (allowed as readonly string[]).includes(text) ? (text as T) : fallback;
}
