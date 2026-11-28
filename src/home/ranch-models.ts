import {importedAnimals} from '../life/companion-catalog';
import { AnimationAction, AnimationClip, AnimationMixer, LoopOnce, Object3D } from 'three';

export type RanchPose = 'idle' | 'walk' | 'run' | 'notice' | 'float' | 'swim' | 'fly' | 'sit' | 'eat';

const clipsForPose: Record<RanchPose, string[]> = {
  idle: ['idle', 'survey'], walk: ['walk'], run: ['run', 'trot', 'walk'],
  notice: ['meow','bark','sniff','peck','call','gesture','sit','survey','idle'],
  sit: ['sleep','rest','lie','sit','idle'], eat: ['eat','feed','peck','graze','sniff','idle'], fly: ['fly','glide','walk'], float: ['swimidle', 'idle'], swim: ['swim', 'walk'],
};

export const isRanchModel = (id: string) => id.startsWith('ranch-');

export function ranchModelUrl(id: string, extension: 'glb' | 'png') {
  const slug=id.slice(6);
  if(importedAnimals.has(slug.replace(/-far$/, ''))) return '/models/companions/'+slug+'.'+(extension==='png'?'webp':extension);
  return '/models/ranch/' + id.slice('ranch-'.length) + '.' + extension;
}

/** Each instance owns its skeleton, action weights, and time. Meshes and maps are cache-owned. */
export function makeRanchAnimator(root: Object3D, clips: AnimationClip[], mixer: AnimationMixer, phase: number) {
  const named = new Map(clips.map(clip => [clip.name.toLowerCase(), clip]));
  let current: AnimationAction | undefined;
  let pose: RanchPose | undefined;
  // Deer have a jointed head mesh. All other species have a head bone or a dedicated reaction clip.
  const head = root.getObjectByName('Head');
  let attention = 0;
  function setPose(next: RanchPose) {
    if (next === pose) return;
    pose = next;
    const clip = clipsForPose[next].map(name => named.get(name)).find(Boolean);
    if (!clip) return;
    const action = mixer.clipAction(clip);
    const useFastWalk = next === 'run' && clip.name.toLowerCase() === 'walk';
    action.setEffectiveTimeScale(useFastWalk ? 1.55 : 1);
    if (action === current) return;
    current?.fadeOut(.20);
    action.reset().setEffectiveWeight(1);
    if (next === 'notice' && ['gesture','sniff','call'].includes(clip.name.toLowerCase())) {
      action.setLoop(LoopOnce, 1);
      action.clampWhenFinished = true;
    } else {
      action.time = (phase % 1) * clip.duration;
    }
    if (current) action.fadeIn(.20);
    action.play();
    current = action;
  }
  setPose('idle');
  return {
    setPose,
    update(dt: number) {
      // Undo the previous additive look before the mixer samples the next base pose.
      if (head && attention) head.rotateX(-attention);
      mixer.update(dt);
      attention += ((pose === 'notice' && head ? -.12 : 0) - attention) * (1 - Math.exp(-6 * dt));
      if (head && attention) head.rotateX(attention);
    },
  };
}

