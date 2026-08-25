/* ====================================================== *
 *  CONFIG —— ここだけ後で差し替えればOK
 * ====================================================== */
const CONFIG = {
  TOOL_NAME: "あそポス",
  TAGLINE: "遊びましたをポスト",
  WANDFABRIK_PORTFOLIO_URL: "https://note.com/wand_fabrik/n/n12d7b194c20e?sub_rt=share_sb",
  LOGO_DATA_URI: document.getElementById('cardSig').src,
};
/* ====================================================== */

const $=(id)=>document.getElementById(id);
const gameEl=$('game'), handleEl=$('handle'), tagsEl=$('tags');
const card=$('card');   // <canvas> プレビュー（drawCardで描画）
const tweetPreview=$('tweetPreview'), testLink=$('testLink');
const exportBtn=$('exportBtn'), worksLink=$('worksLink');
const sizePostcard=$('size-postcard'), sizeMeishi=$('size-meishi');
const stageLabel=$('stageLabel'), dpiHint=$('dpiHint');

$('logoName').textContent=CONFIG.TOOL_NAME;
$('tagline').textContent=CONFIG.TAGLINE;
worksLink.href=CONFIG.WANDFABRIK_PORTFOLIO_URL;
document.title=CONFIG.TOOL_NAME+"："+CONFIG.TAGLINE;

let sizeMode='postcard';
const logoImg=new Image(); logoImg.src=CONFIG.LOGO_DATA_URI;
const LOGO_RATIO=1568/518;

/* カードの論理サイズ（＝プレビューCSS px）。倍率Sだけ変えて書き出しに使う */
const SIZES={
  postcard:{ w:300, h:Math.round(300*148/100), exportW:1181,
             label:'印刷されるカード（ポストカード・縦）',
             hint:'ポストカード（100×148mm）/ 約300dpi。そのまま印刷できます。' },
  meishi:  { w:392, h:Math.round(392*55/91),  exportW:1075,
             label:'印刷されるカード（名刺・横）',
             hint:'名刺サイズ（91×55mm）/ 約300dpi。封入や配布に。' },
};

/* 現在の入力状態を1か所で組み立てる */
function state(){
  const game=gameEl.value.trim();
  const handle=cleanHandle(handleEl.value);
  const tags=parseTags(tagsEl.value);
  return { game, handle, tags, hasGame:game.length>0,
           url: game?buildIntentUrl(game,handle,tags):'' };
}

function buildText(game){ return `『${game||'　　'}』で遊びました！`; }
function cleanHandle(raw){ return (raw||'').replace(/[@＠\s]/g,'').replace(/[^A-Za-z0-9_]/g,''); }
function parseTags(raw){ return (raw||'').replace(/#/g,'').split(/[\s,、　]+/).map(s=>s.trim()).filter(Boolean); }
function buildIntentUrl(game,handle,tags){
  // ハッシュタグは text に直接入れる。intent の hashtags パラメータは
  // Xモバイルアプリのディープリンク処理で無視され、タグが消えるため。
  let text=buildText(game);
  if(handle) text+=` @${handle}`;
  if(tags.length) text+=' '+tags.map(t=>`#${t}`).join(' ');
  const p=new URLSearchParams(); p.set('text',text);
  return 'https://twitter.com/intent/tweet?'+p.toString();
}
function escapeHtml(s){return s.replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}

function makeQR(url){ const qr=qrcode(0,'M'); qr.addData(url); qr.make(); return qr; }

function render(){
  const st=state();
  const menHtml=st.handle?`<span class="men"> @${escapeHtml(st.handle)}</span>`:'';
  const tagHtml=st.tags.map(t=>`<span class="tag"> #${escapeHtml(t)}</span>`).join('');
  tweetPreview.innerHTML=escapeHtml(buildText(st.game))+menHtml+tagHtml;

  if(st.hasGame){ testLink.href=st.url; testLink.setAttribute('aria-disabled','false'); exportBtn.disabled=false; }
  else{ testLink.href='#'; testLink.setAttribute('aria-disabled','true'); exportBtn.disabled=true; }

  // プレビュー＝書き出しと同じ drawCard。倍率はdevicePixelRatioで高精細に
  const sz=SIZES[sizeMode], dpr=window.devicePixelRatio||1;
  drawCard(card,sizeMode,dpr);
  card.style.width=sz.w+'px'; card.style.height=sz.h+'px';
}

function setSize(mode){
  sizeMode=mode;
  sizePostcard.setAttribute('aria-pressed',mode==='postcard');
  sizeMeishi.setAttribute('aria-pressed',mode==='meishi');
  stageLabel.textContent=SIZES[mode].label;
  dpiHint.textContent=SIZES[mode].hint;
  render();
}

gameEl.addEventListener('input',render);
handleEl.addEventListener('input',render);
tagsEl.addEventListener('input',render);
sizePostcard.addEventListener('click',()=>setSize('postcard'));
sizeMeishi.addEventListener('click',()=>setSize('meishi'));

/* ====================================================== *
 *  Canvas 描画 —— プレビューも書き出しも drawCard 一本
 *  設計単位＝プレビューCSS px。倍率Sを掛けるだけで両対応。
 *  S=devicePixelRatio → プレビュー / S=exportW/w → 300dpi書き出し
 * ====================================================== */
/* QRだけは整数スナップのためデバイスpxで描く（変換を一旦解除）*/
function drawQR(ctx,qr,x,y,size,S){
  ctx.save(); ctx.setTransform(1,0,0,1,0,0);
  const n=qr.getModuleCount(), ox=x*S, oy=y*S, sz=size*S, cell=sz/n;
  ctx.fillStyle='#4A3F33';
  for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(qr.isDark(r,c))
    ctx.fillRect(Math.round(ox+c*cell),Math.round(oy+r*cell),Math.ceil(cell),Math.ceil(cell));
  ctx.restore();
}
function qrFrame(ctx,x,y,size,pad){              // QRの白枠（.qrhold相当・設計単位）
  roundRect(ctx,x-pad,y-pad,size+pad*2,size+pad*2,8);
  ctx.fillStyle='#fbfeff'; ctx.fill();
  ctx.strokeStyle='#EADFC2'; ctx.lineWidth=1; ctx.stroke();
}
function ghostBox(ctx,x,y,size,pad){             // 未入力時のQRプレースホルダ
  qrFrame(ctx,x,y,size,pad);
  ctx.save();
  ctx.fillStyle='#cfc4a6'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.font='500 12px "Zen Maru Gothic"';
  ctx.fillText('入力するとQRが出ます',x+size/2,y+size/2);
  ctx.restore();
}
function drawSig(ctx,align,x,byPx,byY,logoW,logoY){   // presents by + ロゴ（align: 'center' | 'left'）
  ctx.textBaseline='top'; ctx.textAlign=align;
  ctx.fillStyle='#b3a98a'; ctx.font=`700 ${byPx}px "Zen Maru Gothic"`;
  ctx.fillText('presents by',x,byY);
  const lx = align==='center' ? x-logoW/2 : x;
  try{ ctx.drawImage(logoImg,lx,logoY,logoW,logoW/LOGO_RATIO); }catch(e){}
}

/* 長い名前を最大maxLines行に収める。収まらなければフォント縮小→最後は切り詰め */
function fitLines(ctx,text,fontOf,maxW,basePx,minPx,maxLines){
  for(let px=basePx; px>=minPx; px--){
    const lines=wrapText(ctx,text,fontOf(px),maxW);
    if(lines.length<=maxLines) return {lines,px};
  }
  let lines=wrapText(ctx,text,fontOf(minPx),maxW);
  if(lines.length>maxLines){ lines=lines.slice(0,maxLines); const i=lines.length-1; lines[i]=lines[i].replace(/.$/,'…'); }
  return {lines,px:minPx};
}

/* 1枚のカードを cv に倍率Sで描く。
   レイアウトは常に設計単位（=プレビューCSS px）で計算し、setTransform(S)で拡大。
   → S=devicePixelRatio でも S=300dpi でも行分割・配置が完全一致する。*/
function drawCard(cv,mode,S){
  const sz=SIZES[mode], st=state();
  cv.width=Math.round(sz.w*S); cv.height=Math.round(sz.h*S);
  const ctx=cv.getContext('2d');
  ctx.setTransform(S,0,0,S,0,0);                  // 以降すべて設計単位で描く
  ctx.fillStyle='#fbfeff'; ctx.fillRect(0,0,sz.w,sz.h);
  ctx.fillStyle='#EE8B2C'; ctx.fillRect(0,0,sz.w,6);   // 上のオレンジ帯
  if(mode==='postcard') drawPostcard(ctx,st,sz,S); else drawMeishi(ctx,st,sz,S);
}

function drawPostcard(ctx,st,sz,S){
  const W=sz.w, H=sz.h, cx=W/2, padX=22, tcol= st.hasGame?'#4A3F33':'#cfc4a6';
  const titleFont=px=>`900 ${px}px "Zen Maru Gothic"`;
  const label= st.hasGame?`『${st.game}』`:'『ゲーム名』';
  ctx.textAlign='center'; ctx.textBaseline='top';
  let ty=26+6;                                    // 上padding(26) + 帯(6)
  const fit=fitLines(ctx,label,titleFont,W-padX*2,21,14,3);
  ctx.fillStyle=tcol; ctx.font=titleFont(fit.px);
  fit.lines.forEach(l=>{ctx.fillText(l,cx,ty); ty+=fit.px*1.25;});
  ctx.font='700 16px "Zen Maru Gothic"'; ctx.fillStyle=tcol;
  ctx.fillText('で遊びました！',cx,ty); ty+=16*1.25;
  const qr=150, qpad=10, qx=cx-qr/2;
  ty+=14;                                         // .qrhold margin-top
  if(st.hasGame){ qrFrame(ctx,qx,ty,qr,qpad); drawQR(ctx,makeQR(st.url),qx,ty,qr,S); }
  else ghostBox(ctx,qx,ty,qr,qpad);
  ty+=qr+qpad+12;                                 // QR下端 + margin-bottom
  ctx.fillStyle='#C9650F'; ctx.textAlign='center'; ctx.font='900 14.5px "Zen Maru Gothic"';
  ctx.fillText('読み取りで感想をポスト',cx,ty);
  const logoW=118, byPx=9, logoY=H-18-logoW/LOGO_RATIO;   // 下padding(18)
  drawSig(ctx,'center',cx,byPx,logoY-byPx*1.7,logoW,logoY);
}

function drawMeishi(ctx,st,sz,S){
  const W=sz.w, H=sz.h, padX=22, padY=20, gapX=16, gap=4, tcol= st.hasGame?'#4A3F33':'#cfc4a6';
  const qr=120, qpad=10, qBox=qr+qpad*2;
  const qBoxX=W-padX-qBox, qBoxY=(H-qBox)/2, qx=qBoxX+qpad, qy=qBoxY+qpad;
  if(st.hasGame){ qrFrame(ctx,qx,qy,qr,qpad); drawQR(ctx,makeQR(st.url),qx,qy,qr,S); }
  else ghostBox(ctx,qx,qy,qr,qpad);
  const lx=padX, lw=qBoxX-gapX-lx;
  const titleFont=px=>`900 ${px}px "Zen Maru Gothic"`;
  const subPx=13, ctaPx=14.5, byPx=9, logoW=96, logoH=96/LOGO_RATIO;
  const label= st.hasGame?`『${st.game}』`:'『ゲーム名』';
  const fit=fitLines(ctx,label,titleFont,lw,17,11,3);
  // 本文（タイトル/サブ/CTA）は中央よりやや上に置く（QR上端あたりに揃う）。ロゴは左下角に固定。
  const textH=fit.lines.length*fit.px*1.25 + subPx*1.3 + gap + ctaPx;
  let ty=Math.max(padY,(H-textH)/2-18);
  ctx.textAlign='left'; ctx.textBaseline='top'; ctx.fillStyle=tcol;
  ctx.font=titleFont(fit.px);
  fit.lines.forEach(l=>{ctx.fillText(l,lx,ty); ty+=fit.px*1.25;});
  ctx.textAlign='right'; ctx.font=`700 ${subPx}px "Zen Maru Gothic"`; ctx.fillStyle=tcol;
  ctx.fillText('で遊びました！',lx+lw,ty); ty+=subPx*1.3+gap;
  ctx.textAlign='left'; ctx.fillStyle='#C9650F'; ctx.font=`900 ${ctaPx}px "Zen Maru Gothic"`;
  ctx.fillText('読み取りで感想をポスト',lx,ty);
  // ロゴ＝左下角に固定（presents by はロゴ直上）
  const logoY=H-padY-logoH;
  drawSig(ctx,'left',lx,byPx,logoY-byPx*1.7,logoW,logoY);
}

/* ===== 書き出し（プレビューと同じ drawCard、倍率だけ300dpi）===== */
async function exportCard(){
  const st=state(); if(!st.hasGame) return;
  try{
    await Promise.all([
      document.fonts.load('900 100px "Zen Maru Gothic"'),
      document.fonts.load('700 100px "Zen Maru Gothic"'),
    ]); await document.fonts.ready;
  }catch(e){}
  if(!logoImg.complete){ try{ await logoImg.decode(); }catch(e){} }
  const sz=SIZES[sizeMode], cv=$('exportCanvas');
  drawCard(cv,sizeMode,sz.exportW/sz.w);
  const safe=st.game.replace(/[\\/:*?"<>|]/g,'_').slice(0,24);
  const a=document.createElement('a');
  a.download=`asopos_${sizeMode}_${safe}.png`; a.href=cv.toDataURL('image/png'); a.click();
}

function wrapText(ctx,text,font,maxW){
  ctx.font=font; if(ctx.measureText(text).width<=maxW)return[text];
  const chars=[...text],lines=[];let cur='';
  for(const ch of chars){ if(ctx.measureText(cur+ch).width>maxW&&cur){lines.push(cur);cur=ch;}else cur+=ch; }
  if(cur)lines.push(cur); return lines;
}
function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}

exportBtn.addEventListener('click',exportCard);

logoImg.onload=render;                                   // ロゴ読込後にプレビュー再描画
if(document.fonts&&document.fonts.ready){ document.fonts.ready.then(render); }  // フォント適用後にも
setSize('postcard');
