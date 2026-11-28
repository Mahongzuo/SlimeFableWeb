import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {buildCoastalBambooISM} from '../src/home/foliage/bamboo-ism';

test('海岸林缘只生成竹秆和枝叶，保留八片竹林的栽种位置', () => {
  const grove = buildCoastalBambooISM({T: THREE, ctx: {U: {}}} as any);
  const culms = grove.getObjectByName('bamboo-stalks-foliage') as THREE.InstancedMesh;
  const foliage = grove.getObjectByName('bamboo-leaves-foliage') as THREE.InstancedMesh;
  assert.equal(grove.children.length, 2);
  assert.equal(foliage.count, culms.count);
  assert.ok(culms.count > 150);
  const centers = new Set<string>(), matrix = new THREE.Matrix4();
  for (let i = 0; i < culms.count; i++) {
    const leafTransform = new THREE.Matrix4();
    culms.getMatrixAt(i, matrix); foliage.getMatrixAt(i, leafTransform);
    assert.deepEqual(matrix.elements, leafTransform.elements);
    centers.add([matrix.elements[12], matrix.elements[14]].join(','));
  }
  assert.equal(centers.size, culms.count);
});
