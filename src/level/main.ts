import {levels} from '../../content/levels/registry';
/** level.html?id=MMDD-YYYY → the chapter's template decides which runtime loads. */
const id = new URLSearchParams(location.search).get('id') ?? '';
const spec = levels[id];
if (spec?.template === 'runner') import('./runner');
else import('./explore');
