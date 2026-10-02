/* ═══════════════════════════════════════════════════════════════
   Pages projet v2 : comportement commun (direction.md, motion.md)
   Un seul fichier, pas de script par page : chaque page déclare ses
   effets par attributs (data-rv, data-speed, data-pin, data-ov, data-cur).
   1. titres au cadrage      5. effets épinglés (portant, salle, deux pages, traverse)
   2. entrée de page         6. planche-contact (Dugos)
   3. révélations au scroll  7. sorties : projet suivant et retour
   4. boucle et parallaxe
   ═══════════════════════════════════════════════════════════════ */
(function () {
  const doc = document.documentElement;
  doc.classList.add('rv-ok');

  const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = () => innerWidth < 768;
  const IO = 'cubic-bezier(.7,0,.2,1)';
  const DEP = 'cubic-bezier(.7,0,.84,0)';
  const borne = (v, a, b) => Math.min(Math.max(v, a), b);
  const lisse = (a, b, t) => { const x = borne((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
  const attente = (ms) => new Promise(r => setTimeout(r, ms));

  // Progression 0 → 1 du défilement dans une section épinglée
  function progression(section) {
    const course = section.offsetHeight - innerHeight;
    if (course <= 0) return 0;
    return borne(-section.getBoundingClientRect().top / course, 0, 1);
  }

  // Les tailles qui dépendent de la fenêtre ou des images, recalculées ensemble
  const retailles = [];
  function retailler() { retailles.forEach(f => f()); }

  /* ── 1. Titres au cadrage (direction B.5) ──
     On mesure le texte à 100px (offsetWidth ignore les transformations),
     puis on pose --fit pour qu'il remplisse sa boîte, marge à marge. */
  function cadrer() {
    document.querySelectorAll('.fit').forEach(el => {
      const texte = el.querySelector('.t') || el;
      el.style.fontSize = '100px';
      const largeur = texte.offsetWidth;
      el.style.fontSize = '';
      const cible = el.clientWidth;
      if (largeur && cible) el.style.setProperty('--fit', (100 * cible / largeur * 0.995).toFixed(2) + 'px');
    });
  }
  retailles.push(cadrer);
  cadrer();

  /* ── 2. Entrée de page (motion A, direction K.50) ──
     Calque image : il se recadre vers sa place dans l'ouverture (data-ov).
     Calque couleur (projet suivant) : il se retire vers le haut. */
  function entrer() {
    const ov = document.getElementById('ov');
    if (!ov) return;
    const fin = () => ov.remove();

    if (ov.dataset.type === 'aplat') {
      ov.animate(
        [{ clipPath: 'inset(0px 0px 0% 0px)' }, { clipPath: 'inset(0px 0px 100% 0px)' }],
        { duration: 850, easing: IO, fill: 'forwards' }
      ).finished.then(fin);
      return;
    }

    const img = ov.querySelector('img');
    const cible = document.querySelector('[data-ov]');
    if (!img || !img.naturalWidth || !cible) {
      ov.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, easing: 'ease', fill: 'forwards' }).finished.then(fin);
      return;
    }

    // Même image, deux cadrages « cover » : plein écran puis la boîte cible.
    // Les deux sont une simple échelle de l'image, donc on passe de l'un à
    // l'autre par transform, et la découpe suit le bord de la boîte.
    const W = innerWidth, H = innerHeight;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const b = cible.getBoundingClientRect();
    const s0 = Math.max(W / iw, H / ih);
    const w0 = iw * s0, h0 = ih * s0;
    const x0 = (W - w0) / 2, y0 = (H - h0) / 2;
    const pos = getComputedStyle(cible).objectPosition.split(' ').map(v => parseFloat(v) / 100);
    const px = isNaN(pos[0]) ? 0.5 : pos[0];
    const py = isNaN(pos[1]) ? 0.5 : pos[1];
    // « cover » remplit la boîte, « contain » y tient en entier
    const contient = getComputedStyle(cible).objectFit === 'contain';
    const s1 = (contient ? Math.min : Math.max)(b.width / iw, b.height / ih);
    const w1 = iw * s1, h1 = ih * s1;
    const x1 = b.left + (b.width - w1) * px;
    const y1 = b.top + (b.height - h1) * py;

    Object.assign(img.style, { width: w0 + 'px', height: h0 + 'px', objectFit: 'fill', transformOrigin: '0 0' });
    const duree = mobile() ? 750 : 850;
    img.animate(
      [{ transform: `translate(${x0}px, ${y0}px)` }, { transform: `translate(${x1}px, ${y1}px) scale(${w1 / w0})` }],
      { duration: duree, easing: IO, fill: 'forwards' }
    );
    // Une cible détourée (clip-path) ne recouvre pas tout son rectangle :
    // le calque s'efface alors en douceur au lieu de disparaître d'un coup
    const detouree = getComputedStyle(cible).clipPath !== 'none' || contient;
    ov.animate(
      [{ clipPath: 'inset(0px 0px 0px 0px)' },
       { clipPath: `inset(${b.top}px ${W - b.right}px ${H - b.bottom}px ${b.left}px)` }],
      { duration: duree, easing: IO, fill: 'forwards' }
    ).finished.then(() => {
      if (!detouree) { fin(); return; }
      ov.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: 'ease', fill: 'forwards' }).finished.then(fin);
    });
  }

  // On attend la police (pour le cadrage) et l'image cible, jamais plus de 500 ms
  const cibleOv = document.querySelector('[data-ov]');
  const imgOv = document.querySelector('#ov img');
  Promise.race([
    Promise.all([
      document.fonts ? document.fonts.ready : null,
      imgOv && imgOv.decode ? imgOv.decode().catch(() => {}) : null,
      cibleOv && cibleOv.decode ? cibleOv.decode().catch(() => {}) : null,
    ]),
    attente(500),
  ]).then(() => {
    cadrer();
    requestAnimationFrame(entrer);
  });
  if (document.fonts) document.fonts.ready.then(retailler);

  /* ── 3. Révélations au scroll (motion B) ──
     Textes : data-rv="txt". Images et cases vides : automatique, par
     découpe (direction K.54), sauf dans les mises en scène (data-rv-non). */
  const aReveler = [...document.querySelectorAll('[data-rv]')];
  document.querySelectorAll('main .empty, main img').forEach(el => {
    if (el.hasAttribute('data-rv') || el.hasAttribute('data-ov') || el.closest('[data-rv-non], [data-rv]')) return;
    el.setAttribute('data-rv', 'img');
    aReveler.push(el);
  });

  if (reduit || !('IntersectionObserver' in window)) {
    aReveler.forEach(el => el.classList.add('in'));
  } else {
    // Une image découpée à 100 % n'a plus de surface visible : l'observateur
    // ne la verrait jamais entrer. On observe donc son parent, qui n'est pas découpé.
    const suivis = new Map();
    const io = new IntersectionObserver(entrees => {
      entrees.forEach(e => {
        if (!e.isIntersecting) return;
        (suivis.get(e.target) || []).forEach(el => el.classList.add('in'));
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.1 });
    aReveler.forEach(el => {
      const temoin = el.dataset.rv === 'img' && el.parentElement ? el.parentElement : el;
      if (!suivis.has(temoin)) { suivis.set(temoin, []); io.observe(temoin); }
      suivis.get(temoin).push(el);
    });
  }

  /* ── 4. Une seule boucle requestAnimationFrame, arrêtée onglet caché ── */
  const effets = [];
  let raf = 0;
  function boucle() {
    effets.forEach(f => f());
    raf = requestAnimationFrame(boucle);
  }
  function lancer() { if (!raf && effets.length) raf = requestAnimationFrame(boucle); }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else { lancer(); }
  });

  // Parallaxe douce (motion B.7) : seulement sur l'article (6) et l'image pleine largeur (5)
  document.querySelectorAll('[data-speed]').forEach(el => {
    const vitesse = parseFloat(el.dataset.speed) || 0.06;
    const cadre = el.parentElement;
    let y = 0;
    effets.push(() => {
      if (reduit || mobile()) { if (y) { y = 0; el.style.transform = ''; } return; }
      const r = cadre.getBoundingClientRect();
      if (r.bottom < -200 || r.top > innerHeight + 200) return;
      const cible = borne(-(r.top + r.height / 2 - innerHeight / 2) * vitesse, -r.height * 0.06, r.height * 0.06);
      y += (cible - y) * 0.1;
      el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
    });
  });

  /* ── 5. Effets épinglés ── */

  // Projet 1 : le portant. Le défilement vertical fait glisser le rail.
  // Course = du premier écran calé sur la marge gauche au dernier calé sur la
  // marge droite, mesurée sur le dernier écran (pas sur scrollWidth, que les
  // légendes peuvent agrandir).
  const portant = document.querySelector('[data-pin="portant"]');
  if (portant) {
    const rail = portant.querySelector('.rail');
    const dernier = rail.querySelector('figure:last-of-type');
    const fixe = () => reduit || mobile();
    const course = () => {
      const marge = parseFloat(getComputedStyle(rail).paddingRight) || 0;
      return Math.max(0, dernier.offsetLeft + dernier.offsetWidth + marge - innerWidth);
    };
    let x = 0;
    retailles.push(() => {
      portant.style.height = fixe() ? '' : (innerHeight + course()) + 'px';
    });
    effets.push(() => {
      if (fixe()) return;
      const max = course();
      const cible = -progression(portant) * max;
      x += (cible - x) * 0.14;
      if (Math.abs(cible - x) < 0.1) x = cible;
      x = borne(x, -max, 0);
      rail.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
    });
  }

  // Projet 2 : la salle s'éteint, puis l'affiche s'ouvre en calques
  const noir = document.querySelector('[data-noir]');
  if (noir) {
    effets.push(() => {
      const r = noir.getBoundingClientRect();
      const dedans = r.top < innerHeight * 0.6 && r.bottom > innerHeight * 0.4;
      if (dedans !== document.body.classList.contains('is-dark')) document.body.classList.toggle('is-dark', dedans);
    });
  }
  const salle = document.querySelector('[data-pin="salle"]');
  if (salle) {
    const scene = salle.querySelector('.salle-scene');
    const nom = salle.querySelector('.calque-nom');
    // Ordre du DOM : personnage, décor, premier plan, titre, affiche finale.
    // Chaque calque arrive par fondu à son seuil de défilement et recouvre le précédent.
    const calques = [...salle.querySelectorAll('.calque, .affiche-finale')];
    const seuils = [0, 0.2, 0.32, 0.46, 0.72];
    let k = 0, actuel = null, apla = false;
    effets.push(() => {
      if (reduit || mobile()) {
        // Lecture verticale : tous les calques visibles, chacun à sa place (CSS)
        if (!apla) { calques.forEach(c => { c.style.opacity = ''; c._o = undefined; }); apla = true; }
        return;
      }
      apla = false;
      const t = progression(salle);
      // L'affiche s'incline pendant la construction, puis se repose à plat
      const kCible = lisse(0.1, 0.42, t) - lisse(0.58, 0.82, t);
      k += (kCible - k) * 0.12;
      scene.style.setProperty('--k', k.toFixed(4));
      calques.forEach((c, i) => {
        const o = i === 0 ? 1 : lisse(seuils[i], seuils[i] + 0.08, t);
        if (c._o !== o) { c._o = o; c.style.opacity = o.toFixed(3); }
      });
      let i = -1;
      seuils.forEach((p, n) => { if (t >= Math.max(p, 0.08)) i = n; });
      const texte = i < 0 ? '' : calques[i].dataset.nom;
      if (texte !== actuel) {
        actuel = texte;
        nom.style.opacity = 0;
        setTimeout(() => { nom.textContent = actuel; nom.style.opacity = actuel ? 1 : 0; }, 150);
      }
    });
  }

  // Projet 3 : le wireframe et la maquette défilent ensemble, au même pourcentage
  const duo = document.querySelector('[data-pin="duo"]');
  if (duo) {
    const pages = [...duo.querySelectorAll('.page')];
    const notes = duo.querySelector('.notes');
    const course = (pg) => Math.max(0, pg.offsetHeight - pg.parentElement.clientHeight);
    let p = 0;
    retailles.push(() => {
      if (reduit) { duo.style.height = ''; return; }
      if (notes) notes.style.height = pages[0].offsetHeight + 'px';
      duo.style.height = (innerHeight + Math.max(...pages.map(course))) + 'px';
    });
    effets.push(() => {
      if (reduit) return;
      const cible = progression(duo);
      p += (cible - p) * 0.12;
      if (Math.abs(cible - p) < 0.0005) p = cible;
      pages.forEach(pg => { pg.style.transform = `translate3d(0, ${(-p * course(pg)).toFixed(2)}px, 0)`; });
      if (notes) notes.style.transform = `translate3d(0, ${(-p * course(pages[0])).toFixed(2)}px, 0)`;
    });
    // Les vraies captures changent la hauteur des pages en se chargeant
    duo.querySelectorAll('img').forEach(i => i.addEventListener('load', retailler));
  }

  // Projet 5 : le titre traverse, les cartons montent devant et derrière lui.
  // Même inertie que la grille de Works (0,92).
  const traverse = document.querySelector('[data-pin="traverse"]');
  if (traverse) {
    const titre = traverse.querySelector('.titre');
    const cartons = [...traverse.querySelectorAll('.carton')];
    let p = 0;
    effets.push(() => {
      if (reduit || mobile()) { titre.style.transform = ''; return; }
      p += (progression(traverse) - p) * 0.08;
      // Au repos le mot se lit en entier ; il glisse ensuite de 45 % de l'écran vers la gauche
      const course = innerWidth * 0.45;
      titre.style.transform = `translate3d(${(-p * course).toFixed(2)}px, -50%, 0)`;
      // Chaque carton monte de sa position de repos à sa vitesse (data-v, en hauteurs d'écran)
      cartons.forEach(c => {
        const v = parseFloat(c.dataset.v) || 1;
        c.style.transform = `translate3d(0, ${(-p * v * innerHeight).toFixed(2)}px, 0)`;
      });
    });
  }

  // Queen en mobile : le titre défile seul, un toucher le met en pause (WCAG 2.2.2)
  if (traverse) {
    const titre = traverse.querySelector('.titre');
    titre.addEventListener('click', () => { if (mobile()) titre.classList.toggle('en-pause'); });
  }

  // Header et flèche : noirs francs sur un aplat de couleur (data-couleur, bloc
  // suivant rempli, calque de passage), sinon en « différence » (project-style.css)
  const entete = document.querySelector('header');
  const fleche = document.querySelector('.back-nav');
  const aplats = [...document.querySelectorAll('[data-couleur]')];
  const suivantBloc = document.querySelector('.suivant');
  function surCouleur() {
    if (document.querySelector('.ov[data-couleur]')) return true;
    const h = entete.getBoundingClientRect();
    const f = fleche ? fleche.getBoundingClientRect() : h;
    const haut = Math.min(h.top, f.top), bas = Math.max(h.bottom, f.bottom);
    const dessous = (el) => { const r = el.getBoundingClientRect(); return r.top < bas && r.bottom > haut; };
    if (aplats.some(dessous)) return true;
    return !!(suivantBloc && suivantBloc.matches(':hover, :focus-visible, :active') && dessous(suivantBloc));
  }
  function majEntete() {
    const sur = surCouleur();
    if (sur !== document.body.classList.contains('sur-couleur')) document.body.classList.toggle('sur-couleur', sur);
  }
  if (entete) { effets.push(majEntete); majEntete(); }

  /* ── 6. Projet 4 : planche-contact ── */
  const planche = document.querySelector('.planche');
  if (planche) {
    const vues = [...planche.querySelectorAll('.vue')];
    const grande = document.querySelector('.grande-vue');
    const legende = document.querySelector('.grande .legende');
    // Longueur du trait au marqueur, en pixels d'écran (le trait ne se déforme
    // pas avec la case : vector-effect non-scaling-stroke), pour le tracer en entier
    retailles.push(() => {
      const r = planche.querySelector('.marqueur').getBoundingClientRect();
      planche.style.setProperty('--trait', Math.ceil(2.1 * (r.width + r.height)) + 'px');
    });
    function choisir(vue) {
      vues.forEach(v => {
        v.classList.toggle('choisie', v === vue);
        v.setAttribute('aria-pressed', v === vue ? 'true' : 'false');
      });
      if (!grande) return;
      grande.classList.add('change');
      setTimeout(() => {
        const media = vue.firstElementChild.cloneNode(true);
        media.removeAttribute('data-rv');
        media.classList.remove('in');
        if (media.tagName === 'IMG' && vue.dataset.grande) media.src = vue.dataset.grande;
        grande.replaceChildren(media);
        if (legende) {
          legende.textContent = vue.dataset.legende || '';
          legende.hidden = !vue.dataset.legende;
        }
        grande.classList.remove('change');
      }, reduit ? 0 : 200);
    }
    vues.forEach((v, i) => {
      v.addEventListener('click', () => choisir(v));
      // Flèches pour se déplacer dans la planche, Entrée pour choisir
      v.addEventListener('keydown', e => {
        const colonnes = getComputedStyle(planche).gridTemplateColumns.split(' ').length;
        const pas = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: colonnes, ArrowUp: -colonnes }[e.key];
        if (!pas) return;
        e.preventDefault();
        const suivante = vues[borne(i + pas, 0, vues.length - 1)];
        suivante.focus();
      });
    });
  }

  /* ── 7. Sorties ── */
  let stockage = true;
  try { sessionStorage.setItem('_t', '1'); sessionStorage.removeItem('_t'); } catch (e) { stockage = false; }
  const departs = [];

  // Projet suivant : l'aplat (déjà plein au survol) s'ouvre en plein écran
  // depuis le rectangle du bloc, puis la page suivante démarre sur lui.
  document.querySelectorAll('.suivant').forEach(a => {
    a.addEventListener('click', e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
      e.preventDefault();
      const url = a.href;
      if (reduit || !stockage || !Element.prototype.animate) {
        partir(url, 200);
        return;
      }
      const couleur = getComputedStyle(a).getPropertyValue('--next').trim();
      const r = a.getBoundingClientRect();
      const W = innerWidth, H = innerHeight;
      const calque = document.createElement('div');
      calque.className = 'ov';
      calque.dataset.couleur = '';
      calque.style.background = couleur;
      document.body.appendChild(calque);
      const anim = calque.animate(
        [{ clipPath: `inset(${Math.max(0, r.top)}px ${W - r.right}px ${Math.max(0, H - r.bottom)}px ${r.left}px)` },
         { clipPath: 'inset(0px 0px 0px 0px)' }],
        { duration: mobile() ? 750 : 850, easing: IO, fill: 'forwards' }
      );
      departs.push(anim);
      anim.finished.then(() => {
        try { sessionStorage.setItem('ouverture', JSON.stringify({ type: 'aplat', c: couleur })); } catch (err) { /* rien */ }
        location.href = url;
      });
    });
  });

  // La flèche retour vers Works est gérée par shared.js (Passage), comme le menu

  function partir(url, duree) {
    if (!Element.prototype.animate) { location.href = url; return; }
    document.querySelectorAll('main, .fin').forEach(el => {
      departs.push(el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: duree, easing: reduit ? 'linear' : DEP, fill: 'forwards' }));
    });
    setTimeout(() => { location.href = url; }, duree);
  }

  // Retour arrière du navigateur (page en cache) : on remet tout en place
  addEventListener('pageshow', e => {
    if (!e.persisted) return;
    departs.splice(0).forEach(a => a.cancel());
    document.querySelectorAll('.ov').forEach(o => o.remove());
  });

  /* ── Lancement ── */
  let delai = 0;
  addEventListener('resize', () => {
    clearTimeout(delai);
    delai = setTimeout(retailler, 120);
  });
  addEventListener('load', retailler);
  // Filet de sécurité : toute variation de taille de la page (barre d'adresse
  // mobile, zoom, fenêtre redimensionnée sans événement) recalcule les tailles
  if ('ResizeObserver' in window) {
    let largeur = innerWidth;
    new ResizeObserver(() => {
      if (innerWidth === largeur) return;
      largeur = innerWidth;
      retailler();
    }).observe(document.documentElement);
  }
  retailler();
  lancer();
})();
