const colors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F1948A', '#82E0AA', '#F8C471', '#AED6F1', '#A9CCE3',
  '#D7BDE2', '#A3E4D7', '#FAD7A0', '#A9DFBF', '#FADBD8',
  '#D5D8DC', '#7FB3D3', '#76D7C4', '#F9E79F', '#E59866',
];

// Projets : patternIndexes = positions dans la tuile 5×5 (row%5 * 5 + col%5)
// Chaque case montre une capture plein cadre du projet (plus de mockup) :
//   image         paysage 1600×1000 (16:10), pour les fenêtres plus larges que hautes
//   imagePortrait 740×1600, pour les fenêtres nettement plus hautes que larges (ratio ≤ 3/5, téléphone ; une tablette garde les cases paysage)
//   ton           teinte de la zone haut droite de la capture : le header passe en blanc
//                 quand l'ouverture d'un projet « sombre » couvre l'écran
//   tonPortrait   idem pour la variante portrait, si elle diffère (Redstone)
//                 (tons mesurés le 2026-10-05 sur le quart haut droit : Dugos 71/255,
//                 Queen 130, Passage Secret 31 = sombre ; Ethikwear 194, Unik 148,
//                 Redstone paysage 226 = clair ; Hecto 48 paysage, 55 portrait = sombre, mesuré le 2026-10-07)
//   position      cadrage optionnel de cover (défaut : center)
const projects = [
  {
    patternIndexes: [1, 13, 24],
    image: './Ethikwear/web/ethikwear-vitrine-plein.jpg',
    imagePortrait: './Ethikwear/web/ethikwear-vitrine-portrait.jpg',
    ton: 'clair',
    url: './Ethikwear/index.html'
  },
  {
    patternIndexes: [5, 19, 22],
    image: './redstone/web/redstone-vitrine-plein.jpg',
    imagePortrait: './redstone/web/redstone-vitrine-portrait.jpg',
    ton: 'clair',
    tonPortrait: 'sombre',   // le haut de la capture portrait est noir (mesuré)
    url: './redstone/index.html'
  },
  {
    patternIndexes: [3, 10, 18],
    image: './Unik/web/unik-vitrine-plein.jpg',
    imagePortrait: './Unik/web/unik-vitrine-portrait.jpg',
    ton: 'clair',
    url: './Unik/index.html'
  },
  {
    patternIndexes: [2, 9, 16],
    image: './dugos-photographie/web/dugos-vitrine-plein.jpg',
    imagePortrait: './dugos-photographie/web/dugos-vitrine-portrait.jpg',
    ton: 'sombre',
    url: './dugos-photographie/index.html'
  },
  {
    patternIndexes: [7, 11, 20],
    image: './Queen/web/queen-vitrine-plein.jpg',
    imagePortrait: './Queen/web/queen-vitrine-portrait.jpg',
    ton: 'sombre',
    url: './Queen/index.html'
  },
  {
    patternIndexes: [0, 12, 23],
    image: './passage-secret/web/passage-secret-hero.jpg',
    imagePortrait: './passage-secret/web/passage-secret-mobile.jpg',
    ton: 'sombre',
    url: './passage-secret/index.html'
  },
  {
    patternIndexes: [4, 6, 15],
    image: './relay/web/relay-vitrine-plein.jpg',
    imagePortrait: './relay/web/relay-vitrine-portrait.jpg',
    ton: 'sombre',           // vitrine : aplat noir avec logo, header blanc
    url: './relay/index.html'
  },
  {
    patternIndexes: [8, 14, 21],
    image: './hecto/web/hecto-vitrine-plein.jpg',
    imagePortrait: './hecto/web/hecto-vitrine-portrait.jpg',
    ton: 'sombre',           // logo sur aplat nuit (mesuré 48 et 55) : header blanc
    url: './hecto/index.html'
  },
];

// Orientation : sous le ratio 3/5 on affiche la variante portrait. Une seule
// des deux images est chargée par visiteur (le preloader et le clic lisent
// l'image effectivement affichée, via imageDe).
const portraitMQ = window.matchMedia('(max-aspect-ratio: 3/5)');
function imageDe(p) { return portraitMQ.matches ? p.imagePortrait : p.image; }
function tonDe(p) { return (portraitMQ.matches && p.tonPortrait) || p.ton; }
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
      media.style.backgroundImage = `url('${imageDe(project)}')`;
      media.style.backgroundPosition = project.position ?? 'center';
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

// Changement d'orientation (rotation de la tablette, redimensionnement) : les
// cases reprennent la variante qui convient
portraitMQ.addEventListener('change', () => {
  dimensionnerCases(); normalize(); render();
  cells.forEach(c => {
    if (c.projet === null) return;
    c.el.firstChild.style.backgroundImage = `url('${imageDe(projects[c.projet])}')`;
  });
});

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

// Cases en pixels entiers (arrondi au-dessus) : aucun sous-pixel, donc aucun
// trait entre deux cases. La tuile fait 5 cases, au moins un écran.
// Image entière, sans coupe (décision de Clément, 2026-10-05) : la case a le
// ratio de la capture, 16:10 en paysage, 740:1600 en portrait. La largeur suit
// la fenêtre (1/5), la hauteur en découle ; la tuile 5×5 n'a donc plus la
// hauteur de l'écran (62,5 % de la largeur en paysage).
function caseW() { return Math.ceil(window.innerWidth / 5); }
function caseH() {
  return Math.round(caseW() * (portraitMQ.matches ? 1600 / 740 : 10 / 16));
}
function tileW() { return 5 * caseW(); }
function tileH() { return 5 * caseH(); }
function dimensionnerCases() {
  const r = document.documentElement.style;
  r.setProperty('--cw', `${caseW()}px`);
  r.setProperty('--ch', `${caseH()}px`);
}
dimensionnerCases();
window.addEventListener('resize', () => { dimensionnerCases(); normalize(); render(); });

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
  grid.style.transform = `translate3d(${Math.round(posX)}px, ${Math.round(posY)}px, 0)`;
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
  const src = new URL(imageDe(projet), window.location.href).href;

  // Départ en transform et clip-path (pas de left / top / width / height : pas de
  // recalcul de mise en page, 60 images/s). Le calque est plein écran, l'image y est
  // dessinée à son cadrage final (cover plein écran). Au départ, la découpe épouse
  // la case et l'image est à l'échelle de la case : c'est le miroir exact du
  // recadrage d'arrivée de project.js, et la page reprend le même cover plein écran.
  const calque = document.createElement('div');
  calque.className = 'ouverture-calque';
  const img = new Image();
  img.alt = '';
  img.decoding = 'sync';
  img.src = src;                       // déjà en cache : c'est l'image de la case
  calque.appendChild(img);

  const partir = () => {
    const iw = img.naturalWidth, ih = img.naturalHeight;
    if (!iw) { window.location.href = url; return; }
    const s0 = Math.max(W / iw, H / ih);
    const w0 = iw * s0, h0 = ih * s0;
    const x0 = (W - w0) / 2, y0 = (H - h0) / 2;
    // L'image dans la case, en cover (la case a le ratio de la capture : entière)
    const s1 = Math.max(r.width / iw, r.height / ih);
    const w1 = iw * s1, h1 = ih * s1;
    const x1 = r.left + (r.width - w1) / 2, y1 = r.top + (r.height - h1) / 2;

    Object.assign(img.style, { width: w0 + 'px', height: h0 + 'px', transformOrigin: '0 0' });
    document.body.appendChild(calque);

    // Profondeur : le calque part à .55 comme la case au repos et monte à 1
    // (sur tactile, le clic est le passage au premier plan)
    calque.animate([{ opacity: 0.55 }, { opacity: 1 }], { duration: 250, easing: 'ease', fill: 'forwards' });

    // Capture sombre en haut à droite : le header passe en blanc à mi-course
    const duree = W < 768 ? 750 : 850;
    if (tonDe(projet) === 'sombre') setTimeout(() => { if (calque.isConnected) document.documentElement.classList.add('passage-sombre'); }, duree * 0.5);

    freinage = true;
    document.body.classList.add('ouvre');

    const IO = 'cubic-bezier(.7,0,.2,1)';
    img.animate(
      [{ transform: `translate(${x1}px, ${y1}px) scale(${w1 / w0})` }, { transform: `translate(${x0}px, ${y0}px)` }],
      { duration: duree, easing: IO, fill: 'forwards' }
    );
    calque.animate(
      [{ clipPath: `inset(${r.top}px ${W - r.right}px ${H - r.bottom}px ${r.left}px)` }, { clipPath: 'inset(0px 0px 0px 0px)' }],
      { duration: duree, easing: IO, fill: 'forwards' }
    ).finished.then(() => {
      try { sessionStorage.setItem('ouverture', JSON.stringify({ type: 'img', src, ton: tonDe(projet) })); } catch (e) { /* rien */ }
      window.location.href = url;
    });
  };
  (img.decode ? img.decode() : Promise.resolve()).then(partir, partir);
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
  document.documentElement.classList.remove('passage-sombre');
  wrapper.getAnimations().forEach(a => a.cancel());
  freinage = false;
  ouvertureEnCours = false;
});

// Interface pour le preloader (preloader.js) : figer la grille, puis relancer la dérive
window.Works = {
  grid,
  projects,
  cells,
  imageDe,
  caseW,
  caseH,
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
