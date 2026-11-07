import type {ThemeKit} from './kit';
import {minguoKit} from './minguo';
/** Theme registry. Every kit must also run without its own textures. */
export const themes: Record<string, ThemeKit> = {
  'minguo-shanghai': minguoKit,
};
export const fallbackTheme = themes['minguo-shanghai'];
