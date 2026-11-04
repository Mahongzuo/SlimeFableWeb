import {Game} from './game/game';
const app = window.__app;
if (!app) throw new Error('港口场景尚未初始化');
new Game(app);
