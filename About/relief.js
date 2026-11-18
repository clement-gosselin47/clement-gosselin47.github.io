// Relief du portrait (WebGL écrit à la main, sans Three.js) : un rectangle plein canvas, deux textures
// (photo + carte de profondeur). Chaque pixel est décalé selon la profondeur et la position du curseur,
// à l'opposé de la souris. Valeurs : reference.md §3 B. Démarre seulement au bureau, mouvement non
// réduit, WebGL disponible ; sinon l'<img> du fond suffit.
(function () {
  // Amplitude du relief : 1 = valeurs de la référence (±10 px en horizontal, ±20 px en vertical à 1440 × 900).
  // Clément trouvait la tête étrange : 0,4 (2026-10-31). Monter vers 1 pour plus de relief, baisser pour moins.
  const AMPLITUDE = 0.4;
  const fond = document.querySelector('.fond');
  const img = document.querySelector('.fond-img');
  if (!fond || !img) return;
  if (window.innerWidth < 768) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'fond-relief';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
  if (!gl) return;

  const VS = 'attribute vec2 a;varying vec2 vUv;void main(){vUv=a*0.5+0.5;gl_Position=vec4(a,0.0,1.0);}';
  const FS = [
    'precision mediump float;',
    'varying vec2 vUv;',
    'uniform sampler2D photo;uniform sampler2D prof;',
    'uniform vec2 couvre;uniform vec2 souris;',
    'vec2 miroir(vec2 v){vec2 m=mod(v,2.0);return mix(m,2.0-m,step(1.0,m));}',
    'void main(){',
    '  vec2 uv=vec2((vUv.x-0.5)*couvre.x+0.5,1.0-(1.0-vUv.y)*couvre.y);   // cover calé en haut (la tête n\'est jamais coupée)',
    '  float d=texture2D(prof,miroir(uv)).r;',
    '  vec2 uv2=vec2(uv.x+(d-0.5)*souris.x/20.0,uv.y+(d-0.5)*souris.y/7.5);',
    '  gl_FragColor=texture2D(photo,miroir(uv2));',
    '}'
  ].join('\n');

  function shader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
  }
  const vs = shader(gl.VERTEX_SHADER, VS);
  const fs = shader(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'a');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const uCouvre = gl.getUniformLocation(prog, 'couvre');
  const uSouris = gl.getUniformLocation(prog, 'souris');
  gl.uniform1i(gl.getUniformLocation(prog, 'photo'), 0);
  gl.uniform1i(gl.getUniformLocation(prog, 'prof'), 1);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

  function texture(unite, image) {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unite);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  let iw = 0, ih = 0;
  let cx = 0, cy = 0, lx = 0, ly = 0;
  let actif = false, dernier = 0, demarre = false, visible = true;

  // Cadrage « cover » centré : couvre = part de l'image visible dans le canvas
  function cadrer() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = fond.clientWidth, h = fond.clientHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    const rc = w / h, ri = iw / ih;
    gl.uniform2f(uCouvre, rc > ri ? 1 : rc / ri, rc > ri ? ri / rc : 1);
    dessiner();
  }

  function dessiner() {
    gl.uniform2f(uSouris, lx * AMPLITUDE, ly * AMPLITUDE);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  function boucle(t) {
    if (!actif) return;
    const dt = Math.min(0.05, (t - dernier) / 1000);
    dernier = t;
    lx += 5 * (cx - lx) * dt;
    ly += 5 * (cy - ly) * dt;
    dessiner();
    // Au repos (souris immobile, relief arrivé), la boucle s'arrête ; viser() la relance
    if (Math.abs(cx - lx) + Math.abs(cy - ly) < 0.0005) { lx = cx; ly = cy; dessiner(); actif = false; return; }
    requestAnimationFrame(boucle);
  }
  function lancer() {
    if (actif || !demarre || !visible || fond.dataset.eteint === '1') return;
    actif = true;
    dernier = performance.now();
    requestAnimationFrame(boucle);
  }
  function arreter() { actif = false; }

  // Cibles : de -0,25 à +0,25
  const viser = (x, y) => {
    cx = 0.5 * (x / window.innerWidth - 0.5);
    cy = -0.5 * (y / window.innerHeight - 0.5);
    lancer();
  };
  window.addEventListener('mousemove', e => viser(e.clientX, e.clientY));
  document.addEventListener('mouseout', e => { if (!e.relatedTarget) { cx = 0; cy = 0; lancer(); } });
  window.addEventListener('touchmove', e => { if (e.touches[0]) viser(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  window.addEventListener('touchend', () => { cx = 0; cy = 0; lancer(); });
  window.addEventListener('resize', () => { if (demarre) cadrer(); });
  document.addEventListener('visibilitychange', () => { visible = !document.hidden; if (visible) lancer(); else arreter(); });

  // Quand la photo est éteinte (défilement), la boucle s'arrête ; elle repart si elle réapparaît
  new MutationObserver(() => { if (fond.dataset.eteint === '1') arreter(); else lancer(); })
    .observe(fond, { attributes: true, attributeFilter: ['data-eteint'] });

  // Les textures arrivent après fond.jpg déjà affiché : aucun écran vide en attendant
  function charger(src) {
    return new Promise((ok, ko) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = ko;
      i.src = src;
    });
  }
  const demarrer = () => {
    iw = img.naturalWidth; ih = img.naturalHeight;
    if (!iw || !ih) return;
    Promise.all([charger(img.currentSrc || img.src), charger('Img/fond-profondeur.png')]).then(([photo, prof]) => {
      texture(0, photo);
      texture(1, prof);
      fond.appendChild(canvas);
      demarre = true;
      cadrer();
      canvas.classList.add('pret');
      lancer();
    }).catch(() => {});
  };
  if (img.complete) demarrer(); else img.addEventListener('load', demarrer, { once: true });
})();
