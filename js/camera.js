import { state } from './state.js';
import { COLUMNS, ROWS } from './config.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function getTileSize() {
  const v = getComputedStyle(document.body).getPropertyValue('--tile-size').trim();
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 32;
}

function computeTransform() {
  const t = getTileSize();
  const mapW = COLUMNS * t;
  const mapH = ROWS * t;

  const vp = state.dom.viewport || state.dom.fieldElement.parentElement;
  if (!vp) return { tx: 0, ty: 0 };

  const vw = vp.clientWidth;
  const vh = vp.clientHeight;

  const p = state.playerPosition || { x: 0, y: 0 };
  const px = p.x * t + t / 2;
  const py = p.y * t + t / 2;

  // идеальный сдвиг, чтобы игрок был в центре
  let tx = Math.round(vw / 2 - px);
  let ty = Math.round(vh / 2 - py);

  // кромки карты: если карта меньше окна — центрируем карту,
  // если больше — не даём «пустым полям» появляться.
  if (mapW <= vw) {
    tx = Math.round((vw - mapW) / 2);
  } else {
    const minTx = vw - mapW, maxTx = 0;
    tx = clamp(tx, minTx, maxTx);
  }

  if (mapH <= vh) {
    ty = Math.round((vh - mapH) / 2);
  } else {
    const minTy = vh - mapH, maxTy = 0;
    ty = clamp(ty, minTy, maxTy);
  }

  return { tx, ty };
}

let raf = 0;
export function updateCamera() {
  const { tx, ty } = computeTransform();
  state.camera.tx = tx;
  state.camera.ty = ty;
  const f = state.dom.fieldElement;
  if (f) f.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
}

export function updateCameraRaf() {
  if (raf) return;
  raf = requestAnimationFrame(() => { raf = 0; updateCamera(); });
}

export function bindCamera() {
  // кешируем viewport (если есть)
  state.dom.viewport = document.querySelector('.viewport') || state.dom.fieldElement?.parentElement || null;

  // если обёртки нет — создадим на лету
  if (!state.dom.viewport && state.dom.fieldElement) {
    const vp = document.createElement('div');
    vp.className = 'viewport';
    const parent = state.dom.fieldElement.parentNode;
    parent.replaceChild(vp, state.dom.fieldElement);
    vp.appendChild(state.dom.fieldElement);
    state.dom.viewport = vp;
  }

  window.addEventListener('resize', updateCameraRaf);
  updateCamera();
}
