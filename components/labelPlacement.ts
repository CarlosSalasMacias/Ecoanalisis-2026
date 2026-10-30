/**
 * Colocación de etiquetas sin superposición para el biplot del CCA.
 *
 * Cada etiqueta se coloca por turnos (primero las flechas ambientales, luego las especies más
 * abundantes). Para cada una se prueban posiciones alrededor de su punto, a distancias crecientes y
 * en 24 direcciones, empezando por la dirección que se aleja del centro del gráfico. Se elige la
 * posición más cercana que no tape otras etiquetas ya colocadas, puntos, flechas ni bordes; si
 * ninguna está libre, la que menos superposición tiene. Cuando la etiqueta queda lejos de su punto,
 * se dibuja un conector hasta el borde más cercano de la etiqueta.
 */

export interface Box { x0: number; y0: number; x1: number; y1: number }

export interface LabelRequest {
  id: string;
  text: string;
  /** Posición del punto (o punta de la flecha) en píxeles. */
  px: number;
  py: number;
  width: number;
  height: number;
  /** Dirección preferida (por ejemplo, la de la flecha); por defecto, alejándose del centro. */
  preferredAngle?: number;
}

export interface PlacedLabel {
  id: string;
  box: Box;
  /** Punto del borde de la etiqueta más cercano al punto (extremo del conector). */
  connectorEnd: { x: number; y: number };
  /** Distancia entre el punto y la etiqueta (px). */
  distance: number;
  /** true si no hubo ninguna posición libre y la etiqueta se superpone con algo. */
  overlaps: boolean;
}

export interface PlacementInput {
  labels: LabelRequest[];
  /** Puntos dibujados (sitios y especies) que las etiquetas no deben tapar. */
  points: { x: number; y: number; r: number }[];
  /** Segmentos dibujados (flechas). */
  segments: { x1: number; y1: number; x2: number; y2: number }[];
  /** Zonas reservadas (textos fijos del gráfico). */
  reserved?: Box[];
  /** Área donde pueden ir las etiquetas. */
  bounds: Box;
  /** Centro del gráfico, para orientar las etiquetas hacia afuera. */
  center: { x: number; y: number };
}

const RADII = [3, 8, 14, 22, 32, 44, 58, 74, 92, 115, 140, 170, 205, 245, 290];
const N_ANGLES = 24;

const area = (a: Box, b: Box) =>
  Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));

const pad = (b: Box, p: number): Box => ({ x0: b.x0 - p, y0: b.y0 - p, x1: b.x1 + p, y1: b.y1 + p });

/** ¿Cruza el segmento la caja? (Liang–Barsky) */
const segmentHitsBox = (s: { x1: number; y1: number; x2: number; y2: number }, b: Box): boolean => {
  let t0 = 0, t1 = 1;
  const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
  const clip = (p: number, q: number) => {
    if (p === 0) return q >= 0;
    const r = q / p;
    if (p < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; }
    return true;
  };
  return clip(-dx, s.x1 - b.x0) && clip(dx, b.x1 - s.x1) && clip(-dy, s.y1 - b.y0) && clip(dy, b.y1 - s.y1) && t0 <= t1;
};

/** Caja de la etiqueta cuando su lado más cercano al punto está en (cx, cy), en la dirección `angle`. */
const boxAt = (cx: number, cy: number, angle: number, w: number, h: number): Box => {
  const c = Math.cos(angle), s = Math.sin(angle);
  // Desplazamiento horizontal: a la derecha empieza en cx, a la izquierda termina en cx, en el medio se centra.
  const x0 = c > 0.38 ? cx : c < -0.38 ? cx - w : cx - w / 2;
  const y0 = s > 0.38 ? cy : s < -0.38 ? cy - h : cy - h / 2;
  return { x0, y0, x1: x0 + w, y1: y0 + h };
};

const nearestOnBox = (x: number, y: number, b: Box) => ({
  x: Math.min(Math.max(x, b.x0), b.x1),
  y: Math.min(Math.max(y, b.y0), b.y1),
});

export function placeLabels(input: PlacementInput): PlacedLabel[] {
  const { labels, points, segments, bounds, center } = input;
  const placed: Box[] = [...(input.reserved ?? [])];
  const out: PlacedLabel[] = [];

  for (const L of labels) {
    const base = L.preferredAngle ?? Math.atan2(L.py - center.y, L.px - center.x);
    const angles = Array.from({ length: N_ANGLES }, (_, k) => {
      // Orden: dirección preferida y luego alternando a cada lado.
      const step = Math.ceil(k / 2) * (k % 2 ? 1 : -1);
      return base + (step * 2 * Math.PI) / N_ANGLES;
    });

    let best: { box: Box; cost: number; dist: number; total: number } | null = null;
    for (const r of RADII) {
      for (const a of angles) {
        const box = boxAt(L.px + r * Math.cos(a), L.py + r * Math.sin(a), a, L.width, L.height);
        // Fuera del área permitida: descartada.
        if (box.x0 < bounds.x0 || box.x1 > bounds.x1 || box.y0 < bounds.y0 || box.y1 > bounds.y1) continue;
        const padded = pad(box, 1.5);
        let cost = 0;
        for (const p of placed) cost += 1000 * area(padded, p);
        for (const q of points) {
          // Su propio punto se excluye.
          if (Math.abs(q.x - L.px) < 0.01 && Math.abs(q.y - L.py) < 0.01) continue;
          cost += 40 * area(padded, { x0: q.x - q.r, y0: q.y - q.r, x1: q.x + q.r, y1: q.y + q.r });
        }
        for (const s of segments) {
          // La flecha cuya punta es este punto cuenta, salvo sus últimos 10 px (la etiqueta va junto a la punta).
          let seg = s;
          if (Math.abs(s.x2 - L.px) < 0.01 && Math.abs(s.y2 - L.py) < 0.01) {
            const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
            if (len <= 10) continue;
            const f = (len - 10) / len;
            seg = { x1: s.x1, y1: s.y1, x2: s.x1 + (s.x2 - s.x1) * f, y2: s.y1 + (s.y2 - s.y1) * f };
          }
          if (segmentHitsBox(seg, padded)) cost += 300;
        }
        // Su propio punto no debe quedar dentro de la etiqueta.
        if (L.px > box.x0 && L.px < box.x1 && L.py > box.y0 && L.py < box.y1) cost += 5000;
        const end = nearestOnBox(L.px, L.py, box);
        const dist = Math.hypot(end.x - L.px, end.y - L.py);
        const total = cost + dist * 0.5;
        if (!best || total < best.total) best = { box, cost, dist, total };
      }
      // La primera distancia con alguna posición libre gana: no se buscan posiciones más lejanas.
      if (best && best.cost === 0) break;
    }
    if (!best) {
      // Ninguna posición cabe en el área: se deja junto al punto.
      const box = boxAt(L.px + 4, L.py, 0, L.width, L.height);
      best = { box, cost: Infinity, dist: 4, total: Infinity };
    }
    placed.push(best.box);
    out.push({
      id: L.id,
      box: best.box,
      connectorEnd: nearestOnBox(L.px, L.py, best.box),
      distance: best.dist,
      overlaps: best.cost > 0,
    });
  }
  return out;
}

/** Ancho del texto en píxeles (usa el lienzo del navegador si existe; si no, una estimación). */
export const measureText = (() => {
  let ctx: CanvasRenderingContext2D | null | undefined;
  return (text: string, fontSize: number, italic = false, bold = false): number => {
    if (ctx === undefined) {
      try { ctx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null; } catch { ctx = null; }
    }
    if (ctx) {
      ctx.font = `${italic ? 'italic ' : ''}${bold ? '600 ' : ''}${fontSize}px sans-serif`;
      return ctx.measureText(text).width;
    }
    return text.length * fontSize * (bold ? 0.6 : 0.55);
  };
})();
