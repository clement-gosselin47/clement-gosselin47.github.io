// Portrait de la page About en trame LED : petits carrés tramés (Bayer), palette bleu-blanc, halo doux, franges de sous-pixels.
// WebGL 1 écrit à la main, en deux passes :
//   1. un plan plein cadre dessine la trame au repos et le halo (et masque les points en train de s'envoler) ;
//   2. un point carré par cellule (gl_POINTS, un seul appel de dessin) dessine les points déplacés par la dispersion.
// Survol : les points se dispersent loin du curseur, rétrécissent et s'estompent, puis reviennent avec un ressort doux.
// Suivi du curseur très léger et inversé : toute l'image glisse de quelques pixels à l'opposé de la souris (bureau seulement).
// L'extinction au défilement (les carrés rétrécissent, ceux du bas d'abord) reprend la formule d'about.js.
// Sans WebGL, ou à la moindre erreur ou image noire : la photo normale (<img class="fond-img">) reste affichée.
(function () {
  'use strict';
  const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fond = document.querySelector('.fond');
  const img = fond && fond.querySelector('.fond-img');
  const zone = document.querySelector('.h-ecran');
  const bio = document.querySelector('.bio-texte');
  if (!fond || !img || !zone || !bio) return;

  const borne = (v, a, b) => Math.min(b, Math.max(a, v));
  const mobile = () => innerWidth < 768;
  const params = new URLSearchParams(location.search);   // ?panne=2 : simule un dessin en échec (tests du repli)
  const NB = 16;                                       // passages de souris gardés (indices constants dans les shaders)

  const cv = document.createElement('canvas');
  cv.className = 'points';
  cv.setAttribute('aria-hidden', 'true');
  fond.appendChild(cv);
  const gl = cv.getContext('webgl', { antialias: false, alpha: false });
  if (!gl) { cv.remove(); if (img.dataset.src) img.src = img.dataset.src; return; }   // pas de WebGL : la photo normale

  // ── Réglages ──
  const PAS = 4, PAS_MOBILE = 3;                       // distance entre deux points (carrés), px CSS
  const HALO = 1.5;                                    // intensité du halo des hautes lumières (0 = aucun)
  const SUIVI = 6;                                     // glissement de l'image à l'opposé du curseur, px CSS au plus (0 = aucun)
  const SUIVI_LISSAGE = 0.2;                           // constante de temps du suivi, secondes
  const RAYON = 120;                                   // rayon de la dispersion, px CSS (x 0,8 en mobile)
  const PORTEE = [25, 35];                             // distance de vol : minimum et part au hasard, px CSS (x 0,5 à 1 selon la vitesse de la souris)
  const EFFACEMENT = 0.45;                             // force de l'effacement au centre : 0 = rien, 1 = zone vidée (rétrécissement, assombrissement, lueur)
  const BONUS_VITESSE = 0.25;                          // part de la portée qui dépend de la vitesse de la souris : 0 = aucune, 1 = de moitié à pleine portée
  const RETOUR = 5.0;                                  // vitesse du retour : plus grand = plus rapide (5 : environ 0,8 s)
  const SEUIL = [40, 10];                              // un passage de souris toutes les 40 ms au moins et 10 px au moins

  const etat = {
    souffles: [], dernierS: null, p: 0, boucle: false, prete: false, W: 0, H: 0, dpr: 1, cadre: [0, 0, 1, 1], sc: 1,
    dx: 0, dy: 0, cx: 0, cy: 0, nb: 0,
  };
  window.__points = etat;
  const maintenant = () => performance.now() / 1000;

  // ── Code GLSL partagé par les deux passes ──
  const FORCE = Array.from({ length: NB }, (_, i) => `{ vec4 s = uSouffle[${i}]; vec2 dd = c - s.xy; float age = clamp(uNow - s.z, 0.0, 4.0);
    f += exp(-dot(dd, dd) / (uRayon * uRayon)) * (1.0 - exp(-age / 0.04)) * exp(-age * ${RETOUR.toFixed(1)}) * step(age, 3.9) * (${(1 - BONUS_VITESSE).toFixed(2)} + ${BONUS_VITESSE.toFixed(2)} * s.w); }`).join('\n  ');
  const COMMUN = `
uniform vec2 uRes, uDecal; uniform vec4 uSouffle[${NB}];
uniform float uDpr, uP, uPas, uNow, uRayon;
float b2(vec2 c) { return fract(c.x * 0.5 + c.y * c.y * 0.75); }
// Tramage ordonné de Bayer 4 x 4 : seuil entre 0 et 1, damier dans les gris moyens
float bayer(vec2 c) {
  vec2 a = mod(c, 2.0), b = mod(floor(c / 2.0), 2.0);
  return (4.0 * b2(a) * 4.0 + b2(b) * 4.0 + 0.5) / 16.0;
}
vec3 palette(float l) {   // 4 niveaux : bleu nuit, bleu, bleu clair, blanc
  vec3 c = mix(vec3(0.02, 0.035, 0.13), vec3(0.27, 0.35, 0.84), clamp(l, 0.0, 1.0));
  c = mix(c, vec3(0.72, 0.8, 1.0), clamp(l - 1.0, 0.0, 1.0));
  return mix(c, vec3(1.0), clamp(l - 2.0, 0.0, 1.0));
}
// Aspect d'un point : couleur de la palette et demi-côté (en cellules) selon la lumière de la photo
vec4 aspect(vec2 cell, vec3 t) {
  float L = dot(t, vec3(0.299, 0.587, 0.114));
  float lp = clamp((L - 0.03) / 0.8, 0.0, 1.0);
  lp = clamp(pow(lp, 0.9) * 1.12, 0.0, 1.0);
  float lq = lp * 3.0;
  float niv = clamp(floor(lq) + step(bayer(cell), fract(lq)), 0.0, 3.0);
  vec3 pal = palette(niv) * mix(vec3(1.0), t / max(L, 0.08), 0.05);
  return vec4(pal, mix(0.27, 0.54, smoothstep(0.6, 1.0, lp)));
}
// Force de la dispersion à la position c (0 = au repos) : somme des passages de la souris, avec leur retour amorti
float force(vec2 c) {
  float f = 0.0;
  ${FORCE}
  return f;
}
float vieDe(float y) {   // extinction au défilement : les carrés du bas rétrécissent d'abord
  float a0 = 0.04 + 0.5 * (1.0 - clamp(y / uRes.y, 0.0, 1.0));
  return 1.0 - smoothstep(a0, a0 + 0.36, uP);
}`;

  // ── Passe 2 : un point par cellule, déplacé par la dispersion ──
  const VS_POINTS = `
precision highp float;
attribute vec2 aPos; attribute vec3 aCol; attribute float aH;
${COMMUN}
varying vec3 vCol;
void main() {
  vec2 c = aPos;
  float f = force(c);
  vec4 look = aspect(floor(c / uPas), aCol);
  float vie = vieDe(c.y);
  if (f < 0.004 || vie < 0.01) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); gl_PointSize = 0.0; vCol = vec3(0.0); return; }
  // chaque point part dans une direction (un peu au hasard) et à une distance au hasard
  vec2 depl = vec2(0.0);
  float h2 = fract(aH * 7.31), h3 = fract(aH * 13.7);
  ${Array.from({ length: NB }, (_, i) => `{ vec4 s = uSouffle[${i}]; vec2 dd = c - s.xy; float age = clamp(uNow - s.z, 0.0, 4.0);
    float a = exp(-dot(dd, dd) / (uRayon * uRayon)) * (1.0 - exp(-age / 0.04)) * exp(-age * ${RETOUR.toFixed(1)}) * (cos(age * 3.0) + 0.3 * sin(age * 3.0)) * step(age, 3.9);
    float an = (aH - 0.5) * 1.5; vec2 dir = normalize(dd + vec2(0.001, 0.0)); dir = vec2(dir.x * cos(an) - dir.y * sin(an), dir.x * sin(an) + dir.y * cos(an));
    depl += dir * (${PORTEE[0].toFixed(1)} + ${PORTEE[1].toFixed(1)} * h2) * (${(1 - BONUS_VITESSE).toFixed(2)} + ${BONUS_VITESSE.toFixed(2)} * s.w) * a * (0.6 + 0.4 * h3); }`).join('\n  ')}
  float fm = min(f * 1.6, 1.0) * ${EFFACEMENT.toFixed(2)};
  float taille = mix(1.0, 0.2, fm) * vie;
  vCol = look.rgb * mix(1.0, 0.12, fm);
  vec2 pos = c + depl + uDecal;
  gl_Position = vec4(pos.x / uRes.x * 2.0 - 1.0, 1.0 - pos.y / uRes.y * 2.0, 0.0, 1.0);
  gl_PointSize = max(2.0 * look.a * uPas * taille * uDpr, 1.0);
}`;
  const FS_POINTS = `
precision highp float;
varying vec3 vCol;
void main() { gl_FragColor = vec4(vCol, 1.0); }`;

  // ── Passe 1 : trame au repos, halo, franges de sous-pixels ──
  const VS_PLAN = 'attribute vec2 a; void main() { gl_Position = vec4(a, 0.0, 1.0); }';
  const FS_PLAN = `
precision highp float;
uniform sampler2D uTrame, uFlou;
uniform vec4 uCadre, uZone; uniform float uBloom;
${COMMUN}
float carre(vec2 f, float demi, float aa) {   // f : position dans la cellule, de -0.5 a 0.5
  return (1.0 - smoothstep(demi - aa, demi + aa, abs(f.x))) * (1.0 - smoothstep(demi - aa, demi + aa, abs(f.y)));
}
float flou(vec2 p) {
  float k = 26.0; vec3 w = vec3(0.299, 0.587, 0.114);
  float l = dot(texture2D(uFlou, (p - uCadre.xy) / uCadre.zw).rgb, w) * 0.4;
  l += dot(texture2D(uFlou, (p + vec2(k, 0.0) - uCadre.xy) / uCadre.zw).rgb, w) * 0.15;
  l += dot(texture2D(uFlou, (p - vec2(k, 0.0) - uCadre.xy) / uCadre.zw).rgb, w) * 0.15;
  l += dot(texture2D(uFlou, (p + vec2(0.0, k) - uCadre.xy) / uCadre.zw).rgb, w) * 0.15;
  l += dot(texture2D(uFlou, (p - vec2(0.0, k) - uCadre.xy) / uCadre.zw).rgb, w) * 0.15;
  return l;
}
void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr - uDecal;   // l'image entière glisse de uDecal
  float vie = vieDe(p.y);
  vec2 cell = floor(p / uPas);
  vec2 c = (cell + 0.5) * uPas;
  vec3 t = texture2D(uTrame, (c - uCadre.xy) / uCadre.zw).rgb;
  vec4 look = aspect(cell, t);
  // les cellules en train de se disperser sont dessinées par la passe 2 : ici on les masque
  float f = 0.0;
  if (c.x > uZone.x && c.x < uZone.z && c.y > uZone.y && c.y < uZone.w) f = force(c);
  float taille = vie * step(f, 0.004);
  vec2 q = (p - c) / uPas;
  float aa = 0.6 / (uPas * uDpr), d = 0.45 / uPas;         // d : décalage des sous-pixels rouge et bleu, 0,45 px CSS
  float demi = look.a * taille;
  vec3 cov = vec3(carre(q + vec2(d, 0.0), demi, aa), carre(q, demi, aa), carre(q - vec2(d, 0.0), demi, aa));
  vec3 col = look.rgb * cov * step(0.012, flou(c)) * step(0.003, taille);
  // halo des hautes lumières : lueur froide qui déborde de la trame
  float lb = flou(p);
  float fh = 0.0;
  if (p.x > uZone.x && p.x < uZone.z && p.y > uZone.y && p.y < uZone.w) fh = min(force(p) * 1.6, 1.0);
  lb *= 1.0 - ${(0.9 * EFFACEMENT).toFixed(2)} * fh;   // la zone dispersée se vide aussi de sa lueur
  col += uBloom * (pow(lb, 1.5) * vec3(0.5, 0.64, 1.0) * 1.5 + pow(lb, 0.7) * vec3(0.02, 0.05, 0.28)) * vie;
  gl_FragColor = vec4(col, 1.0);
}`;

  function shader(type, src) {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function programme(vs, fs, uniforms) {
    const prog = gl.createProgram();
    gl.attachShader(prog, shader(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    const U = {};
    uniforms.forEach(n => { U[n] = gl.getUniformLocation(prog, n); if (!U[n]) throw new Error('uniform ' + n + ' introuvable'); });
    return { prog, U };
  }
  function texture(source, unite) {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unite); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  }
  // Photo réduite par moitiés : chaque texel est la moyenne de sa zone, donc un point = la moyenne de sa cellule
  function reduite(source, largeur) {
    let c = document.createElement('canvas'); c.width = source.naturalWidth; c.height = source.naturalHeight;
    c.getContext('2d').drawImage(source, 0, 0);
    while (c.width > largeur * 1.5) {
      const n = document.createElement('canvas'); n.width = c.width >> 1; n.height = c.height >> 1;
      const x = n.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(c, 0, 0, n.width, n.height); c = n;
    }
    return c;
  }

  let plan = null, pts = null, bufPlan = null, bufPts = null, pixels = null, pixelsFlou = null;

  // Un point par cellule de la trame : position du centre, couleur de la photo, nombre au hasard (graine fixe : toujours pareil)
  function cellules() {
    const pas = mobile() ? PAS_MOBILE : PAS, W = etat.W, H = etat.H, c = etat.cadre;
    const cols = Math.ceil(W / pas) + 4, lignes = Math.ceil(H / pas) + 4;
    const buf = new Float32Array(cols * lignes * 6);
    let n = 0;
    for (let j = -2; j < lignes - 2; j++) for (let i = -2; i < cols - 2; i++) {
      const x = (i + 0.5) * pas, y = (j + 0.5) * pas;
      const u = borne((x - c[0]) / c[2], 0, 0.9999), v = borne((y - c[1]) / c[3], 0, 0.9999);
      const k = (((v * pixels.h) | 0) * pixels.w + ((u * pixels.w) | 0)) * 4;
      // même test que le plan : on ne garde que les cellules dans la silhouette éclairée (flou 5 points, 26 px)
      let l = 0;
      for (const [ox, oy, po] of [[0, 0, 0.4], [26, 0, 0.15], [-26, 0, 0.15], [0, 26, 0.15], [0, -26, 0.15]]) {
        const uu = borne((x + ox - c[0]) / c[2], 0, 0.9999), vv = borne((y + oy - c[1]) / c[3], 0, 0.9999);
        const kk = (((vv * pixelsFlou.h) | 0) * pixelsFlou.w + ((uu * pixelsFlou.w) | 0)) * 4;
        l += (0.299 * pixelsFlou.d[kk] + 0.587 * pixelsFlou.d[kk + 1] + 0.114 * pixelsFlou.d[kk + 2]) / 255 * po;
      }
      if (l < 0.012) continue;
      const o = n * 6;
      buf[o] = x; buf[o + 1] = y;
      buf[o + 2] = pixels.d[k] / 255; buf[o + 3] = pixels.d[k + 1] / 255; buf[o + 4] = pixels.d[k + 2] / 255;
      let h = (Math.sin((i + 3) * 12.9898 + (j + 3) * 78.233) * 43758.5453) % 1; if (h < 0) h += 1;
      buf[o + 5] = h;
      n++;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, bufPts);
    gl.bufferData(gl.ARRAY_BUFFER, buf.subarray(0, n * 6), gl.STATIC_DRAW);
    etat.nb = n;
  }

  // Le premier dessin est vérifié : on lit quelques lignes de pixels, il doit y avoir de la lumière (la photo est un visage clair sur noir)
  function nonNoir() {
    const w = cv.width, h = cv.height, ligne = new Uint8Array(w * 4);
    let max = 0;
    for (let k = 1; k <= 12; k++) {
      gl.readPixels(0, Math.floor(h * k / 14), w, 1, gl.RGBA, gl.UNSIGNED_BYTE, ligne);
      for (let i = 0; i < ligne.length; i += 4) max = Math.max(max, ligne[i], ligne[i + 1], ligne[i + 2]);
    }
    return max > 40;
  }
  function init(source) {
    // la photo doit être décodée et avoir ses dimensions avant d'être envoyée à la carte graphique
    if (!source.naturalWidth) throw new Error('photo non décodée');
    if (!fond.clientWidth || !fond.clientHeight) throw new Error('fond sans dimensions');
    if (gl.getParameter(gl.MAX_TEXTURE_SIZE) < 1200) throw new Error('MAX_TEXTURE_SIZE trop petit');
    plan = programme(VS_PLAN, FS_PLAN, ['uTrame', 'uFlou', 'uRes', 'uDecal', 'uCadre', 'uZone', 'uDpr', 'uP', 'uPas', 'uNow', 'uBloom', 'uRayon', 'uSouffle[0]']);
    pts = programme(VS_POINTS, FS_POINTS, ['uRes', 'uDecal', 'uDpr', 'uP', 'uPas', 'uNow', 'uRayon', 'uSouffle[0]']);
    bufPlan = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bufPlan);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    bufPts = gl.createBuffer();
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    const c1 = reduite(source, 1100), c2 = reduite(source, 160);
    texture(c1, 0); texture(c2, 1);
    pixels = { d: c1.getContext('2d').getImageData(0, 0, c1.width, c1.height).data, w: c1.width, h: c1.height };
    pixelsFlou = { d: c2.getContext('2d').getImageData(0, 0, c2.width, c2.height).data, w: c2.width, h: c2.height };
    gl.useProgram(plan.prog); gl.uniform1i(plan.U.uTrame, 0); gl.uniform1i(plan.U.uFlou, 1);
    etat.prete = true;
    mesurer();
    if (params.get('panne') === '2') throw new Error('panne simulée');
    dessiner(maintenant());
    if (gl.getError() !== gl.NO_ERROR || gl.isContextLost() || !nonNoir()) throw new Error('le dessin WebGL est noir ou en erreur');
    cv.style.opacity = '1';   // fondu court (CSS), seulement une fois la première image vérifiée non noire
    etat.tAffiche = Math.round(performance.now());
  }

  function mesurer() {
    const W = fond.clientWidth, H = fond.clientHeight, dpr = Math.min(devicePixelRatio || 1, 2);
    etat.W = W; etat.H = H; etat.dpr = dpr;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    // même cadrage que l'<img> (object-fit: cover, object-position lue dans le style : 50 % 0 au bureau, 37 % 0 en mobile)
    const pos = getComputedStyle(img).objectPosition.split(' ').map(parseFloat);
    const s = Math.max(W / 2400, H / 1800), iw = 2400 * s, ih = 1800 * s;
    etat.cadre = [(W - iw) * (pos[0] || 0) / 100, (H - ih) * (pos[1] || 0) / 100, iw, ih];
    mesurerBio();
    if (etat.prete) { cellules(); dessiner(maintenant()); }
  }
  let hautBio = 0;
  function mesurerBio() { hautBio = bio.getBoundingClientRect().top + scrollY; }

  function uniformsCommuns(U, now) {
    gl.uniform2f(U.uRes, etat.W, etat.H); gl.uniform2f(U.uDecal, etat.dx, etat.dy);
    gl.uniform1f(U.uDpr, etat.dpr); gl.uniform1f(U.uP, etat.p); gl.uniform1f(U.uNow, now);
    gl.uniform1f(U.uPas, mobile() ? PAS_MOBILE : PAS);
    gl.uniform1f(U.uRayon, RAYON * (mobile() ? 0.8 : 1));
    const s = new Float32Array(NB * 4);
    for (let i = 0; i < NB; i++) {
      const e = etat.souffles[i];
      s[i * 4] = e ? e[0] : 0; s[i * 4 + 1] = e ? e[1] : 0; s[i * 4 + 2] = e ? e[2] : -1e4; s[i * 4 + 3] = e ? e[3] : 0;
    }
    gl.uniform4fv(U['uSouffle[0]'], s);
  }
  function dessiner(now) {
    if (gl.isContextLost()) { replier('contexte perdu'); return; }
    gl.viewport(0, 0, cv.width, cv.height);
    etat.sc = fond.getBoundingClientRect().width / (fond.clientWidth || 1);
    const R = RAYON * (mobile() ? 0.8 : 1) * 2.6;
    let z = [1e4, 1e4, -1e4, -1e4];   // boîte de la dispersion en cours (marge comprise) : hors de la boîte, le plan ne calcule rien
    for (const e of etat.souffles) if (now - e[2] < 3.9) z = [Math.min(z[0], e[0] - R), Math.min(z[1], e[1] - R), Math.max(z[2], e[0] + R), Math.max(z[3], e[1] + R)];
    // passe 1 : plan
    gl.disable(gl.BLEND);
    gl.useProgram(plan.prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, bufPlan);
    const a = gl.getAttribLocation(plan.prog, 'a'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    uniformsCommuns(plan.U, now);
    const c = etat.cadre;
    gl.uniform4f(plan.U.uCadre, c[0], c[1], c[2], c[3]); gl.uniform4f(plan.U.uZone, z[0], z[1], z[2], z[3]); gl.uniform1f(plan.U.uBloom, HALO);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.disableVertexAttribArray(a);
    // passe 2 : points déplacés (ajoutés à la lumière du plan), seulement s'il y a une dispersion en cours
    if (z[0] < 1e3 && etat.nb) {
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      gl.useProgram(pts.prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, bufPts);
      const ap = gl.getAttribLocation(pts.prog, 'aPos'), ac = gl.getAttribLocation(pts.prog, 'aCol'), ah = gl.getAttribLocation(pts.prog, 'aH');
      [ap, ac, ah].forEach(l => gl.enableVertexAttribArray(l));
      gl.vertexAttribPointer(ap, 2, gl.FLOAT, false, 24, 0); gl.vertexAttribPointer(ac, 3, gl.FLOAT, false, 24, 8); gl.vertexAttribPointer(ah, 1, gl.FLOAT, false, 24, 20);
      uniformsCommuns(pts.U, now);
      gl.drawArrays(gl.POINTS, 0, etat.nb);
      [ap, ac, ah].forEach(l => gl.disableVertexAttribArray(l));
      gl.disable(gl.BLEND);
    }
    if (etat.verifie && gl.getError() !== gl.NO_ERROR) replier('erreur WebGL');
  }

  // ── Boucle : suivi lissé du curseur, retour de la dispersion ; elle s'arrête quand plus rien ne bouge ──
  let dernier = 0, pDessine = -1;
  function image(ts) {
    const now = maintenant();
    const dt = Math.min((ts - dernier) / 1000 || 0.016, 0.05); dernier = ts;
    const k = 1 - Math.exp(-dt / SUIVI_LISSAGE);
    etat.dx += (etat.cx - etat.dx) * k; etat.dy += (etat.cy - etat.dy) * k;
    dessiner(now);
    const dernierS = etat.souffles.length ? etat.souffles[etat.souffles.length - 1][2] : -1e4;
    const agite = Math.abs(etat.cx - etat.dx) > 0.02 || Math.abs(etat.cy - etat.dy) > 0.02 || now - dernierS < 3.9;
    pDessine = etat.p;
    if (agite) requestAnimationFrame(image);
    else { etat.dx = etat.cx; etat.dy = etat.cy; etat.boucle = false; dessiner(now); }
  }
  function aiguiller() { if (etat.prete && !etat.boucle) { etat.boucle = true; dernier = performance.now(); requestAnimationFrame(image); } }

  function local(cx, cy) {
    const r = fond.getBoundingClientRect(); etat.sc = r.width / (fond.clientWidth || 1);
    return [(cx - r.left) / etat.sc, (cy - r.top) / etat.sc];
  }
  // Un passage de souris : position, date, et vitesse (0 = lente, 1 = rapide) qui règle la distance de vol
  function souffler(cx, cy) {
    const [x, y] = local(cx, cy), t = performance.now();
    const d = etat.dernierS;
    if (!d || (t - d[2] >= SEUIL[0] && Math.hypot(x - d[0], y - d[1]) > SEUIL[1])) {
      const vit = d ? borne(Math.hypot(x - d[0], y - d[1]) / Math.max(t - d[2], 16) / 1.6, 0, 1) : 0.4;   // 1,6 px par ms = rapide
      etat.dernierS = [x, y, t];
      etat.souffles.push([x - etat.dx, y - etat.dy, maintenant(), vit]);
      if (etat.souffles.length > NB) etat.souffles.shift();
    }
  }

  if (!reduit) {
    addEventListener('mousemove', e => {
      if (!etat.prete || e.sourceCapabilities && e.sourceCapabilities.firesTouchEvents) return;
      if (!mobile() && SUIVI) {   // suivi inversé : l'image glisse à l'opposé de la souris
        etat.cx = -borne((e.clientX / innerWidth - 0.5) * 2, -1, 1) * SUIVI;
        etat.cy = -borne((e.clientY / innerHeight - 0.5) * 2, -1, 1) * SUIVI;
      }
      if (e.target === zone) souffler(e.clientX, e.clientY);
      aiguiller();
    }, { passive: true });
    // Doigt : même dispersion, le défilement reste libre (écouteurs passifs), pas de suivi
    const doigt = e => { if (etat.prete) { const t = e.touches[0]; if (t) { souffler(t.clientX, t.clientY); aiguiller(); } } };
    zone.addEventListener('touchstart', doigt, { passive: true });
    zone.addEventListener('touchmove', doigt, { passive: true });
    fond.dataset.holo = '';   // le CSS neutralise le fondu d'about.js : l'extinction est faite dans le shader
  }

  // ── Défilement : p, formule d'about.js ──
  function majP() {
    const vh = innerHeight;
    etat.p = borne((scrollY - Math.max(0, hautBio - 0.92 * vh)) / (1.25 * vh), 0, 1);
    if (etat.prete && !etat.boucle && etat.p !== pDessine) { dessiner(maintenant()); pDessine = etat.p; }
    if (etat.boucle) pDessine = -1;
  }
  if (!reduit) addEventListener('scroll', majP, { passive: true });
  addEventListener('resize', () => { mesurer(); majP(); });
  addEventListener('load', () => { mesurerBio(); majP(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { mesurerBio(); majP(); });
  mesurerBio(); majP();

  // Repli : à la moindre erreur, image noire ou perte de contexte, on revient à la photo normale (page jamais vide)
  function replier(raison) {
    if (etat.replie) return;
    etat.replie = true; etat.prete = false; etat.erreur = String(raison);
    console.error('Points : WebGL abandonné, photo normale affichée.', raison);
    cv.remove(); delete fond.dataset.holo;
    if (img.dataset.src && !img.getAttribute('src')) img.src = img.dataset.src;   // dernier recours : la photo normale n'est chargée qu'ici
  }
  // La trame est lue dans une version réduite (fond-trame.jpg, 1024 px) ; la photo pleine taille (fond.jpg) n'est chargée qu'en cas d'échec
  let essais = 0;
  const source = new Image();
  const decoder = () => (source.decode ? source.decode().catch(() => {}) : Promise.resolve());
  const lancer = () => {
    try { init(source); etat.verifie = true; majP(); }
    catch (err) {
      etat.prete = false;
      if (++essais < 3 && params.get('panne') !== '2' && !gl.isContextLost()) setTimeout(() => decoder().then(lancer), 400 * essais);
      else replier(err && err.message || err);
    }
  };
  cv.addEventListener('webglcontextlost', e => { e.preventDefault(); replier('contexte perdu'); });
  source.onload = () => decoder().then(lancer);
  source.onerror = () => replier('fond-trame.jpg introuvable');
  const demarrer = () => { source.src = new URL(img.dataset.trame || 'Img/fond-trame.jpg', document.baseURI).href; };
  demarrer();
})();
