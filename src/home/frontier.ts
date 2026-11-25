import {climateMaterial} from './climate-material';
import type {ExpandedTile, ExpansionThemeId} from '../life/state';
import {
  computeDynamicFrontier,
  EXPANSION_THEMES,
  expansionHeight,
  isInsideHomeTerritory,
  slotForTile,
  type ExpansionSlot,
} from '../world/expansion';
import {spawnPackModel, type SpawnedPackModel} from './model-pack';

interface RenderedTile {
  id: string;
  group: any;
  models: SpawnedPackModel[];
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

  private mountExpandedTile(tile: ExpandedTile) {
    const slot = slotForTile(tile);
    const theme = EXPANSION_THEMES[tile.theme];
    if (!slot || !theme) return;
    const T = this.T;
    const group = new T.Group();
    group.name = `expansion-${tile.id}`;

    const w = Math.round(slot.max[0] - slot.min[0]);
    const h = Math.round(slot.max[1] - slot.min[1]);
    // 2m grid resolution keeps 50+ infinitely expanded tiles at crisp 60 FPS with exact shared borders
    const segW = Math.max(8, Math.round(w / 2));
    const segH = Math.max(8, Math.round(h / 2));
    const geo = new T.PlaneGeometry(w, h, segW, segH);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const c = new T.Color();
    const tint = new T.Color();
    const cx = (slot.min[0] + slot.max[0]) * 0.5;
    const cz = (slot.min[1] + slot.max[1]) * 0.5;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) + cx;
      const z = pos.getZ(i) + cz;
      const y = expansionHeight(x, z, slot, tile.theme);
      pos.setXYZ(i, x, y, z);

      const u = (x - slot.min[0]) / w;
      const v = (z - slot.min[1]) / h;
      c.setHex(theme.grassHex).lerp(tint.setHex(0xa4ad89), .42);
      const big = Math.sin(x * 0.11 + Math.sin(z * 0.08) * 1.8) * Math.sin(z * 0.12 + Math.cos(x * 0.06) * 1.8);
      if (big > 0.25) c.lerp(tint.setHex(theme.accentHex), Math.min(0.45, (big - 0.25) * 1.1));
      // Feather vertex colour along outer 6m of each tile toward neutral inland grass so seams blend organically
      const distEdge = Math.min(x - slot.min[0], slot.max[0] - x, z - slot.min[1], slot.max[1] - z);
      if (distEdge < 6) {
        const ef = 1 - distEdge / 6;
        c.lerp(tint.setHex(0xa2b18a), ef * ef * 0.85);
      }

      // Gentle cross-path down the center of farmland / jiangnan tiles
      if (tile.theme === 'farmland' || tile.theme === 'jiangnan') {
        const dPath = Math.min(Math.abs(u - 0.5) * w, Math.abs(v - 0.5) * h);
        if (dPath < 1.9 && !(tile.theme === 'jiangnan' && Math.hypot((u - 0.5) * 2.2, (v - 0.5) * 2.2) < 0.72)) {
          c.lerp(tint.setHex(theme.pathHex), Math.min(1, (1.9 - dPath) / 0.8));
        }
      }
      // Sandy outer shore band for coast theme
      if (tile.theme === 'coast' && v > 0.55) {
        c.lerp(tint.setHex(theme.pathHex), Math.min(1, (v - 0.55) / 0.25));
      }
      // Muddy pond bottom for jiangnan central lotus basin
      if (tile.theme === 'jiangnan') {
        const pondD = Math.hypot((u - 0.5) * 2.2, (v - 0.5) * 2.2);
        if (pondD < 0.7) c.lerp(tint.setHex(0x6b7c65), Math.min(1, (0.7 - pondD) / 0.25));
      }
      colors.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new T.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = this.ctx.mats.toon(0xffffff, {noCache: true});
    climateMaterial(mat,'terrain');
    mat.vertexColors = true;
    mat.needsUpdate = true;
    const mesh = new T.Mesh(geo, mat);
    mesh.name = `ground-exp-${tile.id}`;
    mesh.receiveShadow = true;
    group.add(mesh);

    // Decorative shallow lotus pond plane for jiangnan theme (recessed cleanly inside basin, no Z-fighting)
    if (tile.theme === 'jiangnan') {
      const centerY = expansionHeight(cx, cz, slot, tile.theme);
      const waterMat = new T.MeshStandardMaterial({
        color: 0x75a89b,
        roughness: 0.18,
        metalness: 0.1,
        transparent: true,
        opacity: 0.78,
      });
      const pond = new T.Mesh(new T.CircleGeometry(Math.min(w, h) * 0.20, 28).rotateX(-Math.PI / 2), waterMat);
      pond.position.set(cx, centerY + 0.18, cz);
      pond.name = `pond-exp-${tile.id}`;
      group.add(pond);
    }

    // Spawn natural theme props (trees, lilies, reeds, tidal rocks)
    const models: SpawnedPackModel[] = [];
    for (const np of theme.naturalProps) {
      const px = slot.min[0] + w * np.u;
      const pz = slot.min[1] + h * np.v;
      const py = expansionHeight(px, pz, slot, tile.theme);
      const spawned = spawnPackModel(T, np.asset, np.width, {castShadow: np.width > 2.4, outline: false});
      spawned.group.position.set(px, py, pz);
      spawned.group.rotation.y = np.yaw;
      group.add(spawned.group);
      models.push(spawned);
    }

    this.tilesRoot.add(group);
    this.rendered.set(tile.id, {id: tile.id, group, models});
  }

  /** Builds cliff skirts ONLY along exposed outer edges of expanded tiles (never across internal seams). */
  private rebuildOuterSkirts(expansions: ExpandedTile[]) {
    while (this.skirtGroup.children.length) {
      const ch = this.skirtGroup.children[0];
      ch.geometry?.dispose?.();
      this.skirtGroup.remove(ch);
    }
    if (!expansions.length) return;
    const T = this.T;
    const skirtMat = this.ctx.mats.toon(SKIRT_HEX);

    for (const tile of expansions) {
      const slot = slotForTile(tile);
      if (!slot) continue;
      const [x0, z0] = slot.min;
      const [x1, z1] = slot.max;
      const edges: {a: [number, number]; b: [number, number]; outX: number; outZ: number}[] = [
        {a: [x0, z1], b: [x1, z1], outX: 0, outZ: 1},
        {a: [x0, z0], b: [x1, z0], outX: 0, outZ: -1},
        {a: [x0, z0], b: [x0, z1], outX: -1, outZ: 0},
        {a: [x1, z0], b: [x1, z1], outX: 1, outZ: 0},
      ];
      for (const e of edges) {
        const mx = (e.a[0] + e.b[0]) * 0.5 + e.outX * 2;
        const mz = (e.a[1] + e.b[1]) * 0.5 + e.outZ * 2;
        // Skip internal edges that border owned territory!
        if (isInsideHomeTerritory(mx, mz, expansions, 0)) continue;
        const len = Math.hypot(e.b[0] - e.a[0], e.b[1] - e.a[1]);
        const n = Math.ceil(len / 2);
        const verts: number[] = [];
        const idx: number[] = [];
        for (let i = 0; i <= n; i++) {
          const t = i / n;
          const x = e.a[0] + (e.b[0] - e.a[0]) * t;
          const z = e.a[1] + (e.b[1] - e.a[1]) * t;
          // Start slightly below top edge (-0.02) so cliff never pokes through ground edge
          verts.push(x, expansionHeight(x, z, slot, tile.theme) - 0.02, z, x, -8, z);
          if (i) {
            const k = (i - 1) * 2;
            idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
          }
        }
        const geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.Float32BufferAttribute(verts, 3));
        geo.setIndex(idx);
        geo.computeVertexNormals();
        const m = new T.Mesh(geo, skirtMat);
        m.material.side = T.DoubleSide;
        this.skirtGroup.add(m);
      }
    }
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
      for (const m of rt.models) m.dispose();
    }
    this.rendered.clear();
    this.root.removeFromParent();
  }
}
