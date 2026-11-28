import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {BUILD_CATALOG} from '../src/home/build-catalog';
import {architectureIds, landscapeAssetUrl} from '../src/home/architecture-assets';

test('catalogue houses resolve to local architectural models with embedded geometry and images', () => {
  const houses = BUILD_CATALOG.filter(item => item.category === 'house');
  assert.deepEqual(new Set(houses.map(item => item.asset)), architectureIds);
  for (const {asset, thumb} of houses) {
    const bytes = readFileSync('public' + landscapeAssetUrl(asset, 'glb'));
    assert.equal(bytes.readUInt32LE(8), bytes.length);
    const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
    assert.match(gltf.asset.copyright, /CC BY 4.0/);
    assert.ok(gltf.meshes.length && gltf.buffers.every((b: any) => !b.uri));
    for (const image of gltf.images ?? []) assert.equal(typeof image.bufferView, 'number');
    assert.equal(thumb, landscapeAssetUrl(asset, 'png'));
    assert.equal(readFileSync('public' + thumb).subarray(1, 4).toString(), 'PNG');
    if (asset === 'watermill' || asset === 'pack-windmill') {
      const turn = gltf.animations.find((clip: any) => clip.name === 'Turn');
      assert.equal(turn.channels[0].target.path, 'rotation');
      const joint = gltf.nodes[turn.channels[0].target.node];
      assert.equal(joint.name, asset === 'watermill' ? 'Wheel' : 'Sails');
      assert.ok(joint.translation[1] > 1);
    }
  }
  assert.equal(landscapeAssetUrl('nature-willow', 'glb'), '/models/dreamworld/nature-willow.glb');
});

