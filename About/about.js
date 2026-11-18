// Page About : défilement lissé (Lenis, cette page seulement), méta qui s'en va, photo qui
// s'éteint sous le texte, mots de la phrase qui s'allument. Direction : .portfolio/2026-10-31-refonte-about/direction.md
// Le portrait est fixe (plus de relief au curseur). Le bouton COPIER est géré dans shared.js.
(function () {
  // Portrait collant : il entre par le bas de l'écran quand le haut de la phrase est à cette fraction de la hauteur d'écran
  // (0,30 = vers le quart supérieur ; plus petit = plus tard, plus grand = plus tôt)
  const SEUIL_PORTRAIT = 0.30;
  const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const bureau = () => window.innerWidth >= 768;
  const borne = (v, a, b) => Math.min(b, Math.max(a, v));

  const fond = document.querySelector('.fond');
  const meta = document.querySelector('.meta');
  const bio = document.querySelector('.bio');
  const allume = document.querySelector('.bio-allume');
  const portrait = document.querySelector('.portrait');
  if (!fond || !bio || !allume) return;

  // Phrase coupée en mots (un span par mot, les espaces restent du texte)
  const mots = [];
  const texte = allume.textContent;
  allume.textContent = '';
  texte.split(/([ \t\n]+)/).forEach(morceau => {
    if (!morceau) return;
    if (/^[ \t\n]+$/.test(morceau)) { allume.appendChild(document.createTextNode(morceau)); return; }
    const s = document.createElement('span');
    s.className = 'mot';
    s.textContent = morceau;
    allume.appendChild(s);
    mots.push(s);
  });

  // Position de la phrase dans la page (hors défilement), remesurée au redimensionnement
  let hautBio = 0;
  let centres = [];   // milieu vertical de chaque mot dans la page
  const mesurer = () => {
    hautBio = bio.getBoundingClientRect().top + window.scrollY;
    centres = mots.map(m => { const r = m.getBoundingClientRect(); return r.top + r.height / 2 + window.scrollY; });
    maj(window.scrollY);
  };
  mesurer();
  window.addEventListener('resize', mesurer);
  window.addEventListener('load', mesurer);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(mesurer);

  // Les trois gestes liés au défilement (Mouvement 4, 5, 6)
  function maj(y) {
    const vh = window.innerHeight;
    const grand = bureau();

    if (meta && grand) {
      const m = borne((y - 0.05 * vh) / (0.20 * vh), 0, 1);
      meta.style.opacity = String(1 - m);
      meta.style.transform = reduit ? '' : 'translateY(' + (-90 * m) + 'px)';
    }

    const p = borne((y - Math.max(0, hautBio - 0.92 * vh)) / (1.25 * vh), 0, 1);
    fond.style.opacity = String(1 - p);
    fond.style.transform = (grand && !reduit)
      ? 'translateY(' + (110 * p) + '%) scale(' + (1.075 - 0.075 * p) + ')'
      : '';
    // Portrait collant : pur effet du défilement. Il monte à la vitesse de la page depuis le bas de l'écran (début de la zone collante calculé
    // sur la position de la phrase), jusqu'à 54vh où il s'arrête.
    if (portrait && grand) {
      const entree = hautBio - SEUIL_PORTRAIT * vh;
      const decalage = Math.max(0, (1 - 0.54) * vh + (entree - y));
      portrait.style.transform = 'translateY(' + (reduit && y >= entree ? 0 : decalage) + 'px)';
    }
    document.documentElement.style.setProperty('--p-fond', p);
    fond.dataset.eteint = p >= 1 ? '1' : '';

    if (!reduit) {
      // Ligne d'allumage fixe à mi-hauteur de l'écran : un mot passe au blanc quand son milieu
      // atteint 50 % de la hauteur visible (au-dessus blanc, en dessous gris). Fondu d'environ
      // 4 % de la hauteur pour que le passage ne soit pas sec ; la transition CSS fait le reste.
      const ligne = y + 0.5 * vh;
      mots.forEach((mot, i) => {
        mot.style.opacity = String(0.25 + 0.75 * borne((ligne - centres[i]) / (0.04 * vh) + 0.5, 0, 1));
      });
    }
  }

  // Boucle au repos : elle s'arrête quand la page ne bouge plus et repart sur un geste
  let lenis = null;
  let tourne = false, dernierY = -1, calme = 0;
  const boucle = (t) => {
    if (lenis) lenis.raf(t);
    const y = window.scrollY;
    if (y !== dernierY) { maj(y); dernierY = y; calme = 0; } else calme++;
    if (calme > 10 && !(lenis && lenis.isScrolling)) { tourne = false; return; }
    requestAnimationFrame(boucle);
  };
  const relancer = () => { calme = 0; if (!tourne) { tourne = true; requestAnimationFrame(boucle); } };

  if (!reduit && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    ['wheel', 'touchstart', 'touchmove', 'keydown', 'scroll', 'resize'].forEach(ev =>
      window.addEventListener(ev, relancer, { passive: true }));
    relancer();

    // Overlay Contact ouvert : la page ne défile pas dessous ; à la fermeture au clavier,
    // le focus revient au bouton qui l'a ouvert
    new MutationObserver(() => {
      const ouvert = !!document.querySelector('.ov-contact');
      if (ouvert && !lenis.isStopped) lenis.stop();
      else if (!ouvert && lenis.isStopped) {
        lenis.start();
        relancer();
        if (ouvertAuClavier) { ouvertAuClavier = false; const m = document.getElementById('gros-mail'); if (m) m.focus({ preventScroll: true }); }
      }
    }).observe(document.body, { childList: true });
  } else {
    window.addEventListener('scroll', () => maj(window.scrollY), { passive: true });
    window.addEventListener('resize', () => maj(window.scrollY));
  }
  maj(window.scrollY);

  // E-mail : l'overlay Contact du site (même appel à l'action que partout) ; sans JS, le mailto reste
  let ouvertAuClavier = false;
  const mail = document.getElementById('gros-mail');
  const lienContact = document.querySelector('header nav a[data-dest="contact"]');
  if (mail && lienContact && typeof Passage !== 'undefined') {
    mail.addEventListener('click', e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button) return;
      e.preventDefault();
      ouvertAuClavier = e.detail === 0;
      Passage.ouvrirContact(lienContact);
    });
  }
})();
