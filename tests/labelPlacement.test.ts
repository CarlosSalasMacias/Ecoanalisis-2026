import { describe, expect, it } from 'vitest';
import { placeLabels, Box } from '../components/labelPlacement';
import { createRng } from '../services/stats/random';

const overlap = (a: Box, b: Box) => Math.min(a.x1, b.x1) > Math.max(a.x0, b.x0) && Math.min(a.y1, b.y1) > Math.max(a.y0, b.y0);
const bounds = { x0: 40, y0: 4, x1: 596, y1: 456 };

describe('CCA label placement', () => {
  // 25 especies apiñadas cerca del centro, como en un CCA con muchas especies generalistas.
  const rng = createRng(7);
  const pts = Array.from({ length: 25 }, (_, i) => ({ x: 300 + (rng() - 0.5) * 60, y: 250 + (rng() - 0.5) * 40, name: `Especie ${i + 1}` }));
  const labels = pts.map((p, i) => ({ id: String(i), text: p.name, px: p.x, py: p.y, width: 55, height: 12 }));
  const res = placeLabels({
    labels,
    points: pts.map(p => ({ x: p.x, y: p.y, r: 3 })),
    segments: [{ x1: 300, y1: 250, x2: 420, y2: 330 }, { x1: 300, y1: 250, x2: 180, y2: 320 }],
    bounds,
    center: { x: 300, y: 250 },
  });

  it('no two labels overlap, even in a dense cluster', () => {
    for (let i = 0; i < res.length; i++) for (let j = i + 1; j < res.length; j++) {
      expect(overlap(res[i].box, res[j].box), `${i} vs ${j}`).toBe(false);
    }
    expect(res.every(r => !r.overlaps)).toBe(true);
  });

  it('labels stay inside the drawing area and never cover their own point', () => {
    res.forEach((r, i) => {
      expect(r.box.x0).toBeGreaterThanOrEqual(bounds.x0);
      expect(r.box.x1).toBeLessThanOrEqual(bounds.x1);
      expect(r.box.y0).toBeGreaterThanOrEqual(bounds.y0);
      expect(r.box.y1).toBeLessThanOrEqual(bounds.y1);
      const p = labels[i];
      expect(p.px > r.box.x0 && p.px < r.box.x1 && p.py > r.box.y0 && p.py < r.box.y1).toBe(false);
    });
  });

  it('labels do not cover other points', () => {
    res.forEach((r, i) => pts.forEach((p, k) => {
      if (k !== i) expect(p.x > r.box.x0 && p.x < r.box.x1 && p.y > r.box.y0 && p.y < r.box.y1, `label ${i} on point ${k}`).toBe(false);
    }));
  });

  it('an isolated point keeps its label right next to it (no connector needed)', () => {
    const [r] = placeLabels({ labels: [{ id: 'a', text: 'Aln acu', px: 500, py: 100, width: 40, height: 12 }], points: [], segments: [], bounds, center: { x: 300, y: 250 } });
    expect(r.distance).toBeLessThan(6);
  });
});

describe('CCA label placement: crowded centre crossed by arrows (as in field data)', () => {
  // Origen en (530, 375), como en el gráfico de campo; 3 flechas casi paralelas hacia abajo a la izquierda.
  const O = { x: 530, y: 375 };
  const arrows = [
    { x1: O.x, y1: O.y, x2: 335, y2: 475 }, { x1: O.x, y1: O.y, x2: 340, y2: 478 }, { x1: O.x, y1: O.y, x2: 345, y2: 470 },
    { x1: O.x, y1: O.y, x2: 660, y2: 432 }, { x1: O.x, y1: O.y, x2: 500, y2: 560 },
  ];
  const rng = createRng(11);
  const cloud = Array.from({ length: 40 }, () => ({ x: O.x + (rng() - 0.4) * 110, y: O.y + (rng() - 0.5) * 70 }));
  const names = ['O. pyramidale', 'A. arborescens', 'G. spinosa', 'E. ruizii', 'C. vitifolium', 'C. lutea', 'L. trichodes', 'S. mollissima', 'Capparis sp.', 'Senna sp.'];
  const labelled = cloud.slice(0, names.length);
  const b = { x0: 44, y0: 4, x1: 796, y1: 600 };
  const res = placeLabels({
    labels: labelled.map((p, i) => ({ id: names[i], text: names[i], px: p.x, py: p.y, width: names[i].length * 6, height: 12 })),
    points: cloud.map(p => ({ x: p.x, y: p.y, r: 3 })),
    segments: arrows,
    bounds: b,
    center: O,
  });

  it('every label finds a free position (no label, point or arrow covered)', () => {
    res.forEach(r => expect(r.overlaps, r.id).toBe(false));
    for (let i = 0; i < res.length; i++) for (let j = i + 1; j < res.length; j++) expect(overlap(res[i].box, res[j].box)).toBe(false);
  });
});
