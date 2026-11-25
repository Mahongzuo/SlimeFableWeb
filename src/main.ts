import {Game} from './game/game';
import {createGardenStage} from './home/garden-stage';
const app=createGardenStage();
(window as any).__app=app;
new Game(app);
app.run();
