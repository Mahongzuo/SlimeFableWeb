import type {PixelBoardSpec} from '../../content/levels/types';
import {rng} from '../templates/random';

/** A restored relay lights one actual bit. Intact bits already carry current. */
export function makeBoards(spec: PixelBoardSpec, seed: string) {
  const rand = rng(seed);
  let start = 0;
  return spec.sections.map(section => {
    const rows = spec.rows.slice(start, section.end);
    start = section.end;
    const width = rows[0].length;
    const bits = rows.join('');
    const ones = Array.from(bits, (v, i) => v === '1' ? i : -1).filter(i => i >= 0);
    // Pick one contact from each horizontal band, keeping the pattern legible.
    const count = Math.min(ones.length, rows.length > 20 ? 9 : 5);
    const missing = new Set<number>();
    for (let i = 0; i < count; i++) {
      const index = Math.floor((i + .15 + rand.next() * .7) * ones.length / count);
      missing.add(ones[index]);
    }
    return {name: section.name, color: section.color, width, height: rows.length, bits, missing,
      repaired: new Set<number>(), wrong: new Set<number>(), history: [] as number[], mistakes: 0};
  });
}
export type Board = ReturnType<typeof makeBoards>[number];
export const solved = (board: Board) => board.repaired.size === board.missing.size && !board.wrong.size;
export function energize(board: Board, index: number, powered: boolean) {
  if (!powered || index < 0 || index >= board.bits.length || !Number.isInteger(index)) return;
  if (board.missing.has(index)) {
    if (board.repaired.has(index)) return;
    board.repaired.add(index);
  } else {
    if (board.bits[index] === '1' || board.wrong.has(index)) return;
    board.wrong.add(index); board.mistakes++;
  }
  board.history.push(index);
}
export function undoContact(board: Board) {
  const index = board.history.pop();
  if (index !== undefined) { board.repaired.delete(index); board.wrong.delete(index); }
}

// The panel is the face of the transmitter. Pointer jumps land on a contact;
// arrow keys crawl one cell at a time with the same contact rules.
export function drawBoard(canvas: HTMLCanvasElement, board: Board, cursor: number, powered: boolean) {
  const size = 18;
  canvas.width = board.width * size; canvas.height = board.height * size;
  const g = canvas.getContext('2d')!;
  g.fillStyle = '#102829'; g.fillRect(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < board.bits.length; i++) {
    const x = i % board.width * size, y = Math.floor(i / board.width) * size;
    const open = board.missing.has(i) && !board.repaired.has(i);
    g.fillStyle = board.wrong.has(i) ? '#ff7964' : board.repaired.has(i) ? '#f3ffcf' :
      open ? '#224340' : board.bits[i] === '1' ? board.color : '#203637';
    g.fillRect(x+2,y+2,size-4,size-4);
    if (open) { g.strokeStyle = '#fff6c4'; g.lineWidth = 2; g.strokeRect(x+2,y+2,size-4,size-4);
      g.fillStyle = '#fff6c4'; g.fillRect(x+8,y+6,2,6); g.fillRect(x+6,y+8,6,2); }
    if (board.wrong.has(i)) { g.fillStyle = '#412125'; g.fillText('×',x+5,y+13); }
  }
  const x = (cursor % board.width + .5)*size, y = (Math.floor(cursor/board.width)+.5)*size;
  g.beginPath(); g.ellipse(x,y+1,8,6,0,0,Math.PI*2); g.fillStyle=powered?'#ffda68':'#83cfff'; g.fill();
  g.fillStyle='#16383b'; g.fillRect(x-4,y-1,2,2); g.fillRect(x+2,y-1,2,2);
}
