import {levels} from '../../content/levels/registry';
/** level.html?id=MMDD-YYYY → the chapter's template decides which runtime loads. */
const id = new URLSearchParams(location.search).get('id') ?? '';
const spec = levels[id];
if (spec?.template === 'runner') import('./runner');
else if (spec?.template === 'lander') import('./lander');
else if (spec?.template === 'flyby') import('./flyby');
else import('./explore');
