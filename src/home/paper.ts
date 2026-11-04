/** Canvas helpers for in-world paper tags. Fonts fall back across Windows, macOS and Linux CJK installs. */
export const SERIF = '"Noto Serif SC","Source Han Serif SC","Songti SC","STSong","SimSun",serif';
export const SANS = '"PingFang SC","Microsoft YaHei","Noto Sans SC","Source Han Sans SC",sans-serif';
export function tagTexture(T: any, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, w = 512, h = 256) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d')!; draw(g, w, h);
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; return t;
}
export function paperCard(g: CanvasRenderingContext2D, w: number, h: number, ink = '#2f2a24', fill = '#f7f1e3') {
  const r = 28; g.clearRect(0, 0, w, h);
  g.fillStyle = 'rgba(47,42,36,.18)'; round(g, 10, 14, w - 16, h - 18, r); g.fill();
  g.fillStyle = fill; round(g, 6, 6, w - 16, h - 18, r); g.fill();
  g.strokeStyle = ink; g.lineWidth = 5; round(g, 6, 6, w - 16, h - 18, r); g.stroke();
}
export function round(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
