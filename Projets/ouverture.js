/* ═══════════════════════════════════════════════════════════════
   Pages projet : lu dans <head>, avant le premier rendu (motion A.1)
   Si on arrive par un clic (case de Works ou bloc « Projet suivant »),
   sessionStorage.ouverture contient l'image ou la couleur de départ :
   on pose aussitôt un calque plein écran identique, que project.js
   recadre ou retire ensuite. Sans valeur (accès direct), rien.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  var doc = document.documentElement;
  doc.classList.add('js');

  // Filet de sécurité : si project.js ne se charge pas, le contenu caché
  // pour les révélations au scroll redevient visible
  setTimeout(function () {
    if (!doc.classList.contains('rv-ok')) doc.classList.add('rv-secours');
  }, 2500);

  var o = null;
  try {
    o = JSON.parse(sessionStorage.getItem('ouverture'));
    sessionStorage.removeItem('ouverture');
  } catch (e) {
    o = null;
  }
  if (!o) return;
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var ov = document.createElement('div');
  ov.id = 'ov';
  ov.className = 'ov';
  ov.setAttribute('aria-hidden', 'true');

  if (o.type === 'img' && o.src) {
    // Même image que la case cliquée, déjà en cache : aucun saut entre les deux pages
    var img = new Image();
    img.src = o.src;
    img.alt = '';
    ov.style.background = 'var(--case)';
    ov.appendChild(img);
    ov.dataset.type = 'img';
  } else {
    ov.style.background = o.c || '#000';
    ov.dataset.type = 'aplat';
    ov.dataset.couleur = '';   // header en noir franc tant que l'aplat est là
  }

  doc.classList.add('ouv');
  doc.appendChild(ov);
})();
