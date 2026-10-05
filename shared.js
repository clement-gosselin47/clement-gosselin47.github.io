// Curseur
const cursor = document.getElementById('cursor');

// Mot du curseur contextuel (motion C.8) : créé une fois, rempli au survol
const cursorMot = document.createElement('span');
cursorMot.className = 'cursor-mot';
cursorMot.setAttribute('aria-hidden', 'true');
cursor.appendChild(cursorMot);

// Liens et contrôles qui reçoivent l'anneau de 52px (ceux sans data-cur)
const LIENS_ANNEAU = 'nav a, .contact-link, .copy-btn, .copier, .mail, .site-lien, a, button';

window.addEventListener('mousemove', (e) => {
  cursor.style.transform = `translate(calc(${e.clientX}px - 50%), calc(${e.clientY}px - 50%))`;
  if (!cursor.classList.contains('vu')) cursor.classList.add('vu');

  // Un seul écouteur délégué : data-cur donne le mot, sinon l'anneau sur les liens
  const cible = e.target instanceof Element ? e.target : null;
  // data-cur vide : pas de mot (un lien dans une zone à mot, ex. le panneau Contact)
  const avecMot = cible && cible.closest('[data-cur]');
  if (avecMot && avecMot.dataset.cur) {
    const mot = avecMot.dataset.cur;
    if (cursorMot.textContent !== mot) cursorMot.textContent = mot;
    cursor.classList.add('has-mot');
    cursor.classList.remove('hover-nav');
  } else {
    cursor.classList.remove('has-mot');
    cursor.classList.toggle('hover-nav', !!(cible && cible.closest(LIENS_ANNEAU)));
  }
});

// Boutons « copier » (About et fin des pages projet) : data-copy = texte copié,
// data-copied = mot affiché après la copie
document.querySelectorAll('[data-copy]').forEach(btn => {
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
    } catch (err) {
      return;
    }
    const original = btn.textContent;
    btn.textContent = btn.dataset.copied || 'Copié';
    setTimeout(() => { btn.textContent = original; }, 1600);
  });
});


/* ═══════════════════════════════════════════════════════════════
   Passages entre les pages (motion-transitions.md, passe B)
   Une même famille : un aplat naît de ce qu'on clique, remplit l'écran,
   porte un mot géant, puis se referme sur la page d'arrivée.
   - Menu WORKS / ABOUT, de partout vers partout : se referme sur le lien du menu.
   - Flèche retour (pages projet) : couleur du projet quitté, se referme vers la gauche.
   - CONTACT : l'aplat garde l'adresse, la page ne change pas.
   « Projet suivant » reste géré par project.js (inchangé).
   Le calque d'arrivée est posé par passage.js, dans le <head>.
   ═══════════════════════════════════════════════════════════════ */
const Passage = (function () {
  const doc = document.documentElement;
  const IO = 'cubic-bezier(.7,0,.2,1)';
  const OUT = 'cubic-bezier(.16,1,.3,1)';
  const PLEIN = 'inset(0px 0px 0px 0px)';
  const EMAIL = 'clement.gosselin27@gmail.com';   // une seule source, la même que le mailto du header
  const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = () => window.innerWidth < 768;
  const marge = () => window.innerWidth >= 1100 ? 80 : window.innerWidth >= 768 ? 48 : 20;
  const animer = !!Element.prototype.animate;

  // Une couleur par destination, encre noire : le header reste lisible
  const DEST = {
    works:   { mot: 'Works', c: '#FFD400', ink: '#000' },
    about:   { mot: 'About', c: '#F26FD6', ink: '#000' },
    contact: { c: 'var(--bg)', ink: 'var(--fg)' },
  };

  let stockage = true;
  try { sessionStorage.setItem('_p', '1'); sessionStorage.removeItem('_p'); } catch (e) { stockage = false; }

  let occupe = false;
  const enCours = [];

  // Archivo Black n'est téléchargée que quand un texte l'utilise : sur Works, rien
  // ne l'utilise avant le premier passage. On la demande tout de suite, et chaque
  // mot est remesuré dès qu'elle est là (sinon la mesure se fait sur la police
  // de secours, plus étroite, et le mot déborde).
  const police = document.fonts && document.fonts.load
    ? document.fonts.load("400 100px 'Archivo Black'").catch(() => {})
    : Promise.resolve();

  function rectDe(el) {
    const r = el.getBoundingClientRect();
    return `inset(${Math.max(0, r.top)}px ${Math.max(0, window.innerWidth - r.right)}px ${Math.max(0, window.innerHeight - r.bottom)}px ${Math.max(0, r.left)}px)`;
  }

  // Taille du mot au cadrage : mesuré à 100px, il remplit la largeur entre les marges
  // (mesure dans un conteneur très large : sur mobile, une boîte libre serait bridée
  // à la largeur de l'écran et donnerait un mot trop grand)
  function taille(texte, minuscules) {
    const boite = document.createElement('div');
    boite.style.cssText = 'position:absolute;left:0;top:0;width:20000px;visibility:hidden;pointer-events:none';
    const t = document.createElement('span');
    t.style.cssText = "white-space:nowrap;font:400 100px/1 'Archivo Black',sans-serif;letter-spacing:-.025em;" + (minuscules ? '' : 'text-transform:uppercase;');
    t.textContent = texte;
    boite.appendChild(t);
    document.body.appendChild(boite);
    const largeur = t.getBoundingClientRect().width;
    boite.remove();
    return 100 * (window.innerWidth - 2 * marge()) / largeur * 0.995;
  }

  // Tout sauf le header, la flèche, le curseur et les calques devient inerte
  function inerte(oui, garder) {
    Array.from(document.body.children).forEach(el => {
      if (el.matches('header, .theme-nav, .back-nav, .cursor, script, .ov') || el === garder) return;
      if (oui) el.setAttribute('inert', ''); else el.removeAttribute('inert');
    });
  }

  /* ── Départ : l'aplat s'ouvre depuis l'élément cliqué, le mot monte dedans ── */
  function partir({ depuis, c, ink, mot, vers, page, url }) {
    if (occupe) return;
    if (!stockage || !animer) { window.location.href = url; return; }
    occupe = true;
    fermerContactVite();
    if (window.Works && window.Works.freiner) window.Works.freiner();
    inerte(true);

    // Mouvement réduit : le contenu s'efface en 200 ms, puis navigation
    if (reduit) {
      const voile = document.createElement('div');
      voile.className = 'ov ov-passage ov-voile';
      voile.style.background = 'var(--bg)';
      document.body.appendChild(voile);
      enCours.push(voile.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, easing: 'linear', fill: 'forwards' }));
      setTimeout(() => {
        try { sessionStorage.setItem('passage', JSON.stringify({ fondu: true })); } catch (e) { /* rien */ }
        window.location.href = url;
      }, 200);
      return;
    }

    const fs = taille(mot);
    const ov = document.createElement('div');
    ov.className = 'ov ov-passage';
    ov.dataset.couleur = '';
    ov.setAttribute('aria-hidden', 'true');
    ov.style.background = c;
    ov.style.color = ink;
    ov.innerHTML = '<div class="ov-mot"><span class="ov-masque"><span></span></span></div>';
    const boite = ov.querySelector('.ov-mot');
    boite.style.left = marge() + 'px';
    boite.style.fontSize = fs + 'px';
    const texte = ov.querySelector('.ov-masque > span');
    texte.textContent = mot;
    document.body.appendChild(ov);
    doc.classList.add('passage-en-cours');

    police.then(() => { boite.style.fontSize = taille(mot) + 'px'; });

    const d = mobile() ? 750 : 850;
    enCours.push(texte.animate([{ transform: 'translateY(105%)' }, { transform: 'none' }],
      { duration: d * 0.8, delay: d * 0.3, easing: OUT, fill: 'both' }));
    const a = ov.animate([{ clipPath: rectDe(depuis) }, { clipPath: PLEIN }], { duration: d, easing: IO, fill: 'forwards' });
    enCours.push(a);
    // Header blanc sur un aplat sombre, mais seulement quand l'aplat le couvre (mi-course)
    if (ink === '#fff') setTimeout(() => { if (ov.isConnected) doc.classList.add('passage-sombre'); }, d * 0.5);
    a.finished.then(() => {
      const fsFinal = parseFloat(boite.style.fontSize) || fs;
      try { sessionStorage.setItem('passage', JSON.stringify({ c, ink, mot, fs: fsFinal, vers, page })); } catch (e) { /* rien */ }
      window.location.href = url;
    }).catch(() => {});
  }

  /* ── Arrivée : pause de 120 ms (le mot se lit), puis l'aplat se referme ── */
  function arriver() {
    const ov = document.getElementById('passage');
    if (!ov) return;
    if (ov.parentNode !== document.body) document.body.appendChild(ov);
    occupe = true;
    doc.classList.add('passage-en-cours');
    // Fin de l'arrivée : on ne touche aux classes que si aucun nouveau départ n'a
    // commencé entre-temps (le menu est libéré dès le début de la fermeture)
    const fin = () => {
      ov.remove();
      if (!document.querySelector('.ov-passage')) doc.classList.remove('passage-sombre', 'passage-en-cours');
    };
    const go = () => {
      // Premier passage sur Works : le preloader garde la main
      if (ov.hasAttribute('data-fondre')) {
        ov.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, fill: 'forwards' })
          .finished.then(() => { fin(); occupe = false; });
        return;
      }
      const d = mobile() ? 650 : 750;
      let cible = 'inset(0px 0px 100% 0px)';
      if (ov.dataset.vers === 'gauche') {
        cible = 'inset(0px 100% 0px 0px)';                       // on revient : l'aplat repart vers la gauche
      } else {
        const lien = document.querySelector(`header nav a[data-dest="${ov.dataset.page}"]`);
        if (lien) cible = rectDe(lien);                          // il se referme sur le mot du menu
      }
      doc.classList.remove('passage-attente');                   // les entrées de page démarrent
      // Le menu redevient cliquable dès que l'aplat se referme, et le header
      // reprend son encre au même moment (audit-ux-v3, 3 et 5)
      occupe = false;
      setTimeout(() => doc.classList.remove('passage-sombre'), 120);
      ov.animate([{ clipPath: PLEIN }, { clipPath: cible }], { duration: d, delay: 120, easing: IO, fill: 'forwards' })
        .finished.then(fin);
    };
    Promise.race([
      document.fonts ? document.fonts.ready : Promise.resolve(),
      new Promise(r => setTimeout(r, 500)),
    ]).then(() => requestAnimationFrame(go));
  }

  /* ── Contact : la page se vide, une phrase, l'adresse au cadrage ── */
  let contact = null;

  // Source Sans 3 n'est chargée que sur les pages qui l'utilisent (pas sur Works) :
  // on la demande une fois, à la première ouverture
  function chargerTexte() {
    if (!document.querySelector('link[data-contact-police]')) {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600&display=swap';
      l.dataset.contactPolice = '';
      document.head.appendChild(l);
    }
    return document.fonts && document.fonts.load
      ? Promise.all([document.fonts.load("400 20px 'Source Sans 3'"), document.fonts.load("600 18px 'Source Sans 3'")]).catch(() => {})
      : Promise.resolve();
  }

  const FLECHE = '<svg class="link-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5 15L15 5M15 5H7M15 5V13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function ouvrirContact(lien) {
    if (occupe || contact) return;
    if (!animer) { window.location.href = 'mailto:' + EMAIL; return; }
    occupe = true;
    const D = DEST.contact;
    const ov = document.createElement('div');
    ov.className = 'ov ov-contact';
    ov.dataset.couleur = '';
    ov.dataset.cur = 'Fermer';
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-label', 'Contact');
    ov.style.background = D.c;
    ov.style.color = D.ink;
    const m = (t) => '<span class="ov-masque"><span>' + t + '</span></span>';
    const [nom, domaine] = EMAIL.split('@');
    ov.innerHTML =
      '<div class="ov-phrase">' +
        '<p class="ov-accroche">' + m('Je cherche une alternance') + m('en 2j&nbsp;/&nbsp;3j à&nbsp;Bordeaux.') + '</p>' +
        '<p class="ov-appui">' + m('Disponible dès maintenant.') + '</p>' +
      '</div>' +
      '<button type="button" class="ov-adresse" data-cur="Copier" aria-label="Copier l\'adresse ' + EMAIL + '">' +
        '<span class="ov-une">' + m(EMAIL) + '</span>' +
        '<span class="ov-trois"></span>' +
      '</button>' +
      '<p class="ov-bas">' +
        '<button type="button" class="ov-copier" data-cur="" aria-label="Copier l\'adresse email dans le presse-papiers">Copier l\'adresse</button>' +
        '<a href="mailto:' + EMAIL + '" data-cur="" aria-label="Ouvrir ma messagerie pour écrire à ' + EMAIL + '">Ouvrir ma messagerie</a>' +
        '<a href="https://www.linkedin.com/in/clementgosselin" target="_blank" rel="noopener" data-cur="">LinkedIn' + FLECHE + '</a>' +
        '<button type="button" class="ov-fermer" data-cur="" aria-label="Fermer la fenêtre de contact">Fermer</button>' +
      '</p>' +
      '<span class="sr-seul" role="status" aria-live="polite"></span>';
    // Version trois lignes (sous 900px) : coupes aux points naturels de l'adresse
    const [prenom, famille] = nom.split('.');
    const trois = [prenom + '.', famille, '@' + domaine];
    ov.querySelector('.ov-trois').innerHTML = trois.map(m).join('');
    const bouton = ov.querySelector('.ov-adresse');
    const copierBtn = ov.querySelector('.ov-copier');
    const statut = ov.querySelector('[role=status]');

    // Cadrage : une ligne au-dessus de 900px, trois lignes dessous (taille de la plus longue)
    const cadrer = () => {
      ov.style.setProperty('--m', marge() + 'px');
      const t = (window.innerWidth >= 900 || window.innerHeight < 560)
        ? taille(EMAIL, true)
        : Math.min(...trois.map(t => taille(t, true)));
      ov.style.setProperty('--taille', t + 'px');
    };
    cadrer();
    police.then(cadrer);
    window.addEventListener('resize', cadrer);
    chargerTexte();

    document.body.appendChild(ov);
    inerte(true, ov);
    if (window.Works && window.Works.freiner) window.Works.freiner();
    lien.setAttribute('aria-expanded', 'true');

    const visibles = Array.from(ov.querySelectorAll('.ov-accroche .ov-masque > span, .ov-appui .ov-masque > span, .ov-adresse .ov-masque > span'))
      .filter(l => l.getClientRects().length);
    const bas = ov.querySelector('.ov-bas');
    const d = mobile() ? 650 : 750;
    const arrivee = d * 0.3 + visibles.length * 90 + 600;   // le texte est en place
    const timers = [];
    let copie = null;
    if (reduit) {
      ov.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: 'forwards' });
    } else {
      ov.animate([{ clipPath: rectDe(lien) }, { clipPath: PLEIN }], { duration: d, easing: IO, fill: 'forwards' });
      doc.classList.add('contact-ouvert');   // le menu indique CONTACT comme page active
      visibles.forEach((l, i) => l.animate([{ transform: 'translateY(105%)' }, { transform: 'none' }],
        { duration: 600, delay: d * 0.3 + i * 90, easing: OUT, fill: 'both' }));
      bas.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }],
        { duration: 500, delay: 700 + d * 0.3, easing: OUT, fill: 'both' });
    }

    // La bande verte : au toucher elle se déroule seule et reste ; à la souris,
    // un premier regard (déroule, tient, repart) sauf si elle est déjà survolée
    if (!reduit) {
      if (window.matchMedia('(hover: none)').matches) {
        timers.push(setTimeout(() => bouton.classList.add('vert'), arrivee + 500));
      } else {
        timers.push(setTimeout(() => {
          if (bouton.matches(':hover') || copie) return;
          bouton.classList.add('vert');
          timers.push(setTimeout(() => { if (!copie) bouton.classList.remove('vert'); }, 700 + 500));
        }, arrivee));
      }
    }

    // Copier : bande pleine, mot du curseur et action passent à « copié » 1,4 s
    const copier = (ev) => {
      ev.stopPropagation();
      clearTimeout(copie);
      bouton.classList.add('vert');
      const fini = () => {
        copie = null;
        bouton.dataset.cur = 'Copier';
        copierBtn.textContent = 'Copier l\'adresse';
        if (!window.matchMedia('(hover: none)').matches || reduit) bouton.classList.remove('vert');
        else bouton.classList.add('vert');
      };
      const suite = (texteAction, mot, message) => {
        bouton.dataset.cur = mot;
        copierBtn.textContent = texteAction;
        statut.textContent = '';
        setTimeout(() => { statut.textContent = message; }, 30);
        copie = setTimeout(fini, 1400);
      };
      const secours = () => {
        const s = window.getSelection();
        if (s) s.selectAllChildren(bouton.querySelector('.ov-une').getClientRects().length ? bouton.querySelector('.ov-une') : bouton.querySelector('.ov-trois'));
        suite('Sélectionnée', 'Copier', 'Copie impossible, sélectionnez l\'adresse.');
      };
      if (!navigator.clipboard) { secours(); return; }
      navigator.clipboard.writeText(EMAIL).then(
        () => suite('Adresse copiée', 'Copié', 'L\'adresse a été copiée.'),
        secours);
    };
    bouton.addEventListener('click', copier);
    copierBtn.addEventListener('click', copier);
    bas.querySelectorAll('a').forEach(a => a.addEventListener('click', ev => ev.stopPropagation()));
    ov.querySelector('.ov-fermer').addEventListener('click', ev => { ev.stopPropagation(); fermerContact(); });
    ov.addEventListener('click', () => fermerContact());

    contact = { ov, lien, visibles, bas, bouton, timers, cadrer };
    setTimeout(() => { occupe = false; bouton.focus({ preventScroll: true }); }, reduit ? 200 : d);
  }

  function nettoyerContact(c) {
    c.timers.forEach(clearTimeout);
    window.removeEventListener('resize', c.cadrer);
  }

  function fermerContact() {
    if (!contact || occupe) return;
    const c = contact;
    const { ov, lien } = c;
    contact = null;
    occupe = true;
    nettoyerContact(c);
    lien.setAttribute('aria-expanded', 'false');
    const retirerEtat = () => doc.classList.remove('contact-ouvert');
    const fin = () => {
      ov.remove();
      inerte(false);
      if (window.Works && window.Works.relancer) window.Works.relancer();
      occupe = false;
      // Le focus ne revient au lien qu'au clavier : après un clic, pas de contour résiduel
      if (auClavier) lien.focus({ preventScroll: true });
      else if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    };
    if (reduit) {
      retirerEtat();
      ov.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' }).finished.then(fin);
      return;
    }
    // Le texte redescend, puis le calque se referme vers le lien
    c.bouton.classList.remove('vert');
    c.visibles.forEach((l, i) => l.animate([{ transform: 'none' }, { transform: 'translateY(105%)' }],
      { duration: 350, delay: i * 30, easing: IO, fill: 'forwards' }));
    c.bas.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' });
    ov.animate([{ clipPath: PLEIN }, { clipPath: rectDe(lien) }],
      { duration: mobile() ? 500 : 600, delay: 250, easing: IO, fill: 'forwards' })
      .finished.then(fin);
    retirerEtat();   // le menu retrouve l'état de la page courante
  }

  // Un autre lien du menu pendant que le contact est ouvert : on le retire sans attendre
  function fermerContactVite() {
    if (!contact) return;
    contact.lien.setAttribute('aria-expanded', 'false');
    nettoyerContact(contact);
    contact.ov.remove();
    contact = null;
    doc.classList.remove('contact-ouvert');
    inerte(false);
  }

  // Dernier mode d'entrée : le focus n'est rendu au lien qu'au clavier
  let auClavier = false;
  window.addEventListener('keydown', () => { auClavier = true; }, true);
  window.addEventListener('pointerdown', () => { auClavier = false; }, true);

  window.addEventListener('keydown', e => { if (e.key === 'Escape') fermerContact(); });

  /* ── Branchements ── */
  const memePage = (url) => {
    const nettoie = (chemin) => chemin.replace(/index\.html$/, '');
    return nettoie(new URL(url, window.location.href).pathname) === nettoie(window.location.pathname);
  };
  const modifie = (e) => e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button;

  document.querySelectorAll('header nav a[data-dest]').forEach(a => {
    a.addEventListener('click', e => {
      if (modifie(e)) return;
      const dest = a.dataset.dest;
      if (dest === 'contact') {
        e.preventDefault();
        if (contact) fermerContact(); else ouvrirContact(a);
        return;
      }
      e.preventDefault();
      if (memePage(a.href)) { fermerContact(); return; }   // le lien de la page courante : rien
      const D = DEST[dest];
      // Si la page quittée a déjà cette couleur (Queen et WORKS, Unik et ABOUT),
      // l'aplat ne se verrait pas : il passe au noir, mot blanc (audit-ux-v3, 4)
      const ici = (getComputedStyle(document.body).getPropertyValue('--c') || '').trim().toLowerCase();
      const meme = ici && ici === D.c.toLowerCase();
      partir({ depuis: a, c: meme ? '#000' : D.c, ink: meme ? '#fff' : D.ink, mot: D.mot, vers: 'lien', page: dest, url: a.href });
    });
  });

  // Flèche retour des pages projet : couleur du projet quitté, mot WORKS
  document.querySelectorAll('.back-nav a').forEach(a => {
    a.addEventListener('click', e => {
      if (modifie(e)) return;
      e.preventDefault();
      const st = getComputedStyle(document.body);
      const c = st.getPropertyValue('--c').trim() || '#000';
      const ink = (st.getPropertyValue('--c-ink').trim() || '#000') === '#fff' ? '#fff' : '#000';
      partir({ depuis: a, c, ink, mot: 'Works', vers: 'gauche', page: 'works', url: a.href });
    });
  });

  // Retour arrière du navigateur (page en cache) : tout revient en place
  window.addEventListener('pageshow', e => {
    if (!e.persisted) return;
    enCours.splice(0).forEach(an => an.cancel());
    document.querySelectorAll('.ov-passage, .ov-voile, .ov-contact').forEach(o => o.remove());
    doc.classList.remove('passage-sombre', 'passage-attente', 'passage-fondu', 'passage-en-cours');
    contact = null;
    doc.classList.remove('contact-ouvert');
    inerte(false);
    occupe = false;
  });

  arriver();
  return { partir, ouvrirContact, fermerContact };
})();


// ═══ Thème clair / sombre ═══
// Le script de <head> pose data-theme avant le rendu ; ici : la bascule du menu,
// le choix mémorisé (localStorage, seulement si Clément ou le visiteur clique)
// et le suivi de la préférence système tant qu'aucun choix n'est mémorisé.
(function () {
  const racine = document.documentElement;
  const bouton = document.querySelector('.theme-toggle');
  const systeme = window.matchMedia('(prefers-color-scheme: dark)');
  const sombre = () => racine.getAttribute('data-theme') === 'dark';

  function afficher() {
    if (!bouton) return;
    bouton.setAttribute('aria-pressed', sombre() ? 'true' : 'false');
    // Le symbole (lune / soleil) est choisi en CSS selon data-theme ; ici le nom accessible
    bouton.setAttribute('aria-label', sombre() ? 'Passer en mode clair' : 'Passer en mode sombre');
  }

  function poser(theme) {
    racine.setAttribute('data-theme', theme);
    afficher();
    // Les pages dont le curseur ou des aplats dépendent de --fg se mettent à jour seules (variables CSS)
    window.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
  }

  afficher();
  if (bouton) {
    bouton.addEventListener('click', () => {
      const suivant = sombre() ? 'light' : 'dark';
      poser(suivant);
      try { localStorage.setItem('theme', suivant); } catch (e) { /* mode privé : le choix vaut pour la page */ }
    });
  }

  const suivreSysteme = (e) => {
    let choix = null;
    try { choix = localStorage.getItem('theme'); } catch (err) { /* rien */ }
    if (choix !== 'light' && choix !== 'dark') poser(e.matches ? 'dark' : 'light');
  };
  if (systeme.addEventListener) systeme.addEventListener('change', suivreSysteme);
})();
