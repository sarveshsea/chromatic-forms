/** Four audio-reactive canvas studies. Audio values are normalized to 0..1. */
const clamp = (n, a = 0, b = 1) => Math.max(a, Math.min(b, Number.isFinite(n) ? n : 0));

// CSS Color 4 OKLCH -> linear sRGB -> display sRGB. Chroma is reduced if needed.
function oklchToRgb(lightness, chroma, hue) {
  const angle = hue * Math.PI / 180;
  const convert = (c) => {
    const a = c * Math.cos(angle);
    const b = c * Math.sin(angle);
    const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (lightness - 0.0894841775 * a - 1.2914855480 * b) ** 3;
    return [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
    ];
  };
  let c = chroma;
  let rgb = convert(c);
  for (let i = 0; i < 12 && rgb.some((v) => v < 0 || v > 1); i++) {
    c *= 0.88;
    rgb = convert(c);
  }
  const encode = (v) => Math.round(clamp(v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055) * 255);
  return `rgb(${rgb.map(encode).join(' ')})`;
}

const ink = (l, c, h) => oklchToRgb(l, c, h);

function roundedRectPath(ctx, x, y, w, h, radius) {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function softOrb(ctx, x, y, rx, ry, palette, offset = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(rx, ry);
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.clip();
  const g = ctx.createLinearGradient(-0.8 + offset, -0.9, 0.7 - offset, 0.9);
  palette.forEach(([at, color]) => g.addColorStop(at, color));
  ctx.fillStyle = g;
  ctx.fillRect(-1, -1, 2, 2);
  const gleam = ctx.createRadialGradient(-0.35, -0.4, 0.02, -0.35, -0.4, 1.2);
  gleam.addColorStop(0, 'rgba(255,255,255,.42)');
  gleam.addColorStop(0.35, 'rgba(255,255,255,.07)');
  gleam.addColorStop(1, 'rgba(0,0,0,.18)');
  ctx.fillStyle = gleam;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
}

function tileOne(ctx, w, h, a, t) {
  const pulse = 1 + 0.09 * a.bass;
  const drift = Math.sin(t * 0.43) * 0.035;
  ctx.fillStyle = ink(.61, .28, 23 + a.mid * 18);
  ctx.beginPath(); ctx.ellipse(w*.40, h*.31, w*.30*pulse, h*.25*pulse, -.36, 0, 7); ctx.fill();
  softOrb(ctx, w*(.65+drift), h*.43, w*.31, h*.23,
    [[0,ink(.71,.25,351)], [.38,ink(.92,.07,25)], [.75,ink(.82,.15,340)], [1,ink(.62,.27,358)]], a.treble*.13);
  softOrb(ctx, w*.39, h*.69, w*.33*pulse, h*.21,
    [[0,ink(.67,.20,265)], [.4,ink(.53,.21,242)], [.72,ink(.44,.17,165)], [1,ink(.85,.17,94)]], -.1);
  ctx.save();
  ctx.translate(w*.62, h*.77); ctx.rotate(-.48 + a.mid*.07);
  roundedRectPath(ctx,-w*.25,-h*.11,w*.51,h*.23,h*.12); ctx.clip();
  const g=ctx.createLinearGradient(0,-h*.1,0,h*.12);
  [[0,ink(.77,.19,349)],[.34,ink(.59,.26,28)],[1,ink(.33,.12,172)]].forEach(([p,c])=>g.addColorStop(p,c));
  ctx.fillStyle=g;ctx.fillRect(-w*.27,-h*.13,w*.55,h*.27);
  halftone(ctx,-w*.25,-h*.11,w*.5,h*.24,w*.012,0.35);
  ctx.restore();
}

function halftone(ctx,x,y,w,h,step,alpha=.24) {
  ctx.save(); ctx.globalAlpha=alpha; ctx.fillStyle=ink(.22,.02,250);
  for(let py=y+step/2;py<y+h;py+=step){
    for(let px=x+step/2;px<x+w;px+=step){
      ctx.beginPath();ctx.arc(px,py,Math.max(.55,step*.13),0,7);ctx.fill();
    }
  }
  ctx.restore();
}

function tileTwo(ctx,w,h,a,t) {
  const radius=w*(.425+a.bass*.025);
  const cy=h*.55;
  const palette=[ink(.50,.22,264),ink(.74,.21,225),ink(.72,.22,340),ink(.66,.27,34),ink(.72,.20,145)];
  for(let i=0;i<7;i++){
    const r=radius-i*w*.048;
    ctx.save();ctx.beginPath();ctx.arc(w*.5,cy,r,Math.PI,0);ctx.lineTo(w*.5+r,cy+h*.34);ctx.lineTo(w*.5-r,cy+h*.34);ctx.closePath();ctx.clip();
    const g=ctx.createLinearGradient(w*.12,cy-r,w*.90,cy+r);
    g.addColorStop(0,palette[i%5]);g.addColorStop(.5,ink(.84,.14,315+i*8));g.addColorStop(1,palette[(i+2)%5]);
    ctx.fillStyle=g;ctx.fillRect(0,cy-r,w,h);
    ctx.restore();
  }
  // Scanline slices move laterally on transients, retaining the underlying rings.
  const strips=9;
  for(let i=0;i<strips;i++){
    const sy=h*(.13+i*.082);
    const shift=(i%2?1:-1)*(a.onset*.055+Math.sin(t*.35+i)*.012)*w;
    ctx.fillStyle=ink(.90,.025,280);
    ctx.globalAlpha=.14;
    ctx.fillRect(shift,sy,w,h*.004);
    ctx.fillStyle=ink(.61,.22,i%2?250:35);
    ctx.globalAlpha=.20+a.onset*.18;
    ctx.fillRect(shift,sy+h*.075,w,h*.003);
    ctx.globalAlpha=1;
  }
}

function tileThree(ctx,w,h,a,t) {
  const hues=[25,335,260,67,350,22];
  const bases=[.12,.22,.32,.44,.57,.69];
  bases.forEach((bx,i)=>{
    const width=w*(.23+(i%2)*.015);
    const height=h*(.55+Math.sin(t*.4+i)*.024+a.mid*.09);
    const x=w*bx, y=(h-height)/2+(i%2)*h*.035;
    ctx.save();ctx.shadowColor=ink(.70,.18,hues[i]);ctx.shadowBlur=w*.055;
    roundedRectPath(ctx,x,y,width,height,width*.5);
    const g=ctx.createLinearGradient(x,y,x+width,y+height);
    g.addColorStop(0,ink(.76,.18,hues[i]));
    g.addColorStop(.48,ink(.65,.22,hues[i]+22));
    g.addColorStop(1,ink(.82,.13,hues[i]+65));
    ctx.fillStyle=g;ctx.globalAlpha=.78;ctx.fill();ctx.restore();
  });
  ctx.save();roundedRectPath(ctx,w*.12,h*.22,w*.77,h*.57,w*.12);ctx.clip();
  halftone(ctx,w*.12,h*.22,w*.77,h*.57,w*.009,.10+a.treble*.09);ctx.restore();
}

function tileFour(ctx,w,h,a,t) {
  const spacing=h*.058;
  const scale=1+a.bass*.11;
  for(let side of [-1,1]){
    ctx.save();ctx.translate(w*.5,h*.5);ctx.scale(1,side);
    ctx.beginPath();ctx.rect(-w*.5,-h*.5,w,h*.5);ctx.clip();
    for(let i=7;i>=0;i--){
      const rx=w*(.10+i*.048)*scale;
      const ry=(h*(.05+i*.043)+spacing)*scale;
      const y=-ry*.67 + Math.sin(t*.32+i*.5)*h*.006;
      softOrb(ctx,0,y,rx,ry,
        [[0,ink(.65,.19,245)],[.27,ink(.74,.20,215)],[.53,ink(.62,.26,350)],[.77,ink(.74,.22,345)],[1,ink(.82,.13,182)]],
        a.treble*.10);
      ctx.beginPath();ctx.ellipse(0,y,rx,ry,0,0,7);
      ctx.strokeStyle=ink(.64,.18,268);ctx.globalAlpha=.24;ctx.lineWidth=Math.max(1,w*.002);ctx.stroke();ctx.globalAlpha=1;
    }
    ctx.restore();
  }
}

export function createRenderer(canvas) {
  const ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx) throw new Error('Canvas 2D is unavailable');
  let width=0,height=0,dpr=1;
  function resize(){
    const box=canvas.getBoundingClientRect();
    dpr=Math.min(window.devicePixelRatio||1,2);
    width=Math.max(1,Math.round(box.width*dpr));height=Math.max(1,Math.round(box.height*dpr));
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
  }
  function render(features={},time=0){
    resize();
    const a={rms:clamp(features.rms),bass:clamp(features.bass),mid:clamp(features.mid),treble:clamp(features.treble),beat:clamp(features.beat),onset:clamp(features.onset)};
    ctx.fillStyle=ink(.95,.008,85);ctx.fillRect(0,0,width,height);
    const gap=Math.max(6,Math.min(width,height)*.012);
    const tileW=(width-gap*3)/2,tileH=(height-gap*3)/2;
    [[tileOne,0,0],[tileTwo,1,0],[tileThree,0,1],[tileFour,1,1]].forEach(([draw,col,row])=>{
      const x=gap+col*(tileW+gap),y=gap+row*(tileH+gap);
      ctx.save();ctx.translate(x,y);ctx.beginPath();ctx.rect(0,0,tileW,tileH);ctx.clip();
      ctx.fillStyle=ink(.94,.012,83);ctx.fillRect(0,0,tileW,tileH);
      draw(ctx,tileW,tileH,a,time);ctx.restore();
    });
  }
  resize();
  return {render,resize,destroy(){}};
}

export {oklchToRgb};
