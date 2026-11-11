import type {ThemeKit} from './kit';
import {minguoKit} from './minguo';
import {lingnanKit} from './lingnan';
import {ellisKit} from './ellis';
/** Theme registry. Every kit must also run without its own textures. */
export const themes: Record<string, ThemeKit> = {
  'minguo-shanghai': minguoKit,
  'lingnan-1866': lingnanKit,
  'ellis-1954': ellisKit,
};
export const fallbackTheme = themes['minguo-shanghai'];
