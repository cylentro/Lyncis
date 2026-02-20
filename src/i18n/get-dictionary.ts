import { id } from './dictionaries/id';
import { en } from './dictionaries/en';

export const locales = ['id', 'en'] as const;
export type Locale = (typeof locales)[number];

export const dictionaries = {
    id,
    en,
};

export type Dictionary = typeof id;

export const getDictionary = (locale: Locale) => dictionaries[locale] ?? dictionaries.id;
