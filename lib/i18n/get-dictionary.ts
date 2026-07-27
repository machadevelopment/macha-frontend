import type { Locale } from './config';
import type { Dictionary } from './dictionary';
import { es } from './dictionaries/es';
import { en } from './dictionaries/en';

export type { Dictionary };

const dictionaries: Record<Locale, Dictionary> = { es, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
