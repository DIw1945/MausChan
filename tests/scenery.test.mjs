import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {TREE_POSITIONS,SOLIDS,collides} from '../dist/core.mjs';

test('four generated still trees retain complete transparent frames and the original trunk collision/placement',()=>{
  const base=new URL('../dist/assets/',import.meta.url),meta=JSON.parse(fs.readFileSync(new URL('trees-v15-atlas.json',base)));
  assert.equal(meta.animated,false);assert.equal(meta.variants,4);assert.equal(meta.sequences.trees.length,4);
  assert.ok(meta.sources.every(file=>fs.existsSync(new URL(file,base))));
  const hashes=[];
  for(const [i,f] of meta.sequences.trees.entries()){
    const png=fs.readFileSync(new URL(f.file,base)),atlas=fs.readFileSync(new URL(f.image,base));
    assert.equal(png.readUInt32BE(16),96);assert.equal(png.readUInt32BE(20),112);assert.equal(png[25],6);
    assert.equal(atlas.readUInt32BE(16),384);assert.equal(atlas.readUInt32BE(20),112);
    assert.deepEqual([f.x,f.y,f.w,f.h],[i*96,0,96,112]);assert.deepEqual(f.anchor,[48,96]);
    assert.ok(f.visibleSize[0]<=76&&f.visibleSize[1]<=78);assert.ok(f.sourceBounds[2]>f.sourceBounds[0]&&f.sourceBounds[3]>f.sourceBounds[1]);
    hashes.push(crypto.createHash('sha256').update(png).digest('hex'));
  }
  assert.equal(new Set(hashes).size,4);
  assert.deepEqual(TREE_POSITIONS,[[90,140],[236,106],[484,110],[608,144],[942,308],[114,470],[258,604],[638,622],[924,640]]);
  for(const [x,y] of TREE_POSITIONS){
    assert.ok(SOLIDS.some(r=>r.x===x-9&&r.y===y-8&&r.w===18&&r.h===16));
    assert.equal(collides(x,y),true);assert.equal(collides(x-30,y),false);
  }
});
