import type {JanuaryBoardTheme} from '../templates/january-match';
import {rng} from '../templates/random';

export interface PrintMeta {
  day?: string;
  year?: number;
  title?: string;
  souvenir?: string;
}

/** Original procedural keepsake art. Render once, at tabletop resolution. */
export function makeFinalPrint(theme: JanuaryBoardTheme, meta?: PrintMeta) {
  const canvas = document.createElement('canvas');
  canvas.className = 'ml-january-print'; canvas.width = 640; canvas.height = 640; canvas.hidden = true;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label',
    theme === 'titan' ? '土卫六地表演绎全景，橙色天际线下布满圆石' :
    theme === 'press' ? '原创登记印样，三道红色墨线套印在编号纸上' :
    (meta?.title ?? '一月四号门') + '原创程序化纪念印样');
  const g = canvas.getContext('2d')!, random = rng(theme + '-' + (meta?.day ?? 'sheet'));
  if (theme === 'titan') {
    const sky = g.createLinearGradient(0, 0, 0, 550);
    sky.addColorStop(0, '#743f3d'); sky.addColorStop(0.62, '#dfa46c'); sky.addColorStop(1, '#f2c487');
    g.fillStyle = sky; g.fillRect(0, 0, 640, 640);
    for (let ridge = 0; ridge < 4; ridge++) {
      g.fillStyle = ['#c28d66', '#ba7955', '#a86848', '#9d6446'][ridge]; g.beginPath(); g.moveTo(0, 640);
      for (let x = 0; x <= 640; x += 16) g.lineTo(x, 279 + ridge * 39 + Math.sin(x / 97 + ridge) * 17 + random.range(-6, 6));
      g.lineTo(640, 640); g.closePath(); g.fill();
    }
    for (let row = 0; row < 10; row++) {
      for (let j = 0; j < 32 - row * 2; j++) {
        const x = random.range(0, 640), y = 329 + row * 31 + random.range(-8, 8), s = random.range(0.55, 1.6) * (row + 2);
        g.fillStyle = '#774e3a'; g.beginPath(); g.ellipse(x + 2, y + 2, s * 1.45, s * 0.50, 0.09, 0, Math.PI * 2); g.fill();
        g.fillStyle = j % 3 ? '#c4966b' : '#d6ad7f'; g.beginPath(); g.ellipse(x, y, s, s * 0.64, -0.21, 0, Math.PI * 2); g.fill();
      }
    }
    g.fillStyle = '#ffe6bc'; g.font = '24px Georgia,serif'; g.fillText('HUYGENS   /   14 · I · 2005', 35, 59);
    g.font = '14px sans-serif'; g.fillText('土 卫 六   ·   地 表 演 绎', 37, 88);
  } else if (theme === 'press') {
    g.fillStyle = '#ebddba'; g.fillRect(0, 0, 640, 640);
    for (let j = 0; j < 16000; j++) {
      g.fillStyle = j % 2 ? '#9e865729' : '#fffae145'; g.fillRect(random.range(0, 640), random.range(0, 640), 1, 2);
    }
    g.strokeStyle = '#847954'; g.lineWidth = 2; g.strokeRect(34, 34, 572, 572);
    g.fillStyle = '#473f35'; g.font = '22px Georgia,serif'; g.fillText('REGISTER     /     31 · I · 1893', 60, 88);
    g.fillStyle = '#675f51'; g.font = '16px sans-serif'; g.fillText('虚 构 印 样', 61, 121);
    g.strokeStyle = '#8e392d'; g.lineCap = 'round';
    for (let j = 0; j < 3; j++) {
      const x = 95 + j * 161;
      g.lineWidth = 8 + j * 2; g.beginPath(); g.moveTo(x, 411 - j * 14);
      g.bezierCurveTo(x + 14, 404, x + 32, 195, x + 82, 212 + j * 17);
      g.bezierCurveTo(x + 137, 240, x + 45, 359, x + 19, 322);
      g.bezierCurveTo(x + 8, 294, x + 107, 312, x + 144, 369 - j * 8); g.stroke();
    }
    g.fillStyle = '#675f51'; g.fillRect(60, 490, 520, 1); g.font = '18px Georgia,serif';
    g.fillText('登记记录     № 22406', 60, 538);
  } else {
    const dark = theme === 'aurora';
    const bg = g.createLinearGradient(0, 0, 0, 640);
    bg.addColorStop(0, dark ? '#16243d' : '#efe3c6');
    bg.addColorStop(1, dark ? '#2d5962' : '#d8c59e');
    g.fillStyle = bg; g.fillRect(0, 0, 640, 640);
    g.strokeStyle = dark ? '#7be3bc88' : '#7a684e'; g.lineWidth = 3; g.strokeRect(30, 30, 580, 580);
    for (let i = 0; i < 6; i++) {
      g.strokeStyle = dark ? `hsla(${155 + i * 18}, 68%, 68%, 0.45)` : `hsla(${22 + i * 24}, 42%, 44%, 0.35)`;
      g.lineWidth = 6 - i * 0.6; g.beginPath();
      for (let x = 64; x <= 576; x += 16) {
        const y = 320 + Math.sin(x / 58 + i * 0.9) * (48 + i * 11) + (i - 2.5) * 26;
        if (x === 64) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.stroke();
    }
    const months = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    const monthRoman = months[Math.max(0, Number((meta?.day ?? '0101').slice(0, 2)) - 1)] ?? 'I';
    const dayNum = Number((meta?.day ?? '0101').slice(2));
    g.fillStyle = dark ? '#f4e6c2' : '#3e362c';
    g.font = '22px Georgia,serif';
    g.fillText(`${dayNum} · ${monthRoman} · ${meta?.year ?? 2000}`, 56, 86);
    g.font = 'bold 30px sans-serif';
    g.fillText(meta?.title ?? '一月纪念印样', 56, 515);
    g.font = '18px sans-serif';
    g.fillStyle = dark ? '#a8e3d1' : '#6c5c49';
    g.fillText('纪念品 · ' + (meta?.souvenir ?? '手工样张'), 56, 558);
  }
  return canvas;
}
