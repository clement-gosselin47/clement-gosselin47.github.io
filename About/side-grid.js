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

  // Les mêmes vitrines WebP que Works (4:3, même gabarit, même échelle) :
  // plus de zoom correctif, et 5,7 Mo de PNG en moins
  const projects = [
    { patternIndexes: [1, 13, 24], image: '../Projets/Ethikwear/web/ethikwear-vitrine.webp' },
    { patternIndexes: [5, 19, 22], image: '../Projets/redstone/web/redstone-vitrine.webp' },
    { patternIndexes: [3, 10, 18], image: '../Projets/Unik/web/unik-vitrine.webp' },
    { patternIndexes: [2, 9, 16], image: '../Projets/dugos-photographie/web/dugos-vitrine.webp' },
  ];
  const projectMap = {};
  projects.forEach(p => p.patternIndexes.forEach(idx => { projectMap[idx] = p; }));

  // On calcule les tuiles sur la taille du viewport entier (pas du conteneur
  // visible) pour garder exactement les mêmes proportions que la grille de
  // la page Works, même si elle n'est visible que sur la partie droite.
  function tileW() { return window.innerWidth || 1; }
  function tileH() { return window.innerHeight || 1; }

  function build() {
    const w = tileW(), h = tileH();
    const cellAspect = w / h;

    projects.forEach(p => {
      if (p.backgroundSize === 'contain' && p.imageAspect) {
        p.scale = Math.max(p.scale ?? 1, cellAspect / p.imageAspect);
      }
    });

    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `repeat(15, ${w / 5}px)`;
    grid.style.gridTemplateRows = `repeat(15, ${h / 5}px)`;
    grid.style.width = `${3 * w}px`;
    grid.style.height = `${3 * h}px`;

    for (let row = 0; row < 15; row++) {
      for (let col = 0; col < 15; col++) {
        const cell = document.createElement('div');
        const patternIndex = (row % 5) * 5 + (col % 5);
        const project = projectMap[patternIndex] ?? null;

        cell.className = 'cell';

        if (project) {
          const media = document.createElement('div');
          media.className = 'cell-media-bg';
          media.style.backgroundImage = `url('${project.image}')`;
          media.style.backgroundSize = project.backgroundSize ?? 'cover';
          media.style.backgroundPosition = 'center';
          media.style.transform = `scale(${project.scale ?? 1})`;
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
  const DRIFT_SPEED = 0.35;
  const angle = Math.random() * Math.PI * 2;
  const velX = Math.cos(angle) * DRIFT_SPEED;
  const velY = Math.sin(angle) * DRIFT_SPEED;

  function normalize() {
    const w = tileW(), h = tileH();
    posX = posX % w; if (posX > 0) posX -= w;
    posY = posY % h; if (posY > 0) posY -= h;
  }

  function render() {
    grid.style.transform = `translate(${posX}px, ${posY}px)`;
  }

  (function loop() {
    posX += velX;
    posY += velY;
    normalize();
    render();
    requestAnimationFrame(loop);
  })();

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(build, 200);
  });
})();
