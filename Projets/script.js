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
//                 (tons mesurés le 2026-10-05 sur le quart haut droit : Queen 130,
//                 Passage Secret 31 = sombre ; Ethikwear 194, Unik 148,
//                 Redstone paysage 226 = clair ; Hecto 48 paysage, 55 portrait = sombre, mesuré le 2026-10-07 ;
//                 Dugos, vitrines au logo du 2026-10-24 : 32 paysage, 23 portrait = sombre)
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
    image: './dugos-photographie/web/dugos-logo-vitrine-plein.jpg',
    imagePortrait: './dugos-photographie/web/dugos-logo-vitrine-portrait.jpg',
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
  if (document.body.classList.contains('vue-liste')) return; // vue liste : molette amortie (module Liste)
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
  if (document.body.classList.contains('vue-liste')) return; // vue liste : le navigateur défile
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
// Depuis la vue liste, cell est le cadre fixe et srcForcee son image (toujours la
// variante paysage, même sur téléphone : décision 19 de 2026-10-23-accueil-liste).
let ouvertureEnCours = false;

function ouvrirProjet(cell, srcForcee) {
  if (ouvertureEnCours) return;
  const url = cell.dataset.url;
  const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Ce qui s'efface : la grille, ou la liste si c'est elle qui est affichée
  const scene = document.body.classList.contains('vue-liste') ? document.querySelector('.liste') : wrapper;
  let stockage = true;
  try { sessionStorage.setItem('_t', '1'); sessionStorage.removeItem('_t'); } catch (e) { stockage = false; }
  if (!stockage || !Element.prototype.animate) { window.location.href = url; return; }
  ouvertureEnCours = true;

  // Mouvement réduit : fondu de 200 ms vers le blanc, sans découpe
  if (reduit) {
    scene.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' })
      .finished.then(() => { window.location.href = url; });
    return;
  }

  // On mesure au clic : la grille bouge
  const r = cell.getBoundingClientRect();
  const W = window.innerWidth, H = window.innerHeight;
  const projet = projects.find(p => p.url === url);
  // Résolu sur l'adresse de base du document : la racine / déclare <base href="/Projets/">
  const src = new URL(srcForcee || imageDe(projet), document.baseURI).href;
  // Image imposée (liste) : c'est la paysage, donc son ton ; sinon celui de la variante affichée
  const ton = srcForcee ? projet.ton : tonDe(projet);

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

    // Capture sombre en haut à droite : le header passe en blanc à mi-course ; capture
    // claire : il passe en noir (l'accueil est sombre, son header est clair, 2026-10-24)
    const duree = W < 768 ? 750 : 850;
    setTimeout(() => { if (calque.isConnected) document.documentElement.classList.add(ton === 'sombre' ? 'passage-sombre' : 'passage-clair'); }, duree * 0.5);

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
      try { sessionStorage.setItem('ouverture', JSON.stringify({ type: 'img', src, ton })); } catch (e) { /* rien */ }
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
      if (new URL(c.dataset.url, document.baseURI).href !== cible) return;
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
  document.documentElement.classList.remove('passage-sombre', 'passage-clair');
  wrapper.getAnimations().forEach(a => a.cancel());
  freinage = false;
  ouvertureEnCours = false;
  if (window.Liste) window.Liste.rafraichir();   // vue liste : nom actif et cadre recalculés (décision 24)
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

/* ═══════════════════════════════════════════════════════════════
   Vue liste (2026-10-23-accueil-liste, direction.md)
   Seconde vue de Works, en plus de la grille qui reste la vue par défaut :
   les huit noms empilés, un seul au noir (celui qui coupe la ligne --ligne),
   un cadre fixe qui montre la capture du projet actif. La page défile par
   le navigateur ; la molette seule est amortie et un peu ralentie (second
   retour de Clément, 2026-10-23), tactile et clavier restent natifs.
   La liste boucle sans fin dans les deux sens (sixième retour) : les huit
   li du HTML sont recopiés au-dessus et au-dessous par ce script, et la page
   est recalée d'une période entière dès qu'elle s'éloigne de la copie
   d'origine, sans que rien ne bouge à l'écran.
   Mémoire de la vue en sessionStorage seulement : une nouvelle session arrive
   toujours sur la grille.
   ═══════════════════════════════════════════════════════════════ */
window.Liste = (function () {
  const liste = document.querySelector('.liste');
  const bouton = document.querySelector('.vue-toggle');
  if (!liste || !bouton) return null;

  const OUT = 'cubic-bezier(.16,1,.3,1)';   // entrées
  const IO  = 'cubic-bezier(.7,0,.2,1)';    // découpes, fermetures
  const DEP = 'cubic-bezier(.7,0,.84,0)';   // départs
  const reduit = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = () => window.innerWidth < 768;
  const animer = !!Element.prototype.animate;

  const cadre = liste.querySelector('.liste-cadre');
  const noms = liste.querySelector('.liste-noms');
  const clavier = document.querySelector('.projets-clavier');

  // Les huit li écrits dans le HTML : la copie d'origine, la seule lue par le
  // clavier et le lecteur d'écran. Les copies ajoutées plus bas en sont des clones.
  const origine = Array.from(noms.children);
  const N = origine.length;

  // Une image par projet dans le cadre (décision 13) : toujours la variante paysage,
  // même sur téléphone (décision 19). Rien n'est chargé avant que la liste soit demandée.
  const entrees = origine.map(li => {
    const lien = li.querySelector('a');
    const projet = projects.find(p => new URL(p.url, document.baseURI).href === lien.href);
    const img = new Image();
    img.alt = '';
    img.decoding = 'async';
    img.dataset.src = projet.image;
    cadre.appendChild(img);
    return { lien, projet, img };
  });

  let liens = entrees.map(e => e.lien);   // tous les liens dans l'ordre du DOM, copies comprises
  let actif = -1;        // index du projet actif (0 à N-1)
  let actifEl = null;    // le nom actif à l'écran : une seule occurrence, la plus proche de la ligne
  let ancienEl = null;   // le précédent, le temps de sa transition vers le gris
  let dernierY = 0;      // position de défilement précédente (sens de la révélation)
  let occupe = false;    // bascule en cours : le bouton est inerte
  let tout = false;      // les huit images ont été demandées

  function charger(e) {
    if (!e.img.getAttribute('src')) e.img.src = e.img.dataset.src;
    if (e.img.complete && e.img.naturalWidth) return Promise.resolve();
    return new Promise(r => {
      e.img.addEventListener('load', r, { once: true });
      e.img.addEventListener('error', r, { once: true });
    });
  }

  // L'image active d'abord, les sept autres quand le navigateur a le temps
  function chargerTout() {
    if (tout) return;
    tout = true;
    const reste = () => entrees.forEach(charger);
    if (window.requestIdleCallback) requestIdleCallback(reste, { timeout: 1500 }); else setTimeout(reste, 300);
  }

  // La ligne active, en pixels : le même calcul que --ligne en CSS (décisions 8 et 19)
  function ligneY() {
    const W = window.innerWidth, H = window.innerHeight;
    return mobile() ? (H - (W - 40) * 10 / 16 - 80) / 2 : Math.max(H / 2, 350);
  }

  // La boîte d'un nom dans la fenêtre, d'après la mise en page seule : ni l'échelle du
  // nom actif, ni les montées et descentes de M1 / M2 (des transformations) ne la
  // déplacent. getBoundingClientRect, lui, les inclurait et désignerait le mauvais nom.
  function boite(el) {
    let haut = 0;
    for (let e = el; e; e = e.offsetParent) haut += e.offsetTop;
    const top = haut - window.scrollY;
    return { top, bottom: top + el.offsetHeight };
  }

  /* ── Boucle infinie (sixième retour de Clément, 2026-10-23) ──
     Après Hecto revient Ethikwear, avant Ethikwear il y a Hecto, sans butée.
     Les huit li d'origine sont recopiés en entier, autant de fois au-dessus
     qu'au-dessous (copies aria-hidden, hors tabulation : le clavier et le
     lecteur d'écran ne voient que les huit d'origine). La page démarre sur la
     copie d'origine, Ethikwear sur la ligne. Dès que le défilement s'en écarte
     de plus d'une demi-période (la hauteur d'une copie), la page est ramenée
     d'une période entière et le nom actif passe à son double de la copie voisine
     sans transition : toutes les copies étant identiques, l'image rendue est la
     même avant et après. Un seul nom est actif à l'écran, même quand la fenêtre
     montre plus d'une copie (tablette, téléphone). */
  let periode = 0;           // hauteur d'une copie, en px (mesurée, jamais calculée)
  let copiesAvant = 0, copiesApres = 0;

  function brancher(lien, i) {
    // M5. Ouverture : toujours depuis le cadre, jamais depuis le texte (décision 14)
    lien.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;   // lien normal
      e.preventDefault();
      if (occupe || ouvertureEnCours) return;
      poser(liens.indexOf(lien), 0);    // le nom cliqué devient actif sans transition
      ouvrirProjet(cadre, entrees[i].projet.image);
    });
  }
  entrees.forEach((e, i) => brancher(e.lien, i));

  function cloner(avant) {
    const frag = document.createDocumentFragment();
    origine.forEach((li, i) => {
      const c = li.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      const a = c.querySelector('a');
      a.tabIndex = -1;
      a.classList.remove('actif');
      brancher(a, i);
      frag.appendChild(c);
    });
    if (avant) noms.insertBefore(frag, noms.firstChild); else noms.appendChild(frag);
  }

  // Distance entre deux Ethikwear consécutifs : la période de la boucle
  function mesurer() {
    const li = noms.children;
    if (li.length < 2 * N) return 0;
    return li[N].offsetTop - li[0].offsetTop;
  }

  // La position de défilement qui pose l'Ethikwear d'origine sur la ligne
  function base() {
    const r = boite(entrees[0].lien);
    return window.scrollY + (r.top + r.bottom) / 2 - ligneY();
  }

  // Fait défiler la page de d pixels d'un coup, et décale avec elle ce qui s'y réfère
  function decaler(d) {
    const pose = window.scrollY === poseY;
    window.scrollTo(0, window.scrollY + d);
    if (pose) poseY = window.scrollY;
    dernierY += d;
    if (cibleY !== null) { cibleY += d; attenduY += d; }
  }

  // Assez de copies pour que l'écran ne voie jamais ni le haut ni le bas du document :
  // recalée, la page reste à moins d'une demi-période de la copie d'origine ; on garde
  // deux écrans de noms au-delà, de chaque côté. On ajoute, on ne retire jamais ; si des
  // copies s'ajoutent au-dessus, la page est décalée d'autant.
  function construire() {
    if (liste.hidden) return;
    if (!copiesApres) { cloner(false); copiesApres = 1; }
    periode = mesurer();
    if (!periode) return;
    const besoin = Math.ceil((2 * window.innerHeight + periode / 2) / periode);
    let ajoutees = 0;
    while (copiesAvant < besoin) { cloner(true); copiesAvant++; ajoutees++; }
    while (copiesApres < besoin) { cloner(false); copiesApres++; }
    liens = Array.from(noms.querySelectorAll('a'));
    if (ajoutees) decaler(ajoutees * periode);
  }

  // Passe l'état du nom actif et du précédent à leurs doubles n copies plus loin.
  // Une transition (vers le noir et l'échelle, ou retour au gris) peut être en cours :
  // le double reprend l'opacité et l'échelle calculées à cet instant, posées en ligne
  // sans transition (classe .recale), puis rendues au CSS, qui finit le chemin.
  // L'original, lui, est remis au gris sans transition : il est à une période de là.
  function transferer(n) {
    const paires = [actifEl, ancienEl].map(el => {
      if (!el) return null;
      const k = liens.indexOf(el) + n * N;
      if (k < 0 || k >= liens.length) return null;
      const cs = getComputedStyle(el);
      return { de: el, vers: liens[k], opacite: cs.opacity, echelle: cs.scale === 'none' ? '1' : cs.scale };
    });
    noms.classList.add('recale');
    // Les originaux d'abord, les doubles ensuite : le précédent peut être le double
    // du nom actif (même nom une copie plus loin), on ne lui retire pas ce qu'on vient de poser
    paires.forEach(p => { if (p) p.de.classList.remove('actif'); });
    paires.forEach(p => {
      if (!p) return;
      p.vers.classList.toggle('actif', p.de === actifEl);
      p.vers.style.opacity = p.opacite;
      p.vers.style.scale = p.echelle;
    });
    void noms.offsetWidth;                 // style calculé sans transition : les doubles sont posés
    noms.classList.remove('recale');
    paires.forEach(p => { if (p) { p.vers.style.opacity = ''; p.vers.style.scale = ''; } });
    if (paires[0]) actifEl = paires[0].vers;
    if (paires[1]) ancienEl = paires[1].vers;
  }

  // Le recalage : appelé à chaque défilement, avant le rendu de l'image
  function recaler() {
    if (!periode || liste.hidden) return;
    const ecart = window.scrollY - base();
    if (Math.abs(ecart) <= periode / 2) return;
    const tours = Math.floor((Math.abs(ecart) + periode / 2) / periode);
    decaler(-Math.sign(ecart) * tours * periode);
    transferer(-Math.sign(ecart) * tours);
  }

  // Le nom actif : celui dont la boîte coupe la ligne ; sinon le plus proche (décision 12).
  // Toutes les copies sont regardées ; le résultat est l'index du lien dans liens.
  function trouver() {
    const y = ligneY();
    let proche = 0, distance = Infinity;
    for (let i = 0; i < liens.length; i++) {
      const r = boite(liens[i]);
      if (r.top <= y && r.bottom >= y) return i;
      const d = Math.abs((r.top + r.bottom) / 2 - y);
      if (d < distance) { distance = d; proche = i; }
    }
    return proche;
  }

  // Plus aucun nom actif (arrivée, retour arrière) : on repart de la position de défilement
  function oublier() {
    liens.forEach(a => a.classList.remove('actif'));
    actif = -1;
    actifEl = ancienEl = null;
  }

  // Pose le nom liens[k] : la classe .actif sur lui seul, l'image de son projet au-dessus
  // des autres, l'adresse du cadre. sens : 1 vers le bas, -1 vers le haut, 0 sans animation.
  // L'ancienne image reste dessous jusqu'à être couverte : une épreuve posée sur l'autre (M3).
  function poser(k, sens) {
    const el = liens[k], i = k % N;
    if (el === actifEl) return;
    const premiere = actif === -1;
    const memeProjet = i === actif;        // autre occurrence du même nom (une période d'un coup)
    if (actifEl) actifEl.classList.remove('actif');
    ancienEl = actifEl;
    actifEl = el;
    actif = i;
    el.classList.add('actif');
    if (memeProjet) return;                // le cadre montre déjà ce projet
    const e = entrees[i];
    cadre.dataset.url = e.projet.url;
    // Un changement annule l'animation en cours sur la même image et repart : rien en file
    e.img.getAnimations().forEach(an => an.cancel());
    cadre.appendChild(e.img);
    charger(e).then(() => {
      if (actif !== i || !sens || premiere || !animer) return;
      if (reduit()) {
        e.img.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: 'linear' });
        return;
      }
      // Révélée dans le sens du défilement : par le bas en descendant, par le haut en remontant
      const depart = sens > 0 ? 'inset(100% 0px 0px 0px)' : 'inset(0px 0px 100% 0px)';
      e.img.animate([{ clipPath: depart }, { clipPath: 'inset(0px 0px 0px 0px)' }],
        { duration: mobile() ? 400 : 450, easing: OUT });
    });
  }

  function actualiser() {
    if (!document.body.classList.contains('vue-liste') || liste.hidden) return;
    const y = window.scrollY;
    const sens = y < dernierY ? -1 : 1;
    dernierY = y;
    poser(trouver(), sens);
  }

  let demande = false;
  function surDefilement() {
    if (!document.body.classList.contains('vue-liste') || liste.hidden) return;
    recaler();
    if (demande) return;
    demande = true;
    requestAnimationFrame(() => { demande = false; actualiser(); });
  }
  window.addEventListener('scroll', surDefilement, { passive: true });

  // La mise en page a changé sous la liste (fenêtre redimensionnée, Archivo arrivée
  // après coup et « DUGOS PHOTOGRAPHIE » passé sur deux lignes dans chaque copie...) :
  // on remesure la période, on complète les copies, et si personne n'a encore défilé
  // depuis l'arrivée on repose Ethikwear sur la ligne ; sinon on recale seulement.
  let poseY = -1;        // position posée par montrerListe, tant que personne n'a défilé
  function reposer() {
    if (!document.body.classList.contains('vue-liste') || liste.hidden) return;
    construire();
    if (window.scrollY === poseY) { window.scrollTo(0, base()); poseY = window.scrollY; dernierY = poseY; }
    else recaler();
    actualiser();
  }
  window.addEventListener('resize', reposer);
  if (window.ResizeObserver) new ResizeObserver(reposer).observe(noms);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(reposer);

  /* ── Molette amortie (second retour de Clément, 2026-10-23, annule le cran) ──
     En vue liste seulement : la molette et le trackpad ne déplacent plus la page
     d'un coup. Chaque cran ajoute à une cible (un peu moins que le geste, FREIN),
     et la page rejoint cette cible frame après frame, de plus en plus doucement
     (constante de temps TAU, indépendante de la fréquence d'écran). Le nom actif
     suit par l'écouteur scroll ci-dessus. Tactile, clavier, barre de défilement
     et mouvement réduit : natifs, et tout geste natif interrompt l'amorti.
     Un recalage de la boucle décale la cible avec la page (decaler). */
  const FREIN = 0.45;    // 100 px de molette = 45 px de page (0,7 avant : « plus lent encore », huitième retour)
  const TAU = 200;       // ms : à 200 ms il reste 37 % du chemin, à 600 ms 5 % (170 avant, pour que le ralenti ne soit pas sec)
  let cibleY = null;     // où la page doit arriver ; null = pas d'amorti en cours
  let attenduY = 0;      // position posée au dernier pas (pour voir si quelqu'un d'autre a défilé)
  let dernierPas = 0;
  let amortiDemande = false;

  function annulerAmorti() {
    cibleY = null;
    amortiDemande = false;
  }

  function pasAmorti(t) {
    amortiDemande = false;
    if (cibleY === null) return;
    if (occupe || ouvertureEnCours) { annulerAmorti(); return; }
    const y = window.scrollY;
    if (Math.abs(y - attenduY) > 1) { annulerAmorti(); return; }   // un autre geste a pris la main
    const d = cibleY - y;
    if (Math.abs(d) < 1) {
      window.scrollTo(0, Math.round(cibleY));
      annulerAmorti();
      return;
    }
    const dt = Math.min(64, Math.max(1, t - dernierPas));
    dernierPas = t;
    let avance = d * (1 - Math.exp(-dt / TAU));
    if (Math.abs(avance) < 1) avance = Math.sign(d);              // Chrome arrondit au pixel : toujours avancer
    attenduY = Math.round(y + avance);
    window.scrollTo(0, attenduY);
    amortiDemande = true;
    requestAnimationFrame(pasAmorti);
  }

  window.addEventListener('wheel', (e) => {
    if (!document.body.classList.contains('vue-liste') || liste.hidden) return;
    if (reduit()) return;                                 // mouvement réduit : natif
    if (e.ctrlKey) return;                                // pincement = zoom du navigateur
    if (e.defaultPrevented) return;
    e.preventDefault();
    if (occupe || ouvertureEnCours) return;               // bascule ou ouverture en cours : la page ne bouge pas
    let delta = e.deltaY;
    if (e.deltaMode === 1) delta *= 40;                   // lignes (Firefox)
    else if (e.deltaMode === 2) delta *= window.innerHeight;
    if (!delta) return;
    const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    if (cibleY === null) { cibleY = window.scrollY; attenduY = window.scrollY; dernierPas = performance.now(); }
    cibleY = Math.max(0, Math.min(max, cibleY + delta * FREIN));
    if (!amortiDemande) { amortiDemande = true; requestAnimationFrame(pasAmorti); }
  }, { passive: false });

  // Un geste natif reprend la main : doigt posé, touche, clic sur la barre
  window.addEventListener('touchstart', annulerAmorti, { passive: true });
  window.addEventListener('keydown', annulerAmorti);
  window.addEventListener('pointerdown', annulerAmorti);

  function etiqueter(enListe) {
    bouton.setAttribute('aria-pressed', enListe ? 'true' : 'false');
    bouton.setAttribute('aria-label', enListe ? 'Voir les projets en grille' : 'Voir les projets en liste');
  }

  function nettoyer(els) {
    els.forEach(el => el.getAnimations().forEach(an => an.cancel()));
  }

  // Les noms à l'écran, du haut vers le bas : ceux que M1 et M2 font bouger
  // (les copies hors écran restent en place, personne ne les voit)
  function visibles() {
    const H = window.innerHeight;
    return liens.filter(a => { const r = boite(a); return r.bottom > 0 && r.top < H; });
  }

  // La liste, sans mouvement : état d'arrivée (retour pendant la session) et fin de M1.
  // La page se pose sur la copie d'origine, Ethikwear sur la ligne.
  function montrerListe() {
    document.body.classList.add('vue-liste');
    liste.hidden = false;
    if (clavier) clavier.hidden = true;
    etiqueter(true);
    try { sessionStorage.setItem('vue', 'liste'); } catch (e) { /* rien */ }
    window.Works.freiner();
    annulerAmorti();
    construire();
    window.scrollTo(0, base());
    poseY = window.scrollY;
    dernierY = poseY;
    oublier();
    poser(trouver(), 0);
    chargerTout();
  }

  // La grille, sans mouvement : fin de M2. Elle reprend là où elle était (posX / posY intacts).
  function montrerGrille() {
    document.body.classList.remove('vue-liste');
    liste.hidden = true;
    if (clavier) clavier.hidden = false;
    etiqueter(false);
    try { sessionStorage.removeItem('vue'); } catch (e) { /* rien */ }
    nettoyer([liste, cadre, ...liens]);
    wrapper.getAnimations().forEach(an => an.cancel());
    annulerAmorti();
    window.scrollTo(0, 0);
  }

  // Archivo ExtraBold (les noms de la liste, septième retour) n'est pas encore à l'écran
  // sur Works : on l'attend un instant avant de faire monter les noms, sinon ils
  // monteraient dans la police de secours
  const police = () => Promise.race([
    document.fonts && document.fonts.load ? document.fonts.load("800 100px 'Archivo'").catch(() => {}) : Promise.resolve(),
    new Promise(r => setTimeout(r, 400)),
  ]);

  /* ── M1. Grille → liste ── */
  function versListe() {
    if (occupe) return;
    occupe = true;
    window.Works.freiner();
    const fin = () => { occupe = false; };

    if (reduit() || !animer) {
      const a = animer ? wrapper.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'linear', fill: 'forwards' }).finished : Promise.resolve();
      a.then(() => {
        montrerListe();
        if (!animer) { fin(); return; }
        liste.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'linear' }).finished.then(fin);
      });
      return;
    }

    const k = mobile() ? 0.85 : 1;
    // La grille s'en va : la dérive s'arrête, le calque s'efface et recule
    wrapper.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(.97)' }],
      { duration: 400 * k, easing: DEP, fill: 'forwards' });
    setTimeout(() => etiqueter(true), 200 * k);
    const pret = police();
    setTimeout(() => pret.then(() => {
      montrerListe();
      // Les noms à l'écran montent un par un dans leur masque, le cadre se révèle par le bas
      const entrees = visibles().map((a, i) => a.animate([{ transform: 'translateY(105%)' }, { transform: 'none' }],
        { duration: 600 * k, delay: i * 40 * k, easing: OUT, fill: 'both' }));
      entrees.push(cadre.animate([{ clipPath: 'inset(100% 0px 0px 0px)' }, { clipPath: 'inset(0px 0px 0px 0px)' }],
        { duration: 650 * k, delay: 200 * k, easing: OUT, fill: 'both' }));
      // Fin des entrées : plus aucune animation posée, les règles CSS reprennent la main.
      // Seules celles-ci sont retirées : si M2 a déjà commencé, ses animations restent.
      Promise.all(entrees.map(an => an.finished)).then(() => entrees.forEach(an => an.cancel())).catch(() => {});
      setTimeout(fin, 600 * k);          // le bouton redevient actif à 1 s du clic
    }), 400 * k);
  }

  /* ── M2. Liste → grille ── */
  function versGrille() {
    if (occupe) return;
    occupe = true;
    const fin = () => { occupe = false; };

    if (reduit() || !animer) {
      const a = animer ? liste.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'linear', fill: 'forwards' }).finished : Promise.resolve();
      a.then(() => {
        montrerGrille();
        window.Works.relancer();
        if (!animer) { fin(); return; }
        wrapper.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'linear' }).finished.then(fin);
      });
      return;
    }

    // Les noms à l'écran redescendent dans leur masque ; le cadre s'efface
    const fins = visibles().map((a, i) => a.animate([{ transform: 'none' }, { transform: 'translateY(105%)' }],
      { duration: 350, delay: i * 30, easing: IO, fill: 'forwards' }).finished);
    cadre.animate([{ opacity: 1 }, { opacity: 0 }],
      { duration: 200, easing: 'linear', fill: 'forwards' });
    // Si une animation est annulée en route (retour arrière du navigateur), on bascule quand même
    Promise.all(fins).catch(() => {}).then(() => {
      montrerGrille();
      // La grille reprend là où elle était, avec son entrée habituelle
      wrapper.animate([{ opacity: 0, transform: 'scale(1.04)' }, { opacity: 1, transform: 'none' }],
        { duration: 700, easing: OUT }).finished.then(fin, fin);
      window.Works.relancer();
    });
  }

  bouton.addEventListener('click', () => {
    if (occupe || ouvertureEnCours) return;
    if (document.body.classList.contains('vue-liste')) versGrille(); else versListe();
  });

  cadre.addEventListener('click', () => {
    if (occupe || ouvertureEnCours || actif < 0) return;
    ouvrirProjet(cadre, entrees[actif].projet.image);
  });

  // Retour arrière (page en cache) : nom actif et cadre recalculés sur la position de défilement
  function rafraichir() {
    occupe = false;
    annulerAmorti();
    if (!document.body.classList.contains('vue-liste')) return;
    nettoyer([liste, cadre, ...liens]);
    oublier();
    recaler();
    dernierY = window.scrollY;
    poser(trouver(), 0);
  }

  // Retour sur Works pendant la session avec la liste mémorisée (décision 4) :
  // la liste tout de suite, sans mouvement (le preloader s'efface, preloader.js)
  let memo = null;
  try { memo = sessionStorage.getItem('vue'); } catch (e) { /* rien */ }
  if (memo === 'liste') montrerListe();

  return { versListe, versGrille, rafraichir, poser, trouver, ligneY, periode: () => periode, base, copies: () => copiesAvant + 1 + copiesApres };
})();
