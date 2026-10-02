/* ═══════════════════════════════════════════════════════════════
   Passages entre les pages : lu dans <head>, avant le premier rendu.
   Chargé par Works, About et les 6 pages projet. Remplace Projets/ouverture.js
   (gardé en place, plus chargé).

   Deux mémoires possibles dans sessionStorage, posées par la page de départ :
   - ouverture : la case de Works (image) ou le bloc « Projet suivant » (aplat).
     Calque #ov, repris par project.js (inchangé).
   - passage : menu WORKS / ABOUT ou flèche retour (motion-transitions.md 1, 3).
     Calque #passage avec le mot géant, refermé par shared.js (Passage.arriver).
   Le calque est posé tel qu'il était à la fin du départ : aucun saut.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  var doc = document.documentElement;
  doc.classList.add('js');

  // Filet de sécurité des pages projet : si project.js ne se charge pas,
  // le contenu caché pour les révélations au scroll redevient visible
  setTimeout(function () {
    if (!doc.classList.contains('rv-ok')) doc.classList.add('rv-secours');
  }, 2500);

  var reduit = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var lire = function (cle) {
    try {
      var v = JSON.parse(sessionStorage.getItem(cle));
      sessionStorage.removeItem(cle);
      return v;
    } catch (e) {
      return null;
    }
  };

  /* ── Ouverture (case de Works, projet suivant) ── */
  var o = lire('ouverture');
  if (o && !reduit) {
    var ov = document.createElement('div');
    ov.id = 'ov';
    ov.className = 'ov';
    ov.setAttribute('aria-hidden', 'true');
    if (o.type === 'img' && o.src) {
      // Même image que la case cliquée, déjà en cache
      var img = new Image();
      img.src = o.src;
      img.alt = '';
      ov.style.background = '#ebebeb';
      ov.appendChild(img);
      ov.dataset.type = 'img';
    } else {
      ov.style.background = o.c || '#000';
      ov.dataset.type = 'aplat';
      ov.dataset.couleur = '';   // header en noir franc tant que l'aplat est là
    }
    doc.classList.add('ouv');
    doc.appendChild(ov);
  }

  /* ── Passage (menu, flèche retour) ── */
  var p = lire('passage');
  if (!p) return;

  // Mouvement réduit : pas de calque, la page arrive en fondu (shared.css)
  if (reduit || p.fondu) {
    doc.classList.add('passage-fondu');
    return;
  }

  var preloaderVu = true;
  try { preloaderVu = !!sessionStorage.getItem('preloaderShown'); } catch (e) { /* rien */ }

  var cal = document.createElement('div');
  cal.id = 'passage';
  cal.className = 'ov ov-passage';
  cal.setAttribute('aria-hidden', 'true');
  cal.dataset.couleur = '';
  cal.dataset.vers = p.vers || 'lien';
  cal.dataset.page = p.page || '';
  cal.style.background = p.c;
  cal.style.color = p.ink || '#000';

  var marge = innerWidth >= 1100 ? 80 : innerWidth >= 768 ? 48 : 20;
  var mot = document.createElement('div');
  mot.className = 'ov-mot';
  mot.style.left = marge + 'px';
  mot.style.fontSize = (p.fs || 100) + 'px';
  var masque = document.createElement('span');
  masque.className = 'ov-masque';
  var texte = document.createElement('span');
  texte.textContent = p.mot || '';
  masque.appendChild(texte);
  mot.appendChild(masque);
  cal.appendChild(mot);

  if (p.ink === '#fff') doc.classList.add('passage-sombre');

  // Premier passage de la session sur Works : le preloader garde la main,
  // le calque s'efface simplement (motion-transitions.md 4)
  if (p.page === 'works' && !preloaderVu && /\/Projets\/(index\.html)?$/.test(location.pathname)) {
    cal.dataset.fondre = '';
  } else {
    // Les entrées de page attendent que l'aplat commence à se refermer
    doc.classList.add('passage-attente', 'passage-vers-' + (p.page || 'page'));
    doc.style.setProperty('--entree', p.page === 'about' ? '380ms' : '345ms');
  }
  doc.appendChild(cal);
})();
