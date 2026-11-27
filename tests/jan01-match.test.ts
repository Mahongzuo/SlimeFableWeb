import assert from 'node:assert/strict';
import test from 'node:test';
import {COIN,createBoard,hint,swap} from '../src/templates/mode-match';

test('第三枚硬币提前落下后可以从底排沿铜槽补救',()=>{
  for(let seed=0;seed<40;seed++){
    const board=createBoard('0101','drawer-'+seed);
    while(board.stage<2&&board.moves)assert.ok(swap(board,...hint(board)!));
    assert.equal(board.stage,2);
    assert.equal(board.cells.indexOf(COIN)%8,4);
    const fork=swap(board,53,52);
    assert.ok(fork&&fork.groups[0].length>=6);
    assert.equal(board.cells.indexOf(COIN),60);
    assert.equal(board.stage,2);
    assert.ok(swap(board,60,59));
    assert.equal(board.stage,3);
  }
});
