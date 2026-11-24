// Projets, dans l'ordre du circuit (le numéro de l'étiquette est leur rang + 1). Refonte épurée
// (2026-11-24) : plus de cases pastel, chaque projet est un élément de la tuile 8 × 8.
//   nom           écrit comme dans la liste cachée et la vue liste (jamais coupé)
// Chaque case montre une capture plein cadre du projet (plus de mockup) :
//   image         paysage 1600×1000 (16:10), pour les fenêtres plus larges que hautes
//   imagePortrait 740×1600, pour les fenêtres nettement plus hautes que larges (ratio ≤ 3/5, téléphone ; une tablette garde les cases paysage)
//   ton           teinte de la zone haut droite de la capture : le header passe en blanc
//                 quand l'ouverture d'un projet « sombre » couvre l'écran
//   tonPortrait   idem pour la variante portrait, si elle diffère (Redstone)
//                 (tons mesurés le 2026-10-05 sur le quart haut droit : Queen 130,
//                 Passage Secret 31 = sombre ; Ethikwear 194, Unik 148,
//                 Redstone paysage 226 = clair ; Hecto 48 paysage, 55 portrait = sombre, mesuré le 2026-10-07 ;
//                 Dugos, vitrines au logo du 2026-10-24 : 32 paysage, 23 portrait = sombre ;
//                 Ethikwear, vitrines au logo du 2026-10-25 : 232 paysage, 234 portrait = clair)
//   position      cadrage optionnel de cover (défaut : center)
const projects = [
  {
    // Logo noir sur crème (2026-10-25-ethikwear-logo), comme Dugos, Relay et Hecto ;
    // les captures du site restent dans web/ et sur la page projet
    image: 'Projets/Ethikwear/web/ethikwear-logo-vitrine-plein.jpg',
    imagePortrait: 'Projets/Ethikwear/web/ethikwear-logo-vitrine-portrait.jpg',
    ton: 'clair',
    nom: 'Ethikwear',
    url: 'Projets/Ethikwear/'
  },
  {
    image: 'Projets/redstone/web/redstone-vitrine-plein.jpg',
    imagePortrait: 'Projets/redstone/web/redstone-vitrine-portrait.jpg',
    ton: 'clair',
    tonPortrait: 'sombre',   // le haut de la capture portrait est noir (mesuré)
    nom: 'Redstone',
    url: 'Projets/redstone/'
  },
  {
    image: 'Projets/Unik/web/unik-vitrine-plein.jpg',
    imagePortrait: 'Projets/Unik/web/unik-vitrine-portrait.jpg',
    ton: 'clair',
    nom: 'Unik',
    url: 'Projets/Unik/'
  },
  {
    image: 'Projets/dugos-photographie/web/dugos-logo-vitrine-plein.jpg',
    imagePortrait: 'Projets/dugos-photographie/web/dugos-logo-vitrine-portrait.jpg',
    ton: 'sombre',
    nom: 'Dugos Photographie',
    url: 'Projets/dugos-photographie/'
  },
  {
    image: 'Projets/Queen/web/queen-vitrine-plein.jpg',
    imagePortrait: 'Projets/Queen/web/queen-vitrine-portrait.jpg',
    ton: 'sombre',
    nom: 'Queen',
    url: 'Projets/Queen/'
  },
  {
    image: 'Projets/passage-secret/web/passage-secret-hero.jpg',
    imagePortrait: 'Projets/passage-secret/web/passage-secret-mobile.jpg',
    ton: 'sombre',
    nom: 'Passage Secret',
    url: 'Projets/passage-secret/'
  },
  {
    image: 'Projets/relay/web/relay-vitrine-plein.jpg',
    imagePortrait: 'Projets/relay/web/relay-vitrine-portrait.jpg',
    ton: 'sombre',           // vitrine : aplat noir avec logo, header blanc
    nom: 'Relay',
    url: 'Projets/relay/'
  },
  {
    image: 'Projets/hecto/web/hecto-vitrine-plein.jpg',
    imagePortrait: 'Projets/hecto/web/hecto-vitrine-portrait.jpg',
    ton: 'sombre',           // logo sur aplat nuit (mesuré 48 et 55) : header blanc
    nom: 'Hecto',
    url: 'Projets/hecto/'
  },
];

// Orientation : sous le ratio 3/5 on affiche la variante portrait. Une seule
// des deux images est chargée par visiteur (le preloader et le clic lisent
// l'image effectivement affichée, via imageDe).
const portraitMQ = window.matchMedia('(max-aspect-ratio: 3/5)');
function imageDe(p) { return portraitMQ.matches ? p.imagePortrait : p.image; }
function tonDe(p) { return (portraitMQ.matches && p.tonPortrait) || p.ton; }
const grid    = document.getElementById('grid');
const wrapper = document.querySelector('.wrapper');
const mqReduit = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ── La tuile (refonte épurée, direction.md 13 à 22) ──
   8 colonnes × 8 rangées, répétée 3 × 3 pour la boucle sans fin. Le projet de la colonne c,
   rangée r est (c + 3r) mod 8 : deux voisins ne montrent jamais le même. Chaque rangée est
   décalée de DECALAGE[r] colonne vers la droite (bureau et tablette), les colonnes impaires
   descendent de la moitié d'un élément (quinconce). Chaque rangée a une période de 8 colonnes :
   la tuile se raccorde sans couture. Tout est en pixels entiers. */
const TUILE = 8;
const DECALAGE = [0, .38, .76, .14, .52, .90, .28, .66];

// Mesures selon la fenêtre (direction.md 13, 20, 21). Largeur de l'image, hauteur au ratio
// exact de la capture (16:10 en paysage, 740:1600 en portrait : jamais rognée), blanc entre
// deux images, étiquette (ligne + 8px d'air)
function mesures() {
  const W = window.innerWidth;
  const portrait = portraitMQ.matches;
  let imgW, blanc, ligne, corps, decale = true;
  if (portrait || W < 768) {          // téléphone (et fenêtre étroite : mêmes mesures)
    imgW = W * 0.413; blanc = W * 0.177; ligne = 14; corps = 11; decale = false;
  } else if (W < 1100) {              // tablette
    imgW = W * 0.226; blanc = W * 0.1505; ligne = 14; corps = 11;
  } else {                            // bureau
    imgW = W * 0.155; blanc = W * 0.1207; ligne = 14; corps = 11;
  }
  imgW = Math.round(imgW);
  blanc = Math.round(blanc);
  const imgH = Math.round(imgW * (portrait ? 1600 / 740 : 10 / 16));
  const etq = ligne + 8;
  const col = imgW + blanc;
  const rang = etq + imgH + blanc;
  return { imgW, imgH, blanc, ligne, corps, etq, col, rang, decale,
           quinconce: Math.round((etq + imgH) / 2), tuileW: TUILE * col, tuileH: TUILE * rang };
}
let M = mesures();

// Tous les éléments : position dans la tuile, tuile (tx, ty) et index du projet.
// Le preloader s'en sert pour faire entrer ceux qui sont à l'écran en 0,0.
const cells = [];

for (let ty = 0; ty < 3; ty++) {
  for (let tx = 0; tx < 3; tx++) {
    for (let r = 0; r < TUILE; r++) {
      for (let c = 0; c < TUILE; c++) {
        const pi = (c + 3 * r) % projects.length;
        const project = projects[pi];

        const el = document.createElement('div');
        el.className = 'projet project-cell';
        el.dataset.url = project.url;
        el.dataset.cur = 'Voir';              // mot du curseur contextuel (shared.js)

        const etq = document.createElement('div');
        etq.className = 'etq';
        const num = document.createElement('span');
        num.className = 'num';
        num.textContent = '';   // numéros retirés à la demande de Clément (reprise 10) ; le span reste pour que le nom garde sa place à droite
        const nom = document.createElement('span');
        nom.className = 'nom';
        nom.textContent = project.nom;
        etq.append(num, nom);

        const vignette = document.createElement('div');
        vignette.className = 'vignette';
        const media = document.createElement('div');
        media.className = 'media';
        media.style.backgroundImage = `url('${imageDe(project)}')`;
        media.style.backgroundPosition = project.position ?? 'center';
        vignette.appendChild(media);

        // .carte : l'étiquette et l'image dans un enveloppant, l'échelle du survol est sur lui
        const carte = document.createElement('div');
        carte.className = 'carte';
        carte.append(etq, vignette);
        el.append(carte);
        grid.appendChild(el);
        cells.push({ el, vignette, media, etq, tx, ty, r, c, projet: pi });
      }
    }
  }
}

// Pose chaque élément en pixels entiers et met les variables à jour
function dimensionner() {
  M = mesures();
  const st = document.documentElement.style;
  st.setProperty('--img-w', M.imgW + 'px');
  st.setProperty('--img-h', M.imgH + 'px');
  st.setProperty('--etq', M.etq + 'px');
  st.setProperty('--etq-lh', M.ligne + 'px');
  st.setProperty('--etq-fs', M.corps + 'px');
  st.setProperty('--tuile-w', M.tuileW + 'px');
  st.setProperty('--tuile-h', M.tuileH + 'px');
  cells.forEach(k => {
    const decalage = M.decale ? Math.round(DECALAGE[k.r] * M.col) : 0;
    const x = k.tx * M.tuileW + k.c * M.col + decalage;
    const y = k.ty * M.tuileH + k.r * M.rang + (k.c % 2 ? M.quinconce : 0);
    k.x = x; k.y = y;
    k.el.style.left = x + 'px';
    k.el.style.top = y + 'px';
  });
}

// Changement d'orientation (rotation de la tablette, redimensionnement) : les
// éléments reprennent la variante qui convient
portraitMQ.addEventListener('change', () => {
  dimensionner(); normalize(); render();
  cells.forEach(k => { k.media.style.backgroundImage = `url('${imageDe(projects[k.projet])}')`; });
});

let posX = 0, posY = 0;
let parX = 0, parY = 0;  // décalage de parallaxe au curseur (retouche 1, posé par Works.parallaxe), en plus de la position
let enPause = false;     // grille figée en 0,0 pendant l'entrée du preloader
let rampeDebut = null;   // reprise de la dérive : 0 → 0,6 px/frame en 800 ms
let isDragging = false;
let lastX = 0, lastY = 0;
let started = true;
let freinage = false;    // ouverture d'un projet : la dérive s'arrête (vitesse × 0,8 par frame)

let dragStartX = 0, dragStartY = 0, dragDistance = 0;

const FRICTION    = 0.92;
const DRIFT_SPEED = 0;   // retouche 1 : plus de dérive automatique (0,6 avant), la grille ne bouge qu'au glisser, à la molette, au doigt

// Direction aléatoire à chaque chargement. Mouvement réduit : pas de dérive automatique,
// la grille ne bouge qu'au glisser, à la molette et au doigt.
const angle = Math.random() * Math.PI * 2;
let driftNX = Math.cos(angle), driftNY = Math.sin(angle);
let velX = mqReduit.matches ? 0 : driftNX * DRIFT_SPEED;
let velY = mqReduit.matches ? 0 : driftNY * DRIFT_SPEED;

/* ── Mouvement au curseur (retouche-1.md) ──
   Toute la grille glisse à l'opposé de la souris, lissée à 8 % par image (cadence corrigée pour
   que l'effet soit le même à 60 et 120 Hz) : décalage = -(s - .5) × taille d'un élément × 1,6.
   Souris seulement ; coupé au tactile et en mouvement réduit ; figé à l'ouverture d'un projet ;
   rien en vue liste ni pendant l'entrée du preloader. posX / posY restent au glisser et à la molette. */
const AIMANT = false;   // Q1 : pas d'attraction par proximité (la référence n'en a pas) ; valeurs prêtes dans retouche-1.md
const mqTactile = window.matchMedia('(hover: none), (pointer: coarse)');
let cibleSX = 0.5, cibleSY = 0.5;   // position de la souris, 0 à 1
let sx = 0.5, sy = 0.5;             // position lissée
let gelePar = false;                // ouverture d'un projet : le décalage ne bouge plus
let dernierT = 0;
window.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse') return;
  cibleSX = e.clientX / window.innerWidth;
  cibleSY = e.clientY / window.innerHeight;
});

// Un pas par image ; renvoie vrai si le décalage a changé
function majParallaxe(t) {
  const dt = Math.min(64, Math.max(1, t - (dernierT || t - 16.667)));
  dernierT = t;
  if (mqTactile.matches || mqReduit.matches) {
    const change = parX !== 0 || parY !== 0;
    parX = 0; parY = 0; sx = cibleSX = 0.5; sy = cibleSY = 0.5;
    return change;
  }
  if (isDragging) return false;    // glisser en cours : la parallaxe est suspendue, elle reprend en douceur au lâcher
  if (gelePar || enPause || document.body.classList.contains('vue-liste')) return false;
  const k = 1 - Math.pow(1 - 0.08, dt / 16.667);
  sx += (cibleSX - sx) * k;
  sy += (cibleSY - sy) * k;
  const nx = -(sx - 0.5) * M.imgW * 1.6;
  const ny = -(sy - 0.5) * (M.etq + M.imgH) * 1.6;
  const change = Math.abs(nx - parX) > 0.05 || Math.abs(ny - parY) > 0.05;
  parX = nx; parY = ny;
  return change;
}

/* ── Menu blanc sur les images (reprise 9) ──
   Le menu (icône + WORKS ABOUT CONTACT) reste noir sur le fond blanc et devient blanc franc
   exactement là où une image passe dessous : une copie blanche du menu, superposée, découpée par
   un clip-path en rectangles (les images, pas les étiquettes) recalculé dans la boucle rAF
   quand la grille a bougé. La copie est décorative (aria-hidden, inert, sans événements) ;
   elle prend en compte la parallaxe, le survol ×1,08 et le recul au glisser (rectangles lus
   sur les images proches du menu, transformations comprises). Éteinte, comme à HEAD, pendant
   le preloader, la vue liste, l'ouverture d'un projet, Contact et les passages. */
let mb = null;
let mbCle = '', mbSurvolJusqua = 0;
function creerMenuBlanc() {
  const h = document.querySelector('header'), v = document.querySelector('.vue-nav');
  if (!h || !v || !window.ResizeObserver) return;
  const racine = document.createElement('div');
  racine.className = 'menu-blanc';
  racine.setAttribute('aria-hidden', 'true');
  racine.inert = true;
  const ch = h.cloneNode(true), cv = v.cloneNode(true);
  [ch, cv].forEach(c => c.querySelectorAll('[data-dest], [aria-haspopup]').forEach(e => { e.removeAttribute('data-dest'); e.removeAttribute('aria-haspopup'); }));
  racine.append(cv, ch);
  document.body.appendChild(racine);
  // Le survol agrandit les liens et l'icône de 12 % : la copie fait de même
  const paires = [
    ...Array.from(h.querySelectorAll('nav a')).map((a, i) => [a, ch.querySelectorAll('nav a')[i]]),
    [v.querySelector('.vue-toggle'), cv.querySelector('.vue-toggle')],
  ];
  paires.forEach(([o, c]) => {
    if (!o || !c) return;
    o.addEventListener('mouseenter', () => c.classList.add('survol'));
    o.addEventListener('mouseleave', () => c.classList.remove('survol'));
  });
  mb = { racine, h, v, zones: [] };
  mesurerMenuBlanc();
  window.addEventListener('resize', mesurerMenuBlanc);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(mesurerMenuBlanc);
}
// Zones du menu : le bloc des liens et l'icône, élargis de 10 px (agrandissement au survol)
function mesurerMenuBlanc() {
  if (!mb) return;
  if (document.body.classList.contains('menu-en-cours')) return;   // pendant le preloader le menu est un compteur
  mb.zones = [mb.h.querySelector('nav'), mb.v.querySelector('.vue-toggle')].filter(Boolean).map(e => {
    const r = e.getBoundingClientRect();
    return { l: r.left - 10, t: r.top - 10, r: r.right + 10, b: r.bottom + 10 };
  });
  mbCle = '';
}
function majMenuBlanc(t, parChange) {
  const b = document.body, d = document.documentElement;
  const eteint = b.classList.contains('menu-en-cours') || b.classList.contains('vue-liste') || b.classList.contains('ouvre')
    || d.classList.contains('contact-ouvert') || /passage-/.test(d.className);
  // La copie est faite une fois le menu en place (après le preloader, où WORKS est un compteur)
  if (!mb && !eteint) creerMenuBlanc();
  if (!mb) return;
  if (eteint) { if (!mb.racine.hidden) { mb.racine.hidden = true; mbCle = ''; } return; }
  if (mb.racine.hidden) { mb.racine.hidden = false; mesurerMenuBlanc(); }
  const px = Math.round(posX + parX), py = Math.round(posY + parY);
  const recul = couche && couche.classList.contains('recul');
  const cle = px + ',' + py + ',' + recul + ',' + M.imgW + ',' + mb.zones.map(z => z.l + z.t).join();
  if (cle !== mbCle) mbSurvolJusqua = t + 700;   // la grille a bougé : un survol peut commencer ou finir
  const encore = t < mbSurvolJusqua || performance.now() < reculJusqua;
  if (cle === mbCle && !encore) return;
  mbCle = cle;
  const W = window.innerWidth, H = window.innerHeight;
  const lireTout = performance.now() < reculJusqua;     // recul en cours : on relit tout près du menu
  const rects = [];
  cells.forEach(k => {
    let x = k.x + px - M.tuileW, y = k.y + py - M.tuileH + M.etq, w = M.imgW, h = M.imgH;
    if (recul) { x = (x - W / 2) * 0.8 + W / 2; y = (y - H / 2) * 0.8 + H / 2; w *= 0.8; h *= 0.8; }
    if (projects[k.projet].clair !== false) return;   // image claire (ou clarté inconnue) : le menu reste noir
    const marge = lireTout ? 400 : 40;      // survol (×1,08) ou recul qui change d'échelle
    if (!mb.zones.some(z => x - marge < z.r && x + w + marge > z.l && y - marge < z.b && y + h + marge > z.t)) return;
    const r = k.vignette.getBoundingClientRect();   // rectangle réel, parallaxe, survol et recul compris
    mb.zones.forEach(z => {
      const l = Math.max(r.left, z.l), tt = Math.max(r.top, z.t), rr = Math.min(r.right, z.r), bb = Math.min(r.bottom, z.b);
      if (rr > l && bb > tt) rects.push([l, tt, rr - l, bb - tt]);
    });
  });
  if (!rects.length) { mb.racine.style.clipPath = 'inset(100% 0 0 0)'; return; }
  mb.racine.style.clipPath = 'path("' + rects.map(([l, tt, w, h]) => `M${l.toFixed(2)} ${tt.toFixed(2)}h${w.toFixed(2)}v${h.toFixed(2)}h${(-w).toFixed(2)}z`).join('') + '")';
}

/* ── Clarté des images (reprise 10, option A) ──
   Le menu blanc ne se découpe que sur les images sombres. La clarté est la moyenne de luminance
   d'un canvas de 16 × 16, calculée une fois par projet au chargement (jamais dans la boucle) ;
   si le canvas est bloqué, on retombe sur le ton écrit dans la liste des projets. */
projects.forEach(p => {
  p.clair = undefined;       // inconnu : le menu reste noir en attendant
  const img = new Image();
  img.onload = () => {
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 16;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0, 16, 16);
      const d = g.getImageData(0, 0, 16, 16).data;
      let somme = 0;
      for (let i = 0; i < d.length; i += 4) somme += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
      p.lum = somme / (256 * 255);
      p.clair = p.lum > 0.6;
    } catch (e) { p.clair = p.ton === 'clair'; }
    mbCle = '';
  };
  img.onerror = () => { p.clair = p.ton === 'clair'; };
  img.src = imageDe(p);
});

function tileW() { return M.tuileW; }
function tileH() { return M.tuileH; }
function caseW() { return M.col; }
function caseH() { return M.rang; }
dimensionner();
window.addEventListener('resize', () => { dimensionner(); normalize(); render(); });

// posX et posY restent dans ]-tuile, 0] ; la grille de 3 × 3 tuiles est décalée d'une tuile
// vers le haut et la gauche, l'écran voit donc toujours la tuile du milieu et ses voisines
function normalize() {
  posX = posX % tileW(); if (posX > 0) posX -= tileW();
  posY = posY % tileH(); if (posY > 0) posY -= tileH();
}

const speedBlur = document.getElementById('speedBlur');

function updateBlur(speed) {
  // retouche 1 : plus de flou lié à la vitesse (le calque .speed-blur est masqué en CSS)
  speedBlur.style.setProperty('--edge-blur', '0px');
}

function render() {
  grid.style.transform = `translate3d(${Math.round(posX + parX) - M.tuileW}px, ${Math.round(posY + parY) - M.tuileH}px, 0)`;
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

function loop(t) {
  const parChange = majParallaxe(t);
  majMenuBlanc(t, parChange);
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

    const min = mqReduit.matches ? 0 : driftMin();
    if (Math.hypot(velX, velY) < min) {
      velX = driftNX * min;
      velY = driftNY * min;
    }

    posX += velX;
    posY += velY;
    normalize();
    render();
  } else if (parChange) {
    render();     // glisser en cours ou grille figée : seule la parallaxe a bougé
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Mouse drag
let reculJusqua = 0;     // la couche change d'échelle pendant 400 ms : le menu blanc relit les rectangles
const couche = document.querySelector('.couche');
let reculTimer = null, aRecule = false;
const reculPossible = () => window.innerWidth >= 768 && !mqTactile.matches && !mqReduit.matches;
function reculer() {
  reculJusqua = performance.now() + 500;
  if (!reculPossible() || !couche) return;
  couche.classList.add('recul');
  aRecule = true;
}
function relever() {
  reculJusqua = performance.now() + 500;
  clearTimeout(reculTimer);
  if (couche) couche.classList.remove('recul');
}
wrapper.addEventListener('mousedown', (e) => {
  aRecule = false;
  clearTimeout(reculTimer);
  reculTimer = setTimeout(reculer, 300);   // appui de 300 ms sans bouger
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
  if (dragDistance > 8 && !aRecule) reculer();   // seuil de 8 px franchi
  // Glisser 1:1 : la grille suit la main pixel pour pixel (compensé pendant le recul à 80 %, où
  // la couche est réduite). La vitesse du dernier mouvement devient l'élan du lâcher.
  const ech = couche && couche.classList.contains('recul') ? 0.8 : 1;
  const dx = (e.clientX - lastX) / ech, dy = (e.clientY - lastY) / ech;
  velX = Math.max(-60, Math.min(60, dx));
  velY = Math.max(-60, Math.min(60, dy));
  dernierMouvement = performance.now();
  posX += dx;
  posY += dy;
  lastX = e.clientX;
  lastY = e.clientY;
  normalize();
  render();
});

let dernierMouvement = 0;
window.addEventListener('mouseup', () => {
  relever();
  if (!isDragging) return;
  isDragging = false;
  if (performance.now() - dernierMouvement > 80) { velX = 0; velY = 0; }   // main arrêtée avant le lâcher : pas d'élan
  started = true;
  wrapper.classList.remove('dragging');
});

// Clic sur cellule projet (seulement si pas un drag)
wrapper.addEventListener('click', (e) => {
  if (dragDistance > 8 || aRecule) return;   // le clic qui suit un glisser (ou un appui long) est annulé
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
  gelePar = true;      // le décalage de parallaxe est gelé dès le clic : la mesure du rectangle reste juste

  // Mouvement réduit : fondu de 200 ms vers le blanc, sans découpe
  if (reduit) {
    scene.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' })
      .finished.then(() => { window.location.href = url; });
    return;
  }

  // On mesure au clic : la grille bouge
  const r = (cell.querySelector('.vignette') || cell).getBoundingClientRect();   // l'image de l'élément, pas son étiquette
  const W = window.innerWidth, H = window.innerHeight;
  const projet = projects.find(p => p.url === url);
  // Résolu sur l'adresse de base du document (l'accueil est servi à /)
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

    // Depuis la liste, le calque monte de .55 à 1 sur le cadre ; depuis la grille les images
    // sont déjà pleine opacité (refonte épurée), rien à monter
    calque.animate([{ opacity: scene === wrapper ? 1 : 0.55 }, { opacity: 1 }], { duration: 250, easing: 'ease', fill: 'forwards' });

    // Capture sombre en haut à droite : le header passe en blanc à mi-course. Capture
    // claire : le header est déjà noir (l'accueil est blanc dans les deux vues), rien à poser.
    const duree = W < 768 ? 750 : 850;
    setTimeout(() => {
      if (!calque.isConnected) return;
      if (ton === 'sombre') document.documentElement.classList.add('passage-sombre');
    }, duree * 0.5);

    // Le signe du coin haut gauche (icône de la vue) devient la flèche des projets, à 40 % de l'ouverture
    if (window.Signe) setTimeout(() => { if (calque.isConnected) window.Signe.geste('fleche'); }, duree * 0.4);

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

// Liens clavier de l'accueil (/) : Entrée ouvre le projet par la case
// visible la plus centrale, avec la même ouverture qu'au clic
document.querySelectorAll('.projets-clavier a').forEach(lien => {
  lien.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const cible = lien.href;
    const W = window.innerWidth, H = window.innerHeight;
    let meilleure = null, distance = Infinity;
    document.querySelectorAll('.project-cell').forEach(c => {
      if (new URL(c.dataset.url, document.baseURI).href !== cible) return;
      const r = c.querySelector('.vignette').getBoundingClientRect();
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
  gelePar = false;
  sx = sy = cibleSX = cibleSY = 0.5; parX = parY = 0;   // retour par le navigateur : on repart de 0,5
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
  mesures: () => M,
  // Prises pour le mouvement au curseur (retouche 1) : décalage de parallaxe de toute la grille
  parallaxe(x, y) { parX = x; parY = y; },
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
   Thème (2026-11-02) : fond blanc dans les deux vues, plus de data-theme sur l'accueil.
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
    document.documentElement.classList.add('vue-bascule');   // encre du header et de l'icône en 250 ms, avec le fond
    const fin = () => { occupe = false; document.documentElement.classList.remove('vue-bascule'); };

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
    document.documentElement.classList.add('vue-bascule');
    const fin = () => { occupe = false; document.documentElement.classList.remove('vue-bascule'); };

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
