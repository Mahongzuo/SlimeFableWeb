import './jan01-match.css';
import * as T from 'three';
import type {Stage} from './stage';

// The stamped motifs are game pieces for the fictional counting tray.
export const coinFaces = ['✳','≋','◆'] as const;
export const drawerHints = [
  '消去星纹硬币正下方的三枚支撑，让它落到星纹槽。',
  '先把波纹硬币向右挪一格，再清掉槽口上方的支撑。',
  '菱纹币可以先对位。想一次消掉两组，也可以提前落下，再从底排横移。',
];

export function mountCoinRail(grid: HTMLElement) {
  const rail = document.createElement('div');
  rail.className = 'coin-rail';
  rail.setAttribute('aria-label', '分币槽');
  const columns = [2,5,3];
  const slots = coinFaces.map((face,i) => {
    const slot = document.createElement('span');
    slot.style.gridColumn = String(columns[i]+1);
    slot.textContent = face;
    rail.append(slot);
    return slot;
  });
  grid.after(rail);
  return {
    update(stage: number, column: number) {
      slots.forEach((s,i) => {
        s.className = i<stage ? 'filled' : i===stage ? 'awaiting' : '';
        s.classList.toggle('aligned', i===stage&&column===columns[i]);
      });
    },
    destination(stage: number) { return slots[stage].getBoundingClientRect(); },
  };
}

/** The grid is the screen-space face of the till drawer. Its brass slides
 * physically run out of the register and under that face at either aspect. */
export function connectDrawer(stage:Stage, drawer:HTMLElement) {
  const geometry=new T.BoxGeometry(1,1,1), root=new T.Group();
  root.name='till-drawer-slides';stage.scene.add(root);
  const metal=stage.toon('#e6be74'),oak=stage.toon('#835837');
  const slides=[0,1].map(()=>{
    const runner=new T.Mesh(geometry,oak),guide=new T.Mesh(geometry,metal);
    root.add(runner,guide);return {runner,guide};
  });
  const door=new T.Vector3(),foot=new T.Vector3(),axis=new T.Vector3();
  const plane=new T.Plane(),ray=new T.Raycaster(),ndc=new T.Vector2(),along=new T.Vector3(0,0,1);
  let rect=drawer.getBoundingClientRect();
  const locate=()=>{rect=drawer.getBoundingClientRect();};
  new ResizeObserver(locate).observe(drawer);
  window.addEventListener('resize',locate);
  function fit(mesh:T.Mesh,width:number,thickness:number,start:T.Vector3,end:T.Vector3){
    axis.subVectors(end,start);mesh.scale.set(width,thickness,axis.length());
    mesh.position.copy(start).lerp(end,.5);mesh.quaternion.setFromUnitVectors(along,axis.normalize());
  }
  return (push:number)=>{
    const portrait=innerWidth<760;
    stage.camera.updateMatrixWorld();
    for(const [i,{runner,guide}] of slides.entries()){
      const side=i?1:-1;
      door.set(.8+side*(portrait?.32:.15),1.56,-1.05+side*(portrait?0:.10));
      plane.normal.set(0,1,0);plane.constant=-door.y;
      // Both slide ends lie beneath the wooden frame across the join.
      const x=portrait?rect.left+rect.width*(.25+i*.5):rect.left+12;
      const y=portrait?rect.top+12:rect.top+rect.height*(.57+i*.105);
      ndc.set(x/innerWidth*2-1,1-y/innerHeight*2);
      ray.setFromCamera(ndc,stage.camera);
      if(!ray.ray.intersectPlane(plane,foot))continue;
      fit(runner,.115,.12,door,foot);
      door.lerp(foot,.06+Math.min(1,push)*.14);door.y+=.065;foot.y+=.065;
      fit(guide,.072,.026,door,foot);
    }
  };
}
