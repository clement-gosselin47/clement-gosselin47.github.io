const colors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F1948A', '#82E0AA', '#F8C471', '#AED6F1', '#A9CCE3',
  '#D7BDE2', '#A3E4D7', '#FAD7A0', '#A9DFBF', '#FADBD8',
  '#D5D8DC', '#7FB3D3', '#76D7C4', '#F9E79F', '#E59866',
];

// Projets : patternIndexes = positions dans la tuile 5×5 (row%5 * 5 + col%5)
// Vitrines : web/<projet>-vitrine.webp, toutes en 4:3 (1600×1200) sur le même
// gabarit et à la même échelle : plus besoin de zoom correctif (scale 1 partout).
const projects = [
  {
    patternIndexes: [1, 13, 24],
    image: './Ethikwear/web/ethikwear-vitrine.webp',
    url: './Ethikwear/index.html'
  },
  {
    patternIndexes: [5, 19, 22],
    image: './redstone/web/redstone-vitrine.webp',
    url: './redstone/index.html'
  },
  {
    patternIndexes: [3, 10, 18],
    image: './Unik/web/unik-vitrine.webp',
    url: './Unik/index.html'
  },
  {
    patternIndexes: [2, 9, 16],
    image: './dugos-photographie/web/dugos-vitrine.webp',
    url: './dugos-photographie/index.html'
  },
];
const projectMap = {};
projects.forEach(p => p.patternIndexes.forEach(idx => { projectMap[idx] = p; }));

const grid    = document.getElementById('grid');
const wrapper = document.querySelector('.wrapper');

// Toutes les cases, avec leur position et l'index de leur projet (null = case pastel).
// Le preloader s'en sert pour assembler les 25 cases visibles en 0,0.
const cells = [];

for (let row = 0; row < 15; row++) {
  for (let col = 0; col < 15; col++) {
    const cell = document.createElement('div');
    const patternIndex = (row % 5) * 5 + (col % 5);
    const project = projectMap[patternIndex] ?? null;

    cell.className = 'cell';

    cells.push({ el: cell, row, col, projet: project ? projects.indexOf(project) : null });

    if (project) {
      const media = document.createElement('div');
      media.className = 'cell-media';
      media.style.backgroundImage = `url('${project.image}')`;
      media.style.backgroundSize = project.backgroundSize ?? 'cover';
      media.style.backgroundPosition = 'center';
      media.style.transform = `scale(${project.scale ?? 1})`;
      cell.appendChild(media);
      cell.dataset.url = project.url;
      cell.dataset.cur = 'Voir';            // mot du curseur contextuel (shared.js)
      cell.classList.add('project-cell');
    } else {
      cell.style.background = colors[patternIndex];
    }

    grid.appendChild(cell);
  }
}

let posX = 0, posY = 0;
let enPause = false;     // grille figée en 0,0 pendant l'assemblage du preloader
let rampeDebut = null;   // reprise de la dérive : 0 → 0,6 px/frame en 800 ms
let isDragging = false;
let lastX = 0, lastY = 0;
let started = true;
let freinage = false;    // ouverture d'un projet : la dérive s'arrête (vitesse × 0,8 par frame)

let dragStartX = 0, dragStartY = 0, dragDistance = 0;

const FRICTION    = 0.92;
const DRIFT_SPEED = 0.6;

// Direction aléatoire à chaque chargement
const angle = Math.random() * Math.PI * 2;
let driftNX = Math.cos(angle), driftNY = Math.sin(angle);
let velX = driftNX * DRIFT_SPEED;
let velY = driftNY * DRIFT_SPEED;

function tileW() { return window.innerWidth; }
function tileH() { return window.innerHeight; }

function normalize() {
  posX = posX % tileW(); if (posX > 0) posX -= tileW();
  posY = posY % tileH(); if (posY > 0) posY -= tileH();
}

const speedBlur = document.getElementById('speedBlur');

function updateBlur(speed) {
  const blur = Math.min(speed * 0.28, 7);
  speedBlur.style.setProperty('--edge-blur', `${blur.toFixed(2)}px`);
}

function render() {
  grid.style.transform = `translate(${posX}px, ${posY}px)`;
  updateBlur(Math.hypot(velX, velY));
}

// Vitesse de dérive minimale ; pendant la reprise après le preloader elle
// monte de 0 à DRIFT_SPEED en 800 ms (ease-in)
function driftMin() {
  if (rampeDebut === null) return DRIFT_SPEED;
  const t = Math.min((performance.now() - rampeDebut) / 800, 1);
  if (t === 1) rampeDebut = null;
  return DRIFT_SPEED * t * t;
}

(function loop() {
  if (freinage) {
    velX *= 0.8;
    velY *= 0.8;
    posX += velX;
    posY += velY;
    normalize();
    render();
  } else if (started && !isDragging && !enPause) {
    const speed = Math.hypot(velX, velY);

    if (speed > 1) {
      driftNX = velX / speed;
      driftNY = velY / speed;
    }

    velX *= FRICTION;
    velY *= FRICTION;

    const min = driftMin();
    if (Math.hypot(velX, velY) < min) {
      velX = driftNX * min;
      velY = driftNY * min;
    }

    posX += velX;
    posY += velY;
    normalize();
    render();
  }
  requestAnimationFrame(loop);
})();

// Mouse drag
wrapper.addEventListener('mousedown', (e) => {
  isDragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
  dragStartX = e.clientX;
  dragStartY = e.clientY;
  dragDistance = 0;
  velX = 0; velY = 0;
  wrapper.classList.add('dragging');
});

window.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  dragDistance = Math.hypot(e.clientX - dragStartX, e.clientY - dragStartY);
  velX = (e.clientX - lastX) * 0.15;
  velY = (e.clientY - lastY) * 0.15;
  posX += velX;
  posY += velY;
  lastX = e.clientX;
  lastY = e.clientY;
  normalize();
  render();
});

window.addEventListener('mouseup', () => {
  if (!isDragging) return;
  isDragging = false;
  started = true;
  wrapper.classList.remove('dragging');
});

// Clic sur cellule projet (seulement si pas un drag)
wrapper.addEventListener('click', (e) => {
  if (dragDistance > 8) return;
  const cell = e.target.closest('.project-cell');
  if (cell && cell.dataset.url) {
    ouvrirProjet(cell);
  }
});

// Trackpad / wheel
window.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (enPause) return; // pas de défilement pendant l'assemblage
  velX = -e.deltaX * 0.15;
  velY = -e.deltaY * 0.15;
  posX += velX;
  posY += velY;
  normalize();
  render();
  started = true;
}, { passive: false });

// Touch
wrapper.addEventListener('touchstart', (e) => {
  lastX = e.touches[0].clientX;
  lastY = e.touches[0].clientY;
  dragStartX = lastX;
  dragStartY = lastY;
  dragDistance = 0;
  velX = 0; velY = 0;
});

wrapper.addEventListener('touchmove', (e) => {
  e.preventDefault();
  dragDistance = Math.hypot(e.touches[0].clientX - dragStartX, e.touches[0].clientY - dragStartY);
  velX = e.touches[0].clientX - lastX;
  velY = e.touches[0].clientY - lastY;
  posX += velX;
  posY += velY;
  lastX = e.touches[0].clientX;
  lastY = e.touches[0].clientY;
  normalize();
  render();
  started = true;
}, { passive: false });

wrapper.addEventListener('touchend', (e) => {
  if (dragDistance > 8) return;
  const touch = e.changedTouches[0];
  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  const cell = el && el.closest('.project-cell');
  if (cell && cell.dataset.url) {
    ouvrirProjet(cell);
  }
  started = true;
});

// Ouverture d'un projet (motion A.1) : la case cliquée grandit jusqu'à remplir
// l'écran, les autres s'effacent, puis on navigue. La page projet reprend la même
// image plein écran (Projets/ouverture.js) : aucun saut entre les deux pages.
let ouvertureEnCours = false;

function ouvrirProjet(cell) {
  if (ouvertureEnCours) return;
  const url = cell.dataset.url;
  const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let stockage = true;
  try { sessionStorage.setItem('_t', '1'); sessionStorage.removeItem('_t'); } catch (e) { stockage = false; }
  if (!stockage || !Element.prototype.animate) { window.location.href = url; return; }
  ouvertureEnCours = true;

  // Mouvement réduit : fondu de 200 ms vers le blanc, sans découpe
  if (reduit) {
    wrapper.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' })
      .finished.then(() => { window.location.href = url; });
    return;
  }

  // On mesure au clic : la grille bouge
  const r = cell.getBoundingClientRect();
  const W = window.innerWidth, H = window.innerHeight;
  const projet = projects.find(p => p.url === url);
  const src = new URL(projet.image, window.location.href).href;

  // Calque plein écran, ramené au rectangle de la case : même ratio que la
  // fenêtre, même image en cover, donc il recouvre la case à l'identique
  const calque = document.createElement('div');
  calque.className = 'ouverture-calque';
  calque.style.backgroundImage = `url('${src}')`;
  document.body.appendChild(calque);

  freinage = true;
  document.body.classList.add('ouvre');

  calque.animate(
    [{ transform: `translate(${r.left}px, ${r.top}px) scale(${r.width / W}, ${r.height / H})` },
     { transform: 'none' }],
    { duration: W < 768 ? 750 : 850, easing: 'cubic-bezier(.7,0,.2,1)', fill: 'forwards' }
  ).finished.then(() => {
    try { sessionStorage.setItem('ouverture', JSON.stringify({ type: 'img', src })); } catch (e) { /* rien */ }
    window.location.href = url;
  });
}

// Liens clavier (Projets/index.html) : Entrée ouvre le projet par la case
// visible la plus centrale, avec la même ouverture qu'au clic
document.querySelectorAll('.projets-clavier a').forEach(lien => {
  lien.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const cible = lien.href;
    const W = window.innerWidth, H = window.innerHeight;
    let meilleure = null, distance = Infinity;
    document.querySelectorAll('.project-cell').forEach(c => {
      if (new URL(c.dataset.url, window.location.href).href !== cible) return;
      const r = c.getBoundingClientRect();
      if (r.left < 0 || r.top < 0 || r.right > W || r.bottom > H) return;
      const d = Math.hypot(r.left + r.width / 2 - W / 2, r.top + r.height / 2 - H / 2);
      if (d < distance) { distance = d; meilleure = c; }
    });
    if (!meilleure) return;            // aucune case entière à l'écran : lien normal
    e.preventDefault();
    ouvrirProjet(meilleure);
  });
});

// Retour arrière du navigateur (page en cache) : la grille revient comme avant
window.addEventListener('pageshow', (e) => {
  if (!e.persisted) return;
  document.querySelectorAll('.ouverture-calque').forEach(c => c.remove());
  document.body.classList.remove('ouvre');
  wrapper.getAnimations().forEach(a => a.cancel());
  freinage = false;
  ouvertureEnCours = false;
});

// Interface pour le preloader (preloader.js) : figer la grille, puis relancer la dérive
window.Works = {
  grid,
  projects,
  cells,
  figer() {
    enPause = true;
    posX = 0; posY = 0;
    velX = 0; velY = 0;
    render();
  },
  reprendre() {
    rampeDebut = performance.now();
    velX = 0; velY = 0;
    enPause = false;
  },
  // Passages (shared.js) : la dérive s'arrête pendant un départ ou un contact ouvert
  freiner() {
    freinage = true;
  },
  relancer() {
    freinage = false;
  },
};
