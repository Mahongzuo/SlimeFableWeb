import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {
  SlashVfxSystem,
  SLASH_CONFIG,
  computeSwingTrajectory,
  ELEMENT_SLASH_STYLES,
} from '../src/slime/slash-vfx';
import {SkillVfxSystem, type SkillEffectCallbacks} from '../src/slime/skill-vfx';
import {SKILL_KITS} from '../src/slime/skills';
import {DEFAULT_ELEMENT, elements} from '../src/slime/elements';
import {Combat} from '../src/slime/combat';
import type {Vec} from '../src/slime/types';

test('default slime element is Wind (1) and Physical trail is parallax crater', () => {
  assert.equal(DEFAULT_ELEMENT, 1, 'default element must be Wind (1)');
  assert.equal(elements[DEFAULT_ELEMENT].name, '风');
  assert.equal(elements[5].trail, '重压砸坑');

  const combat = new Combat([]);
  assert.equal(combat.element, 1, 'Combat must initialize to Wind (1)');

  const wetSrc = readFileSync(new URL('../src/slime/wet-film.ts', import.meta.url), 'utf8');
  assert.match(wetSrc, /if\s*\(\s*element\s*===\s*5\s*\)\s*return/, 'Physical slime must not spawn water bubbles');
  assert.match(wetSrc, /craterSample/, 'wet-film.ts must implement Steep POM crater heightfield');
  assert.match(wetSrc, /voronoiEdge/, 'wet-film.ts must carve Voronoi radial fracture cracks');
});

const SWING_RIBBON_VERTS = (SLASH_CONFIG.segments + 1) * 2;

/** Visible meshes under the slash root: swing ribbons, and everything else keyed by the first uniforms of its shader. */
function surveySwing(scene: THREE.Scene) {
  const root = scene.getObjectByName('slime-slash-vfx')!;
  let ribbons = 0, opaque = 0;
  const forms: string[] = [];
  root.traverse((o: any) => {
    if (!o.isMesh) return;
    for (let p = o; p; p = p.parent) if (!p.visible) return;
    const pos = o.geometry.attributes.position.array as Float32Array;
    for (let k = 0; k < pos.length; k++) assert.ok(Number.isFinite(pos[k]), 'swing geometry must stay finite');
    if (o.geometry.attributes.position.count === SWING_RIBBON_VERTS) { ribbons++; return; }
    forms.push(Object.keys(o.material.uniforms ?? {}).slice(0, 4).join('+'));
    if (o.material.depthWrite && !o.material.transparent) opaque++;
  });
  return {ribbons, opaque, forms};
}

test('normal attacks: Water, Fire, Dark and Physical have their own bodies; only Wind and Volt swing arc ribbons', () => {
  assert.equal(ELEMENT_SLASH_STYLES.length, 6);
  assert.ok(SLASH_CONFIG.segments >= 60, 'slash ribbons must use >= 60 segments for crisp curves');

  const choreography = new Set<string>();
  for (let el = 0; el < 6; el++) {
    choreography.add([0, 1, 2, 3].map(c => {
      const t = computeSwingTrajectory(c, el);
      return `${t.startYawDeg},${t.endYawDeg},${t.startPitchDeg},${t.endPitchDeg},${t.secondary ? `${t.secondary.startYawDeg},${t.secondary.endYawDeg},${t.secondary.delay}` : 'none'}`;
    }).join('|'));
  }
  assert.equal(choreography.size, 6, 'all 6 elements must have unique 4-hit combo choreography');

  const primaryForm: string[] = [];
  for (let el = 0; el < 6; el++) {
    const perHit = new Set<string>();
    for (let c = 0; c < 4; c++) {
      const scene = new THREE.Scene();
      const slash = new SlashVfxSystem({THREE, scene});
      slash.playSwing(el, c, [0, 0, 0], [0, 0, -1], 0.28);
      // Sampled just past the impact frame, which is when every part of a form is on screen.
      for (let k = 0; k < 8; k++) slash.update(0.02, k * 0.02, [0, 0, 0]);
      assert.ok(slash.activeSwings > 0, `element ${el} hit ${c} must still be playing mid-swing`);
      const seen = surveySwing(scene);
      if (el === 1 || el === 3) assert.ok(seen.ribbons > 0, `element ${el} keeps its arc ribbons`);
      else assert.equal(seen.ribbons, 0, `element ${el} hit ${c} must not fall back to a recoloured arc ribbon`);
      if (el !== 3) assert.ok(seen.forms.length > 0, `element ${el} hit ${c} must build its own form meshes`);
      // Stone is the one element that is solid: opaque and depth-writing instead of a blended glow.
      if (el === 5) assert.ok(seen.opaque > 0, `Physical hit ${c} must contain opaque rock`);
      else assert.equal(seen.opaque, 0, `element ${el} hit ${c} must not contain opaque meshes`);
      perHit.add(`${seen.forms.length}:${[...new Set(seen.forms)].sort().join('|')}`);
      if (c === 0) primaryForm[el] = seen.forms[0] ?? 'ribbon';
      for (let k = 0; k < 40; k++) slash.update(0.02, 1 + k * 0.02, [0, 0, 0]);
      assert.equal(slash.activeSwings, 0, `element ${el} hit ${c} must finish and release its meshes`);
      slash.dispose();
    }
    if (el !== 3) assert.ok(perHit.size >= 3, `element ${el} must vary its build across the four hits, saw ${perHit.size}`);
  }
  assert.equal(new Set(primaryForm).size, 6, `each element's opening hit must use a different shader family: ${primaryForm.join(' / ')}`);
});

test('skills: every element uses three different mechanics, and the bodies are built from element-specific forms', () => {
  const mkCb = (hits: {center: Vec; def: any; burst: boolean}[] = []): SkillEffectCallbacks => ({
    getTargetPositions: (): Vec[] => [[0, 0, -4], [2.2, 0, -4.5]],
    sampleTerrain: () => 0,
    onSkillHitArea: (center, def, burst) => { hits.push({center: [...center], def, burst: !!burst}); },
    onSpawnBurst: () => {},
  });

  // 1. No mechanic is reused inside a kit, and none is shared between elements.
  const owner = new Map<string, number>();
  for (let el = 0; el < 6; el++) {
    const kit = SKILL_KITS[el];
    assert.equal(new Set([kit.E.archetype, kit.R.archetype, kit.Q.archetype]).size, 3, `element ${el} must not repeat a mechanic`);
    for (const def of Object.values(kit)) {
      // Water E and Fire E are both shots; they differ in body and impact, checked below.
      if (def.archetype === 'projectile') continue;
      assert.ok(!owner.has(def.archetype) || owner.get(def.archetype) === el, `${def.name} shares "${def.archetype}" with element ${owner.get(def.archetype)}`);
      owner.set(def.archetype, el);
    }
  }

  // 2. Volt E / R / Q use 3D ribbon meshes, zero 1px THREE.Line objects.
  {
    const scene = new THREE.Scene();
    const vfx = new SkillVfxSystem({THREE, scene});
    const cb = mkCb();
    vfx.triggerSkill(SKILL_KITS[3].E, [0, 0, 0], [0, 0, -1], cb);
    vfx.triggerSkill(SKILL_KITS[3].R, [0, 0, 0], [0, 0, -1], cb);
    vfx.triggerSkill(SKILL_KITS[3].Q, [0, 0, 0], [0, 0, -1], cb);
    vfx.update(0.1, cb);
    let lineCount = 0;
    let meshCount = 0;
    vfx.root.traverse((o: any) => {
      if (o.isLine) lineCount++;
      if (o.isMesh) meshCount++;
    });
    assert.equal(lineCount, 0, 'Volt skills must not use 1px THREE.Line');
    assert.ok(meshCount >= 10, 'Volt skills must build 3D plasma bolt ribbon meshes');
    vfx.dispose();
  }

  // 3. Each skill is cast alone: what it builds, when it lands, and that it cleans up after itself.
  const builds = new Map<string, string>();
  for (let el = 0; el < 6; el++) {
    for (const def of Object.values(SKILL_KITS[el])) {
      const scene = new THREE.Scene();
      const vfx = new SkillVfxSystem({THREE, scene});
      const hits: {center: Vec; def: any; burst: boolean}[] = [];
      const cb = mkCb(hits);
      vfx.triggerSkill(def, [0, 0, 0], [0, 0, -1], cb);
      const families = new Set<string>();
      let peak = 0, opaque = 0;
      for (let step = 0; step < 150; step++) {
        vfx.update(1 / 30, cb);
        let count = 0;
        vfx.root.traverse((o: any) => {
          if (!o.isMesh) return;
          count++;
          families.add(Object.keys(o.material.uniforms ?? {}).slice(0, 4).join('+'));
          if (o.material.depthWrite && !o.material.transparent) opaque++;
          for (const v of [o.position.x, o.position.y, o.position.z, o.scale.x, o.scale.y, o.scale.z, o.rotation.x, o.rotation.y]) {
            assert.ok(Number.isFinite(v), `${def.name} must keep finite transforms`);
          }
        });
        peak = Math.max(peak, count);
      }
      assert.ok(peak >= 3, `${def.name} must build a 3D body, peak mesh count ${peak}`);
      assert.ok(hits.length > 0, `${def.name} must land at least one hit`);
      for (const hit of hits) {
        assert.ok(hit.center.every(Number.isFinite) && hit.def.damage > 0 && hit.def.radius > 0, `${def.name} hit must be well-formed`);
      }
      if (def.slot === 'Q' && el !== 1) assert.ok(hits.some(hit => hit.burst), `${def.name} must flag its burst hit`);
      if (el === 5) assert.ok(opaque > 0, `${def.name} must contain opaque rock`);
      assert.equal(vfx.activeCount, 0, `${def.name} must release everything within 5 seconds`);
      builds.set(def.name, [...families].sort().join('|'));
      vfx.dispose();
    }
  }
  assert.equal(builds.size, 18);
  assert.ok(new Set(builds.values()).size >= 14, `skills must not converge on one mesh recipe: ${[...builds].map(([name, sig]) => `${name}=${sig}`).join('  ')}`);
  assert.notEqual(builds.get(SKILL_KITS[0].E.name), builds.get(SKILL_KITS[2].E.name), 'Water E and Fire E must not share a body');

  // 4. Dark E runs along the ground and only bites once it arrives.
  {
    const scene = new THREE.Scene();
    const vfx = new SkillVfxSystem({THREE, scene});
    const hits: {center: Vec; def: any; burst: boolean}[] = [];
    const cb = mkCb(hits);
    vfx.triggerSkill(SKILL_KITS[4].E, [0, 0, 0], [0, 0, -1], cb, [0, 0, -4]);
    vfx.update(1 / 30, cb);
    assert.equal(hits.length, 0, 'Dark E must not hit on the cast frame');
    for (let step = 0; step < 60; step++) vfx.update(1 / 30, cb);
    assert.equal(hits.length, 1, 'Dark E lands exactly once');
    assert.deepEqual(hits[0].center, [0, 0, -4]);
    vfx.dispose();
  }

  // 5. All 6 home dashes + all 18 skills + all 24 normal swings at once: diverse particles and clean disposal.
  const scene = new THREE.Scene();
  const slash = new SlashVfxSystem({THREE, scene});
  const skill = new SkillVfxSystem({THREE, scene});
  const cb = mkCb();
  for (let el = 0; el < 6; el++) {
    skill.spawnHomeDashFx([0, 0, 0], [0, 0, -1], el);
    for (let c = 0; c < 4; c++) {
      slash.playSwing(el, c, [0, 0, 0], [0, 0, -1], 0.24);
      slash.update(0.04, c * 0.1 + el);
    }
    for (const def of Object.values(SKILL_KITS[el])) {
      skill.triggerSkill(def, [0, 0, 0], [0, 0, -1], cb);
    }
  }
  for (let step = 0; step < 30; step++) {
    slash.update(1 / 30, step / 30);
    skill.update(1 / 30, cb);
  }

  const shapesSeen = new Set<number>();
  const pts = skill.root.getObjectByName('slime-niagara-particles') as THREE.Points;
  const shapeAttr = pts.geometry.getAttribute('aShape') as THREE.BufferAttribute;
  const alphaAttr = pts.geometry.getAttribute('aAlpha') as THREE.BufferAttribute;
  for (let i = 0; i < shapeAttr.count; i++) {
    if (alphaAttr.array[i] > 0.01) shapesSeen.add(Math.round(shapeAttr.array[i]));
  }
  assert.ok(shapesSeen.size >= 5, `expected diverse particle shapes across 6 elements, saw ${[...shapesSeen].join(',')}`);

  slash.dispose();
  skill.dispose();
  assert.equal(slash.activeSwings, 0);
  assert.equal(skill.activeCount, 0);
});
