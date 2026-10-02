// Preloader Works « Mise au point » (v2, validé par Clément le 2026-10-02).
// Référence : .portfolio/2026-10-02-preloader-profondeur/direction-v2.md
// Les 25 vraies cases visibles de la grille flottent détachées, floues, à des
// profondeurs différentes, puis se collent une à une pour former la grille.
// Le lien WORKS sert de compteur 000 → 100, puis se déroule en menu à rouleaux.
// Une fois par session. Nécessite window.Works (script.js, chargé avant).
(function () {
  if (!window.Works) return;

  // Une seule fois par session : au retour sur Works, grille et menu tout de suite
  try {
    if (sessionStorage.getItem('preloaderShown')) return;
  } catch (e) { /* stockage indisponible : on joue le preloader */ }

  const { grid, projects, cells } = window.Works;
  const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = window.innerWidth < 768;
  const speedBlur = document.getElementById('speedBlur');
  const W = window.innerWidth, H = window.innerHeight;
  const CW = W / 5, CH = H / 5;

  document.body.classList.add('is-loading', 'is-assembling', 'menu-en-cours');
  window.Works.figer();
  if (speedBlur) speedBlur.style.setProperty('--edge-blur', '0px');

  // Un seul message pour les lecteurs d'écran (décision 23)
  const statut = document.createElement('p');
  statut.className = 'sr-only';
  statut.setAttribute('role', 'status');
  statut.textContent = 'Chargement des projets';
  document.body.appendChild(statut);

  // ---------- Les 25 cases visibles en 0,0 ; les 200 autres attendent (décision 2) ----------
  const medias = projects.map(() => []);
  const visibles = [];
  cells.forEach(c => {
    if (c.projet !== null) medias[c.projet].push(c.el.firstChild);
    if (c.row < 5 && c.col < 5) {
      visibles.push({ el: c.el, row: c.row, col: c.col, pi: c.projet, media: c.el.firstChild, pret: c.projet === null });
    } else {
      c.el.style.visibility = 'hidden';
    }
  });

  // ---------- Menu : mesures prises sur le vrai rendu, avant les rouleaux ----------
  const [lienWorks, lienAbout, lienContact] = document.querySelectorAll('header nav a');
  function mesurer(a) {
    const r = a.getBoundingClientRect();
    return { h: r.height, w: r.width / a.textContent.length }; // largeur d'un caractère + letter-spacing
  }
  const mWorks = mesurer(lienWorks), mAbout = mesurer(lienAbout), mContact = mesurer(lienContact);
  lienWorks.setAttribute('aria-label', 'Works');
  lienAbout.style.visibility = 'hidden';
  lienContact.style.visibility = 'hidden';

  const HASARD = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const auHasard = n => Array.from({ length: n }, () => HASARD[Math.floor(Math.random() * HASARD.length)]);

  // Un rouleau : fenêtre d'un caractère, bande verticale de caractères empilés (décision 24)
  function rouleau(chars, m, largeur = m.w) {
    const el = document.createElement('span');
    el.className = 'rouleau';
    el.style.width = largeur + 'px';
    el.style.height = m.h + 'px';
    const bande = document.createElement('span');
    bande.className = 'bande';
    el.appendChild(bande);
    const r = { el, bande, m };
    remplir(r, chars);
    return r;
  }
  function remplir(r, chars) {
    r.bande.innerHTML = chars.map(c => `<span style="height:${r.m.h}px;line-height:${r.m.h}px">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
    r.bande.style.transform = 'translateY(0)';
  }
  function conteneur(a) {
    const c = document.createElement('span');
    c.className = 'rouleaux';
    c.setAttribute('aria-hidden', 'true');
    a.textContent = '';
    a.appendChild(c);
    return c;
  }

  // ---------- Compteur 000 → 100, à la place de WORKS (décisions 19 à 23) ----------
  const CHIFFRES = '01234567890123456789'.split('');
  const boiteWorks = conteneur(lienWorks);
  const roulChiffres = [0, 1, 2].map(() => {
    const r = rouleau(reduit ? ['0'] : CHIFFRES, mWorks);
    r.n = 0;
    boiteWorks.appendChild(r.el);
    return r;
  });
  let compte = 0;

  function afficherCompte(v) {
    const s = String(v).padStart(3, '0');
    roulChiffres.forEach((r, i) => {
      const m = +s[i];
      if (m === r.n) return; // un chiffre qui ne change pas ne bouge pas
      if (reduit) { remplir(r, [s[i]]); r.n = m; return; }
      const cible = m < r.n ? m + 10 : m; // 9 → 0 : on continue de monter
      const a = r.bande.animate(
        [{ transform: `translateY(${-r.n * r.m.h}px)` }, { transform: `translateY(${-cible * r.m.h}px)` }],
        { duration: 160, easing: 'cubic-bezier(.7, 0, .2, 1)', fill: 'forwards' }
      );
      r.n = m;
      a.onfinish = () => { r.bande.style.transform = `translateY(${-m * r.m.h}px)`; a.cancel(); };
    });
  }

  // ---------- Cases : état de départ (décisions 3 à 7) ----------
  const P = mobile ? 900 : 1400;
  if (!reduit) {
    grid.style.perspective = P + 'px';
    grid.style.perspectiveOrigin = '50vw 50vh';
  }
  const alea = (a, b) => a + Math.random() * (b - a);

  visibles.forEach(c => {
    const ddx = (c.col + 0.5) * CW - W / 2;
    const ddy = (c.row + 0.5) * CH - H / 2;
    c.dist = Math.hypot(ddx / CW, ddy / CH) + alea(-0.6, 0.6);
    c.opPose = c.pi === null ? 0.15 : 0.55;
    c.opVol  = c.pi === null ? 0.35 : 1;
    if (c.pi !== null) c.el.style.background = '#f4f4f4';

    if (reduit) { c.el.style.opacity = '0'; return; }

    const z = mobile ? alea(-1400, -600) : alea(-2400, -1000);
    const k = 1.15 * (P - z) / P - 1;
    const tx = ddx * k + alea(-0.08, 0.08) * CW;
    const ty = ddy * k + alea(-0.08, 0.08) * CH;
    const r = alea(-2.5, 2.5);
    c.depart = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, ${z.toFixed(0)}px) rotateZ(${r.toFixed(2)}deg)`;
    c.flou = mobile ? 1 + (-z - 600) / 800 * 3 : 2 + (-z - 1000) / 1400 * 6;

    c.el.style.transform = c.depart;
    c.el.style.filter = `blur(${c.flou.toFixed(2)}px)`;
    c.el.style.opacity = c.opVol;
    c.el.style.borderColor = 'transparent';
    c.el.style.willChange = 'transform, filter, opacity';
    // Apparition de toutes les cases en même temps, 400 ms (décision 6)
    c.el.animate([{ opacity: 0 }, { opacity: c.opVol }], { duration: 400, easing: 'ease' });
  });

  // Ordre : du centre vers les bords, la case centrale (index 12) en premier (décision 9)
  const ordre = visibles.slice().sort((a, b) => a.dist - b.dist);
  const centre = ordre.findIndex(c => c.row === 2 && c.col === 2);
  ordre.unshift(ordre.splice(centre, 1)[0]);

  // ---------- Vol et collage (décisions 7, 8, 31, 38) ----------
  let poses = 0;
  let ligneFinie = false;
  let assemblage = true;

  function lancer(c, duree) {
    if (c.lance) return;
    c.lance = true;
    const el = c.el;

    if (reduit) {
      const a = el.animate([{ opacity: 0 }, { opacity: c.opPose }], { duration: 150, easing: 'ease', fill: 'forwards' });
      a.onfinish = () => { el.style.removeProperty('opacity'); a.cancel(); poser(); };
      return;
    }

    const a = el.animate([
      { transform: c.depart, filter: `blur(${c.flou.toFixed(2)}px)`, opacity: c.opVol },
      { transform: 'none',   filter: 'blur(0px)',                   opacity: c.opPose },
    ], { duration: duree, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'forwards' });

    a.onfinish = () => {
      // Posée : plus aucun style inline, ce sont les règles .cell / .project-cell qui s'appliquent
      ['transform', 'filter', 'opacity', 'border-color', 'will-change'].forEach(p => el.style.removeProperty(p));
      a.cancel();
      // Le filet se dessine au contact (décision 7)
      el.animate([{ borderColor: 'transparent' }, { borderColor: 'rgba(0, 0, 0, 0.15)' }], { duration: 200, easing: 'ease' });
      poser();
    };
  }

  function poser() {
    poses++;
    compte = poses * 4;
    afficherCompte(compte);
    if (poses === visibles.length) finAssemblage();
  }

  // ---------- Ligne de temps minimale (décisions 14, 15, 38) ----------
  const N = ordre.length;
  const depart = i => reduit ? 300 + 80 * i : 300 + 3200 * Math.pow(i / (N - 1), 0.85);

  function creneau(k) {
    // Première case prête dans l'ordre ; celles qui ne le sont pas sont « sautées »
    for (const c of ordre) {
      if (c.lance) continue;
      if (c.pret) { lancer(c, 1100); break; }
      c.saute = true;
    }
    if (k === N - 1) {
      ligneFinie = true;
      ordre.forEach(c => { if (!c.lance && c.pret) lancer(c, 900); });
    }
  }
  for (let k = 0; k < N; k++) setTimeout(() => creneau(k), depart(k));

  // Vrai chargement des 4 vitrines (décisions 10, 11)
  projects.forEach((p, pi) => {
    const img = new Image();
    const fini = ok => {
      if (!assemblage) return; // arrivée après la fin : la grille est déjà normale
      medias[pi].forEach(m => m.classList.add('pret'));
      visibles.filter(c => c.pi === pi).forEach(c => {
        if (c.pret) return;
        c.pret = true;
        if (ok) {
          // L'image apparaît en fondu dans la case encore floue
          c.media.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 250, easing: 'ease' });
          c.el.style.removeProperty('background');
        }
        if (c.saute || ligneFinie) lancer(c, ligneFinie ? 900 : 1100);
      });
    };
    img.onload = () => fini(true);
    img.onerror = () => fini(false);
    img.src = p.image;
  });

  // Plafond 9 s : tout ce qui attend part ensemble (décision 16)
  setTimeout(() => { ordre.forEach(c => { if (!c.lance) { c.pret = true; lancer(c, 900); } }); }, 9000);

  // ---------- Fin de l'assemblage (décision 13) ----------
  function finAssemblage() {
    grid.style.removeProperty('perspective');
    grid.style.removeProperty('perspective-origin');
    cells.forEach(c => c.el.style.removeProperty('visibility'));
    visibles.forEach(c => { if (c.pi !== null) c.el.style.removeProperty('background'); });
    medias.flat().forEach(m => m.classList.remove('pret'));
    assemblage = false;
    document.body.classList.remove('is-loading', 'is-assembling');
    try { sessionStorage.setItem('preloaderShown', '1'); } catch (e) { /* rien */ }
    window.Works.reprendre();
    setTimeout(chiffreVersMenu, 250); // tenue à 100 (décision 25)
  }

  // ---------- Transition chiffre → menu, compteur mécanique D1 (décisions 26 à 29) ----------
  function chiffreVersMenu() {
    if (reduit) return fonduVersMenu();
    const EASE = 'cubic-bezier(.7, 0, .2, 1)';
    const mots = 'WORKS'.split('');

    // 2 rouleaux s'ouvrent à gauche pour W et O
    const nouveaux = [0, 1].map(() => rouleau([' '], mWorks, 0));
    nouveaux.slice().reverse().forEach(r => boiteWorks.prepend(r.el));
    nouveaux.forEach(r => r.el.animate(
      [{ width: '0px' }, { width: mWorks.w + 'px' }],
      { duration: 300, easing: 'cubic-bezier(.16, 1, .3, 1)', fill: 'forwards' }
    ));

    const tous = [...nouveaux, ...roulChiffres];
    const fins = tous.map((r, i) => {
      const actuel = i < 2 ? ' ' : String(compte).padStart(3, '0')[i - 2];
      remplir(r, [actuel, ...auHasard(6), mots[i]]);
      return r.bande.animate(
        [{ transform: 'translateY(0)' }, { transform: `translateY(${-7 * r.m.h}px)` }],
        { duration: 700, delay: i * 50, easing: EASE, fill: 'forwards' }
      ).finished;
    });

    // ABOUT à +200 ms, CONTACT 80 ms après, lettres décalées de 30 ms (décision 27)
    function monter(a, mot, m, retard) {
      const boite = conteneur(a);
      a.style.visibility = 'visible';
      return mot.split('').map((l, i) => {
        const r = rouleau([' ', ...auHasard(3), l], m);
        boite.appendChild(r.el);
        return r.bande.animate(
          [{ transform: 'translateY(0)' }, { transform: `translateY(${-4 * m.h}px)` }],
          { duration: 500, delay: retard + i * 30, easing: EASE, fill: 'both' }
        ).finished;
      });
    }
    fins.push(...monter(lienAbout, 'ABOUT', mAbout, 200));
    fins.push(...monter(lienContact, 'CONTACT', mContact, 280));

    Promise.all(fins).then(menuFinal);
  }

  // Mouvement réduit : 100 s'efface, le menu apparaît en fondu (décision 40)
  function fonduVersMenu() {
    const f = [lienWorks, lienAbout, lienContact].map(a => a.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 100, fill: 'forwards' }).finished);
    Promise.all(f).then(() => {
      menuFinal();
      [lienWorks, lienAbout, lienContact].forEach(a => a.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'ease' }));
    });
  }

  // Le DOM du header redevient exactement celui du site (décision 28)
  function menuFinal() {
    lienWorks.textContent = 'Works';
    lienAbout.textContent = 'About';
    lienContact.textContent = 'Contact';
    lienWorks.removeAttribute('aria-label');
    [lienWorks, lienAbout, lienContact].forEach(a => {
      a.style.removeProperty('visibility');
      a.getAnimations().forEach(x => x.cancel());
      if (!a.getAttribute('style')) a.removeAttribute('style');
    });
    document.body.classList.remove('menu-en-cours');
    statut.remove();
  }
})();
