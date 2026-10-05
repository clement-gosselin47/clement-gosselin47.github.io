// Grille décorative (reprend la logique de la grille de la page Works,
// en dérive lente, sans interaction possible, comme une vidéo en fond).
(function () {
  const wrapper = document.querySelector('.side-grid');
  const grid = document.getElementById('sideGrid');
  if (!wrapper || !grid) return;

  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F1948A', '#82E0AA', '#F8C471', '#AED6F1', '#A9CCE3',
    '#D7BDE2', '#A3E4D7', '#FAD7A0', '#A9DFBF', '#FADBD8',
    '#D5D8DC', '#7FB3D3', '#76D7C4', '#F9E79F', '#E59866',
  ];

  // Mêmes projets, mêmes positions dans la tuile 5×5 et mêmes captures plein
  // cadre que la grille de Projets/script.js (liste dupliquée : ce script n'est
  // pas un module). Paysage 1600×1000 (16:10) ; portrait 740×1600 sous le ratio 3/5.
  const projects = [
    { patternIndexes: [1, 13, 24], image: '../Projets/Ethikwear/web/ethikwear-vitrine-plein.jpg', imagePortrait: '../Projets/Ethikwear/web/ethikwear-vitrine-portrait.jpg' },
    { patternIndexes: [5, 19, 22], image: '../Projets/redstone/web/redstone-vitrine-plein.jpg', imagePortrait: '../Projets/redstone/web/redstone-vitrine-portrait.jpg' },
    { patternIndexes: [3, 10, 18], image: '../Projets/Unik/web/unik-vitrine-plein.jpg', imagePortrait: '../Projets/Unik/web/unik-vitrine-portrait.jpg' },
    { patternIndexes: [2, 9, 16], image: '../Projets/dugos-photographie/web/dugos-vitrine-plein.jpg', imagePortrait: '../Projets/dugos-photographie/web/dugos-vitrine-portrait.jpg' },
    { patternIndexes: [7, 11, 20], image: '../Projets/Queen/web/queen-vitrine-plein.jpg', imagePortrait: '../Projets/Queen/web/queen-vitrine-portrait.jpg' },
    { patternIndexes: [0, 12, 23], image: '../Projets/passage-secret/web/passage-secret-hero.jpg', imagePortrait: '../Projets/passage-secret/web/passage-secret-mobile.jpg' },
    { patternIndexes: [4, 6, 15], image: '../Projets/relay/web/relay-vitrine-plein.jpg', imagePortrait: '../Projets/relay/web/relay-vitrine-portrait.jpg' },
  ];
  const projectMap = {};
  projects.forEach(p => p.patternIndexes.forEach(idx => { projectMap[idx] = p; }));

  const portraitMQ = window.matchMedia('(max-aspect-ratio: 3/5)');
  function imageDe(p) { return portraitMQ.matches ? p.imagePortrait : p.image; }

  // Cases en pixels entiers (aucun trait entre deux cases) et au ratio de la
  // capture : image entière, sans coupe. Même calcul que Projets/script.js.
  function caseW() { return Math.ceil((window.innerWidth || 1) / 5); }
  function caseH() {
    return Math.round(caseW() * (portraitMQ.matches ? 1600 / 740 : 10 / 16));
  }
  function tileW() { return 5 * caseW(); }
  function tileH() { return 5 * caseH(); }

  function build() {
    const cw = caseW(), ch = caseH();

    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `repeat(15, ${cw}px)`;
    grid.style.gridTemplateRows = `repeat(15, ${ch}px)`;
    grid.style.width = `${15 * cw}px`;
    grid.style.height = `${15 * ch}px`;

    for (let row = 0; row < 15; row++) {
      for (let col = 0; col < 15; col++) {
        const cell = document.createElement('div');
        const patternIndex = (row % 5) * 5 + (col % 5);
        const project = projectMap[patternIndex] ?? null;

        cell.className = 'cell';

        if (project) {
          const media = document.createElement('div');
          media.className = 'cell-media-bg';
          media.style.backgroundImage = `url('${imageDe(project)}')`;
          cell.appendChild(media);
          cell.classList.add('project-cell');
        } else {
          cell.style.background = colors[patternIndex];
        }

        grid.appendChild(cell);
      }
    }
  }

  build();

  let posX = 0, posY = 0;
  const DRIFT_SPEED = 0.35;   // plus lent que Works (0,6) : fond discret
  const angle = Math.random() * Math.PI * 2;
  const velX = Math.cos(angle) * DRIFT_SPEED;
  const velY = Math.sin(angle) * DRIFT_SPEED;

  function normalize() {
    const w = tileW(), h = tileH();
    posX = posX % w; if (posX > 0) posX -= w;
    posY = posY % h; if (posY > 0) posY -= h;
  }

  function render() {
    grid.style.transform = `translate3d(${Math.round(posX)}px, ${Math.round(posY)}px, 0)`;
  }

  (function loop() {
    posX += velX;
    posY += velY;
    normalize();
    render();
    requestAnimationFrame(loop);
  })();

  // Redimensionnement ou changement d'orientation : cases recalculées tout de suite
  // (pas de trait entre les cases pendant le redimensionnement)
  window.addEventListener('resize', () => { build(); normalize(); render(); });
  portraitMQ.addEventListener('change', () => { build(); normalize(); render(); });
})();
