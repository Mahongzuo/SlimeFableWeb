import {BUILD_ITEMS,propCollisionParts} from './build-catalog';
import type {Box} from '../slime/types';
import {lotusPond} from './water-fish';
import {valleyWater} from '../zones/lake-water';
import {meadowGroundMaterial,sampleInlandGrassColor} from '../world/terrain-mesh';
import type {ExpandedTile, ExpansionThemeId} from '../life/state';
import {
  computeDynamicFrontier,
  EXPANSION_THEMES,
  expansionHeight, expansionGroundAt, expansionSurfaceWeights, expansionFenceRuns, expansionSegments,
  isInsideHomeTerritory,
  slotForTile,
  type ExpansionSlot,
} from '../world/expansion';
import {spawnPackModel, type SpawnedPackModel} from './model-pack';

interface RenderedTile {
  id: string;
  group: any;
  models: SpawnedPackModel[];
  boxes:Box[];
}

interface PreviewEntry {
  slot: ExpansionSlot;
  group: any;
  fillMesh: any;
  borderLine: any;
  fillMat: any;
  borderMat: any;
}

const SKIRT_HEX = 0x7d6b55;

/**
 * DreamWorld-inspired territory expansion renderer & 3D frontier preview overlay.
 * Builds seamless, zero-overlap terrain tiles + outer cliff skirts + natural theme props.
 */
export class FrontierRenderer {
  private T: any;
  readonly root: any;
  private tilesRoot: any;
  private previewRoot: any;
  private rendered = new Map<string, RenderedTile>();
  private previews: PreviewEntry[] = [];
  private previewVisible = false;
  private hoveredId: string | null = null;
  private selectedId: string | null = null;
  private skirtGroup: any;

  constructor(private ctx: any) {
    this.T = ctx.THREE;
    this.root = new this.T.Group();
    this.root.name = 'home-expansion-root';
    this.tilesRoot = new this.T.Group();
    this.tilesRoot.name = 'home-expansion-tiles';
    this.skirtGroup = new this.T.Group();
    this.skirtGroup.name = 'home-expansion-skirts';
    this.previewRoot = new this.T.Group();
    this.previewRoot.name = 'home-expansion-frontier';
    this.previewRoot.visible = false;
    this.root.add(this.tilesRoot, this.skirtGroup, this.previewRoot);
    ctx.scene.add(this.root);
  }

  /** Synchronize rendered terrain meshes and focal frontier preview tiles with saved expansions. */
  sync(expansions: ExpandedTile[], previewTheme: ExpansionThemeId = 'farmland', focusXZ: [number, number] = [-30, 142]) {
    const ownedIds = new Set(expansions.map(e => e.id));
    // Remove tiles no longer present (e.g. save reset)
    for (const [id, rt] of this.rendered) {
      if (!ownedIds.has(id)) {
        for (const m of rt.models) m.dispose();
        rt.group.traverse((node:any)=>{node.userData.releaseFence?.();if(node.userData.releaseWater){node.userData.releaseWater();node.geometry.dispose();}});
        rt.group.removeFromParent();
        this.rendered.delete(id);
      }
    }
    // Mount any newly unlocked tiles
    for (const tile of expansions) {
      if (!this.rendered.has(tile.id)) {
        this.mountExpandedTile(tile);
      }
    }
    this.rebuildOuterSkirts(expansions);
    this.rebuildFrontierPreviews(expansions, previewTheme, focusXZ);
    this.ctx.islandCoast?.syncExpansions(expansions);
    this.ctx.grassField?.syncExpansions(expansions);
  }

  /** Lightweight refresh of ONLY the focal 8 frontier preview tiles as the user pans around an infinite map. */
  refreshFrontierAround(expansions: ExpandedTile[], previewTheme: ExpansionThemeId, focusXZ: [number, number]) {
    this.rebuildFrontierPreviews(expansions, previewTheme, focusXZ);
  }

  setPreviewVisible(on: boolean) {
    this.previewVisible = on;
    this.previewRoot.visible = on;
    if (!on) {
      this.hoveredId = null;
    }
    this.updatePreviewHighlights();
  }

  setSelectedSlot(slotId: string | null) {
    this.selectedId = slotId;
    this.updatePreviewHighlights();
  }

  setHoveredSlot(slotId: string | null) {
    if (this.hoveredId === slotId) return;
    this.hoveredId = slotId;
    this.updatePreviewHighlights();
  }

  /** Raycasts against visible 3D frontier preview tiles; returns hit slot id or null. */
  pickSlot(raycaster: any): string | null {
    if (!this.previewVisible || !this.previews.length) return null;
    const meshes = this.previews.map(p => p.fillMesh);
    const hits = raycaster.intersectObjects(meshes, false);
    if (!hits.length) return null;
    return (hits[0].object.userData.slotId as string) ?? null;
  }

  structuralBoxes(){return Array.from(this.rendered.values()).flatMap(tile=>tile.boxes);}

  private addFence(tile:ExpandedTile,slot:ExpansionSlot,parent:any,boxes:Box[]) {
    const T=this.T,theme=tile.theme;
    const group=new T.Group();
    group.name='terrain-fence-'+tile.id;
    const runs=expansionFenceRuns(slot,theme);
    const postHeight=theme==='jiangnan'?.82:theme==='meadow'?.95:.76;
    const color=theme==='jiangnan'?0x9b9f91:theme==='coast'?0x88735b:theme==='meadow'?0x85684a:0xb08755;
    const wood=this.ctx.mats.toon(color),trim=this.ctx.mats.toon(theme==='coast'?0xc8a46e:theme==='jiangnan'?0xd4cbb8:0xa88659);
    const postGeo=theme==='farmland'?new T.BoxGeometry(.18,postHeight,.18):new T.CylinderGeometry(.105,.135,postHeight,theme==='jiangnan'?8:6);
    const railGeo=theme==='coast'?new T.CylinderGeometry(.042,.042,1,5):new T.BoxGeometry(theme==='jiangnan'?.16:.085,1,theme==='jiangnan'?.13:.10);
    const nodes=runs.reduce((n,r)=>n+r.length,0), spans=nodes-runs.length;
    const posts=new T.InstancedMesh(postGeo,wood,nodes);
    const rails=new T.InstancedMesh(railGeo,trim,spans*(theme==='coast'?3:theme==='meadow'?1:2));
    posts.name='parcel-fence-posts';rails.name=theme==='coast'?'parcel-fence-rope':'parcel-fence-rails';
    group.add(posts,rails);parent.add(group);
    group.userData.theme=theme;group.userData.openRuns=runs.length;
    const a=new T.Vector3(),b=new T.Vector3(),d=new T.Vector3(),mid=new T.Vector3(),m=new T.Matrix4(),q=new T.Quaternion();
    const up=new T.Vector3(0,1,0),scale=new T.Vector3();
    let postIndex=0,railIndex=0;
    const rail=(a:any,b:any)=>{
      d.subVectors(b,a);q.setFromUnitVectors(up,d.clone().normalize());
      m.compose(mid.addVectors(a,b).multiplyScalar(.5),q,scale.set(1,d.length(),1));
      rails.setMatrixAt(railIndex++,m);
    };
    for(const run of runs){
      for(let i=0;i<run.length;i++){
        const [x,z]=run[i],y=expansionGroundAt(x,z,slot,theme);
        posts.setMatrixAt(postIndex++,m.makeTranslation(x,y+postHeight*.5-.025,z));
        if(!i)continue;
        const [px,pz]=run[i-1],py=expansionGroundAt(px,pz,slot,theme);
        a.set(px,py+postHeight*.78,pz);b.set(x,y+postHeight*.78,z);
        if(theme==='coast'){
          const one=a.clone().lerp(b,1/3),two=a.clone().lerp(b,2/3);
          one.y-=.11;two.y-=.11;rail(a,one);rail(one,two);rail(two,b);
        }else{
          rail(a,b);
          if(theme!=='meadow'){a.y-=.28;b.y-=.28;rail(a,b);}
        }
        const length=Math.hypot(px-x,pz-z),cx=(x+px)*.5,cz=(z+pz)*.5;
        boxes.push({name:'parcel-fence-'+tile.id+'-'+railIndex,min:[cx-length*.5-.11,Math.min(y,py)-.07,cz-.13],
          max:[cx+length*.5+.11,Math.max(y,py)+postHeight-.025,cz+.13],yaw:-Math.atan2(z-pz,x-px),camera:true,climbable:false});
      }
    }
    for(const piece of [rails,posts]){piece.castShadow=true;piece.receiveShadow=true;piece.instanceMatrix.needsUpdate=true;}
    group.userData.releaseFence=()=>{posts.dispose();rails.dispose();postGeo.dispose();railGeo.dispose();};
  }

  private mountExpandedTile(tile: ExpandedTile) {
    const slot = slotForTile(tile);
    const theme = EXPANSION_THEMES[tile.theme];
    if (!slot || !theme) return;
    const T = this.T;
    const group = new T.Group();
    group.name = `expansion-${tile.id}`;

    const w = Math.round(slot.max[0] - slot.min[0]);
    const h = Math.round(slot.max[1] - slot.min[1]);
    const segW=expansionSegments(slot.min[0],slot.max[0],0),segH=expansionSegments(slot.min[1],slot.max[1],1);
    const geo = new T.PlaneGeometry(w, h, segW, segH);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3), splats=new Float32Array(pos.count*2);
    const c = new T.Color();
    const tint = new T.Color(),seamTint=new T.Color();
    const cx = (slot.min[0] + slot.max[0]) * 0.5;
    const cz = (slot.min[1] + slot.max[1]) * 0.5;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + cx;
      const z = pos.getZ(i) + cz;
      const y = expansionHeight(x, z, slot, tile.theme);
      pos.setXYZ(i, x, y, z);

      c.setHex(theme.grassHex).lerp(tint.setHex(0xa4ad89), .42);
      const big = Math.sin(x * 0.11 + Math.sin(z * 0.08) * 1.8) * Math.sin(z * 0.12 + Math.cos(x * 0.06) * 1.8);
      if (big > 0.25) c.lerp(tint.setHex(theme.accentHex), Math.min(0.45, (big - 0.25) * 1.1));
      // Feather vertex colour along outer 6m of each tile toward neutral inland grass so seams blend organically
      const distEdge = Math.min(x - slot.min[0], slot.max[0] - x, z - slot.min[1], slot.max[1] - z);
      if (distEdge < 6) {
        const ef = 1 - distEdge / 6;
        sampleInlandGrassColor(x,z,seamTint,tint);
        c.lerp(seamTint,ef*ef);
      }

      const cover=expansionSurfaceWeights(x,z,slot,tile.theme);
      splats.set([cover.road*(tile.theme==='farmland'?.49:1),cover.sand],i*2);
      c.lerp(tint.setHex(0x6b7c65),cover.pond);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new T.BufferAttribute(colors, 3));
    geo.setAttribute('aSplat',new T.BufferAttribute(splats,2));
    geo.computeVertexNormals();

    const mat=meadowGroundMaterial(this.ctx);
    const mesh = new T.Mesh(geo, mat);
    mesh.name = `ground-exp-${tile.id}`;
    mesh.receiveShadow = true;
    group.add(mesh);

    // Decorative shallow lotus pond plane for jiangnan theme (recessed cleanly inside basin, no Z-fighting)
    const basin=lotusPond(tile);
    if(basin){
      const pond=valleyWater(this.ctx,new T.CircleGeometry(basin.radius,64),basin.x,basin.level,basin.z);
      pond.name=`pond-exp-${tile.id}`;group.add(pond);
    }

    // Spawn natural theme props (trees, lilies, reeds, tidal rocks)
    const models: SpawnedPackModel[] = [],boxes:Box[]=[];
    for (const np of theme.naturalProps) {
      const px = slot.min[0] + w * np.u;
      const pz = slot.min[1] + h * np.v;
      const py = expansionGroundAt(px, pz, slot, tile.theme);
      const spawned = spawnPackModel(T, np.asset, np.width, {castShadow: np.width > 2.4, outline: false});
      spawned.group.position.set(px, py, pz);
      spawned.group.rotation.y = np.yaw;
      group.add(spawned.group);
      const def=BUILD_ITEMS[np.asset];
      if(def?.solid)boxes.push(...propCollisionParts({id:tile.id+'-'+np.u+'-'+np.v,itemId:np.asset,
        x:px,y:py,z:pz,scale:np.width/Math.max(def.width,def.depth),yaw:np.yaw}));
      models.push(spawned);
    }

    this.addFence(tile,slot,group,boxes);
    this.tilesRoot.add(group);
    this.rendered.set(tile.id, {id: tile.id, group, models,boxes});
  }

  /** Coastline cliffs and seabed are dynamically sculpted around all owned tiles by IslandCoastSystem. */
  private rebuildOuterSkirts(_expansions: ExpandedTile[]) {
    while (this.skirtGroup.children.length) {
      const ch = this.skirtGroup.children[0];
      ch.geometry?.dispose?.();
      this.skirtGroup.remove(ch);
    }
    void SKIRT_HEX;
    void isInsideHomeTerritory;
  }

  /** Builds DreamWorld-style translucent green terrain-hugging preview carpets + dashed borders + port rings. */
  private rebuildFrontierPreviews(expansions: ExpandedTile[], previewTheme: ExpansionThemeId, focusXZ: [number, number] = [-30, 142]) {
    for (const p of this.previews) {
      p.group.removeFromParent();
      p.fillMesh.geometry.dispose();
      p.fillMat.dispose();
      p.borderLine.geometry.dispose();
      p.borderMat.dispose();
    }
    this.previews = [];

    const T = this.T;
    const frontier = computeDynamicFrontier(expansions, focusXZ, 8);
    for (const slot of frontier) {
      const group = new T.Group();
      const w = slot.max[0] - slot.min[0];
      const h = slot.max[1] - slot.min[1];
      const cx = (slot.min[0] + slot.max[0]) * 0.5;
      const cz = (slot.min[1] + slot.max[1]) * 0.5;
      const segX = Math.max(8, Math.round(w / 4));
      const segZ = Math.max(8, Math.round(h / 4));

      const geo = new T.PlaneGeometry(w - 0.8, h - 0.8, segX, segZ);
      geo.rotateX(-Math.PI / 2);
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i) + cx;
        const z = pos.getZ(i) + cz;
        pos.setXYZ(i, x, expansionHeight(x, z, slot, previewTheme) + 0.14, z);
      }
      geo.computeVertexNormals();

      const fillMat = new T.MeshBasicMaterial({
        color: 0x38d9a9,
        transparent: true,
        opacity: 0.24,
        side: T.DoubleSide,
        depthWrite: false,
      });
      const fillMesh = new T.Mesh(geo, fillMat);
      fillMesh.userData.slotId = slot.id;
      fillMesh.layers.set(1);
      fillMesh.renderOrder = 15;
      group.add(fillMesh);

      // Dashed outer border hugging terrain
      const ringPts: any[] = [];
      const pad = 0.5;
      const x0 = slot.min[0] + pad, x1 = slot.max[0] - pad;
      const z0 = slot.min[1] + pad, z1 = slot.max[1] - pad;
      const addSeg = (ax: number, az: number, bx: number, bz: number) => {
        const steps = 10;
        for (let s = 0; s < steps; s++) {
          const t = s / steps;
          const px = ax + (bx - ax) * t;
          const pz = az + (bz - az) * t;
          ringPts.push(new T.Vector3(px, expansionHeight(px, pz, slot, previewTheme) + 0.22, pz));
        }
      };
      addSeg(x0, z0, x1, z0);
      addSeg(x1, z0, x1, z1);
      addSeg(x1, z1, x0, z1);
      addSeg(x0, z1, x0, z0);
      ringPts.push(ringPts[0].clone());

      const borderGeo = new T.BufferGeometry().setFromPoints(ringPts);
      const borderMat = new T.LineDashedMaterial({
        color: 0x52f2c0,
        dashSize: 1.8,
        gapSize: 1.1,
        transparent: true,
        opacity: 0.92,
      });
      const borderLine = new T.Line(borderGeo, borderMat);
      borderLine.computeLineDistances();
      borderLine.layers.set(1);
      borderLine.renderOrder = 16;
      group.add(borderLine);

      // Connection port ring on the shared seam facing existing territory (DreamWorld style)
      let portX = cx, portZ = cz;
      if (slot.connectEdge === 'south') portZ = slot.min[1] + 0.8;
      else if (slot.connectEdge === 'north') portZ = slot.max[1] - 0.8;
      else if (slot.connectEdge === 'east') portX = slot.max[0] - 0.8;
      else portX = slot.min[0] + 0.8;
      const portRing = new T.Mesh(
        new T.RingGeometry(1.1, 1.7, 24).rotateX(-Math.PI / 2),
        new T.MeshBasicMaterial({color: 0xffe066, transparent: true, opacity: 0.82, side: T.DoubleSide, depthWrite: false}),
      );
      portRing.position.set(portX, expansionHeight(portX, portZ, slot, previewTheme) + 0.24, portZ);
      portRing.layers.set(1);
      portRing.renderOrder = 17;
      group.add(portRing);

      this.previewRoot.add(group);
      this.previews.push({slot, group, fillMesh, borderLine, fillMat, borderMat});
    }
    this.updatePreviewHighlights();
  }

  private updatePreviewHighlights() {
    for (const p of this.previews) {
      const sel = p.slot.id === this.selectedId;
      const hov = p.slot.id === this.hoveredId;
      p.fillMat.color.setHex(sel ? 0xffd166 : hov ? 0x63f5c8 : 0x38d9a9);
      p.fillMat.opacity = sel ? 0.42 : hov ? 0.34 : 0.22;
      p.borderMat.color.setHex(sel ? 0xffe699 : 0x52f2c0);
    }
  }

  dispose() {
    for (const rt of this.rendered.values()) {
      rt.group.traverse((node:any)=>node.userData.releaseFence?.());
      for (const m of rt.models) m.dispose();
    }
    this.rendered.clear();
    this.root.removeFromParent();
  }
}
