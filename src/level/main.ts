import {modeById} from '../../content/daily-modes';
import {levels} from '../../content/levels/registry';
/** level.html?id=MMDD-YYYY → the chapter's template decides which runtime loads. */
const id = new URLSearchParams(location.search).get('id') ?? '';
const mode = modeById(id);
const spec = levels[id];
if (mode?.kind === 'match') import('./mode-match');
else if (mode?.kind==='skirmish'||mode?.kind==='rpg') import('./battle-preview');
else if (mode) import('./mode-world');
else if (spec?.template === 'runner') import('./runner');
else if (spec?.template === 'lander') import('./lander');
else if (spec?.template === 'flyby') import('./flyby');
else if (spec?.template === 'landmark') import('./landmark');
else if (spec?.template === 'almanac') import('./almanac');
else if (spec?.template === 'solstice') import('./solstice');
else if (spec?.template === 'folio') import('./folio');
else if (spec?.template === 'ability') import('./ability');
else if (spec?.template === 'atlas') import('./atlas');
else import('./explore');
