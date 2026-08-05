import { cos_sim } from 'smart-utils/cos_sim.js';

/** @typedef {number[]|Float32Array} NumericVector */

/**
 * Fast string hash -> [0,1).
 * @param {string} [str]
 * @returns {number}
 */
export function hash_to_unit(str = '') {
  let h = 2166136261 >>> 0; // FNV-1a base
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // xorshift mix
  h += h << 13; h ^= h >>> 7; h += h << 3; h ^= h >>> 17; h += h << 5;
  return ((h >>> 0) / 0xFFFFFFFF);
}

/**
 * Deterministic angle from a string key in [0, 2π).
 * @param {string} [key]
 * @param {number} [offset]
 * @returns {number}
 */
export function seeded_angle(key = '', offset = -Math.PI / 2) {
  const seed = hash_to_unit(key);
  return offset + seed * Math.PI * 2;
}

/**
 * Normalize numeric scores to 0..1. Returns {norm, min, max}.
 * @param {number[]} [scores]
 * @returns {{norm: number[], min: number, max: number}}
 */
export function normalize_scores(scores = []) {
  const vals = scores.map((s) => (Number.isFinite(s) ? +s : null));
  const present = vals.filter((v) => v !== null);
  if (!present.length) {
    return { norm: vals.map(() => 0.5), min: 0, max: 1 };
  }
  const min = Math.min(...present);
  const max = Math.max(...present);
  const den = (max - min) || 1;
  const norm = vals.map((v) => (v === null ? 0.5 : (v - min) / den));
  return { norm, min, max };
}

/**
 * Map normalized score t (0..1, higher=better) to a radial distance (px).
 * Higher scores -> closer to center.
 * @param {number} t
 * @param {number} min_r
 * @param {number} max_r
 * @returns {number}
 */
export function score_to_radius(t, min_r, max_r) {
  const tt = Math.max(0, Math.min(1, Number(t) || 0));
  return Math.round(min_r + (1 - tt) * (max_r - min_r));
}

/**
 * @param {unknown} v
 * @returns {boolean}
 */
export function is_vec(v) {
  return (Array.isArray(v) || ArrayBuffer.isView(v))
    && /** @type {ArrayLike<number>} */ (v).length > 0
  ;
}
/**
 * @param {NumericVector} [a]
 * @returns {number}
 */
export function norm(a = []) {
  let s = 0;
  for (let i = 0; i < a.length; i++) { const x = a[i] || 0; s += x * x; }
  return Math.sqrt(s);
}
/**
 * @param {NumericVector} [a]
 * @returns {NumericVector|null}
 */
export function to_unit(a = []) {
  const n = norm(a);
  if (!Number.isFinite(n) || n === 0) return null;
  return a.map((x) => x / n);
}
/**
 * @param {NumericVector[]} [vectors]
 * @returns {NumericVector|null}
 */
export function mean_unit(vectors = []) {
  if (!vectors.length) return null;
  const dim = vectors[0].length;
  const acc = /** @type {number[]} */ (new Array(dim).fill(0));
  let c = 0;
  for (const v of vectors) {
    if (!v) continue;
    for (let i = 0; i < dim; i++) acc[i] += v[i] || 0;
    c++;
  }
  if (!c) return null;
  const m = acc.map((x) => x / c);
  return to_unit(m);
}
/**
 * @param {number} seed_int
 * @returns {() => number}
 */
export function prng_from_seed(seed_int) {
  let a = seed_int >>> 0;
  return function rand() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * k-means++ over unit vectors with cosine similarity.
 * Returns { centers, assign, sims } with centers as unit vectors.
 * @param {NumericVector[]} [vecs]
 * @param {number} [k]
 * @param {number} [max_iter]
 * @param {number} [seed]
 * @returns {{centers: NumericVector[], assign: number[], sims: number[]}}
 */
export function kmeans_cosine_unit(vecs = [], k = 4, max_iter = 100, seed = 1337) {
  const xs = vecs.map((v) => (v ? to_unit(v) : null));
  const idx = xs.map((v, i) => v ? i : -1).filter((i) => i >= 0);
  const m = idx.length;
  if (m === 0) return { centers: [], assign: new Array(vecs.length).fill(-1), sims: new Array(vecs.length).fill(0) };

  const rand = prng_from_seed(seed);

  const D = /** @type {number[]} */ (new Array(m).fill(1));
  /** @type {NumericVector[]} */
  const centers = [];

  // choose first center
  centers.push(xs[idx[Math.floor(rand() * m)]]);

  // choose next centers by k-means++
  while (centers.length < Math.min(k, m)) {
    for (let ii = 0; ii < m; ii++) {
      const v = xs[idx[ii]];
      let best = -Infinity;
      for (const c of centers) {
        const s = cos_sim(v, c);
        if (s > best) best = s;
      }
      const d = 1 - Math.max(0, Math.min(1, best));
      D[ii] = d * d;
    }
    const sumD = D.reduce((a, b) => a + b, 0) || 1;
    let r = rand() * sumD;
    let chosen = 0;
    for (let ii = 0; ii < m; ii++) {
      r -= D[ii];
      if (r <= 0) { chosen = ii; break; }
    }
    centers.push(xs[idx[chosen]]);
  }

  // iterate
  let assign = /** @type {number[]} */ (new Array(m).fill(-1));
  let sims = /** @type {number[]} */ (new Array(m).fill(0));
  for (let it = 0; it < max_iter; it++) {
    let changed = false;
    // assign
    for (let ii = 0; ii < m; ii++) {
      const v = xs[idx[ii]];
      let best_c = 0, best_s = -Infinity;
      for (let c = 0; c < centers.length; c++) {
        const s = cos_sim(v, centers[c]);
        if (s > best_s) { best_s = s; best_c = c; }
      }
      if (assign[ii] !== best_c) { assign[ii] = best_c; changed = true; }
      sims[ii] = Math.max(0, Math.min(1, best_s));
    }
    // recompute centers
    const buckets = /** @type {NumericVector[][]} */ (centers.map(() => []));
    for (let ii = 0; ii < m; ii++) buckets[assign[ii]].push(xs[idx[ii]]);
    const next = /** @type {Array<NumericVector|null>} */ (centers.map((_, c) => mean_unit(buckets[c])));
    for (let c = 0; c < centers.length; c++) {
      if (!next[c]) next[c] = centers[c];
      centers[c] = next[c];
    }
    if (!changed) break;
  }

  // map back
  const full_assign = /** @type {number[]} */ (new Array(vecs.length).fill(-1));
  const full_sims = /** @type {number[]} */ (new Array(vecs.length).fill(0));
  for (let j = 0; j < m; j++) {
    full_assign[idx[j]] = assign[j];
    full_sims[idx[j]] = sims[j];
  }
  return { centers, assign: full_assign, sims: full_sims };
}

/**
 * Compute four quadrant anchors around (cx, cy) at radii per cluster.
 * @param {number} cx
 * @param {number} cy
 * @param {number[]} [radii]
 * @returns {Array<{x: number, y: number}>}
 */
export function quadrant_anchors(cx, cy, radii = [100, 100, 100, 100]) {
  const angs = [Math.PI / 4, 3 * Math.PI / 4, 5 * Math.PI / 4, 7 * Math.PI / 4];
  return angs.map((ang, i) => {
    const r = radii[i] ?? radii[radii.length - 1] ?? 100;
    return { x: Math.round(cx + r * Math.cos(ang)), y: Math.round(cy + r * Math.sin(ang)) };
  });
}

/**
 * Strength for radial force: nodes already close to center (small ring_r) get
 * a slightly higher attraction to their target radius so they settle quickly.
 * @param {number} ring_r
 * @param {number} min_r
 * @param {number} max_r
 * @returns {number}
 */
export function radial_strength_for(ring_r, min_r, max_r) {
  if (!Number.isFinite(ring_r) || !Number.isFinite(min_r) || !Number.isFinite(max_r) || min_r >= max_r) {
    return 0.45;
  }
  const t = 1 - ((ring_r - min_r) / (max_r - min_r)); // 0..1, higher near center
  return 0.45 + 0.55 * Math.max(0, Math.min(1, t));     // 0.45..1.0
}

/**
 * Compute min/outer radii from size.
 * outer_r is exactly 45% of width by design to satisfy WDLL.
 * @param {number} width
 * @param {number} height
 * @param {number} [padding]
 * @returns {{min_r: number, outer_r: number, half_min: number}}
 */
export function compute_radii(width, height, padding = 24) {
  const w = Math.max(1, Number(width) || 100);
  const h = Math.max(1, Number(height) || w);
  const half_min = Math.min(w, h) / 2;
  const min_r_base = Math.round(half_min * 0.18);
  const min_r = Math.max(12, min_r_base);
  const outer_r_exact = Math.round(w * 0.45);
  const outer_r = Math.max(min_r + 8, outer_r_exact);
  return { min_r, outer_r, half_min };
}

/**
 * Compact a string to the provided limit by collapsing the middle.
 * @param {string} text
 * @param {number} max
 * @returns {string}
 */
export function truncate_middle(text = '', max = 70) {
  const str = String(text ?? '');
  const limit = Math.max(0, Number.isFinite(max) ? Math.floor(max) : 0);
  if (!limit) return '';
  if (str.length <= limit) return str;
  if (limit <= 3) return str.slice(0, limit);
  const ellipsis = '…';
  const available = limit - ellipsis.length;
  const front = Math.ceil(available / 2);
  const back = available - front;
  return `${str.slice(0, front)}${ellipsis}${str.slice(str.length - back)}`;
}

/**
 * Compute the anchor and offset for a label relative to a node while keeping it within bounds.
 * @param {number} node_x
 * @param {{center_x?: number, label_width?: number, view_width?: number, radius?: number, margin?: number}} ctx
 * @returns {{anchor: 'start' | 'end', offset: number}}
 */
export function label_anchor_offset(node_x, ctx = {}) {
  const {
    center_x = 0,
    label_width = 0,
    view_width = 0,
    radius = 0,
    margin = 10,
  } = ctx;
  const safe_margin = Math.max(2, margin);
  const boundary_min = safe_margin;
  const boundary_max = Math.max(boundary_min, view_width - safe_margin);
  const anchor = node_x >= center_x ? 'start' : 'end';
  const base = radius + safe_margin;

  if (anchor === 'start') {
    let offset = base;
    let abs_start = node_x + offset;
    let abs_end = abs_start + label_width;
    if (abs_end > boundary_max) {
      const delta = abs_end - boundary_max;
      offset -= delta;
      abs_start -= delta;
    }
    if (abs_start < boundary_min) {
      offset += boundary_min - abs_start;
    }
    return { anchor, offset };
  }

  let offset = -base;
  let abs_end = node_x + offset;
  let abs_start = abs_end - label_width;
  if (abs_start < boundary_min) {
    const delta = boundary_min - abs_start;
    offset += delta;
    abs_end += delta;
  }
  if (abs_end > boundary_max) {
    offset -= abs_end - boundary_max;
  }
  return { anchor, offset };
}

/**
 * Determine whether a graph node can show hover preview.
 * @param {{item?: {collection_key?: string, key?: string}, isCenter?: boolean}} node
 * @returns {boolean}
 */
export function is_hover_preview_eligible(node = {}) {
  if (!node || node.isCenter) return false;
  const item = node.item;
  if (!item) return false;
  return Boolean(item.collection_key && item.key);
}

/**
 * Resolve a draggable item from a graph node.
 * @param {{item?: import('jsbrains/smart-types/index.js').ConnectionItem}} node
 * @returns {import('jsbrains/smart-types/index.js').ConnectionItem|null}
 */
export function resolve_drag_item(node = {}) {
  const item = node?.item;
  if (!item) return null;
  if (!item.collection_key || !item.key) return null;
  if (!item.env?.obsidian_app) return null;
  return item;
}

/**
 * Project a target anchor (ax, ay) to lie on the ring with radius r around (cx, cy).
 * This lets cluster forces steer angularly while preserving radial distance.
 * @param {number} cx
 * @param {number} cy
 * @param {number} ax
 * @param {number} ay
 * @param {number} r
 * @returns {{x: number, y: number}}
 */
export function project_anchor_to_ring(cx, cy, ax, ay, r) {
  const dx = ax - cx;
  const dy = ay - cy;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  return {
    x: Math.round(cx + ux * r),
    y: Math.round(cy + uy * r),
  };
}
