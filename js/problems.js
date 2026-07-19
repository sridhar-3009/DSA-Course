(function(){
'use strict';

/* ── Inject styles ─────────────────────────────────────────── */
(function(){
  if(document.getElementById('dsa-prob-css'))return;
  var s=document.createElement('style');s.id='dsa-prob-css';
  s.textContent=[
    '.prob-tab-bar{display:flex;gap:0.4rem;margin-bottom:0.75rem;flex-wrap:wrap;}',
    '.prob-tab{font:600 0.75rem "JetBrains Mono",monospace;padding:0.32rem 1rem;border-radius:6px;',
    'border:1px solid rgba(139,92,246,0.28);background:rgba(139,92,246,0.07);',
    'color:rgba(167,139,250,0.65);cursor:pointer;transition:all 0.18s;}',
    '.prob-tab:hover{border-color:#8B5CF6;color:#A78BFA;}',
    '.prob-tab.active{background:rgba(139,92,246,0.22);border-color:#8B5CF6;color:#C4B5FD;font-weight:700;}',
    '.prob-inp-row{display:flex;gap:0.5rem;flex-wrap:wrap;align-items:center;',
    'margin-bottom:0.65rem;padding-bottom:0.65rem;border-bottom:1px solid rgba(139,92,246,0.12);}',
    '.prob-inp-lbl{font:10px "JetBrains Mono",monospace;color:rgba(167,139,250,0.6);}',
    '.prob-cv-wrap{border-radius:10px;overflow:hidden;border:1px solid rgba(139,92,246,0.28);',
    'margin-bottom:0.6rem;background:#0b0519;}',
    '.prob-ctrl-row{display:flex;gap:0.4rem;flex-wrap:wrap;align-items:center;margin-bottom:0.4rem;}',
    '.prob-btn{font:0.74rem "JetBrains Mono",monospace;padding:0.28rem 0.8rem;border-radius:6px;',
    'border:1px solid rgba(139,92,246,0.25);background:rgba(139,92,246,0.08);',
    'color:rgba(167,139,250,0.7);cursor:pointer;transition:all 0.18s;}',
    '.prob-btn:hover:not(:disabled){border-color:#8B5CF6;color:#A78BFA;background:rgba(139,92,246,0.18);}',
    '.prob-btn:disabled{opacity:0.32;cursor:not-allowed;}',
    '.prob-play-btn{background:rgba(139,92,246,0.22);border-color:#7C3AED;color:#C4B5FD;}',
    '.prob-spd{font:10px "JetBrains Mono",monospace;color:rgba(167,139,250,0.5);',
    'display:flex;align-items:center;gap:0.3rem;}',
    '.prob-ctr{font:10px "JetBrains Mono",monospace;color:rgba(167,139,250,0.4);margin-left:auto;}',
    '.prob-status{font:0.75rem "JetBrains Mono",monospace;color:rgba(167,139,250,0.6);',
    'padding:0.42rem 0.9rem;background:rgba(6,3,14,0.7);border:1px solid rgba(139,92,246,0.15);',
    'border-top:none;border-radius:0 0 8px 8px;min-height:30px;line-height:1.5;margin-top:-1px;}',
  ].join('');
  document.head.appendChild(s);
})();

/* ── Drawing primitives ───────────────────────────────────── */
function raf(fn){return requestAnimationFrame(fn);}

function rr(ctx,x,y,w,h,r){
  ctx.beginPath();
  ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();
}

function mkCanvas(wrap,w,h){
  var c=document.createElement('canvas');
  var dpr=Math.min(window.devicePixelRatio||1,2);
  c.width=w*dpr|0;c.height=h*dpr|0;
  c.style.cssText='width:100%;max-width:'+w+'px;height:'+h+'px;display:block;';
  var ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
  wrap.appendChild(c);
  return {canvas:c,ctx:ctx,W:w,H:h};
}

/* Background: deep indigo with subtle dot grid */
function bg(ctx,W,H){
  ctx.clearRect(0,0,W,H);
  var g=ctx.createRadialGradient(W*0.5,H*0.38,0,W*0.5,H*0.38,Math.max(W,H)*0.85);
  g.addColorStop(0,'#1e0f45');g.addColorStop(0.55,'#130828');g.addColorStop(1,'#0b0519');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='rgba(139,92,246,0.09)';
  for(var x=18;x<W;x+=20)for(var y=18;y<H;y+=20){ctx.beginPath();ctx.arc(x,y,1.1,0,Math.PI*2);ctx.fill();}
}

/* Color table per state — vivid, clearly distinct */
var CS={
  default:   {g0:'#3b1d8a',g1:'#1c0b50',sk:'#7C3AED',gl:null,               tx:'#ddd6fe'},
  comparing: {g0:'#c2410c',g1:'#7c2d12',sk:'#fb923c',gl:'rgba(251,146,60,.9)',tx:'#ffedd5'},
  active:    {g0:'#6d28d9',g1:'#3b0764',sk:'#c4b5fd',gl:'rgba(196,181,253,.8)',tx:'#f5f3ff'},
  found:     {g0:'#047857',g1:'#064e3b',sk:'#34d399',gl:'rgba(52,211,153,.95)',tx:'#d1fae5'},
  sorted:    {g0:'#0e7490',g1:'#0c4a6e',sk:'#22d3ee',gl:'rgba(34,211,238,.55)',tx:'#cffafe'},
  pivot:     {g0:'#b91c1c',g1:'#7f1d1d',sk:'#f87171',gl:'rgba(248,113,113,.85)',tx:'#fee2e2'},
  selected:  {g0:'#1d4ed8',g1:'#1e3a8a',sk:'#60a5fa',gl:'rgba(96,165,250,.7)', tx:'#dbeafe'},
  visited:   {g0:'#15803d',g1:'#14532d',sk:'#4ade80',gl:'rgba(74,222,128,.65)',tx:'#dcfce7'},
  water:     {g0:'#1e1040',g1:'#0f0820',sk:'rgba(139,92,246,.2)',gl:null,     tx:'rgba(167,139,250,.35)'},
};

function cell(ctx,x,y,w,h,val,state){
  var s=CS[state]||CS.default;
  var r=Math.min(9,w*.25,h*.25);
  ctx.save();
  if(s.gl){ctx.shadowColor=s.gl;ctx.shadowBlur=20;}
  var g=ctx.createLinearGradient(x,y,x,y+h);
  g.addColorStop(0,s.g0);g.addColorStop(1,s.g1);
  rr(ctx,x,y,w,h,r);ctx.fillStyle=g;ctx.fill();
  ctx.shadowBlur=0;
  ctx.strokeStyle=s.sk;ctx.lineWidth=2;ctx.stroke();
  // top sheen
  ctx.strokeStyle='rgba(255,255,255,0.13)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(x+r+2,y+1.5);ctx.lineTo(x+w-r-2,y+1.5);ctx.stroke();
  // label
  var fs=Math.max(9,Math.min(13,Math.floor(w*0.34)));
  ctx.fillStyle=s.tx||'#ede9fe';
  ctx.font='700 '+fs+'px "JetBrains Mono",monospace';
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(String(val),x+w/2,y+h/2);
  ctx.restore();
}

function arrow(ctx,cx,tipY,label,color){
  ctx.save();
  ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=10;
  ctx.beginPath();ctx.moveTo(cx,tipY+5);ctx.lineTo(cx-8,tipY-10);ctx.lineTo(cx+8,tipY-10);ctx.closePath();ctx.fill();
  ctx.shadowBlur=0;
  ctx.font='bold 11px "JetBrains Mono",monospace';
  ctx.textAlign='center';ctx.textBaseline='bottom';ctx.fillStyle=color;
  ctx.fillText(label,cx,tipY-13);
  ctx.restore();
}

function lbl(ctx,text,x,y,color,size,align){
  ctx.save();ctx.fillStyle=color||'rgba(167,139,250,.6)';
  ctx.font=(size||10)+'px "JetBrains Mono",monospace';
  ctx.textAlign=align||'center';ctx.textBaseline='middle';
  ctx.fillText(String(text),x,y);ctx.restore();
}

/* ── UI builder ────────────────────────────────────────────── */
function el(tag,cls,txt){
  var e=document.createElement(tag);
  if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e;
}
function inp(def,ph,w){
  var i=el('input');i.className='demo-input';i.value=def;
  i.placeholder=ph||def;i.style.width=(w||100)+'px';return i;
}

function makeProbUI(container,cfg){
  /* cfg: {canvasW, canvasH, approaches:[{key,label}],
           inputs:[{id,lbl,elem}], onApproach, onInputs,
           buildSteps(approach)->steps[], onStep(step,ctx,W,H), onReset(ctx,W,H)} */
  container.innerHTML='';
  var curA=cfg.approaches&&cfg.approaches.length?cfg.approaches[0].key:'_';

  /* Approach tabs */
  if(cfg.approaches&&cfg.approaches.length>1){
    var tabBar=el('div','prob-tab-bar');
    cfg.approaches.forEach(function(a,i){
      var btn=el('button','prob-tab'+(i===0?' active':''),a.label);
      btn.addEventListener('click',function(){
        tabBar.querySelectorAll('.prob-tab').forEach(function(b){b.classList.remove('active');});
        btn.classList.add('active');curA=a.key;
        if(cfg.onApproach)cfg.onApproach(a.key);
        doReset();
      });
      tabBar.appendChild(btn);
    });
    container.appendChild(tabBar);
  }

  /* Input row */
  var refs={};
  if(cfg.inputs&&cfg.inputs.length){
    var iRow=el('div','prob-inp-row');
    cfg.inputs.forEach(function(ic){
      iRow.appendChild(el('span','prob-inp-lbl',ic.lbl));
      iRow.appendChild(ic.elem);refs[ic.id]=ic.elem;
    });
    var applyB=el('button','prob-btn','Apply');
    applyB.addEventListener('click',function(){
      var v={};Object.keys(refs).forEach(function(k){v[k]=refs[k].value.trim();});
      if(cfg.onInputs)cfg.onInputs(v);doReset();
    });
    iRow.appendChild(applyB);container.appendChild(iRow);
  }

  /* Canvas */
  var wrap=el('div','prob-cv-wrap');container.appendChild(wrap);
  var cv=mkCanvas(wrap,cfg.canvasW||700,cfg.canvasH||260);

  /* Controls */
  var row=el('div','prob-ctrl-row');
  var playB=el('button','prob-btn prob-play-btn','▶ Play');
  var pauseB=el('button','prob-btn','⏸ Pause');pauseB.disabled=true;
  var stepB=el('button','prob-btn','Step →');
  var resetB=el('button','prob-btn','↺ Reset');
  var spdW=el('label','prob-spd');
  spdW.innerHTML='Speed <input type="range" min="0.25" max="3" step="0.25" value="1" style="width:62px"> <span>1×</span>';
  var sSldr=spdW.querySelector('input'),sSpan=spdW.querySelector('span');
  sSldr.addEventListener('input',function(){sSpan.textContent=this.value+'×';speed=parseFloat(this.value);});
  var ctr=el('span','prob-ctr','Step 0 / 0');
  [playB,pauseB,stepB,resetB,spdW,ctr].forEach(function(e){row.appendChild(e);});
  container.appendChild(row);

  /* Status */
  var sta=el('div','prob-status','▸ Press Play or Step to begin.');
  container.appendChild(sta);

  var playing=false,idx=0,steps=[],speed=1,rafId=null,lastT=0;

  function setP(p){playB.disabled=p;pauseB.disabled=!p;stepB.disabled=p;}

  function doStep(){
    if(!steps.length){
      steps=(cfg.buildSteps?cfg.buildSteps(curA):[])||[];
      ctr.textContent='Step 0 / '+steps.length;
    }
    if(idx<steps.length){
      var s=steps[idx];
      if(cfg.onStep)cfg.onStep(s,cv.ctx,cv.W,cv.H);
      sta.textContent=s.msg||'';
      idx++;ctr.textContent='Step '+idx+' / '+steps.length;
    } else {
      playing=false;setP(false);
      sta.textContent='✓ Done — '+steps.length+' steps total';
    }
  }

  function doReset(){
    playing=false;idx=0;steps=[];if(rafId)cancelAnimationFrame(rafId);
    setP(false);ctr.textContent='Step 0 / 0';
    sta.textContent='▸ Press Play or Step to begin.';
    if(cfg.onReset)cfg.onReset(cv.ctx,cv.W,cv.H);
  }

  playB.addEventListener('click',function(){
    steps=(cfg.buildSteps?cfg.buildSteps(curA):[])||[];
    ctr.textContent='Step 0 / '+steps.length;
    if(!steps.length)return;
    playing=true;setP(true);
    (function loop(){
      if(!playing||idx>=steps.length){
        if(idx>=steps.length){playing=false;setP(false);sta.textContent='✓ Done — '+steps.length+' steps total';}
        return;
      }
      var now=performance.now();
      if(now-lastT>1200/speed){doStep();lastT=now;}
      rafId=raf(loop);
    })();
  });
  pauseB.addEventListener('click',function(){playing=false;if(rafId)cancelAnimationFrame(rafId);setP(false);});
  stepB.addEventListener('click',doStep);
  resetB.addEventListener('click',doReset);

  return {ctx:cv.ctx,W:cv.W,H:cv.H,reset:doReset};
}

/* ════════════════════════════════════════════════════════════
   P1 — Two Sum
════════════════════════════════════════════════════════════ */
function initTwoSum(id){
  var container=document.getElementById(id);if(!container)return;
  var arr=[2,7,11,15,3,6],target=9;

  var CW=66,CH=50,GAP=6;

  function buildBrute(a,t){
    var s=[];
    for(var i=0;i<a.length-1;i++){
      for(var j=i+1;j<a.length;j++){
        var sum=a[i]+a[j];
        var st=a.map(function(_,k){return k===i?'comparing':k===j?'active':'default';});
        s.push({st:st,i:i,j:j,msg:'Check ['+i+']+['+j+']: '+a[i]+'+'+a[j]+'='+sum+(sum===t?' = '+t+' ✓ FOUND!':'')});
        if(sum===t){
          var fs=a.map(function(_,k){return (k===i||k===j)?'found':'default';});
          s.push({st:fs,i:i,j:j,done:true,msg:'Found! ['+i+','+j+'] → ['+a[i]+','+a[j]+'] sum = '+t+'. Total: '+s.length+' steps.'});
          return s;
        }
      }
    }
    return s;
  }

  function buildHash(a,t){
    var s=[],map={};
    for(var i=0;i<a.length;i++){
      var need=t-a[i];
      var st=a.map(function(_,k){return k===i?'comparing':'default';});
      if(map[need]!==undefined){
        var fs=a.map(function(_,k){return (k===i||k===map[need])?'found':'default';});
        s.push({st:fs,i:i,j:map[need],mapS:Object.assign({},map),
          msg:'Map has '+need+'! Found ['+map[need]+','+i+']. Done in '+(i+1)+' lookups (O(n)).'});
        return s;
      }
      map[a[i]]=i;
      s.push({st:st,i:i,mapS:Object.assign({},map),
        msg:'Index '+i+': need '+need+', not in map. Store '+a[i]+'→'+i+'.'});
    }
    return s;
  }

  function draw(s){
    bg(ui.ctx,ui.W,ui.H);
    var startX=(ui.W-(arr.length*(CW+GAP)-GAP))/2;
    var cellY=ui.H/2-CH/2-18;
    arr.forEach(function(v,i){
      cell(ui.ctx,startX+i*(CW+GAP),cellY,CW,CH,v,(s&&s.st)?s.st[i]:'default');
      lbl(ui.ctx,i,startX+i*(CW+GAP)+CW/2,cellY+CH+16,'rgba(167,139,250,.45)',9);
    });
    if(s){
      if(s.i!=null){arrow(ui.ctx,startX+s.i*(CW+GAP)+CW/2,cellY-6,'i',s.done?'#34D399':'#FB923C');}
      if(s.j!=null){arrow(ui.ctx,startX+s.j*(CW+GAP)+CW/2,cellY-6,'j',s.done?'#34D399':'#C4B5FD');}
    }
    // Target badge
    ui.ctx.save();
    rr(ui.ctx,ui.W-118,10,108,26,5);
    var tg=ui.ctx.createLinearGradient(ui.W-118,10,ui.W-10,36);
    tg.addColorStop(0,'#2E1B6B');tg.addColorStop(1,'#120930');
    ui.ctx.fillStyle=tg;ui.ctx.fill();
    ui.ctx.strokeStyle='rgba(139,92,246,.5)';ui.ctx.lineWidth=1.5;ui.ctx.stroke();
    ui.ctx.fillStyle='#A78BFA';ui.ctx.font='bold 12px "JetBrains Mono",monospace';
    ui.ctx.textAlign='center';ui.ctx.textBaseline='middle';
    ui.ctx.fillText('target = '+target,ui.W-64,23);
    ui.ctx.restore();
    // HashMap strip
    if(s&&s.mapS){
      var keys=Object.keys(s.mapS);
      if(keys.length){
        lbl(ui.ctx,'HashMap:',46,ui.H-34,'rgba(167,139,250,.55)',10,'left');
        var mx=108;
        keys.forEach(function(k){cell(ui.ctx,mx,ui.H-48,68,28,k+'→'+s.mapS[k],'selected');mx+=74;});
      }
    }
  }

  var ui=makeProbUI(container,{
    canvasW:700,canvasH:280,
    approaches:[{key:'brute',label:'⚡ Brute O(n²)'},{key:'hash',label:'🗺 HashMap O(n)'}],
    inputs:[{id:'arr',lbl:'Array:',elem:inp('2,7,11,15,3,6','',180)},{id:'t',lbl:'Target:',elem:inp('9','',52)}],
    onApproach:function(){},
    onInputs:function(v){
      var p=v.arr.split(',').map(function(s){return parseInt(s.trim());}).filter(function(x){return !isNaN(x);});
      var t=parseInt(v.t);if(p.length>=2&&!isNaN(t)){arr=p;target=t;}
    },
    buildSteps:function(a){return a==='hash'?buildHash(arr,target):buildBrute(arr,target);},
    onStep:function(s){draw(s);},
    onReset:function(){draw(null);}
  });
  draw(null);
}

/* ════════════════════════════════════════════════════════════
   P2 — Best Time to Buy & Sell Stock
════════════════════════════════════════════════════════════ */
function initBestStock(id){
  var container=document.getElementById(id);if(!container)return;
  var prices=[7,1,5,3,6,4];

  function buildBrute(p){
    var s=[],maxP=0;
    for(var i=0;i<p.length;i++)for(var j=i+1;j<p.length;j++){
      var pr=p[j]-p[i];if(pr>maxP)maxP=pr;
      s.push({buy:i,sell:j,profit:pr,maxP:maxP,msg:'Brute: buy@d'+i+'('+p[i]+') sell@d'+j+'('+p[j]+') profit='+pr+' best='+maxP});
    }
    s.push({done:true,maxP:maxP,msg:'Max profit = '+maxP+'. O(n²) — '+s.length+' steps.'});
    return s;
  }

  function buildOpt(p){
    var s=[],minP=p[0],maxP=0;
    s.push({minIdx:0,curIdx:0,minP:minP,maxP:0,msg:'Start: minPrice='+p[0]+' (day 0)'});
    for(var i=1;i<p.length;i++){
      var pr=p[i]-minP;if(pr>maxP)maxP=pr;
      var prevMin=minP;
      s.push({minIdx:p.indexOf(prevMin),curIdx:i,profit:pr,minP:minP,maxP:maxP,
        msg:'Day '+i+': price='+p[i]+' profit='+pr+' minSoFar='+minP+' maxProfit='+maxP});
      if(p[i]<minP){minP=p[i];}
    }
    s.push({done:true,maxP:maxP,msg:'Max profit = '+maxP+'. O(n) — '+s.length+' steps.'});
    return s;
  }

  function draw(s){
    bg(ui.ctx,ui.W,ui.H);
    var maxV=Math.max.apply(null,prices)||1;
    var bw=Math.max(36,Math.floor((ui.W-60)/prices.length)-4);
    var maxH=ui.H-80,baseY=ui.H-36,sx=30+(ui.W-60-prices.length*(bw+4))/2;
    prices.forEach(function(v,i){
      var bh=Math.max(4,Math.round((v/maxV)*maxH));
      var x=sx+i*(bw+4),y=baseY-bh;
      var st='default';
      if(s){
        if(s.done){st='sorted';}
        else if(i===s.buy||i===s.minIdx)st='found';
        else if(i===s.sell||i===s.curIdx)st='comparing';
      }
      ui.ctx.save();
      var bg2=ui.ctx.createLinearGradient(x,y,x,baseY);
      if(st==='comparing'){bg2.addColorStop(0,'#FB923C');bg2.addColorStop(1,'#7C2D12');ui.ctx.shadowColor='rgba(251,146,60,.7)';ui.ctx.shadowBlur=14;}
      else if(st==='found'){bg2.addColorStop(0,'#34D399');bg2.addColorStop(1,'#064E3B');ui.ctx.shadowColor='rgba(52,211,153,.7)';ui.ctx.shadowBlur=14;}
      else if(st==='sorted'){bg2.addColorStop(0,'#34D399');bg2.addColorStop(1,'#064E3B');}
      else{bg2.addColorStop(0,'#A78BFA');bg2.addColorStop(1,'#2D1B69');}
      rr(ui.ctx,x,y,bw,bh,3);ui.ctx.fillStyle=bg2;ui.ctx.fill();
      ui.ctx.shadowBlur=0;
      ui.ctx.strokeStyle=st==='comparing'?'#FB923C':st==='found'?'#34D399':'rgba(139,92,246,.4)';
      ui.ctx.lineWidth=1.5;ui.ctx.stroke();
      ui.ctx.restore();
      lbl(ui.ctx,v,x+bw/2,y-12,'#EDE9FE',11);
      lbl(ui.ctx,'d'+i,x+bw/2,baseY+14,'rgba(167,139,250,.45)',9);
    });
    if(s&&s.maxP!=null){
      ui.ctx.save();
      rr(ui.ctx,ui.W-150,10,140,28,5);
      var tg=ui.ctx.createLinearGradient(ui.W-150,10,ui.W-10,38);
      tg.addColorStop(0,'#064E3B');tg.addColorStop(1,'#052E16');
      ui.ctx.fillStyle=tg;ui.ctx.fill();
      ui.ctx.strokeStyle='rgba(52,211,153,.5)';ui.ctx.lineWidth=1.5;ui.ctx.stroke();
      ui.ctx.fillStyle='#34D399';ui.ctx.font='bold 12px "JetBrains Mono",monospace';
      ui.ctx.textAlign='center';ui.ctx.textBaseline='middle';
      ui.ctx.fillText('Max Profit: '+s.maxP,ui.W-80,24);
      ui.ctx.restore();
    }
  }

  var ui=makeProbUI(container,{
    canvasW:700,canvasH:260,
    approaches:[{key:'brute',label:'⚡ Brute O(n²)'},{key:'opt',label:'🚀 Slide O(n)'}],
    inputs:[{id:'p',lbl:'Prices:',elem:inp('7,1,5,3,6,4','',200)}],
    onInputs:function(v){var p=v.p.split(',').map(function(s){return parseInt(s.trim());}).filter(function(x){return !isNaN(x);});if(p.length>=2)prices=p;},
    buildSteps:function(a){return a==='opt'?buildOpt(prices):buildBrute(prices);},
    onStep:function(s){draw(s);},
    onReset:function(){draw(null);}
  });
  draw(null);
}

/* ════════════════════════════════════════════════════════════
   P3 — Valid Parentheses
════════════════════════════════════════════════════════════ */
function initValidParens(id){
  var container=document.getElementById(id);if(!container)return;
  var input='({[]})';

  function buildSteps(s){
    var out=[],stack=[];
    var match={')':'(', '}':'{', ']':'['};
    for(var i=0;i<s.length;i++){
      var ch=s[i];
      if('([{'.indexOf(ch)>=0){
        stack.push(ch);
        out.push({idx:i,stack:stack.slice(),state:'active',msg:'Push "'+ch+'" → stack: ['+stack.join('')+']'});
      } else {
        var top=stack[stack.length-1];
        if(top===match[ch]){
          stack.pop();
          out.push({idx:i,stack:stack.slice(),state:'found',msg:'Match ✓ "'+top+ch+'" pair. Stack: ['+stack.join('')+']'});
        } else {
          out.push({idx:i,stack:stack.slice(),state:'pivot',msg:'INVALID: "'+ch+'" cannot close "'+top+'"'});
          return out;
        }
      }
    }
    var valid=stack.length===0;
    out.push({idx:-1,stack:[],state:valid?'sorted':'pivot',msg:valid?'✓ VALID — all brackets matched. O(n).':'✗ INVALID — '+stack.length+' unclosed bracket(s).'});
    return out;
  }

  function draw(s){
    bg(ui.ctx,ui.W,ui.H);
    var chars=input.split('');
    var CW=46,CH=46,GAP=6;
    var startX=(ui.W-(chars.length*(CW+GAP)-GAP))/2;
    var cellY=ui.H/2-CH/2-22;
    chars.forEach(function(ch,i){
      var st=(s&&s.idx===i)?s.state:'default';
      cell(ui.ctx,startX+i*(CW+GAP),cellY,CW,CH,ch,st);
      lbl(ui.ctx,i,startX+i*(CW+GAP)+CW/2,cellY+CH+14,'rgba(167,139,250,.4)',9);
    });
    // Stack visualization
    if(s&&s.stack&&s.stack.length>0){
      lbl(ui.ctx,'Stack →',44,ui.H-34,'rgba(167,139,250,.55)',10,'left');
      s.stack.forEach(function(c,i){cell(ui.ctx,106+i*(38+4),ui.H-50,38,30,c,'selected');});
    }
  }

  var ui=makeProbUI(container,{
    canvasW:700,canvasH:220,
    inputs:[{id:'s',lbl:'String:',elem:inp('({[]})', '',160)}],
    onInputs:function(v){if(v.s.trim())input=v.s.trim();},
    buildSteps:function(){return buildSteps(input);},
    onStep:function(s){draw(s);},
    onReset:function(){draw(null);}
  });
  draw(null);
}

/* ════════════════════════════════════════════════════════════
   P4 — Longest Substring Without Repeating
════════════════════════════════════════════════════════════ */
function initLongestSubstr(id){
  var container=document.getElementById(id);if(!container)return;
  var input='abcabcbb';

  function buildBrute(s){
    var out=[],maxL=0;
    for(var i=0;i<s.length;i++){
      var seen={};
      for(var j=i;j<s.length;j++){
        if(seen[s[j]]){
          out.push({L:i,R:j-1,max:maxL,dup:j,msg:'Brute ['+i+'..'+j+']: dup "'+s[j]+'" → stop. maxLen='+maxL});break;
        }
        seen[s[j]]=true;if(j-i+1>maxL)maxL=j-i+1;
        out.push({L:i,R:j,max:maxL,msg:'Brute ['+i+'..'+j+']: "'+s.slice(i,j+1)+'" valid. maxLen='+maxL});
      }
    }
    out.push({L:-1,R:-1,max:maxL,msg:'Max length = '+maxL+'. O(n²) — '+out.length+' steps.'});
    return out;
  }

  function buildSlide(s){
    var out=[],map={},maxL=0,L=0;
    for(var R=0;R<s.length;R++){
      if(map[s[R]]!==undefined&&map[s[R]]>=L){
        out.push({L:L,R:R,max:maxL,dup:true,msg:'Dup "'+s[R]+'" at '+map[s[R]]+' → slide L to '+(map[s[R]]+1)});
        L=map[s[R]]+1;
      }
      map[s[R]]=R;if(R-L+1>maxL)maxL=R-L+1;
      out.push({L:L,R:R,max:maxL,msg:'Window ['+L+'..'+R+']: "'+s.slice(L,R+1)+'" len='+(R-L+1)+' maxLen='+maxL});
    }
    out.push({L:-1,R:-1,max:maxL,msg:'Max = '+maxL+'. O(n) sliding window — '+out.length+' steps.'});
    return out;
  }

  function draw(s){
    bg(ui.ctx,ui.W,ui.H);
    var chars=input.split('');
    var CW=Math.min(48,Math.floor((ui.W-40)/chars.length)-4),CH=46,GAP=4;
    var startX=(ui.W-(chars.length*(CW+GAP)-GAP))/2;
    var cellY=ui.H/2-CH/2-14;
    chars.forEach(function(ch,i){
      var st='default';
      if(s&&s.L>=0){
        if(i===s.dup)st='pivot';
        else if(i>=s.L&&i<=s.R)st=(s.dup&&i===s.L)?'comparing':'active';
      }
      cell(ui.ctx,startX+i*(CW+GAP),cellY,CW,CH,ch,st);
    });
    // Window bracket
    if(s&&s.L>=0&&s.R>=s.L){
      ui.ctx.save();
      ui.ctx.strokeStyle='rgba(52,211,153,.6)';ui.ctx.lineWidth=2;ui.ctx.setLineDash([4,3]);
      ui.ctx.strokeRect(startX+s.L*(CW+GAP)-3,cellY-3,(s.R-s.L+1)*(CW+GAP)+2,CH+6);
      ui.ctx.setLineDash([]);ui.ctx.restore();
    }
    if(s&&s.max!=null){
      lbl(ui.ctx,'Max Length: '+s.max,ui.W-80,ui.H-22,'#34D399',13);
    }
  }

  var ui=makeProbUI(container,{
    canvasW:700,canvasH:210,
    approaches:[{key:'brute',label:'⚡ Brute O(n²)'},{key:'slide',label:'🪟 Sliding Window O(n)'}],
    inputs:[{id:'s',lbl:'String:',elem:inp('abcabcbb','',160)}],
    onInputs:function(v){if(v.s.trim())input=v.s.trim();},
    buildSteps:function(a){return a==='slide'?buildSlide(input):buildBrute(input);},
    onStep:function(s){draw(s);},
    onReset:function(){draw(null);}
  });
  draw(null);
}

/* ════════════════════════════════════════════════════════════
   P5 — Climbing Stairs
════════════════════════════════════════════════════════════ */
function initClimbingStairs(id){
  var container=document.getElementById(id);if(!container)return;
  var N=8;

  function buildBrute(n){
    var out=[],calls=0;
    function rec(k){
      calls++;out.push({step:k,calls:calls,msg:'climbStairs('+k+') — call #'+calls});
      if(k<=1)return 1;return rec(k-1)+rec(k-2);
    }
    var ans=rec(n);
    out.push({step:n,calls:calls,ans:ans,msg:'Answer='+ans+'. Calls='+calls+' O(2ⁿ) — each doubles!'});
    return out;
  }

  function buildDP(n){
    var out=[],dp=new Array(n+1).fill(0);dp[0]=1;dp[1]=1;
    out.push({dp:dp.slice(),idx:1,msg:'Base: dp[0]=1, dp[1]=1'});
    for(var i=2;i<=n;i++){
      dp[i]=dp[i-1]+dp[i-2];
      out.push({dp:dp.slice(),idx:i,msg:'dp['+i+']=dp['+(i-1)+']+dp['+(i-2)+']='+dp[i-1]+'+'+dp[i-2]+'='+dp[i]});
    }
    out.push({dp:dp.slice(),idx:n,ans:dp[n],msg:'Ways to climb '+n+' stairs = '+dp[n]+'. O(n) DP.'});
    return out;
  }

  function buildOpt(n){
    var out=[],p2=1,p1=1;
    out.push({p2:p2,p1:p1,msg:'O(1) space: p2=1, p1=1 (only 2 vars)'});
    for(var i=2;i<=n;i++){
      var cur=p1+p2;
      out.push({p2:p2,p1:p1,cur:cur,step:i,msg:'Step '+i+': '+p1+'+'+p2+'='+cur+' → slide'});
      p2=p1;p1=cur;
    }
    out.push({p1:p1,ans:p1,msg:'Answer='+p1+'. O(n) time, O(1) space!'});
    return out;
  }

  var curA='brute';

  function draw(s){
    bg(ui.ctx,ui.W,ui.H);
    if(curA==='brute'){
      lbl(ui.ctx,'Recursive calls explode exponentially',ui.W/2,36,'rgba(167,139,250,.55)',12);
      if(s){
        var callColor=s.calls>100?'#EF4444':s.calls>20?'#F59E0B':'#A78BFA';
        lbl(ui.ctx,'Calls: '+s.calls,ui.W/2,ui.H/2-20,callColor,32);
        lbl(ui.ctx,'climbStairs('+s.step+')',ui.W/2,ui.H/2+30,'rgba(167,139,250,.6)',13);
        if(s.ans!=null)lbl(ui.ctx,'Answer: '+s.ans,ui.W/2,ui.H-30,'#34D399',16);
      }
    } else {
      var dp=s&&s.dp?s.dp:new Array(N+1).fill(0);
      var CW=Math.min(54,Math.floor((ui.W-40)/(N+1))-4),CH=42;
      var sx=(ui.W-(N+1)*(CW+4)-4*(N+1))/2+10,sy=ui.H/2-CH/2;
      dp.forEach(function(v,i){
        var st=(s&&s.idx===i)?'active':(s&&i<=(s.idx||0)&&v>0)?'sorted':'default';
        cell(ui.ctx,sx+i*(CW+4),sy,CW,CH,v||0,st);
        lbl(ui.ctx,'dp['+i+']',sx+i*(CW+4)+CW/2,sy+CH+16,'rgba(167,139,250,.4)',8);
      });
      if(curA==='opt'&&s){
        lbl(ui.ctx,'p2='+s.p2+'  p1='+s.p1+(s.cur!=null?'  →'+s.cur:''),ui.W/2,sy-22,'rgba(167,139,250,.6)',11);
      }
      if(s&&s.ans!=null)lbl(ui.ctx,'Ways = '+s.ans,ui.W/2,ui.H-22,'#34D399',15);
    }
  }

  var ui=makeProbUI(container,{
    canvasW:700,canvasH:220,
    approaches:[{key:'brute',label:'⚡ Brute O(2ⁿ)'},{key:'dp',label:'📊 DP Table O(n)'},{key:'opt',label:'🚀 O(1) Space'}],
    inputs:[{id:'n',lbl:'n (stairs):',elem:inp('8','',60)}],
    onApproach:function(a){curA=a;},
    onInputs:function(v){var n=parseInt(v.n);if(!isNaN(n)&&n>0&&n<=15)N=n;},
    buildSteps:function(a){curA=a;if(a==='brute')return buildBrute(N);if(a==='dp')return buildDP(N);return buildOpt(N);},
    onStep:function(s){draw(s);},
    onReset:function(){draw(null);}
  });
  draw(null);
}

/* ════════════════════════════════════════════════════════════
   P6 — Coin Change
════════════════════════════════════════════════════════════ */
function initCoinChange(id){
  var container=document.getElementById(id);if(!container)return;
  var coins=[1,2,5],amount=11;

  function buildGreedy(c,a){
    var out=[],rem=a,used=[],sorted=c.slice().sort(function(x,y){return y-x;});
    sorted.forEach(function(coin){
      while(rem>=coin){used.push(coin);rem-=coin;out.push({used:used.slice(),rem:rem,coin:coin,msg:'Greedy: take coin '+coin+'. Remaining: '+rem});}
    });
    out.push({used:used.slice(),rem:rem,msg:rem===0?'Done! '+used.length+' coins: ['+used.join(',')+'] (Greedy — may not be optimal!)':'Cannot make change.'});
    return out;
  }

  function buildDP(c,a){
    var INF=Infinity;
    var out=[],dp=new Array(a+1).fill(INF);dp[0]=0;
    for(var i=1;i<=a;i++){
      c.forEach(function(coin){if(coin<=i&&dp[i-coin]+1<dp[i])dp[i]=dp[i-coin]+1;});
      out.push({dp:dp.slice(),idx:i,msg:'dp['+i+']='+(dp[i]===INF?'∞':dp[i])+' (min coins for '+i+')'});
    }
    out.push({dp:dp.slice(),idx:a,ans:dp[a],msg:'Min coins for '+a+': '+(dp[a]===INF?'impossible':dp[a])+'. O(amount×coins).'});
    return out;
  }

  var curA='greedy';
  function draw(s){
    bg(ui.ctx,ui.W,ui.H);
    lbl(ui.ctx,'Coins: ['+coins.join(',')+']   Amount: '+amount,ui.W/2,ui.H-16,'rgba(167,139,250,.4)',10);
    if(curA==='greedy'){
      if(s&&s.used){
        lbl(ui.ctx,'Used:',54,54,'rgba(167,139,250,.55)',10,'left');
        s.used.forEach(function(c,i){cell(ui.ctx,100+i*54,38,46,30,c,'active');});
        lbl(ui.ctx,'Remaining: '+s.rem,ui.W/2,110,'#F59E0B',15);
        if(s.rem===0)lbl(ui.ctx,s.used.length+' coins total',ui.W/2,145,'#34D399',14);
      }
    } else {
      var dp=s&&s.dp?s.dp:new Array(amount+1).fill(0);
      var CW=Math.max(26,Math.floor((ui.W-30)/(amount+1))-3),CH=38;
      var sx=15,sy=60;
      dp.forEach(function(v,i){
        var st=(s&&s.idx===i)?'active':(s&&i<=(s.idx||0)&&v!==Infinity)?'sorted':'default';
        cell(ui.ctx,sx+i*(CW+3),sy,CW,CH,v===Infinity?'∞':v,st);
        lbl(ui.ctx,i,sx+i*(CW+3)+CW/2,sy+CH+14,'rgba(167,139,250,.35)',8);
      });
      if(s&&s.ans!=null)lbl(ui.ctx,'Min coins: '+(s.ans===Infinity?'impossible':s.ans),ui.W/2,ui.H-36,'#34D399',15);
    }
  }

  var ui=makeProbUI(container,{
    canvasW:700,canvasH:210,
    approaches:[{key:'greedy',label:'🎲 Greedy (may fail)'},{key:'dp',label:'📊 DP O(n×k)'}],
    inputs:[{id:'c',lbl:'Coins:',elem:inp('1,2,5','',120)},{id:'a',lbl:'Amount:',elem:inp('11','',60)}],
    onApproach:function(a){curA=a;},
    onInputs:function(v){
      var c=v.c.split(',').map(function(s){return parseInt(s.trim());}).filter(function(x){return !isNaN(x)&&x>0;});
      var a=parseInt(v.a);if(c.length&&!isNaN(a)&&a>0){coins=c;amount=a;}
    },
    buildSteps:function(a){curA=a;return a==='dp'?buildDP(coins,amount):buildGreedy(coins,amount);},
    onStep:function(s){draw(s);},
    onReset:function(){draw(null);}
  });
  draw(null);
}

/* ════════════════════════════════════════════════════════════
   P7 — Merge Intervals
════════════════════════════════════════════════════════════ */
function initMergeIntervals(id){
  var container=document.getElementById(id);if(!container)return;
  var intervals=[[1,3],[2,6],[8,10],[15,18]];

  function buildBrute(ivs){
    var out=[],m=ivs.map(function(x){return x.slice();}),changed=true;
    while(changed){changed=false;
      for(var i=0;i<m.length&&!changed;i++)for(var j=i+1;j<m.length&&!changed;j++){
        if(m[i][1]>=m[j][0]){
          out.push({ivs:m.map(function(x){return x.slice();}),hi:[i,j],msg:'Overlap: ['+m[i]+'] ∩ ['+m[j]+'] → merge'});
          m[i]=[Math.min(m[i][0],m[j][0]),Math.max(m[i][1],m[j][1])];m.splice(j,1);changed=true;
        }
      }
    }
    out.push({ivs:m,hi:[],done:true,msg:'Done! '+m.length+' merged intervals. O(n²).'});
    return out;
  }

  function buildOpt(ivs){
    var sorted=ivs.slice().sort(function(a,b){return a[0]-b[0];}),out=[];
    out.push({ivs:sorted,hi:[],msg:'Sort by start time → O(n log n).'});
    var res=[sorted[0].slice()];
    for(var i=1;i<sorted.length;i++){
      var last=res[res.length-1];
      if(sorted[i][0]<=last[1]){
        out.push({ivs:res.concat([sorted[i]]),hi:[res.length-1],msg:'Overlap → extend last to '+Math.max(last[1],sorted[i][1])});
        last[1]=Math.max(last[1],sorted[i][1]);
      } else {res.push(sorted[i].slice());out.push({ivs:res.slice(),hi:[res.length-1],msg:'No overlap → add ['+sorted[i]+']'});}
    }
    out.push({ivs:res,hi:[],done:true,msg:'Done! '+res.length+' intervals. O(n log n).'});
    return out;
  }

  function drawIvs(s){
    bg(ui.ctx,ui.W,ui.H);
    var ivs=s?s.ivs:intervals;
    var hi=s?s.hi:[];
    var maxV=20,sc=(ui.W-100)/(maxV),sy=28,rh=30,gap=8;
    // axis
    ui.ctx.strokeStyle='rgba(139,92,246,.18)';ui.ctx.lineWidth=1;
    ui.ctx.beginPath();ui.ctx.moveTo(44,sy+ivs.length*(rh+gap)+4);ui.ctx.lineTo(ui.W-44,sy+ivs.length*(rh+gap)+4);ui.ctx.stroke();
    for(var v=0;v<=maxV;v+=2){
      var ax=44+v*sc;lbl(ui.ctx,v,ax,sy+ivs.length*(rh+gap)+18,'rgba(167,139,250,.3)',8);
    }
    ivs.forEach(function(iv,i){
      var x1=44+iv[0]*sc,x2=44+iv[1]*sc,y=sy+i*(rh+gap);
      var isHi=hi.indexOf(i)>=0;
      ui.ctx.save();
      if(isHi){ui.ctx.shadowColor='rgba(245,158,11,.8)';ui.ctx.shadowBlur=14;}
      var g=ui.ctx.createLinearGradient(x1,y,x1,y+rh);
      g.addColorStop(0,isHi?'#C2410C':'#3730A3');g.addColorStop(1,isHi?'#7C2D12':'#1e1b4b');
      rr(ui.ctx,x1,y,x2-x1,rh,4);ui.ctx.fillStyle=g;ui.ctx.fill();ui.ctx.shadowBlur=0;
      ui.ctx.strokeStyle=isHi?'#FB923C':'#818CF8';ui.ctx.lineWidth=1.8;ui.ctx.stroke();
      ui.ctx.restore();
      lbl(ui.ctx,'['+iv[0]+','+iv[1]+']',(x1+x2)/2,y+rh/2,'#EDE9FE',11);
    });
  }

  var ui=makeProbUI(container,{
    canvasW:700,canvasH:220,
    approaches:[{key:'brute',label:'⚡ Brute O(n²)'},{key:'opt',label:'🚀 Sort+Scan O(n log n)'}],
    buildSteps:function(a){return a==='opt'?buildOpt(intervals):buildBrute(intervals);},
    onStep:function(s){drawIvs(s);},
    onReset:function(){drawIvs(null);}
  });
  drawIvs(null);
}

/* ════════════════════════════════════════════════════════════
   P8 — Number of Islands
════════════════════════════════════════════════════════════ */
function initNumIslands(id){
  var container=document.getElementById(id);if(!container)return;
  var grid=[['1','1','0','0','0'],['1','1','0','1','1'],['0','0','0','1','1'],['0','0','0','0','0'],['1','0','1','0','1']];

  function buildDFS(g){
    var out=[],R=g.length,C=g[0].length;
    var vis=g.map(function(r){return r.map(function(){return false;});});
    var islands=0;
    function dfs(r,c){
      if(r<0||r>=R||c<0||c>=C||vis[r][c]||g[r][c]==='0')return;
      vis[r][c]=true;
      out.push({vis:vis.map(function(row){return row.slice();}),cur:[r,c],islands:islands,msg:'DFS visit ('+r+','+c+'). Island #'+islands});
      [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].forEach(function(n){dfs(n[0],n[1]);});
    }
    for(var r=0;r<R;r++)for(var c=0;c<C;c++){
      if(!vis[r][c]&&g[r][c]==='1'){
        islands++;out.push({vis:vis.map(function(row){return row.slice();}),cur:[r,c],islands:islands,msg:'New island #'+islands+' at ('+r+','+c+')!'});
        dfs(r,c);
      }
    }
    out.push({vis:vis.map(function(row){return row.slice();}),cur:null,islands:islands,done:true,msg:'Total islands = '+islands+'. O(m×n).'});
    return out;
  }

  function buildBFS(g){
    var out=[],R=g.length,C=g[0].length;
    var vis=g.map(function(r){return r.map(function(){return false;});});
    var islands=0;
    for(var r=0;r<R;r++)for(var c=0;c<C;c++){
      if(!vis[r][c]&&g[r][c]==='1'){
        islands++;var q=[[r,c]];vis[r][c]=true;
        out.push({vis:vis.map(function(row){return row.slice();}),cur:[r,c],islands:islands,msg:'BFS island #'+islands+' from ('+r+','+c+')'});
        while(q.length){
          var cell2=q.shift(),cr=cell2[0],cc=cell2[1];
          [[cr-1,cc],[cr+1,cc],[cr,cc-1],[cr,cc+1]].forEach(function(nb){
            var nr=nb[0],nc=nb[1];
            if(nr>=0&&nr<R&&nc>=0&&nc<C&&!vis[nr][nc]&&g[nr][nc]==='1'){
              vis[nr][nc]=true;q.push([nr,nc]);
              out.push({vis:vis.map(function(row){return row.slice();}),cur:[nr,nc],islands:islands,msg:'BFS enqueue ('+nr+','+nc+')'});
            }
          });
        }
      }
    }
    out.push({vis:vis.map(function(row){return row.slice();}),cur:null,islands:islands,done:true,msg:'Total = '+islands+' islands. O(m×n).'});
    return out;
  }

  function draw(s){
    bg(ui.ctx,ui.W,ui.H);
    var R=grid.length,C=grid[0].length;
    var CW=58,CH=42,GAP=4;
    var sx=(ui.W-C*(CW+GAP)+GAP)/2,sy=(ui.H-R*(CH+GAP)+GAP)/2;
    for(var r=0;r<R;r++)for(var c=0;c<C;c++){
      var isLand=grid[r][c]==='1';
      var isVis=s&&s.vis&&s.vis[r][c];
      var isCur=s&&s.cur&&s.cur[0]===r&&s.cur[1]===c;
      var x=sx+c*(CW+GAP),y=sy+r*(CH+GAP);
      ui.ctx.save();
      if(isCur){ui.ctx.shadowColor='rgba(251,146,60,.9)';ui.ctx.shadowBlur=20;}
      else if(isVis&&isLand){ui.ctx.shadowColor='rgba(52,211,153,.4)';ui.ctx.shadowBlur=8;}
      rr(ui.ctx,x,y,CW,CH,5);
      var g=ui.ctx.createLinearGradient(x,y,x,y+CH);
      if(isCur){g.addColorStop(0,'#C2410C');g.addColorStop(1,'#7C2D12');}
      else if(isVis&&isLand){g.addColorStop(0,'#047857');g.addColorStop(1,'#064E3B');}
      else if(isLand){g.addColorStop(0,'#2E1B6B');g.addColorStop(1,'#120930');}
      else{g.addColorStop(0,'#0f172a');g.addColorStop(1,'#020617');}
      ui.ctx.fillStyle=g;ui.ctx.fill();ui.ctx.shadowBlur=0;
      ui.ctx.strokeStyle=isCur?'#FB923C':isVis&&isLand?'#34D399':isLand?'rgba(139,92,246,.5)':'rgba(139,92,246,.12)';
      ui.ctx.lineWidth=1.8;ui.ctx.stroke();
      ui.ctx.restore();
      lbl(ui.ctx,grid[r][c],x+CW/2,y+CH/2,isLand?'#EDE9FE':'rgba(167,139,250,.2)',14);
    }
    if(s&&s.islands!=null){
      lbl(ui.ctx,'Islands: '+s.islands,ui.W-54,22,'#34D399',13);
    }
  }

  var ui=makeProbUI(container,{
    canvasW:700,canvasH:260,
    approaches:[{key:'dfs',label:'🌊 DFS'},{key:'bfs',label:'🌊 BFS'}],
    buildSteps:function(a){return a==='bfs'?buildBFS(grid):buildDFS(grid);},
    onStep:function(s){draw(s);},
    onReset:function(){draw(null);}
  });
  draw(null);
}

/* ════════════════════════════════════════════════════════════
   Recursion Tree Renderer (shared by P9, P11, P12)
════════════════════════════════════════════════════════════ */

function layoutTree(root){
  var xCtr={v:0},maxD={v:0};
  function assign(n){
    maxD.v=Math.max(maxD.v,n.depth);
    if(!n.children.length){n.x=xCtr.v++;}
    else{n.children.forEach(assign);n.x=(n.children[0].x+n.children[n.children.length-1].x)/2;}
  }
  assign(root);
  root.maxDepth=maxD.v;
  return {W:xCtr.v,maxD:maxD.v};
}

function collectNodes(root){
  var all=[],byId={};
  function walk(n){all.push(n);byId[n.id]=n;n.children.forEach(walk);}
  walk(root);return{all:all,byId:byId};
}

function drawRecTree(ctx,cW,cH,root,layout,step){
  bg(ctx,cW,cH);
  if(!root)return;

  var STACK_W=112, TW=cW-STACK_W-8, PAD=18;
  var nodeR=Math.min(22,Math.max(10,(TW-PAD*2)/(layout.W*2.6)));
  var colW=(TW-PAD*2)/layout.W;
  var rowH=Math.min(72,(cH-PAD*2)/(layout.maxD+1));

  function pos(n){return{x:PAD+n.x*colW+colW/2,y:PAD+n.depth*rowH+rowH/2};}

  var nodes=collectNodes(root),all=nodes.all;
  var activeSet=step&&step.active?step.active:{};
  var doneSet=step&&step.done?step.done:{};
  var retVals=step&&step.ret?step.ret:{};
  var cacheSet=step&&step.cache?step.cache:{};
  var leafSet=step&&step.leaf?step.leaf:{};

  // Edges
  all.forEach(function(n){
    n.children.forEach(function(c){
      var p1=pos(n),p2=pos(c);
      var isA=activeSet[c.id]||activeSet[n.id];
      ctx.save();
      ctx.strokeStyle=isA?'rgba(251,146,60,.55)':'rgba(139,92,246,.13)';
      ctx.lineWidth=isA?2.5:1;
      ctx.beginPath();ctx.moveTo(p1.x,p1.y+nodeR);ctx.lineTo(p2.x,p2.y-nodeR);ctx.stroke();
      ctx.restore();
    });
  });

  // Nodes
  all.forEach(function(n){
    var p=pos(n);
    var isA=activeSet[n.id],isDone=doneSet[n.id],isCache=cacheSet[n.id],isLeaf=leafSet[n.id];
    var rv=retVals[n.id];
    ctx.save();
    if(isA){ctx.shadowColor='rgba(251,146,60,.9)';ctx.shadowBlur=20;}
    else if(isLeaf){ctx.shadowColor='rgba(52,211,153,.65)';ctx.shadowBlur=16;}
    else if(isDone){ctx.shadowColor='rgba(52,211,153,.3)';ctx.shadowBlur=6;}
    else if(isCache){ctx.shadowColor='rgba(129,140,248,.65)';ctx.shadowBlur=14;}
    ctx.beginPath();ctx.arc(p.x,p.y,nodeR,0,Math.PI*2);
    var g=ctx.createRadialGradient(p.x,p.y-nodeR*.3,0,p.x,p.y,nodeR);
    if(isA){g.addColorStop(0,'#C2410C');g.addColorStop(1,'#7C2D12');}
    else if(isLeaf){g.addColorStop(0,'#047857');g.addColorStop(1,'#064E3B');}
    else if(isCache){g.addColorStop(0,'#3730A3');g.addColorStop(1,'#1e1b4b');}
    else if(isDone){g.addColorStop(0,'#065F46');g.addColorStop(1,'#052E16');}
    else{g.addColorStop(0,'#2E1B6B');g.addColorStop(1,'#0a051e');}
    ctx.fillStyle=g;ctx.fill();ctx.shadowBlur=0;
    ctx.strokeStyle=isA?'#FB923C':isLeaf?'#34D399':isCache?'#818CF8':isDone?'rgba(52,211,153,.45)':'rgba(139,92,246,.3)';
    ctx.lineWidth=1.8;ctx.stroke();
    var fs=Math.max(7,Math.min(13,nodeR*.72));
    ctx.fillStyle='#EDE9FE';ctx.font='bold '+fs+'px "JetBrains Mono",monospace';
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(n.label,p.x,p.y);
    ctx.shadowBlur=0;
    if(rv!=null){
      ctx.fillStyle=isLeaf||isDone?'#34D399':'#A78BFA';
      ctx.font=Math.max(6,fs-2)+'px "JetBrains Mono",monospace';
      ctx.fillText('='+rv,p.x,p.y+nodeR+9);
    }
    ctx.restore();
  });

  // Stack panel divider
  var SX=TW+12;
  ctx.save();
  ctx.strokeStyle='rgba(139,92,246,.1)';ctx.setLineDash([3,4]);ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(TW+4,12);ctx.lineTo(TW+4,cH-12);ctx.stroke();
  ctx.setLineDash([]);ctx.restore();
  lbl(ctx,'Call Stack',SX+(STACK_W-16)/2,13,'rgba(167,139,250,.4)',8);

  var stack=step&&step.stack?step.stack:[];
  var FH=Math.min(22,Math.floor((cH-36)/Math.max(stack.length,1)));
  var maxV=Math.floor((cH-36)/FH);
  var vis=stack.slice(-maxV);
  if(stack.length>maxV)lbl(ctx,'+'+(stack.length-maxV)+' more',SX+(STACK_W-16)/2,26,'rgba(167,139,250,.3)',7);

  vis.forEach(function(fr,i){
    var fy=cH-16-(i+1)*(FH+2);
    var isTop=i===vis.length-1;
    ctx.save();
    rr(ctx,SX,fy,STACK_W-18,FH,3);
    var fg=ctx.createLinearGradient(SX,fy,SX,fy+FH);
    if(isTop){fg.addColorStop(0,'#C2410C');fg.addColorStop(1,'#7C2D12');ctx.shadowColor='rgba(251,146,60,.5)';ctx.shadowBlur=8;}
    else{fg.addColorStop(0,'#1e1b4b');fg.addColorStop(1,'#0a051e');}
    ctx.fillStyle=fg;ctx.fill();ctx.shadowBlur=0;
    ctx.strokeStyle=isTop?'rgba(251,146,60,.7)':'rgba(139,92,246,.22)';
    ctx.lineWidth=1;ctx.stroke();
    ctx.fillStyle=isTop?'#FDBA74':'rgba(196,181,253,.65)';
    var fs2=Math.min(10,FH*.55);
    ctx.font='bold '+fs2+'px "JetBrains Mono",monospace';ctx.textAlign='center';ctx.textBaseline='middle';
    var fw=STACK_W-18, maxChars=Math.floor(fw/(fs2*.62));
    var frLabel=fr.length>maxChars?fr.slice(0,maxChars-1)+'…':fr;
    ctx.fillText(frLabel,SX+fw/2,fy+FH/2);
    ctx.restore();
  });

  lbl(ctx,'depth: '+stack.length,SX+(STACK_W-16)/2,cH-5,'rgba(167,139,250,.3)',7);
}

/* ════════════════════════════════════════════════════════════
   P9 — Fibonacci (Recursion Tree)
════════════════════════════════════════════════════════════ */
function initFibonacci(id){
  var container=document.getElementById(id);if(!container)return;
  var N=5;
  var root,layout;

  function buildFibTree(n){
    var idC={v:0};
    function make(k,depth){
      var node={id:idC.v++,label:'f('+k+')',k:k,children:[],depth:depth};
      if(k>1)node.children=[make(k-1,depth+1),make(k-2,depth+1)];
      return node;
    }
    return make(n,0);
  }

  function mkSnap(callStack,returned,byId,extra){
    var active={},done={},ret={},stack=[],leaf=extra&&extra.leaf||{},cache=extra&&extra.cache||{};
    callStack.forEach(function(id){active[id]=true;stack.push(byId[id].label);});
    Object.keys(returned).forEach(function(k){done[k]=true;ret[k]=returned[k];});
    return{active:active,done:done,ret:ret,leaf:leaf,cache:cache,stack:stack,
           msg:extra&&extra.msg?extra.msg:''};
  }

  function buildBrute(root){
    var c=collectNodes(root),byId=c.byId;
    var steps=[],returned={},callStack=[];
    function sim(node){
      callStack.push(node.id);
      steps.push(mkSnap(callStack,returned,byId,{msg:'Call '+node.label+' — stack depth '+callStack.length}));
      if(node.k<=1){
        returned[node.id]=node.k;callStack.pop();
        var lf={};lf[node.id]=true;
        steps.push(mkSnap(callStack,returned,byId,{leaf:lf,msg:node.label+' = '+node.k+' (base case)'}));
        return node.k;
      }
      var l=sim(node.children[0]),r=sim(node.children[1]);
      var res=l+r;returned[node.id]=res;callStack.pop();
      steps.push(mkSnap(callStack,returned,byId,{msg:node.label+' = '+l+' + '+r+' = '+res+' → return'}));
      return res;
    }
    sim(root);
    steps.push(mkSnap([],returned,byId,{msg:'✓ f('+N+') = '+returned[root.id]+'. Total calls: '+steps.length+' (O(2ⁿ) — redundant!).'}));
    return steps;
  }

  function buildMemo(root){
    var c=collectNodes(root),byId=c.byId;
    var steps=[],returned={},memo={},callStack=[];
    function sim(node){
      if(memo[node.k]!==undefined){
        returned[node.id]=memo[node.k];
        var ch={};ch[node.id]=true;
        steps.push(mkSnap(callStack,returned,byId,{cache:ch,msg:'f('+node.k+') = '+memo[node.k]+' ✦ cache hit — skip entire subtree!'}));
        return memo[node.k];
      }
      callStack.push(node.id);
      steps.push(mkSnap(callStack,returned,byId,{msg:'Call '+node.label+' — not in cache yet'}));
      if(node.k<=1){
        returned[node.id]=node.k;memo[node.k]=node.k;callStack.pop();
        var lf={};lf[node.id]=true;
        steps.push(mkSnap(callStack,returned,byId,{leaf:lf,msg:node.label+' = '+node.k+' (base case, store in cache)'}));
        return node.k;
      }
      var l=sim(node.children[0]),r=sim(node.children[1]);
      var res=l+r;returned[node.id]=res;memo[node.k]=res;callStack.pop();
      steps.push(mkSnap(callStack,returned,byId,{msg:node.label+' = '+l+'+'+r+' = '+res+' → cached!'}));
      return res;
    }
    sim(root);
    steps.push(mkSnap([],returned,byId,{msg:'✓ f('+N+') = '+returned[root.id]+'. Only '+steps.length+' calls! O(n) with memo.'}));
    return steps;
  }

  function rebuild(a){
    root=buildFibTree(N);layout=layoutTree(root);
    return a==='memo'?buildMemo(root):buildBrute(root);
  }

  var ui=makeProbUI(container,{
    canvasW:740,canvasH:330,
    approaches:[{key:'brute',label:'🌳 Recursion O(2ⁿ)'},{key:'memo',label:'⚡ Memoization O(n)'}],
    inputs:[{id:'n',lbl:'n (1–7):',elem:inp('5','',46)}],
    onInputs:function(v){var n=parseInt(v.n);if(!isNaN(n)&&n>=1&&n<=7)N=n;},
    buildSteps:function(a){return rebuild(a);},
    onStep:function(s){drawRecTree(ui.ctx,ui.W,ui.H,root,layout,s);},
    onReset:function(){rebuild('brute');drawRecTree(ui.ctx,ui.W,ui.H,root,layout,null);}
  });
  rebuild('brute');drawRecTree(ui.ctx,ui.W,ui.H,root,layout,null);
}

/* ════════════════════════════════════════════════════════════
   P10 — House Robber
════════════════════════════════════════════════════════════ */
function initHouseRobber(id){
  var container=document.getElementById(id);if(!container)return;
  var nums=[2,7,3,1,5];
  var curA='dp';

  function buildDP(a){
    var out=[],n=a.length;if(!n)return out;
    var dp=new Array(n).fill(0);dp[0]=a[0];
    out.push({dp:dp.slice(),idx:0,msg:'dp[0] = '+a[0]+' (only house 0 reachable)'});
    if(n>1){dp[1]=Math.max(a[0],a[1]);out.push({dp:dp.slice(),idx:1,msg:'dp[1] = max('+a[0]+','+a[1]+') = '+dp[1]});}
    for(var i=2;i<n;i++){
      dp[i]=Math.max(dp[i-1],dp[i-2]+a[i]);
      out.push({dp:dp.slice(),idx:i,msg:'dp['+i+'] = max(dp['+(i-1)+']='+dp[i-1]+', dp['+(i-2)+']+'+a[i]+'='+(dp[i-2]+a[i])+') = '+dp[i]});
    }
    out.push({dp:dp.slice(),idx:n-1,ans:dp[n-1],msg:'Max loot = $'+dp[n-1]+'. O(n) DP.'});
    return out;
  }

  function buildOpt(a){
    var out=[],n=a.length;if(!n)return out;
    var p2=0,p1=0;
    for(var i=0;i<n;i++){
      var cur=Math.max(p1,p2+a[i]);
      out.push({p2:p2,p1:p1,cur:cur,idx:i,msg:'House '+i+'($'+a[i]+'): max(skip='+p1+', rob='+p2+'+'+a[i]+'='+(p2+a[i])+') = '+cur});
      p2=p1;p1=cur;
    }
    out.push({p2:p2,p1:p1,ans:p1,idx:a.length-1,msg:'Max loot = $'+p1+'. O(n) time, O(1) space!'});
    return out;
  }

  function draw(s){
    bg(ui.ctx,ui.W,ui.H);
    var n=nums.length,CW=Math.min(68,(ui.W-60)/n-6),CH=50;
    var sx=(ui.W-n*(CW+6)+6)/2,sy=22;
    // Houses row
    nums.forEach(function(v,i){
      var st='default';
      if(s){if(i===s.idx)st='active';else if(curA==='dp'&&s.dp&&i<s.idx&&s.dp[i]>0)st='sorted';}
      cell(ui.ctx,sx+i*(CW+6),sy,CW,CH,'$'+v,st);
      lbl(ui.ctx,'H'+i,sx+i*(CW+6)+CW/2,sy+CH+13,'rgba(167,139,250,.4)',8);
    });
    if(curA==='dp'&&s&&s.dp){
      lbl(ui.ctx,'dp[ ] — max loot up to each house:',ui.W/2,sy+CH+30,'rgba(167,139,250,.5)',10);
      s.dp.forEach(function(v,i){
        var isSet=v>0||(s.idx>=i);
        cell(ui.ctx,sx+i*(CW+6),sy+CH+40,CW,34,isSet?'$'+v:'?',isSet?'selected':'default');
      });
      // Arrow from prev cells
      if(s.idx>=2){
        ui.ctx.save();ui.ctx.strokeStyle='rgba(52,211,153,.4)';ui.ctx.lineWidth=1.5;ui.ctx.setLineDash([4,3]);
        ui.ctx.beginPath();
        ui.ctx.moveTo(sx+(s.idx-2)*(CW+6)+CW/2,sy+CH+57);
        ui.ctx.lineTo(sx+s.idx*(CW+6)+CW/2,sy+CH+57);
        ui.ctx.stroke();ui.ctx.setLineDash([]);ui.ctx.restore();
      }
    }
    if(curA==='opt'&&s){
      lbl(ui.ctx,'Rolling variables (O(1) space):',ui.W/2,sy+CH+38,'rgba(167,139,250,.5)',10);
      cell(ui.ctx,ui.W/2-110,sy+CH+52,96,34,'prev: $'+s.p2,'default');
      cell(ui.ctx,ui.W/2+14,sy+CH+52,96,34,'curr: $'+s.p1,'active');
    }
    if(s&&s.ans!=null)lbl(ui.ctx,'Max Loot: $'+s.ans,ui.W/2,ui.H-12,'#34D399',17);
  }

  var ui=makeProbUI(container,{
    canvasW:700,canvasH:238,
    approaches:[{key:'dp',label:'📊 DP Table O(n)'},{key:'opt',label:'🚀 O(1) Space'}],
    inputs:[{id:'h',lbl:'Houses ($):',elem:inp('2,7,3,1,5','',180)}],
    onApproach:function(a){curA=a;},
    onInputs:function(v){
      var p=v.h.split(',').map(function(s){return parseInt(s.trim());}).filter(function(x){return !isNaN(x);});
      if(p.length>=2)nums=p;
    },
    buildSteps:function(a){curA=a;return a==='opt'?buildOpt(nums):buildDP(nums);},
    onStep:function(s){draw(s);},
    onReset:function(){draw(null);}
  });
  draw(null);
}

/* ════════════════════════════════════════════════════════════
   P11 — Subsets (Backtracking Tree)
════════════════════════════════════════════════════════════ */
function initSubsets(id){
  var container=document.getElementById(id);if(!container)return;
  var nums=[1,2,3];
  var root,layout;

  function buildSubsetsTree(a){
    var idC={v:0};
    function make(idx,cur,depth){
      var label=cur.length?'['+cur.join(',')+']':'∅';
      var node={id:idC.v++,label:label,cur:cur.slice(),idx:idx,children:[],depth:depth,isLeaf:idx>=a.length};
      if(!node.isLeaf){
        node.children=[make(idx+1,cur.concat([a[idx]]),depth+1),make(idx+1,cur,depth+1)];
      }
      return node;
    }
    return make(0,[],0);
  }

  function buildSubsetsSteps(root,a){
    var c=collectNodes(root),byId=c.byId;
    var steps=[],callStack=[],done={},leaf={};
    function mkS(msg){
      var active={},dk={},stack=[];
      callStack.forEach(function(id){active[id]=true;stack.push(byId[id].label);});
      Object.keys(done).forEach(function(k){dk[k]=true;});
      return{active:active,done:dk,leaf:Object.assign({},leaf),ret:{},cache:{},stack:stack,msg:msg};
    }
    function sim(node){
      callStack.push(node.id);
      steps.push(mkS(node.isLeaf?'Leaf reached: subset = '+node.label:'At '+node.label+' — try including/excluding element '+(a[node.idx]||'?')));
      if(node.isLeaf){
        done[node.id]=true;leaf[node.id]=true;callStack.pop();
        steps.push(mkS('✓ Add subset '+node.label+' to result'));
        return;
      }
      steps.push(mkS('Include '+a[node.idx]+' → recurse to '+node.children[0].label));
      sim(node.children[0]);
      steps.push(mkS('Backtrack. Exclude '+a[node.idx]+' → recurse to '+node.children[1].label));
      sim(node.children[1]);
      done[node.id]=true;callStack.pop();
    }
    sim(root);
    var dk={};Object.keys(done).forEach(function(k){dk[k]=true;});
    steps.push({active:{},done:dk,leaf:Object.assign({},leaf),ret:{},cache:{},stack:[],
      msg:'All '+Math.pow(2,a.length)+' subsets found!'});
    return steps;
  }

  function rebuild(){
    root=buildSubsetsTree(nums);layout=layoutTree(root);
    return buildSubsetsSteps(root,nums);
  }

  var ui=makeProbUI(container,{
    canvasW:740,canvasH:330,
    inputs:[{id:'a',lbl:'Array (max 4):',elem:inp('1,2,3','',120)}],
    onInputs:function(v){
      var p=v.a.split(',').map(function(s){return parseInt(s.trim());}).filter(function(x){return !isNaN(x);});
      if(p.length>=1&&p.length<=4)nums=p;
    },
    buildSteps:function(){return rebuild();},
    onStep:function(s){drawRecTree(ui.ctx,ui.W,ui.H,root,layout,s);},
    onReset:function(){rebuild();drawRecTree(ui.ctx,ui.W,ui.H,root,layout,null);}
  });
  rebuild();drawRecTree(ui.ctx,ui.W,ui.H,root,layout,null);
}

/* ════════════════════════════════════════════════════════════
   P12 — Permutations (Backtracking Tree)
════════════════════════════════════════════════════════════ */
function initPermutations(id){
  var container=document.getElementById(id);if(!container)return;
  var nums=[1,2,3];
  var root,layout;

  function buildPermTree(a){
    var idC={v:0};
    function make(cur,rem,depth){
      var label=cur.length?'['+cur.join(',')+']':'start';
      var node={id:idC.v++,label:label,cur:cur.slice(),rem:rem.slice(),children:[],depth:depth,isLeaf:rem.length===0};
      if(!node.isLeaf){
        rem.forEach(function(v,i){
          var newRem=rem.slice(0,i).concat(rem.slice(i+1));
          node.children.push(make(cur.concat([v]),newRem,depth+1));
        });
      }
      return node;
    }
    return make([],a,0);
  }

  function buildPermSteps(root,a){
    var c=collectNodes(root),byId=c.byId;
    var steps=[],callStack=[],done={},leaf={};
    function mkS(msg){
      var active={},dk={},stack=[];
      callStack.forEach(function(id){active[id]=true;stack.push(byId[id].label);});
      Object.keys(done).forEach(function(k){dk[k]=true;});
      return{active:active,done:dk,leaf:Object.assign({},leaf),ret:{},cache:{},stack:stack,msg:msg};
    }
    function sim(node){
      callStack.push(node.id);
      steps.push(mkS(node.isLeaf?'Permutation complete: '+node.label:'Built '+node.label+' — remaining: ['+node.rem.join(',')+']'));
      if(node.isLeaf){
        done[node.id]=true;leaf[node.id]=true;callStack.pop();
        steps.push(mkS('✓ Emit permutation '+node.label));
        return;
      }
      node.children.forEach(function(child,i){
        var chosen=child.cur[child.cur.length-1];
        steps.push(mkS('Choose '+chosen+' next (option '+(i+1)+'/'+node.rem.length+') → '+child.label));
        sim(child);
        if(i<node.rem.length-1)steps.push(mkS('Backtrack to '+node.label+' — try next option'));
      });
      done[node.id]=true;callStack.pop();
    }
    sim(root);
    var dk={};Object.keys(done).forEach(function(k){dk[k]=true;});
    var total=1;for(var i=2;i<=a.length;i++)total*=i;
    steps.push({active:{},done:dk,leaf:Object.assign({},leaf),ret:{},cache:{},stack:[],
      msg:'All '+total+' permutations found!'});
    return steps;
  }

  function rebuild(){
    root=buildPermTree(nums);layout=layoutTree(root);
    return buildPermSteps(root,nums);
  }

  var ui=makeProbUI(container,{
    canvasW:740,canvasH:330,
    inputs:[{id:'a',lbl:'Array (max 4):',elem:inp('1,2,3','',120)}],
    onInputs:function(v){
      var p=v.a.split(',').map(function(s){return parseInt(s.trim());}).filter(function(x){return !isNaN(x);});
      if(p.length>=1&&p.length<=4)nums=p;
    },
    buildSteps:function(){return rebuild();},
    onStep:function(s){drawRecTree(ui.ctx,ui.W,ui.H,root,layout,s);},
    onReset:function(){rebuild();drawRecTree(ui.ctx,ui.W,ui.H,root,layout,null);}
  });
  rebuild();drawRecTree(ui.ctx,ui.W,ui.H,root,layout,null);
}

/* ════════════════════════════════════════════════════════════
   P13 — Binary Search
════════════════════════════════════════════════════════════ */
function initBinarySearch(id){
  var container=document.getElementById(id);if(!container)return;
  var arr=[1,3,5,7,9,11,13,15,17,19],target=13;

  function buildLinear(a,t){
    var steps=[];
    for(var i=0;i<a.length;i++){
      var st=a.map(function(_,k){return k===i?'comparing':'default';});
      var hit=a[i]===t;
      steps.push({st:st,msg:'idx '+i+': a['+i+']='+a[i]+(hit?' = '+t+' ✓ FOUND!':'')});
      if(hit){var fs=a.map(function(_,k){return k===i?'found':'default';});steps.push({st:fs,found:i,msg:'Found at idx '+i+' — took '+steps.length+' checks. O(n).'});return steps;}
    }
    steps.push({st:a.map(function(){return'default';}),msg:t+' not found. Scanned all '+a.length+' elements.'});
    return steps;
  }

  function buildBinary(a,t){
    var steps=[],L=0,R=a.length-1;
    steps.push({L:L,R:R,M:-1,st:a.map(function(){return'default';}),msg:'Start: L=0, R='+(a.length-1)});
    while(L<=R){
      var M=Math.floor((L+R)/2);
      var st=a.map(function(_,k){return k===M?'comparing':k<L||k>R?'water':'default';});
      steps.push({L:L,R:R,M:M,st:st,msg:'Mid='+M+': a['+M+']='+a[M]+' vs target='+t});
      if(a[M]===t){
        var fs=a.map(function(_,k){return k===M?'found':k<L||k>R?'water':'default';});
        steps.push({L:L,R:R,M:M,st:fs,found:M,msg:'Found at idx '+M+'! O(log n) — only '+steps.length+' checks.'});
        return steps;
      } else if(a[M]<t){L=M+1;steps.push({L:L,R:R,M:-1,st:a.map(function(_,k){return k<L||k>R?'water':'default';}),msg:a[M]+'<'+t+' → shrink left, L→'+(M+1)});}
      else{R=M-1;steps.push({L:L,R:R,M:-1,st:a.map(function(_,k){return k<L||k>R?'water':'default';}),msg:a[M]+'>'+t+' → shrink right, R→'+(M-1)});}
    }
    steps.push({L:L,R:R,M:-1,st:a.map(function(){return'water';}),msg:t+' not found (L>R).'});
    return steps;
  }

  function draw(s){
    bg(ui.ctx,ui.W,ui.H);
    var n=arr.length,CW=Math.min(54,Math.floor((ui.W-40)/n)-5),CH=50;
    var GAP=5,sx=(ui.W-n*(CW+GAP)+GAP)/2,cy=ui.H/2-CH/2-10;
    arr.forEach(function(v,i){cell(ui.ctx,sx+i*(CW+GAP),cy,CW,CH,v,(s&&s.st)?s.st[i]:'default');});
    arr.forEach(function(_,i){lbl(ui.ctx,i,sx+i*(CW+GAP)+CW/2,cy+CH+14,'rgba(167,139,250,.35)',8);});
    if(s){
      if(s.L>=0&&s.L!=null)arrow(ui.ctx,sx+s.L*(CW+GAP)+CW/2,cy-6,'L','#818CF8');
      if(s.R>=0&&s.R<n&&s.R!=null)arrow(ui.ctx,sx+s.R*(CW+GAP)+CW/2,cy-6,'R','#F472B6');
      if(s.M>=0&&s.M!=null)arrow(ui.ctx,sx+s.M*(CW+GAP)+CW/2,cy-24,'M','#FB923C');
    }
    ui.ctx.save();rr(ui.ctx,ui.W-116,10,106,26,5);
    var tg=ui.ctx.createLinearGradient(ui.W-116,10,ui.W-10,36);tg.addColorStop(0,'#2E1B6B');tg.addColorStop(1,'#120930');
    ui.ctx.fillStyle=tg;ui.ctx.fill();ui.ctx.strokeStyle='rgba(139,92,246,.5)';ui.ctx.lineWidth=1.5;ui.ctx.stroke();
    ui.ctx.fillStyle='#A78BFA';ui.ctx.font='bold 12px "JetBrains Mono",monospace';ui.ctx.textAlign='center';ui.ctx.textBaseline='middle';
    ui.ctx.fillText('target = '+target,ui.W-63,23);ui.ctx.restore();
  }

  var ui=makeProbUI(container,{
    canvasW:700,canvasH:200,
    approaches:[{key:'linear',label:'⚡ Linear O(n)'},{key:'binary',label:'🔍 Binary Search O(log n)'}],
    inputs:[{id:'a',lbl:'Array (sorted):',elem:inp('1,3,5,7,9,11,13,15,17,19','',240)},{id:'t',lbl:'Target:',elem:inp('13','',52)}],
    onInputs:function(v){
      var p=v.a.split(',').map(function(s){return parseInt(s.trim());}).filter(function(x){return !isNaN(x);});
      var t=parseInt(v.t);
      if(p.length>=2&&!isNaN(t)){arr=p.sort(function(a,b){return a-b;});target=t;}
    },
    buildSteps:function(a){return a==='binary'?buildBinary(arr,target):buildLinear(arr,target);},
    onStep:function(s){draw(s);},
    onReset:function(){draw(null);}
  });
  draw(null);
}

/* ════════════════════════════════════════════════════════════
   P14 — Maximum Subarray (Kadane's)
════════════════════════════════════════════════════════════ */
function initMaxSubarray(id){
  var container=document.getElementById(id);if(!container)return;
  var arr=[-2,1,-3,4,-1,2,1,-5,4];

  function buildBrute(a){
    var steps=[],maxS=-Infinity,maxL=0,maxR=0;
    for(var i=0;i<a.length;i++){
      var sum=0;
      for(var j=i;j<a.length;j++){
        sum+=a[j];var prev=maxS;
        if(sum>maxS){maxS=sum;maxL=i;maxR=j;}
        var st=a.map(function(_,k){return k>=i&&k<=j?'active':'default';});
        steps.push({st:st,sum:sum,maxS:maxS,maxL:maxL,maxR:maxR,
          msg:'Sum['+i+'..'+j+']='+sum+(sum>prev?' → new max!':'')+' | best='+maxS});
      }
    }
    steps.push({st:a.map(function(_,k){return k>=maxL&&k<=maxR?'found':'default';}),
      maxS:maxS,msg:'Max subarray ['+maxL+'..'+maxR+'] = '+maxS+'. O(n²).'});
    return steps;
  }

  function buildKadane(a){
    var steps=[],cur=a[0],maxS=a[0],curL=0,maxL=0,maxR=0;
    steps.push({st:a.map(function(_,k){return k===0?'active':'default';}),
      cur:cur,maxS:maxS,curL:0,maxL:0,maxR:0,msg:'Start: cur='+cur+' max='+maxS});
    for(var i=1;i<a.length;i++){
      if(cur+a[i]<a[i]){cur=a[i];curL=i;}else cur+=a[i];
      if(cur>maxS){maxS=cur;maxL=curL;maxR=i;}
      var cL=curL;
      var st=a.map(function(_,k){return k>=cL&&k<=i?'active':k>=maxL&&k<=maxR?'sorted':'default';});
      steps.push({st:st,cur:cur,maxS:maxS,curL:curL,maxL:maxL,maxR:maxR,
        msg:'idx '+i+'('+a[i]+'): extend? cur='+cur+' | maxSoFar='+maxS+'['+maxL+'..'+maxR+']'});
    }
    steps.push({st:a.map(function(_,k){return k>=maxL&&k<=maxR?'found':'default';}),
      cur:cur,maxS:maxS,msg:'Max subarray ['+maxL+'..'+maxR+'] = '+maxS+'. Kadane O(n).'});
    return steps;
  }

  function draw(s){
    bg(ui.ctx,ui.W,ui.H);
    var n=arr.length,CW=Math.min(58,Math.floor((ui.W-40)/n)-5),CH=50;
    var GAP=5,sx=(ui.W-n*(CW+GAP)+GAP)/2,cy=ui.H/2-CH/2-16;
    arr.forEach(function(v,i){cell(ui.ctx,sx+i*(CW+GAP),cy,CW,CH,v,(s&&s.st)?s.st[i]:'default');});
    if(s){
      if(s.cur!=null)lbl(ui.ctx,'cur: '+s.cur,ui.W*.28,ui.H-20,'#FB923C',13);
      if(s.maxS!=null)lbl(ui.ctx,'max: '+s.maxS,ui.W*.72,ui.H-20,'#34D399',13);
    }
  }

  var ui=makeProbUI(container,{
    canvasW:700,canvasH:196,
    approaches:[{key:'brute',label:'⚡ Brute O(n²)'},{key:'kadane',label:'🚀 Kadane O(n)'}],
    inputs:[{id:'a',lbl:'Array:',elem:inp('-2,1,-3,4,-1,2,1,-5,4','',240)}],
    onInputs:function(v){
      var p=v.a.split(',').map(function(s){return parseInt(s.trim());}).filter(function(x){return !isNaN(x);});
      if(p.length>=2)arr=p;
    },
    buildSteps:function(a){return a==='kadane'?buildKadane(arr):buildBrute(arr);},
    onStep:function(s){draw(s);},
    onReset:function(){draw(null);}
  });
  draw(null);
}

/* ════════════════════════════════════════════════════════════
   P15 — 3Sum
════════════════════════════════════════════════════════════ */
function initThreeSum(id){
  var container=document.getElementById(id);if(!container)return;
  var arr=[-4,-1,-1,0,1,2];

  function sorted(a){return a.slice().sort(function(x,y){return x-y;});}

  function buildBrute(a){
    var s=sorted(a),steps=[],results=[];
    for(var i=0;i<s.length-2;i++)for(var j=i+1;j<s.length-1;j++)for(var k=j+1;k<s.length;k++){
      var sum=s[i]+s[j]+s[k],hit=sum===0;
      var st=s.map(function(_,x){return x===i?'comparing':x===j?'active':x===k?'pivot':'default';});
      steps.push({sArr:s,st:st,results:results.slice(),msg:'['+s[i]+','+s[j]+','+s[k]+']='+sum+(hit?' ✓':'')});
      if(hit){var key=s[i]+','+s[j]+','+s[k];if(results.indexOf(key)<0)results.push(key);}
    }
    steps.push({sArr:s,st:s.map(function(){return'default';}),results:results.slice(),msg:'Done. '+results.length+' triplets. O(n³).'});
    return steps;
  }

  function buildTwoPtr(a){
    var s=sorted(a),steps=[],results=[];
    steps.push({sArr:s,i:-1,L:-1,R:-1,results:[],msg:'Sorted → ['+s.join(',')+']'});
    for(var i=0;i<s.length-2;i++){
      if(i>0&&s[i]===s[i-1]){steps.push({sArr:s,i:i,L:-1,R:-1,results:results.slice(),msg:'Skip dup s['+i+']='+s[i]});continue;}
      var L=i+1,R=s.length-1;
      while(L<R){
        var sum=s[i]+s[L]+s[R];
        var st=s.map(function(_,k){return k===i?'comparing':k===L?'active':k===R?'pivot':'default';});
        steps.push({sArr:s,st:st,i:i,L:L,R:R,sum:sum,results:results.slice(),
          msg:'i='+i+'('+s[i]+') L='+L+'('+s[L]+') R='+R+'('+s[R]+') sum='+sum});
        if(sum===0){
          var key=s[i]+','+s[L]+','+s[R];if(results.indexOf(key)<0)results.push(key);
          var rs=s.map(function(_,k){return k===i||k===L||k===R?'found':'default';});
          steps.push({sArr:s,st:rs,i:i,L:L,R:R,results:results.slice(),msg:'✓ Triplet ['+s[i]+','+s[L]+','+s[R]+']'});
          L++;R--;while(L<R&&s[L]===s[L-1])L++;while(L<R&&s[R]===s[R+1])R--;
        } else if(sum<0){L++;}else{R--;}
      }
    }
    steps.push({sArr:s,i:-1,L:-1,R:-1,results:results.slice(),msg:'Done. '+results.length+' triplets. O(n²).'});
    return steps;
  }

  function draw(s){
    bg(ui.ctx,ui.W,ui.H);
    var a=s&&s.sArr?s.sArr:sorted(arr);
    var n=a.length,CW=Math.min(60,Math.floor((ui.W-40)/n)-6),CH=50;
    var GAP=6,sx=(ui.W-n*(CW+GAP)+GAP)/2,cy=ui.H/2-CH/2-20;
    a.forEach(function(v,i){cell(ui.ctx,sx+i*(CW+GAP),cy,CW,CH,v,(s&&s.st)?s.st[i]:'default');});
    a.forEach(function(_,i){lbl(ui.ctx,i,sx+i*(CW+GAP)+CW/2,cy+CH+14,'rgba(167,139,250,.35)',8);});
    if(s){
      if(s.L>=0&&s.L!=null)arrow(ui.ctx,sx+s.L*(CW+GAP)+CW/2,cy-6,'L','#34D399');
      if(s.R>=0&&s.R!=null&&s.R<n)arrow(ui.ctx,sx+s.R*(CW+GAP)+CW/2,cy-6,'R','#F472B6');
      if(s.i>=0&&s.i!=null)arrow(ui.ctx,sx+s.i*(CW+GAP)+CW/2,cy-24,'i','#818CF8');
      if(s.results&&s.results.length){
        lbl(ui.ctx,'Found:',28,ui.H-18,'rgba(167,139,250,.5)',9,'left');
        s.results.slice(0,4).forEach(function(t,ri){lbl(ui.ctx,'['+t+']',80+ri*105,ui.H-18,'#34D399',10,'left');});
      }
    }
  }

  var ui=makeProbUI(container,{
    canvasW:700,canvasH:210,
    approaches:[{key:'brute',label:'⚡ Brute O(n³)'},{key:'twoptr',label:'👆 Two Pointers O(n²)'}],
    inputs:[{id:'a',lbl:'Array:',elem:inp('-4,-1,-1,0,1,2','',210)}],
    onInputs:function(v){
      var p=v.a.split(',').map(function(s){return parseInt(s.trim());}).filter(function(x){return !isNaN(x);});
      if(p.length>=3)arr=p;
    },
    buildSteps:function(a){return a==='twoptr'?buildTwoPtr(arr):buildBrute(arr);},
    onStep:function(s){draw(s);},
    onReset:function(){draw(null);}
  });
  draw(null);
}

/* ════════════════════════════════════════════════════════════
   P16 — Longest Common Subsequence
════════════════════════════════════════════════════════════ */
function initLCS(id){
  var container=document.getElementById(id);if(!container)return;
  var s1='ABCBDAB',s2='BDCAB';

  function buildDP(a,b){
    var m=a.length,n=b.length,dp=[],steps=[];
    for(var i=0;i<=m;i++)dp.push(new Array(n+1).fill(0));
    steps.push({dp:dp.map(function(r){return r.slice();}),r:-1,c:-1,msg:'Init (m+1)×(n+1) table with 0s'});
    for(var i=1;i<=m;i++){
      for(var j=1;j<=n;j++){
        var match=a[i-1]===b[j-1];
        if(match)dp[i][j]=dp[i-1][j-1]+1;
        else dp[i][j]=Math.max(dp[i-1][j],dp[i][j-1]);
        steps.push({dp:dp.map(function(r){return r.slice();}),r:i,c:j,match:match,
          msg:match?'Match "'+a[i-1]+'" → dp['+i+']['+j+']=dp['+(i-1)+']['+(j-1)+']+1='+dp[i][j]:
            'No match ('+a[i-1]+'≠'+b[j-1]+') → max('+dp[i-1][j]+','+dp[i][j-1]+')='+dp[i][j]});
      }
    }
    steps.push({dp:dp.map(function(r){return r.slice();}),r:m,c:n,done:true,
      msg:'LCS length = dp['+m+']['+n+'] = '+dp[m][n]+'. O(m×n).'});
    return steps;
  }

  function draw(s){
    bg(ui.ctx,ui.W,ui.H);
    var a=s1,b=s2,m=a.length,n=b.length;
    var CW=Math.min(44,Math.floor((ui.W-54)/(n+2))-2);
    var CH=Math.min(28,Math.floor((ui.H-44)/(m+2))-2);
    var sx=28,sy=22;
    var dp=s&&s.dp?s.dp:null;
    // Column headers
    for(var j=0;j<=n;j++){
      lbl(ui.ctx,j===0?'':b[j-1],sx+(j+1)*(CW+2)+CW/2,sy+CH/2,j===0?'rgba(139,92,246,.25)':'#C4B5FD',12);
    }
    for(var i=0;i<=m;i++){
      var y=sy+(i+1)*(CH+2);
      lbl(ui.ctx,i===0?'':a[i-1],sx+CW/2,y+CH/2,i===0?'rgba(139,92,246,.25)':'#C4B5FD',12);
      for(var j2=0;j2<=n;j2++){
        var x=sx+(j2+1)*(CW+2),val=dp?dp[i][j2]:0;
        var isA=s&&s.r===i&&s.c===j2;
        var isM=isA&&s.match;
        ctx2(isA,isM,s&&s.done&&val>0,ui.ctx,x,y,CW,CH,val);
      }
    }
    if(s&&s.done&&dp)lbl(ui.ctx,'LCS = '+dp[m][n],ui.W-40,ui.H-14,'#34D399',15);
    function ctx2(isA,isM,filled,ctx,x,y,W,H,val){
      ctx.save();
      if(isA){ctx.shadowColor=isM?'rgba(52,211,153,.8)':'rgba(251,146,60,.7)';ctx.shadowBlur=14;}
      rr(ctx,x,y,W,H,3);
      var g=ctx.createLinearGradient(x,y,x,y+H);
      if(isA&&isM){g.addColorStop(0,'#047857');g.addColorStop(1,'#064E3B');}
      else if(isA){g.addColorStop(0,'#C2410C');g.addColorStop(1,'#7C2D12');}
      else if(filled&&val>0){g.addColorStop(0,'#1e3a5f');g.addColorStop(1,'#0f2040');}
      else{g.addColorStop(0,'#1a1040');g.addColorStop(1,'#0a0520');}
      ctx.fillStyle=g;ctx.fill();ctx.shadowBlur=0;
      ctx.strokeStyle=isA&&isM?'#34D399':isA?'#FB923C':val>0?'rgba(59,130,246,.3)':'rgba(139,92,246,.12)';
      ctx.lineWidth=1.2;ctx.stroke();
      ctx.fillStyle=val>0?'#EDE9FE':'rgba(167,139,250,.25)';
      ctx.font='bold '+(Math.max(8,Math.min(13,W*.45)))+'px "JetBrains Mono",monospace';
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(val,x+W/2,y+H/2);
      ctx.restore();
    }
  }

  var ui=makeProbUI(container,{
    canvasW:700,canvasH:300,
    inputs:[{id:'s1',lbl:'String 1:',elem:inp('ABCBDAB','',150)},{id:'s2',lbl:'String 2:',elem:inp('BDCAB','',120)}],
    onInputs:function(v){
      var a=v.s1.trim().toUpperCase(),b=v.s2.trim().toUpperCase();
      if(a&&b&&a.length<=8&&b.length<=8){s1=a;s2=b;}
    },
    buildSteps:function(){return buildDP(s1,s2);},
    onStep:function(s){draw(s);},
    onReset:function(){draw(null);}
  });
  draw(null);
}

/* ════════════════════════════════════════════════════════════
   P17 — Product of Array Except Self
════════════════════════════════════════════════════════════ */
function initProductExceptSelf(id){
  var container=document.getElementById(id);if(!container)return;
  var arr=[1,2,3,4];

  function buildBrute(a){
    var steps=[],res=new Array(a.length).fill(0);
    for(var i=0;i<a.length;i++){
      var prod=1;
      var st=a.map(function(){return'default';});
      for(var j=0;j<a.length;j++){
        if(j!==i){prod*=a[j];st[j]='comparing';}
      }
      res[i]=prod;
      var rs=st.slice();rs[i]='found';
      steps.push({arr:a,res:res.slice(),cur:i,st:rs,msg:'output['+i+']=product of all except a['+i+']='+a[i]+' → '+prod});
    }
    steps.push({arr:a,res:res.slice(),cur:-1,st:a.map(function(){return'sorted';}),msg:'Output: ['+res.join(',')+'] — O(n²) brute force.'});
    return steps;
  }

  function buildOptimal(a){
    var n=a.length,steps=[];
    var pre=new Array(n).fill(1),suf=new Array(n).fill(1),res=new Array(n).fill(0);
    // Prefix pass
    for(var i=1;i<n;i++){pre[i]=pre[i-1]*a[i-1];}
    steps.push({arr:a,pre:pre.slice(),suf:suf.slice(),res:res.slice(),phase:'prefix',cur:n-1,
      msg:'Prefix pass done: pre[i]=product of everything to the LEFT of i. pre=['+pre.join(',')+']'});
    // Show prefix fill step by step
    var p2=new Array(n).fill(1);
    for(var i=1;i<n;i++){
      p2[i]=p2[i-1]*a[i-1];
      steps.splice(steps.length-1,0,{arr:a,pre:p2.slice(),suf:suf.slice(),res:res.slice(),phase:'prefix',cur:i,
        msg:'pre['+i+']=pre['+(i-1)+']('+p2[i-1]+') × a['+(i-1)+']('+a[i-1]+') = '+p2[i]});
    }
    // Suffix pass
    for(var i=n-2;i>=0;i--){suf[i]=suf[i+1]*a[i+1];}
    steps.push({arr:a,pre:pre.slice(),suf:suf.slice(),res:res.slice(),phase:'suffix',cur:0,
      msg:'Suffix pass done: suf[i]=product of everything to the RIGHT of i. suf=['+suf.join(',')+']'});
    var s2=new Array(n).fill(1);
    for(var i=n-2;i>=0;i--){
      s2[i]=s2[i+1]*a[i+1];
      steps.splice(steps.length-1,0,{arr:a,pre:pre.slice(),suf:s2.slice(),res:res.slice(),phase:'suffix',cur:i,
        msg:'suf['+i+']=suf['+(i+1)+']('+s2[i+1]+') × a['+(i+1)+']('+a[i+1]+') = '+s2[i]});
    }
    // Result
    for(var i=0;i<n;i++){
      res[i]=pre[i]*suf[i];
      steps.push({arr:a,pre:pre.slice(),suf:suf.slice(),res:res.slice(),phase:'result',cur:i,
        msg:'output['+i+']=pre['+i+']('+pre[i]+') × suf['+i+']('+suf[i]+') = '+res[i]});
    }
    steps.push({arr:a,pre:pre.slice(),suf:suf.slice(),res:res.slice(),phase:'done',cur:-1,
      msg:'Output: ['+res.join(',')+'] — O(n) two-pass prefix×suffix!'});
    return steps;
  }

  var curA='brute';
  function draw(s){
    bg(ui.ctx,ui.W,ui.H);
    var n=arr.length,CW=Math.min(62,(ui.W-40)/n-8),CH=42,GAP=8;
    var sx=(ui.W-n*(CW+GAP)+GAP)/2;
    // Input row
    lbl(ui.ctx,'Input:',30,32,'rgba(167,139,250,.5)',10,'left');
    arr.forEach(function(v,i){
      var st=(s&&s.st)?s.st[i]:(s&&s.cur===i)?'active':'default';
      cell(ui.ctx,sx+i*(CW+GAP),14,CW,CH,v,st);
      lbl(ui.ctx,i,sx+i*(CW+GAP)+CW/2,14+CH+12,'rgba(167,139,250,.35)',8);
    });
    // Prefix row (optimal)
    if(s&&s.pre&&(s.phase==='prefix'||s.phase==='suffix'||s.phase==='result'||s.phase==='done')){
      lbl(ui.ctx,'prefix:',30,74,'rgba(167,139,250,.5)',10,'left');
      s.pre.forEach(function(v,i){cell(ui.ctx,sx+i*(CW+GAP),80,CW,34,v,(s.phase==='prefix'&&i===s.cur)?'active':'default');});
    }
    // Suffix row (optimal)
    if(s&&s.suf&&(s.phase==='suffix'||s.phase==='result'||s.phase==='done')){
      lbl(ui.ctx,'suffix:',30,130,'rgba(167,139,250,.5)',10,'left');
      s.suf.forEach(function(v,i){cell(ui.ctx,sx+i*(CW+GAP),136,CW,34,v,(s.phase==='suffix'&&i===s.cur)?'active':'default');});
    }
    // Output row
    if(s&&s.res){
      lbl(ui.ctx,'output:',30,ui.H-56,'rgba(167,139,250,.5)',10,'left');
      s.res.forEach(function(v,i){
        var st=(s.cur===i&&s.phase==='result')?'found':v>0?'sorted':'default';
        cell(ui.ctx,sx+i*(CW+GAP),ui.H-50,CW,34,v||'?',st);
      });
    }
  }

  var ui=makeProbUI(container,{
    canvasW:700,canvasH:230,
    approaches:[{key:'brute',label:'⚡ Brute O(n²)'},{key:'opt',label:'🚀 Prefix×Suffix O(n)'}],
    inputs:[{id:'a',lbl:'Array:',elem:inp('1,2,3,4','',160)}],
    onApproach:function(a){curA=a;},
    onInputs:function(v){
      var p=v.a.split(',').map(function(s){return parseInt(s.trim());}).filter(function(x){return !isNaN(x);});
      if(p.length>=2&&p.length<=8)arr=p;
    },
    buildSteps:function(a){curA=a;return a==='opt'?buildOptimal(arr):buildBrute(arr);},
    onStep:function(s){draw(s);},
    onReset:function(){draw(null);}
  });
  draw(null);
}

/* ════════════════════════════════════════════════════════════
   P18 — Container With Most Water
════════════════════════════════════════════════════════════ */
function initContainerWater(id){
  var container=document.getElementById(id);if(!container)return;
  var heights=[1,8,6,2,5,4,8,3,7];

  function buildBrute(h){
    var steps=[],maxW=0,bestL=0,bestR=h.length-1;
    for(var i=0;i<h.length-1;i++){
      for(var j=i+1;j<h.length;j++){
        var w=Math.min(h[i],h[j])*(j-i);
        if(w>maxW){maxW=w;bestL=i;bestR=j;}
        var st=h.map(function(_,k){return k===i?'comparing':k===j?'active':'default';});
        steps.push({h:h,st:st,L:i,R:j,water:w,maxW:maxW,bestL:bestL,bestR:bestR,
          msg:'['+i+','+j+']: min('+h[i]+','+h[j]+')×'+(j-i)+'='+w+(w>maxW-1?' ← new max!':'')});
      }
    }
    steps.push({h:h,st:h.map(function(_,k){return k===bestL||k===bestR?'found':'default';}),
      L:bestL,R:bestR,maxW:maxW,done:true,msg:'Max water = '+maxW+' between bars '+bestL+' and '+bestR+'. O(n²).'});
    return steps;
  }

  function buildTwoPtr(h){
    var steps=[],L=0,R=h.length-1,maxW=0,bestL=0,bestR=h.length-1;
    steps.push({h:h,L:L,R:R,maxW:0,msg:'Start: L=0, R='+(h.length-1)});
    while(L<R){
      var w=Math.min(h[L],h[R])*(R-L);
      if(w>maxW){maxW=w;bestL=L;bestR=R;}
      var st=h.map(function(_,k){return k===L?'comparing':k===R?'active':'default';});
      steps.push({h:h,st:st,L:L,R:R,water:w,maxW:maxW,bestL:bestL,bestR:bestR,
        msg:'L='+L+'(h='+h[L]+') R='+R+'(h='+h[R]+') water='+w+' maxW='+maxW});
      if(h[L]<=h[R])L++;else R--;
      steps.push({h:h,st:h.map(function(_,k){return k===L||k===R?'active':'default';}),
        L:L,R:R,maxW:maxW,msg:(h[L-1]<=h[R+1]?'h[L]≤h[R] → advance L to '+L:'h[L]>h[R] → retreat R to '+R)});
    }
    steps.push({h:h,st:h.map(function(_,k){return k===bestL||k===bestR?'found':'default';}),
      L:bestL,R:bestR,maxW:maxW,done:true,msg:'Max water = '+maxW+'. O(n) two-pointer!'});
    return steps;
  }

  function draw(s){
    bg(ui.ctx,ui.W,ui.H);
    var h=heights,n=h.length;
    var maxH2=Math.max.apply(null,h)||1;
    var bw=Math.max(28,Math.floor((ui.W-60)/n)-4),maxBH=ui.H-60,baseY=ui.H-30,sx=30+(ui.W-60-n*(bw+4))/2;
    // water fill
    if(s&&s.L>=0&&s.R>=0&&s.water>0){
      var wh=Math.round(Math.min(h[s.L],h[s.R])/maxH2*maxBH);
      var wx=sx+s.L*(bw+4),ww=(s.R-s.L)*(bw+4)+bw;
      ui.ctx.save();ui.ctx.globalAlpha=0.18;ui.ctx.fillStyle='#3B82F6';
      ui.ctx.fillRect(wx,baseY-wh,ww,wh);ui.ctx.globalAlpha=1;ui.ctx.restore();
    }
    h.forEach(function(v,i){
      var bh=Math.max(4,Math.round((v/maxH2)*maxBH));
      var x=sx+i*(bw+4),y=baseY-bh;
      var st=(s&&s.st)?s.st[i]:'default';
      ui.ctx.save();
      var bg2=ui.ctx.createLinearGradient(x,y,x,baseY);
      if(st==='comparing'){bg2.addColorStop(0,'#FB923C');bg2.addColorStop(1,'#7C2D12');ui.ctx.shadowColor='rgba(251,146,60,.7)';ui.ctx.shadowBlur=12;}
      else if(st==='active'){bg2.addColorStop(0,'#C4B5FD');bg2.addColorStop(1,'#2E1B6B');ui.ctx.shadowColor='rgba(196,181,253,.6)';ui.ctx.shadowBlur=12;}
      else if(st==='found'){bg2.addColorStop(0,'#34D399');bg2.addColorStop(1,'#064E3B');ui.ctx.shadowColor='rgba(52,211,153,.7)';ui.ctx.shadowBlur=14;}
      else{bg2.addColorStop(0,'#4C1D95');bg2.addColorStop(1,'#1E1B4B');}
      rr(ui.ctx,x,y,bw,bh,3);ui.ctx.fillStyle=bg2;ui.ctx.fill();ui.ctx.shadowBlur=0;
      ui.ctx.strokeStyle=st==='comparing'?'#FB923C':st==='active'?'#A78BFA':st==='found'?'#34D399':'rgba(139,92,246,.3)';
      ui.ctx.lineWidth=1.5;ui.ctx.stroke();ui.ctx.restore();
      lbl(ui.ctx,v,x+bw/2,y-10,'#EDE9FE',10);
      lbl(ui.ctx,i,x+bw/2,baseY+12,'rgba(167,139,250,.35)',8);
    });
    if(s&&s.maxW!=null){
      ui.ctx.save();rr(ui.ctx,ui.W-148,10,138,26,5);
      var tg=ui.ctx.createLinearGradient(ui.W-148,10,ui.W-10,36);tg.addColorStop(0,'#064E3B');tg.addColorStop(1,'#052E16');
      ui.ctx.fillStyle=tg;ui.ctx.fill();ui.ctx.strokeStyle='rgba(52,211,153,.5)';ui.ctx.lineWidth=1.5;ui.ctx.stroke();
      ui.ctx.fillStyle='#34D399';ui.ctx.font='bold 12px "JetBrains Mono",monospace';ui.ctx.textAlign='center';ui.ctx.textBaseline='middle';
      ui.ctx.fillText('Max Water: '+s.maxW,ui.W-79,23);ui.ctx.restore();
    }
    if(s&&s.L>=0&&s.L!=null){arrow(ui.ctx,sx+s.L*(bw+4)+bw/2,baseY-6-4,'L','#34D399');}
    if(s&&s.R>=0&&s.R<n&&s.R!=null){arrow(ui.ctx,sx+s.R*(bw+4)+bw/2,baseY-6-4,'R','#F472B6');}
  }

  var ui=makeProbUI(container,{
    canvasW:700,canvasH:260,
    approaches:[{key:'brute',label:'⚡ Brute O(n²)'},{key:'twoptr',label:'👆 Two Pointers O(n)'}],
    inputs:[{id:'h',lbl:'Heights:',elem:inp('1,8,6,2,5,4,8,3,7','',260)}],
    onInputs:function(v){
      var p=v.h.split(',').map(function(s){return parseInt(s.trim());}).filter(function(x){return !isNaN(x)&&x>=0;});
      if(p.length>=2&&p.length<=12)heights=p;
    },
    buildSteps:function(a){return a==='twoptr'?buildTwoPtr(heights):buildBrute(heights);},
    onStep:function(s){draw(s);},
    onReset:function(){draw(null);}
  });
  draw(null);
}

/* ════════════════════════════════════════════════════════════
   P19 — Jump Game
════════════════════════════════════════════════════════════ */
function initJumpGame(id){
  var container=document.getElementById(id);if(!container)return;
  var arr=[2,3,1,1,4];

  function buildBrute(a){
    var steps=[],reached=false;
    var vis={};
    function dfs(i){
      if(i>=a.length-1){reached=true;return true;}
      if(vis[i])return false;vis[i]=true;
      for(var j=1;j<=a[i]&&!reached;j++){
        steps.push({arr:a,cur:i,jump:j,target:i+j,msg:'From idx '+i+' (jump='+a[i]+'): try jumping '+j+' → idx '+(i+j)});
        if(dfs(i+j))return true;
      }
      return false;
    }
    dfs(0);
    steps.push({arr:a,done:true,result:reached,msg:(reached?'✓ Can reach end!':'✗ Cannot reach end.')+'  O(2ⁿ) brute DFS.'});
    return steps;
  }

  function buildGreedy(a){
    var steps=[],maxReach=0,n=a.length;
    steps.push({arr:a,cur:0,maxReach:0,msg:'Start: maxReach=0'});
    for(var i=0;i<n&&i<=maxReach;i++){
      var newMax=Math.max(maxReach,i+a[i]);
      var improved=newMax>maxReach;
      maxReach=newMax;
      steps.push({arr:a,cur:i,maxReach:maxReach,msg:'idx '+i+' (jump='+a[i]+'): maxReach=max('+maxReach+','+(i+a[i])+')='+(i+a[i])+(i+a[i]>maxReach-a[i]?' → extended!':'')});
      if(maxReach>=n-1){
        steps.push({arr:a,cur:i,maxReach:maxReach,done:true,result:true,msg:'maxReach('+maxReach+') ≥ last idx('+(n-1)+') → ✓ Can reach end! O(n) greedy.'});
        return steps;
      }
    }
    steps.push({arr:a,cur:maxReach,maxReach:maxReach,done:true,result:false,msg:'Stuck at maxReach='+maxReach+' < '+(n-1)+' → ✗ Cannot reach end. O(n).'});
    return steps;
  }

  var curA='brute';
  function draw(s){
    bg(ui.ctx,ui.W,ui.H);
    var n=arr.length,CW=Math.min(62,Math.floor((ui.W-40)/n)-6),CH=50;
    var GAP=6,sx=(ui.W-n*(CW+GAP)+GAP)/2,cy=ui.H/2-CH/2-16;
    arr.forEach(function(v,i){
      var st='default';
      if(s){
        if(s.done&&s.result&&i===n-1)st='found';
        else if(s.cur===i)st='comparing';
        else if(s.maxReach!=null&&i<=s.maxReach)st='active';
        else if(s.target===i)st='pivot';
      }
      cell(ui.ctx,sx+i*(CW+GAP),cy,CW,CH,v,st);
      lbl(ui.ctx,i,sx+i*(CW+GAP)+CW/2,cy+CH+13,'rgba(167,139,250,.35)',8);
    });
    if(s&&s.maxReach!=null&&curA==='greedy'){
      lbl(ui.ctx,'maxReach: '+s.maxReach,ui.W/2,ui.H-14,'#34D399',14);
    }
    if(s&&s.done){
      lbl(ui.ctx,s.result?'✓ REACHABLE':'✗ BLOCKED',ui.W/2,cy-24,s.result?'#34D399':'#EF4444',16);
    }
  }

  var ui=makeProbUI(container,{
    canvasW:700,canvasH:200,
    approaches:[{key:'brute',label:'⚡ Brute O(2ⁿ)'},{key:'greedy',label:'🚀 Greedy O(n)'}],
    inputs:[{id:'a',lbl:'Jumps:',elem:inp('2,3,1,1,4','',200)}],
    onApproach:function(a){curA=a;},
    onInputs:function(v){
      var p=v.a.split(',').map(function(s){return parseInt(s.trim());}).filter(function(x){return !isNaN(x)&&x>=0;});
      if(p.length>=2&&p.length<=10)arr=p;
    },
    buildSteps:function(a){curA=a;return a==='greedy'?buildGreedy(arr):buildBrute(arr);},
    onStep:function(s){draw(s);},
    onReset:function(){draw(null);}
  });
  draw(null);
}

/* ════════════════════════════════════════════════════════════
   P20 — Combination Sum (Backtracking)
════════════════════════════════════════════════════════════ */
function initCombinationSum(id){
  var container=document.getElementById(id);if(!container)return;
  var cands=[2,3,6,7],target=7;
  var root,layout;

  function buildTree(candidates,t){
    var sorted=candidates.slice().sort(function(a,b){return a-b;});
    var idC={v:0};
    function make(startIdx,cur,rem,depth){
      var label=cur.length?'['+cur.join(',')+']':'start';
      var node={id:idC.v++,label:label,cur:cur.slice(),rem:rem,children:[],depth:depth,
        isLeaf:rem===0,isFail:rem<0||(rem>0&&startIdx>=sorted.length)};
      if(!node.isLeaf&&!node.isFail){
        for(var i=startIdx;i<sorted.length;i++){
          if(sorted[i]<=rem)node.children.push(make(i,cur.concat([sorted[i]]),rem-sorted[i],depth+1));
        }
        if(!node.children.length)node.isFail=true;
      }
      return node;
    }
    return make(0,[],t,0);
  }

  function buildSteps(root,candidates){
    var c=collectNodes(root),byId=c.byId;
    var steps=[],callStack=[],done={},leaf={};
    function mkS(msg){
      var active={},dk={},stack=[];
      callStack.forEach(function(i){active[i]=true;stack.push(byId[i].label);});
      Object.keys(done).forEach(function(k){dk[k]=true;});
      return{active:active,done:dk,leaf:Object.assign({},leaf),ret:{},cache:{},stack:stack,msg:msg};
    }
    function sim(node){
      callStack.push(node.id);
      if(node.isLeaf){
        done[node.id]=true;leaf[node.id]=true;
        steps.push(mkS('✓ Found combination: '+node.label+' sums to target!'));
        callStack.pop();return;
      }
      if(node.isFail&&!node.children.length){
        steps.push(mkS('✗ '+node.label+' (rem='+node.rem+') — no valid candidates. Backtrack.'));
        done[node.id]=true;callStack.pop();return;
      }
      steps.push(mkS('Exploring '+node.label+', remaining='+node.rem+' — try candidates starting from index '+candidates.indexOf(node.cur[node.cur.length-1]||candidates[0])));
      node.children.forEach(function(child,i){
        var c2=child.cur[child.cur.length-1];
        steps.push(mkS('Add '+c2+' → '+child.label+' (rem='+child.rem+')'));
        sim(child);
        if(i<node.children.length-1)steps.push(mkS('Backtrack to '+node.label+' (rem='+node.rem+'), try next candidate'));
      });
      done[node.id]=true;callStack.pop();
    }
    sim(root);
    var dk={};Object.keys(done).forEach(function(k){dk[k]=true;});
    var found=c.all.filter(function(n){return n.isLeaf;}).length;
    steps.push({active:{},done:dk,leaf:Object.assign({},leaf),ret:{},cache:{},stack:[],
      msg:'Done! Found '+found+' combination(s) summing to '+target+'.'});
    return steps;
  }

  function rebuild(){
    root=buildTree(cands,target);layout=layoutTree(root);
    return buildSteps(root,cands);
  }

  var ui=makeProbUI(container,{
    canvasW:740,canvasH:330,
    inputs:[
      {id:'c',lbl:'Candidates:',elem:inp('2,3,6,7','',140)},
      {id:'t',lbl:'Target:',elem:inp('7','',46)}
    ],
    onInputs:function(v){
      var p=v.c.split(',').map(function(s){return parseInt(s.trim());}).filter(function(x){return !isNaN(x)&&x>0;});
      var t=parseInt(v.t);
      if(p.length>=1&&p.length<=5&&!isNaN(t)&&t>0&&t<=20){cands=p;target=t;}
    },
    buildSteps:function(){return rebuild();},
    onStep:function(s){drawRecTree(ui.ctx,ui.W,ui.H,root,layout,s);},
    onReset:function(){rebuild();drawRecTree(ui.ctx,ui.W,ui.H,root,layout,null);}
  });
  rebuild();drawRecTree(ui.ctx,ui.W,ui.H,root,layout,null);
}

/* ════════════════════════════════════════════════════════════
   P21 — Valid Palindrome
════════════════════════════════════════════════════════════ */
function initValidPalindrome(id){
  var container=document.getElementById(id);if(!container)return;
  var str='A man, a plan, Panama';

  function isAN(c){return (c>='a'&&c<='z')||(c>='A'&&c<='Z')||(c>='0'&&c<='9');}

  function buildBrute(s){
    var steps=[],arr=s.split('').filter(isAN).map(function(c){return c.toLowerCase();});
    steps.push({mode:'brute',arr:arr,msg:'Filter to alphanumeric & lowercase: "'+arr.join('')+'"'});
    var rev=arr.slice().reverse();
    steps.push({mode:'brute',arr:arr,rev:rev,msg:'Reverse filtered string: "'+rev.join('')+'"'});
    var ok=arr.join('')===rev.join('');
    steps.push({mode:'brute',arr:arr,rev:rev,done:true,result:ok,
      msg:(ok?'Strings match — PALINDROME ✓':'Mismatch — NOT palindrome ✗')+' — O(n) extra space'});
    return steps;
  }

  function buildTwoPtr(s){
    var steps=[],chars=s.split(''),n=chars.length,L=0,R=n-1;
    steps.push({mode:'twoptr',chars:chars,L:L,R:R,msg:'Two pointers: L=0, R='+(n-1)});
    while(L<R){
      while(L<R&&!isAN(chars[L])){
        steps.push({mode:'twoptr',chars:chars,L:L,R:R,skipL:true,msg:'Skip "'+chars[L]+'" at L='+L+' — not alphanumeric'});
        L++;
      }
      while(L<R&&!isAN(chars[R])){
        steps.push({mode:'twoptr',chars:chars,L:L,R:R,skipR:true,msg:'Skip "'+chars[R]+'" at R='+R+' — not alphanumeric'});
        R--;
      }
      if(L>=R)break;
      var match=chars[L].toLowerCase()===chars[R].toLowerCase();
      steps.push({mode:'twoptr',chars:chars,L:L,R:R,match:match,
        msg:'"'+chars[L]+'" vs "'+chars[R]+'" — '+(match?'match ✓, advance both':'MISMATCH ✗ — not palindrome')});
      if(!match){
        steps.push({mode:'twoptr',chars:chars,L:L,R:R,done:true,result:false,msg:'NOT a palindrome'});
        return steps;
      }
      L++;R--;
    }
    steps.push({mode:'twoptr',chars:chars,done:true,result:true,msg:'All characters matched — PALINDROME ✓  O(1) space'});
    return steps;
  }

  function draw(s){
    bg(ui.ctx,ui.W,ui.H);
    var mode=s&&s.mode;
    if(mode==='brute'&&s.arr){
      var arr=s.arr,n=arr.length;
      var cw=Math.min(28,Math.max(14,Math.floor((ui.W-60)/Math.max(n,1))));
      var gap=2,tw=n*(cw+gap)-gap,sx=(ui.W-tw)/2;
      lbl(ui.ctx,'filtered:',sx,28,'rgba(167,139,250,.4)',9,'left');
      arr.forEach(function(c,i){
        var x=sx+i*(cw+gap),y=38;
        var st=s.done?(s.result?'found':'pivot'):'active';
        var cs2=CS[st];
        rr(ui.ctx,x,y,cw,22,3);
        var g=ui.ctx.createLinearGradient(x,y,x,y+22);g.addColorStop(0,cs2.g0);g.addColorStop(1,cs2.g1);
        ui.ctx.fillStyle=g;ui.ctx.fill();ui.ctx.strokeStyle=cs2.sk;ui.ctx.lineWidth=1.2;ui.ctx.stroke();
        lbl(ui.ctx,c,x+cw/2,y+11,cs2.tx,cw<=16?8:10);
      });
      if(s.rev){
        lbl(ui.ctx,'reversed:',sx,78,'rgba(167,139,250,.4)',9,'left');
        s.rev.forEach(function(c,i){
          var x=sx+i*(cw+gap),y=88;
          var match2=s.result!=null?(c===arr[i]):null;
          var st2=match2===true?'found':match2===false?'pivot':'default';
          var cs3=CS[st2];
          rr(ui.ctx,x,y,cw,22,3);
          var g=ui.ctx.createLinearGradient(x,y,x,y+22);g.addColorStop(0,cs3.g0);g.addColorStop(1,cs3.g1);
          ui.ctx.fillStyle=g;ui.ctx.fill();ui.ctx.strokeStyle=cs3.sk;ui.ctx.lineWidth=1;ui.ctx.stroke();
          lbl(ui.ctx,c,x+cw/2,y+11,cs3.tx,cw<=16?8:10);
        });
      }
    } else {
      var chars=s&&s.chars?s.chars:str.split('');
      var n2=chars.length;
      var cw2=Math.min(26,Math.max(11,Math.floor((ui.W-40)/n2)));
      var gap2=2,tw2=n2*(cw2+gap2)-gap2,sx2=(ui.W-tw2)/2;
      chars.forEach(function(c,i){
        var x=sx2+i*(cw2+gap2),y=50;
        var isL=s&&s.L===i,isR=s&&s.R===i;
        var st='default';
        if(s&&s.done&&s.result)st='found';
        else if(s&&s.done&&!s.result&&(isL||isR))st='pivot';
        else if(isL||isR){st=s.match===false?'pivot':s.match===true?'found':'comparing';}
        else if(s&&!isAN(c)&&!s.done)st='water';
        var cs2=CS[st];
        rr(ui.ctx,x,y,cw2,22,3);
        var g=ui.ctx.createLinearGradient(x,y,x,y+22);g.addColorStop(0,cs2.g0);g.addColorStop(1,cs2.g1);
        ui.ctx.fillStyle=g;ui.ctx.fill();
        ui.ctx.strokeStyle=cs2.sk;ui.ctx.lineWidth=isL||isR?2:1;ui.ctx.stroke();
        lbl(ui.ctx,c===' '?'·':c,x+cw2/2,y+11,cs2.tx,cw2<=13?7:10);
      });
      if(s&&s.L!=null&&s.L<n2){lbl(ui.ctx,'L',sx2+s.L*(cw2+gap2)+cw2/2,80,'#F472B6',10);}
      if(s&&s.R!=null&&s.R>=0&&s.R<n2){lbl(ui.ctx,'R',sx2+s.R*(cw2+gap2)+cw2/2,80,'#34D399',10);}
    }
    if(s&&s.done){
      var res=s.result;
      ui.ctx.save();rr(ui.ctx,ui.W/2-76,ui.H-46,152,26,6);
      ui.ctx.fillStyle=res?'rgba(52,211,153,.1)':'rgba(239,68,68,.1)';ui.ctx.fill();
      ui.ctx.strokeStyle=res?'#34D399':'#EF4444';ui.ctx.lineWidth=1.5;ui.ctx.stroke();
      ui.ctx.fillStyle=res?'#34D399':'#EF4444';
      ui.ctx.font='bold 11px "JetBrains Mono",monospace';
      ui.ctx.textAlign='center';ui.ctx.textBaseline='middle';
      ui.ctx.fillText(res?'PALINDROME ✓':'NOT PALINDROME ✗',ui.W/2,ui.H-33);ui.ctx.restore();
    }
  }

  var ui=makeProbUI(container,{
    canvasW:700,canvasH:200,
    approaches:[{key:'brute',label:'⚡ Brute O(n) space'},{key:'twoptr',label:'👆 Two Pointers O(1)'}],
    inputs:[{id:'s',lbl:'String:',elem:inp('A man, a plan, Panama','',240)}],
    onInputs:function(v){if(v.s&&v.s.length>=1&&v.s.length<=40)str=v.s;},
    buildSteps:function(a){return a==='twoptr'?buildTwoPtr(str):buildBrute(str);},
    onStep:function(s){draw(s);},
    onReset:function(){draw(null);}
  });
  draw(null);
}

/* ════════════════════════════════════════════════════════════
   P22 — Trapping Rain Water
════════════════════════════════════════════════════════════ */
function initTrappingRain(id){
  var container=document.getElementById(id);if(!container)return;
  var heights=[0,1,0,2,1,0,1,3,2,1,2,1];

  function actualWater(h){
    var n=h.length,mL=new Array(n),mR=new Array(n);
    mL[0]=h[0];for(var i=1;i<n;i++)mL[i]=Math.max(mL[i-1],h[i]);
    mR[n-1]=h[n-1];for(var i=n-2;i>=0;i--)mR[i]=Math.max(mR[i+1],h[i]);
    return h.map(function(_,i){return Math.max(0,Math.min(mL[i],mR[i])-h[i]);});
  }

  function buildBrute(h){
    var steps=[],n=h.length,total=0,water=new Array(n).fill(0);
    steps.push({h:h,water:water.slice(),active:-1,total:0,msg:'For each bar: scan left for maxL, scan right for maxR. water[i]=min(maxL,maxR)-h[i].'});
    for(var i=1;i<n-1;i++){
      var mL=0,mR=0;
      for(var j=0;j<=i;j++)mL=Math.max(mL,h[j]);
      for(var j=i;j<n;j++)mR=Math.max(mR,h[j]);
      var w=Math.max(0,Math.min(mL,mR)-h[i]);
      water[i]=w;total+=w;
      steps.push({h:h,water:water.slice(),active:i,maxL:mL,maxR:mR,barWater:w,total:total,
        msg:'Bar '+i+': maxL='+mL+', maxR='+mR+' → water=min('+mL+','+mR+')-'+h[i]+'='+w+'. Total='+total});
    }
    steps.push({h:h,water:water.slice(),active:-1,done:true,total:total,msg:'Total trapped = '+total+'. O(n²) time, O(n) space.'});
    return steps;
  }

  function buildTwoPtr(h){
    var steps=[],n=h.length,L=0,R=n-1,mL=0,mR=0,total=0,water=new Array(n).fill(0);
    steps.push({h:h,water:water.slice(),L:L,R:R,total:0,msg:'L=0, R='+(n-1)+'. Advance the side with smaller max height.'});
    while(L<R){
      if(h[L]<=h[R]){
        if(h[L]>=mL){mL=h[L];steps.push({h:h,water:water.slice(),L:L,R:R,total:total,msg:'h[L='+L+']='+h[L]+'≤h[R='+R+']. New maxL='+mL+'. Advance L.'});}
        else{water[L]=mL-h[L];total+=water[L];steps.push({h:h,water:water.slice(),L:L,R:R,total:total,msg:'h[L='+L+']='+h[L]+'≤h[R='+R+']. Trap '+water[L]+' at '+L+'. Total='+total});}
        L++;
      } else {
        if(h[R]>=mR){mR=h[R];steps.push({h:h,water:water.slice(),L:L,R:R,total:total,msg:'h[R='+R+']='+h[R]+'<h[L='+L+']. New maxR='+mR+'. Retreat R.'});}
        else{water[R]=mR-h[R];total+=water[R];steps.push({h:h,water:water.slice(),L:L,R:R,total:total,msg:'h[R='+R+']='+h[R]+'<h[L='+L+']. Trap '+water[R]+' at '+R+'. Total='+total});}
        R--;
      }
    }
    steps.push({h:h,water:water.slice(),done:true,total:total,msg:'Total trapped = '+total+'. O(n) time, O(1) space!'});
    return steps;
  }

  function draw(s){
    bg(ui.ctx,ui.W,ui.H);
    var h=heights,n=h.length;
    var maxH=Math.max.apply(null,h)||1;
    var bw=Math.max(20,Math.floor((ui.W-60)/n)-5);
    var maxBH=ui.H-72,baseY=ui.H-34,sx=30+(ui.W-60-n*(bw+5))/2;
    var water=s&&s.water?s.water:actualWater(h);

    h.forEach(function(v,i){
      var w=water[i]||0;
      if(w>0){
        var x=sx+i*(bw+5),barH=Math.max(2,Math.round((v/maxH)*maxBH));
        var wH=Math.round((w/maxH)*maxBH);
        ui.ctx.save();ui.ctx.globalAlpha=0.55;
        var wg=ui.ctx.createLinearGradient(x,baseY-barH-wH,x,baseY-barH);
        wg.addColorStop(0,'#60A5FA');wg.addColorStop(1,'#1D4ED8');
        rr(ui.ctx,x,baseY-barH-wH,bw,wH,2);
        ui.ctx.fillStyle=wg;ui.ctx.fill();
        ui.ctx.globalAlpha=0.85;ui.ctx.strokeStyle='rgba(96,165,250,.5)';ui.ctx.lineWidth=1;ui.ctx.stroke();
        ui.ctx.globalAlpha=1;ui.ctx.restore();
        if(w>0)lbl(ui.ctx,'+'+w,x+bw/2,baseY-barH-wH-8,'#93C5FD',8);
      }
    });

    h.forEach(function(v,i){
      if(v===0)return;
      var bh=Math.max(2,Math.round((v/maxH)*maxBH));
      var x=sx+i*(bw+5),y=baseY-bh;
      var isL=s&&s.L===i,isR=s&&s.R===i,isAct=s&&s.active===i;
      var st=s&&s.done?'sorted':isL||isR?'comparing':isAct?'active':'default';
      var cs2=CS[st];
      rr(ui.ctx,x,y,bw,bh,3);
      var g=ui.ctx.createLinearGradient(x,y,x,baseY);g.addColorStop(0,cs2.g0);g.addColorStop(1,cs2.g1);
      ui.ctx.fillStyle=g;ui.ctx.fill();
      if(isL||isR||isAct){ui.ctx.save();ui.ctx.shadowColor=cs2.sk;ui.ctx.shadowBlur=10;}
      ui.ctx.strokeStyle=cs2.sk;ui.ctx.lineWidth=isL||isR?2:1.2;ui.ctx.stroke();
      if(isL||isR||isAct)ui.ctx.restore();
      lbl(ui.ctx,v,x+bw/2,y-9,'#EDE9FE',8);
    });

    h.forEach(function(v,i){
      if(v>0)return;
      lbl(ui.ctx,'0',sx+i*(bw+5)+bw/2,baseY-8,'rgba(167,139,250,.25)',7);
    });

    if(s&&s.L!=null&&s.L>=0&&!s.done)arrow(ui.ctx,sx+s.L*(bw+5)+bw/2,baseY-2,'L','#F472B6');
    if(s&&s.R!=null&&s.R<n&&!s.done)arrow(ui.ctx,sx+s.R*(bw+5)+bw/2,baseY-2,'R','#34D399');

    if(s&&s.total!=null){
      ui.ctx.save();rr(ui.ctx,ui.W-136,8,128,24,5);
      var tg=ui.ctx.createLinearGradient(ui.W-136,8,ui.W-8,32);
      tg.addColorStop(0,'#0f172a');tg.addColorStop(1,'#020617');
      ui.ctx.fillStyle=tg;ui.ctx.fill();
      ui.ctx.strokeStyle='rgba(96,165,250,.45)';ui.ctx.lineWidth=1.5;ui.ctx.stroke();
      ui.ctx.fillStyle='#60A5FA';ui.ctx.font='bold 11px "JetBrains Mono",monospace';
      ui.ctx.textAlign='center';ui.ctx.textBaseline='middle';
      ui.ctx.fillText('Trapped: '+s.total,ui.W-72,20);ui.ctx.restore();
    }
  }

  var ui=makeProbUI(container,{
    canvasW:720,canvasH:290,
    approaches:[{key:'brute',label:'⚡ Brute O(n²)'},{key:'twoptr',label:'👆 Two Pointers O(n)'}],
    inputs:[{id:'h',lbl:'Heights:',elem:inp('0,1,0,2,1,0,1,3,2,1,2,1','',320)}],
    onInputs:function(v){
      var p=v.h.split(',').map(function(s){return parseInt(s.trim());}).filter(function(x){return !isNaN(x)&&x>=0;});
      if(p.length>=2&&p.length<=14)heights=p;
    },
    buildSteps:function(a){return a==='twoptr'?buildTwoPtr(heights):buildBrute(heights);},
    onStep:function(s){draw(s);},
    onReset:function(){draw(null);}
  });
  draw(null);
}

/* ════════════════════════════════════════════════════════════
   P23 — Word Break
════════════════════════════════════════════════════════════ */
function initWordBreak(id){
  var container=document.getElementById(id);if(!container)return;
  var str='leetcode',words=['leet','code'];

  function buildBrute(s,dict){
    var steps=[],memo={};
    function rec(i){
      if(i===s.length){return true;}
      if(memo[i]!==undefined)return memo[i];
      for(var k=0;k<dict.length;k++){
        var w=dict[k];
        if(i+w.length<=s.length&&s.slice(i,i+w.length)===w){
          steps.push({s:s,start:i,end:i+w.length,word:w,memo:Object.assign({},memo),
            msg:'Try "'+w+'" at ['+i+','+(i+w.length)+'): s.slice='+s.slice(i,i+w.length)+(s.slice(i,i+w.length)===w?' ✓':" ✗")});
          if(rec(i+w.length)){memo[i]=true;return true;}
        }
      }
      memo[i]=false;
      steps.push({s:s,start:i,fail:true,memo:Object.assign({},memo),msg:'No word fits at pos '+i+' — backtrack'});
      return false;
    }
    var ok=rec(0);
    steps.push({s:s,done:true,result:ok,memo:memo,
      msg:(ok?'SEGMENTABLE ✓':'CANNOT SEGMENT ✗')+' — O(2^n) worst case without memo'});
    return steps;
  }

  function buildDP(s,dict){
    var steps=[],n=s.length,dp=new Array(n+1).fill(false);
    dp[0]=true;
    steps.push({s:s,dp:dp.slice(),i:0,msg:'dp[0]=true — empty prefix always segmentable'});
    for(var i=1;i<=n;i++){
      for(var k=0;k<dict.length;k++){
        var w=dict[k],j=i-w.length;
        if(j>=0&&dp[j]&&s.slice(j,i)===w){
          dp[i]=true;
          steps.push({s:s,dp:dp.slice(),i:i,j:j,word:w,
            msg:'dp['+i+']=true: dp['+j+']=true and s['+j+'...'+(i-1)+']="'+w+'"'});
          break;
        }
      }
      if(!dp[i])steps.push({s:s,dp:dp.slice(),i:i,msg:'dp['+i+']=false — no word ends here from a reachable index'});
    }
    steps.push({s:s,dp:dp.slice(),done:true,result:dp[n],
      msg:'dp['+n+']='+dp[n]+' → '+(dp[n]?'SEGMENTABLE ✓':'CANNOT SEGMENT ✗')+' — O(n²) DP'});
    return steps;
  }

  function draw(s){
    bg(ui.ctx,ui.W,ui.H);
    var n=str.length;
    var cw=Math.min(48,Math.max(20,Math.floor((ui.W-80)/(n+1))));
    var gap=3,sx=(ui.W-(n*(cw+gap)-gap))/2;
    var srow=40,dprow=110;

    // String row
    lbl(ui.ctx,'s:',sx-20,srow+11,'rgba(167,139,250,.4)',9);
    str.split('').forEach(function(c,i){
      var x=sx+i*(cw+gap);
      var isHit=s&&s.start!=null&&i>=s.start&&i<s.end;
      var isFail=s&&s.fail&&i>=s.start;
      var st=isFail?'pivot':isHit?'active':'default';
      var cs2=CS[st];
      rr(ui.ctx,x,srow,cw,22,3);
      var g=ui.ctx.createLinearGradient(x,srow,x,srow+22);g.addColorStop(0,cs2.g0);g.addColorStop(1,cs2.g1);
      ui.ctx.fillStyle=g;ui.ctx.fill();ui.ctx.strokeStyle=cs2.sk;ui.ctx.lineWidth=isHit?2:1;ui.ctx.stroke();
      lbl(ui.ctx,c,x+cw/2,srow+11,cs2.tx,cw<=24?10:12);
      lbl(ui.ctx,i,x+cw/2,srow+26,'rgba(167,139,250,.3)',8);
    });
    if(s&&s.word){
      lbl(ui.ctx,'word: "'+s.word+'"',sx,srow+36,'rgba(196,181,253,.5)',9,'left');
    }

    // DP row
    if(s&&s.dp){
      lbl(ui.ctx,'dp:',sx-cw/2-gap-18,dprow+11,'rgba(167,139,250,.4)',9);
      for(var i=0;i<=n;i++){
        var x2=sx+(i*(cw+gap))-(cw/2)-gap/2;
        var v=s.dp[i];
        var isCI=s&&s.i===i;
        var isJ=s&&s.j===i;
        var st2=v?(isCI?'found':isJ?'active':'sorted'):(isCI?'pivot':'default');
        var cs3=CS[st2];
        rr(ui.ctx,x2,dprow,cw,22,3);
        var g=ui.ctx.createLinearGradient(x2,dprow,x2,dprow+22);g.addColorStop(0,cs3.g0);g.addColorStop(1,cs3.g1);
        ui.ctx.fillStyle=g;ui.ctx.fill();ui.ctx.strokeStyle=cs3.sk;ui.ctx.lineWidth=isCI||isJ?2:1;ui.ctx.stroke();
        lbl(ui.ctx,v?'T':'F',x2+cw/2,dprow+11,cs3.tx,10);
        lbl(ui.ctx,i,x2+cw/2,dprow+26,'rgba(167,139,250,.3)',8);
      }
    }

    lbl(ui.ctx,'dict: ['+words.map(function(w){return '"'+w+'"';}).join(', ')+']',
      ui.W/2,dprow+46,'rgba(167,139,250,.45)',9);

    if(s&&s.done){
      var res=s.result;
      ui.ctx.save();rr(ui.ctx,ui.W/2-82,ui.H-46,164,26,6);
      ui.ctx.fillStyle=res?'rgba(52,211,153,.1)':'rgba(239,68,68,.1)';ui.ctx.fill();
      ui.ctx.strokeStyle=res?'#34D399':'#EF4444';ui.ctx.lineWidth=1.5;ui.ctx.stroke();
      ui.ctx.fillStyle=res?'#34D399':'#EF4444';
      ui.ctx.font='bold 11px "JetBrains Mono",monospace';
      ui.ctx.textAlign='center';ui.ctx.textBaseline='middle';
      ui.ctx.fillText(res?'SEGMENTABLE ✓':'CANNOT SEGMENT ✗',ui.W/2,ui.H-33);ui.ctx.restore();
    }
  }

  var ui=makeProbUI(container,{
    canvasW:700,canvasH:230,
    approaches:[{key:'brute',label:'⚡ Brute Recursion'},{key:'dp',label:'📊 DP O(n²)'}],
    inputs:[
      {id:'s',lbl:'String:',elem:inp('leetcode','',140)},
      {id:'d',lbl:'Dict:',elem:inp('leet,code','',180)}
    ],
    onInputs:function(v){
      var s2=v.s.trim(),d=v.d.split(',').map(function(w){return w.trim();}).filter(Boolean);
      if(s2.length>=1&&s2.length<=12&&d.length>=1&&d.length<=6){str=s2;words=d;}
    },
    buildSteps:function(a){return a==='dp'?buildDP(str,words):buildBrute(str,words);},
    onStep:function(s){draw(s);},
    onReset:function(){draw(null);}
  });
  draw(null);
}

/* ════════════════════════════════════════════════════════════
   P24 — Find Minimum in Rotated Sorted Array
════════════════════════════════════════════════════════════ */
function initFindMinRotated(id){
  var container=document.getElementById(id);if(!container)return;
  var arr=[3,4,5,1,2];

  function buildLinear(a){
    var steps=[],n=a.length,minV=a[0],minIdx=0;
    steps.push({arr:a,cur:0,minV:minV,minIdx:minIdx,msg:'Linear scan: start with min=a[0]='+minV});
    for(var i=1;i<n;i++){
      var prev=minV;
      if(a[i]<minV){minV=a[i];minIdx=i;}
      steps.push({arr:a,cur:i,minV:minV,minIdx:minIdx,
        msg:'a['+i+']='+a[i]+' — '+(a[i]<prev?'new min='+minV+' at index '+i:'min stays '+minV)});
    }
    steps.push({arr:a,cur:-1,minV:minV,minIdx:minIdx,done:true,
      msg:'Minimum = '+minV+' at index '+minIdx+'. O(n) linear scan.'});
    return steps;
  }

  function buildBinary(a){
    var steps=[],n=a.length,L=0,R=n-1;
    steps.push({arr:a,L:L,R:R,msg:'Binary search: L=0, R='+(n-1)+'. If a[mid]>a[R] the pivot (min) is right of mid.'});
    while(L<R){
      var mid=L+((R-L)>>1);
      var goRight=a[mid]>a[R];
      steps.push({arr:a,L:L,R:R,mid:mid,
        msg:'mid='+mid+': a[mid]='+a[mid]+', a[R]='+a[R]+
          (goRight?' → a[mid]>a[R], min is in [mid+1,R]: L→'+(mid+1):' → a[mid]≤a[R], min is in [L,mid]: R→'+mid)});
      if(goRight)L=mid+1;else R=mid;
    }
    steps.push({arr:a,L:L,R:R,minIdx:L,minV:a[L],done:true,
      msg:'L=R='+L+' → minimum = '+a[L]+'. O(log n)!'});
    return steps;
  }

  function draw(s){
    bg(ui.ctx,ui.W,ui.H);
    var a=arr,n=a.length;
    var cw=Math.min(64,Math.max(38,Math.floor((ui.W-80)/n)));
    var gap=5,tw=n*(cw+gap)-gap,sx=(ui.W-tw)/2,row=56;

    a.forEach(function(v,i){
      var x=sx+i*(cw+gap);
      var isL=s&&s.L===i&&!s.done,isR=s&&s.R===i&&!s.done,isMid=s&&s.mid===i&&!s.done;
      var isDone=s&&s.done&&s.minIdx===i;
      var isCur=s&&s.cur===i;
      var st=isDone?'found':isMid?'active':isL||isR?'comparing':isCur?'active':'default';
      var cs2=CS[st];
      rr(ui.ctx,x,row,cw,36,5);
      var g=ui.ctx.createLinearGradient(x,row,x,row+36);g.addColorStop(0,cs2.g0);g.addColorStop(1,cs2.g1);
      ui.ctx.fillStyle=g;ui.ctx.fill();
      if(isDone||isMid){ui.ctx.save();ui.ctx.shadowColor=cs2.sk;ui.ctx.shadowBlur=14;}
      ui.ctx.strokeStyle=cs2.sk;ui.ctx.lineWidth=isDone||isMid||isL||isR?2:1.2;ui.ctx.stroke();
      if(isDone||isMid)ui.ctx.restore();
      lbl(ui.ctx,v,x+cw/2,row+18,cs2.tx,13);
      lbl(ui.ctx,i,x+cw/2,row+46,'rgba(167,139,250,.35)',8);
    });

    if(s&&!s.done){
      if(s.L!=null)lbl(ui.ctx,'L',sx+s.L*(cw+gap)+cw/2,row+58,'#F472B6',10);
      if(s.R!=null)lbl(ui.ctx,'R',sx+s.R*(cw+gap)+cw/2,row+58,'#34D399',10);
      if(s.mid!=null)lbl(ui.ctx,'mid',sx+s.mid*(cw+gap)+cw/2,row+70,'#C4B5FD',9);
    }

    if(s&&s.done){
      ui.ctx.save();rr(ui.ctx,ui.W/2-100,ui.H-50,200,28,6);
      var tg=ui.ctx.createLinearGradient(ui.W/2-100,ui.H-50,ui.W/2+100,ui.H-22);
      tg.addColorStop(0,'rgba(5,46,26,.8)');tg.addColorStop(1,'rgba(6,46,26,.4)');
      ui.ctx.fillStyle=tg;ui.ctx.fill();
      ui.ctx.strokeStyle='rgba(52,211,153,.6)';ui.ctx.lineWidth=1.5;ui.ctx.stroke();
      ui.ctx.fillStyle='#34D399';ui.ctx.font='bold 12px "JetBrains Mono",monospace';
      ui.ctx.textAlign='center';ui.ctx.textBaseline='middle';
      ui.ctx.fillText('Minimum = '+s.minV+' at index '+s.minIdx,ui.W/2,ui.H-36);ui.ctx.restore();
    }
  }

  var ui=makeProbUI(container,{
    canvasW:680,canvasH:240,
    approaches:[{key:'linear',label:'⚡ Linear O(n)'},{key:'binary',label:'🔍 Binary Search O(log n)'}],
    inputs:[{id:'a',lbl:'Rotated Array:',elem:inp('3,4,5,1,2','',200)}],
    onInputs:function(v){
      var p=v.a.split(',').map(function(s){return parseInt(s.trim());}).filter(function(x){return !isNaN(x);});
      if(p.length>=2&&p.length<=10)arr=p;
    },
    buildSteps:function(a){return a==='binary'?buildBinary(arr):buildLinear(arr);},
    onStep:function(s){draw(s);},
    onReset:function(){draw(null);}
  });
  draw(null);
}

/* ════════════════════════════════════════════════════════════
   P25 — Reverse Linked List
════════════════════════════════════════════════════════════ */
function initReverseLinkedList(id){
  var container=document.getElementById(id);if(!container)return;
  var list=[1,2,3,4,5];

  function buildStack(a){
    var steps=[],stack=[],i;
    steps.push({a:a,stack:[],msg:'Stack approach: push all nodes onto a stack, then pop to build reversed list.'});
    for(i=0;i<a.length;i++){
      stack.push(a[i]);
      steps.push({a:a,stack:stack.slice(),pushIdx:i,msg:'Push a['+i+']='+a[i]+'. Stack: ['+stack.join(',')+'] ← top'});
    }
    var result=[];
    for(i=stack.length-1;i>=0;i--){
      result.push(stack[i]);
      steps.push({a:a,stack:stack.slice(0,i),result:result.slice(),
        msg:'Pop '+stack[i]+'. Result so far: ['+result.join(' → ')+']'});
    }
    steps.push({a:a,result:result.slice(),done:true,msg:'Reversed: ['+result.join(' → ')+']. O(n) extra space for stack.'});
    return steps;
  }

  function buildIterative(a){
    var steps=[],n=a.length,prev=-1,cur=0;
    steps.push({a:a,prev:-1,cur:0,nextNode:a.length>1?1:-1,
      msg:'prev=null, curr=a[0]. Flip curr.next → prev one node at a time.'});
    while(cur<n){
      var nxt=cur+1<n?cur+1:-1;
      steps.push({a:a,prev:prev,cur:cur,nextNode:nxt,
        msg:'curr=a['+cur+']='+a[cur]+': save next='+(nxt>=0?'a['+nxt+']':'null')+
          ', set curr.next=prev='+(prev>=0?'a['+prev+']':'null')+', advance prev→curr, curr→next'});
      prev=cur;cur++;
    }
    var rev=a.slice().reverse();
    steps.push({a:a,result:rev,done:true,msg:'Done! Reversed in O(1) space: ['+rev.join(' → ')+']'});
    return steps;
  }

  var NW=46,NH=32,GAP=30;
  function drawRow(vals,y,hl){
    var n=vals.length,tw=n*(NW+GAP)-GAP,sx=(ui.W-tw)/2;
    vals.forEach(function(v,i){
      var x=sx+i*(NW+GAP);
      var st=hl&&hl[i]?hl[i]:'default';
      var cs2=CS[st];
      rr(ui.ctx,x,y,NW,NH,5);
      var g=ui.ctx.createLinearGradient(x,y,x,y+NH);g.addColorStop(0,cs2.g0);g.addColorStop(1,cs2.g1);
      ui.ctx.fillStyle=g;ui.ctx.fill();
      ui.ctx.strokeStyle=cs2.sk;ui.ctx.lineWidth=1.5;ui.ctx.stroke();
      lbl(ui.ctx,v,x+NW/2,y+NH/2,cs2.tx,12);
      if(i<n-1){
        var ax=x+NW+2,ay=y+NH/2;
        ui.ctx.save();
        var ac=hl&&(hl[i]==='found')?'rgba(52,211,153,.5)':'rgba(139,92,246,.3)';
        ui.ctx.strokeStyle=ac;ui.ctx.lineWidth=1.5;
        ui.ctx.beginPath();ui.ctx.moveTo(ax,ay);ui.ctx.lineTo(ax+GAP-4,ay);ui.ctx.stroke();
        ui.ctx.fillStyle=ac;
        ui.ctx.beginPath();ui.ctx.moveTo(ax+GAP-4,ay-4);ui.ctx.lineTo(ax+GAP,ay);ui.ctx.lineTo(ax+GAP-4,ay+4);ui.ctx.closePath();ui.ctx.fill();
        ui.ctx.restore();
      }
    });
    lbl(ui.ctx,'null',sx+n*(NW+GAP)-GAP/2+4,y+NH/2,'rgba(167,139,250,.3)',9,'left');
  }

  function draw(s){
    bg(ui.ctx,ui.W,ui.H);
    var hl={};
    if(s){
      if(s.done)list.forEach(function(_,i){hl[i]='found';});
      else{
        if(s.prev>=0)hl[s.prev]='active';
        if(s.cur>=0&&s.cur<list.length)hl[s.cur]='comparing';
        if(s.nextNode>=0&&s.nextNode<list.length)hl[s.nextNode]='selected';
        if(s.pushIdx!=null)hl[s.pushIdx]='active';
      }
    }
    drawRow(list,40,s?hl:{});

    // pointer labels (iterative)
    if(s&&!s.done&&s.cur!==undefined&&s.prev!==undefined&&!s.stack){
      var n=list.length,tw=n*(NW+GAP)-GAP,sx=(ui.W-tw)/2;
      if(s.prev>=0)lbl(ui.ctx,'prev',sx+s.prev*(NW+GAP)+NW/2,84,'#C4B5FD',9);
      if(s.cur>=0&&s.cur<n)lbl(ui.ctx,'curr',sx+s.cur*(NW+GAP)+NW/2,84,'#fb923c',9);
      if(s.nextNode>=0&&s.nextNode<n)lbl(ui.ctx,'next',sx+s.nextNode*(NW+GAP)+NW/2,84,'#818cf8',9);
    }

    // stack visualization (brute)
    if(s&&s.stack){
      var stk=s.stack;
      lbl(ui.ctx,'stack',ui.W/2,106,'rgba(167,139,250,.4)',9);
      if(stk.length){
        var ssw=stk.length*42,ssx=ui.W/2-ssw/2+21;
        stk.forEach(function(v,i){
          var x=ssx+i*42-21,y=116;
          rr(ui.ctx,x,y,36,26,4);
          var g=ui.ctx.createLinearGradient(x,y,x,y+26);
          g.addColorStop(0,CS.selected.g0);g.addColorStop(1,CS.selected.g1);
          ui.ctx.fillStyle=g;ui.ctx.fill();ui.ctx.strokeStyle=CS.selected.sk;ui.ctx.lineWidth=1;ui.ctx.stroke();
          lbl(ui.ctx,v,x+18,y+13,CS.selected.tx,10);
        });
        lbl(ui.ctx,'← top',ssx+stk.length*42-21+4,129,'rgba(196,181,253,.35)',9,'left');
      }
    }

    // result row
    if(s&&s.result&&s.result.length){
      var rhl={};s.result.forEach(function(_,i){rhl[i]='found';});
      var ry=s.stack?160:s.done?40:110;
      if(!s.done)lbl(ui.ctx,'result:',ui.W/2,ry-12,'rgba(167,139,250,.4)',9);
      if(s.done)drawRow(s.result,ry,rhl);
      else drawRow(s.result,ry,rhl);
    }
  }

  var ui=makeProbUI(container,{
    canvasW:700,canvasH:240,
    approaches:[{key:'stack',label:'⚡ Stack O(n) space'},{key:'iter',label:'👆 Iterative O(1) space'}],
    inputs:[{id:'l',lbl:'List:',elem:inp('1,2,3,4,5','',160)}],
    onInputs:function(v){
      var p=v.l.split(',').map(function(s){return parseInt(s.trim());}).filter(function(x){return !isNaN(x);});
      if(p.length>=2&&p.length<=7)list=p;
    },
    buildSteps:function(a){return a==='iter'?buildIterative(list):buildStack(list);},
    onStep:function(s){draw(s);},
    onReset:function(){draw(null);}
  });
  draw(null);
}

/* ════════════════════════════════════════════════════════════
   P26 — Spiral Matrix
════════════════════════════════════════════════════════════ */
function initSpiralMatrix(id){
  var container=document.getElementById(id);if(!container)return;
  var matrix=[[1,2,3],[4,5,6],[7,8,9]];

  function buildSteps(m){
    var steps=[],result=[],top=0,bottom=m.length-1,left=0,right=m[0].length-1,c,r;
    steps.push({m:m,result:[],top:top,bottom:bottom,left:left,right:right,active:null,
      msg:'4 boundaries: top='+top+' bottom='+bottom+' left='+left+' right='+right+'. Traverse each edge, shrink.'});
    while(top<=bottom&&left<=right){
      for(c=left;c<=right;c++){
        result.push(m[top][c]);
        steps.push({m:m,result:result.slice(),top:top,bottom:bottom,left:left,right:right,active:[top,c],
          msg:'→ m['+top+']['+c+']='+m[top][c]+'. Output: ['+result.join(',')+']'});
      }
      top++;
      for(r=top;r<=bottom;r++){
        result.push(m[r][right]);
        steps.push({m:m,result:result.slice(),top:top,bottom:bottom,left:left,right:right,active:[r,right],
          msg:'↓ m['+r+']['+right+']='+m[r][right]+'. Output: ['+result.join(',')+']'});
      }
      right--;
      if(top<=bottom){
        for(c=right;c>=left;c--){
          result.push(m[bottom][c]);
          steps.push({m:m,result:result.slice(),top:top,bottom:bottom,left:left,right:right,active:[bottom,c],
            msg:'← m['+bottom+']['+c+']='+m[bottom][c]+'. Output: ['+result.join(',')+']'});
        }
        bottom--;
      }
      if(left<=right){
        for(r=bottom;r>=top;r--){
          result.push(m[r][left]);
          steps.push({m:m,result:result.slice(),top:top,bottom:bottom,left:left,right:right,active:[r,left],
            msg:'↑ m['+r+']['+left+']='+m[r][left]+'. Output: ['+result.join(',')+']'});
        }
        left++;
      }
    }
    steps.push({m:m,result:result,done:true,msg:'Spiral order: ['+result.join(', ')+']. O(m×n) time.'});
    return steps;
  }

  function draw(s){
    bg(ui.ctx,ui.W,ui.H);
    var m=matrix,rows=m.length,cols=m[0].length;
    var CS2=Math.min(50,Math.floor(Math.min((ui.W-80)/cols,(ui.H-100)/rows)));
    var gap=4,gridW=cols*(CS2+gap)-gap,gridH=rows*(CS2+gap)-gap;
    var sx=(ui.W-gridW)/2,sy=Math.max(14,(ui.H-gridH-60)/2);

    // boundary rect
    if(s&&!s.done&&s.top!=null){
      var bx=sx+s.left*(CS2+gap)-2,by=sy+s.top*(CS2+gap)-2;
      var bw2=(s.right-s.left+1)*(CS2+gap)+2,bh2=(s.bottom-s.top+1)*(CS2+gap)+2;
      if(bw2>0&&bh2>0){
        ui.ctx.save();ui.ctx.strokeStyle='rgba(139,92,246,.25)';ui.ctx.lineWidth=1.5;
        ui.ctx.setLineDash([4,3]);rr(ui.ctx,bx,by,bw2,bh2,4);ui.ctx.stroke();
        ui.ctx.setLineDash([]);ui.ctx.restore();
      }
    }

    m.forEach(function(row,r){
      row.forEach(function(v,c){
        var x=sx+c*(CS2+gap),y=sy+r*(CS2+gap);
        var isActive=s&&s.active&&s.active[0]===r&&s.active[1]===c;
        var inResult=s&&s.result&&s.result.indexOf(v)>=0;
        var isDone=s&&s.done;
        var st=isDone?'found':isActive?'comparing':inResult?'sorted':'default';
        var cs2=CS[st];
        rr(ui.ctx,x,y,CS2,CS2,5);
        var g=ui.ctx.createLinearGradient(x,y,x,y+CS2);g.addColorStop(0,cs2.g0);g.addColorStop(1,cs2.g1);
        ui.ctx.fillStyle=g;ui.ctx.fill();
        if(isActive){ui.ctx.save();ui.ctx.shadowColor=cs2.sk;ui.ctx.shadowBlur=12;}
        ui.ctx.strokeStyle=cs2.sk;ui.ctx.lineWidth=isActive?2:1;ui.ctx.stroke();
        if(isActive)ui.ctx.restore();
        lbl(ui.ctx,v,x+CS2/2,y+CS2/2,cs2.tx,CS2<=36?9:11);
      });
    });

    if(s&&s.result&&s.result.length){
      var res=s.result,rsw=Math.min(34,Math.max(20,Math.floor((ui.W-40)/res.length))),rsx=(ui.W-(res.length*(rsw+2)-2))/2;
      lbl(ui.ctx,'output:',rsx-4,sy+gridH+18,'rgba(167,139,250,.4)',9,'right');
      res.forEach(function(v,i){
        var x=rsx+i*(rsw+2),y=sy+gridH+24;
        var cs2=s.done?CS.found:CS.sorted;
        rr(ui.ctx,x,y,rsw,20,3);
        var g=ui.ctx.createLinearGradient(x,y,x,y+20);g.addColorStop(0,cs2.g0);g.addColorStop(1,cs2.g1);
        ui.ctx.fillStyle=g;ui.ctx.fill();ui.ctx.strokeStyle=cs2.sk;ui.ctx.lineWidth=1;ui.ctx.stroke();
        lbl(ui.ctx,v,x+rsw/2,y+10,cs2.tx,rsw<=24?8:9);
      });
    }
  }

  var ui=makeProbUI(container,{
    canvasW:680,canvasH:290,
    inputs:[{id:'m',lbl:'Matrix (rows sep by ;):',elem:inp('1,2,3;4,5,6;7,8,9','',240)}],
    onInputs:function(v){
      try{
        var rows=v.m.split(';').map(function(r){return r.split(',').map(function(x){return parseInt(x.trim());});});
        if(rows.length>=2&&rows.length<=4&&rows[0].length>=2&&rows[0].length<=5&&
           rows.every(function(r){return r.length===rows[0].length&&r.every(function(x){return !isNaN(x);});}))
          matrix=rows;
      }catch(e){}
    },
    buildSteps:function(){return buildSteps(matrix);},
    onStep:function(s){draw(s);},
    onReset:function(){draw(null);}
  });
  draw(null);
}

/* ════════════════════════════════════════════════════════════
   P27 — Top K Frequent Elements
════════════════════════════════════════════════════════════ */
function initTopKFrequent(id){
  var container=document.getElementById(id);if(!container)return;
  var nums=[1,1,1,2,2,3],k=2;

  function countFreq(a){
    var f={};a.forEach(function(v){f[v]=(f[v]||0)+1;});return f;
  }

  function buildSort(a,k2){
    var steps=[],freq={};
    steps.push({a:a,freq:{},msg:'Count each element\'s frequency, then sort by count descending.'});
    a.forEach(function(v){
      freq[v]=(freq[v]||0)+1;
      steps.push({a:a,freq:Object.assign({},freq),cur:v,msg:'freq['+v+']='+freq[v]});
    });
    var pairs=Object.keys(freq).map(function(k3){return [parseInt(k3),freq[k3]];});
    pairs.sort(function(x,y){return y[1]-x[1];});
    steps.push({a:a,freq:freq,pairs:pairs,sorted:true,
      msg:'Sorted by freq desc: '+pairs.map(function(p){return p[0]+'(×'+p[1]+')'}).join(', ')+'. O(n log n).'});
    var result=pairs.slice(0,k2).map(function(p){return p[0];});
    steps.push({a:a,freq:freq,result:result,done:true,msg:'Top '+k2+' frequent: ['+result.join(', ')+']. O(n log n).'});
    return steps;
  }

  function buildBucket(a,k2){
    var steps=[],freq=countFreq(a);
    steps.push({a:a,freq:Object.assign({},freq),msg:'Frequencies counted. Use bucket sort — buckets[i] holds elements with frequency i.'});
    var n=a.length,buckets=[];
    for(var i=0;i<=n;i++)buckets.push([]);
    Object.keys(freq).forEach(function(v){buckets[freq[v]].push(parseInt(v));});
    steps.push({a:a,freq:freq,buckets:buckets.map(function(b){return b.slice();}),
      msg:'Filled buckets: '+Object.keys(freq).map(function(v){return 'bucket['+freq[v]+']='+v;}).join(', ')+'.'});
    var result=[];
    for(var i=n;i>=0&&result.length<k2;i--){
      buckets[i].forEach(function(v){if(result.length<k2)result.push(v);});
    }
    steps.push({a:a,freq:freq,buckets:buckets.map(function(b){return b.slice();}),result:result,done:true,
      msg:'Top '+k2+' frequent: ['+result.join(', ')+']. O(n) bucket sort!'});
    return steps;
  }

  function draw(s){
    bg(ui.ctx,ui.W,ui.H);
    var freq=s&&s.freq?s.freq:countFreq(nums);
    var keys=Object.keys(freq).map(Number).sort(function(a2,b2){return a2-b2;});
    if(!keys.length)return;
    var maxF=Math.max.apply(null,keys.map(function(k3){return freq[k3];}));
    var nk=keys.length,bw=Math.min(64,Math.floor((ui.W-80)/nk));
    var maxBH=90,baseY=130,sx=(ui.W-nk*(bw+10))/2;

    lbl(ui.ctx,'frequency count:',ui.W/2,26,'rgba(167,139,250,.4)',9);
    keys.forEach(function(v,i){
      var f=freq[v]||0;
      var bh=Math.max(4,Math.round((f/maxF)*maxBH));
      var x=sx+i*(bw+10),y=baseY-bh;
      var isDone=s&&s.done&&s.result&&s.result.indexOf(v)>=0;
      var isCur=s&&s.cur===v;
      var st=isDone?'found':isCur?'comparing':'active';
      rr(ui.ctx,x,y,bw,bh,3);
      var g=ui.ctx.createLinearGradient(x,y,x,baseY);g.addColorStop(0,CS[st].g0);g.addColorStop(1,CS[st].g1);
      ui.ctx.fillStyle=g;ui.ctx.fill();
      if(isDone||isCur){ui.ctx.save();ui.ctx.shadowColor=CS[st].sk;ui.ctx.shadowBlur=10;}
      ui.ctx.strokeStyle=CS[st].sk;ui.ctx.lineWidth=1.2;ui.ctx.stroke();
      if(isDone||isCur)ui.ctx.restore();
      lbl(ui.ctx,'×'+f,x+bw/2,y-10,CS[st].tx,9);
      lbl(ui.ctx,v,x+bw/2,baseY+12,'rgba(167,139,250,.7)',11);
    });

    // Bucket display
    if(s&&s.buckets){
      lbl(ui.ctx,'bucket sort (index = frequency):',ui.W/2,baseY+32,'rgba(167,139,250,.4)',9);
      var bkts=s.buckets,bx=30,by=baseY+48;
      bkts.forEach(function(b,i){
        if(!b.length)return;
        lbl(ui.ctx,'['+i+']:',bx,by+11,'rgba(167,139,250,.5)',9,'left');
        b.forEach(function(v,j){
          var x=bx+36+j*30,isDone=s.result&&s.result.indexOf(v)>=0;
          var cs2=isDone?CS.found:CS.sorted;
          rr(ui.ctx,x,by,26,22,3);
          var g=ui.ctx.createLinearGradient(x,by,x,by+22);g.addColorStop(0,cs2.g0);g.addColorStop(1,cs2.g1);
          ui.ctx.fillStyle=g;ui.ctx.fill();ui.ctx.strokeStyle=cs2.sk;ui.ctx.lineWidth=1;ui.ctx.stroke();
          lbl(ui.ctx,v,x+13,by+11,cs2.tx,9);
        });
        bx+=b.length*30+70;
      });
    }

    if(s&&s.result&&s.result.length){
      lbl(ui.ctx,'top '+k+': ['+s.result.join(', ')+']',ui.W/2,ui.H-26,s.done?'#34D399':'rgba(196,181,253,.7)',11);
    }
  }

  var ui=makeProbUI(container,{
    canvasW:700,canvasH:270,
    approaches:[{key:'sort',label:'⚡ Sort O(n log n)'},{key:'bucket',label:'🪣 Bucket Sort O(n)'}],
    inputs:[
      {id:'n',lbl:'nums:',elem:inp('1,1,1,2,2,3','',180)},
      {id:'k',lbl:'k:',elem:inp('2','',36)}
    ],
    onInputs:function(v){
      var p=v.n.split(',').map(function(s){return parseInt(s.trim());}).filter(function(x){return !isNaN(x);});
      var k2=parseInt(v.k);
      if(p.length>=1&&p.length<=12&&!isNaN(k2)&&k2>=1&&k2<=p.length){nums=p;k=k2;}
    },
    buildSteps:function(a){return a==='bucket'?buildBucket(nums,k):buildSort(nums,k);},
    onStep:function(s){draw(s);},
    onReset:function(){draw(null);}
  });
  draw(null);
}

/* ════════════════════════════════════════════════════════════
   P28 — Longest Palindromic Substring
════════════════════════════════════════════════════════════ */
function initLongestPalindrome(id){
  var container=document.getElementById(id);if(!container)return;
  var str='babad';

  function buildBrute(s){
    var steps=[],best='',bestL=0,bestR=-1;
    steps.push({s:s,L:-1,R:-1,best:'',msg:'Brute: check every substring. O(n³) — n² substrings, each checked in O(n).'});
    for(var i=0;i<s.length;i++){
      for(var j=i;j<s.length;j++){
        var sub=s.slice(i,j+1);
        var isPalin=sub===sub.split('').reverse().join('');
        var isNew=isPalin&&sub.length>best.length;
        if(isNew){best=sub;bestL=i;bestR=j;}
        steps.push({s:s,L:i,R:j,sub:sub,isPalin:isPalin,best:best,bestL:bestL,bestR:bestR,
          msg:'"'+sub+'" — '+(isPalin?'palindrome ✓'+(isNew?' ← new best!':''):'not palindrome')});
      }
    }
    steps.push({s:s,bestL:bestL,bestR:bestR,best:best,done:true,
      msg:'Longest palindromic substring: "'+best+'" (pos '+bestL+'..'+bestR+')'});
    return steps;
  }

  function expand(s,l,r){while(l>=0&&r<s.length&&s[l]===s[r]){l--;r++;}return[l+1,r-1];}

  function buildExpand(s){
    var steps=[],best='',bestL=0,bestR=-1;
    steps.push({s:s,msg:'Expand around center: each char (odd) + each gap (even). 2n-1 centers total.'});
    for(var i=0;i<s.length;i++){
      var res=expand(s,i,i);
      var sub=s.slice(res[0],res[1]+1);
      var isNew=sub.length>best.length;
      if(isNew){best=sub;bestL=res[0];bestR=res[1];}
      steps.push({s:s,center:i,L:res[0],R:res[1],sub:sub,best:best,bestL:bestL,bestR:bestR,
        msg:'Odd center i='+i+' ("'+s[i]+'"): expand → "'+sub+'"'+(isNew?' ← new best!':'')});
      if(i+1<s.length){
        res=expand(s,i,i+1);
        sub=res[1]>=res[0]?s.slice(res[0],res[1]+1):'';
        isNew=sub.length>best.length;
        if(isNew){best=sub;bestL=res[0];bestR=res[1];}
        steps.push({s:s,gapL:i,gapR:i+1,L:res[0],R:res[1],sub:sub,best:best,bestL:bestL,bestR:bestR,
          msg:'Even gap ['+i+','+(i+1)+']: s['+i+']='+s[i]+', s['+(i+1)+']='+s[i+1]+
            (s[i]===s[i+1]?' match → expand "'+sub+'"'+(isNew?' ← new best!':'')
            :' no match → skip')});
      }
    }
    steps.push({s:s,bestL:bestL,bestR:bestR,best:best,done:true,
      msg:'Longest palindrome: "'+best+'". O(n²) time, O(1) space!'});
    return steps;
  }

  function draw(s){
    bg(ui.ctx,ui.W,ui.H);
    var n=str.length;
    var CW=Math.min(54,Math.max(28,Math.floor((ui.W-80)/n)));
    var gap=4,tw=n*(CW+gap)-gap,sx=(ui.W-tw)/2,row=68;

    str.split('').forEach(function(c,i){
      var x=sx+i*(CW+gap);
      var inWin=s&&s.L!=null&&s.R!=null&&i>=s.L&&i<=s.R&&s.L<=s.R;
      var inBest=s&&s.bestL!=null&&s.bestR!=null&&i>=s.bestL&&i<=s.bestR;
      var isDone=s&&s.done;
      var st='default';
      if(isDone&&inBest)st='found';
      else if(inWin)st='comparing';
      else if(inBest)st='sorted';
      var cs2=CS[st];
      rr(ui.ctx,x,row,CW,38,5);
      var g=ui.ctx.createLinearGradient(x,row,x,row+38);g.addColorStop(0,cs2.g0);g.addColorStop(1,cs2.g1);
      ui.ctx.fillStyle=g;ui.ctx.fill();
      if(inWin||(isDone&&inBest)){ui.ctx.save();ui.ctx.shadowColor=cs2.sk;ui.ctx.shadowBlur=12;}
      ui.ctx.strokeStyle=cs2.sk;ui.ctx.lineWidth=inWin||(isDone&&inBest)?2:1.2;ui.ctx.stroke();
      if(inWin||(isDone&&inBest))ui.ctx.restore();
      lbl(ui.ctx,c,x+CW/2,row+19,cs2.tx,14);
      lbl(ui.ctx,i,x+CW/2,row+50,'rgba(167,139,250,.35)',8);
    });

    // center marker (expand mode)
    if(s&&s.center!=null&&s.center>=0&&!s.done){
      var cx=sx+s.center*(CW+gap)+CW/2;
      ui.ctx.save();ui.ctx.strokeStyle='rgba(196,181,253,.4)';ui.ctx.lineWidth=1;
      ui.ctx.setLineDash([3,3]);
      ui.ctx.beginPath();ui.ctx.moveTo(cx,row-4);ui.ctx.lineTo(cx,row+38+4);ui.ctx.stroke();
      ui.ctx.setLineDash([]);ui.ctx.restore();
      lbl(ui.ctx,'center',cx,row+60,'rgba(196,181,253,.45)',8);
    }
    // gap marker (even)
    if(s&&s.gapL!=null&&!s.done){
      var glx=sx+s.gapL*(CW+gap)+CW+gap/2;
      ui.ctx.save();ui.ctx.strokeStyle='rgba(139,92,246,.35)';ui.ctx.lineWidth=1.5;
      ui.ctx.setLineDash([3,3]);
      ui.ctx.beginPath();ui.ctx.moveTo(glx,row-4);ui.ctx.lineTo(glx,row+38+4);ui.ctx.stroke();
      ui.ctx.setLineDash([]);ui.ctx.restore();
      lbl(ui.ctx,'gap',glx,row+60,'rgba(167,139,250,.4)',8);
    }

    if(s&&s.best!==undefined){
      lbl(ui.ctx,'best: "'+s.best+'"',ui.W/2,ui.H-28,s.done?'#34D399':'rgba(196,181,253,.65)',11);
    }
  }

  var ui=makeProbUI(container,{
    canvasW:680,canvasH:240,
    approaches:[{key:'brute',label:'⚡ Brute O(n³)'},{key:'expand',label:'🔄 Expand Centers O(n²)'}],
    inputs:[{id:'s',lbl:'String:',elem:inp('babad','',140)}],
    onInputs:function(v){if(v.s&&v.s.length>=1&&v.s.length<=12)str=v.s;},
    buildSteps:function(a){return a==='expand'?buildExpand(str):buildBrute(str);},
    onStep:function(s){draw(s);},
    onReset:function(){draw(null);}
  });
  draw(null);
}

/* ════════════════════════════════════════════════════════════
   P29 — Maximum Depth of Binary Tree
════════════════════════════════════════════════════════════ */
function initMaxDepthTree(id){
  var container=document.getElementById(id);if(!container)return;
  var treeArr=[3,9,20,null,null,15,7];

  function mkTree(arr){
    if(!arr||!arr.length||arr[0]==null)return null;
    var nodes=arr.map(function(v){return v!=null?{val:v,left:null,right:null,depth:0,xPos:0}:null;});
    for(var i=0;i<nodes.length;i++){
      if(!nodes[i])continue;
      var l=2*i+1,r2=2*i+2;
      if(l<nodes.length)nodes[i].left=nodes[l]||null;
      if(r2<nodes.length)nodes[i].right=nodes[r2]||null;
    }
    function setD(n,d){if(!n)return;n.depth=d;setD(n.left,d+1);setD(n.right,d+1);}
    setD(nodes[0],0);
    var cnt=[0];
    function ino(n){if(!n)return;ino(n.left);n.xPos=cnt[0]++;ino(n.right);}
    ino(nodes[0]);
    return nodes[0];
  }

  function collectAll(n,out){if(!n)return;out.push(n);collectAll(n.left,out);collectAll(n.right,out);}

  function buildBFS(r){
    var steps=[],visited={},queue=[{node:r,dep:1}];
    steps.push({hl:{},dep:0,msg:'BFS: process level by level, count the levels.'});
    while(queue.length){
      var sz=queue.length,d=queue[0].dep,lvl=[];
      for(var i=0;i<sz;i++){
        var item=queue.shift();
        lvl.push(item.node.val);
        if(item.node.left)queue.push({node:item.node.left,dep:d+1});
        if(item.node.right)queue.push({node:item.node.right,dep:d+1});
      }
      var hl=Object.assign({},visited);
      lvl.forEach(function(v){hl[v]='comparing';});
      steps.push({hl:hl,dep:d,msg:'Level '+d+': ['+lvl.join(', ')+']. '+(queue.length?'Next level…':'All levels done.')});
      lvl.forEach(function(v){visited[v]='sorted';});
    }
    var doneHl={};var all=[];collectAll(r,all);all.forEach(function(n){doneHl[n.val]='found';});
    var maxD=Math.max.apply(null,all.map(function(n){return n.depth;}))+1;
    steps.push({hl:doneHl,dep:maxD,done:true,msg:'Max depth = '+maxD+'. O(n) BFS.'});
    return steps;
  }

  function buildDFS(r){
    var steps=[];
    steps.push({hl:{},dep:0,msg:'DFS: depth(node) = 1 + max(depth(left), depth(right)). Base: null → 0.'});
    function dfs(n,hl){
      if(!n){steps.push({hl:Object.assign({},hl),dep:0,msg:'null → return 0'});return 0;}
      var hl2=Object.assign({},hl);hl2[n.val]='comparing';
      steps.push({hl:hl2,dep:0,msg:'Visit '+n.val+' (depth '+n.depth+'): recurse left…'});
      var l=dfs(n.left,hl2);
      hl2=Object.assign({},hl2);hl2[n.val]='active';
      steps.push({hl:hl2,dep:0,msg:'Visit '+n.val+': left='+l+', recurse right…'});
      var r2=dfs(n.right,hl2);
      var d=1+Math.max(l,r2);
      hl2=Object.assign({},hl2);hl2[n.val]='found';
      steps.push({hl:hl2,dep:d,msg:'depth('+n.val+') = 1+max('+l+','+r2+') = '+d});
      return d;
    }
    var maxD=dfs(r,{});
    var doneHl={};var all=[];collectAll(r,all);all.forEach(function(n){doneHl[n.val]='found';});
    steps.push({hl:doneHl,dep:maxD,done:true,msg:'Max depth = '+maxD+'. O(n) time, O(h) space.'});
    return steps;
  }

  function drawTree(ctx,r,W,H,hl){
    var all=[];collectAll(r,all);
    if(!all.length)return;
    var maxX=Math.max.apply(null,all.map(function(n){return n.xPos;}));
    var maxD=Math.max.apply(null,all.map(function(n){return n.depth;}));
    var xSp=Math.min(72,(W-50)/(maxX+1)),ySp=Math.min(60,(H-40)/(maxD+1));
    var xOff=(W-maxX*xSp)/2,yOff=28,R=Math.min(18,xSp*0.38);
    function nx(n){return xOff+n.xPos*xSp;}
    function ny(n){return yOff+n.depth*ySp;}
    all.forEach(function(n){
      [n.left,n.right].forEach(function(c){
        if(!c)return;
        ctx.save();ctx.strokeStyle='rgba(139,92,246,.28)';ctx.lineWidth=1.5;
        ctx.beginPath();ctx.moveTo(nx(n),ny(n));ctx.lineTo(nx(c),ny(c));ctx.stroke();ctx.restore();
      });
    });
    all.forEach(function(n){
      var x=nx(n),y=ny(n);
      var st=(hl&&hl[n.val])||'default';
      var cs2=CS[st];
      ctx.save();
      ctx.beginPath();ctx.arc(x,y,R,0,Math.PI*2);
      var g=ctx.createRadialGradient(x,y-R*0.3,1,x,y,R);
      g.addColorStop(0,cs2.g0);g.addColorStop(1,cs2.g1);
      ctx.fillStyle=g;ctx.fill();
      if(cs2.gl){ctx.shadowColor=cs2.gl;ctx.shadowBlur=10;}
      ctx.strokeStyle=cs2.sk;ctx.lineWidth=1.5;ctx.stroke();
      ctx.restore();
      ctx.save();ctx.fillStyle=cs2.tx;
      ctx.font='bold '+(R<14?8:11)+'px "JetBrains Mono",monospace';
      ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(n.val,x,y);ctx.restore();
    });
  }

  var root=mkTree(treeArr);

  function draw(s){
    bg(ui.ctx,ui.W,ui.H);
    drawTree(ui.ctx,root,ui.W,ui.H-52,s&&s.hl?s.hl:null);
    if(s&&s.dep>0){
      ui.ctx.save();rr(ui.ctx,ui.W/2-80,ui.H-46,160,26,5);
      var tg=ui.ctx.createLinearGradient(ui.W/2-80,ui.H-46,ui.W/2+80,ui.H-20);
      tg.addColorStop(0,s.done?'rgba(5,46,26,.8)':'rgba(46,27,107,.8)');
      tg.addColorStop(1,s.done?'rgba(6,46,26,.4)':'rgba(30,27,75,.4)');
      ui.ctx.fillStyle=tg;ui.ctx.fill();
      ui.ctx.strokeStyle=s.done?'rgba(52,211,153,.6)':'rgba(139,92,246,.5)';ui.ctx.lineWidth=1.5;ui.ctx.stroke();
      ui.ctx.fillStyle=s.done?'#34D399':'#C4B5FD';
      ui.ctx.font='bold 11px "JetBrains Mono",monospace';
      ui.ctx.textAlign='center';ui.ctx.textBaseline='middle';
      ui.ctx.fillText('depth = '+s.dep,ui.W/2,ui.H-33);ui.ctx.restore();
    }
  }

  var ui=makeProbUI(container,{
    canvasW:660,canvasH:290,
    approaches:[{key:'bfs',label:'📊 BFS Level-Order'},{key:'dfs',label:'🔄 DFS Recursive'}],
    buildSteps:function(a){root=mkTree(treeArr);return a==='dfs'?buildDFS(root):buildBFS(root);},
    onStep:function(s){draw(s);},
    onReset:function(){root=mkTree(treeArr);draw(null);}
  });
  draw(null);
}

/* ════════════════════════════════════════════════════════════
   P30 — Generate Parentheses
════════════════════════════════════════════════════════════ */
function initGenerateParentheses(id){
  var container=document.getElementById(id);if(!container)return;
  var n=3;

  function buildSteps(n2){
    var steps=[],results=[];
    steps.push({cur:'',open:0,close:0,results:[],msg:'Build valid combinations. Add "(" if open<n, add ")" if close<open.'});
    function rec(s,op,cl){
      if(s.length===2*n2){
        results.push(s);
        steps.push({cur:s,open:op,close:cl,results:results.slice(),found:true,
          msg:'✓ Valid: "'+s+'" ('+results.length+' found so far)'});
        return;
      }
      if(op<n2){
        steps.push({cur:s,open:op,close:cl,adding:'(',results:results.slice(),
          msg:'"'+s+'": open('+op+')<n('+n2+') → add "(" → "'+s+'("'});
        rec(s+'(',op+1,cl);
      }
      if(cl<op){
        steps.push({cur:s,open:op,close:cl,adding:')',results:results.slice(),
          msg:'"'+s+'": close('+cl+')<open('+op+') → add ")" → "'+s+')"'});
        rec(s+')',op,cl+1);
      }
    }
    rec('',0,0);
    steps.push({cur:'',results:results,done:true,
      msg:'Done! '+results.length+' valid combination'+(results.length===1?'':'s')+': '+results.map(function(r){return '"'+r+'"';}).join(', ')});
    return steps;
  }

  function draw(s){
    bg(ui.ctx,ui.W,ui.H);
    var maxLen=2*n,cur=(s&&s.cur)||'';
    var CW=Math.min(38,Math.max(20,Math.floor((ui.W-80)/maxLen)));
    var gap=3,tw=maxLen*(CW+gap)-gap,sx=(ui.W-tw)/2,row=52;

    lbl(ui.ctx,'building:',sx-4,row-14,'rgba(167,139,250,.4)',9,'right');
    for(var i=0;i<maxLen;i++){
      var x=sx+i*(CW+gap);
      var c=i<cur.length?cur[i]:'';
      var isNew=i===cur.length-1&&s&&s.adding&&c;
      var st=s&&s.found?'found':isNew?'comparing':c?'sorted':'default';
      rr(ui.ctx,x,row,CW,30,4);
      var g=ui.ctx.createLinearGradient(x,row,x,row+30);
      g.addColorStop(0,CS[st].g0);g.addColorStop(1,CS[st].g1);
      ui.ctx.fillStyle=g;ui.ctx.fill();
      ui.ctx.strokeStyle=CS[st].sk;ui.ctx.lineWidth=c?1.5:0.7;ui.ctx.stroke();
      if(c)lbl(ui.ctx,c,x+CW/2,row+15,CS[st].tx,14);
    }

    if(s&&s.open!=null)
      lbl(ui.ctx,'open='+s.open+'  close='+s.close,ui.W/2,row+44,'rgba(196,181,253,.6)',10);

    var results=(s&&s.results)||[];
    if(results.length){
      lbl(ui.ctx,'found:',ui.W/2,row+62,'rgba(167,139,250,.4)',9);
      var ry=row+76,rsw=Math.min(80,Math.max(44,Math.floor((ui.W-40)/results.length)-6));
      var rsx=(ui.W-(results.length*(rsw+4)-4))/2;
      results.forEach(function(r,i){
        var rx=rsx+i*(rsw+4);
        rr(ui.ctx,rx,ry,rsw,24,4);
        var g=ui.ctx.createLinearGradient(rx,ry,rx,ry+24);
        g.addColorStop(0,CS.found.g0);g.addColorStop(1,CS.found.g1);
        ui.ctx.fillStyle=g;ui.ctx.fill();
        ui.ctx.strokeStyle=CS.found.sk;ui.ctx.lineWidth=1.2;ui.ctx.stroke();
        lbl(ui.ctx,r,rx+rsw/2,ry+12,CS.found.tx,rsw<58?8:10);
      });
    }
  }

  var ui=makeProbUI(container,{
    canvasW:680,canvasH:250,
    inputs:[{id:'n',lbl:'n (pairs):',elem:inp('3','',42)}],
    onInputs:function(v){var n2=parseInt(v.n);if(!isNaN(n2)&&n2>=1&&n2<=4)n=n2;},
    buildSteps:function(){return buildSteps(n);},
    onStep:function(s){draw(s);},
    onReset:function(){draw(null);}
  });
  draw(null);
}

/* ════════════════════════════════════════════════════════════
   P31 — Meeting Rooms II
════════════════════════════════════════════════════════════ */
function initMeetingRooms(id){
  var container=document.getElementById(id);if(!container)return;
  var intervals=[[0,30],[5,10],[15,20]];

  function buildBrute(iv){
    var steps=[],sorted=iv.slice().sort(function(a,b){return a[0]-b[0];});
    steps.push({iv:sorted,rooms:[],cur:null,msg:'Sort by start time. Try to fit each meeting into an existing room.'});
    var rooms=[];
    sorted.forEach(function(m){
      var placed=false;
      for(var r=0;r<rooms.length;r++){
        if(rooms[r]<=m[0]){
          var prev=rooms[r];rooms[r]=m[1];placed=true;
          steps.push({iv:sorted,rooms:rooms.slice(),cur:m,
            msg:'['+m+']: room '+(r+1)+' free (ends '+prev+'≤start '+m[0]+') — reuse. Rooms: '+rooms.length});
          break;
        }
      }
      if(!placed){
        rooms.push(m[1]);
        steps.push({iv:sorted,rooms:rooms.slice(),cur:m,
          msg:'['+m+']: no free room — open room '+rooms.length+'. All ends: ['+rooms.join(',')+']'});
      }
    });
    steps.push({iv:sorted,rooms:rooms.slice(),done:true,msg:'Min rooms needed: '+rooms.length+'. O(n²).'});
    return steps;
  }

  function buildHeap(iv){
    var steps=[],sorted=iv.slice().sort(function(a,b){return a[0]-b[0];});
    steps.push({iv:sorted,heap:[],cur:null,msg:'Sort by start. Min-heap of room end-times — heap.min = earliest room to free up.'});
    var heap=[];
    function hpush(v){heap.push(v);heap.sort(function(a,b){return a-b;});}
    sorted.forEach(function(m){
      if(heap.length&&heap[0]<=m[0]){
        var freed=heap.shift();
        hpush(m[1]);
        steps.push({iv:sorted,heap:heap.slice(),cur:m,freed:freed,
          msg:'['+m+']: heap min='+freed+'≤start='+m[0]+' — reuse room. Heap: ['+heap.join(',')+']'});
      } else {
        hpush(m[1]);
        steps.push({iv:sorted,heap:heap.slice(),cur:m,
          msg:'['+m+']: heap min='+(heap[0]||'—')+'>start='+m[0]+' — new room. Heap: ['+heap.join(',')+']'});
      }
    });
    steps.push({iv:sorted,heap:heap.slice(),done:true,msg:'Min rooms = '+heap.length+'. O(n log n). Heap size = answer.'});
    return steps;
  }

  function draw(s){
    bg(ui.ctx,ui.W,ui.H);
    var iv=s&&s.iv?s.iv:intervals.slice().sort(function(a,b){return a[0]-b[0];});
    var maxT=Math.max.apply(null,iv.map(function(x){return x[1];}));
    var tw=ui.W-100,tlx=50,sy=36,IH=22,gap=5;
    var scale=tw/maxT;

    lbl(ui.ctx,'0',tlx,sy-10,'rgba(167,139,250,.3)',8);
    lbl(ui.ctx,maxT,tlx+tw,sy-10,'rgba(167,139,250,.3)',8);
    ui.ctx.save();ui.ctx.strokeStyle='rgba(139,92,246,.2)';ui.ctx.lineWidth=1;
    ui.ctx.beginPath();ui.ctx.moveTo(tlx,sy-2);ui.ctx.lineTo(tlx+tw,sy-2);ui.ctx.stroke();ui.ctx.restore();

    iv.forEach(function(m,i){
      var x=tlx+m[0]*scale,w=Math.max(4,(m[1]-m[0])*scale);
      var isCur=s&&s.cur&&s.cur[0]===m[0]&&s.cur[1]===m[1];
      var isDone=s&&s.done;
      var st=isDone?'found':isCur?'comparing':'active';
      var cs2=CS[st];
      rr(ui.ctx,x,sy+i*(IH+gap),w,IH,4);
      var g=ui.ctx.createLinearGradient(x,sy,x,sy+IH);
      g.addColorStop(0,cs2.g0);g.addColorStop(1,cs2.g1);
      ui.ctx.fillStyle=g;ui.ctx.fill();
      if(isCur){ui.ctx.save();ui.ctx.shadowColor=cs2.sk;ui.ctx.shadowBlur=8;}
      ui.ctx.strokeStyle=cs2.sk;ui.ctx.lineWidth=1.2;ui.ctx.stroke();
      if(isCur)ui.ctx.restore();
      lbl(ui.ctx,'['+m[0]+','+m[1]+']',x+w/2,sy+i*(IH+gap)+IH/2,cs2.tx,9);
    });

    var infoY=sy+iv.length*(IH+gap)+14;
    if(s&&s.rooms){
      lbl(ui.ctx,'room end-times: ['+s.rooms.join(', ')+']',ui.W/2,infoY,'rgba(167,139,250,.6)',9);
    }
    if(s&&s.heap){
      lbl(ui.ctx,'min-heap: ['+s.heap.join(', ')+']',ui.W/2,infoY,'rgba(167,139,250,.6)',9);
    }
    if(s&&s.done){
      var cnt=s.rooms?s.rooms.length:s.heap?s.heap.length:0;
      lbl(ui.ctx,'Min rooms needed = '+cnt,ui.W/2,ui.H-28,'#34D399',12);
    }
  }

  var ui=makeProbUI(container,{
    canvasW:680,canvasH:240,
    approaches:[{key:'brute',label:'⚡ Brute O(n²)'},{key:'heap',label:'🏔 Min-Heap O(n log n)'}],
    inputs:[{id:'i',lbl:'Intervals (start,end; sep by ;):',elem:inp('0,30;5,10;15,20','',240)}],
    onInputs:function(v){
      try{
        var iv2=v.i.split(';').map(function(p){return p.split(',').map(Number);});
        if(iv2.length>=1&&iv2.length<=6&&iv2.every(function(p){return p.length===2&&!isNaN(p[0])&&!isNaN(p[1])&&p[0]<p[1];}))
          intervals=iv2;
      }catch(e){}
    },
    buildSteps:function(a){return a==='heap'?buildHeap(intervals):buildBrute(intervals);},
    onStep:function(s){draw(s);},
    onReset:function(){draw(null);}
  });
  draw(null);
}

/* ════════════════════════════════════════════════════════════
   P32 — Rotate Array
════════════════════════════════════════════════════════════ */
function initRotateArray(id){
  var container=document.getElementById(id);if(!container)return;
  var arr=[1,2,3,4,5,6,7],k=3;

  function buildBrute(a,k2){
    var steps=[],n=a.length,k3=k2%n,cur=a.slice();
    steps.push({arr:cur.slice(),k:k3,msg:'Brute: rotate by 1, k times. O(n×k).'});
    for(var i=0;i<k3;i++){
      var last=cur[n-1];
      for(var j=n-1;j>0;j--)cur[j]=cur[j-1];
      cur[0]=last;
      steps.push({arr:cur.slice(),k:k3,rotated:i+1,
        msg:'Rotation '+(i+1)+'/'+k3+': moved '+last+' to front. Array: ['+cur.join(',')+']'});
    }
    steps.push({arr:cur.slice(),done:true,msg:'Done: ['+cur.join(',')+'] after '+k3+' rotations. O(n×k) time.'});
    return steps;
  }

  function buildReversal(a,k2){
    var steps=[],n=a.length,k3=k2%n,cur=a.slice();
    steps.push({arr:cur.slice(),k:k3,msg:'Reversal trick: reverse all → reverse first k → reverse last n-k. O(n).'});
    function rev(ar,l,r,label){
      var before=ar.slice();
      while(l<r){var t=ar[l];ar[l]=ar[r];ar[r]=t;l++;r--;}
      steps.push({arr:ar.slice(),phase:label,msg:label+': ['+ar.join(',')+']'});
    }
    rev(cur,0,n-1,'Reverse all [0..'+( n-1)+']');
    rev(cur,0,k3-1,'Reverse first k=[0..'+(k3-1)+']');
    rev(cur,k3,n-1,'Reverse last n-k=['+(k3)+'..'+(n-1)+']');
    steps.push({arr:cur.slice(),done:true,msg:'Rotated: ['+cur.join(',')+'] — O(n) time, O(1) space.'});
    return steps;
  }

  function draw(s){
    bg(ui.ctx,ui.W,ui.H);
    var a=s&&s.arr?s.arr:arr,n=a.length;
    var k3=(k%n)||k;
    var CW=Math.min(60,Math.max(32,Math.floor((ui.W-60)/n)));
    var gap=4,tw=n*(CW+gap)-gap,sx=(ui.W-tw)/2,row=70;

    a.forEach(function(v,i){
      var x=sx+i*(CW+gap);
      var isDone=s&&s.done;
      var isK=i<k3;
      var st=isDone?'found':s&&s.phase&&isK?'comparing':s&&s.phase&&!isK?'active':'default';
      var cs2=CS[st];
      rr(ui.ctx,x,row,CW,36,5);
      var g=ui.ctx.createLinearGradient(x,row,x,row+36);g.addColorStop(0,cs2.g0);g.addColorStop(1,cs2.g1);
      ui.ctx.fillStyle=g;ui.ctx.fill();ui.ctx.strokeStyle=cs2.sk;ui.ctx.lineWidth=1.5;ui.ctx.stroke();
      lbl(ui.ctx,v,x+CW/2,row+18,cs2.tx,13);
      lbl(ui.ctx,i,x+CW/2,row+46,'rgba(167,139,250,.35)',8);
    });

    if(s&&s.phase){
      var kx=sx+k3*(CW+gap)-gap/2;
      ui.ctx.save();ui.ctx.strokeStyle='rgba(196,181,253,.35)';ui.ctx.lineWidth=1.5;
      ui.ctx.setLineDash([4,3]);
      ui.ctx.beginPath();ui.ctx.moveTo(kx,row-6);ui.ctx.lineTo(kx,row+42);ui.ctx.stroke();
      ui.ctx.setLineDash([]);ui.ctx.restore();
      lbl(ui.ctx,'k='+k3,kx,row-12,'rgba(196,181,253,.5)',9);
    }

    if(s&&s.done)
      lbl(ui.ctx,'Rotated by k='+k3+': ['+a.join(', ')+']',ui.W/2,ui.H-28,'#34D399',11);
  }

  var ui=makeProbUI(container,{
    canvasW:700,canvasH:220,
    approaches:[{key:'brute',label:'⚡ Brute O(n×k)'},{key:'rev',label:'🔄 Reversal O(n) O(1)'}],
    inputs:[
      {id:'a',lbl:'Array:',elem:inp('1,2,3,4,5,6,7','',200)},
      {id:'k',lbl:'k:',elem:inp('3','',36)}
    ],
    onInputs:function(v){
      var p=v.a.split(',').map(function(s){return parseInt(s.trim());}).filter(function(x){return !isNaN(x);});
      var k2=parseInt(v.k);
      if(p.length>=2&&p.length<=10&&!isNaN(k2)&&k2>=1)arr=p,k=k2;
    },
    buildSteps:function(a){return a==='rev'?buildReversal(arr.slice(),k):buildBrute(arr.slice(),k);},
    onStep:function(s){draw(s);},
    onReset:function(){draw(null);}
  });
  draw(null);
}

/* ════════════════════════════════════════════════════════════
   P33 — Linked List Cycle
════════════════════════════════════════════════════════════ */
function initLinkedListCycle(id){
  var container=document.getElementById(id);if(!container)return;
  var defArr=[3,2,0,-4],defCyc=1;
  function parseArr(s){var a=s.split(',').map(function(x){return parseInt(x.trim(),10);}).filter(function(x){return!isNaN(x);});return a.length>=2?a:defArr.slice();}
  function nxt(i,n,cyc){return i+1<n?i+1:cyc;}
  function buildBrute(arr,cyc){
    var n=arr.length,visited=[],cur=0,steps=[];
    steps.push({cur:0,visited:[],found:false,msg:'Init: cur=0, visited Set=∅'});
    for(var t=0;t<n*3;t++){
      if(visited.includes(cur)){steps.push({cur:cur,visited:visited.slice(),found:true,msg:'Node '+cur+' already in visited Set → cycle detected!'});return steps;}
      visited.push(cur);
      var nx=nxt(cur,n,cyc);
      if(nx<0){steps.push({cur:-1,visited:visited.slice(),found:false,msg:'Reached null → no cycle'});return steps;}
      steps.push({cur:nx,visited:visited.slice(),found:false,msg:'Add node '+cur+' to Set; move to node '+nx});
      cur=nx;if(steps.length>22)break;
    }
    return steps;
  }
  function buildOptimal(arr,cyc){
    var n=arr.length,slow=0,fast=0,steps=[];
    steps.push({slow:0,fast:0,found:false,msg:'slow=0, fast=0 — both start at head'});
    for(var t=0;t<n*3;t++){
      var ns=nxt(slow,n,cyc),nf=nxt(fast,n,cyc);
      if(nf<0){steps.push({slow:ns,fast:-1,found:false,msg:'fast=null → no cycle'});return steps;}
      var nnf=nxt(nf,n,cyc);
      if(nnf<0){steps.push({slow:ns,fast:-1,found:false,msg:'fast=null → no cycle'});return steps;}
      slow=ns;fast=nnf;
      if(slow===fast){steps.push({slow:slow,fast:fast,found:true,msg:'slow===fast at node '+slow+' → cycle confirmed!'});return steps;}
      steps.push({slow:slow,fast:fast,found:false,msg:'slow→'+slow+', fast→'+fast+' (fast moves 2 steps)'});
      if(steps.length>18)break;
    }
    return steps;
  }
  var data={arr:defArr.slice(),cyc:defCyc},curAp='a1';
  function draw(s,ap){
    var ctx=ui.ctx,W=ui.W,H=ui.H;
    bg(ctx,W,H);
    var arr=data.arr,cyc=data.cyc,n=arr.length;
    var R=22,sep=Math.min(95,Math.floor((W-80)/Math.max(n,1)));
    var sx=W/2-(n-1)*sep/2,my=H/2-15;
    if(cyc>=0&&cyc<n){
      var ax=sx+(n-1)*sep,bx=sx+cyc*sep,arcY=my+R+60;
      ctx.save();ctx.strokeStyle='rgba(139,92,246,.45)';ctx.lineWidth=1.5;ctx.setLineDash([5,4]);
      ctx.beginPath();ctx.moveTo(ax,my+R);ctx.quadraticCurveTo((ax+bx)/2,arcY,bx,my+R);ctx.stroke();ctx.setLineDash([]);
      var tx=bx-(ax+bx)/2,ty=(my+R)-arcY;var tl=Math.sqrt(tx*tx+ty*ty)||1;
      ctx.fillStyle='rgba(139,92,246,.5)';ctx.beginPath();ctx.moveTo(bx,my+R);
      ctx.lineTo(bx-tx/tl*9+ty/tl*4.5,my+R-ty/tl*9-tx/tl*4.5);
      ctx.lineTo(bx-tx/tl*9-ty/tl*4.5,my+R-ty/tl*9+tx/tl*4.5);
      ctx.closePath();ctx.fill();ctx.restore();
      lbl(ctx,'↙ cycle to '+cyc,(ax+bx)/2,arcY+12,'rgba(139,92,246,.5)',8);
    }
    for(var i=0;i<n-1;i++){
      var x1=sx+i*sep+R+2,x2=sx+(i+1)*sep-R-2,y=my;
      ctx.save();ctx.strokeStyle='rgba(160,160,200,.4)';ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(x1,y);ctx.lineTo(x2,y);ctx.stroke();
      ctx.fillStyle='rgba(160,160,200,.4)';
      ctx.beginPath();ctx.moveTo(x2,y);ctx.lineTo(x2-8,y-4);ctx.lineTo(x2-8,y+4);ctx.closePath();ctx.fill();
      ctx.restore();
    }
    for(var i=0;i<n;i++){
      var cx=sx+i*sep,cy=my;
      var visited=s&&s.visited?s.visited.includes(i):false;
      var fill='rgba(25,15,45,.9)',stroke='rgba(100,100,140,.5)',sw=1.5;
      if(ap==='a1'){
        if(s&&s.cur===i&&s.found){fill='rgba(139,92,246,.3)';stroke='#8B5CF6';sw=2.5;}
        else if(s&&s.cur===i){fill='rgba(245,158,11,.25)';stroke='#F59E0B';sw=2;}
        else if(visited){fill='rgba(16,185,129,.1)';stroke='rgba(16,185,129,.4)';}
      } else {
        var both=s&&s.slow===i&&s.fast===i;
        if(both&&s&&s.found){fill='rgba(251,191,36,.3)';stroke='#FBB024';sw=2.5;}
        else if(both){fill='rgba(139,92,246,.2)';stroke='#A78BFA';sw=2;}
        else if(s&&s.slow===i){fill='rgba(6,182,212,.2)';stroke='#06B6D4';sw=2;}
        else if(s&&s.fast===i){fill='rgba(236,72,153,.2)';stroke='#EC4899';sw=2;}
      }
      ctx.save();if(sw>2){ctx.shadowColor=stroke;ctx.shadowBlur=12;}
      ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);
      ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=sw;ctx.stroke();
      ctx.shadowBlur=0;ctx.restore();
      lbl(ctx,String(arr[i]),cx,cy+1,'#EDE9FE',12);
      lbl(ctx,String(i),cx,cy+R+13,'rgba(139,92,246,.4)',8);
      if(ap==='a1'&&s&&s.cur===i)lbl(ctx,'cur',cx,cy-R-8,'#F59E0B',9);
      if(ap==='a2'&&s){
        var both2=s.slow===i&&s.fast===i;
        if(both2)lbl(ctx,'S/F',cx,cy-R-8,'#FBB024',9);
        else if(s.slow===i)lbl(ctx,'S',cx,cy-R-8,'#06B6D4',9);
        else if(s.fast===i)lbl(ctx,'F',cx,cy-R-8,'#EC4899',9);
      }
    }
    if(ap==='a1'){lbl(ctx,'■ in Set',50,H-22,'rgba(16,185,129,.8)',10);lbl(ctx,'◉ cur',120,H-22,'#F59E0B',10);}
    else{lbl(ctx,'S = slow pointer',70,H-22,'#06B6D4',10);lbl(ctx,'F = fast pointer (×2)',210,H-22,'#EC4899',10);if(s&&s.found)lbl(ctx,'↑ meeting point',370,H-22,'#FBB024',10);}
  }
  var ui=makeProbUI(container,{
    canvasW:700,canvasH:230,
    approaches:[{key:'a1',label:'Hash Set O(n space)'},{key:'a2',label:'⚡ Floyd\'s O(1) space'}],
    inputs:[{id:'arr',lbl:'Values:',elem:inp(defArr.join(','),'',190)},{id:'cyc',lbl:'Cycle to idx (-1=none):',elem:inp(String(defCyc),'',70)}],
    onInputs:function(v){var a=parseArr(v.arr||'');var c=parseInt(v.cyc,10);if(isNaN(c)||c<0||c>=a.length)c=-1;data={arr:a,cyc:c};},
    buildSteps:function(a){curAp=a;return a==='a2'?buildOptimal(data.arr,data.cyc):buildBrute(data.arr,data.cyc);},
    onStep:function(s){draw(s,curAp);},onReset:function(){draw(null,curAp);}
  });
  draw(null,'a1');
}

/* ════════════════════════════════════════════════════════════
   P34 — Merge Two Sorted Lists
════════════════════════════════════════════════════════════ */
function initMergeSortedLists(id){
  var container=document.getElementById(id);if(!container)return;
  var def1=[1,2,4],def2=[1,3,4];
  function parseArr(s){var a=s.split(',').map(function(x){return parseInt(x.trim(),10);}).filter(function(x){return!isNaN(x);});return a.length?a.sort(function(a,b){return a-b;}):[0];}
  function buildBrute(l1,l2){
    var combined=l1.concat(l2).sort(function(a,b){return a-b;}),steps=[],acc=[];
    steps.push({merged:[],i:-1,j:-1,phase:'start',msg:'Brute: concat → ['+l1.concat(l2).join(',')+'], then sort'});
    for(var k=0;k<combined.length;k++){acc.push(combined[k]);steps.push({merged:acc.slice(),i:-1,j:-1,phase:'sort',msg:'Building sorted result: ['+acc.join(',')+']'});}
    steps.push({merged:combined.slice(),i:-1,j:-1,phase:'done',msg:'Done: ['+combined.join(',')+'] — O((n+m) log(n+m)) time'});
    return steps;
  }
  function buildOptimal(l1,l2){
    var steps=[],i=0,j=0,merged=[];
    steps.push({i:0,j:0,merged:[],from:'',phase:'start',msg:'Two-pointer merge: i=0, j=0'});
    while(i<l1.length||j<l2.length){
      var takeL=(j>=l2.length)||(i<l1.length&&l1[i]<=l2[j]);
      if(takeL){var v=l1[i];merged.push(v);steps.push({i:i,j:j,merged:merged.slice(),from:'l1',phase:'pick',msg:'l1['+i+']='+v+' ≤ '+(j<l2.length?'l2['+j+']='+l2[j]:'(end)')+'  →  take '+v+' from list1'});i++;}
      else{var v=l2[j];merged.push(v);steps.push({i:i,j:j,merged:merged.slice(),from:'l2',phase:'pick',msg:'l2['+j+']='+v+' < l1['+i+']='+l1[i]+'  →  take '+v+' from list2'});j++;}
      if(steps.length>30)break;
    }
    steps.push({i:i,j:j,merged:merged.slice(),from:'',phase:'done',msg:'Merged: ['+merged.join(',')+'] — O(n+m) time, O(1) extra nodes'});
    return steps;
  }
  var data={l1:def1.slice(),l2:def2.slice()},curAp='a1';
  function draw(s,ap){
    var ctx=ui.ctx,W=ui.W,H=ui.H;bg(ctx,W,H);
    var l1=data.l1,l2=data.l2,cw=46,ch=36,gap=6;
    var maxN=Math.max(l1.length,l2.length,(s&&s.merged?s.merged.length:0));
    var sx=Math.max(68,(W-maxN*(cw+gap)+gap)/2),y1=38,y2=98,ym=165;
    lbl(ctx,'list1',sx-42,y1+ch/2,'rgba(6,182,212,.8)',10);
    lbl(ctx,'list2',sx-42,y2+ch/2,'rgba(236,72,153,.8)',10);
    lbl(ctx,'merged',sx-50,ym+ch/2,'rgba(16,185,129,.8)',10);
    for(var i=0;i<l1.length;i++){var dL=ap==='a2'&&s&&s.i>i;var aL=ap==='a2'&&s&&s.i===i&&s.from==='l1';cell(ctx,sx+i*(cw+gap),y1,cw,ch,l1[i],dL?'sorted':aL?'active':'default');}
    if(ap==='a2'&&s&&s.i>=0&&s.i<l1.length)arrow(ctx,sx+s.i*(cw+gap)+cw/2,y1-2,'i','#06B6D4');
    for(var j=0;j<l2.length;j++){var dR=ap==='a2'&&s&&s.j>j;var aR=ap==='a2'&&s&&s.j===j&&s.from==='l2';cell(ctx,sx+j*(cw+gap),y2,cw,ch,l2[j],dR?'sorted':aR?'active':'default');}
    if(ap==='a2'&&s&&s.j>=0&&s.j<l2.length)arrow(ctx,sx+s.j*(cw+gap)+cw/2,y2-2,'j','#EC4899');
    if(s&&s.merged&&s.merged.length){for(var k=0;k<s.merged.length;k++)cell(ctx,sx+k*(cw+gap),ym,cw,ch,s.merged[k],'found');}
  }
  var ui=makeProbUI(container,{
    canvasW:700,canvasH:230,
    approaches:[{key:'a1',label:'Concat + Sort'},{key:'a2',label:'⚡ Two Pointers O(n+m)'}],
    inputs:[{id:'l1',lbl:'List 1:',elem:inp(def1.join(','),'',130)},{id:'l2',lbl:'List 2:',elem:inp(def2.join(','),'',130)}],
    onInputs:function(v){data={l1:parseArr(v.l1||''),l2:parseArr(v.l2||'')};},
    buildSteps:function(a){curAp=a;return a==='a2'?buildOptimal(data.l1,data.l2):buildBrute(data.l1,data.l2);},
    onStep:function(s){draw(s,curAp);},onReset:function(){draw(null,curAp);}
  });
  draw(null,'a1');
}

/* ════════════════════════════════════════════════════════════
   P35 — Search in Rotated Sorted Array
════════════════════════════════════════════════════════════ */
function initSearchRotatedArray(id){
  var container=document.getElementById(id);if(!container)return;
  var defArr=[4,5,6,7,0,1,2],defTarget=0;
  function parseArr(s){var a=s.split(',').map(function(x){return parseInt(x.trim(),10);}).filter(function(x){return!isNaN(x);});return a.length>=2?a:defArr.slice();}
  function buildBrute(arr,target){
    var steps=[];steps.push({idx:-1,found:-1,msg:'Linear scan: check every element'});
    for(var i=0;i<arr.length;i++){var hit=arr[i]===target;steps.push({idx:i,found:hit?i:-1,msg:'arr['+i+']='+arr[i]+(hit?' === '+target+' → found!':' ≠ '+target)});if(hit)return steps;}
    steps.push({idx:-1,found:-2,msg:'Target '+target+' not found — return −1'});return steps;
  }
  function buildOptimal(arr,target){
    var steps=[],lo=0,hi=arr.length-1;
    steps.push({lo:lo,hi:hi,mid:-1,found:-1,sh:'',msg:'Modified binary search: lo='+lo+', hi='+hi});
    while(lo<=hi){
      var mid=Math.floor((lo+hi)/2);
      if(arr[mid]===target){steps.push({lo:lo,hi:hi,mid:mid,found:mid,sh:'',msg:'arr['+mid+']='+arr[mid]+' === target → found at index '+mid+'!'});return steps;}
      if(arr[lo]<=arr[mid]){
        steps.push({lo:lo,hi:hi,mid:mid,found:-1,sh:'left',msg:'Left half ['+lo+'..'+mid+'] sorted ('+arr[lo]+'…'+arr[mid]+')'});
        if(target>=arr[lo]&&target<arr[mid]){hi=mid-1;steps.push({lo:lo,hi:hi,mid:mid,found:-1,sh:'left',msg:target+' in left range → hi='+(mid-1)});}
        else{lo=mid+1;steps.push({lo:lo,hi:hi,mid:mid,found:-1,sh:'',msg:target+' not in left range → lo='+(mid+1)});}
      } else {
        steps.push({lo:lo,hi:hi,mid:mid,found:-1,sh:'right',msg:'Right half ['+mid+'..'+hi+'] sorted ('+arr[mid]+'…'+arr[hi]+')'});
        if(target>arr[mid]&&target<=arr[hi]){lo=mid+1;steps.push({lo:lo,hi:hi,mid:mid,found:-1,sh:'right',msg:target+' in right range → lo='+(mid+1)});}
        else{hi=mid-1;steps.push({lo:lo,hi:hi,mid:mid,found:-1,sh:'',msg:target+' not in right range → hi='+(mid-1)});}
      }
      if(steps.length>30)break;
    }
    steps.push({lo:lo,hi:hi,mid:-1,found:-2,sh:'',msg:'lo > hi — target '+target+' not found, return −1'});return steps;
  }
  var data={arr:defArr.slice(),target:defTarget},curAp='a1';
  function draw(s,ap){
    var ctx=ui.ctx,W=ui.W,H=ui.H;bg(ctx,W,H);
    var arr=data.arr,n=arr.length;
    var cw=Math.min(58,Math.floor((W-80)/n)-4),ch=48,gap=4;
    var sx=(W-n*(cw+gap)+gap)/2,sy=H/2-ch/2-14;
    var pivot=-1;for(var k=0;k<n-1;k++){if(arr[k]>arr[k+1]){pivot=k;break;}}
    if(pivot>=0){
      var px=sx+(pivot+1)*(cw+gap)-gap/2;
      ctx.save();ctx.strokeStyle='rgba(245,158,11,.4)';ctx.lineWidth=1.5;ctx.setLineDash([4,4]);
      ctx.beginPath();ctx.moveTo(px,sy-10);ctx.lineTo(px,sy+ch+10);ctx.stroke();ctx.setLineDash([]);ctx.restore();
      lbl(ctx,'↑ rotation',px,sy-18,'rgba(245,158,11,.55)',8);
    }
    for(var i=0;i<n;i++){
      var x=sx+i*(cw+gap),st='default';
      if(s){
        var inR=ap==='a2'&&s.lo<=i&&i<=s.hi;
        if(s.found===i)st='found';
        else if(s.found===-2)st='water';
        else if(ap==='a1'&&s.idx===i)st='active';
        else if(ap==='a2'&&s.mid===i)st='pivot';
        else if(ap==='a2'&&inR)st='selected';
        else if(ap==='a2'&&!inR)st='water';
      }
      cell(ctx,x,sy,cw,ch,arr[i],st);
      lbl(ctx,String(i),x+cw/2,sy+ch+14,'rgba(139,92,246,.4)',8);
    }
    if(ap==='a2'&&s){
      if(s.lo>=0&&s.lo<n)arrow(ctx,sx+s.lo*(cw+gap)+cw/2,sy-4,'L','#818CF8');
      if(s.hi>=0&&s.hi<n)arrow(ctx,sx+s.hi*(cw+gap)+cw/2,sy-4,'H','#F472B6');
      if(s.mid>=0&&s.mid<n)arrow(ctx,sx+s.mid*(cw+gap)+cw/2,sy-20,'M','#FB923C');
    }
    ctx.save();rr(ctx,W-100,8,90,24,5);
    var tg=ctx.createLinearGradient(W-100,8,W-10,32);tg.addColorStop(0,'#2E1B6B');tg.addColorStop(1,'#120930');
    ctx.fillStyle=tg;ctx.fill();ctx.strokeStyle='rgba(139,92,246,.5)';ctx.lineWidth=1.5;ctx.stroke();ctx.restore();
    lbl(ctx,'target = '+data.target,W-55,20,'#A78BFA',11);
  }
  var ui=makeProbUI(container,{
    canvasW:700,canvasH:200,
    approaches:[{key:'a1',label:'Linear Scan O(n)'},{key:'a2',label:'⚡ Binary Search O(log n)'}],
    inputs:[{id:'arr',lbl:'Rotated array:',elem:inp(defArr.join(','),'',200)},{id:'tgt',lbl:'Target:',elem:inp(String(defTarget),'',60)}],
    onInputs:function(v){var a=parseArr(v.arr||'');var t=parseInt(v.tgt,10);data={arr:a,target:isNaN(t)?0:t};},
    buildSteps:function(a){curAp=a;return a==='a2'?buildOptimal(data.arr,data.target):buildBrute(data.arr,data.target);},
    onStep:function(s){draw(s,curAp);},onReset:function(){draw(null,curAp);}
  });
  draw(null,'a1');
}

/* ════════════════════════════════════════════════════════════
   P36 — Course Schedule
════════════════════════════════════════════════════════════ */
function initCourseSchedule(id){
  var container=document.getElementById(id);if(!container)return;
  var defN=4,defPre=[[1,0],[2,0],[3,1],[3,2]];
  function parsePre(s,n){
    try{var pairs=(s.match(/\d+\s*,\s*\d+/g)||[]).map(function(p){var x=p.split(',');return[parseInt(x[0]),parseInt(x[1])];});return pairs.filter(function(p){return p[0]<n&&p[1]<n&&p[0]!==p[1];});}catch(e){return[];}
  }
  function npos(i,n,W,H){var r=Math.min(W,H)*0.33-20,a=-Math.PI/2+i*2*Math.PI/n;return{x:W/2+r*Math.cos(a),y:H/2+r*Math.sin(a)};}
  function buildDFS(n,pre){
    var adj=[];for(var i=0;i<n;i++)adj.push([]);
    pre.forEach(function(p){adj[p[1]].push(p[0]);});
    var state=[];for(var i=0;i<n;i++)state.push(0);
    var steps=[],hasCycle=false,cycleEdge=null;
    function dfs(node){
      state[node]=1;steps.push({state:state.slice(),cur:node,cycleEdge:null,msg:'Visit '+node+' → GRAY (in-progress)'});
      for(var k=0;k<adj[node].length;k++){
        var nb=adj[node][k];
        if(state[nb]===1){cycleEdge=[node,nb];hasCycle=true;steps.push({state:state.slice(),cur:node,cycleEdge:cycleEdge.slice(),msg:'Back-edge '+node+'→'+nb+': '+nb+' is GRAY → CYCLE! Return false.'});return;}
        if(state[nb]===0){steps.push({state:state.slice(),cur:node,cycleEdge:null,msg:'Recurse: '+node+' → '+nb});dfs(nb);if(hasCycle)return;}
      }
      state[node]=2;steps.push({state:state.slice(),cur:node,cycleEdge:null,msg:'Node '+node+' fully explored → BLACK (done)'});
    }
    for(var i=0;i<n&&!hasCycle;i++){if(state[i]===0){steps.push({state:state.slice(),cur:i,cycleEdge:null,msg:'Start DFS from unvisited node '+i});dfs(i);}}
    if(!hasCycle)steps.push({state:state.slice(),cur:-1,cycleEdge:null,msg:'No cycle found → can finish all '+n+' courses!'});
    return steps;
  }
  function buildKahn(n,pre){
    var adj=[],indeg=[];for(var i=0;i<n;i++){adj.push([]);indeg.push(0);}
    pre.forEach(function(p){adj[p[1]].push(p[0]);indeg[p[0]]++;});
    var queue=[],done=[],steps=[];
    for(var i=0;i<n;i++)if(indeg[i]===0)queue.push(i);
    steps.push({indeg:indeg.slice(),queue:queue.slice(),done:[],cur:-1,msg:'Init in-degrees: '+JSON.stringify(indeg)+';  queue='+JSON.stringify(queue)});
    while(queue.length){
      var cur=queue.shift();done.push(cur);
      steps.push({indeg:indeg.slice(),queue:queue.slice(),done:done.slice(),cur:cur,msg:'Process node '+cur+' (in-degree 0)'});
      for(var k=0;k<adj[cur].length;k++){var nb=adj[cur][k];indeg[nb]--;if(indeg[nb]===0)queue.push(nb);steps.push({indeg:indeg.slice(),queue:queue.slice(),done:done.slice(),cur:cur,msg:'Reduce in-degree of '+nb+': → '+indeg[nb]+(indeg[nb]===0?' (add to queue)':'')});}
    }
    var cycle=done.length<n;
    steps.push({indeg:indeg.slice(),queue:[],done:done.slice(),cur:-1,cycle:cycle,msg:cycle?'Processed '+done.length+'/'+n+' nodes → cycle exists!':'Order: '+done.join('→')+' — can finish all courses!'});
    return steps;
  }
  var data={n:defN,pre:defPre.map(function(p){return p.slice();})},curAp='a1';
  function draw(s,ap){
    var ctx=ui.ctx,W=ui.W,H=ui.H;bg(ctx,W,H);
    var n=data.n,pre=data.pre,R=22;
    var adj=[];for(var i=0;i<n;i++)adj.push([]);
    pre.forEach(function(p){if(p[0]<n&&p[1]<n)adj[p[1]].push(p[0]);});
    var pos=[];for(var i=0;i<n;i++)pos.push(npos(i,n,W,H));
    // Draw edges
    for(var u=0;u<n;u++){
      for(var k=0;k<adj[u].length;k++){
        var v=adj[u][k];var pu=pos[u],pv=pos[v];
        var dx=pv.x-pu.x,dy=pv.y-pu.y,len=Math.sqrt(dx*dx+dy*dy)||1;
        var ux=dx/len,uy=dy/len,ox=-uy*3,oy=ux*3;
        var isCE=s&&s.cycleEdge&&s.cycleEdge[0]===u&&s.cycleEdge[1]===v;
        var ecol=isCE?'rgba(239,68,68,.85)':'rgba(139,92,246,.4)';
        var x1=pu.x+ox+ux*R,y1=pu.y+oy+uy*R,x2=pv.x+ox-ux*R,y2=pv.y+oy-uy*R;
        ctx.save();ctx.strokeStyle=ecol;ctx.lineWidth=isCE?2:1.5;
        if(isCE){ctx.shadowColor='#EF4444';ctx.shadowBlur=8;}
        ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();ctx.shadowBlur=0;
        ctx.fillStyle=ecol;ctx.beginPath();ctx.moveTo(x2,y2);
        ctx.lineTo(x2-ux*9+uy*4.5,y2-uy*9-ux*4.5);ctx.lineTo(x2-ux*9-uy*4.5,y2-uy*9+ux*4.5);
        ctx.closePath();ctx.fill();ctx.restore();
      }
    }
    // Draw nodes
    for(var i=0;i<n;i++){
      var p=pos[i],fill='rgba(25,15,45,.9)',stroke='rgba(100,100,140,.5)',sw=1.5;
      if(ap==='a1'&&s&&s.state){
        var st=s.state[i];
        if(s.cur===i){fill='rgba(139,92,246,.35)';stroke='#8B5CF6';sw=2.5;}
        else if(st===2){fill='rgba(16,185,129,.18)';stroke='rgba(16,185,129,.7)';sw=2;}
        else if(st===1){fill='rgba(245,158,11,.25)';stroke='#F59E0B';sw=2;}
        if(s.cycleEdge&&s.cycleEdge[1]===i){fill='rgba(239,68,68,.3)';stroke='#EF4444';sw=2.5;}
      } else if(ap==='a2'&&s){
        var inQ=s.queue&&s.queue.includes(i),isDone=s.done&&s.done.includes(i);
        if(s.cur===i){fill='rgba(139,92,246,.35)';stroke='#8B5CF6';sw=2.5;}
        else if(isDone){fill='rgba(16,185,129,.18)';stroke='rgba(16,185,129,.7)';sw=2;}
        else if(inQ){fill='rgba(245,158,11,.2)';stroke='#F59E0B';sw=2;}
      }
      ctx.save();if(sw>2){ctx.shadowColor=stroke;ctx.shadowBlur=12;}
      ctx.beginPath();ctx.arc(p.x,p.y,R,0,Math.PI*2);
      ctx.fillStyle=fill;ctx.fill();ctx.strokeStyle=stroke;ctx.lineWidth=sw;ctx.stroke();
      ctx.shadowBlur=0;ctx.restore();
      lbl(ctx,String(i),p.x,p.y+1,'#EDE9FE',13);
      if(ap==='a2'&&s&&s.indeg)lbl(ctx,'d='+s.indeg[i],p.x,p.y+R+14,'rgba(6,182,212,.7)',8);
    }
    if(ap==='a1'){
      lbl(ctx,'■ unvisited',45,H-22,'rgba(100,100,140,.7)',9);lbl(ctx,'■ gray (in-progress)',160,H-22,'#F59E0B',9);
      lbl(ctx,'■ black (done)',295,H-22,'rgba(16,185,129,.8)',9);lbl(ctx,'■ active',395,H-22,'#8B5CF6',9);
      if(s&&s.cycleEdge)lbl(ctx,'back-edge = cycle!',510,H-22,'#EF4444',9);
    } else {
      lbl(ctx,'■ in queue',45,H-22,'#F59E0B',9);lbl(ctx,'■ processed',150,H-22,'rgba(16,185,129,.8)',9);
      lbl(ctx,'d = in-degree',260,H-22,'rgba(6,182,212,.7)',9);
      if(s&&s.cycle)lbl(ctx,'cycle detected!',390,H-22,'#EF4444',9);
    }
  }
  var ui=makeProbUI(container,{
    canvasW:700,canvasH:270,
    approaches:[{key:'a1',label:'DFS Cycle Detection'},{key:'a2',label:'⚡ Kahn\'s BFS Topo-sort'}],
    inputs:[
      {id:'n',lbl:'Courses:',elem:inp(String(defN),'',50)},
      {id:'pre',lbl:'Prerequisites:',elem:inp(defPre.map(function(p){return p.join(',');}).join(' '),'e.g. 1,0 2,0',220)}
    ],
    onInputs:function(v){var n=parseInt(v.n,10);if(isNaN(n)||n<2)n=2;if(n>8)n=8;data={n:n,pre:parsePre(v.pre||'',n)};},
    buildSteps:function(a){curAp=a;return a==='a2'?buildKahn(data.n,data.pre):buildDFS(data.n,data.pre);},
    onStep:function(s){draw(s,curAp);},onReset:function(){draw(null,curAp);}
  });
  draw(null,'a1');
}

/* shared tree helpers used by P37, P38, P46 */
function _mkTree(arr){
  if(!arr||!arr.length||arr[0]==null)return null;
  var nodes=arr.map(function(v){return v!=null?{val:v,left:null,right:null,depth:0,xPos:0}:null;});
  for(var i=0;i<nodes.length;i++){
    if(!nodes[i])continue;
    var l=2*i+1,r2=2*i+2;
    if(l<nodes.length)nodes[i].left=nodes[l]||null;
    if(r2<nodes.length)nodes[i].right=nodes[r2]||null;
  }
  function setD(n,d){if(!n)return;n.depth=d;setD(n.left,d+1);setD(n.right,d+1);}
  setD(nodes[0],0);
  var cnt=[0];
  function ino(n){if(!n)return;ino(n.left);n.xPos=cnt[0]++;ino(n.right);}
  ino(nodes[0]);return nodes[0];
}
function _collectAll(n,out){if(!n)return;out.push(n);_collectAll(n.left,out);_collectAll(n.right,out);}
function _drawTree(ctx,r,W,H,hl){
  var all=[];_collectAll(r,all);if(!all.length)return;
  var maxX=Math.max.apply(null,all.map(function(n){return n.xPos;}));
  var maxD=Math.max.apply(null,all.map(function(n){return n.depth;}));
  var xSp=Math.min(72,(W-50)/(maxX+1)),ySp=Math.min(60,(H-40)/(maxD+1));
  var xOff=(W-maxX*xSp)/2,yOff=28,R=Math.min(18,xSp*0.38);
  function nx(n){return xOff+n.xPos*xSp;}
  function ny(n){return yOff+n.depth*ySp;}
  all.forEach(function(n){[n.left,n.right].forEach(function(c){
    if(!c)return;ctx.save();ctx.strokeStyle='rgba(139,92,246,.28)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(nx(n),ny(n));ctx.lineTo(nx(c),ny(c));ctx.stroke();ctx.restore();
  });});
  all.forEach(function(n){
    var x=nx(n),y=ny(n),st=(hl&&hl[n.val])||'default',cs2=CS[st];
    ctx.save();ctx.beginPath();ctx.arc(x,y,R,0,Math.PI*2);
    var g=ctx.createRadialGradient(x,y-R*0.3,1,x,y,R);g.addColorStop(0,cs2.g0);g.addColorStop(1,cs2.g1);
    ctx.fillStyle=g;ctx.fill();if(cs2.gl){ctx.shadowColor=cs2.gl;ctx.shadowBlur=10;}
    ctx.strokeStyle=cs2.sk;ctx.lineWidth=1.5;ctx.stroke();ctx.restore();
    ctx.save();ctx.fillStyle=cs2.tx;ctx.font='bold '+(R<14?8:11)+'px "JetBrains Mono",monospace';
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(n.val,x,y);ctx.restore();
  });
}

/* ════════════════════════════════════════════════════════════
   P37 — Invert Binary Tree
════════════════════════════════════════════════════════════ */
function initInvertBinaryTree(id){
  var container=document.getElementById(id);if(!container)return;
  var defArr=[4,2,7,1,3,6,9];

  function buildDFS(arr){
    var steps=[],state=arr.slice();
    steps.push({arr:state.slice(),cur:-1,msg:'DFS: invert(node) = swap left↔right, then recurse on each child'});
    function dfs(i){
      if(i>=state.length||state[i]==null)return;
      var l=2*i+1,r=2*i+2;
      var lv=l<state.length?state[l]:null,rv=r<state.length?state[r]:null;
      if(l<state.length)state[l]=rv;if(r<state.length)state[r]=lv;
      steps.push({arr:state.slice(),cur:state[i],msg:'Node '+state[i]+': swap left('+lv+') ↔ right('+rv+')'});
      dfs(l);dfs(r);
    }
    dfs(0);
    steps.push({arr:state.slice(),cur:-1,done:true,msg:'Done! Tree inverted.'});
    return steps;
  }
  function buildBFS(arr){
    var steps=[],state=arr.slice();
    steps.push({arr:state.slice(),cur:-1,msg:'BFS: use queue, swap children of each node level by level'});
    var queue=[0];
    while(queue.length){
      var i=queue.shift();if(i>=state.length||state[i]==null)continue;
      var l=2*i+1,r=2*i+2;
      var lv=l<state.length?state[l]:null,rv=r<state.length?state[r]:null;
      if(l<state.length)state[l]=rv;if(r<state.length)state[r]=lv;
      steps.push({arr:state.slice(),cur:state[i],msg:'Node '+state[i]+': swap left('+lv+') ↔ right('+rv+')'});
      if(l<state.length&&state[l]!=null)queue.push(l);
      if(r<state.length&&state[r]!=null)queue.push(r);
    }
    steps.push({arr:state.slice(),cur:-1,done:true,msg:'Done! BFS inversion complete.'});
    return steps;
  }

  var curAp='dfs';
  function draw(s){
    bg(ui.ctx,ui.W,ui.H);
    var arr=s?s.arr:defArr;
    var r=_mkTree(arr);
    var hl={};if(s&&s.cur!=-1)hl[s.cur]='active';
    if(s&&s.done){var all=[];_collectAll(r,all);all.forEach(function(n){hl[n.val]='found';});}
    _drawTree(ui.ctx,r,ui.W,ui.H-30,hl);
  }
  var ui=makeProbUI(container,{
    canvasW:660,canvasH:280,
    approaches:[{key:'dfs',label:'⚡ DFS Recursive'},{key:'bfs',label:'BFS Iterative'}],
    buildSteps:function(a){curAp=a;return a==='bfs'?buildBFS(defArr.slice()):buildDFS(defArr.slice());},
    onStep:function(s){draw(s);},onReset:function(){draw(null);}
  });
  draw(null);
}

/* ════════════════════════════════════════════════════════════
   P38 — Binary Tree Level Order Traversal
════════════════════════════════════════════════════════════ */
function initLevelOrderTraversal(id){
  var container=document.getElementById(id);if(!container)return;
  var defArr=[3,9,20,null,null,15,7];

  function buildBFS(arr){
    var steps=[],r=_mkTree(arr);if(!r)return steps;
    var queue=[r],levels=[],visited={};
    steps.push({hl:{},levels:[],msg:'BFS: process node-by-node per level using a queue'});
    while(queue.length){
      var sz=queue.length,lvl=[];
      var hl=Object.assign({},visited);
      for(var i=0;i<sz;i++){
        var node=queue.shift();lvl.push(node.val);hl[node.val]='comparing';
        if(node.left)queue.push(node.left);
        if(node.right)queue.push(node.right);
      }
      steps.push({hl:Object.assign({},hl),levels:levels.concat([lvl]),msg:'Level: ['+lvl.join(',')+'] → add to result'});
      lvl.forEach(function(v){visited[v]='sorted';});
      levels=levels.concat([lvl]);
    }
    var doneHl={};var all=[];_collectAll(r,all);all.forEach(function(n){doneHl[n.val]='found';});
    steps.push({hl:doneHl,levels:levels,done:true,msg:'Result: ['+levels.map(function(l){return'['+l+']';}).join(',')+']'});
    return steps;
  }

  function draw(s){
    bg(ui.ctx,ui.W,ui.H);
    var r=_mkTree(defArr);
    _drawTree(ui.ctx,r,ui.W,ui.H-60,s&&s.hl?s.hl:{});
    if(s&&s.levels&&s.levels.length){
      var text='Levels: '+s.levels.map(function(l){return'['+l+']';}).join(' ');
      lbl(ui.ctx,text,ui.W/2,ui.H-20,'#A78BFA',10);
    }
  }
  var ui=makeProbUI(container,{
    canvasW:660,canvasH:280,
    approaches:[{key:'bfs',label:'⚡ BFS (Queue)'}],
    buildSteps:function(){return buildBFS(defArr);},
    onStep:function(s){draw(s);},onReset:function(){draw(null);}
  });
  draw(null);
}

/* ════════════════════════════════════════════════════════════
   P39 — Min Stack
════════════════════════════════════════════════════════════ */
function initMinStack(id){
  var container=document.getElementById(id);if(!container)return;
  var defOps=[['push',-2],['push',0],['push',-3],['getMin'],['pop'],['top'],['getMin']];

  function buildOptimal(ops){
    var steps=[],stack=[],mins=[];
    steps.push({stack:[],mins:[],result:null,op:null,msg:'Min Stack: each push stores (val, currentMin) pair — getMin is O(1)'});
    ops.forEach(function(op){
      if(op[0]==='push'){
        var v=op[1];
        var curMin=mins.length?Math.min(mins[mins.length-1],v):v;
        stack.push(v);mins.push(curMin);
        steps.push({stack:stack.slice(),mins:mins.slice(),result:null,op:'push '+v,msg:'push('+v+'): stack top='+v+', min='+curMin});
      } else if(op[0]==='pop'){
        var top=stack.pop();mins.pop();
        steps.push({stack:stack.slice(),mins:mins.slice(),result:top,op:'pop',msg:'pop() → removed '+top+', new min='+(mins.length?mins[mins.length-1]:'(empty)')});
      } else if(op[0]==='top'){
        var t=stack[stack.length-1];
        steps.push({stack:stack.slice(),mins:mins.slice(),result:t,op:'top',msg:'top() → '+t});
      } else if(op[0]==='getMin'){
        var m=mins[mins.length-1];
        steps.push({stack:stack.slice(),mins:mins.slice(),result:m,op:'getMin',isMin:true,msg:'getMin() → '+m+' (O(1) — stored alongside each push!)'});
      }
    });
    return steps;
  }

  function draw(s){
    var ctx=ui.ctx,W=ui.W,H=ui.H;bg(ctx,W,H);
    var stk=s?s.stack:[],mns=s?s.mins:[],n=stk.length;
    var cw=52,ch=36,gap=4,bx=W/2-60,mx=W/2+60,by=H-50;
    lbl(ctx,'Values',bx,by-n*(ch+gap)-20,'rgba(6,182,212,.8)',10);
    lbl(ctx,'Min so far',mx,by-n*(ch+gap)-20,'rgba(236,72,153,.8)',10);
    for(var i=0;i<n;i++){
      var y=by-(i+1)*(ch+gap);
      var isTop=(i===n-1);
      cell(ctx,bx-cw/2,y,cw,ch,stk[i],isTop?'active':'default');
      cell(ctx,mx-cw/2,y,cw,ch,mns[i],s&&s.isMin&&isTop?'found':'selected');
    }
    // Base lines
    ctx.save();ctx.strokeStyle='rgba(139,92,246,.3)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(bx-cw/2-4,by+2);ctx.lineTo(bx+cw/2+4,by+2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(mx-cw/2-4,by+2);ctx.lineTo(mx+cw/2+4,by+2);ctx.stroke();
    ctx.restore();
    if(s&&s.result!=null){
      rr(ctx,W/2-64,H-28,128,22,5);
      var tg=ctx.createLinearGradient(W/2-64,H-28,W/2+64,H-6);tg.addColorStop(0,'#2E1B6B');tg.addColorStop(1,'#120930');
      ctx.fillStyle=tg;ctx.fill();ctx.strokeStyle='rgba(139,92,246,.5)';ctx.lineWidth=1.2;ctx.stroke();
      lbl(ctx,(s.isMin?'getMin':'result')+' = '+s.result,W/2,H-17,'#34D399',10);
    }
  }
  var ui=makeProbUI(container,{
    canvasW:640,canvasH:300,
    approaches:[{key:'opt',label:'⚡ Track Min Per Push (O(1))'}],
    buildSteps:function(){return buildOptimal(defOps);},
    onStep:function(s){draw(s);},onReset:function(){draw(null);}
  });
  draw(null);
}

/* ════════════════════════════════════════════════════════════
   P40 — Evaluate Reverse Polish Notation
════════════════════════════════════════════════════════════ */
function initEvalRPN(id){
  var container=document.getElementById(id);if(!container)return;
  var defTokens=['2','1','+','3','*'];

  function buildSteps(tokens){
    var steps=[],stack=[];
    steps.push({stack:[],curIdx:-1,msg:'RPN: numbers → push; operators → pop two, compute, push result'});
    tokens.forEach(function(tok,idx){
      if(['+','-','*','/'].indexOf(tok)===-1){
        stack.push(parseInt(tok,10));
        steps.push({stack:stack.slice(),curIdx:idx,msg:'Token "'+tok+'" is a number → push '+tok+'. Stack: ['+stack.join(',')+']'});
      } else {
        var b=stack.pop(),a=stack.pop(),res;
        if(tok==='+')res=a+b;else if(tok==='-')res=a-b;else if(tok==='*')res=a*b;else res=Math.trunc(a/b);
        stack.push(res);
        steps.push({stack:stack.slice(),curIdx:idx,msg:'"'+tok+'": pop '+b+' and '+a+', compute '+a+tok+b+'='+res+' → push '+res+'. Stack: ['+stack.join(',')+']'});
      }
    });
    steps.push({stack:stack.slice(),curIdx:-1,done:true,msg:'Result = '+stack[0]});
    return steps;
  }

  function draw(s){
    var ctx=ui.ctx,W=ui.W,H=ui.H;bg(ctx,W,H);
    var tokens=defTokens,cw=44,ch=36,gap=6;
    var tw=(cw+gap)*tokens.length-gap;var tx=(W-tw)/2;
    // Token row
    lbl(ctx,'Tokens',W/2,28,'rgba(167,139,250,.5)',9);
    tokens.forEach(function(tok,i){
      cell(ctx,tx+i*(cw+gap),38,cw,ch,tok,s&&s.curIdx===i?'active':'default');
    });
    // Stack (horizontal at bottom)
    var stk=s?s.stack:[],n=stk.length;
    lbl(ctx,'Stack →',tx-44,H-60,'rgba(6,182,212,.6)',9);
    for(var i=0;i<n;i++){
      cell(ctx,tx+i*(cw+gap),H-78,cw,ch,stk[i],i===n-1?'found':'selected');
    }
    if(s&&s.done&&s.stack.length){
      lbl(ctx,'= '+s.stack[0],tx+n*(cw+gap)+20,H-60,'#34D399',13);
    }
  }
  var ui=makeProbUI(container,{
    canvasW:660,canvasH:200,
    approaches:[{key:'stk',label:'⚡ Stack Evaluation'}],
    inputs:[{id:'tok',lbl:'Tokens:',elem:inp(defTokens.join(' '),'space-separated',230)}],
    onInputs:function(v){var t=v.tok.trim().split(/\s+/);if(t.length>=2)defTokens=t;},
    buildSteps:function(){return buildSteps(defTokens);},
    onStep:function(s){draw(s);},onReset:function(){draw(null);}
  });
  draw(null);
}

/* ════════════════════════════════════════════════════════════
   P41 — Number of 1 Bits
════════════════════════════════════════════════════════════ */
function initNumberOf1Bits(id){
  var container=document.getElementById(id);if(!container)return;
  var defN=11;

  function buildBrute(n){
    var steps=[],count=0,bits=[];
    for(var i=0;i<32;i++)bits.push((n>>>i)&1);
    steps.push({bits:bits.slice(),cur:-1,count:0,msg:'Brute: check each of the 32 bits with a right shift mask'});
    for(var i=0;i<32;i++){
      var b=(n>>>i)&1;if(b)count++;
      if(i<16||b){
        steps.push({bits:bits.slice(),cur:i,count:count,msg:'Bit '+i+' = '+b+(b?' → count='+count:'')});
      }
    }
    steps.push({bits:bits.slice(),cur:-1,count:count,done:true,msg:'Total 1-bits = '+count});
    return steps;
  }
  function buildOptimal(n){
    var steps=[],count=0,cur=n;
    var bits=[];for(var i=0;i<16;i++)bits.push((n>>>i)&1);
    steps.push({bits:bits.slice(),count:0,cur:n,msg:'Trick: n & (n-1) clears the lowest set bit. Repeat until n=0.'});
    var iter=0;
    while(cur){
      var prev=cur;cur=cur&(cur-1);count++;
      var newBits=[];for(var i=0;i<16;i++)newBits.push((cur>>>i)&1);
      steps.push({bits:newBits.slice(),count:count,cur:cur,msg:iter+': '+prev.toString(2)+' & '+(prev-1).toString(2)+' = '+cur.toString(2)+' (cleared one 1-bit, count='+count+')'});
      iter++;if(iter>32)break;
    }
    steps.push({bits:new Array(16).fill(0),count:count,cur:0,done:true,msg:'n=0 → stop. Total 1-bits = '+count});
    return steps;
  }

  var curAp='a1';
  function draw(s){
    var ctx=ui.ctx,W=ui.W,H=ui.H;bg(ctx,W,H);
    var bits=s?s.bits:(function(){var b=[];for(var i=0;i<16;i++)b.push((defN>>>i)&1);return b;})();
    var show=Math.min(bits.length,16),cw=34,ch=36,gap=3;
    var tw=(cw+gap)*show-gap,sx=(W-tw)/2,sy=H/2-ch/2-10;
    lbl(ctx,'bit index →',sx-54,sy+ch/2,'rgba(167,139,250,.4)',8);
    for(var i=show-1;i>=0;i--){
      var x=sx+(show-1-i)*(cw+gap);
      var b=bits[i]||0;
      var st=b?'found':'water';
      if(s&&s.cur===i)st='active';
      cell(ctx,x,sy,cw,ch,b,st);
      lbl(ctx,String(i),x+cw/2,sy+ch+12,'rgba(139,92,246,.4)',7);
    }
    // Count badge
    if(s){
      ctx.save();rr(ctx,W/2-60,H-38,120,26,5);
      var tg=ctx.createLinearGradient(W/2-60,H-38,W/2+60,H-12);tg.addColorStop(0,'#2E1B6B');tg.addColorStop(1,'#120930');
      ctx.fillStyle=tg;ctx.fill();ctx.strokeStyle=s.done?'rgba(52,211,153,.6)':'rgba(139,92,246,.5)';ctx.lineWidth=1.5;ctx.stroke();ctx.restore();
      lbl(ctx,'1-bits counted: '+s.count,W/2,H-25,s.done?'#34D399':'#A78BFA',10);
    }
    lbl(ctx,'n = '+defN+' = '+defN.toString(2)+'(b)',W/2,18,'rgba(167,139,250,.5)',9);
  }
  var ui=makeProbUI(container,{
    canvasW:660,canvasH:200,
    approaches:[{key:'a1',label:'Bit-Mask Scan O(32)'},{key:'a2',label:'⚡ n & (n−1) Trick'}],
    inputs:[{id:'n',lbl:'n:',elem:inp(String(defN),'',80)}],
    onInputs:function(v){var x=parseInt(v.n,10);if(!isNaN(x)&&x>=0)defN=x;},
    buildSteps:function(a){curAp=a;return a==='a2'?buildOptimal(defN):buildBrute(defN);},
    onStep:function(s){draw(s);},onReset:function(){draw(null);}
  });
  draw(null);
}

/* ════════════════════════════════════════════════════════════
   P42 — Missing Number
════════════════════════════════════════════════════════════ */
function initMissingNumber(id){
  var container=document.getElementById(id);if(!container)return;
  var defArr=[3,0,1];

  function buildBrute(arr){
    var n=arr.length,steps=[];
    steps.push({arr:arr.slice(),cur:-1,msg:'Brute: sort [0..n], scan for the missing gap'});
    var sorted=arr.slice().sort(function(a,b){return a-b;});
    steps.push({arr:sorted.slice(),cur:-1,msg:'Sorted: ['+sorted.join(',')+']'});
    for(var i=0;i<=n;i++){
      if(sorted[i]!==i){steps.push({arr:sorted.slice(),cur:i,found:i,msg:'sorted['+i+']='+sorted[i]+' ≠ '+i+' → missing = '+i});return steps;}
      steps.push({arr:sorted.slice(),cur:i,msg:'sorted['+i+']='+i+' ✓'});
    }
    return steps;
  }
  function buildOptimal(arr){
    var n=arr.length,expected=n*(n+1)/2,actual=arr.reduce(function(a,b){return a+b;},0);
    var steps=[],running=0;
    steps.push({arr:arr.slice(),expected:expected,running:0,msg:'Sum formula: expected = n*(n+1)/2 = '+n+'*'+( n+1)+'/2 = '+expected});
    arr.forEach(function(v,i){running+=v;steps.push({arr:arr.slice(),expected:expected,running:running,cur:i,msg:'Add arr['+i+']='+v+' → sum so far = '+running});});
    steps.push({arr:arr.slice(),expected:expected,running:running,found:expected-actual,done:true,msg:'Missing = expected − actual = '+expected+' − '+actual+' = '+(expected-actual)});
    return steps;
  }

  var curAp='a1';
  function draw(s){
    var ctx=ui.ctx,W=ui.W,H=ui.H;bg(ctx,W,H);
    var arr=s?s.arr:defArr,n=arr.length,cw=50,ch=40,gap=6;
    var tw=(cw+gap)*n-gap,sx=(W-tw)/2,sy=H/2-ch/2-20;
    for(var i=0;i<n;i++){
      var isActive=s&&s.cur===i,isFound=s&&s.found!==undefined&&arr[i]===s.found;
      cell(ctx,sx+i*(cw+gap),sy,cw,ch,arr[i],isFound?'pivot':isActive?'active':'default');
    }
    if(s&&s.expected!=null){
      lbl(ctx,'Expected sum: '+s.expected,W/2,sy+ch+28,'rgba(167,139,250,.6)',10);
      lbl(ctx,'Running sum: '+s.running,W/2,sy+ch+44,'#06B6D4',10);
    }
    if(s&&s.done){
      ctx.save();rr(ctx,W/2-80,H-36,160,26,5);
      var tg=ctx.createLinearGradient(W/2-80,H-36,W/2+80,H-10);tg.addColorStop(0,'rgba(120,40,40,.8)');tg.addColorStop(1,'rgba(60,10,10,.8)');
      ctx.fillStyle=tg;ctx.fill();ctx.strokeStyle='rgba(248,113,113,.6)';ctx.lineWidth=1.5;ctx.stroke();ctx.restore();
      lbl(ctx,'Missing = '+s.found,W/2,H-23,'#F87171',11);
    }
  }
  var ui=makeProbUI(container,{
    canvasW:640,canvasH:220,
    approaches:[{key:'a1',label:'Sort & Scan O(n log n)'},{key:'a2',label:'⚡ Sum Formula O(n)'}],
    inputs:[{id:'a',lbl:'Array:',elem:inp(defArr.join(','),'',150)}],
    onInputs:function(v){var a=v.a.split(',').map(function(x){return parseInt(x.trim(),10);}).filter(function(x){return!isNaN(x);});if(a.length>=2)defArr=a;},
    buildSteps:function(a){curAp=a;return a==='a2'?buildOptimal(defArr):buildBrute(defArr);},
    onStep:function(s){draw(s);},onReset:function(){draw(null);}
  });
  draw(null);
}

/* ════════════════════════════════════════════════════════════
   P43 — Remove Nth Node From End of List
════════════════════════════════════════════════════════════ */
function initRemoveNthFromEnd(id){
  var container=document.getElementById(id);if(!container)return;
  var defArr=[1,2,3,4,5],defN=2;

  function buildBrute(arr,n){
    var steps=[],len=arr.length,target=len-n;
    steps.push({arr:arr.slice(),pass:1,cur:-1,msg:'Two-pass: first count length='+len+', then delete at index '+(len-n)});
    for(var i=0;i<len;i++)steps.push({arr:arr.slice(),pass:1,cur:i,msg:'Pass 1: counting length — at node '+i});
    var res=arr.filter(function(_,i){return i!==target;});
    steps.push({arr:res.slice(),pass:2,removed:arr[target],msg:'Pass 2: remove node at index '+(len-n)+' (value '+arr[target]+') → ['+res.join(',')+']'});
    return steps;
  }
  function buildOptimal(arr,n){
    var steps=[],len=arr.length;
    steps.push({arr:arr.slice(),fast:-1,slow:-1,msg:'One-pass: advance fast '+n+' steps ahead of slow'});
    var fast=n-1;
    for(var i=0;i<n;i++)steps.push({arr:arr.slice(),fast:i,slow:-1,msg:'Advance fast to index '+i});
    fast=n-1;
    var slow=-1;
    while(fast<len-1){fast++;slow++;steps.push({arr:arr.slice(),fast:fast,slow:slow,msg:'Advance both: fast='+fast+', slow='+slow});}
    var target=slow+1;
    var res=arr.filter(function(_,i){return i!==target;});
    steps.push({arr:res.slice(),fast:-1,slow:-1,removed:arr[target],done:true,msg:'Remove slow.next (index '+target+', value '+arr[target]+') → ['+res.join(',')+']'});
    return steps;
  }

  var curAp='a1';
  function draw(s){
    var ctx=ui.ctx,W=ui.W,H=ui.H;bg(ctx,W,H);
    var arr=s?s.arr:defArr,n=arr.length,R=20,sep=Math.min(90,Math.floor((W-80)/Math.max(n,1)));
    var sx=W/2-(n-1)*sep/2,my=H/2-10;
    for(var i=0;i<n-1;i++){
      var x1=sx+i*sep+R+2,x2=sx+(i+1)*sep-R-2;
      ctx.save();ctx.strokeStyle='rgba(160,160,200,.4)';ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(x1,my);ctx.lineTo(x2,my);ctx.stroke();
      ctx.fillStyle='rgba(160,160,200,.4)';ctx.beginPath();ctx.moveTo(x2,my);ctx.lineTo(x2-8,my-4);ctx.lineTo(x2-8,my+4);ctx.closePath();ctx.fill();
      ctx.restore();
    }
    for(var i=0;i<n;i++){
      var cx=sx+i*sep,cy=my;
      var isFast=s&&s.fast===i,isSlow=s&&s.slow===i;
      var fill='rgba(25,15,45,.9)',stroke='rgba(100,100,140,.5)',sw=1.5;
      if(isFast&&isSlow){fill='rgba(139,92,246,.25)';stroke='#A78BFA';sw=2;}
      else if(isFast){fill='rgba(6,182,212,.2)';stroke='#06B6D4';sw=2;}
      else if(isSlow){fill='rgba(236,72,153,.2)';stroke='#EC4899';sw=2;}
      ctx.save();if(sw>2){ctx.shadowColor=stroke;ctx.shadowBlur=10;}
      ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();
      ctx.strokeStyle=stroke;ctx.lineWidth=sw;ctx.stroke();ctx.shadowBlur=0;ctx.restore();
      lbl(ctx,String(arr[i]),cx,cy+1,'#EDE9FE',12);
      if(isFast)lbl(ctx,'F',cx,cy-R-8,'#06B6D4',9);
      if(isSlow)lbl(ctx,'S',cx,cy-R-8,'#EC4899',9);
    }
    if(s&&s.removed!=null)lbl(ctx,'Removed: '+s.removed,W/2,H-22,'#F87171',10);
    lbl(ctx,'n='+defN,20,20,'rgba(167,139,250,.5)',9);
  }
  var ui=makeProbUI(container,{
    canvasW:680,canvasH:210,
    approaches:[{key:'a1',label:'Two Pass O(n)'},{key:'a2',label:'⚡ One Pass Fast/Slow'}],
    inputs:[{id:'a',lbl:'List:',elem:inp(defArr.join(','),'',160)},{id:'n',lbl:'n:',elem:inp(String(defN),'',50)}],
    onInputs:function(v){var a=v.a.split(',').map(function(x){return parseInt(x.trim(),10);}).filter(function(x){return!isNaN(x);});var n=parseInt(v.n,10);if(a.length>=2&&!isNaN(n)&&n>=1&&n<=a.length){defArr=a;defN=n;}},
    buildSteps:function(a){curAp=a;return a==='a2'?buildOptimal(defArr,defN):buildBrute(defArr,defN);},
    onStep:function(s){draw(s);},onReset:function(){draw(null);}
  });
  draw(null);
}

/* ════════════════════════════════════════════════════════════
   P44 — Longest Consecutive Sequence
════════════════════════════════════════════════════════════ */
function initLongestConsecutive(id){
  var container=document.getElementById(id);if(!container)return;
  var defArr=[100,4,200,1,3,2];

  function buildBrute(arr){
    var steps=[],sorted=arr.slice().sort(function(a,b){return a-b;}),best=1,cur=1;
    steps.push({arr:sorted.slice(),seq:[sorted[0]],best:1,msg:'Sort: ['+sorted.join(',')+'] then scan for consecutive runs'});
    for(var i=1;i<sorted.length;i++){
      if(sorted[i]===sorted[i-1])continue;
      if(sorted[i]===sorted[i-1]+1){cur++;if(cur>best)best=cur;}
      else cur=1;
      var seqStart=i-cur+1;
      steps.push({arr:sorted.slice(),lo:seqStart,hi:i,best:best,cur:cur,msg:'arr['+i+']='+sorted[i]+': streak='+cur+', best='+best});
    }
    steps.push({arr:sorted.slice(),best:best,done:true,msg:'Longest consecutive sequence length = '+best});
    return steps;
  }
  function buildOptimal(arr){
    var set=new Set(arr),steps=[],best=0,checked={};
    steps.push({arr:arr.slice(),seq:[],best:0,checked:{},msg:'Hash Set: only start counting from left-boundary numbers (num-1 not in set)'});
    arr.forEach(function(num){
      if(!set.has(num-1)&&!checked[num]){
        var cur=num,len=0,seq=[];
        while(set.has(cur)){seq.push(cur);cur++;len++;}
        if(len>best)best=len;
        seq.forEach(function(v){checked[v]=true;});
        steps.push({arr:arr.slice(),seq:seq.slice(),best:best,checked:Object.assign({},checked),msg:'Start from '+num+': sequence ['+seq.join(',')+'] length='+len+', best='+best});
      } else if(!checked[num]){
        steps.push({arr:arr.slice(),seq:[],best:best,checked:Object.assign({},checked),msg:'Skip '+num+': '+( num-1)+' is in set (not a left boundary)'});
      }
    });
    steps.push({arr:arr.slice(),best:best,done:true,msg:'Longest consecutive sequence = '+best+' (O(n) time)'});
    return steps;
  }

  var curAp='a1';
  function draw(s){
    var ctx=ui.ctx,W=ui.W,H=ui.H;bg(ctx,W,H);
    var arr=s?s.arr:defArr,n=arr.length,cw=52,ch=40,gap=6;
    var tw=(cw+gap)*n-gap,sx=(W-tw)/2,sy=H/2-ch/2-16;
    arr.forEach(function(v,i){
      var inSeq=s&&s.seq&&s.seq.includes(v);
      var checked=s&&s.checked&&s.checked[v];
      var st=inSeq?'found':checked?'sorted':'default';
      cell(ctx,sx+i*(cw+gap),sy,cw,ch,v,st);
    });
    if(s&&s.best!=null)lbl(ctx,'Best so far: '+s.best,W/2,sy+ch+28,'#A78BFA',10);
    if(s&&s.seq&&s.seq.length)lbl(ctx,'Current seq: ['+s.seq.join(',')+']',W/2,sy+ch+44,'#34D399',10);
  }
  var ui=makeProbUI(container,{
    canvasW:680,canvasH:210,
    approaches:[{key:'a1',label:'Sort O(n log n)'},{key:'a2',label:'⚡ Hash Set O(n)'}],
    inputs:[{id:'a',lbl:'Array:',elem:inp(defArr.join(','),'',200)}],
    onInputs:function(v){var a=v.a.split(',').map(function(x){return parseInt(x.trim(),10);}).filter(function(x){return!isNaN(x);});if(a.length>=2)defArr=a;},
    buildSteps:function(a){curAp=a;return a==='a2'?buildOptimal(defArr):buildBrute(defArr);},
    onStep:function(s){draw(s);},onReset:function(){draw(null);}
  });
  draw(null);
}

/* ════════════════════════════════════════════════════════════
   P45 — Maximum Product Subarray
════════════════════════════════════════════════════════════ */
function initMaxProductSubarray(id){
  var container=document.getElementById(id);if(!container)return;
  var defArr=[2,3,-2,4];

  function buildBrute(arr){
    var steps=[],best=-Infinity;
    steps.push({arr:arr.slice(),lo:0,hi:0,prod:null,best:null,msg:'Brute: check all O(n²) subarrays'});
    for(var i=0;i<arr.length;i++){
      var p=1;
      for(var j=i;j<arr.length;j++){
        p*=arr[j];if(p>best)best=p;
        steps.push({arr:arr.slice(),lo:i,hi:j,prod:p,best:best,msg:'['+i+'..'+j+']: product='+p+', best='+best});
      }
    }
    steps.push({arr:arr.slice(),lo:-1,hi:-1,prod:null,best:best,done:true,msg:'Max product = '+best});
    return steps;
  }
  function buildOptimal(arr){
    var steps=[],best=arr[0],curMax=arr[0],curMin=arr[0];
    steps.push({arr:arr.slice(),idx:0,curMax:arr[0],curMin:arr[0],best:arr[0],msg:'Track curMax and curMin (negatives can flip sign)'});
    for(var i=1;i<arr.length;i++){
      var v=arr[i];
      var candidates=[v,curMax*v,curMin*v];
      var newMax=Math.max.apply(null,candidates);
      var newMin=Math.min.apply(null,candidates);
      curMax=newMax;curMin=newMin;
      if(curMax>best)best=curMax;
      steps.push({arr:arr.slice(),idx:i,curMax:curMax,curMin:curMin,best:best,msg:'arr['+i+']='+v+': max='+curMax+', min='+curMin+', best='+best});
    }
    steps.push({arr:arr.slice(),idx:-1,curMax:curMax,curMin:curMin,best:best,done:true,msg:'Max product subarray = '+best});
    return steps;
  }

  var curAp='a1';
  function draw(s){
    var ctx=ui.ctx,W=ui.W,H=ui.H;bg(ctx,W,H);
    var arr=defArr,n=arr.length,cw=56,ch=42,gap=6;
    var tw=(cw+gap)*n-gap,sx=(W-tw)/2,sy=H/2-ch/2-22;
    arr.forEach(function(v,i){
      var inRange=s&&s.lo!=null&&s.lo<=i&&i<=s.hi;
      var isEdge=s&&(i===s.lo||i===s.hi);
      cell(ctx,sx+i*(cw+gap),sy,cw,ch,v,inRange?(isEdge?'active':'selected'):(s&&s.idx===i?'active':'default'));
    });
    if(s&&s.curMax!=null){
      lbl(ctx,'curMax: '+s.curMax,W/2-80,sy+ch+28,'#34D399',10);
      lbl(ctx,'curMin: '+s.curMin,W/2+20,sy+ch+28,'#F87171',10);
    }
    if(s&&s.best!=null){
      ctx.save();rr(ctx,W/2-70,H-36,140,26,5);
      var tg=ctx.createLinearGradient(W/2-70,H-36,W/2+70,H-10);tg.addColorStop(0,'rgba(5,46,26,.8)');tg.addColorStop(1,'rgba(6,46,26,.4)');
      ctx.fillStyle=tg;ctx.fill();ctx.strokeStyle='rgba(52,211,153,.5)';ctx.lineWidth=1.5;ctx.stroke();ctx.restore();
      lbl(ctx,'Best = '+s.best,W/2,H-23,'#34D399',10);
    }
  }
  var ui=makeProbUI(container,{
    canvasW:660,canvasH:210,
    approaches:[{key:'a1',label:'Brute O(n²)'},{key:'a2',label:'⚡ Track Max & Min O(n)'}],
    inputs:[{id:'a',lbl:'Array:',elem:inp(defArr.join(','),'',180)}],
    onInputs:function(v){var a=v.a.split(',').map(function(x){return parseInt(x.trim(),10);}).filter(function(x){return!isNaN(x);});if(a.length>=2)defArr=a;},
    buildSteps:function(a){curAp=a;return a==='a2'?buildOptimal(defArr):buildBrute(defArr);},
    onStep:function(s){draw(s);},onReset:function(){draw(null);}
  });
  draw(null);
}

/* ════════════════════════════════════════════════════════════
   P46 — Balanced Binary Tree
════════════════════════════════════════════════════════════ */
function initBalancedBinaryTree(id){
  var container=document.getElementById(id);if(!container)return;
  var defArr=[3,9,20,null,null,15,7];

  function buildNaive(arr){
    var steps=[],r=_mkTree(arr);
    if(!r)return steps;
    steps.push({hl:{},msg:'Naive O(n²): compute height for EVERY subtree from scratch'});
    function height(n){if(!n)return 0;return 1+Math.max(height(n.left),height(n.right));}
    var balanced=true;
    function check(n){
      if(!n)return;
      var lh=height(n.left),rh=height(n.right);
      var ok=Math.abs(lh-rh)<=1;
      if(!ok)balanced=false;
      var hl2={};hl2[n.val]=ok?'comparing':'pivot';
      steps.push({hl:hl2,lh:lh,rh:rh,ok:ok,msg:'Node '+n.val+': height(left)='+lh+', height(right)='+rh+' → |diff|='+Math.abs(lh-rh)+(ok?' ✓':' ✗ UNBALANCED')});
      check(n.left);check(n.right);
    }
    check(r);
    var doneHl={};var all=[];_collectAll(r,all);all.forEach(function(n){doneHl[n.val]=balanced?'found':'pivot';});
    steps.push({hl:doneHl,done:true,balanced:balanced,msg:'Tree is '+(balanced?'balanced ✓':'NOT balanced ✗')});
    return steps;
  }
  function buildOptimal(arr){
    var steps=[],r=_mkTree(arr);
    if(!r)return steps;
    steps.push({hl:{},msg:'Optimal O(n): DFS returns height or −1 (unbalanced). One pass only.'});
    var balanced=true;
    function dfs(n,hl){
      if(!n)return 0;
      var hl2=Object.assign({},hl);hl2[n.val]='comparing';
      steps.push({hl:hl2,msg:'Check '+n.val});
      var lh=dfs(n.left,hl2);
      if(lh===-1)return -1;
      var rh=dfs(n.right,hl2);
      if(rh===-1)return -1;
      var ok=Math.abs(lh-rh)<=1;
      if(!ok)balanced=false;
      hl2=Object.assign({},hl2);hl2[n.val]=ok?'found':'pivot';
      steps.push({hl:hl2,msg:'height('+n.val+'): left='+lh+', right='+rh+(ok?' → height='+(1+Math.max(lh,rh)):' → |diff|>1 return −1 (UNBALANCED)')});
      return ok?1+Math.max(lh,rh):-1;
    }
    var res=dfs(r,{});
    var doneHl={};var all=[];_collectAll(r,all);all.forEach(function(n){doneHl[n.val]=res!==-1?'found':'pivot';});
    steps.push({hl:doneHl,done:true,balanced:res!==-1,msg:'Result: '+(res!==-1?'Balanced ✓ (height='+res+')':'NOT Balanced ✗')});
    return steps;
  }

  var curAp='a1';
  function draw(s){
    bg(ui.ctx,ui.W,ui.H);
    var r=_mkTree(defArr);
    _drawTree(ui.ctx,r,ui.W,ui.H-34,s&&s.hl?s.hl:{});
    if(s&&s.done){
      var col=s.balanced?'#34D399':'#F87171';
      lbl(ui.ctx,s.balanced?'✓ Balanced':'✗ Not Balanced',ui.W/2,ui.H-18,col,11);
    }
  }
  var ui=makeProbUI(container,{
    canvasW:660,canvasH:280,
    approaches:[{key:'a1',label:'Naive O(n²)'},{key:'a2',label:'⚡ DFS O(n) — return height or −1'}],
    buildSteps:function(a){curAp=a;return a==='a2'?buildOptimal(defArr):buildNaive(defArr);},
    onStep:function(s){draw(s);},onReset:function(){draw(null);}
  });
  draw(null);
}

/* ════════════════════════════════════════════════════════════
   P47 — Diameter of Binary Tree
════════════════════════════════════════════════════════════ */
function initDiameterBinaryTree(id){
  var container=document.getElementById(id);if(!container)return;
  var defArr=[1,2,3,4,5];
  function buildBrute(arr){
    var steps=[],best=0,root=_mkTree(arr),all=[];_collectAll(root,all);
    function h(n){return n?1+Math.max(h(n.left),h(n.right)):0;}
    steps.push({hl:{},d:0,msg:'Brute: for each node, compute height(left)+height(right). O(n) per node → O(n²) total.'});
    all.forEach(function(n){
      var lh=h(n.left),rh=h(n.right),d=lh+rh;if(d>best)best=d;
      var hl={};hl[n.val]='active';
      steps.push({hl:hl,d:best,msg:'Node '+n.val+': lh='+lh+' rh='+rh+' span='+d+' best='+best});
    });
    steps.push({hl:{},d:best,done:true,msg:'Diameter = '+best});
    return steps;
  }
  function buildOptimal(arr){
    var steps=[],best=0,root=_mkTree(arr),order=[];
    function dfs(n){if(!n)return 0;var l=dfs(n.left),r=dfs(n.right);if(l+r>best)best=l+r;order.push({val:n.val,l:l,r:r,best:best});return 1+Math.max(l,r);}
    dfs(root);
    steps.push({hl:{},d:0,msg:'Optimal: single DFS. Return height bottom-up; update diameter as side effect.'});
    order.forEach(function(e){var hl={};hl[e.val]='active';steps.push({hl:hl,d:e.best,msg:'↑ node '+e.val+' lh='+e.l+' rh='+e.r+' diameter='+e.best});});
    steps.push({hl:{},d:best,done:true,msg:'Diameter = '+best});
    return steps;
  }
  function draw(s,ctx,W,H){
    bg(ctx,W,H);_drawTree(ctx,_mkTree(defArr),W,H-52,s?s.hl:{});
    lbl(ctx,'Diameter: '+(s?s.d:'—'),W/2,H-22,s&&s.done?'#34d399':'#c4b5fd',13,'center');
  }
  makeProbUI(container,{canvasW:660,canvasH:290,
    approaches:[{key:'a1',label:'Brute O(n²)'},{key:'a2',label:'Optimal O(n) DFS'}],
    inputs:[{id:'arr',lbl:'Tree:',elem:inp(defArr.join(','),'level-order',200)}],
    onInputs:function(v){var a=v.arr.split(',').map(function(x){var t=x.trim();return t==='null'?null:+t;});if(a.length)defArr=a;},
    buildSteps:function(ap){return ap==='a1'?buildBrute(defArr):buildOptimal(defArr);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},onReset:function(ctx,W,H){draw(null,ctx,W,H);}});
}

/* ════════════════════════════════════════════════════════════
   P48 — Same Tree
════════════════════════════════════════════════════════════ */
function initSameTree(id){
  var container=document.getElementById(id);if(!container)return;
  var defA=[1,2,3],defB=[1,2,3];
  function buildSteps(a,b){
    var steps=[],ra=_mkTree(a),rb=_mkTree(b),ok=true,pairs=[];
    function cmp(na,nb){
      if(!na&&!nb){pairs.push({a:null,b:null,match:true,msg:'Both null → match'});return;}
      if(!na||!nb){ok=false;pairs.push({a:na?na.val:null,b:nb?nb.val:null,match:false,msg:'Structure mismatch: '+(na?na.val:'null')+' vs '+(nb?nb.val:'null')});return;}
      var eq=na.val===nb.val;if(!eq)ok=false;
      pairs.push({a:na.val,b:nb.val,match:eq,msg:'Compare '+na.val+' vs '+nb.val+(eq?' → match':' → MISMATCH!')});
      if(eq){cmp(na.left,nb.left);cmp(na.right,nb.right);}
    }
    cmp(ra,rb);
    steps.push({hlA:{},hlB:{},res:null,msg:'DFS: compare trees node by node — values and structure must match.'});
    pairs.forEach(function(p){
      var hA={},hB={};
      if(p.a!=null)hA[p.a]=p.match?'found':'pivot';
      if(p.b!=null)hB[p.b]=p.match?'found':'pivot';
      steps.push({hlA:hA,hlB:hB,res:null,msg:p.msg});
    });
    steps.push({hlA:{},hlB:{},res:ok,done:true,msg:'Result: '+(ok?'SAME TREE ✓':'DIFFERENT ✗')});
    return steps;
  }
  function draw(s,ctx,W,H){
    bg(ctx,W,H);var hw=W/2-8;
    _drawTree(ctx,_mkTree(defA),hw,H-45,s?s.hlA:{});
    ctx.save();ctx.translate(W/2+8,0);_drawTree(ctx,_mkTree(defB),hw,H-45,s?s.hlB:{});ctx.restore();
    lbl(ctx,'Tree 1',hw/2,18,'rgba(167,139,250,.5)',9,'center');
    lbl(ctx,'Tree 2',W/2+8+hw/2,18,'rgba(167,139,250,.5)',9,'center');
    ctx.save();ctx.strokeStyle='rgba(139,92,246,.18)';ctx.lineWidth=1;ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.moveTo(W/2,28);ctx.lineTo(W/2,H-45);ctx.stroke();ctx.restore();
    if(s&&s.done)lbl(ctx,s.res?'SAME ✓':'DIFFERENT ✗',W/2,H-18,s.res?'#34d399':'#f87171',14,'center');
  }
  makeProbUI(container,{canvasW:660,canvasH:290,
    approaches:[{key:'a1',label:'DFS Recursive O(n)'}],
    inputs:[{id:'a',lbl:'Tree 1:',elem:inp(defA.join(','),'level-order',140)},{id:'b',lbl:'Tree 2:',elem:inp(defB.join(','),'level-order',140)}],
    onInputs:function(v){
      var pa=v.a.split(',').map(function(x){var t=x.trim();return t==='null'?null:+t;});
      var pb=v.b.split(',').map(function(x){var t=x.trim();return t==='null'?null:+t;});
      if(pa.length)defA=pa;if(pb.length)defB=pb;
    },
    buildSteps:function(){return buildSteps(defA,defB);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},onReset:function(ctx,W,H){draw(null,ctx,W,H);}});
}

/* ════════════════════════════════════════════════════════════
   P49 — Subtree of Another Tree
════════════════════════════════════════════════════════════ */
function initSubtreeCheck(id){
  var container=document.getElementById(id);if(!container)return;
  var defRoot=[3,4,5,1,2],defSub=[4,1,2];
  function sameT(a,b){if(!a&&!b)return true;if(!a||!b)return false;return a.val===b.val&&sameT(a.left,b.left)&&sameT(a.right,b.right);}
  function buildSteps(rArr,sArr){
    var steps=[],root=_mkTree(rArr),sub=_mkTree(sArr),found=false,foundVal=null,all=[];
    _collectAll(root,all);
    steps.push({hlR:{},msg:'Check sameTree(node, sub) at every node in root. Stop when found.'});
    all.forEach(function(n){
      if(found)return;
      var same=sameT(n,sub);if(same){found=true;foundVal=n.val;}
      var hr={};hr[n.val]=same?'found':'active';
      steps.push({hlR:hr,found:found,msg:'sameTree('+n.val+', '+sub.val+') = '+(same?'true ✓':'false')});
    });
    steps.push({hlR:{},found:found,done:true,msg:found?'Subtree found at node '+foundVal+' ✓':'Not a subtree ✗'});
    return steps;
  }
  function draw(s,ctx,W,H){
    bg(ctx,W,H);var w1=Math.floor(W*0.62);var w2=W-w1-8;
    _drawTree(ctx,_mkTree(defRoot),w1,H-45,s?s.hlR:{});
    ctx.save();ctx.translate(w1+8,30);_drawTree(ctx,_mkTree(defSub),w2,H-80,{});ctx.restore();
    lbl(ctx,'Root Tree',w1/2,18,'rgba(167,139,250,.5)',9,'center');
    lbl(ctx,'Sub Tree',w1+8+w2/2,18,'rgba(167,139,250,.5)',9,'center');
    ctx.save();ctx.strokeStyle='rgba(139,92,246,.18)';ctx.lineWidth=1;ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.moveTo(w1+4,26);ctx.lineTo(w1+4,H-45);ctx.stroke();ctx.restore();
    if(s&&s.done)lbl(ctx,s.found?'Found ✓':'Not Found ✗',W/2,H-18,s.found?'#34d399':'#f87171',13,'center');
  }
  makeProbUI(container,{canvasW:660,canvasH:290,
    approaches:[{key:'a1',label:'sameTree at Each Node O(m·n)'}],
    inputs:[{id:'r',lbl:'Root:',elem:inp(defRoot.join(','),'level-order',170)},{id:'s',lbl:'Sub:',elem:inp(defSub.join(','),'level-order',110)}],
    onInputs:function(v){
      var pr=v.r.split(',').map(function(x){var t=x.trim();return t==='null'?null:+t;});
      var ps=v.s.split(',').map(function(x){var t=x.trim();return t==='null'?null:+t;});
      if(pr.length)defRoot=pr;if(ps.length)defSub=ps;
    },
    buildSteps:function(){return buildSteps(defRoot,defSub);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},onReset:function(ctx,W,H){draw(null,ctx,W,H);}});
}

/* ════════════════════════════════════════════════════════════
   P50 — Binary Tree Right Side View
════════════════════════════════════════════════════════════ */
function initRightSideView(id){
  var container=document.getElementById(id);if(!container)return;
  var defArr=[1,2,3,null,5,null,4];
  function buildBFS(arr){
    var steps=[],root=_mkTree(arr),result=[];if(!root)return[{hl:{},result:[],msg:'Empty tree'}];
    var q=[root];
    steps.push({hl:{},result:[],msg:'BFS: snapshot queue size per level; last dequeued = rightmost.'});
    while(q.length){
      var sz=q.length,last=null;
      for(var i=0;i<sz;i++){
        var n=q.shift();last=n;
        if(n.left)q.push(n.left);if(n.right)q.push(n.right);
        var hl={};hl[n.val]=i===sz-1?'found':'active';
        steps.push({hl:hl,result:result.slice(),msg:'Level node: '+n.val+(i===sz-1?' ← rightmost':'')});
      }
      result.push(last.val);
      steps.push({hl:{},result:result.slice(),msg:'Level done. Add '+last.val+' to view: ['+result.join(',')+']'});
    }
    steps.push({hl:{},result:result,done:true,msg:'Right side view: ['+result.join(',')+']'});
    return steps;
  }
  function buildDFS(arr){
    var steps=[],root=_mkTree(arr),result=[],maxD=-1,order=[];
    function dfs(n,d){if(!n)return;dfs(n.right,d+1);if(d>maxD){maxD=d;result.push(n.val);order.push({val:n.val,d:d,result:result.slice()});}dfs(n.left,d+1);}
    steps.push({hl:{},result:[],msg:'DFS right-first: first node seen at each depth is the rightmost.'});
    dfs(root,0);
    order.forEach(function(e){var hl={};hl[e.val]='found';steps.push({hl:hl,result:e.result.slice(),msg:'Depth '+e.d+': rightmost = '+e.val+'. View: ['+e.result.join(',')+']'});});
    steps.push({hl:{},result:result,done:true,msg:'Right side view: ['+result.join(',')+']'});
    return steps;
  }
  function draw(s,ctx,W,H){
    bg(ctx,W,H);_drawTree(ctx,_mkTree(defArr),W,H-56,s?s.hl:{});
    var res=s?s.result:[],cw=34,gh=5,tw=(cw+gh)*res.length-gh,ox=(W-tw)/2;
    lbl(ctx,'Right View →',W/2,H-38,'rgba(167,139,250,.5)',9,'center');
    for(var i=0;i<res.length;i++)cell(ctx,ox+i*(cw+gh),H-28,cw,22,res[i],s&&s.done?'found':'selected');
  }
  makeProbUI(container,{canvasW:660,canvasH:310,
    approaches:[{key:'a1',label:'BFS Level Snapshot'},{key:'a2',label:'DFS Right-First'}],
    inputs:[{id:'arr',lbl:'Tree:',elem:inp(defArr.map(function(x){return x===null?'null':x;}).join(','),'level-order',240)}],
    onInputs:function(v){var a=v.arr.split(',').map(function(x){var t=x.trim();return t==='null'?null:+t;});if(a.length)defArr=a;},
    buildSteps:function(ap){return ap==='a1'?buildBFS(defArr):buildDFS(defArr);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},onReset:function(ctx,W,H){draw(null,ctx,W,H);}});
}

/* ════════════════════════════════════════════════════════════
   P51 — Count Good Nodes in Binary Tree
════════════════════════════════════════════════════════════ */
function initCountGoodNodes(id){
  var container=document.getElementById(id);if(!container)return;
  var defArr=[3,1,4,3,null,1,5];
  function buildSteps(arr){
    var steps=[],count=0,root=_mkTree(arr),order=[];
    function dfs(n,mx){
      if(!n)return;
      var good=n.val>=mx;if(good)count++;
      order.push({val:n.val,mx:mx,good:good,count:count});
      dfs(n.left,Math.max(mx,n.val));dfs(n.right,Math.max(mx,n.val));
    }
    steps.push({hl:{},count:0,msg:'DFS: pass max-so-far down path. Node is "good" if val ≥ max on path from root.'});
    dfs(root,-Infinity);
    order.forEach(function(e){
      var hl={};hl[e.val]=e.good?'found':'comparing';
      steps.push({hl:hl,count:e.count,msg:'Node '+e.val+' (path-max='+e.mx+'): '+(e.good?'GOOD ✓ count='+e.count:'skip ('+e.val+'<'+e.mx+')')});
    });
    steps.push({hl:{},count:count,done:true,msg:'Good nodes = '+count});
    return steps;
  }
  function draw(s,ctx,W,H){
    bg(ctx,W,H);_drawTree(ctx,_mkTree(defArr),W,H-52,s?s.hl:{});
    lbl(ctx,'Good: '+(s?s.count:'—'),W*0.18,H-22,s&&s.done?'#34d399':'#c4b5fd',13,'center');
    ctx.save();ctx.fillStyle='#34d399';ctx.fillRect(W*0.36,H-28,9,9);ctx.restore();
    lbl(ctx,'good',W*0.36+20,H-23,'rgba(52,211,153,.7)',9,'left');
    ctx.save();ctx.fillStyle='#fb923c';ctx.fillRect(W*0.52,H-28,9,9);ctx.restore();
    lbl(ctx,'skip',W*0.52+20,H-23,'rgba(251,146,60,.7)',9,'left');
  }
  makeProbUI(container,{canvasW:660,canvasH:300,
    approaches:[{key:'a1',label:'DFS Path-Max O(n)'}],
    inputs:[{id:'arr',lbl:'Tree:',elem:inp(defArr.map(function(x){return x===null?'null':x;}).join(','),'level-order',240)}],
    onInputs:function(v){var a=v.arr.split(',').map(function(x){var t=x.trim();return t==='null'?null:+t;});if(a.length)defArr=a;},
    buildSteps:function(){return buildSteps(defArr);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},onReset:function(ctx,W,H){draw(null,ctx,W,H);}});
}

/* ════════════════════════════════════════════════════════════
   P52 — Kth Smallest Element in a BST
════════════════════════════════════════════════════════════ */
function initKthSmallestBST(id){
  var container=document.getElementById(id);if(!container)return;
  var defArr=[3,1,4,null,2],defK=1;
  function buildBrute(arr,k){
    var steps=[],vals=[],root=_mkTree(arr);
    function ino(n){if(!n)return;ino(n.left);vals.push(n.val);ino(n.right);}
    ino(root);
    var seq=[];
    steps.push({hl:{},seq:[],ans:null,msg:'Brute: full inorder traversal → sorted array → return index k−1.'});
    vals.forEach(function(v){seq.push(v);var hl={};hl[v]='active';steps.push({hl:hl,seq:seq.slice(),ans:null,msg:'Inorder: '+v+' → ['+seq.join(',')+']'});});
    steps.push({hl:{},seq:vals,ans:vals[k-1],done:true,msg:'k='+k+' → index '+(k-1)+' → ans = '+vals[k-1]});
    return steps;
  }
  function buildOptimal(arr,k){
    var steps=[],cnt=0,ans=null,seq=[],root=_mkTree(arr),order=[];
    function ino(n){if(!n||ans!==null)return;ino(n.left);cnt++;seq.push(n.val);if(cnt===k)ans=n.val;order.push({val:n.val,cnt:cnt,ans:ans,seq:seq.slice()});ino(n.right);}
    steps.push({hl:{},seq:[],ans:null,msg:'Optimal: inorder of BST is sorted. Count nodes, stop at k.'});
    ino(root);
    order.forEach(function(e){var hl={};hl[e.val]=e.cnt===k?'found':'active';steps.push({hl:hl,seq:e.seq,ans:e.ans,msg:'Visit '+e.val+' (count='+e.cnt+')'+(e.cnt===k?' = k! → stop':'')});});
    steps.push({hl:{},seq:seq,ans:ans,done:true,msg:'k='+k+' → '+ans});
    return steps;
  }
  function draw(s,ctx,W,H){
    bg(ctx,W,H);_drawTree(ctx,_mkTree(defArr),W*0.56,H-52,s?s.hl:{});
    var seq=s&&s.seq?s.seq:[],cw=32,gh=4,ox=W*0.60;
    lbl(ctx,'Inorder',ox+cw/2,26,'rgba(167,139,250,.5)',9,'center');
    seq.forEach(function(v,i){cell(ctx,ox,34+i*(22+gh),cw,22,v,s&&s.ans===v&&s.done?'found':(i===seq.length-1?'active':'sorted'));});
    if(s&&s.ans!=null)lbl(ctx,'ans='+s.ans,ox+cw/2,H-22,s.done?'#34d399':'#c4b5fd',13,'center');
  }
  makeProbUI(container,{canvasW:660,canvasH:300,
    approaches:[{key:'a1',label:'Brute: Full Traversal'},{key:'a2',label:'Optimal: Stop at k'}],
    inputs:[{id:'arr',lbl:'BST:',elem:inp(defArr.map(function(x){return x===null?'null':x;}).join(','),'level-order',180)},{id:'k',lbl:'k:',elem:inp(String(defK),'',40)}],
    onInputs:function(v){var a=v.arr.split(',').map(function(x){var t=x.trim();return t==='null'?null:+t;});var k=parseInt(v.k,10);if(a.length)defArr=a;if(k>0)defK=k;},
    buildSteps:function(ap){return ap==='a1'?buildBrute(defArr,defK):buildOptimal(defArr,defK);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},onReset:function(ctx,W,H){draw(null,ctx,W,H);}});
}

/* ════════════════════════════════════════════════════════════
   P53 — Lowest Common Ancestor of BST
════════════════════════════════════════════════════════════ */
function initLCAofBST(id){
  var container=document.getElementById(id);if(!container)return;
  var defArr=[6,2,8,0,4,7,9],defP=2,defQ=4;
  function pathTo(root,target){
    var path=[],n=root;
    while(n){path.push(n.val);if(n.val===target)return path;n=target<n.val?n.left:n.right;}
    return path;
  }
  function buildBrute(arr,p,q){
    var steps=[],root=_mkTree(arr);
    var pp=pathTo(root,p),pq=pathTo(root,q),lca=null;
    steps.push({hl:{},msg:'Naive: find path root→p and root→q; last common node is the LCA.'});
    steps.push({hl:{},msg:'Path to '+p+': ['+pp.join('→')+']'});
    steps.push({hl:{},msg:'Path to '+q+': ['+pq.join('→')+']'});
    for(var i=0;i<Math.min(pp.length,pq.length);i++){if(pp[i]===pq[i])lca=pp[i];else break;}
    var hl={};if(lca!==null){hl[lca]='found';hl[p]='active';hl[q]='selected';}
    steps.push({hl:hl,lca:lca,done:true,msg:'Last common node: LCA('+p+','+q+') = '+lca});
    return steps;
  }
  function buildOptimal(arr,p,q){
    var steps=[],root=_mkTree(arr),cur=root,lca=null;
    steps.push({hl:{},msg:'BST property: if both < node → left; if both > node → right; else node is LCA.'});
    while(cur){
      var hl={};hl[cur.val]='active';
      if(p<cur.val&&q<cur.val){steps.push({hl:hl,msg:'Both '+p+','+q+' < '+cur.val+' → go left'});cur=cur.left;}
      else if(p>cur.val&&q>cur.val){steps.push({hl:hl,msg:'Both '+p+','+q+' > '+cur.val+' → go right'});cur=cur.right;}
      else{lca=cur.val;var fh={};fh[lca]='found';fh[p]='active';fh[q]='selected';steps.push({hl:fh,lca:lca,done:true,msg:'Split point! LCA('+p+','+q+') = '+lca+' ✓'});break;}
    }
    return steps;
  }
  function draw(s,ctx,W,H){
    bg(ctx,W,H);_drawTree(ctx,_mkTree(defArr),W,H-52,s?s.hl:{});
    lbl(ctx,'p='+defP+'  q='+defQ,W/2,H-34,'rgba(167,139,250,.5)',9,'center');
    if(s&&s.lca!=null)lbl(ctx,'LCA = '+s.lca,W/2,H-18,s.done?'#34d399':'#c4b5fd',14,'center');
  }
  makeProbUI(container,{canvasW:660,canvasH:310,
    approaches:[{key:'a1',label:'Naive Path Comparison'},{key:'a2',label:'Optimal BST Traversal O(h)'}],
    inputs:[{id:'arr',lbl:'BST:',elem:inp(defArr.join(','),'level-order',180)},{id:'p',lbl:'p:',elem:inp(String(defP),'',36)},{id:'q',lbl:'q:',elem:inp(String(defQ),'',36)}],
    onInputs:function(v){var a=v.arr.split(',').map(function(x){var t=x.trim();return t==='null'?null:+t;});if(a.length)defArr=a;var p=parseInt(v.p,10),q=parseInt(v.q,10);if(!isNaN(p))defP=p;if(!isNaN(q))defQ=q;},
    buildSteps:function(ap){return ap==='a1'?buildBrute(defArr,defP,defQ):buildOptimal(defArr,defP,defQ);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},onReset:function(ctx,W,H){draw(null,ctx,W,H);}});
}

/* ════════════════════════════════════════════════════════════
   P54 — Word Search
════════════════════════════════════════════════════════════ */
function initWordSearch(id){
  var container=document.getElementById(id);if(!container)return;
  var defGrid=[['A','B','C','E'],['S','F','C','S'],['A','D','E','E']];
  var defWord='ABCCED';
  function buildSteps(grid,word){
    var R=grid.length,C=grid[0].length,steps=[],path=[],found=false;
    steps.push({path:[],found:false,msg:'DFS backtracking: try each cell as start, explore 4 dirs, unmark on backtrack.'});
    function dfs(r,c,idx,vis){
      if(idx===word.length){found=true;return true;}
      if(r<0||r>=R||c<0||c>=C||vis[r+','+c]||grid[r][c]!==word[idx])return false;
      vis[r+','+c]=true;path.push({r:r,c:c});
      steps.push({path:path.map(function(x){return{r:x.r,c:x.c};}),found:false,msg:'Match word['+idx+']='+word[idx]+' at ('+r+','+c+'). Path: '+path.map(function(x){return grid[x.r][x.c];}).join('→')});
      var ok=dfs(r+1,c,idx+1,vis)||dfs(r-1,c,idx+1,vis)||dfs(r,c+1,idx+1,vis)||dfs(r,c-1,idx+1,vis);
      if(!ok){path.pop();delete vis[r+','+c];}
      return ok;
    }
    var done=false;
    for(var r=0;r<R&&!done;r++)for(var c=0;c<C&&!done;c++)if(grid[r][c]===word[0]&&dfs(r,c,0,{}))done=true;
    steps.push({path:path.map(function(x){return{r:x.r,c:x.c};}),found:found,done:true,msg:found?'Found "'+word+'" ✓':'Not found ✗'});
    return steps;
  }
  function draw(s,ctx,W,H){
    bg(ctx,W,H);var grid=defGrid,R=grid.length,C=grid[0].length;
    var cw=54,ch=46,gh=6,tw=(cw+gh)*C-gh,th=(ch+gh)*R-gh,ox=(W-tw)/2,oy=(H-th)/2-10;
    var pm={};if(s&&s.path)s.path.forEach(function(p,i){pm[p.r+','+p.c]=i;});
    for(var r=0;r<R;r++)for(var c=0;c<C;c++){
      var pi=pm[r+','+c];
      cell(ctx,ox+c*(cw+gh),oy+r*(ch+gh),cw,ch,grid[r][c],pi!==undefined?(s&&s.done&&s.found?'found':'active'):'default');
      if(pi!==undefined)lbl(ctx,String(pi),ox+c*(cw+gh)+cw-9,oy+r*(ch+gh)+9,'rgba(52,211,153,.75)',8,'center');
    }
    lbl(ctx,'Word: '+defWord,W/2,H-16,'rgba(167,139,250,.7)',11,'center');
    if(s&&s.done)lbl(ctx,s.found?'Found ✓':'Not Found ✗',W/2,oy-16,s.found?'#34d399':'#f87171',13,'center');
  }
  makeProbUI(container,{canvasW:660,canvasH:310,
    approaches:[{key:'a1',label:'DFS Backtracking O(m·n·4^L)'}],
    inputs:[{id:'w',lbl:'Word:',elem:inp(defWord,'word',120)}],
    onInputs:function(v){if(v.w.trim())defWord=v.w.trim().toUpperCase();},
    buildSteps:function(){return buildSteps(defGrid,defWord);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},onReset:function(ctx,W,H){draw(null,ctx,W,H);}});
}

/* ════════════════════════════════════════════════════════════
   P55 — Reorder List
════════════════════════════════════════════════════════════ */
function initReorderList(id){
  var container=document.getElementById(id);if(!container)return;
  var defArr=[1,2,3,4];
  function buildBrute(arr){
    var steps=[],n=arr.length,result=[],l=0,r=n-1;
    steps.push({result:[],mid:-1,msg:'Brute: collect nodes → array; interleave from both ends: 0,n-1,1,n-2,...'});
    while(l<=r){
      result.push(arr[l++]);
      steps.push({result:result.slice(),mid:-1,msg:'Take from left: '+result[result.length-1]+'. Result: ['+result.join('→')+']'});
      if(l<=r){result.push(arr[r--]);steps.push({result:result.slice(),mid:-1,msg:'Take from right: '+result[result.length-1]+'. Result: ['+result.join('→')+']'});}
    }
    steps.push({result:result,done:true,msg:'Done: ['+result.join('→')+']'});
    return steps;
  }
  function buildOptimal(arr){
    var steps=[],n=arr.length,mid=Math.floor((n-1)/2);
    steps.push({result:[],mid:-1,msg:'Step 1/3: find middle index (slow/fast pointers).'});
    steps.push({result:[],mid:mid,msg:'Middle at index '+mid+' (value '+arr[mid]+'). Split: ['+arr.slice(0,mid+1).join(',')+'] | ['+arr.slice(mid+1).join(',')+']'});
    var second=arr.slice(mid+1).reverse();
    steps.push({result:[],mid:mid,rev:second.slice(),msg:'Step 2/3: reverse 2nd half → ['+second.join(',')+']'});
    var first=arr.slice(0,mid+1),result=[],i=0,j=0;
    steps.push({result:[],mid:mid,msg:'Step 3/3: merge alternating from first and reversed-second.'});
    while(i<first.length||j<second.length){
      if(i<first.length){result.push(first[i++]);steps.push({result:result.slice(),mid:mid,msg:'From 1st half: '+result[result.length-1]+' → ['+result.join('→')+']'});}
      if(j<second.length){result.push(second[j++]);steps.push({result:result.slice(),mid:mid,msg:'From 2nd half: '+result[result.length-1]+' → ['+result.join('→')+']'});}
    }
    steps.push({result:result,done:true,msg:'Done: ['+result.join('→')+']'});
    return steps;
  }
  function draw(s,ctx,W,H){
    bg(ctx,W,H);var arr=defArr,n=arr.length,cw=46,gh=8;
    var tw=(cw+gh)*n-gh,ox=(W-tw)/2;
    lbl(ctx,'Input',W/2,22,'rgba(167,139,250,.5)',9,'center');
    for(var i=0;i<n;i++){
      cell(ctx,ox+i*(cw+gh),30,cw,36,arr[i],s&&s.mid===i?'found':'default');
      if(i<n-1)lbl(ctx,'→',ox+i*(cw+gh)+cw+gh/2,48,'rgba(139,92,246,.5)',12,'center');
    }
    if(s&&s.result&&s.result.length){
      lbl(ctx,'Result',W/2,H-76,'rgba(6,182,212,.5)',9,'center');
      var res=s.result,tw2=(cw+gh)*res.length-gh,ox2=(W-tw2)/2;
      for(var i=0;i<res.length;i++){
        cell(ctx,ox2+i*(cw+gh),H-66,cw,36,res[i],s.done?'found':'sorted');
        if(i<res.length-1)lbl(ctx,'→',ox2+i*(cw+gh)+cw+gh/2,H-48,'rgba(52,211,153,.5)',12,'center');
      }
    }
  }
  makeProbUI(container,{canvasW:660,canvasH:260,
    approaches:[{key:'a1',label:'Brute: Array Rebuild O(n)'},{key:'a2',label:'Optimal: Mid→Rev→Merge O(1) space'}],
    inputs:[{id:'arr',lbl:'List:',elem:inp(defArr.join(','),'comma-separated',200)}],
    onInputs:function(v){var a=v.arr.split(',').map(function(x){return parseInt(x.trim(),10);}).filter(function(x){return !isNaN(x);});if(a.length)defArr=a;},
    buildSteps:function(ap){return ap==='a1'?buildBrute(defArr):buildOptimal(defArr);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},onReset:function(ctx,W,H){draw(null,ctx,W,H);}});
}

/* ════════════════════════════════════════════════════════════
   P56 — Merge K Sorted Lists
════════════════════════════════════════════════════════════ */
function initMergeKLists(id){
  var container=document.getElementById(id);if(!container)return;
  var defLists=[[1,4,5],[1,3,4],[2,6]];
  function buildBrute(lists){
    var steps=[],all=[];
    steps.push({ptrs:lists.map(function(){return 0;}),merged:[],activeList:-1,msg:'Brute: collect all values from k lists, sort them, build result.'});
    lists.forEach(function(l,li){l.forEach(function(v){all.push(v);steps.push({ptrs:lists.map(function(){return 0;}),merged:all.slice().sort(function(a,b){return a-b;}),activeList:li,msg:'Collect '+v+' from list '+li+'. Pool: ['+all.join(',')+']'});});});
    all.sort(function(a,b){return a-b;});
    steps.push({ptrs:lists.map(function(){return 0;}),merged:all,activeList:-1,done:true,msg:'Sort → ['+all.join('→')+']'});
    return steps;
  }
  function buildOptimal(lists){
    var steps=[],merged=[],ptrs=lists.map(function(){return 0;});
    steps.push({ptrs:ptrs.slice(),merged:[],activeList:-1,msg:'Min-heap simulation: always pick smallest head across all lists. O(n log k).'});
    for(var iter=0;iter<200;iter++){
      var minVal=Infinity,minList=-1;
      for(var i=0;i<lists.length;i++){if(ptrs[i]<lists[i].length&&lists[i][ptrs[i]]<minVal){minVal=lists[i][ptrs[i]];minList=i;}}
      if(minList===-1)break;
      merged.push(minVal);ptrs[minList]++;
      steps.push({ptrs:ptrs.slice(),merged:merged.slice(),activeList:minList,msg:'Pick min='+minVal+' from list '+minList+'. Merged: ['+merged.join('→')+']'});
    }
    steps.push({ptrs:ptrs.slice(),merged:merged,activeList:-1,done:true,msg:'Merged: ['+merged.join('→')+']'});
    return steps;
  }
  function draw(s,ctx,W,H){
    bg(ctx,W,H);var lists=defLists,K=lists.length;
    var cw=38,gh=6,rowH=32,rowGap=8;
    var maxLen=Math.max.apply(null,lists.map(function(l){return l.length;}));
    var tw=(cw+gh)*maxLen-gh,ox=(W-tw)/2;
    lists.forEach(function(l,li){
      var y=18+li*(rowH+rowGap);
      lbl(ctx,'L'+li,ox-22,y+rowH/2,'rgba(167,139,250,.5)',9,'center');
      l.forEach(function(v,ci){
        var ptr=s&&s.ptrs?s.ptrs[li]:-1;
        var st=(s&&s.activeList===li&&ci===ptr)?'active':(s&&s.ptrs&&ci<ptr?'water':'default');
        cell(ctx,ox+ci*(cw+gh),y,cw,rowH,v,st);
      });
    });
    var merged=s&&s.merged?s.merged:[],my=18+K*(rowH+rowGap)+6;
    lbl(ctx,'Merged',ox-22,my+rowH/2,'rgba(6,182,212,.5)',9,'center');
    merged.forEach(function(v,i){cell(ctx,ox+i*(cw+gh),my,cw,rowH,v,s&&s.done?'found':'sorted');});
  }
  makeProbUI(container,{canvasW:660,canvasH:290,
    approaches:[{key:'a1',label:'Brute: Collect & Sort O(n log n)'},{key:'a2',label:'Optimal: Min-Heap O(n log k)'}],
    inputs:[],
    buildSteps:function(ap){return ap==='a1'?buildBrute(defLists):buildOptimal(defLists);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},onReset:function(ctx,W,H){draw(null,ctx,W,H);}});
}

/* ════════════════════════════════════════════════════════════
   P57 — Clone Graph
════════════════════════════════════════════════════════════ */
function initCloneGraph(id){
  var container=document.getElementById(id);if(!container)return;
  var defAdj=[[1,3],[0,2],[1,3],[0,2]];// 0-indexed; node i+1 connects to defAdj[i]+1
  function buildSteps(adj){
    var n=adj.length,vis=new Array(n).fill(false),cloned=new Array(n).fill(false),steps=[];
    steps.push({vis:vis.slice(),cloned:cloned.slice(),cur:-1,msg:'BFS clone: map old→clone node. Start from node 1.'});
    var q=[0];vis[0]=true;cloned[0]=true;
    steps.push({vis:vis.slice(),cloned:cloned.slice(),cur:0,msg:'Create clone[1], enqueue node 0.'});
    while(q.length){
      var u=q.shift();
      adj[u].forEach(function(v){
        if(!vis[v]){vis[v]=true;cloned[v]=true;q.push(v);steps.push({vis:vis.slice(),cloned:cloned.slice(),cur:v,msg:'Node '+u+'→'+v+': clone['+(v+1)+'] created. Queue: ['+q.map(function(x){return x+1;}).join(',')+']'});}
        else steps.push({vis:vis.slice(),cloned:cloned.slice(),cur:u,msg:'Node '+u+'→'+v+': already cloned — add edge '+(u+1)+'→'+(v+1)+' to clone graph.'});
      });
    }
    steps.push({vis:vis.slice(),cloned:cloned.slice(),cur:-1,done:true,msg:'Clone complete: '+n+' nodes, all edges preserved.'});
    return steps;
  }
  function gNode(ctx,p,label,cs,R){
    ctx.save();ctx.beginPath();ctx.arc(p.x,p.y,R,0,Math.PI*2);
    var g=ctx.createRadialGradient(p.x,p.y-4,1,p.x,p.y,R);g.addColorStop(0,cs.g0);g.addColorStop(1,cs.g1);
    ctx.fillStyle=g;ctx.fill();if(cs.gl){ctx.shadowColor=cs.gl;ctx.shadowBlur=8;}ctx.strokeStyle=cs.sk;ctx.lineWidth=1.8;ctx.stroke();ctx.restore();
    ctx.save();ctx.fillStyle=cs.tx;ctx.font='bold 11px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,p.x,p.y);ctx.restore();
  }
  function draw(s,ctx,W,H){
    bg(ctx,W,H);var n=4,R=14,ra=Math.min(W,H)*0.22;
    function pO(i){var a=-Math.PI/2+i*2*Math.PI/n;return{x:W*0.24+ra*Math.cos(a),y:H/2+ra*Math.sin(a)};}
    function pC(i){var a=-Math.PI/2+i*2*Math.PI/n;return{x:W*0.74+ra*Math.cos(a),y:H/2+ra*Math.sin(a)};}
    defAdj.forEach(function(nb,i){nb.forEach(function(j){if(j>i){var p1=pO(i),p2=pO(j);ctx.save();ctx.strokeStyle='rgba(139,92,246,.3)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.stroke();ctx.restore();}});});
    for(var i=0;i<n;i++){var vis=s&&s.vis&&s.vis[i];gNode(ctx,pO(i),i+1,CS[s&&s.cur===i?'active':vis?'found':'default'],R);}
    defAdj.forEach(function(nb,i){nb.forEach(function(j){if(j>i&&s&&s.cloned&&s.cloned[i]&&s.cloned[j]){var p1=pC(i),p2=pC(j);ctx.save();ctx.strokeStyle='rgba(52,211,153,.35)';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.stroke();ctx.restore();}});});
    for(var i=0;i<n;i++){var cl=s&&s.cloned&&s.cloned[i];gNode(ctx,pC(i),cl?i+1:'?',cl?CS[s&&s.cur===i?'active':'sorted']:CS.water,R);}
    lbl(ctx,'Original',W*0.24,H-16,'rgba(167,139,250,.5)',9,'center');
    lbl(ctx,'Clone',W*0.74,H-16,'rgba(52,211,153,.5)',9,'center');
    ctx.save();ctx.strokeStyle='rgba(139,92,246,.15)';ctx.lineWidth=1;ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(W/2,20);ctx.lineTo(W/2,H-28);ctx.stroke();ctx.restore();
  }
  makeProbUI(container,{canvasW:660,canvasH:270,approaches:[{key:'a1',label:'BFS with HashMap O(n+e)'}],inputs:[],
    buildSteps:function(){return buildSteps(defAdj);},onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},onReset:function(ctx,W,H){draw(null,ctx,W,H);}});
}

/* ════════════════════════════════════════════════════════════
   P58 — Pacific Atlantic Water Flow
════════════════════════════════════════════════════════════ */
function initPacificAtlantic(id){
  var container=document.getElementById(id);if(!container)return;
  var defH=[[1,2,2,3],[3,2,3,4],[2,4,5,3],[6,7,1,4]];
  function bfsFrom(h,starts){
    var R=h.length,C=h[0].length,vis=Array.from({length:R},function(){return new Array(C).fill(false);}),q=starts.slice();
    starts.forEach(function(rc){vis[rc[0]][rc[1]]=true;});
    while(q.length){var rc=q.shift(),r=rc[0],c=rc[1];[[r-1,c],[r+1,c],[r,c-1],[r,c+1]].forEach(function(nc){var nr=nc[0],nc2=nc[1];if(nr>=0&&nr<R&&nc2>=0&&nc2<C&&!vis[nr][nc2]&&h[nr][nc2]>=h[r][c]){vis[nr][nc2]=true;q.push([nr,nc2]);}});}
    return vis;
  }
  function buildSteps(h){
    var R=h.length,C=h[0].length,steps=[],pS=[],aS=[];
    for(var r=0;r<R;r++)for(var c=0;c<C;c++){if(r===0||c===0)pS.push([r,c]);if(r===R-1||c===C-1)aS.push([r,c]);}
    steps.push({pac:null,atl:null,msg:'BFS from ocean borders going UPHILL — cells reachable from Pacific border and Atlantic border.'});
    var pac=bfsFrom(h,pS);
    steps.push({pac:pac,atl:null,msg:'Pacific BFS done: cells where water can flow TO Pacific (top/left border expanded uphill).'});
    var atl=bfsFrom(h,aS);
    steps.push({pac:pac,atl:atl,msg:'Atlantic BFS done: cells where water can flow TO Atlantic (bottom/right border expanded uphill).'});
    var res=[];for(var r=0;r<R;r++)for(var c=0;c<C;c++)if(pac[r][c]&&atl[r][c])res.push([r,c]);
    steps.push({pac:pac,atl:atl,res:res,done:true,msg:'Intersection: '+res.length+' cells flow to BOTH oceans.'});
    return steps;
  }
  function draw(s,ctx,W,H){
    bg(ctx,W,H);var h=defH,R=h.length,C=h[0].length;
    var cw=70,ch=52,gh=6,tw=(cw+gh)*C-gh,th=(ch+gh)*R-gh,ox=(W-tw)/2,oy=(H-th)/2-12;
    var rSet={};if(s&&s.res)s.res.forEach(function(rc){rSet[rc[0]+','+rc[1]]=true;});
    for(var r=0;r<R;r++)for(var c=0;c<C;c++){
      var p=s&&s.pac&&s.pac[r][c],a=s&&s.atl&&s.atl[r][c],both=p&&a,res=rSet[r+','+c];
      var st=res?'found':both?'visited':p?'selected':a?'comparing':'default';
      cell(ctx,ox+c*(cw+gh),oy+r*(ch+gh),cw,ch,h[r][c],st);
    }
    lbl(ctx,'Pacific →',ox-4,oy+th*0.3,'rgba(129,140,248,.6)',8,'right');
    lbl(ctx,'↑',ox+tw*0.5,oy-14,'rgba(129,140,248,.6)',11,'center');
    lbl(ctx,'← Atlantic',ox+tw+4,oy+th*0.7,'rgba(251,146,60,.5)',8,'left');
    lbl(ctx,'P only',W*0.18,H-16,'rgba(129,140,248,.6)',8,'center');
    lbl(ctx,'A only',W*0.35,H-16,'rgba(251,146,60,.6)',8,'center');
    lbl(ctx,'Both ✓',W*0.52,H-16,'rgba(52,211,153,.7)',8,'center');
  }
  makeProbUI(container,{canvasW:660,canvasH:320,approaches:[{key:'a1',label:'BFS from Both Borders O(m·n)'}],inputs:[],
    buildSteps:function(){return buildSteps(defH);},onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},onReset:function(ctx,W,H){draw(null,ctx,W,H);}});
}

/* ════════════════════════════════════════════════════════════
   P59 — Rotting Oranges
════════════════════════════════════════════════════════════ */
function initRottingOranges(id){
  var container=document.getElementById(id);if(!container)return;
  var defGrid=[[2,1,1],[1,1,0],[0,1,1]];
  function buildSteps(grid){
    var R=grid.length,C=grid[0].length,g=grid.map(function(r){return r.slice();}),steps=[],q=[],fresh=0;
    for(var r=0;r<R;r++)for(var c=0;c<C;c++){if(g[r][c]===2)q.push([r,c]);if(g[r][c]===1)fresh++;}
    steps.push({g:g.map(function(r){return r.slice();}),t:0,fresh:fresh,msg:'Multi-source BFS: all rotten oranges are initial sources. Fresh: '+fresh});
    var t=0;
    while(q.length&&fresh>0){
      var nq=[];
      q.forEach(function(rc){[[rc[0]-1,rc[1]],[rc[0]+1,rc[1]],[rc[0],rc[1]-1],[rc[0],rc[1]+1]].forEach(function(nc){var nr=nc[0],nc2=nc[1];if(nr>=0&&nr<R&&nc2>=0&&nc2<C&&g[nr][nc2]===1){g[nr][nc2]=2;nq.push([nr,nc2]);fresh--;}});});
      if(nq.length){t++;q=nq;steps.push({g:g.map(function(r){return r.slice();}),t:t,fresh:fresh,msg:'Minute '+t+': '+nq.length+' new rotten. Fresh left: '+fresh});}
      else break;
    }
    steps.push({g:g.map(function(r){return r.slice();}),t:fresh===0?t:-1,fresh:fresh,done:true,msg:fresh===0?'All oranges rotted in '+t+' minutes.':'Impossible — '+fresh+' fresh orange'+(fresh>1?'s':'')+'unreachable.'});
    return steps;
  }
  function draw(s,ctx,W,H){
    bg(ctx,W,H);var grid=defGrid,R=grid.length,C=grid[0].length;
    var cw=72,ch=62,gh=8,tw=(cw+gh)*C-gh,th=(ch+gh)*R-gh,ox=(W-tw)/2,oy=(H-th)/2-14;
    var g=s&&s.g?s.g:grid;
    for(var r=0;r<R;r++)for(var c=0;c<C;c++){
      var v=g[r][c];var st=v===2?'pivot':v===1?'found':'water';
      cell(ctx,ox+c*(cw+gh),oy+r*(ch+gh),cw,ch,v===0?'·':v===1?'🟢':v===2?'🔴':'?',st);
    }
    lbl(ctx,'🔴 rotten  🟢 fresh  · empty',W/2,oy-14,'rgba(167,139,250,.5)',9,'center');
    if(s)lbl(ctx,'Minute: '+(s.done?s.t:s.t),W/2,H-18,s.done?(s.t>=0?'#34d399':'#f87171'):'#c4b5fd',13,'center');
  }
  makeProbUI(container,{canvasW:660,canvasH:300,approaches:[{key:'a1',label:'Multi-Source BFS O(m·n)'}],inputs:[],
    buildSteps:function(){return buildSteps(defGrid.map(function(r){return r.slice();}));},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},onReset:function(ctx,W,H){draw(null,ctx,W,H);}});
}

/* ════════════════════════════════════════════════════════════
   P60 — Number of Connected Components
════════════════════════════════════════════════════════════ */
function initConnectedComponents(id){
  var container=document.getElementById(id);if(!container)return;
  var defN=5,defEdges=[[0,1],[1,2],[3,4]];
  var CSTATES=['selected','found','comparing','pivot','active'];
  function buildSteps(n,edges){
    var steps=[],parent=Array.from({length:n},function(_,i){return i;});
    function find(x){var lim=0;while(parent[x]!==x&&lim++<20)x=parent[x];return x;}
    function countComp(){var r={};for(var i=0;i<n;i++)r[find(i)]=1;return Object.keys(r).length;}
    steps.push({parent:parent.slice(),edgeIdx:-1,msg:'Union-Find: '+n+' nodes, each its own component ('+n+' components).'});
    edges.forEach(function(e,i){
      var a=e[0],b=e[1],ra=find(a),rb=find(b);
      if(ra!==rb){parent[rb]=ra;steps.push({parent:parent.slice(),edgeIdx:i,curA:a,curB:b,comp:countComp(),msg:'Union('+a+','+b+'): merge root '+rb+' into '+ra+'. Components: '+countComp()+'.'});}
      else steps.push({parent:parent.slice(),edgeIdx:i,curA:a,curB:b,comp:countComp(),msg:'Edge ('+a+','+b+'): already same component (root '+ra+'). No change.'});
    });
    steps.push({parent:parent.slice(),edgeIdx:-1,comp:countComp(),done:true,msg:'Result: '+countComp()+' connected components.'});
    return steps;
  }
  function draw(s,ctx,W,H){
    bg(ctx,W,H);var n=defN,edges=defEdges,R=16,gap=W/(n+1);
    var parent=s&&s.parent?s.parent:Array.from({length:n},function(_,i){return i;});
    function find(x){var lim=0;while(parent[x]!==x&&lim++<20)x=parent[x];return x;}
    var roots={},ri=0;for(var i=0;i<n;i++){var r=find(i);if(!roots.hasOwnProperty(r)){roots[r]=ri++;}}
    function pos(i){return{x:gap*(i+1),y:H*0.42};}
    edges.forEach(function(e,i){var p1=pos(e[0]),p2=pos(e[1]),act=s&&s.edgeIdx>=i;
      ctx.save();ctx.strokeStyle=act?'rgba(52,211,153,.6)':'rgba(139,92,246,.2)';ctx.lineWidth=act?2.5:1.5;ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.stroke();ctx.restore();});
    if(s&&s.edgeIdx>=0&&s.edgeIdx<edges.length){var e=edges[s.edgeIdx],p1=pos(e[0]),p2=pos(e[1]);
      ctx.save();ctx.strokeStyle='rgba(196,181,253,.9)';ctx.lineWidth=3;ctx.setLineDash([4,2]);ctx.beginPath();ctx.moveTo(p1.x,p1.y);ctx.lineTo(p2.x,p2.y);ctx.stroke();ctx.restore();}
    for(var i=0;i<n;i++){
      var p=pos(i),r=find(i),ci=roots[r],cs=CS[CSTATES[ci%CSTATES.length]];
      ctx.save();ctx.beginPath();ctx.arc(p.x,p.y,R,0,Math.PI*2);
      var g=ctx.createRadialGradient(p.x,p.y-4,1,p.x,p.y,R);g.addColorStop(0,cs.g0);g.addColorStop(1,cs.g1);
      ctx.fillStyle=g;ctx.fill();if(cs.gl){ctx.shadowColor=cs.gl;ctx.shadowBlur=8;}ctx.strokeStyle=cs.sk;ctx.lineWidth=1.8;ctx.stroke();ctx.restore();
      ctx.save();ctx.fillStyle=cs.tx;ctx.font='bold 11px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(i,p.x,p.y);ctx.restore();
      lbl(ctx,'root:'+r,p.x,p.y+R+13,'rgba(167,139,250,.45)',8,'center');
    }
    if(s&&s.comp!==undefined)lbl(ctx,'Components: '+s.comp,W/2,H-18,s.done?'#34d399':'#c4b5fd',13,'center');
  }
  makeProbUI(container,{canvasW:660,canvasH:240,approaches:[{key:'a1',label:'Union-Find O((n+e)·α(n))'}],inputs:[],
    buildSteps:function(){return buildSteps(defN,defEdges);},onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},onReset:function(ctx,W,H){draw(null,ctx,W,H);}});
}

/* ════════════════════════════════════════════════════════════
   P61 — Longest Increasing Subsequence
════════════════════════════════════════════════════════════ */
function initLIS(id){
  var container=document.getElementById(id);if(!container)return;
  var defArr=[10,9,2,5,3,7,101,18];
  function buildBrute(arr){
    var n=arr.length,dp=new Array(n).fill(1),steps=[];
    steps.push({arr:arr.slice(),dp:dp.slice(),i:-1,j:-1,msg:'DP O(n²): dp[i] = length of LIS ending at arr[i]. Start dp=[1,1,...,1].'});
    for(var i=1;i<n;i++){
      for(var j=0;j<i;j++){
        if(arr[j]<arr[i]&&dp[j]+1>dp[i]){dp[i]=dp[j]+1;}
        steps.push({arr:arr.slice(),dp:dp.slice(),i:i,j:j,msg:'Compare arr['+j+']='+arr[j]+' < arr['+i+']='+arr[i]+'? '+(arr[j]<arr[i]?'Yes → dp['+i+']=max('+dp[i]+','+(dp[j]+1)+')='+dp[i]:'No — skip.')});
      }
    }
    var best=Math.max.apply(null,dp);
    steps.push({arr:arr.slice(),dp:dp.slice(),i:-1,j:-1,done:true,ans:best,msg:'LIS length = '+best+' (max of dp array: ['+dp.join(',')+'])'});
    return steps;
  }
  function buildOptimal(arr){
    var steps=[],tails=[],n=arr.length;
    steps.push({arr:arr.slice(),tails:[],cur:-1,msg:'Patience sort O(n log n): tails[k] = smallest tail of any IS of length k+1.'});
    for(var i=0;i<n;i++){
      var v=arr[i],lo=0,hi=tails.length;
      while(lo<hi){var mid=(lo+hi)>>1;if(tails[mid]<v)lo=mid+1;else hi=mid;}
      tails[lo]=v;
      steps.push({arr:arr.slice(),tails:tails.slice(),cur:i,pos:lo,msg:'arr['+i+']='+v+': place at tails['+lo+']. Tails: ['+tails.join(',')+']'});
    }
    steps.push({arr:arr.slice(),tails:tails.slice(),cur:-1,done:true,ans:tails.length,msg:'LIS length = tails.length = '+tails.length});
    return steps;
  }
  function draw(s,ctx,W,H){
    bg(ctx,W,H);var arr=defArr,n=arr.length,cw=56,gh=5;
    var tw=(cw+gh)*n-gh,ox=(W-tw)/2;
    lbl(ctx,'Input',W/2,22,'rgba(167,139,250,.5)',9,'center');
    for(var i=0;i<n;i++){var st=(s&&s.i===i)?'active':(s&&s.j===i)?'comparing':(s&&s.cur===i)?'active':'default';cell(ctx,ox+i*(cw+gh),30,cw,36,arr[i],st);}
    // DP or tails row
    var row=s&&s.dp?s.dp:s&&s.tails?s.tails:null;
    var rowLabel=s&&s.dp?'dp[ ]':'tails[ ]';
    if(row){
      lbl(ctx,rowLabel,W/2,H-80,'rgba(6,182,212,.5)',9,'center');
      for(var i=0;i<row.length;i++){var st2=(s&&(s.i===i||s.pos===i))?'found':'sorted';cell(ctx,ox+i*(cw+gh),H-70,cw,32,row[i],st2);}
    }
    if(s&&s.ans!=null)lbl(ctx,'LIS = '+s.ans,W/2,H-22,s.done?'#34d399':'#c4b5fd',13,'center');
  }
  makeProbUI(container,{canvasW:660,canvasH:270,
    approaches:[{key:'a1',label:'DP O(n²)'},{key:'a2',label:'Patience Sort O(n log n)'}],
    inputs:[{id:'arr',lbl:'Array:',elem:inp(defArr.join(','),'comma-separated',240)}],
    onInputs:function(v){var a=v.arr.split(',').map(function(x){return parseInt(x.trim(),10);}).filter(function(x){return!isNaN(x);});if(a.length)defArr=a;},
    buildSteps:function(ap){return ap==='a1'?buildBrute(defArr):buildOptimal(defArr);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},onReset:function(ctx,W,H){draw(null,ctx,W,H);}});
}

/* ════════════════════════════════════════════════════════════
   P62 — Unique Paths
════════════════════════════════════════════════════════════ */
function initUniquePaths(id){
  var container=document.getElementById(id);if(!container)return;
  var defM=3,defN=4;
  function buildSteps(m,n){
    var dp=Array.from({length:m},function(){return new Array(n).fill(0);}),steps=[];
    for(var c=0;c<n;c++)dp[0][c]=1;for(var r=0;r<m;r++)dp[r][0]=1;
    steps.push({dp:dp.map(function(r){return r.slice();}),cur:-1,cuc:-1,msg:'DP: dp[0][j]=1 (top row), dp[i][0]=1 (left col). dp[i][j]=dp[i-1][j]+dp[i][j-1].'});
    for(var r=1;r<m;r++){for(var c=1;c<n;c++){dp[r][c]=dp[r-1][c]+dp[r][c-1];steps.push({dp:dp.map(function(row){return row.slice();}),cur:r,cuc:c,msg:'dp['+r+']['+c+']=dp['+(r-1)+']['+c+']+dp['+r+']['+(c-1)+']='+dp[r-1][c]+'+'+dp[r][c-1]+'='+dp[r][c]});}}
    steps.push({dp:dp.map(function(r){return r.slice();}),cur:m-1,cuc:n-1,done:true,ans:dp[m-1][n-1],msg:'Unique paths: dp['+(m-1)+']['+(n-1)+']='+dp[m-1][n-1]});
    return steps;
  }
  function draw(s,ctx,W,H){
    bg(ctx,W,H);var m=defM,n=defN,cw=80,ch=52,gh=6;
    var tw=(cw+gh)*n-gh,th=(ch+gh)*m-gh,ox=(W-tw)/2,oy=(H-th)/2-10;
    var dp=s&&s.dp?s.dp:Array.from({length:m},function(){return new Array(n).fill(0);});
    for(var r=0;r<m;r++)for(var c=0;c<n;c++){
      var st=s&&s.cur===r&&s.cuc===c?'active':dp[r][c]>0?(r===m-1&&c===n-1&&s&&s.done?'found':'sorted'):'default';
      cell(ctx,ox+c*(cw+gh),oy+r*(ch+gh),cw,ch,dp[r][c]||'',st);
    }
    lbl(ctx,'→ n='+n+' cols',W/2,oy-12,'rgba(167,139,250,.4)',8,'center');
    lbl(ctx,'↓ m='+m,ox-18,H/2,'rgba(167,139,250,.4)',8,'center');
    if(s&&s.ans)lbl(ctx,'Paths: '+s.ans,W/2,H-18,'#34d399',13,'center');
  }
  makeProbUI(container,{canvasW:660,canvasH:280,
    approaches:[{key:'a1',label:'DP Table O(m·n)'}],
    inputs:[{id:'m',lbl:'Rows m:',elem:inp(String(defM),'',40)},{id:'n',lbl:'Cols n:',elem:inp(String(defN),'',40)}],
    onInputs:function(v){var m=parseInt(v.m,10),n=parseInt(v.n,10);if(m>0&&m<=5)defM=m;if(n>0&&n<=5)defN=n;},
    buildSteps:function(){return buildSteps(defM,defN);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},onReset:function(ctx,W,H){draw(null,ctx,W,H);}});
}

/* ════════════════════════════════════════════════════════════
   P63 — Edit Distance
════════════════════════════════════════════════════════════ */
function initEditDistance(id){
  var container=document.getElementById(id);if(!container)return;
  var defW1='horse',defW2='ros';
  function buildSteps(w1,w2){
    var m=w1.length,n=w2.length,dp=Array.from({length:m+1},function(_,i){return Array.from({length:n+1},function(_,j){return i===0?j:j===0?i:0;});}),steps=[];
    steps.push({dp:dp.map(function(r){return r.slice();}),cur:-1,cuc:-1,msg:'Edit Distance DP: dp[i][j] = min edits to convert w1[0..i-1] to w2[0..j-1]. Base: first row/col = insert/delete count.'});
    for(var i=1;i<=m;i++){for(var j=1;j<=n;j++){
      dp[i][j]=w1[i-1]===w2[j-1]?dp[i-1][j-1]:1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
      steps.push({dp:dp.map(function(r){return r.slice();}),cur:i,cuc:j,msg:'"'+w1[i-1]+'" vs "'+w2[j-1]+'": '+(w1[i-1]===w2[j-1]?'match → dp['+(i-1)+']['+(j-1)+']='+dp[i-1][j-1]:'replace/insert/delete → min('+dp[i-1][j]+','+dp[i][j-1]+','+dp[i-1][j-1]+')='+(dp[i][j]-1))+'+1? = '+dp[i][j]});
    }}
    steps.push({dp:dp.map(function(r){return r.slice();}),cur:m,cuc:n,done:true,ans:dp[m][n],msg:'Edit Distance("'+w1+'","'+w2+'") = '+dp[m][n]});
    return steps;
  }
  function draw(s,ctx,W,H){
    bg(ctx,W,H);var w1=defW1,w2=defW2,m=w1.length,n=w2.length;
    var cw=52,ch=36,gh=4,lw=22,lh=22;
    var tw=(cw+gh)*(n+1)+lw,th=(ch+gh)*(m+1)+lh,ox=(W-tw)/2,oy=(H-th)/2-8;
    var dp=s&&s.dp?s.dp:Array.from({length:m+1},function(_,i){return Array.from({length:n+1},function(_,j){return i===0?j:j===0?i:0;});});
    // Header row (word2 chars)
    lbl(ctx,'',ox+lw+cw/2,oy+lh/2,'rgba(167,139,250,.4)',8,'center');
    for(var j=0;j<=n;j++)lbl(ctx,j===0?'':w2[j-1],ox+lw+(j)*(cw+gh)+cw/2,oy+lh/2,'rgba(6,182,212,.6)',10,'center');
    // Rows
    for(var i=0;i<=m;i++){
      lbl(ctx,i===0?'':w1[i-1],ox+lw/2,oy+lh+(i)*(ch+gh)+ch/2,'rgba(167,139,250,.6)',10,'center');
      for(var j=0;j<=n;j++){
        var st=s&&s.cur===i&&s.cuc===j?'active':i===0||j===0?'sorted':(dp[i]&&dp[i][j]!==undefined&&dp[i][j]>0)?'selected':'default';
        if(s&&s.done&&i===m&&j===n)st='found';
        cell(ctx,ox+lw+j*(cw+gh),oy+lh+i*(ch+gh),cw,ch,dp[i]&&dp[i][j]!=null?dp[i][j]:'',st);
      }
    }
    if(s&&s.ans!=null)lbl(ctx,'Distance: '+s.ans,W/2,H-16,s.done?'#34d399':'#c4b5fd',13,'center');
  }
  makeProbUI(container,{canvasW:660,canvasH:320,
    approaches:[{key:'a1',label:'DP Table O(m·n)'}],
    inputs:[{id:'w1',lbl:'Word 1:',elem:inp(defW1,'word1',100)},{id:'w2',lbl:'Word 2:',elem:inp(defW2,'word2',100)}],
    onInputs:function(v){if(v.w1.trim())defW1=v.w1.trim();if(v.w2.trim())defW2=v.w2.trim();},
    buildSteps:function(){return buildSteps(defW1,defW2);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},onReset:function(ctx,W,H){draw(null,ctx,W,H);}});
}

/* ════════════════════════════════════════════════════════════
   P64 — Coin Change II (Count Ways)
════════════════════════════════════════════════════════════ */
function initCoinChangeII(id){
  var container=document.getElementById(id);if(!container)return;
  var defCoins=[1,2,5],defAmt=5;
  function buildSteps(coins,amt){
    var dp=new Array(amt+1).fill(0),steps=[];dp[0]=1;
    steps.push({dp:dp.slice(),coinIdx:-1,cur:-1,msg:'Count ways: dp[0]=1 (base). For each coin, update amounts from coin to target. Order: coins first (no duplicate counting).'});
    coins.forEach(function(c,ci){
      steps.push({dp:dp.slice(),coinIdx:ci,cur:-1,msg:'Processing coin='+c+': for each amount from '+c+' to '+amt+', dp[a]+=dp[a-'+c+']'});
      for(var a=c;a<=amt;a++){
        dp[a]+=dp[a-c];
        steps.push({dp:dp.slice(),coinIdx:ci,cur:a,msg:'dp['+a+'] += dp['+(a-c)+'] = '+dp[a-c]+'. Now dp['+a+']='+dp[a]});
      }
    });
    steps.push({dp:dp.slice(),coinIdx:-1,cur:amt,done:true,ans:dp[amt],msg:'Ways to make '+amt+' = dp['+amt+'] = '+dp[amt]});
    return steps;
  }
  function draw(s,ctx,W,H){
    bg(ctx,W,H);var coins=defCoins,amt=defAmt;
    var cw=68,gh=6,tw=(cw+gh)*(amt+1)-gh,ox=(W-tw)/2;
    // Coin labels on left
    lbl(ctx,'Coins: ['+coins.join(',')+']',W/2,22,'rgba(167,139,250,.5)',9,'center');
    // DP array
    lbl(ctx,'dp[ ]',W/2,46,'rgba(6,182,212,.5)',9,'center');
    var dp=s&&s.dp?s.dp:new Array(amt+1).fill(0);
    for(var i=0;i<=amt;i++){
      var st=s&&s.cur===i?'active':(dp[i]>0?(i===amt&&s&&s.done?'found':'sorted'):'default');
      cell(ctx,ox+i*(cw+gh),54,cw,40,dp[i],st);
      lbl(ctx,'['+i+']',ox+i*(cw+gh)+cw/2,100,'rgba(167,139,250,.4)',8,'center');
    }
    if(s&&s.coinIdx>=0){lbl(ctx,'Coin: '+coins[s.coinIdx],W/2,H-36,'rgba(6,182,212,.6)',11,'center');}
    if(s&&s.ans!=null)lbl(ctx,'Ways: '+s.ans,W/2,H-16,s.done?'#34d399':'#c4b5fd',13,'center');
  }
  makeProbUI(container,{canvasW:660,canvasH:230,
    approaches:[{key:'a1',label:'DP Unbounded Knapsack O(amt·k)'}],
    inputs:[{id:'c',lbl:'Coins:',elem:inp(defCoins.join(','),'comma-separated',150)},{id:'a',lbl:'Amount:',elem:inp(String(defAmt),'',50)}],
    onInputs:function(v){var c=v.c.split(',').map(function(x){return parseInt(x.trim(),10);}).filter(function(x){return x>0;});var a=parseInt(v.a,10);if(c.length)defCoins=c;if(a>0&&a<=10)defAmt=a;},
    buildSteps:function(){return buildSteps(defCoins,defAmt);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},onReset:function(ctx,W,H){draw(null,ctx,W,H);}});
}

/* ════════════════════════════════════════════════════════════
   P65 — Partition Equal Subset Sum
════════════════════════════════════════════════════════════ */
function initPartitionSubset(id){
  var container=document.getElementById(id);if(!container)return;
  var defArr=[1,5,11,5];
  function buildSteps(arr){
    var sum=arr.reduce(function(a,b){return a+b;},0),steps=[];
    if(sum%2!==0){steps.push({dp:[true].concat(new Array(1).fill(false)),done:true,ans:false,msg:'Sum='+sum+' is odd → cannot partition equally.'});return steps;}
    var target=sum/2,dp=new Array(target+1).fill(false);dp[0]=true;
    steps.push({dp:dp.slice(),numIdx:-1,cur:-1,msg:'0/1 Knapsack: target='+target+'. dp[s]=true if subset sums to s. dp[0]=true (empty subset).'});
    arr.forEach(function(num,ni){
      steps.push({dp:dp.slice(),numIdx:ni,cur:-1,msg:'Add num='+num+'. Iterate right-to-left to avoid reuse: from '+target+' down to '+num+'.'});
      for(var s=target;s>=num;s--){
        if(!dp[s]&&dp[s-num]){dp[s]=true;steps.push({dp:dp.slice(),numIdx:ni,cur:s,msg:'dp['+s+']=true (via dp['+(s-num)+']=true + num='+num+')'});}
        else steps.push({dp:dp.slice(),numIdx:ni,cur:s,msg:'dp['+s+']: dp['+(s-num)+'] = '+(dp[s-num]?'true (already set)':'false — skip')});
      }
    });
    steps.push({dp:dp.slice(),numIdx:-1,cur:target,done:true,ans:dp[target],msg:'dp['+target+']='+dp[target]+' → '+(dp[target]?'CAN partition ✓':'CANNOT partition ✗')});
    return steps;
  }
  function draw(s,ctx,W,H){
    bg(ctx,W,H);var arr=defArr,n=arr.length;
    var sum=arr.reduce(function(a,b){return a+b;},0),target=sum%2===0?sum/2:0;
    // Input array
    var cw=50,gh=5,tw=(cw+gh)*n-gh,ox=(W-tw)/2;
    lbl(ctx,'Input (sum='+sum+', target='+target+')',W/2,22,'rgba(167,139,250,.5)',9,'center');
    for(var i=0;i<n;i++){var st=s&&s.numIdx===i?'active':'default';cell(ctx,ox+i*(cw+gh),30,cw,34,arr[i],st);}
    // DP boolean array
    if(target>0){
      var dp=s&&s.dp?s.dp:new Array(target+1).fill(false);
      var cw2=44,tw2=(cw2+gh)*(target+1)-gh,ox2=(W-tw2)/2;
      lbl(ctx,'dp[0..'+target+']',W/2,H-90,'rgba(6,182,212,.5)',9,'center');
      for(var i=0;i<=target;i++){
        var st2=s&&s.cur===i?'active':dp[i]?(i===target&&s&&s.done?'found':'sorted'):'water';
        cell(ctx,ox2+i*(cw2+gh),H-82,cw2,32,dp[i]?'T':'F',st2);
        lbl(ctx,i,ox2+i*(cw2+gh)+cw2/2,H-44,'rgba(167,139,250,.35)',7,'center');
      }
    }
    if(s&&s.ans!=null)lbl(ctx,s.ans?'Can Partition ✓':'Cannot Partition ✗',W/2,H-16,s.ans?'#34d399':'#f87171',13,'center');
  }
  makeProbUI(container,{canvasW:660,canvasH:290,
    approaches:[{key:'a1',label:'0/1 Knapsack DP O(n·sum)'}],
    inputs:[{id:'arr',lbl:'Array:',elem:inp(defArr.join(','),'comma-separated',200)}],
    onInputs:function(v){var a=v.arr.split(',').map(function(x){return parseInt(x.trim(),10);}).filter(function(x){return!isNaN(x);});if(a.length)defArr=a;},
    buildSteps:function(){return buildSteps(defArr);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},onReset:function(ctx,W,H){draw(null,ctx,W,H);}});
}

/* ════════════════════════════════════════════════════════════
   P66 — House Robber II (Circular)
════════════════════════════════════════════════════════════ */
function initHouseRobberII(id){
  var container=document.getElementById(id);if(!container)return;
  var defArr=[2,3,2];
  function rob1(arr){
    if(!arr.length)return 0;var prev2=0,prev1=0;
    arr.forEach(function(v){var cur=Math.max(prev1,prev2+v);prev2=prev1;prev1=cur;});return prev1;
  }
  function buildSteps(arr){
    var n=arr.length,steps=[];
    if(n===1){steps.push({pass:0,arr:arr,dp:[arr[0]],cur:0,done:true,ans:arr[0],msg:'Single house: rob it. Max = '+arr[0]});return steps;}
    steps.push({pass:0,arr:arr,dp:[],cur:-1,msg:'Houses in a circle: first and last house are adjacent — cannot rob both. Run House Robber I TWICE.'});
    // Pass 1: exclude last (arr[0..n-2])
    var a1=arr.slice(0,n-1),dp1=[],prev2=0,prev1=0;
    steps.push({pass:1,arr:a1,dp:[],cur:-1,msg:'Pass 1: exclude last house. Rob arr[0..'+( n-2)+'] = ['+a1.join(',')+']'});
    a1.forEach(function(v,i){var cur=Math.max(prev1,prev2+v);dp1.push(cur);prev2=prev1;prev1=cur;steps.push({pass:1,arr:a1,dp:dp1.slice(),cur:i,msg:'House '+i+'='+v+': max(skip='+prev2+', rob='+prev1+') → dp='+cur});});
    var r1=dp1[dp1.length-1];
    steps.push({pass:1,arr:a1,dp:dp1.slice(),cur:-1,best1:r1,msg:'Pass 1 max = '+r1});
    // Pass 2: exclude first (arr[1..n-1])
    var a2=arr.slice(1),dp2=[],p2=0,p1=0;
    steps.push({pass:2,arr:a2,dp:[],cur:-1,best1:r1,msg:'Pass 2: exclude first house. Rob arr[1..'+( n-1)+'] = ['+a2.join(',')+']'});
    a2.forEach(function(v,i){var cur=Math.max(p1,p2+v);dp2.push(cur);p2=p1;p1=cur;steps.push({pass:2,arr:a2,dp:dp2.slice(),cur:i,best1:r1,msg:'House '+i+'='+v+': max('+p2+','+p1+') → dp='+cur});});
    var r2=dp2[dp2.length-1];
    steps.push({pass:2,arr:a2,dp:dp2.slice(),cur:-1,best1:r1,best2:r2,msg:'Pass 2 max = '+r2});
    var ans=Math.max(r1,r2);
    steps.push({pass:0,arr:arr,dp:[],cur:-1,done:true,ans:ans,msg:'Answer = max('+r1+','+r2+') = '+ans});
    return steps;
  }
  function draw(s,ctx,W,H){
    bg(ctx,W,H);var arr=defArr,n=arr.length;
    var curArr=s&&s.arr?s.arr:arr,cw=54,gh=6,tw=(cw+gh)*curArr.length-gh,ox=(W-tw)/2;
    var label=s&&s.pass===1?'Pass 1 (skip last)':s&&s.pass===2?'Pass 2 (skip first)':'Input (circular)';
    lbl(ctx,label,W/2,22,'rgba(167,139,250,.5)',9,'center');
    curArr.forEach(function(v,i){var st=s&&s.cur===i?'active':'default';cell(ctx,ox+i*(cw+gh),30,cw,38,v,st);});
    // DP row
    var dpArr=s&&s.dp?s.dp:[];
    if(dpArr.length){
      lbl(ctx,'dp',W/2,H-76,'rgba(6,182,212,.5)',9,'center');
      dpArr.forEach(function(v,i){var st=s&&s.cur===i?'found':'sorted';cell(ctx,ox+i*(cw+gh),H-66,cw,32,v,st);});
    }
    if(s&&s.best1!=null)lbl(ctx,'Pass1='+s.best1+(s.best2!=null?' Pass2='+s.best2:''),W/2,H-28,'rgba(167,139,250,.6)',10,'center');
    if(s&&s.ans!=null)lbl(ctx,'Max = '+s.ans,W/2,H-12,s.done?'#34d399':'#c4b5fd',13,'center');
  }
  makeProbUI(container,{canvasW:660,canvasH:250,
    approaches:[{key:'a1',label:'Two-Pass House Robber I O(n)'}],
    inputs:[{id:'arr',lbl:'Houses:',elem:inp(defArr.join(','),'comma-separated',200)}],
    onInputs:function(v){var a=v.arr.split(',').map(function(x){return parseInt(x.trim(),10);}).filter(function(x){return!isNaN(x);});if(a.length)defArr=a;},
    buildSteps:function(){return buildSteps(defArr);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},onReset:function(ctx,W,H){draw(null,ctx,W,H);}});
}

/* ── P67 Implement Trie ─────────────────────────────────────── */
function initTrie(id){
  var container=document.getElementById(id);
  if(!container)return;
  var defWords=['apple','app','apply','ape'];
  var defQuery='app';

  function buildSteps(words,query){
    var steps=[];
    // Each trie node: {children:{}, isEnd:false}
    var root={ch:{},end:false};
    steps.push({phase:'start',root:JSON.parse(JSON.stringify(root)),msg:'Trie root created. Inserting words one by one.'});
    words.forEach(function(w){
      var node=root;
      for(var i=0;i<w.length;i++){
        var c=w[i];
        if(!node.ch[c])node.ch[c]={ch:{},end:false};
        node=node.ch[c];
        steps.push({phase:'insert',word:w,prefix:w.slice(0,i+1),root:JSON.parse(JSON.stringify(root)),msg:'Insert "'+w+'": added node "'+c+'" (prefix "'+w.slice(0,i+1)+'")'});
      }
      node.end=true;
      steps.push({phase:'end',word:w,root:JSON.parse(JSON.stringify(root)),msg:'Insert "'+w+'": marked end=true'});
    });
    // Search query
    var node2=root,found=true;
    steps.push({phase:'search',query:query,prefix:'',root:JSON.parse(JSON.stringify(root)),msg:'Search "'+query+'": start at root'});
    for(var i=0;i<query.length;i++){
      var c=query[i];
      if(!node2.ch[c]){found=false;break;}
      node2=node2.ch[c];
      steps.push({phase:'search',query:query,prefix:query.slice(0,i+1),root:JSON.parse(JSON.stringify(root)),msg:'Search "'+query+'": follow "'+c+'" → prefix "'+query.slice(0,i+1)+'"'});
    }
    var exact=found&&node2.end;
    steps.push({phase:'result',query:query,found:found,exact:exact,done:true,root:JSON.parse(JSON.stringify(root)),
      msg:found?(exact?'"'+query+'" FOUND as complete word':'startsWith "'+query+'" = true, but no exact match'):'"'+query+'" NOT found in trie'});
    return steps;
  }

  function drawTrie(ctx,W,H,root,highlightPrefix,phase,query){
    bg(ctx,W,H);
    // BFS layout: compute positions per level
    var nodes=[];
    var queue=[{node:root,label:'',depth:0,parentIdx:-1,edgeChar:'',x:W/2,y:36}];
    while(queue.length){
      var item=queue.shift();
      var idx=nodes.length;
      nodes.push(item);
      var keys=Object.keys(item.node.ch).sort();
      var n=keys.length;
      var spread=Math.min(80,160/(n||1));
      var startX=item.x-(n-1)*spread/2;
      keys.forEach(function(k,i){
        queue.push({node:item.node.ch[k],label:k,depth:item.depth+1,parentIdx:idx,edgeChar:k,x:startX+i*spread,y:item.y+52});
      });
    }
    // Draw edges
    nodes.forEach(function(nd,i){
      if(nd.parentIdx<0)return;
      var p=nodes[nd.parentIdx];
      ctx.save();ctx.strokeStyle='rgba(139,92,246,0.4)';ctx.lineWidth=1.5;
      ctx.beginPath();ctx.moveTo(p.x,p.y+14);ctx.lineTo(nd.x,nd.y-14);ctx.stroke();
      // edge char label
      lbl(ctx,nd.edgeChar,(p.x+nd.x)/2-6,(p.y+nd.y)/2,'rgba(167,139,250,0.9)',10,'left');
      ctx.restore();
    });
    // Draw nodes
    nodes.forEach(function(nd){
      var fullLabel=nd.label==='root'?'':nd.label;
      // determine highlight state
      var inHL= highlightPrefix && nd.depth>0 && nd.depth<=highlightPrefix.length && query && highlightPrefix.slice(0,nd.depth)===query.slice(0,nd.depth) && nd.edgeChar===query[nd.depth-1];
      var st= inHL ? (phase==='result'?'found':'active') : (nd.node.end ? 'sorted' : 'default');
      var R=13;
      var grad=ctx.createRadialGradient(nd.x-R*0.3,nd.y-R*0.3,1,nd.x,nd.y,R);
      var c0=CS[st]||CS.default;
      grad.addColorStop(0,'rgba(255,255,255,0.18)');grad.addColorStop(1,c0);
      ctx.save();
      ctx.beginPath();ctx.arc(nd.x,nd.y,R,0,Math.PI*2);
      ctx.fillStyle=grad;ctx.fill();
      ctx.strokeStyle=nd.node.end?'#34d399':'rgba(139,92,246,0.6)';ctx.lineWidth=nd.node.end?2:1;ctx.stroke();
      ctx.restore();
      lbl(ctx,nd.depth===0?'•':(nd.label||''),nd.x,nd.y+4,'#fff',10,'center');
      if(nd.node.end)lbl(ctx,'*',nd.x+9,nd.y-9,'#34d399',9,'left');
    });
    lbl(ctx,'* = word end',W-8,H-8,'rgba(52,211,153,0.7)',9,'right');
  }

  makeProbUI(container,{canvasW:620,canvasH:280,
    approaches:[{key:'a1',label:'Trie Insert+Search O(m)'}],
    inputs:[
      {id:'words',lbl:'Words:',elem:inp(defWords.join(','),'comma-separated',180)},
      {id:'query',lbl:'Search:',elem:inp(defQuery,'word',80)}
    ],
    onInputs:function(v){
      var w=v.words.split(',').map(function(s){return s.trim().toLowerCase();}).filter(Boolean);
      if(w.length)defWords=w;
      if(v.query.trim())defQuery=v.query.trim().toLowerCase();
    },
    buildSteps:function(){return buildSteps(defWords,defQuery);},
    onStep:function(s,ctx,W,H){
      drawTrie(ctx,W,H,s.root,s.prefix||'',s.phase,s.query||'');
      if(s.done){
        var color=s.exact?'#34d399':s.found?'#fbbf24':'#ef4444';
        lbl(ctx,s.msg,W/2,H-8,color,11,'center');
      }
    },
    onReset:function(ctx,W,H){drawTrie(ctx,W,H,{ch:{},end:false},'','','');}
  });
}

/* ── P68 Find Median from Data Stream ──────────────────────── */
function initFindMedian(id){
  var container=document.getElementById(id);
  if(!container)return;
  var defNums=[5,2,8,1,9,3];

  function buildSteps(nums){
    var steps=[];
    // Two heaps: lo=max-heap (lower half), hi=min-heap (upper half)
    // Simulate with sorted arrays; lo reversed = max at top
    var lo=[],hi=[];
    steps.push({lo:[],hi:[],median:null,cur:null,msg:'Two-heap approach: lo=max-heap (lower half), hi=min-heap (upper half).'});
    nums.forEach(function(n){
      // Add to lo first
      lo.push(n);lo.sort(function(a,b){return b-a;}); // max-heap sorted desc
      // Balance: lo's max must be ≤ hi's min
      if(hi.length&&lo[0]>hi[0]){
        hi.push(lo.shift());hi.sort(function(a,b){return a-b;});
        steps.push({lo:lo.slice(),hi:hi.slice(),cur:n,median:null,msg:'Add '+n+': moved '+hi[0]+' from lo to hi (balance constraint).'});
      } else {
        steps.push({lo:lo.slice(),hi:hi.slice(),cur:n,median:null,msg:'Add '+n+' → lo heap.'});
      }
      // Rebalance sizes: lo can have at most 1 more than hi
      if(lo.length>hi.length+1){hi.push(lo.shift());hi.sort(function(a,b){return a-b;});}
      else if(hi.length>lo.length){lo.push(hi.shift());lo.sort(function(a,b){return b-a;});}
      var med=(lo.length===hi.length)?(lo[0]+hi[0])/2:lo[0];
      steps.push({lo:lo.slice(),hi:hi.slice(),cur:n,median:med,msg:'Median = '+(lo.length===hi.length?'('+lo[0]+'+'+hi[0]+')/2 = ':'')+med});
    });
    steps[steps.length-1].done=true;
    return steps;
  }

  function draw(s,ctx,W,H){
    bg(ctx,W,H);
    if(!s)return;
    var lo=s.lo||[],hi=s.hi||[];
    var cw=28,ch2=28,gap=4;
    // Draw lo (max-heap) on left — show as stack with top at bottom
    lbl(ctx,'lo (max-heap)',W/4,18,'rgba(167,139,250,0.8)',10,'center');
    lbl(ctx,'top→',W/4-lo.length*(cw+gap)/2-22,H/2+6,'rgba(167,139,250,0.5)',9,'left');
    lo.forEach(function(v,i){
      var x=W/4-lo.length*(cw+gap)/2+i*(cw+gap);
      var st=i===0?'active':'selected';
      cell(ctx,x,H/2-ch2/2,cw,ch2,v,st);
    });
    // Draw hi (min-heap) on right
    lbl(ctx,'hi (min-heap)',3*W/4,18,'rgba(6,182,212,0.8)',10,'center');
    lbl(ctx,'←top',3*W/4+hi.length*(cw+gap)/2+2,H/2+6,'rgba(6,182,212,0.5)',9,'left');
    hi.forEach(function(v,i){
      var x=3*W/4-hi.length*(cw+gap)/2+i*(cw+gap);
      var st=i===0?'comparing':'water';
      cell(ctx,x,H/2-ch2/2,cw,ch2,v,st);
    });
    // Divider
    ctx.save();ctx.strokeStyle='rgba(255,255,255,0.15)';ctx.lineWidth=1;
    ctx.setLineDash([4,4]);ctx.beginPath();ctx.moveTo(W/2,30);ctx.lineTo(W/2,H-36);ctx.stroke();ctx.restore();
    lbl(ctx,'|',W/2,H/2,'rgba(255,255,255,0.3)',18,'center');
    if(s.median!=null){
      var color=s.done?'#34d399':'#c4b5fd';
      lbl(ctx,'median = '+s.median,W/2,H-14,color,13,'center');
    }
  }

  makeProbUI(container,{canvasW:620,canvasH:220,
    approaches:[{key:'a1',label:'Two Heaps O(log n) add, O(1) median'}],
    inputs:[{id:'nums',lbl:'Stream:',elem:inp(defNums.join(','),'numbers',200)}],
    onInputs:function(v){var a=v.nums.split(',').map(function(x){return parseFloat(x.trim());}).filter(function(x){return!isNaN(x);});if(a.length)defNums=a;},
    buildSteps:function(){return buildSteps(defNums);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},
    onReset:function(ctx,W,H){draw({lo:[],hi:[],median:null},ctx,W,H);}
  });
}

/* ── P69 Decode Ways ────────────────────────────────────────── */
function initDecodeWays(id){
  var container=document.getElementById(id);
  if(!container)return;
  var defS='226';

  function buildSteps(s){
    var steps=[];
    var n=s.length;
    // dp[i] = number of ways to decode s[0..i-1]
    var dp=new Array(n+1).fill(0);
    dp[0]=1; // empty string
    dp[1]=s[0]==='0'?0:1;
    steps.push({s:s,dp:dp.slice(),i:1,msg:'Init: dp[0]=1 (base), dp[1]='+(s[0]==='0'?'0 (leading zero)':'1')});
    for(var i=2;i<=n;i++){
      var one=parseInt(s[i-1],10);
      var two=parseInt(s.slice(i-2,i),10);
      var prev=dp[i];
      if(one>=1)dp[i]+=dp[i-1];
      if(two>=10&&two<=26)dp[i]+=dp[i-2];
      steps.push({s:s,dp:dp.slice(),i:i,one:one,two:two,
        msg:'i='+i+': s['+(i-1)+']="'+s[i-1]+'" (single='+one+') s['+(i-2)+'..'+(i-1)+']="'+s.slice(i-2,i)+'" (double='+two+')'
        +' → dp['+i+']='+dp[i]});
    }
    steps[steps.length-1].done=true;
    steps[steps.length-1].msg='Result: dp['+n+'] = '+dp[n]+' ways to decode "'+s+'"';
    return steps;
  }

  function draw(s,ctx,W,H,step){
    bg(ctx,W,H);
    if(!step)return;
    var dp=step.dp||[];
    var str=step.s||s;
    var n=str.length;
    var cw=Math.min(44, (W-60)/(n+1));
    var ox=(W-(n+1)*(cw+4))/2;
    // Draw string chars
    lbl(ctx,'s:',ox-24,H/2-38,'rgba(167,139,250,0.7)',10,'left');
    for(var i=0;i<n;i++){
      var st=step.i&&(i===step.i-1||i===step.i-2)?'active':'default';
      cell(ctx,ox+(i+1)*(cw+4),H/2-60,cw,28,str[i],st);
      lbl(ctx,i,ox+(i+1)*(cw+4)+cw/2,H/2-68,'rgba(255,255,255,0.3)',8,'center');
    }
    // Draw dp array
    lbl(ctx,'dp:',ox-24,H/2+8,'rgba(6,182,212,0.7)',10,'left');
    for(var i=0;i<=n;i++){
      var active=step.i===i;
      var st2=active?'found':(dp[i]>0?'sorted':'water');
      cell(ctx,ox+i*(cw+4),H/2-12,cw,28,dp[i]!=null?dp[i]:'',st2);
      lbl(ctx,i,ox+i*(cw+4)+cw/2,H/2-20,'rgba(255,255,255,0.3)',8,'center');
    }
    if(step.done)lbl(ctx,step.msg,W/2,H-10,'#34d399',11,'center');
  }

  makeProbUI(container,{canvasW:620,canvasH:200,
    approaches:[{key:'a1',label:'DP O(n) — dp[i] = ways to decode s[0..i-1]'}],
    inputs:[{id:'s',lbl:'String:',elem:inp(defS,'digits only',120)}],
    onInputs:function(v){var t=v.s.trim().replace(/[^0-9]/g,'');if(t.length)defS=t;},
    buildSteps:function(){return buildSteps(defS);},
    onStep:function(s,ctx,W,H){draw(defS,ctx,W,H,s);},
    onReset:function(ctx,W,H){draw(defS,ctx,W,H,null);}
  });
}

/* ── P70 Jump Game II ───────────────────────────────────────── */
function initJumpGameII(id){
  var container=document.getElementById(id);
  if(!container)return;
  var defArr=[2,3,1,1,4];

  function buildSteps(arr){
    var steps=[];
    var n=arr.length;
    steps.push({arr:arr.slice(),jumps:0,curEnd:0,farthest:0,i:0,msg:'Greedy: track current window end and farthest reachable. Jump when we reach curEnd.'});
    var jumps=0,curEnd=0,farthest=0;
    for(var i=0;i<n-1;i++){
      farthest=Math.max(farthest,i+arr[i]);
      if(i===curEnd){
        jumps++;
        curEnd=farthest;
        steps.push({arr:arr.slice(),jumps:jumps,curEnd:curEnd,farthest:farthest,i:i,
          msg:'Reached window end at i='+i+' → jump #'+jumps+'. New window: [0..'+curEnd+'], farthest='+farthest});
      } else {
        steps.push({arr:arr.slice(),jumps:jumps,curEnd:curEnd,farthest:farthest,i:i,
          msg:'i='+i+': can reach '+(i+arr[i])+', farthest so far='+farthest});
      }
    }
    steps.push({arr:arr.slice(),jumps:jumps,curEnd:curEnd,farthest:farthest,i:n-1,done:true,
      msg:'Reached end! Minimum jumps = '+jumps});
    return steps;
  }

  function draw(s,ctx,W,H){
    bg(ctx,W,H);
    if(!s)return;
    var arr=s.arr,n=arr.length;
    var cw=Math.min(54,(W-40)/n), gap=4;
    var ox=(W-n*(cw+gap))/2;
    var baseY=H/2-14;
    // Draw window highlight
    if(s.curEnd!=null){
      ctx.save();
      ctx.fillStyle='rgba(139,92,246,0.08)';
      ctx.fillRect(ox-2, baseY-4, (Math.min(s.curEnd,n-1))*(cw+gap)+cw+4, 36);
      ctx.restore();
    }
    // Draw farthest reach arc
    if(s.farthest!=null&&s.farthest>0){
      var fi=Math.min(s.farthest,n-1);
      var fx=ox+fi*(cw+gap)+cw/2;
      var ix=ox+(s.i||0)*(cw+gap)+cw/2;
      ctx.save();ctx.strokeStyle='rgba(52,211,153,0.4)';ctx.lineWidth=1.5;ctx.setLineDash([3,3]);
      ctx.beginPath();ctx.moveTo(ix,baseY-4);ctx.lineTo(fx,baseY-4);ctx.stroke();ctx.restore();
    }
    arr.forEach(function(v,i){
      var active=s.i===i;
      var inWindow=s.curEnd!=null&&i<=s.curEnd;
      var st=active?'active':(i===0?'sorted':(i<=s.curEnd?'selected':'default'));
      if(s.done)st=i===n-1?'found':'sorted';
      cell(ctx,ox+i*(cw+gap),baseY,cw,28,v,st);
      lbl(ctx,i,ox+i*(cw+gap)+cw/2,baseY-8,'rgba(255,255,255,0.3)',8,'center');
    });
    lbl(ctx,'jumps='+s.jumps,W/2,baseY+48,s.done?'#34d399':'#c4b5fd',13,'center');
    lbl(ctx,'window end: '+s.curEnd+'  farthest: '+s.farthest,W/2,H-10,'rgba(255,255,255,0.4)',9,'center');
  }

  makeProbUI(container,{canvasW:620,canvasH:200,
    approaches:[{key:'a1',label:'Greedy O(n) — window + farthest'}],
    inputs:[{id:'arr',lbl:'Jumps:',elem:inp(defArr.join(','),'comma-separated',180)}],
    onInputs:function(v){var a=v.arr.split(',').map(function(x){return parseInt(x.trim(),10);}).filter(function(x){return!isNaN(x)&&x>=0;});if(a.length>1)defArr=a;},
    buildSteps:function(){return buildSteps(defArr);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},
    onReset:function(ctx,W,H){draw({arr:defArr,jumps:0,curEnd:0,farthest:0,i:0},ctx,W,H);}
  });
}

/* ── P71 Kth Largest Element ─────────────────────────────── */
function initKthLargest(id){
  var container=document.getElementById(id);
  if(!container)return;
  var defArr=[3,2,1,5,6,4];
  var defK=2;

  function heapify(arr,n,i){
    var largest=i,l=2*i+1,r=2*i+2;
    if(l<n&&arr[l]>arr[largest])largest=l;
    if(r<n&&arr[r]>arr[largest])largest=r;
    if(largest!==i){var t=arr[i];arr[i]=arr[largest];arr[largest]=t;heapify(arr,n,largest);}
  }

  function buildSteps(arr,k){
    var steps=[];
    var a=arr.slice();
    var n=a.length;
    steps.push({arr:a.slice(),phase:'start',msg:'Build max-heap, then extract max '+k+' time(s). The kth extraction is the kth largest.'});
    // Build heap
    for(var i=Math.floor(n/2)-1;i>=0;i--){
      heapify(a,n,i);
      steps.push({arr:a.slice(),phase:'build',hl:i,msg:'Heapify index '+i+' → heap: ['+a.join(',')+']'});
    }
    // Extract k times
    var heapSize=n,extracted=[];
    for(var e=0;e<k;e++){
      var top=a[0];
      extracted.push(top);
      a[0]=a[heapSize-1];
      heapSize--;
      heapify(a,heapSize,0);
      steps.push({arr:a.slice(),heapSize:heapSize,phase:'extract',extracted:extracted.slice(),top:top,
        msg:'Extract #'+(e+1)+': removed '+top+' (heap max). Heap size now '+heapSize+'.'});
    }
    steps[steps.length-1].done=true;
    steps[steps.length-1].msg='The '+k+'th largest = '+extracted[k-1];
    steps[steps.length-1].answer=extracted[k-1];
    return steps;
  }

  function draw(s,ctx,W,H){
    bg(ctx,W,H);
    if(!s)return;
    var arr=s.arr,n=arr.length,hs=s.heapSize!=null?s.heapSize:n;
    var cw=Math.min(46,(W-40)/n),gap=4,ox=(W-n*(cw+gap))/2;
    arr.forEach(function(v,i){
      var inHeap=i<hs;
      var st=!inHeap?'water':(s.hl===i?'active':(i===0?'comparing':'selected'));
      if(s.done&&s.answer===v&&i===0)st='found';
      cell(ctx,ox+i*(cw+gap),H/2-14,cw,28,v,st);
    });
    if(s.extracted&&s.extracted.length){
      lbl(ctx,'extracted: ['+s.extracted.join(',')+']',W/2,H/2+32,'rgba(167,139,250,0.7)',10,'center');
    }
    if(s.answer!=null)lbl(ctx,s.k+'th largest = '+s.answer,W/2,H-10,s.done?'#34d399':'#c4b5fd',13,'center');
  }

  makeProbUI(container,{canvasW:620,canvasH:180,
    approaches:[{key:'a1',label:'Max-Heap Extract K Times O(n + k log n)'}],
    inputs:[
      {id:'arr',lbl:'Array:',elem:inp(defArr.join(','),'comma-separated',160)},
      {id:'k',lbl:'K:',elem:inp(String(defK),'k',40)}
    ],
    onInputs:function(v){
      var a=v.arr.split(',').map(function(x){return parseInt(x.trim(),10);}).filter(function(x){return!isNaN(x);});
      var k=parseInt(v.k,10);
      if(a.length)defArr=a;
      if(!isNaN(k)&&k>0&&k<=defArr.length)defK=k;
    },
    buildSteps:function(){return buildSteps(defArr,defK).map(function(s){s.k=defK;return s;});},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},
    onReset:function(ctx,W,H){draw({arr:defArr,heapSize:defArr.length},ctx,W,H);}
  });
}

/* ── P72 Task Scheduler ─────────────────────────────────── */
function initTaskScheduler(id){
  var container=document.getElementById(id);
  if(!container)return;
  var defTasks='AAABBC';
  var defN=2;

  function buildSteps(tasks,n){
    var steps=[];
    var freq={};
    tasks.split('').forEach(function(c){freq[c]=(freq[c]||0)+1;});
    var counts=Object.values(freq).sort(function(a,b){return b-a;});
    steps.push({counts:counts.slice(),slots:[],time:0,msg:'Task frequencies: '+JSON.stringify(freq)+'. n='+n+' (cooldown). Greedy: always pick highest-freq available task.'});
    var maxF=counts[0];
    var maxCount=counts.filter(function(c){return c===maxF;}).length;
    // Ideal time = (maxF-1)*(n+1) + maxCount
    var ideal=(maxF-1)*(n+1)+maxCount;
    var ans=Math.max(ideal,tasks.length);
    // Simulate slot by slot
    var time=0;
    var remaining=counts.map(function(c,i){return{freq:c,id:String.fromCharCode(65+i)};});
    var slots=[];
    while(remaining.some(function(r){return r.freq>0;})){
      remaining.sort(function(a,b){return b.freq-a.freq;});
      var cycle=Math.min(n+1,remaining.filter(function(r){return r.freq>0;}).length);
      for(var i=0;i<n+1;i++){
        if(remaining[i]&&remaining[i].freq>0){
          slots.push({task:remaining[i].id,idle:false,t:time+i});
          remaining[i].freq--;
          steps.push({counts:remaining.map(function(r){return r.freq;}),slots:slots.slice(),time:time+i,
            msg:'t='+(time+i)+': run task '+remaining[i].id+'. Remaining: '+remaining.filter(function(r){return r.freq>0;}).map(function(r){return r.id+'×'+r.freq;}).join(', ')});
        } else if(remaining.some(function(r){return r.freq>0;})){
          slots.push({task:'idle',idle:true,t:time+i});
          steps.push({counts:remaining.map(function(r){return r.freq;}),slots:slots.slice(),time:time+i,msg:'t='+(time+i)+': IDLE (cooldown needed).'});
        }
      }
      time+=n+1;
    }
    steps[steps.length-1].done=true;
    steps[steps.length-1].ans=slots.length;
    steps[steps.length-1].msg='Total time = '+slots.length+' intervals';
    return steps;
  }

  function draw(s,ctx,W,H){
    bg(ctx,W,H);
    if(!s)return;
    var slots=s.slots||[];
    var cw=26,gap=3,ox=12;
    slots.forEach(function(sl,i){
      var x=ox+i*(cw+gap);
      if(x+cw>W-10)return;
      var st=sl.idle?'water':'active';
      cell(ctx,x,H/2-22,cw,28,sl.task,st);
      if(i%5===0)lbl(ctx,sl.t,x+cw/2,H/2-28,'rgba(255,255,255,0.25)',7,'center');
    });
    if(s.ans!=null)lbl(ctx,'Total intervals = '+s.ans,W/2,H-10,s.done?'#34d399':'#c4b5fd',13,'center');
  }

  makeProbUI(container,{canvasW:620,canvasH:170,
    approaches:[{key:'a1',label:'Greedy: (maxFreq-1)×(n+1)+maxCount or tasks.length'}],
    inputs:[
      {id:'tasks',lbl:'Tasks:',elem:inp(defTasks,'letters',100)},
      {id:'n',lbl:'Cooldown n:',elem:inp(String(defN),'n',40)}
    ],
    onInputs:function(v){
      var t=v.tasks.trim().toUpperCase().replace(/[^A-Z]/g,'');
      var nn=parseInt(v.n,10);
      if(t.length)defTasks=t;
      if(!isNaN(nn)&&nn>=0)defN=nn;
    },
    buildSteps:function(){return buildSteps(defTasks,defN);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},
    onReset:function(ctx,W,H){draw({slots:[]},ctx,W,H);}
  });
}

/* ── P73 Gas Station ────────────────────────────────────── */
function initGasStation(id){
  var container=document.getElementById(id);
  if(!container)return;
  var defGas=[1,2,3,4,5];
  var defCost=[3,4,5,1,2];

  function buildSteps(gas,cost){
    var steps=[];
    var n=gas.length;
    var diff=gas.map(function(g,i){return g-cost[i];});
    steps.push({gas:gas,cost:cost,diff:diff,start:-1,tank:0,sum:0,i:-1,msg:'net[i]=gas[i]-cost[i]. If total≥0, a solution exists. Greedy: track running sum; reset start when tank<0.'});
    var total=0,tank=0,start=0;
    for(var i=0;i<n;i++){
      tank+=diff[i];total+=diff[i];
      steps.push({gas:gas,cost:cost,diff:diff,start:start,tank:tank,total:total,i:i,
        msg:'i='+i+': net='+diff[i]+', tank='+tank+(tank<0?' → reset start to '+(i+1):'')});
      if(tank<0){start=i+1;tank=0;}
    }
    var ans=total>=0?start:-1;
    steps[steps.length-1].done=true;
    steps[steps.length-1].ans=ans;
    steps[steps.length-1].msg=total>=0?'Total net='+total+'≥0 → answer = start station '+ans:'Total net='+total+'<0 → impossible (-1)';
    return steps;
  }

  function draw(s,ctx,W,H){
    bg(ctx,W,H);
    if(!s||!s.gas)return;
    var gas=s.gas,cost=s.cost,n=gas.length;
    var cw=44,gap=6,ox=(W-n*(cw+gap))/2;
    gas.forEach(function(g,i){
      var isStart=s.start===i;
      var isCur=s.i===i;
      var st=isCur?'active':(isStart?'found':'selected');
      if(s.done&&s.ans===i)st='found';
      cell(ctx,ox+i*(cw+gap),H/2-38,cw,22,'g:'+g,st);
      cell(ctx,ox+i*(cw+gap),H/2-12,cw,22,'c:'+cost[i],isCur?'comparing':'water');
      var d=g-cost[i];
      cell(ctx,ox+i*(cw+gap),H/2+14,cw,22,(d>=0?'+':'')+d,d>=0?'sorted':'water');
    });
    lbl(ctx,'gas','left'==''?0:ox-28,H/2-28,'rgba(52,211,153,0.6)',8,'left');
    lbl(ctx,'cost',ox-30,H/2-2,'rgba(239,68,68,0.6)',8,'left');
    lbl(ctx,'net',ox-28,H/2+24,'rgba(167,139,250,0.6)',8,'left');
    lbl(ctx,'tank='+s.tank+'  start='+s.start,W/2,H-24,'rgba(255,255,255,0.5)',10,'center');
    if(s.ans!=null)lbl(ctx,s.ans>=0?'Start at station '+s.ans:'No solution (-1)',W/2,H-8,s.done?'#34d399':'#c4b5fd',13,'center');
  }

  makeProbUI(container,{canvasW:620,canvasH:220,
    approaches:[{key:'a1',label:'Greedy O(n) — reset start when tank < 0'}],
    inputs:[
      {id:'gas',lbl:'Gas:',elem:inp(defGas.join(','),'comma-separated',140)},
      {id:'cost',lbl:'Cost:',elem:inp(defCost.join(','),'comma-separated',140)}
    ],
    onInputs:function(v){
      var g=v.gas.split(',').map(function(x){return parseInt(x.trim(),10);}).filter(function(x){return!isNaN(x);});
      var c=v.cost.split(',').map(function(x){return parseInt(x.trim(),10);}).filter(function(x){return!isNaN(x);});
      if(g.length===c.length&&g.length){defGas=g;defCost=c;}
    },
    buildSteps:function(){return buildSteps(defGas,defCost);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},
    onReset:function(ctx,W,H){draw({gas:defGas,cost:defCost,start:0,tank:0,i:-1},ctx,W,H);}
  });
}

/* ── P74 Non-overlapping Intervals ──────────────────────── */
function initNonOverlappingIntervals(id){
  var container=document.getElementById(id);
  if(!container)return;
  var defIntervals=[[1,2],[2,3],[3,4],[1,3]];

  function buildSteps(intervals){
    var steps=[];
    var sorted=intervals.slice().sort(function(a,b){return a[1]-b[1]||a[0]-b[0];});
    steps.push({intervals:intervals,sorted:sorted,keep:[],remove:[],prevEnd:null,i:-1,
      msg:'Sort by end time. Greedily keep interval with earliest end → maximizes room for future intervals.'});
    var keep=[],remove=[],prevEnd=-Infinity;
    sorted.forEach(function(iv,i){
      if(iv[0]>=prevEnd){
        keep.push(i);prevEnd=iv[1];
        steps.push({intervals:intervals,sorted:sorted,keep:keep.slice(),remove:remove.slice(),prevEnd:prevEnd,i:i,
          msg:'Keep ['+iv[0]+','+iv[1]+']: starts at '+iv[0]+'≥prevEnd='+prevEnd+'. New prevEnd='+iv[1]});
      } else {
        remove.push(i);
        steps.push({intervals:intervals,sorted:sorted,keep:keep.slice(),remove:remove.slice(),prevEnd:prevEnd,i:i,
          msg:'Remove ['+iv[0]+','+iv[1]+']: overlaps ('+iv[0]+'<prevEnd='+prevEnd+')'});
      }
    });
    steps[steps.length-1].done=true;
    steps[steps.length-1].ans=remove.length;
    steps[steps.length-1].msg='Minimum removals = '+remove.length;
    return steps;
  }

  function draw(s,ctx,W,H){
    bg(ctx,W,H);
    if(!s||!s.sorted)return;
    var sorted=s.sorted,keep=s.keep||[],remove=s.remove||[];
    var maxEnd=Math.max.apply(null,sorted.map(function(iv){return iv[1];}));
    var minStart=Math.min.apply(null,sorted.map(function(iv){return iv[0];}));
    var range=maxEnd-minStart||1;
    var barH=18,gap=6,ox=40,ow=W-80;
    sorted.forEach(function(iv,i){
      var x=ox+(iv[0]-minStart)/range*ow;
      var w=Math.max(6,(iv[1]-iv[0])/range*ow);
      var y=30+i*(barH+gap);
      var isKeep=keep.indexOf(i)>=0;
      var isRemove=remove.indexOf(i)>=0;
      var st=isRemove?'water':(isKeep?'sorted':(s.i===i?'active':'default'));
      rr(ctx,x,y,w,barH,4);
      ctx.fillStyle=CS[st]||CS.default;ctx.fill();
      lbl(ctx,'['+iv[0]+','+iv[1]+']',x+w/2,y+barH/2+4,'#fff',9,'center');
    });
    lbl(ctx,'0',ox,H-16,'rgba(255,255,255,0.3)',8,'center');
    lbl(ctx,maxEnd,ox+ow,H-16,'rgba(255,255,255,0.3)',8,'center');
    if(s.ans!=null)lbl(ctx,'Remove '+s.ans+' interval'+(s.ans===1?'':'s'),W/2,H-4,s.done?'#34d399':'#c4b5fd',13,'center');
  }

  makeProbUI(container,{canvasW:520,canvasH:220,
    approaches:[{key:'a1',label:'Greedy Sort by End O(n log n)'}],
    inputs:[{id:'ivs',lbl:'Intervals:',elem:inp(defIntervals.map(function(iv){return iv[0]+'-'+iv[1];}).join(','),'e.g. 1-2,2-3',180)}],
    onInputs:function(v){
      var parts=v.ivs.split(',');
      var ivs=parts.map(function(p){var m=p.trim().match(/(-?\d+)[^-\d](-?\d+)/);return m?[parseInt(m[1],10),parseInt(m[2],10)]:null;}).filter(Boolean);
      if(ivs.length)defIntervals=ivs;
    },
    buildSteps:function(){return buildSteps(defIntervals);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},
    onReset:function(ctx,W,H){draw({sorted:defIntervals.slice().sort(function(a,b){return a[1]-b[1];}),keep:[],remove:[]},ctx,W,H);}
  });
}

/* ── P75 Palindromic Substrings ─────────────────────────── */
function initPalindromicSubstrings(id){
  var container=document.getElementById(id);
  if(!container)return;
  var defS='aabaa';

  function expand(s,l,r){
    var count=0;
    while(l>=0&&r<s.length&&s[l]===s[r]){count++;l--;r++;}
    return count;
  }

  function buildSteps(s){
    var steps=[];
    var n=s.length,total=0;
    steps.push({s:s,l:-1,r:-1,found:[],total:0,msg:'Expand-around-center: for each index (odd) and each gap (even), expand outward while s[l]===s[r].'});
    var found=[];
    for(var c=0;c<n;c++){
      // odd length
      var l=c,r=c;
      while(l>=0&&r<n&&s[l]===s[r]){
        total++;found.push(s.slice(l,r+1));
        steps.push({s:s,l:l,r:r,found:found.slice(),total:total,
          msg:'Odd center at '+c+': "'+s.slice(l,r+1)+'" is palindrome. Count='+total});
        l--;r++;
      }
      // even length
      l=c;r=c+1;
      while(l>=0&&r<n&&s[l]===s[r]){
        total++;found.push(s.slice(l,r+1));
        steps.push({s:s,l:l,r:r,found:found.slice(),total:total,
          msg:'Even center between '+c+','+(c+1)+': "'+s.slice(l,r+1)+'" is palindrome. Count='+total});
        l--;r++;
      }
    }
    steps[steps.length-1].done=true;
    steps[steps.length-1].msg='Total palindromic substrings = '+total;
    return steps;
  }

  function draw(s,ctx,W,H,step){
    bg(ctx,W,H);
    if(!step)return;
    var str=step.s||s,n=str.length;
    var cw=Math.min(48,(W-40)/n),gap=4,ox=(W-n*(cw+gap))/2;
    str.split('').forEach(function(c,i){
      var inRange=step.l>=0&&i>=step.l&&i<=step.r;
      var st=inRange?'found':(step.l>=0&&(i===step.l-1||i===step.r+1)?'comparing':'default');
      cell(ctx,ox+i*(cw+gap),H/2-20,cw,28,c,st);
    });
    if(step.found&&step.found.length){
      var uniq=[...new Set(step.found)].slice(-8);
      lbl(ctx,'recent: '+uniq.join(', '),W/2,H/2+26,'rgba(52,211,153,0.7)',9,'center');
    }
    if(step.total!=null)lbl(ctx,'count = '+step.total,W/2,H-10,step.done?'#34d399':'#c4b5fd',13,'center');
  }

  makeProbUI(container,{canvasW:560,canvasH:180,
    approaches:[{key:'a1',label:'Expand Around Center O(n²)'}],
    inputs:[{id:'s',lbl:'String:',elem:inp(defS,'text',120)}],
    onInputs:function(v){var t=v.s.trim().toLowerCase();if(t.length)defS=t;},
    buildSteps:function(){return buildSteps(defS);},
    onStep:function(s,ctx,W,H){draw(defS,ctx,W,H,s);},
    onReset:function(ctx,W,H){draw(defS,ctx,W,H,{s:defS,l:-1,r:-1,found:[],total:0});}
  });
}

/* ── P76 Minimum Window Substring ───────────────────────── */
function initMinWindowSubstring(id){
  var container=document.getElementById(id);
  if(!container)return;
  var defS='ADOBECODEBANC';
  var defT='ABC';

  function buildSteps(s,t){
    var steps=[];
    var need={},have={},formed=0,required=0;
    t.split('').forEach(function(c){need[c]=(need[c]||0)+1;});
    required=Object.keys(need).length;
    steps.push({s:s,l:0,r:-1,have:{},formed:0,required:required,best:null,
      msg:'Need: '+JSON.stringify(need)+'. Expand right; shrink left when window is valid.'});
    var l=0,best=null,bestLen=Infinity,window={};
    for(var r=0;r<s.length;r++){
      var c=s[r];
      window[c]=(window[c]||0)+1;
      if(need[c]&&window[c]===need[c])formed++;
      steps.push({s:s,l:l,r:r,have:Object.assign({},window),formed:formed,required:required,best:best,
        msg:'Expand r='+r+'('+c+'): formed='+formed+'/'+required});
      while(formed===required){
        var wlen=r-l+1;
        if(wlen<bestLen){bestLen=wlen;best=s.slice(l,r+1);}
        var lc=s[l];
        steps.push({s:s,l:l,r:r,have:Object.assign({},window),formed:formed,required:required,best:best,
          msg:'Valid window "'+s.slice(l,r+1)+'". Best="'+best+'". Shrink left.'});
        window[lc]--;
        if(need[lc]&&window[lc]<need[lc])formed--;
        l++;
      }
    }
    steps[steps.length-1].done=true;
    steps[steps.length-1].best=best||'';
    steps[steps.length-1].msg='Minimum window = "'+(best||'')+'"'+(best?'':' (not found)');
    return steps;
  }

  function draw(s,ctx,W,H,step){
    bg(ctx,W,H);
    if(!step)return;
    var str=step.s||s,n=str.length;
    var cw=Math.max(18,Math.min(30,(W-20)/n)),gap=2,ox=(W-n*(cw+gap))/2;
    str.split('').forEach(function(c,i){
      var inWindow=step.l>=0&&step.r>=0&&i>=step.l&&i<=step.r;
      var isBest=step.best&&str.indexOf(step.best)>=0&&i>=str.indexOf(step.best)&&i<str.indexOf(step.best)+step.best.length;
      var isL=i===step.l,isR=i===step.r;
      var st=isL||isR?'active':(isBest&&step.done?'found':(inWindow?'selected':'default'));
      cell(ctx,ox+i*(cw+gap),H/2-14,cw,26,c,st);
    });
    if(step.best)lbl(ctx,'best: "'+step.best+'"',W/2,H/2+24,step.done?'#34d399':'#fbbf24',11,'center');
    lbl(ctx,'formed '+step.formed+'/'+step.required,W/2,H-10,'rgba(167,139,250,0.7)',10,'center');
  }

  makeProbUI(container,{canvasW:680,canvasH:180,
    approaches:[{key:'a1',label:'Sliding Window O(|s|+|t|)'}],
    inputs:[
      {id:'s',lbl:'s:',elem:inp(defS,'haystack',200)},
      {id:'t',lbl:'t:',elem:inp(defT,'needle',80)}
    ],
    onInputs:function(v){if(v.s.trim())defS=v.s.trim();if(v.t.trim())defT=v.t.trim();},
    buildSteps:function(){return buildSteps(defS,defT);},
    onStep:function(s,ctx,W,H){draw(defS,ctx,W,H,s);},
    onReset:function(ctx,W,H){draw(defS,ctx,W,H,{s:defS,l:0,r:-1,have:{},formed:0,required:0,best:null});}
  });
}

/* ── P77 Binary Tree Max Path Sum ───────────────────────── */
function initMaxPathSum(id){
  var container=document.getElementById(id);
  if(!container)return;
  var defArr=[-10,9,20,null,null,15,7];
  function buildSteps(arr){
    var steps=[];
    var root=_mkTree(arr);
    if(!root){steps.push({hl:{},best:null,msg:'Empty tree.'});return steps;}
    steps.push({hl:{},best:null,msg:'Post-order DFS: gain=max(0,child_return). Path through node = val+leftGain+rightGain. Track global max.'});
    var best=-Infinity;
    var visits=[];
    function dfs(node){
      if(!node)return 0;
      var lg=Math.max(0,dfs(node.left));
      var rg=Math.max(0,dfs(node.right));
      var pt=node.val+lg+rg;
      if(pt>best)best=pt;
      visits.push({val:node.val,lg:lg,rg:rg,pt:pt,best:best,
        lv:node.left?node.left.val:null,rv:node.right?node.right.val:null});
      return node.val+Math.max(lg,rg);
    }
    dfs(root);
    visits.forEach(function(v){
      var hl={};hl[v.val]='active';
      if(v.lv!=null)hl[v.lv]='comparing';if(v.rv!=null)hl[v.rv]='comparing';
      steps.push({hl:hl,best:v.best,pt:v.pt,
        msg:'Node '+v.val+': leftGain='+v.lg+' rightGain='+v.rg+' → path='+v.val+'+'+v.lg+'+'+v.rg+'='+v.pt+' (best='+v.best+')'});
    });
    steps[steps.length-1].done=true;
    steps[steps.length-1].msg='Max path sum = '+best;
    return steps;
  }
  makeProbUI(container,{canvasW:520,canvasH:280,
    approaches:[{key:'a1',label:'Post-order DFS O(n)'}],
    inputs:[{id:'arr',lbl:'Tree (level-order):',elem:inp(defArr.map(function(v){return v===null?'null':v;}).join(','),'null=empty node',250)}],
    onInputs:function(v){var a=v.arr.split(',').map(function(x){var t=x.trim();return t==='null'||t===''?null:parseInt(t,10);});if(a.length)defArr=a;},
    buildSteps:function(){return buildSteps(defArr);},
    onStep:function(s,ctx,W,H){var r=_mkTree(defArr);_drawTree(ctx,r,W,H,s.hl||{});if(s.best!=null&&isFinite(s.best))lbl(ctx,'max='+s.best,W/2,H-10,s.done?'#34d399':'#c4b5fd',13,'center');},
    onReset:function(ctx,W,H){var r=_mkTree(defArr);_drawTree(ctx,r,W,H,{});}
  });
}

/* ── P78 Construct Binary Tree ──────────────────────────── */
function initConstructBinaryTree(id){
  var container=document.getElementById(id);
  if(!container)return;
  var defPre=[3,9,20,15,7];
  var defIn=[9,3,15,20,7];
  function buildSteps(pre,ino){
    var steps=[];
    steps.push({preHL:new Array(pre.length).fill('default'),inHL:new Array(ino.length).fill('default'),rootVal:null,
      msg:'preorder[0] is root. Find root in inorder to split left/right subtrees. Recurse.'});
    function recurse(pS,pE,iS,iE){
      if(pS>pE)return;
      var rootVal=pre[pS];
      var iIdx=ino.indexOf(rootVal,iS);
      var lSize=iIdx-iS;
      var preHL=new Array(pre.length).fill('default');
      var inHL=new Array(ino.length).fill('default');
      preHL[pS]='active';
      for(var i=pS+1;i<=pS+lSize;i++)preHL[i]='selected';
      for(var i=pS+lSize+1;i<=pE;i++)preHL[i]='comparing';
      for(var i=iS;i<iIdx;i++)inHL[i]='selected';
      inHL[iIdx]='active';
      for(var i=iIdx+1;i<=iE;i++)inHL[i]='comparing';
      steps.push({preHL:preHL,inHL:inHL,rootVal:rootVal,lSize:lSize,rSize:iE-iIdx,
        msg:'Root='+rootVal+' (pre['+pS+']). Inorder idx='+iIdx+'. Left='+lSize+' nodes, Right='+(iE-iIdx)+' nodes.'});
      recurse(pS+1,pS+lSize,iS,iIdx-1);
      recurse(pS+lSize+1,pE,iIdx+1,iE);
    }
    recurse(0,pre.length-1,0,ino.length-1);
    steps[steps.length-1].done=true;
    steps[steps.length-1].msg='Tree constructed from '+pre.length+' nodes.';
    return steps;
  }
  function draw(s,ctx,W,H,pre,ino){
    bg(ctx,W,H);if(!s)return;
    var n=pre.length,cw=Math.min(38,(W-60)/n),gap=3,ox=(W-n*(cw+gap))/2;
    lbl(ctx,'pre:',ox-30,H/3-22,'rgba(167,139,250,0.8)',9,'left');
    pre.forEach(function(v,i){cell(ctx,ox+i*(cw+gap),H/3-34,cw,24,v,(s.preHL&&s.preHL[i])||'default');});
    lbl(ctx,'in:',ox-30,H/3+24,'rgba(6,182,212,0.8)',9,'left');
    ino.forEach(function(v,i){cell(ctx,ox+i*(cw+gap),H/3+12,cw,24,v,(s.inHL&&s.inHL[i])||'default');});
    if(s.rootVal!=null)lbl(ctx,'root='+s.rootVal+'  left='+s.lSize+'  right='+s.rSize,W/2,H/2+34,'rgba(255,255,255,0.6)',10,'center');
    if(s.done)lbl(ctx,'Tree built!',W/2,H-10,'#34d399',13,'center');
  }
  makeProbUI(container,{canvasW:560,canvasH:220,
    approaches:[{key:'a1',label:'Divide & Conquer O(n²) / O(n) with hashmap'}],
    inputs:[
      {id:'pre',lbl:'Preorder:',elem:inp(defPre.join(','),'preorder',130)},
      {id:'ino',lbl:'Inorder:',elem:inp(defIn.join(','),'inorder',130)}
    ],
    onInputs:function(v){
      var p=v.pre.split(',').map(function(x){return parseInt(x.trim(),10);}).filter(function(x){return!isNaN(x);});
      var i=v.ino.split(',').map(function(x){return parseInt(x.trim(),10);}).filter(function(x){return!isNaN(x);});
      if(p.length===i.length&&p.length)defPre=p,defIn=i;
    },
    buildSteps:function(){return buildSteps(defPre,defIn);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H,defPre,defIn);},
    onReset:function(ctx,W,H){draw({preHL:new Array(defPre.length).fill('default'),inHL:new Array(defIn.length).fill('default')},ctx,W,H,defPre,defIn);}
  });
}

/* ── P79 Letter Combinations of Phone Number ────────────── */
function initLetterCombinations(id){
  var container=document.getElementById(id);
  if(!container)return;
  var defDigits='23';
  var phoneMap={2:'abc',3:'def',4:'ghi',5:'jkl',6:'mno',7:'pqrs',8:'tuv',9:'wxyz'};
  function buildSteps(digits){
    var steps=[];
    if(!digits||!digits.length){return [{combinations:[],cur:'',done:true,msg:'Empty digits → empty result.'}];}
    steps.push({combinations:[],cur:'',msg:'Backtrack: for each digit position, try each mapped letter. Complete path = one combination.'});
    var result=[],calls=[];
    function bt(idx,cur){
      if(idx===digits.length){result.push(cur);calls.push({cur:cur,idx:idx,finished:true,result:result.slice()});return;}
      var letters=phoneMap[parseInt(digits[idx])]||'';
      for(var i=0;i<letters.length;i++){
        calls.push({cur:cur+letters[i],idx:idx+1,letter:letters[i],digit:digits[idx],result:result.slice()});
        bt(idx+1,cur+letters[i]);
      }
    }
    bt(0,'');
    calls.forEach(function(c){
      steps.push({combinations:c.result,cur:c.cur,idx:c.idx,
        msg:c.finished?'✓ "'+c.cur+'" complete.':'depth='+c.idx+': "'+c.digit+'"→"'+c.letter+'", path="'+c.cur+'"'});
    });
    steps[steps.length-1].done=true;
    steps[steps.length-1].msg=result.length+' combinations: '+result.map(function(r){return'"'+r+'"';}).join(', ');
    return steps;
  }
  function draw(s,ctx,W,H,digits){
    bg(ctx,W,H);
    var dy=20;
    digits.split('').forEach(function(d,i){lbl(ctx,d+'→'+phoneMap[parseInt(d)],20+i*90,dy+14,'rgba(167,139,250,0.8)',10,'left');});
    if(s&&s.cur!=null)lbl(ctx,'"'+s.cur+'"',W/2,H/2+10,'rgba(255,255,255,0.95)',20,'center');
    if(s&&s.combinations&&s.combinations.length)lbl(ctx,'['+s.combinations.join(', ')+']',W/2,H-26,'rgba(52,211,153,0.8)',10,'center');
    if(s&&s.done)lbl(ctx,s.combinations.length+' total',W/2,H-10,'#34d399',12,'center');
  }
  makeProbUI(container,{canvasW:520,canvasH:200,
    approaches:[{key:'a1',label:'Backtracking O(4^n · n)'}],
    inputs:[{id:'digits',lbl:'Digits:',elem:inp(defDigits,'2-9 only, max 4',80)}],
    onInputs:function(v){var d=v.digits.trim().replace(/[^2-9]/g,'').slice(0,4);if(d.length)defDigits=d;},
    buildSteps:function(){return buildSteps(defDigits);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H,defDigits);},
    onReset:function(ctx,W,H){draw({combinations:[],cur:''},ctx,W,H,defDigits);}
  });
}

/* ── P80 Rotate Image ───────────────────────────────────── */
function initRotateImage(id){
  var container=document.getElementById(id);
  if(!container)return;
  var defMatrix=[[1,2,3],[4,5,6],[7,8,9]];
  function buildSteps(matrix){
    var steps=[];
    var n=matrix.length;
    var m=matrix.map(function(r){return r.slice();});
    steps.push({m:m.map(function(r){return r.slice();}),phase:'start',hi:-1,hj:-1,
      msg:'Rotate 90° clockwise: Step 1 = Transpose (swap [i][j]↔[j][i]). Step 2 = Reverse each row.'});
    for(var i=0;i<n;i++){
      for(var j=i+1;j<n;j++){
        var tmp=m[i][j];m[i][j]=m[j][i];m[j][i]=tmp;
        steps.push({m:m.map(function(r){return r.slice();}),phase:'transpose',hi:i,hj:j,
          msg:'Transpose: swap ['+i+']['+j+']↔['+j+']['+i+']'});
      }
    }
    for(var i=0;i<n;i++){
      m[i].reverse();
      steps.push({m:m.map(function(r){return r.slice();}),phase:'reverse',hi:i,hj:-1,
        msg:'Reverse row '+i+': ['+m[i].join(',')+']'});
    }
    steps[steps.length-1].done=true;
    steps[steps.length-1].msg='Rotated 90° clockwise.';
    return steps;
  }
  function draw(s,ctx,W,H){
    bg(ctx,W,H);if(!s||!s.m)return;
    var m=s.m,n=m.length,cw=42,gap=3;
    var ox=(W-n*(cw+gap))/2,oy=(H-n*(cw+gap))/2-8;
    for(var i=0;i<n;i++)for(var j=0;j<n;j++){
      var hl=(s.phase==='transpose'&&((i===s.hi&&j===s.hj)||(i===s.hj&&j===s.hi)))||(s.phase==='reverse'&&i===s.hi);
      cell(ctx,ox+j*(cw+gap),oy+i*(cw+gap),cw,cw-2,m[i][j],hl?'active':'selected');
    }
    if(s.done)lbl(ctx,'Rotated!',W/2,H-8,'#34d399',13,'center');
  }
  makeProbUI(container,{canvasW:380,canvasH:240,
    approaches:[{key:'a1',label:'Transpose + Reverse Rows O(n²) time · O(1) space'}],
    inputs:[{id:'mat',lbl:'Rows (sep by ;):',elem:inp('1,2,3;4,5,6;7,8,9','e.g. 1,2;3,4',180)}],
    onInputs:function(v){var rows=v.mat.split(';').map(function(r){return r.split(',').map(function(x){return parseInt(x.trim(),10);}).filter(function(x){return!isNaN(x);});});var n=rows.length;if(n>=2&&rows.every(function(r){return r.length===n;}))defMatrix=rows;},
    buildSteps:function(){return buildSteps(defMatrix);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},
    onReset:function(ctx,W,H){draw({m:defMatrix.map(function(r){return r.slice();}),phase:'start',hi:-1,hj:-1},ctx,W,H);}
  });
}

/* ── P81 Set Matrix Zeroes ──────────────────────────────── */
function initSetMatrixZeroes(id){
  var container=document.getElementById(id);
  if(!container)return;
  var defMatrix=[[1,1,1],[1,0,1],[1,1,1]];
  function buildSteps(matrix){
    var steps=[];
    var rows=matrix.length,cols=matrix[0].length;
    var m=matrix.map(function(r){return r.slice();});
    var zR=[],zC=[];
    steps.push({m:m.map(function(r){return r.slice();}),zR:[],zC:[],phase:'scan',hi:-1,hj:-1,
      msg:'Pass 1: scan for zeros, collect row/col indices. Pass 2: zero those rows and cols.'});
    for(var i=0;i<rows;i++)for(var j=0;j<cols;j++){
      if(m[i][j]===0){
        zR.push(i);zC.push(j);
        steps.push({m:m.map(function(r){return r.slice();}),zR:zR.slice(),zC:zC.slice(),phase:'scan',hi:i,hj:j,
          msg:'Zero at ['+i+']['+j+']: will zero row '+i+' and col '+j+'.'});
      }
    }
    zR.forEach(function(r){for(var j=0;j<cols;j++)m[r][j]=0;
      steps.push({m:m.map(function(r){return r.slice();}),zR:zR.slice(),zC:zC.slice(),phase:'zero_row',hi:r,hj:-1,
        msg:'Zero row '+r+'.'});
    });
    zC.forEach(function(c){for(var i=0;i<rows;i++)m[i][c]=0;
      steps.push({m:m.map(function(r){return r.slice();}),zR:zR.slice(),zC:zC.slice(),phase:'zero_col',hi:-1,hj:c,
        msg:'Zero column '+c+'.'});
    });
    steps[steps.length-1].done=true;
    return steps;
  }
  function draw(s,ctx,W,H){
    bg(ctx,W,H);if(!s||!s.m)return;
    var m=s.m,rows=m.length,cols=m[0].length;
    var cw=Math.min(44,Math.floor((W-40)/cols)),rh=Math.min(44,Math.floor((H-60)/rows));
    var ox=(W-cols*(cw+3))/2,oy=(H-rows*(rh+3))/2-8;
    for(var i=0;i<rows;i++)for(var j=0;j<cols;j++){
      var zR=s.zR||[],zC=s.zC||[];
      var isCur=s.hi===i&&s.hj===j;
      var inZR=s.phase==='zero_row'&&s.hi===i;
      var inZC=s.phase==='zero_col'&&s.hj===j;
      var st=isCur?'active':(inZR||inZC?'comparing':(m[i][j]===0?'water':(zR.indexOf(i)>=0||zC.indexOf(j)>=0?'selected':'default')));
      cell(ctx,ox+j*(cw+3),oy+i*(rh+3),cw,rh,m[i][j],st);
    }
    if(s.done)lbl(ctx,'Done',W/2,H-8,'#34d399',13,'center');
  }
  makeProbUI(container,{canvasW:380,canvasH:220,
    approaches:[{key:'a1',label:'O(1) space: use first row/col as markers'}],
    inputs:[{id:'mat',lbl:'Rows (sep by ;):',elem:inp('1,1,1;1,0,1;1,1,1','rows sep by ;',200)}],
    onInputs:function(v){var rows=v.mat.split(';').map(function(r){return r.split(',').map(function(x){return parseInt(x.trim(),10);});});if(rows.length>=1&&rows.every(function(r){return r.length===rows[0].length&&r.every(function(x){return!isNaN(x);})}))defMatrix=rows;},
    buildSteps:function(){return buildSteps(defMatrix);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},
    onReset:function(ctx,W,H){draw({m:defMatrix.map(function(r){return r.slice();}),zR:[],zC:[],phase:'scan',hi:-1,hj:-1},ctx,W,H);}
  });
}

/* ── P82 Longest Palindromic Subsequence ────────────────── */
function initLongestPalinSubseq(id){
  var container=document.getElementById(id);
  if(!container)return;
  var defS='bbbab';
  function buildSteps(s){
    var steps=[];
    var n=s.length;
    var dp=Array.from({length:n},function(){return new Array(n).fill(0);});
    steps.push({dp:dp.map(function(r){return r.slice();}),ci:-1,cj:-1,
      msg:'dp[i][j]=LPS length of s[i..j]. Base: dp[i][i]=1. Fill by increasing length.'});
    for(var i=0;i<n;i++){dp[i][i]=1;
      steps.push({dp:dp.map(function(r){return r.slice();}),ci:i,cj:i,
        msg:'dp['+i+']['+i+']=1 (single char "'+s[i]+'")'});}
    for(var len=2;len<=n;len++){
      for(var i=0;i<=n-len;i++){
        var j=i+len-1;
        if(s[i]===s[j]){dp[i][j]=dp[i+1][j-1]+2;
          steps.push({dp:dp.map(function(r){return r.slice();}),ci:i,cj:j,
            msg:'s['+i+']=s['+j+']="'+s[i]+'" match → dp['+i+']['+j+']=dp['+(i+1)+']['+(j-1)+']+2='+dp[i][j]});}
        else{dp[i][j]=Math.max(dp[i+1][j],dp[i][j-1]);
          steps.push({dp:dp.map(function(r){return r.slice();}),ci:i,cj:j,
            msg:'s['+i+']≠s['+j+'] → max(dp['+(i+1)+']['+j+'],dp['+i+']['+(j-1)+'])='+dp[i][j]});}
      }
    }
    steps[steps.length-1].done=true;
    steps[steps.length-1].msg='LPS("'+s+'") = dp[0]['+(n-1)+']='+dp[0][n-1];
    return steps;
  }
  function draw(s,ctx,W,H,step){
    bg(ctx,W,H);if(!step)return;
    var str=defS,n=str.length;
    var cw=Math.min(34,(W-50)/(n+0.5)),ox=cw+14,oy=cw+14;
    str.split('').forEach(function(c,j){lbl(ctx,j+':'+c,ox+j*(cw+2)+cw/2,oy-10,'rgba(255,255,255,0.4)',8,'center');});
    str.split('').forEach(function(c,i){lbl(ctx,i+':'+c,ox-8,oy+i*(cw+2)+cw/2+4,'rgba(255,255,255,0.4)',8,'right');});
    if(!step.dp)return;
    step.dp.forEach(function(row,i){row.forEach(function(val,j){
      if(j<i)return;
      var st=step.ci===i&&step.cj===j?'found':(val>0?(i===j?'sorted':'selected'):'default');
      cell(ctx,ox+j*(cw+2),oy+i*(cw+2),cw,cw,val||'',st);
    });});
    if(step.done)lbl(ctx,'LPS = '+step.dp[0][n-1],W/2,H-10,'#34d399',13,'center');
  }
  makeProbUI(container,{canvasW:420,canvasH:270,
    approaches:[{key:'a1',label:'2D DP fill by length O(n²)'}],
    inputs:[{id:'s',lbl:'String:',elem:inp(defS,'text (max 7)',100)}],
    onInputs:function(v){var t=v.s.trim().toLowerCase();if(t.length&&t.length<=7)defS=t;},
    buildSteps:function(){return buildSteps(defS);},
    onStep:function(s,ctx,W,H){draw(defS,ctx,W,H,s);},
    onReset:function(ctx,W,H){draw(defS,ctx,W,H,{dp:null,ci:-1,cj:-1});}
  });
}

/* ── P83 Single Number ──────────────────────────────────── */
function initSingleNumber(id){
  var container=document.getElementById(id);
  if(!container)return;
  var defArr=[4,1,2,1,2];
  function buildSteps(arr){
    var steps=[];
    steps.push({arr:arr,xor:0,i:-1,msg:'XOR all elements: paired values cancel (a^a=0), single value remains.'});
    var xor=0;
    arr.forEach(function(v,i){
      var prev=xor;xor^=v;
      steps.push({arr:arr,xor:xor,i:i,prev:prev,
        msg:prev+' XOR '+v+' = '+xor+' ('+prev.toString(2)+'b ^ '+v.toString(2)+'b = '+xor.toString(2)+'b)'});
    });
    steps[steps.length-1].done=true;
    steps[steps.length-1].msg='Result = '+xor+' (all pairs cancelled, single number remains)';
    return steps;
  }
  function draw(s,ctx,W,H){
    bg(ctx,W,H);if(!s)return;
    var arr=s.arr,n=arr.length,cw=Math.min(46,(W-40)/n),gap=4,ox=(W-n*(cw+gap))/2;
    arr.forEach(function(v,i){
      var st=s.i===i?'active':(s.done?( v===s.xor?'found':'water'):(s.i>i?'sorted':'default'));
      cell(ctx,ox+i*(cw+gap),H/2-28,cw,28,v,st);
    });
    if(s.xor!=null)lbl(ctx,'XOR = '+s.xor+' ('+s.xor.toString(2)+'b)',W/2,H/2+18,s.done?'#34d399':'#c4b5fd',12,'center');
    if(s.done)lbl(ctx,'Single = '+s.xor,W/2,H-10,'#34d399',13,'center');
  }
  makeProbUI(container,{canvasW:520,canvasH:190,
    approaches:[{key:'a1',label:'XOR all O(n) time · O(1) space'}],
    inputs:[{id:'arr',lbl:'Array:',elem:inp(defArr.join(','),'one unique, rest paired',180)}],
    onInputs:function(v){var a=v.arr.split(',').map(function(x){return parseInt(x.trim(),10);}).filter(function(x){return!isNaN(x);});if(a.length%2===1)defArr=a;},
    buildSteps:function(){return buildSteps(defArr);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},
    onReset:function(ctx,W,H){draw({arr:defArr,xor:0,i:-1},ctx,W,H);}
  });
}

/* ── P84 Counting Bits ──────────────────────────────────── */
function initCountingBits(id){
  var container=document.getElementById(id);
  if(!container)return;
  var defN=7;
  function buildSteps(n){
    var steps=[];
    var dp=[0];
    steps.push({dp:[0],n:n,i:0,msg:'dp[i]=number of 1-bits in i. dp[0]=0. dp[i]=dp[i>>1]+(i&1).'});
    for(var i=1;i<=n;i++){
      dp[i]=dp[i>>1]+(i&1);
      steps.push({dp:dp.slice(),n:n,i:i,shift:i>>1,lsb:i&1,
        msg:'dp['+i+']=dp['+(i>>1)+']+('+(i&1)+')='+dp[i]+' ('+i+'='+i.toString(2)+'b, i>>1='+(i>>1)+', i&1='+(i&1)+')'});
    }
    steps[steps.length-1].done=true;
    steps[steps.length-1].msg='Result: ['+dp.join(',')+']';
    return steps;
  }
  function draw(s,ctx,W,H){
    bg(ctx,W,H);if(!s)return;
    var dp=s.dp||[],n=s.n,total=n+1;
    var cw=Math.min(36,(W-40)/total),gap=3,ox=(W-total*(cw+gap))/2;
    for(var i=0;i<total;i++)lbl(ctx,i,ox+i*(cw+gap)+cw/2,H/2-52,'rgba(255,255,255,0.35)',8,'center');
    for(var i=0;i<total;i++)lbl(ctx,i.toString(2),ox+i*(cw+gap)+cw/2,H/2-36,'rgba(6,182,212,0.6)',7,'center');
    for(var i=0;i<total;i++){
      var st=s.i===i?'active':(i<dp.length?'sorted':'default');
      cell(ctx,ox+i*(cw+gap),H/2-22,cw,26,i<dp.length?dp[i]:'',st);
    }
    if(s.done)lbl(ctx,'['+dp.join(',')+']',W/2,H-10,'#34d399',12,'center');
  }
  makeProbUI(container,{canvasW:580,canvasH:190,
    approaches:[{key:'a1',label:'DP: dp[i]=dp[i>>1]+(i&1) O(n)'}],
    inputs:[{id:'n',lbl:'n:',elem:inp(String(defN),'0-12',50)}],
    onInputs:function(v){var n=parseInt(v.n,10);if(!isNaN(n)&&n>=0&&n<=12)defN=n;},
    buildSteps:function(){return buildSteps(defN);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},
    onReset:function(ctx,W,H){draw({dp:[],n:defN,i:-1},ctx,W,H);}
  });
}

/* ── P85 Sum of Two Integers (without +) ───────────────── */
function initSumTwoIntegers(id){
  var container=document.getElementById(id);
  if(!container)return;
  var defA=5,defB=3;
  function buildSteps(a,b){
    var steps=[];
    steps.push({a:a,b:b,sum:a,carry:b,iter:0,ans:null,
      msg:'Add without +: sum=a XOR b (bits without carry), carry=(a AND b)<<1. Repeat until carry=0.'});
    var sum=a,carry=b,iter=0;
    while(carry!==0&&iter<16){
      var ns=sum^carry,nc=(sum&carry)<<1;
      steps.push({a:a,b:b,sum:sum,carry:carry,ns:ns,nc:nc,iter:iter,
        msg:'sum='+sum+'('+sum.toString(2)+'b) XOR carry='+carry+'('+carry.toString(2)+'b) = '+ns+'. new_carry='+(sum&carry)+'<<1='+nc});
      sum=ns;carry=nc;iter++;
    }
    steps[steps.length-1].done=true;
    steps[steps.length-1].ans=sum;
    steps[steps.length-1].msg='carry=0. '+a+' + '+b+' = '+sum;
    return steps;
  }
  function draw(s,ctx,W,H){
    bg(ctx,W,H);if(!s)return;
    var bits=8,bw=24,gap=2;
    var ox=(W-bits*(bw+gap))/2;
    ['sum (XOR bits)','carry (AND<<1)'].forEach(function(label,row){
      var v=row===0?s.sum:s.carry;
      if(v==null)return;
      lbl(ctx,label+'='+v,ox-10,H/3+row*72+4,'rgba(255,255,255,0.6)',9,'right');
      for(var b=bits-1;b>=0;b--){
        var bit=(v>>b)&1;
        cell(ctx,ox+(bits-1-b)*(bw+gap),H/3+row*72-10,bw,22,bit,bit?'active':'default');
      }
    });
    if(s.ans!=null)lbl(ctx,s.a+' + '+s.b+' = '+s.ans,W/2,H-10,s.done?'#34d399':'#c4b5fd',14,'center');
  }
  makeProbUI(container,{canvasW:480,canvasH:220,
    approaches:[{key:'a1',label:'XOR + carry loop — no + or - operators'}],
    inputs:[
      {id:'a',lbl:'a:',elem:inp(String(defA),'integer',60)},
      {id:'b',lbl:'b:',elem:inp(String(defB),'integer',60)}
    ],
    onInputs:function(v){var a=parseInt(v.a,10),b=parseInt(v.b,10);if(!isNaN(a)&&a>=0)defA=a;if(!isNaN(b)&&b>=0)defB=b;},
    buildSteps:function(){return buildSteps(defA,defB);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},
    onReset:function(ctx,W,H){draw({a:defA,b:defB,sum:defA,carry:defB},ctx,W,H);}
  });
}

/* ── P86 Happy Number ───────────────────────────────────── */
function initHappyNumber(id){
  var container=document.getElementById(id);
  if(!container)return;
  var defN=19;
  function dss(n){var s=0;while(n>0){var d=n%10;s+=d*d;n=Math.floor(n/10);}return s;}
  function buildSteps(n){
    var steps=[];
    steps.push({seq:[n],cur:n,msg:'Sum squares of digits, repeat. Reach 1=happy. Cycle=not happy.'});
    var cur=n,seq=[n],seen={},happy=false;seen[n]=true;
    for(var i=0;i<30;i++){
      var digits=String(cur).split('').map(Number);
      var next=dss(cur);
      seq.push(next);
      var detail=digits.map(function(d){return d+'²='+d*d;}).join('+')+'='+next;
      if(next===1){happy=true;
        steps.push({seq:seq.slice(),cur:next,done:true,happy:true,
          msg:cur+' → '+detail+'. Reached 1! Happy number.'});
        break;
      }
      if(seen[next]){
        steps.push({seq:seq.slice(),cur:next,done:true,happy:false,
          msg:'Cycle detected at '+next+'! NOT a happy number.'});
        break;
      }
      steps.push({seq:seq.slice(),cur:cur,next:next,msg:cur+' → '+detail});
      seen[next]=true;cur=next;
    }
    return steps;
  }
  function draw(s,ctx,W,H){
    bg(ctx,W,H);if(!s||!s.seq)return;
    var seq=s.seq.slice(0,10),cw=40,arrow=16,gap=4,ox=16;
    seq.forEach(function(v,i){
      var isLast=i===seq.length-1;
      var st=isLast?(s.done?(s.happy?'found':'water'):'active'):(v===1?'found':'sorted');
      cell(ctx,ox+i*(cw+arrow+gap),H/2-14,cw,28,v,st);
      if(!isLast)lbl(ctx,'→',ox+i*(cw+arrow+gap)+cw+3,H/2+1,'rgba(255,255,255,0.4)',11,'left');
    });
    if(s.seq.length>10)lbl(ctx,'…',ox+10*(cw+arrow+gap),H/2+1,'rgba(255,255,255,0.4)',13,'left');
    if(s.done)lbl(ctx,s.happy?'Happy number!':'Not happy (cycle detected)',W/2,H-10,s.happy?'#34d399':'#ef4444',13,'center');
  }
  makeProbUI(container,{canvasW:600,canvasH:190,
    approaches:[{key:'a1',label:'HashSet or Floyd\'s cycle detection O(log n)/step'}],
    inputs:[{id:'n',lbl:'n:',elem:inp(String(defN),'positive integer',80)}],
    onInputs:function(v){var n=parseInt(v.n,10);if(!isNaN(n)&&n>0)defN=n;},
    buildSteps:function(){return buildSteps(defN);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},
    onReset:function(ctx,W,H){draw({seq:[defN],cur:defN},ctx,W,H);}
  });
}

/* ── P87 Palindrome Partitioning ───────────────────────────── */
function initPalinPartition(id){
  var container=document.getElementById(id);
  if(!container)return;
  var defS='aab';
  function isPalin(s,l,r){while(l<r){if(s[l]!==s[r])return false;l++;r--;}return true;}
  function buildSteps(s){
    var steps=[],results=[];
    function bt(start,path){
      if(start===s.length){
        results.push(path.slice());
        steps.push({s:s,path:path.slice(),results:results.slice(),start:start,
          msg:'Partition complete: ['+path.map(function(p){return'"'+p+'"';}).join(',')+']'});
        return;
      }
      for(var end=start;end<s.length;end++){
        var sub=s.slice(start,end+1);
        if(isPalin(s,start,end)){
          path.push(sub);
          steps.push({s:s,path:path.slice(),results:results.slice(),start:start,end:end,
            msg:'s['+start+'..'+end+']="'+sub+'" is palindrome → recurse'});
          bt(end+1,path);
          path.pop();
        } else {
          steps.push({s:s,path:path.slice(),results:results.slice(),start:start,end:end,skip:true,
            msg:'s['+start+'..'+end+']="'+sub+'" not palindrome → skip'});
        }
      }
    }
    steps.push({s:s,path:[],results:[],start:0,msg:'Backtrack: try every prefix that is a palindrome.'});
    bt(0,[]);
    steps[steps.length-1].done=true;
    return steps;
  }
  function draw(s_,ctx,W,H){
    bg(ctx,W,H);if(!s_||!s_.s)return;
    var s=s_.s,cw=28,gap=3,ox=(W-(s.length*(cw+gap)))/2;
    for(var i=0;i<s.length;i++){
      var st='default';
      if(s_.start!=null&&s_.end!=null){
        if(i>=s_.start&&i<=s_.end)st=s_.skip?'water':'active';
        else if(s_.path&&i<s_.path.join('').length)st='sorted';
      }
      cell(ctx,ox+i*(cw+gap),H/2-52,cw,26,s[i],st);
    }
    if(s_.path&&s_.path.length>0)
      lbl(ctx,'Path: ['+s_.path.map(function(p){return'"'+p+'"';}).join(', ')+']',W/2,H/2+8,'#c4b5fd',11,'center');
    if(s_.results&&s_.results.length>0)
      lbl(ctx,'Results ('+s_.results.length+'): '+s_.results.slice(0,3).map(function(r){return'['+r.map(function(p){return'"'+p+'"';}).join(',')+']';}).join(' | '),W/2,H-10,'#34d399',9,'center');
  }
  makeProbUI(container,{canvasW:560,canvasH:220,
    approaches:[
      {key:'a1',label:'Brute: try all splits, check palindrome each'},
      {key:'a2',label:'Optimal: precompute palin table + backtrack'}
    ],
    inputs:[{id:'s',lbl:'s:',elem:inp(defS,'string (max 7)',100)}],
    onInputs:function(v){if(v.s&&v.s.length>=1&&v.s.length<=7)defS=v.s;},
    buildSteps:function(){return buildSteps(defS);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},
    onReset:function(ctx,W,H){draw({s:defS,path:[],results:[],start:0},ctx,W,H);}
  });
}

/* ── P88 Subsets II ────────────────────────────────────────── */
function initSubsetsII(id){
  var container=document.getElementById(id);
  if(!container)return;
  var defArr=[1,2,2];
  function buildSteps(arr){
    var steps=[],results=[];
    var nums=arr.slice().sort(function(a,b){return a-b;});
    function bt(start,path){
      results.push(path.slice());
      steps.push({nums:nums,path:path.slice(),results:results.slice(),start:start,skipIdx:-1,
        msg:'Add subset ['+path.join(',')+']'});
      for(var i=start;i<nums.length;i++){
        if(i>start&&nums[i]===nums[i-1]){
          steps.push({nums:nums,path:path.slice(),results:results.slice(),start:start,skipIdx:i,
            msg:'Skip duplicate nums['+i+']='+nums[i]+' at same recursion level'});
          continue;
        }
        path.push(nums[i]);
        bt(i+1,path);
        path.pop();
      }
    }
    steps.push({nums:nums,path:[],results:[],start:0,skipIdx:-1,msg:'Sort: ['+nums.join(',')+'] → skip duplicates at same level'});
    bt(0,[]);
    steps[steps.length-1].done=true;
    steps[steps.length-1].msg='Total unique subsets: '+results.length;
    return steps;
  }
  function draw(s,ctx,W,H){
    bg(ctx,W,H);if(!s||!s.nums)return;
    var nums=s.nums,cw=32,gap=4,ox=(W-(nums.length*(cw+gap)))/2;
    for(var i=0;i<nums.length;i++){
      var st=s.skipIdx===i?'water':(s.path&&s.path.indexOf(nums[i])>=0?'active':'default');
      lbl(ctx,i,ox+i*(cw+gap)+cw/2,H/2-60,'rgba(255,255,255,0.35)',8,'center');
      cell(ctx,ox+i*(cw+gap),H/2-50,cw,26,nums[i],st);
    }
    if(s.path!=null)lbl(ctx,'Current: ['+s.path.join(',')+']',W/2,H/2+8,'#c4b5fd',11,'center');
    if(s.results&&s.results.length>0)lbl(ctx,'Subsets so far: '+s.results.length,W/2,H-10,'#34d399',11,'center');
  }
  makeProbUI(container,{canvasW:520,canvasH:210,
    approaches:[
      {key:'a1',label:'Brute: all subsets, deduplicate with set'},
      {key:'a2',label:'Optimal: sort + skip duplicate at same level'}
    ],
    inputs:[{id:'arr',lbl:'Array:',elem:inp(defArr.join(','),'nums (max 5)',120)}],
    onInputs:function(v){var a=v.arr.split(',').map(function(x){return parseInt(x.trim(),10);}).filter(function(x){return!isNaN(x);});if(a.length>=1&&a.length<=5)defArr=a;},
    buildSteps:function(){return buildSteps(defArr);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},
    onReset:function(ctx,W,H){draw({nums:defArr.slice().sort(function(a,b){return a-b;}),path:[],results:[],skipIdx:-1},ctx,W,H);}
  });
}

/* ── P89 Insert Interval ───────────────────────────────────── */
function initInsertInterval(id){
  var container=document.getElementById(id);
  if(!container)return;
  var defIntervals=[[1,3],[6,9]];
  var defNew=[2,5];
  function buildSteps(intervals,newInt){
    var steps=[],result=[],i=0,n=intervals.length;
    steps.push({intervals:intervals,newInt:newInt.slice(),result:[],i:-1,phase:'start',
      msg:'Insert ['+newInt+'] into sorted non-overlapping intervals.'});
    while(i<n&&intervals[i][1]<newInt[0]){
      result.push(intervals[i]);
      steps.push({intervals:intervals,newInt:newInt.slice(),result:result.slice(),i:i,phase:'before',
        msg:'['+intervals[i]+'] ends before new starts → add as-is'});
      i++;
    }
    while(i<n&&intervals[i][0]<=newInt[1]){
      newInt=[Math.min(newInt[0],intervals[i][0]),Math.max(newInt[1],intervals[i][1])];
      steps.push({intervals:intervals,newInt:newInt.slice(),result:result.slice(),i:i,phase:'merge',
        msg:'Overlap with ['+intervals[i]+'] → merge → new=['+newInt+']'});
      i++;
    }
    result.push(newInt);
    steps.push({intervals:intervals,newInt:newInt.slice(),result:result.slice(),i:i,phase:'insert',
      msg:'Insert merged ['+newInt+']'});
    while(i<n){
      result.push(intervals[i]);
      steps.push({intervals:intervals,newInt:newInt.slice(),result:result.slice(),i:i,phase:'after',
        msg:'Add remaining ['+intervals[i]+']'});
      i++;
    }
    steps[steps.length-1].done=true;
    steps[steps.length-1].msg='Result: ['+result.map(function(r){return'['+r[0]+','+r[1]+']';}).join(',')+']';
    return steps;
  }
  function draw(s,ctx,W,H){
    bg(ctx,W,H);if(!s||!s.intervals)return;
    var ints=s.intervals,ni=s.newInt;
    var iw=54,gap=6,ox=16,oy=H/2-58;
    lbl(ctx,'Intervals:',ox,oy-4,'rgba(255,255,255,0.5)',9,'left');
    ints.forEach(function(iv,idx){
      var st=idx===s.i?(s.phase==='before'?'sorted':s.phase==='merge'?'active':'default'):'default';
      cell(ctx,ox+idx*(iw+gap),oy,iw,22,'['+iv[0]+','+iv[1]+']',st);
    });
    if(ni){
      lbl(ctx,'New:',ox,oy+38,'rgba(255,255,255,0.5)',9,'left');
      cell(ctx,ox+44,oy+28,iw,22,'['+ni[0]+','+ni[1]+']','selected');
    }
    if(s.result&&s.result.length>0)
      lbl(ctx,'Result: ['+s.result.map(function(r){return'['+r[0]+','+r[1]+']';}).join(',')+']',W/2,H-10,s.done?'#34d399':'#c4b5fd',11,'center');
  }
  makeProbUI(container,{canvasW:560,canvasH:220,
    approaches:[
      {key:'a1',label:'Brute: insert+sort+merge O(n log n)'},
      {key:'a2',label:'Optimal: 3-phase linear scan O(n)'}
    ],
    inputs:[
      {id:'ivs',lbl:'Intervals:',elem:inp('1,3,6,9','s,e pairs',130)},
      {id:'ni',lbl:'New:',elem:inp('2,5','start,end',80)}
    ],
    onInputs:function(v){
      var a=v.ivs.split(',').map(function(x){return parseInt(x.trim(),10);});
      if(a.length>=2&&a.length%2===0){defIntervals=[];for(var i=0;i<a.length;i+=2)defIntervals.push([a[i],a[i+1]]);}
      var b=v.ni.split(',').map(function(x){return parseInt(x.trim(),10);});
      if(b.length===2)defNew=[b[0],b[1]];
    },
    buildSteps:function(){return buildSteps(defIntervals.map(function(iv){return iv.slice();}),defNew.slice());},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},
    onReset:function(ctx,W,H){draw({intervals:defIntervals,newInt:defNew,result:[],i:-1,phase:'start'},ctx,W,H);}
  });
}

/* ── P90 Reverse Bits ──────────────────────────────────────── */
function initReverseBits(id){
  var container=document.getElementById(id);
  if(!container)return;
  var defN=43261596;
  function buildSteps(n){
    var steps=[],bits=[];
    for(var b=31;b>=0;b--)bits.push((n>>>b)&1);
    var rev=new Array(32).fill(0);
    steps.push({orig:bits.slice(),rev:rev.slice(),pos:-1,n:n,ans:null,
      msg:'Reverse 32-bit unsigned integer bit by bit. Input: '+n});
    for(var i=0;i<32;i++){
      rev[31-i]=bits[i];
      var ans=0;for(var b2=0;b2<32;b2++)ans=(ans|(rev[b2]<<(31-b2)))>>>0;
      steps.push({orig:bits.slice(),rev:rev.slice(),pos:i,n:n,ans:ans,
        msg:'bit['+i+']='+bits[i]+' → rev['+(31-i)+']='+bits[i]+'. Result so far: '+ans});
    }
    steps[steps.length-1].done=true;
    steps[steps.length-1].msg='Reversed: '+steps[steps.length-1].ans;
    return steps;
  }
  function draw(s,ctx,W,H){
    bg(ctx,W,H);if(!s)return;
    var bw=14,gap=1,ox=(W-32*(bw+gap))/2;
    if(s.orig){
      lbl(ctx,'Input:',ox-4,H/2-40,'rgba(255,255,255,0.5)',9,'right');
      for(var i=0;i<32;i++){
        var st=i===s.pos?'active':(i<s.pos?'sorted':'default');
        cell(ctx,ox+i*(bw+gap),H/2-50,bw,18,s.orig[i],st);
      }
    }
    if(s.rev){
      lbl(ctx,'Output:',ox-4,H/2+8,'rgba(255,255,255,0.5)',9,'right');
      for(var j=0;j<32;j++){
        var st2=j===31-s.pos?'active':(j>31-s.pos?'sorted':'default');
        cell(ctx,ox+j*(bw+gap),H/2-4,bw,18,s.rev[j],st2);
      }
    }
    if(s.ans!=null)lbl(ctx,'Result: '+s.ans,W/2,H-10,s.done?'#34d399':'#c4b5fd',12,'center');
  }
  makeProbUI(container,{canvasW:540,canvasH:210,
    approaches:[{key:'a1',label:'Bit-by-bit reversal O(32) time O(1) space'}],
    inputs:[{id:'n',lbl:'n:',elem:inp(String(defN),'uint32',130)}],
    onInputs:function(v){var n=parseInt(v.n,10);if(!isNaN(n)&&n>=0)defN=n>>>0;},
    buildSteps:function(){return buildSteps(defN);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},
    onReset:function(ctx,W,H){var bits=[];for(var b=31;b>=0;b--)bits.push((defN>>>b)&1);draw({orig:bits,rev:new Array(32).fill(0),pos:-1,n:defN},ctx,W,H);}
  });
}

/* ── P91 Min Cost to Connect All Points ─────────────────────── */
function initMinCostPoints(id){
  var container=document.getElementById(id);
  if(!container)return;
  var defPts=[[0,0],[2,2],[3,10],[5,2],[7,0]];
  function mdist(a,b){return Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1]);}
  function buildSteps(pts){
    var n=pts.length,steps=[];
    var inMST=new Array(n).fill(false);
    var minCost=new Array(n).fill(Infinity),from=new Array(n).fill(-1);
    minCost[0]=0;
    var totalCost=0,edges=[];
    steps.push({pts:pts,inMST:inMST.slice(),minCost:minCost.slice(),edges:[],totalCost:0,cur:-1,
      msg:"Prim's MST: start at point 0, always add cheapest edge to unvisited point."});
    for(var iter=0;iter<n;iter++){
      var u=-1;
      for(var i=0;i<n;i++)if(!inMST[i]&&(u===-1||minCost[i]<minCost[u]))u=i;
      inMST[u]=true;totalCost+=minCost[u];
      if(from[u]>=0)edges.push([from[u],u]);
      steps.push({pts:pts,inMST:inMST.slice(),minCost:minCost.slice(),edges:edges.slice(),totalCost:totalCost,cur:u,
        msg:'Add point '+u+' cost='+minCost[u]+'. Total cost='+totalCost});
      for(var v=0;v<n;v++){
        if(!inMST[v]){
          var d=mdist(pts[u],pts[v]);
          if(d<minCost[v]){minCost[v]=d;from[v]=u;}
        }
      }
      if(iter<n-1)steps.push({pts:pts,inMST:inMST.slice(),minCost:minCost.slice(),edges:edges.slice(),totalCost:totalCost,cur:u,
        msg:'Update min distances from point '+u});
    }
    steps[steps.length-1].done=true;
    steps[steps.length-1].msg='Min cost = '+totalCost;
    return steps;
  }
  function draw(s,ctx,W,H){
    bg(ctx,W,H);if(!s||!s.pts)return;
    var pts=s.pts,n=pts.length;
    var xs=pts.map(function(p){return p[0];}),ys=pts.map(function(p){return p[1];});
    var minX=Math.min.apply(null,xs),maxX=Math.max.apply(null,xs)||1;
    var minY=Math.min.apply(null,ys),maxY=Math.max.apply(null,ys)||1;
    var pw=W-60,ph=H-60,ox=30,oy=30;
    function px(p){return ox+((p[0]-minX)/((maxX-minX)||1))*pw;}
    function py(p){return oy+((maxY-p[1])/((maxY-minY)||1))*ph;}
    if(s.edges){s.edges.forEach(function(e){
      var a=pts[e[0]],b=pts[e[1]];
      ctx.beginPath();ctx.moveTo(px(a),py(a));ctx.lineTo(px(b),py(b));
      ctx.strokeStyle='rgba(52,211,153,0.6)';ctx.lineWidth=2;ctx.stroke();
    });}
    for(var i=0;i<n;i++){
      var st=s.inMST&&s.inMST[i]?(i===s.cur?'active':'found'):'default';
      var x=px(pts[i]),y=py(pts[i]);
      ctx.beginPath();ctx.arc(x,y,10,0,2*Math.PI);
      ctx.fillStyle=CS[st]||CS.default;ctx.fill();
      lbl(ctx,i,x,y+4,'#fff',8,'center');
      if(s.minCost&&!s.inMST[i]&&s.minCost[i]<Infinity)
        lbl(ctx,s.minCost[i],x,y-16,'rgba(196,181,253,0.8)',8,'center');
    }
    if(s.totalCost!=null)lbl(ctx,'Cost: '+s.totalCost,W/2,H-8,s.done?'#34d399':'#c4b5fd',12,'center');
  }
  makeProbUI(container,{canvasW:480,canvasH:280,
    approaches:[
      {key:'a1',label:"Kruskal: all O(n² log n)"},
      {key:'a2',label:"Prim's O(n²) — optimal for dense graphs"}
    ],
    inputs:[],
    onInputs:function(){},
    buildSteps:function(){return buildSteps(defPts);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},
    onReset:function(ctx,W,H){draw({pts:defPts,inMST:new Array(defPts.length).fill(false),minCost:new Array(defPts.length).fill(Infinity),edges:[],totalCost:0,cur:-1},ctx,W,H);}
  });
}

/* ── P92 Network Delay Time ────────────────────────────────── */
function initNetworkDelay(id){
  var container=document.getElementById(id);
  if(!container)return;
  var defTimes=[[2,1,1],[2,3,1],[3,4,1]];
  var defN=4,defK=2;
  function buildSteps(times,n,k){
    var steps=[],adj={};
    for(var i=1;i<=n;i++)adj[i]=[];
    times.forEach(function(t){adj[t[0]].push([t[1],t[2]]);});
    var dist={};for(var i=1;i<=n;i++)dist[i]=Infinity;
    dist[k]=0;
    var visited={},pq=[[0,k]];
    steps.push({dist:Object.assign({},dist),visited:{},cur:null,n:n,k:k,
      msg:'Dijkstra from node '+k+'. dist['+k+']=0, others=∞'});
    while(pq.length>0){
      pq.sort(function(a,b){return a[0]-b[0];});
      var top=pq.shift(),d=top[0],u=top[1];
      if(visited[u])continue;
      visited[u]=true;
      steps.push({dist:Object.assign({},dist),visited:Object.assign({},visited),cur:u,n:n,k:k,
        msg:'Visit node '+u+' dist='+d+'. Relax neighbors.'});
      (adj[u]||[]).forEach(function(e){
        var v=e[0],w=e[1];
        if(!visited[v]&&d+w<dist[v]){
          dist[v]=d+w;pq.push([dist[v],v]);
          steps.push({dist:Object.assign({},dist),visited:Object.assign({},visited),cur:u,relax:v,n:n,k:k,
            msg:'Relax: dist['+v+']='+d+'+'+w+'='+dist[v]});
        }
      });
    }
    var ans=0;for(var i=1;i<=n;i++){if(dist[i]===Infinity){ans=-1;break;}if(dist[i]>ans)ans=dist[i];}
    steps[steps.length-1].done=true;steps[steps.length-1].ans=ans;
    steps[steps.length-1].msg='Network delay = '+ans+(ans===-1?' (unreachable node)':'');
    return steps;
  }
  function draw(s,ctx,W,H){
    bg(ctx,W,H);if(!s)return;
    var n=s.n||4,r=75,cx=W/2,cy=H/2-10;
    var pos=[];for(var i=0;i<n;i++)pos.push([cx+r*Math.cos(2*Math.PI*i/n-Math.PI/2),cy+r*Math.sin(2*Math.PI*i/n-Math.PI/2)]);
    defTimes.forEach(function(t){
      var a=pos[t[0]-1],b=pos[t[1]-1];
      ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);
      ctx.strokeStyle='rgba(255,255,255,0.2)';ctx.lineWidth=1;ctx.stroke();
      lbl(ctx,t[2],(a[0]+b[0])/2,(a[1]+b[1])/2,'rgba(255,255,255,0.4)',8,'center');
    });
    for(var i=0;i<n;i++){
      var node=i+1,x=pos[i][0],y=pos[i][1];
      var st=s.cur===node?'active':(s.relax===node?'comparing':(s.visited&&s.visited[node]?'found':'default'));
      ctx.beginPath();ctx.arc(x,y,14,0,2*Math.PI);ctx.fillStyle=CS[st]||CS.default;ctx.fill();
      lbl(ctx,node,x,y+4,'#fff',9,'center');
      var d=s.dist?s.dist[node]:Infinity;
      lbl(ctx,d===Infinity?'∞':d,x,y-22,'rgba(196,181,253,0.9)',9,'center');
    }
    if(s.ans!=null)lbl(ctx,'Delay = '+s.ans,W/2,H-8,s.done?'#34d399':'#c4b5fd',13,'center');
  }
  makeProbUI(container,{canvasW:480,canvasH:280,
    approaches:[
      {key:'a1',label:'Bellman-Ford O(VE)'},
      {key:'a2',label:'Dijkstra O((V+E)logV)'}
    ],
    inputs:[],
    onInputs:function(){},
    buildSteps:function(){return buildSteps(defTimes,defN,defK);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},
    onReset:function(ctx,W,H){var d={};for(var i=1;i<=defN;i++)d[i]=Infinity;d[defK]=0;draw({dist:d,visited:{},cur:null,n:defN,k:defK},ctx,W,H);}
  });
}

/* ── P93 Redundant Connection ──────────────────────────────── */
function initRedundantConnection(id){
  var container=document.getElementById(id);
  if(!container)return;
  var defEdges=[[1,2],[1,3],[2,3]];
  function buildSteps(edges){
    var steps=[],n=0;
    edges.forEach(function(e){if(e[0]>n)n=e[0];if(e[1]>n)n=e[1];});
    var parent=[];for(var i=0;i<=n;i++)parent[i]=i;
    var rank=new Array(n+1).fill(0);
    function find(x){while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x];}return x;}
    function union(x,y){var px=find(x),py=find(y);if(px===py)return false;if(rank[px]<rank[py])parent[px]=py;else if(rank[px]>rank[py])parent[py]=px;else{parent[py]=px;rank[px]++;}return true;}
    steps.push({edges:edges,parent:parent.slice(),cur:-1,ans:null,
      msg:'Union-Find: process each edge. Same root = cycle = redundant.'});
    for(var i=0;i<edges.length;i++){
      var u=edges[i][0],v=edges[i][1];
      var pu=find(u),pv=find(v);
      steps.push({edges:edges,parent:parent.slice(),cur:i,u:u,v:v,pu:pu,pv:pv,ans:null,
        msg:'Edge ['+u+','+v+']: root('+u+')='+pu+' root('+v+')='+pv+(pu===pv?' → CYCLE!':' → union')});
      if(!union(u,v)){
        var ans=[u,v];
        steps.push({edges:edges,parent:parent.slice(),cur:i,ans:ans,done:true,
          msg:'Redundant edge: ['+u+','+v+']'});
        break;
      }
    }
    return steps;
  }
  function draw(s,ctx,W,H){
    bg(ctx,W,H);if(!s||!s.edges)return;
    var edges=s.edges,cw=54,gap=8,ox=(W-edges.length*(cw+gap))/2;
    edges.forEach(function(e,i){
      var isAns=s.ans&&e[0]===s.ans[0]&&e[1]===s.ans[1];
      var st=isAns?'water':(i===s.cur?'active':'default');
      cell(ctx,ox+i*(cw+gap),H/2-50,cw,26,'['+e[0]+','+e[1]+']',st);
    });
    if(s.parent){
      var pTxt='parent: ['+s.parent.slice(1).join(',')+']';
      lbl(ctx,pTxt,W/2,H/2+12,'rgba(196,181,253,0.8)',10,'center');
    }
    if(s.ans)lbl(ctx,'Redundant: ['+s.ans+']',W/2,H-10,'#ef4444',13,'center');
  }
  makeProbUI(container,{canvasW:520,canvasH:210,
    approaches:[
      {key:'a1',label:'DFS cycle check each edge O(n²)'},
      {key:'a2',label:'Union-Find O(n α(n))'}
    ],
    inputs:[{id:'edges',lbl:'Edges:',elem:inp('1,2,1,3,2,3','u,v pairs',140)}],
    onInputs:function(v){var a=v.edges.split(',').map(function(x){return parseInt(x.trim(),10);});if(a.length>=2&&a.length%2===0){defEdges=[];for(var i=0;i<a.length;i+=2)defEdges.push([a[i],a[i+1]]);  }},
    buildSteps:function(){return buildSteps(defEdges);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},
    onReset:function(ctx,W,H){var n=0;defEdges.forEach(function(e){if(e[0]>n)n=e[0];if(e[1]>n)n=e[1];});var p=[];for(var i=0;i<=n;i++)p[i]=i;draw({edges:defEdges,parent:p,cur:-1},ctx,W,H);}
  });
}

/* ── P94 Burst Balloons ────────────────────────────────────── */
function initBurstBalloons(id){
  var container=document.getElementById(id);
  if(!container)return;
  var defNums=[3,1,5,8];
  function buildSteps(nums){
    var steps=[],a=[1].concat(nums).concat([1]),n=nums.length;
    var dp=[];
    for(var i=0;i<a.length;i++){dp[i]=[];for(var j=0;j<a.length;j++)dp[i][j]=0;}
    steps.push({dp:dp.map(function(r){return r.slice();}),a:a,n:n,fill:null,
      msg:'Interval DP: dp[l][r]=max coins bursting balloons between padded l and r exclusively.'});
    for(var len=1;len<=n;len++){
      for(var left=1;left<=n-len+1;left++){
        var right=left+len-1;
        for(var k=left;k<=right;k++){
          var coins=a[left-1]*a[k]*a[right+1]+dp[left][k-1]+dp[k+1][right];
          if(coins>dp[left][right]){
            dp[left][right]=coins;
            steps.push({dp:dp.map(function(r){return r.slice();}),a:a,n:n,fill:{l:left,r:right,k:k,coins:coins},
              msg:'dp['+left+']['+right+']: last burst k='+k+'(val='+a[k]+') → '+a[left-1]+'\xd7'+a[k]+'\xd7'+a[right+1]+'+dp['+left+']['+(k-1)+']+dp['+(k+1)+']['+right+']='+coins});
          }
        }
      }
    }
    steps[steps.length-1].done=true;
    steps[steps.length-1].msg='Max coins = '+dp[1][n];
    return steps;
  }
  function draw(s,ctx,W,H){
    bg(ctx,W,H);if(!s||!s.dp)return;
    var n=s.n||defNums.length,dp=s.dp;
    var cw=Math.min(34,(W-60)/(n+1)),gap=2,ox=40,oy=28;
    lbl(ctx,'dp[left][right]:',ox,oy-10,'rgba(255,255,255,0.4)',8,'left');
    for(var i=1;i<=n;i++){
      lbl(ctx,i,ox-14,oy+(i-1)*(cw+gap)+cw/2,'rgba(255,255,255,0.35)',8,'right');
      for(var j=1;j<=n;j++){
        if(j===1)lbl(ctx,j,ox+(j-1)*(cw+gap)+cw/2,oy-2,'rgba(255,255,255,0.35)',8,'center');
        var st='default';
        if(s.fill){if(i===s.fill.l&&j===s.fill.r)st='active';else if(i===s.fill.l||j===s.fill.r)st='comparing';}
        if(j<i)st='water';
        cell(ctx,ox+(j-1)*(cw+gap),oy+(i-1)*(cw+gap),cw,cw,j>=i&&dp[i]&&dp[i][j]?dp[i][j]:'',st);
      }
    }
    if(s.done)lbl(ctx,'Max coins = '+dp[1][n],W/2,H-8,'#34d399',13,'center');
  }
  makeProbUI(container,{canvasW:440,canvasH:280,
    approaches:[
      {key:'a1',label:'Brute: all permutations O(n!)'},
      {key:'a2',label:'Interval DP O(n³) time O(n²) space'}
    ],
    inputs:[{id:'nums',lbl:'Balloons:',elem:inp(defNums.join(','),'nums (max 6)',110)}],
    onInputs:function(v){var a=v.nums.split(',').map(function(x){return parseInt(x.trim(),10);}).filter(function(x){return!isNaN(x);});if(a.length>=1&&a.length<=6)defNums=a;},
    buildSteps:function(){return buildSteps(defNums);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},
    onReset:function(ctx,W,H){var n=defNums.length;var dp=[];for(var i=0;i<=n+1;i++){dp[i]=[];for(var j=0;j<=n+1;j++)dp[i][j]=0;}draw({dp:dp,a:[1].concat(defNums).concat([1]),n:n},ctx,W,H);}
  });
}

/* ── P95 Regular Expression Matching ──────────────────────── */
function initRegexMatch(id){
  var container=document.getElementById(id);
  if(!container)return;
  var defS='aab',defP='c*a*b';
  function buildSteps(s,p){
    var steps=[],m=s.length,n=p.length,dp=[];
    for(var i=0;i<=m;i++){dp[i]=[];for(var j=0;j<=n;j++)dp[i][j]=false;}
    dp[0][0]=true;
    for(var j=1;j<=n;j++)if(p[j-1]==='*'&&j>=2)dp[0][j]=dp[0][j-2];
    steps.push({dp:dp.map(function(r){return r.slice();}),s:s,p:p,fill:null,
      msg:'2D DP: dp[i][j]=s[0..i-1] matches p[0..j-1]. Base dp[0][0]=true.'});
    for(var i=1;i<=m;i++){
      for(var j=1;j<=n;j++){
        var val;
        if(p[j-1]==='*'){
          val=dp[i][j-2]||(dp[i-1][j]&&(p[j-2]==='.'||p[j-2]===s[i-1]));
        } else {
          val=dp[i-1][j-1]&&(p[j-1]==='.'||p[j-1]===s[i-1]);
        }
        dp[i][j]=!!val;
        steps.push({dp:dp.map(function(r){return r.slice();}),s:s,p:p,fill:{i:i,j:j,val:!!val},
          msg:'dp['+i+']['+j+']: s["'+s[i-1]+'"] p["'+p[j-1]+'"] → '+!!val});
      }
    }
    steps[steps.length-1].done=true;
    steps[steps.length-1].msg='Match: '+dp[m][n];
    return steps;
  }
  function draw(s,ctx,W,H){
    bg(ctx,W,H);if(!s||!s.dp)return;
    var str=s.s,pat=s.p,m=str.length,n=pat.length;
    var cw=Math.min(28,(W-60)/(n+1)),gap=2,ox=34,oy=22;
    for(var j=0;j<=n;j++)lbl(ctx,j===0?'ε':pat[j-1],ox+j*(cw+gap)+cw/2,oy,'rgba(255,255,255,0.55)',9,'center');
    for(var i=0;i<=m;i++){
      lbl(ctx,i===0?'ε':str[i-1],ox-6,oy+(i+1)*(cw+gap)+4,'rgba(255,255,255,0.55)',9,'right');
      for(var j=0;j<=n;j++){
        var v=s.dp[i]&&s.dp[i][j];
        var st=s.fill&&s.fill.i===i&&s.fill.j===j?'active':(v?'found':'default');
        cell(ctx,ox+j*(cw+gap),oy+(i+1)*(cw+gap)-cw/2,cw,cw,v?'T':'',st);
      }
    }
    if(s.done)lbl(ctx,'Match: '+s.dp[m][n],W/2,H-8,s.dp[m][n]?'#34d399':'#ef4444',13,'center');
  }
  makeProbUI(container,{canvasW:520,canvasH:300,
    approaches:[
      {key:'a1',label:'Recursive + memo O(mn)'},
      {key:'a2',label:'Bottom-up DP O(mn) time/space'}
    ],
    inputs:[
      {id:'s',lbl:'s:',elem:inp(defS,'string (max 6)',80)},
      {id:'p',lbl:'p:',elem:inp(defP,'pattern (max 8)',90)}
    ],
    onInputs:function(v){if(v.s&&v.s.length>=0&&v.s.length<=6)defS=v.s;if(v.p&&v.p.length>=0&&v.p.length<=8)defP=v.p;},
    buildSteps:function(){return buildSteps(defS,defP);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},
    onReset:function(ctx,W,H){var m=defS.length,n=defP.length,dp=[];for(var i=0;i<=m;i++){dp[i]=[];for(var j=0;j<=n;j++)dp[i][j]=false;}dp[0][0]=true;draw({dp:dp,s:defS,p:defP},ctx,W,H);}
  });
}

/* ── P96 Design Add and Search Words ──────────────────────── */
function initWordDictionary(id){
  var container=document.getElementById(id);
  if(!container)return;
  var defWords=['bad','dad','mad'],defSearch='pad';
  function buildTrieSteps(words,query){
    var steps=[],root={ch:{},end:false};
    function addWord(w){
      var node=root;
      for(var c=0;c<w.length;c++){var ch=w[c];if(!node.ch[ch])node.ch[ch]={ch:{},end:false};node=node.ch[ch];}
      node.end=true;
    }
    steps.push({words:[],query:query,root:JSON.parse(JSON.stringify(root)),adding:null,found:null,
      msg:'Empty trie. Add words, then search with . wildcard.'});
    for(var wi=0;wi<words.length;wi++){
      addWord(words[wi]);
      steps.push({words:words.slice(0,wi+1),query:query,root:JSON.parse(JSON.stringify(root)),adding:words[wi],found:null,
        msg:'Added "'+words[wi]+'" to trie.'});
    }
    function search(node,w,idx){
      if(idx===w.length)return node.end;
      var c=w[idx];
      if(c==='.'){for(var k in node.ch){if(search(node.ch[k],w,idx+1))return true;}return false;}
      return node.ch[c]?search(node.ch[c],w,idx+1):false;
    }
    var matchFound=search(root,query,0);
    steps.push({words:words,query:query,root:JSON.parse(JSON.stringify(root)),adding:null,found:matchFound,done:true,
      msg:'Search "'+query+'" → '+(matchFound?'FOUND':'NOT FOUND')});
    return steps;
  }
  function drawTrieNode(node,x,y,lv,ctx){
    ctx.beginPath();ctx.arc(x,y,10,0,2*Math.PI);
    ctx.fillStyle=lv===0?CS.default:(node.end?CS.found:CS.sorted);ctx.fill();
    if(lv===0)lbl(ctx,'root',x,y+4,'#fff',7,'center');
    var keys=Object.keys(node.ch),nk=keys.length;
    if(nk===0)return;
    var spread=Math.min(160,nk*44);
    keys.forEach(function(c,ki){
      var cx=x+(ki-(nk-1)/2)*(nk>1?spread/(nk-1):0),cy=y+50;
      ctx.beginPath();ctx.moveTo(x,y+10);ctx.lineTo(cx,cy-10);
      ctx.strokeStyle='rgba(255,255,255,0.2)';ctx.lineWidth=1;ctx.stroke();
      lbl(ctx,c,(x+cx)/2+4,(y+cy)/2,'rgba(196,181,253,0.8)',9,'left');
      drawTrieNode(node.ch[c],cx,cy,lv+1,ctx);
    });
  }
  function draw(s,ctx,W,H){
    bg(ctx,W,H);if(!s)return;
    if(s.root)drawTrieNode(s.root,W/2,H/5,0,ctx);
    if(s.words&&s.words.length>0)
      lbl(ctx,'Words: '+s.words.map(function(w){return'"'+w+'"';}).join(', '),W/2,H-24,'rgba(255,255,255,0.5)',10,'center');
    if(s.query){
      var color=s.found==null?'#c4b5fd':(s.found?'#34d399':'#ef4444');
      lbl(ctx,'Search "'+s.query+'": '+(s.found==null?'…':s.found?'FOUND':'NOT FOUND'),W/2,H-8,color,12,'center');
    }
  }
  makeProbUI(container,{canvasW:480,canvasH:300,
    approaches:[{key:'a1',label:'Trie + DFS wildcard: O(m) insert, O(26^m) worst search'}],
    inputs:[
      {id:'words',lbl:'Words:',elem:inp(defWords.join(','),'comma sep',150)},
      {id:'q',lbl:'Search:',elem:inp(defSearch,'w/ . wildcard',100)}
    ],
    onInputs:function(v){
      var ws=v.words.split(',').map(function(w){return w.trim();}).filter(function(w){return/^[a-z.]+$/.test(w)&&w.length>0;});
      if(ws.length>0)defWords=ws;
      if(v.q&&/^[a-z.]+$/.test(v.q))defSearch=v.q;
    },
    buildSteps:function(){return buildTrieSteps(defWords,defSearch);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},
    onReset:function(ctx,W,H){draw({words:[],query:defSearch,root:{ch:{},end:false}},ctx,W,H);}
  });
}

/* ── P97 Word Ladder ───────────────────────────────────────── */
function initWordLadder(id){
  var container=document.getElementById(id);
  if(!container)return;
  var defBegin='hit',defEnd='cog',defList=['hot','dot','dog','lot','log','cog'];
  function buildSteps(begin,end,wordList){
    var steps=[],wordSet={};
    wordList.forEach(function(w){wordSet[w]=true;});
    if(!wordSet[end]){
      steps.push({queue:[[begin]],visited:{},level:0,found:false,done:true,msg:'End word "'+end+'" not in word list.'});
      return steps;
    }
    var queue=[[begin]],visited={};visited[begin]=true;
    steps.push({queue:[[begin]],visited:Object.assign({},visited),level:1,found:false,
      msg:'BFS from "'+begin+'". Visit neighbors differing by 1 char.'});
    while(queue.length>0){
      var path=queue.shift(),word=path[path.length-1];
      for(var i=0;i<word.length;i++){
        for(var c=97;c<=122;c++){
          var next=word.slice(0,i)+String.fromCharCode(c)+word.slice(i+1);
          if(wordSet[next]&&!visited[next]){
            visited[next]=true;
            var newPath=path.concat(next);
            steps.push({queue:queue.slice(),visited:Object.assign({},visited),path:newPath,cur:word,next:next,level:path.length+1,
              msg:'"'+word+'" → "'+next+'" (change char '+i+') path len='+(path.length+1)});
            if(next===end){
              steps.push({queue:[],visited:visited,path:newPath,found:true,done:true,
                msg:'Found! Shortest path: '+newPath.join(' → ')+' (length='+newPath.length+')'});
              return steps;
            }
            queue.push(newPath);
          }
        }
      }
    }
    steps.push({queue:[],visited:visited,found:false,done:true,msg:'No transformation sequence found.'});
    return steps;
  }
  function draw(s,ctx,W,H){
    bg(ctx,W,H);if(!s)return;
    var path=s.path||[s.cur||defBegin];
    var cw=Math.min(44,(W-20)/Math.max(path.length,1)),gap=6,ox=(W-(path.length*(cw+gap)))/2;
    path.forEach(function(w,i){
      var isLast=i===path.length-1;
      var st=isLast?(s.found?'found':(s.next===w?'active':'sorted')):(i===0?'selected':'sorted');
      cell(ctx,ox+i*(cw+gap),H/2-20,cw,28,w,st);
      if(!isLast)lbl(ctx,'→',ox+i*(cw+gap)+cw+1,H/2-6,'rgba(255,255,255,0.4)',10,'left');
    });
    if(s.level!=null)lbl(ctx,'Level: '+s.level,W/2,H/2+24,'rgba(196,181,253,0.8)',10,'center');
    if(s.done)lbl(ctx,s.found?'Length: '+path.length:'No path',W/2,H-10,s.found?'#34d399':'#ef4444',13,'center');
  }
  makeProbUI(container,{canvasW:560,canvasH:200,
    approaches:[
      {key:'a1',label:'BFS: find shortest transformation O(n·m·26)'},
      {key:'a2',label:'Bidirectional BFS: meet in the middle'}
    ],
    inputs:[
      {id:'b',lbl:'Begin:',elem:inp(defBegin,'word',80)},
      {id:'e',lbl:'End:',elem:inp(defEnd,'word',80)},
      {id:'l',lbl:'List:',elem:inp(defList.join(','),'comma sep',200)}
    ],
    onInputs:function(v){
      if(v.b&&/^[a-z]+$/.test(v.b))defBegin=v.b;
      if(v.e&&/^[a-z]+$/.test(v.e))defEnd=v.e;
      var ws=v.l.split(',').map(function(w){return w.trim();}).filter(function(w){return/^[a-z]+$/.test(w);});
      if(ws.length>0)defList=ws;
    },
    buildSteps:function(){return buildSteps(defBegin,defEnd,defList);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},
    onReset:function(ctx,W,H){draw({path:[defBegin],cur:defBegin,level:1},ctx,W,H);}
  });
}

/* ── P98 Largest Rectangle in Histogram ─────────────────────── */
function initLargestRectHistogram(id){
  var container=document.getElementById(id);
  if(!container)return;
  var defHeights=[2,1,5,6,2,3];
  function buildSteps(heights){
    var steps=[],stack=[],maxArea=0,n=heights.length;
    steps.push({heights:heights,stack:[],i:0,maxArea:0,rect:null,
      msg:'Monotonic stack: keep indices of increasing heights. When height drops, pop and compute area.'});
    for(var i=0;i<=n;i++){
      var h=i===n?0:heights[i];
      steps.push({heights:heights,stack:stack.slice(),i:i,maxArea:maxArea,rect:null,
        msg:'i='+i+(i<n?' h='+h:' (sentinel 0) — flush remaining stack')});
      while(stack.length>0&&h<heights[stack[stack.length-1]]){
        var top=stack.pop();
        var width=stack.length===0?i:i-stack[stack.length-1]-1;
        var area=heights[top]*width;
        if(area>maxArea)maxArea=area;
        steps.push({heights:heights,stack:stack.slice(),i:i,maxArea:maxArea,
          rect:{left:stack.length===0?0:stack[stack.length-1]+1,right:i-1,h:heights[top],area:area},
          msg:'Pop idx='+top+' h='+heights[top]+' width='+width+' area='+area+' maxArea='+maxArea});
      }
      if(i<n)stack.push(i);
    }
    steps[steps.length-1].done=true;
    steps[steps.length-1].msg='Max area = '+maxArea;
    return steps;
  }
  function draw(s,ctx,W,H){
    bg(ctx,W,H);if(!s||!s.heights)return;
    var h=s.heights,n=h.length,bw=40,gap=4;
    var maxH=Math.max.apply(null,h)||1;
    var ox=(W-n*(bw+gap))/2,base=H-36;
    for(var i=0;i<n;i++){
      var barH=(h[i]/maxH)*(H-70);
      var inStack=s.stack&&s.stack.indexOf(i)>=0;
      var st=s.i===i?'active':(inStack?'selected':'default');
      if(s.rect&&i>=s.rect.left&&i<=s.rect.right)st='found';
      ctx.fillStyle=CS[st]||CS.default;
      ctx.fillRect(ox+i*(bw+gap),base-barH,bw,barH);
      lbl(ctx,h[i],ox+i*(bw+gap)+bw/2,base-barH-8,'rgba(255,255,255,0.7)',9,'center');
    }
    if(s.rect){
      var rh=(s.rect.h/maxH)*(H-70);
      var rx=ox+s.rect.left*(bw+gap),rw=(s.rect.right-s.rect.left+1)*(bw+gap)-gap;
      ctx.strokeStyle='#34d399';ctx.lineWidth=2;ctx.strokeRect(rx,base-rh,rw,rh);
      lbl(ctx,'area='+s.rect.area,rx+rw/2,base-rh-12,'#34d399',10,'center');
    }
    lbl(ctx,'Max: '+s.maxArea,W/2,H-10,s.done?'#34d399':'#c4b5fd',13,'center');
  }
  makeProbUI(container,{canvasW:540,canvasH:260,
    approaches:[
      {key:'a1',label:'Brute: try all pairs O(n²)'},
      {key:'a2',label:'Monotonic stack O(n) time O(n) space'}
    ],
    inputs:[{id:'h',lbl:'Heights:',elem:inp(defHeights.join(','),'nums',140)}],
    onInputs:function(v){var a=v.h.split(',').map(function(x){return parseInt(x.trim(),10);}).filter(function(x){return!isNaN(x)&&x>=0;});if(a.length>=1&&a.length<=8)defHeights=a;},
    buildSteps:function(){return buildSteps(defHeights);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},
    onReset:function(ctx,W,H){draw({heights:defHeights,stack:[],i:0,maxArea:0},ctx,W,H);}
  });
}

/* ── P99 Longest Increasing Path in Matrix ───────────────────── */
function initLongestPathMatrix(id){
  var container=document.getElementById(id);
  if(!container)return;
  var defMatrix=[[9,9,4],[6,6,8],[2,1,1]];
  function buildSteps(matrix){
    var rows=matrix.length,cols=matrix[0].length,steps=[];
    var memo=[];for(var i=0;i<rows;i++){memo[i]=[];for(var j=0;j<cols;j++)memo[i][j]=0;}
    var dirs=[[-1,0],[1,0],[0,-1],[0,1]];
    var ans=0;
    steps.push({matrix:matrix,memo:memo.map(function(r){return r.slice();}),cur:null,
      msg:'DFS + memo: from each cell, explore 4 dirs where value is strictly greater.'});
    function dfs(r,c){
      if(memo[r][c])return memo[r][c];
      var best=1;
      dirs.forEach(function(d){
        var nr=r+d[0],nc=c+d[1];
        if(nr>=0&&nr<rows&&nc>=0&&nc<cols&&matrix[nr][nc]>matrix[r][c]){
          best=Math.max(best,1+dfs(nr,nc));
        }
      });
      memo[r][c]=best;
      steps.push({matrix:matrix,memo:memo.map(function(r){return r.slice();}),cur:[r,c],ans:ans,
        msg:'dfs('+r+','+c+') val='+matrix[r][c]+' → path='+best});
      if(best>ans)ans=best;
      return best;
    }
    for(var r=0;r<rows;r++)for(var c=0;c<cols;c++)dfs(r,c);
    steps[steps.length-1].done=true;
    steps[steps.length-1].ans=ans;
    steps[steps.length-1].msg='Longest increasing path = '+ans;
    return steps;
  }
  function draw(s,ctx,W,H){
    bg(ctx,W,H);if(!s||!s.matrix)return;
    var m=s.matrix,memo=s.memo||[],rows=m.length,cols=m[0].length;
    var cw=Math.min(52,(W-40)/cols),gap=4,ox=(W-(cols*(cw+gap)))/2,oy=24;
    for(var r=0;r<rows;r++){
      for(var c=0;c<cols;c++){
        var isCur=s.cur&&s.cur[0]===r&&s.cur[1]===c;
        var st=isCur?'active':(memo[r]&&memo[r][c]>0?'sorted':'default');
        cell(ctx,ox+c*(cw+gap),oy+r*(cw+gap),cw,cw,m[r][c],st);
        if(memo[r]&&memo[r][c]>0)lbl(ctx,memo[r][c],ox+c*(cw+gap)+cw-6,oy+r*(cw+gap)+10,'#34d399',8,'right');
      }
    }
    if(s.ans!=null)lbl(ctx,'Longest path: '+(s.ans||0),W/2,H-10,s.done?'#34d399':'#c4b5fd',13,'center');
  }
  makeProbUI(container,{canvasW:440,canvasH:260,
    approaches:[
      {key:'a1',label:'Brute DFS from every cell O(2^(mn))'},
      {key:'a2',label:'DFS + memoization O(mn) time/space'}
    ],
    inputs:[],
    onInputs:function(){},
    buildSteps:function(){return buildSteps(defMatrix);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},
    onReset:function(ctx,W,H){var r=defMatrix.length,c=defMatrix[0].length;var m=[];for(var i=0;i<r;i++){m[i]=[];for(var j=0;j<c;j++)m[i][j]=0;}draw({matrix:defMatrix,memo:m,cur:null,ans:0},ctx,W,H);}
  });
}

/* ── P100 Find the Duplicate Number ─────────────────────────── */
function initFindDuplicate(id){
  var container=document.getElementById(id);
  if(!container)return;
  var defArr=[1,3,4,2,2];
  function buildSteps(nums){
    var steps=[],n=nums.length;
    // Floyd's cycle detection: treat array as linked list where i → nums[i]
    var slow=nums[0],fast=nums[nums.length-1];
    // reset for clean demo
    slow=nums[0];fast=nums[0];
    steps.push({nums:nums,slow:slow,fast:fast,phase:'init',ans:null,
      msg:"Floyd's cycle: treat array as linked list i→nums[i]. Duplicate creates a cycle."});
    // phase 1: detect cycle
    do{
      slow=nums[slow];fast=nums[nums[fast]];
      steps.push({nums:nums,slow:slow,fast:fast,phase:'detect',
        msg:'slow='+slow+' fast='+fast});
    }while(slow!==fast);
    steps.push({nums:nums,slow:slow,fast:fast,phase:'meeting',
      msg:'Slow and fast meet at '+slow+'. Start second pointer from index 0.'});
    // phase 2: find entrance
    var slow2=0;
    while(slow!==slow2){
      slow=nums[slow];slow2=nums[slow2];
      steps.push({nums:nums,slow:slow,fast:slow2,phase:'find',
        msg:'slow='+slow+' slow2='+slow2});
    }
    steps.push({nums:nums,slow:slow,fast:slow2,phase:'done',ans:slow,done:true,
      msg:'Duplicate found: '+slow});
    return steps;
  }
  function draw(s,ctx,W,H){
    bg(ctx,W,H);if(!s||!s.nums)return;
    var nums=s.nums,n=nums.length,cw=38,gap=4,ox=(W-(n*(cw+gap)))/2;
    for(var i=0;i<n;i++){
      lbl(ctx,i,ox+i*(cw+gap)+cw/2,H/2-56,'rgba(255,255,255,0.35)',8,'center');
      var isSlow=s.slow!=null&&nums.indexOf(s.slow)>=0&&nums[i]===s.slow&&i===nums.indexOf(s.slow);
      var isFast=s.phase!=='find'&&s.fast!=null&&nums[i]===s.fast;
      var st=s.ans===nums[i]?'found':(i===s.slow?'active':(i===s.fast?'comparing':'default'));
      cell(ctx,ox+i*(cw+gap),H/2-44,cw,26,nums[i],st);
    }
    if(s.phase==='detect'||s.phase==='find'){
      lbl(ctx,'slow: '+s.slow,W/2-40,H/2+14,'rgba(52,211,153,0.8)',11,'center');
      lbl(ctx,(s.phase==='find'?'slow2':'fast')+': '+s.fast,W/2+40,H/2+14,'rgba(251,146,60,0.8)',11,'center');
    }
    if(s.ans!=null)lbl(ctx,'Duplicate: '+s.ans,W/2,H-10,'#34d399',14,'center');
  }
  makeProbUI(container,{canvasW:520,canvasH:210,
    approaches:[
      {key:'a1',label:'HashSet O(n) time O(n) space'},
      {key:'a2',label:"Floyd's cycle detection O(n) time O(1) space"}
    ],
    inputs:[{id:'arr',lbl:'Array:',elem:inp(defArr.join(','),'1..n with one dup',160)}],
    onInputs:function(v){var a=v.arr.split(',').map(function(x){return parseInt(x.trim(),10);}).filter(function(x){return!isNaN(x)&&x>0;});if(a.length>=3&&a.length<=8)defArr=a;},
    buildSteps:function(){return buildSteps(defArr);},
    onStep:function(s,ctx,W,H){draw(s,ctx,W,H);},
    onReset:function(ctx,W,H){draw({nums:defArr,slow:defArr[0],fast:defArr[0],phase:'init'},ctx,W,H);}
  });
}

/* ── P101 Contains Duplicate ─────────────────────────────── */
function initContainsDuplicate(id){
  var container=document.getElementById(id);if(!container)return;
  var defArr=[1,2,3,1];
  function buildSteps(nums,approach){
    var steps=[];
    if(approach==='brute'){
      steps.push({arr:nums.slice(),hl:{},msg:'Brute: compare every pair — O(n²)'});
      for(var i=0;i<nums.length;i++){
        for(var j=i+1;j<nums.length;j++){
          var h={};h[i]='comparing';h[j]='comparing';
          steps.push({arr:nums.slice(),hl:h,msg:'nums['+i+']='+nums[i]+' vs nums['+j+']='+nums[j]});
          if(nums[i]===nums[j]){var h2={};h2[i]='found';h2[j]='found';steps.push({arr:nums.slice(),hl:h2,msg:'Duplicate '+nums[i]+' at indices '+i+' & '+j+' → true'});return steps;}
        }
      }
      steps.push({arr:nums.slice(),hl:{},msg:'No duplicates → false'});
    } else {
      var seen={};
      steps.push({arr:nums.slice(),hl:{},set:[],msg:'HashSet: insert each element; duplicate if already present'});
      for(var i=0;i<nums.length;i++){
        var h={};h[i]='comparing';
        steps.push({arr:nums.slice(),hl:h,set:Object.keys(seen).map(Number),msg:'Check '+nums[i]+' — in set? '+(seen[nums[i]]?'YES → true':'No, insert')});
        if(seen[nums[i]]){var h2={};h2[i]='found';steps.push({arr:nums.slice(),hl:h2,set:Object.keys(seen).map(Number),msg:'Duplicate '+nums[i]+' found → return true'});return steps;}
        seen[nums[i]]=1;
        steps.push({arr:nums.slice(),hl:{[i]:'sorted'},set:Object.keys(seen).map(Number),msg:'Inserted '+nums[i]+'. Set: {'+Object.keys(seen).join(',')+'}'});
      }
      steps.push({arr:nums.slice(),hl:{},set:Object.keys(seen).map(Number),msg:'All unique → return false'});
    }
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:120,
    approaches:[{key:'brute',label:'Brute O(n²)'},{key:'optimal',label:'HashSet O(n)'}],
    inputs:[{id:'arr',lbl:'Array',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defArr.join(',');i.style.width='160px';return i;})()}],
    onInputs:function(vals,ap){var n=(vals.arr||'').split(',').map(Number).filter(function(x){return!isNaN(x);});return buildSteps(n.length?n:defArr.slice(),ap);},
    buildSteps:function(ap){return buildSteps(defArr.slice(),ap);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var a=s.arr,n=a.length,cw=Math.min(60,Math.floor((W-40)/n)),ch=44,sx=(W-n*cw)/2,sy=18;
      for(var i=0;i<n;i++){cell(ctx,sx+i*cw,sy,cw-2,ch,a[i],s.hl&&s.hl[i]?s.hl[i]:'default');lbl(ctx,i,sx+i*cw+cw/2-1,sy+ch+13,'#6B7280',10,'center');}
      if(s.set&&s.set.length)lbl(ctx,'Set: {'+s.set.join(', ')+'}',W/2,sy+ch+28,'#A78BFA',11,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P102 Valid Anagram ──────────────────────────────────── */
function initValidAnagram(id){
  var container=document.getElementById(id);if(!container)return;
  function buildSteps(s,t,approach){
    var steps=[];
    if(approach==='brute'){
      var ss=s.split('').sort().join(''),ts=t.split('').sort().join('');
      steps.push({sa:ss,ta:ts,msg:'Sort both strings: "'+ss+'" vs "'+ts+'"'});
      steps.push({sa:ss,ta:ts,msg:ss===ts?'Strings match → valid anagram ✓':'Differ → not anagram ✗'});
    } else {
      var freq={};
      for(var c of s)freq[c]=(freq[c]||0)+1;
      steps.push({freq:JSON.parse(JSON.stringify(freq)),msg:'Count chars in s="'+s+'"',sidx:-1,tidx:-1});
      for(var j=0;j<t.length;j++){
        var c=t[j];
        steps.push({freq:JSON.parse(JSON.stringify(freq)),msg:'Subtract t['+j+']="'+c+'"',tidx:j,str:t});
        freq[c]=(freq[c]||0)-1;
        if(freq[c]<0){steps.push({freq:JSON.parse(JSON.stringify(freq)),msg:'"'+c+'" went negative → not anagram ✗',fail:true});return steps;}
      }
      var ok=Object.values(freq).every(function(v){return v===0;});
      steps.push({freq:JSON.parse(JSON.stringify(freq)),msg:ok?'All counts zero → valid anagram ✓':'Leftover chars → not anagram ✗'});
    }
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:130,
    approaches:[{key:'brute',label:'Sort O(n log n)'},{key:'optimal',label:'Count O(n)'}],
    inputs:[
      {id:'s',lbl:'s',elem:(function(){var i=document.createElement('input');i.type='text';i.value='anagram';i.style.width='90px';return i;})()},
      {id:'t',lbl:'t',elem:(function(){var i=document.createElement('input');i.type='text';i.value='nagaram';i.style.width='90px';return i;})()}
    ],
    onInputs:function(vals,ap){return buildSteps(vals.s||'anagram',vals.t||'nagaram',ap);},
    buildSteps:function(ap){return buildSteps('anagram','nagaram',ap);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      if(s.freq){
        var keys=Object.keys(s.freq).sort(),kw=Math.min(30,Math.floor((W-40)/Math.max(keys.length,1))),sx=(W-keys.length*kw)/2,sy=22;
        lbl(ctx,'Freq:',sx-28,sy+16,'#6B7280',10,'left');
        keys.forEach(function(k,i){var v=s.freq[k];cell(ctx,sx+i*kw,sy,kw-1,30,v,v>0?'sorted':v<0?'comparing':'default');lbl(ctx,k,sx+i*kw+kw/2-0.5,sy+42,'#9CA3AF',10,'center');});
        if(s.str&&s.tidx>=0)lbl(ctx,'Subtracting "'+s.str[s.tidx]+'" at t['+s.tidx+']',W/2,sy+56,'#F59E0B',11,'center');
      } else if(s.sa){
        lbl(ctx,'"'+s.sa+'"',W/2,46,'#E5E7EB',14,'center');
        lbl(ctx,'"'+s.ta+'"',W/2,74,'#A78BFA',14,'center');
      }
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P103 Group Anagrams ─────────────────────────────────── */
function initGroupAnagrams(id){
  var container=document.getElementById(id);if(!container)return;
  var defWords=['eat','tea','tan','ate','nat','bat'];
  function buildSteps(words){
    var steps=[],groups={};
    steps.push({groups:{},msg:'Sort each word → anagram key → group by key'});
    words.forEach(function(w){
      var key=w.split('').sort().join('');
      if(!groups[key])groups[key]=[];
      groups[key].push(w);
      steps.push({groups:JSON.parse(JSON.stringify(groups)),cur:w,key:key,msg:'"'+w+'" → key "'+key+'" → group ['+groups[key].join(',')+']'});
    });
    steps.push({groups:JSON.parse(JSON.stringify(groups)),msg:'Result: '+Object.values(groups).map(function(g){return '['+g.join(',')+']';}).join('  ')});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:150,
    approaches:[{key:'optimal',label:'Sort Key O(n·k·log k)'}],
    inputs:[{id:'words',lbl:'Words',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defWords.join(',');i.style.width='200px';return i;})()}],
    onInputs:function(vals){var w=(vals.words||'').split(',').map(function(x){return x.trim();}).filter(Boolean);return buildSteps(w.length?w:defWords.slice());},
    buildSteps:function(){return buildSteps(defWords.slice());},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var entries=Object.entries(s.groups||{}),colors=['#A78BFA','#34D399','#F59E0B','#60A5FA'];
      lbl(ctx,'Groups:',10,16,'#6B7280',10,'left');
      entries.forEach(function(e,i){lbl(ctx,'['+e[0]+'] → ['+e[1].join(', ')+']',16,32+i*24,colors[i%colors.length],12,'left');});
      if(s.cur)lbl(ctx,'Current: "'+s.cur+'" → "'+s.key+'"',W/2,H-10,'#F59E0B',11,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P104 Two Sum II ─────────────────────────────────────── */
function initTwoSumII(id){
  var container=document.getElementById(id);if(!container)return;
  var defArr=[2,7,11,15],defTarget=9;
  function buildSteps(nums,target,approach){
    var steps=[];
    if(approach==='brute'){
      steps.push({arr:nums,L:-1,R:-1,msg:'Brute: try every pair O(n²)'});
      for(var i=0;i<nums.length;i++)for(var j=i+1;j<nums.length;j++){
        var sum=nums[i]+nums[j];
        steps.push({arr:nums,L:i,R:j,sum:sum,msg:'['+i+']+['+j+']='+nums[i]+'+'+nums[j]+'='+sum+' vs '+target});
        if(sum===target){steps.push({arr:nums,L:i,R:j,found:true,msg:'Found! Return ['+(i+1)+','+(j+1)+'] (1-indexed)'});return steps;}
      }
    } else {
      var L=0,R=nums.length-1;
      steps.push({arr:nums,L:L,R:R,msg:'Two pointers on sorted array — O(n), O(1) space'});
      while(L<R){
        var sum=nums[L]+nums[R];
        steps.push({arr:nums,L:L,R:R,sum:sum,msg:'L='+L+' R='+R+': '+nums[L]+'+'+nums[R]+'='+sum});
        if(sum===target){steps.push({arr:nums,L:L,R:R,found:true,msg:'Found! Return ['+(L+1)+','+(R+1)+']'});return steps;}
        else if(sum<target){steps.push({arr:nums,L:L,R:R,msg:'Too small → move L right'});L++;}
        else{steps.push({arr:nums,L:L,R:R,msg:'Too large → move R left'});R--;}
      }
    }
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:120,
    approaches:[{key:'brute',label:'Brute O(n²)'},{key:'optimal',label:'Two Pointers O(n)'}],
    inputs:[
      {id:'arr',lbl:'Sorted array',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defArr.join(',');i.style.width='140px';return i;})()},
      {id:'target',lbl:'Target',elem:(function(){var i=document.createElement('input');i.type='number';i.value=defTarget;i.style.width='60px';return i;})()}
    ],
    onInputs:function(vals,ap){var n=(vals.arr||'').split(',').map(Number).filter(function(x){return!isNaN(x);});var t=parseInt(vals.target)||defTarget;return buildSteps(n.length?n:defArr.slice(),t,ap);},
    buildSteps:function(ap){return buildSteps(defArr.slice(),defTarget,ap);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var a=s.arr,n=a.length,cw=Math.min(64,Math.floor((W-40)/n)),ch=44,sx=(W-n*cw)/2,sy=18;
      for(var i=0;i<n;i++){
        var st=s.found&&(i===s.L||i===s.R)?'found':i===s.L||i===s.R?'comparing':'default';
        cell(ctx,sx+i*cw,sy,cw-2,ch,a[i],st);
        if(i===s.L)lbl(ctx,'L',sx+i*cw+cw/2-1,sy+ch+13,'#F59E0B',11,'center');
        if(i===s.R)lbl(ctx,'R',sx+i*cw+cw/2-1,sy+ch+13,'#F59E0B',11,'center');
      }
      if(s.sum!==undefined)lbl(ctx,'Sum='+s.sum+'  target='+defTarget,W/2,sy+ch+28,'#A78BFA',11,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P105 Longest Repeating Char Replacement ─────────────── */
function initLongestRepeatingReplace(id){
  var container=document.getElementById(id);if(!container)return;
  var defS='AABABBA',defK=1;
  function buildSteps(s,k){
    var steps=[],count={},maxF=0,L=0,best=0;
    steps.push({s:s,L:0,R:0,maxF:0,best:0,msg:'Window valid when (len − maxFreq) ≤ k'});
    for(var R=0;R<s.length;R++){
      count[s[R]]=(count[s[R]]||0)+1;
      maxF=Math.max(maxF,count[s[R]]);
      while((R-L+1)-maxF>k){count[s[L]]--;L++;}
      best=Math.max(best,R-L+1);
      steps.push({s:s,L:L,R:R,maxF:maxF,best:best,msg:'Window "'+s.slice(L,R+1)+'" len='+(R-L+1)+' maxFreq='+maxF+' need='+(R-L+1-maxF)+' ≤ k='+k+'? '+(R-L+1-maxF<=k?'yes':'shrink L')});
    }
    steps.push({s:s,L:L,R:s.length-1,maxF:maxF,best:best,msg:'Longest: '+best});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:110,
    approaches:[{key:'optimal',label:'Sliding Window O(n)'}],
    inputs:[
      {id:'s',lbl:'String',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defS;i.style.width='120px';return i;})()},
      {id:'k',lbl:'k',elem:(function(){var i=document.createElement('input');i.type='number';i.value=defK;i.style.width='50px';return i;})()}
    ],
    onInputs:function(vals){return buildSteps(vals.s||defS,parseInt(vals.k)||defK);},
    buildSteps:function(){return buildSteps(defS,defK);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var str=s.s,n=str.length,cw=Math.min(52,Math.floor((W-40)/n)),ch=40,sx=(W-n*cw)/2,sy=16;
      for(var i=0;i<n;i++)cell(ctx,sx+i*cw,sy,cw-2,ch,str[i],s.L!==undefined&&i>=s.L&&i<=s.R?'active':'default');
      lbl(ctx,'Best: '+s.best+'  maxFreq: '+s.maxF,W/2,sy+ch+18,'#A78BFA',11,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P106 Permutation in String ──────────────────────────── */
function initPermutationInString(id){
  var container=document.getElementById(id);if(!container)return;
  var defS1='ab',defS2='eidbaooo';
  function buildSteps(s1,s2){
    var steps=[],k=s1.length,n=s2.length;
    if(k>n){steps.push({s1:s1,s2:s2,msg:'s1 longer than s2 → false'});return steps;}
    var need={},have={};
    for(var c of s1)need[c]=(need[c]||0)+1;
    for(var i=0;i<k;i++)have[s2[i]]=(have[s2[i]]||0)+1;
    function eq(a,b){for(var x in a)if(a[x]!==(b[x]||0))return false;for(var x in b)if((a[x]||0)!==b[x])return false;return true;}
    steps.push({s1:s1,s2:s2,L:0,R:k-1,msg:'Fixed window size '+k+' (=len(s1)), slide across s2'});
    for(var R=k-1;R<n;R++){
      var L=R-k+1,m=eq(need,have);
      steps.push({s1:s1,s2:s2,L:L,R:R,match:m,msg:'Window "'+s2.slice(L,R+1)+'"  match s1 anagram: '+m});
      if(m){steps.push({s1:s1,s2:s2,L:L,R:R,found:true,msg:'Permutation found at ['+L+','+R+'] → return true'});return steps;}
      if(R+1<n){have[s2[L]]--;if(!have[s2[L]])delete have[s2[L]];have[s2[R+1]]=(have[s2[R+1]]||0)+1;}
    }
    steps.push({s1:s1,s2:s2,msg:'No permutation found → false'});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:110,
    approaches:[{key:'optimal',label:'Sliding Window O(n)'}],
    inputs:[
      {id:'s1',lbl:'s1',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defS1;i.style.width='70px';return i;})()},
      {id:'s2',lbl:'s2',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defS2;i.style.width='120px';return i;})()}
    ],
    onInputs:function(vals){return buildSteps(vals.s1||defS1,vals.s2||defS2);},
    buildSteps:function(){return buildSteps(defS1,defS2);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var str=s.s2,n=str.length,cw=Math.min(46,Math.floor((W-40)/n)),ch=40,sx=(W-n*cw)/2,sy=16;
      for(var i=0;i<n;i++){
        var st=s.found&&i>=s.L&&i<=s.R?'found':s.L!==undefined&&i>=s.L&&i<=s.R?(s.match?'sorted':'active'):'default';
        cell(ctx,sx+i*cw,sy,cw-2,ch,str[i],st);
      }
      lbl(ctx,'s1="'+s.s1+'"',W/2,sy+ch+18,'#A78BFA',11,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P107 Daily Temperatures ─────────────────────────────── */
function initDailyTemperatures(id){
  var container=document.getElementById(id);if(!container)return;
  var defTemps=[73,74,75,71,69,72,76,73];
  function buildSteps(temps){
    var steps=[],n=temps.length,ans=new Array(n).fill(0),stack=[];
    steps.push({temps:temps,ans:ans.slice(),stack:[],msg:'Monotonic stack: push index; pop when warmer temp found'});
    for(var i=0;i<n;i++){
      while(stack.length&&temps[i]>temps[stack[stack.length-1]]){
        var idx=stack.pop();ans[idx]=i-idx;
        steps.push({temps:temps,ans:ans.slice(),stack:stack.slice(),cur:i,msg:'temps['+i+']='+temps[i]+' > temps['+idx+']='+temps[idx]+' → ans['+idx+']='+ans[idx]});
      }
      stack.push(i);
      steps.push({temps:temps,ans:ans.slice(),stack:stack.slice(),cur:i,msg:'Push idx '+i+' ('+temps[i]+'). Stack: ['+stack.join(',')+']'});
    }
    steps.push({temps:temps,ans:ans.slice(),stack:[],msg:'Answer: ['+ans.join(',')+']'});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:150,
    approaches:[{key:'optimal',label:'Monotonic Stack O(n)'}],
    inputs:[{id:'temps',lbl:'Temps',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defTemps.join(',');i.style.width='180px';return i;})()}],
    onInputs:function(vals){var t=(vals.temps||'').split(',').map(Number).filter(function(x){return!isNaN(x);});return buildSteps(t.length?t:defTemps.slice());},
    buildSteps:function(){return buildSteps(defTemps.slice());},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var a=s.temps,n=a.length,cw=Math.min(52,Math.floor((W-40)/n)),sy=10,ch=34,sx=(W-n*cw)/2;
      for(var i=0;i<n;i++)cell(ctx,sx+i*cw,sy,cw-2,ch,a[i],i===s.cur?'active':s.stack&&s.stack.indexOf(i)>=0?'comparing':'default');
      var ans=s.ans||[];
      for(var i=0;i<n;i++)cell(ctx,sx+i*cw,sy+ch+8,cw-2,26,ans[i]||'·',ans[i]?'sorted':'default');
      lbl(ctx,'temps',sx-28,sy+ch/2,'#6B7280',9,'left');
      lbl(ctx,'ans',sx-28,sy+ch+22,'#6B7280',9,'left');
      lbl(ctx,'stack: ['+((s.stack||[]).join(','))+']',W/2,sy+ch+44,'#A78BFA',10,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P108 Car Fleet ──────────────────────────────────────── */
function initCarFleet(id){
  var container=document.getElementById(id);if(!container)return;
  var defTarget=12,defPos=[10,8,0,5,3],defSpeed=[2,4,1,1,3];
  function buildSteps(target,pos,speed){
    var steps=[],cars=pos.map(function(p,i){return{pos:p,spd:speed[i],time:(target-p)/speed[i]};});
    cars.sort(function(a,b){return b.pos-a.pos;});
    var stack=[];
    steps.push({cars:cars.slice(),stack:[],target:target,msg:'Sort desc by position. Fleet = monotonic stack of arrival times.'});
    cars.forEach(function(car,i){
      steps.push({cars:cars.slice(),stack:stack.slice(),cur:i,target:target,msg:'Car @pos='+car.pos+' spd='+car.spd+' time='+car.time.toFixed(2)+'h'});
      if(!stack.length||car.time>stack[stack.length-1]){
        stack.push(car.time);
        steps.push({cars:cars.slice(),stack:stack.slice(),cur:i,target:target,msg:'New fleet (slower). Fleets so far: '+stack.length});
      } else {
        steps.push({cars:cars.slice(),stack:stack.slice(),cur:i,target:target,msg:'Merges into fleet ahead. Fleet count: '+stack.length});
      }
    });
    steps.push({cars:cars.slice(),stack:stack.slice(),target:target,msg:'Total fleets: '+stack.length});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:150,
    approaches:[{key:'optimal',label:'Sort + Stack O(n log n)'}],
    inputs:[
      {id:'target',lbl:'Target',elem:(function(){var i=document.createElement('input');i.type='number';i.value=defTarget;i.style.width='50px';return i;})()},
      {id:'pos',lbl:'Positions',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defPos.join(',');i.style.width='100px';return i;})()},
      {id:'speed',lbl:'Speeds',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defSpeed.join(',');i.style.width='100px';return i;})()}
    ],
    onInputs:function(vals){
      var t=parseInt(vals.target)||defTarget;
      var p=(vals.pos||'').split(',').map(Number).filter(function(x){return!isNaN(x);});
      var sp=(vals.speed||'').split(',').map(Number).filter(function(x){return!isNaN(x);});
      return buildSteps(t,p.length?p:defPos.slice(),sp.length?sp:defSpeed.slice());
    },
    buildSteps:function(){return buildSteps(defTarget,defPos.slice(),defSpeed.slice());},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var cars=s.cars||[],tgt=s.target||12,colors=['#A78BFA','#34D399','#F59E0B','#60A5FA','#F472B6'];
      cars.forEach(function(car,i){
        var barW=Math.max(4,Math.round(car.pos/tgt*(W-120)));
        var y=12+i*24,h=18;
        ctx.fillStyle=i===s.cur?CS.active:colors[i%colors.length]+'44';
        ctx.fillRect(40,y,barW,h);
        ctx.strokeStyle=colors[i%colors.length];ctx.strokeRect(40,y,barW,h);
        lbl(ctx,'p='+car.pos+' v='+car.spd+' t='+car.time.toFixed(1),44+barW,y+12,'#9CA3AF',9,'left');
      });
      lbl(ctx,'Fleets: '+(s.stack?s.stack.length:0),W-40,H-10,'#A78BFA',13,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P109 Koko Eating Bananas ────────────────────────────── */
function initKokoEating(id){
  var container=document.getElementById(id);if(!container)return;
  var defPiles=[3,6,7,11],defH=8;
  function hoursFor(piles,k){return piles.reduce(function(s,p){return s+Math.ceil(p/k);},0);}
  function buildSteps(piles,h){
    var steps=[],L=1,R=Math.max.apply(null,piles),ans=R;
    steps.push({piles:piles,h:h,L:L,R:R,ans:ans,msg:'Binary search on speed k in [1, max='+R+']'});
    while(L<=R){
      var mid=Math.floor((L+R)/2),hrs=hoursFor(piles,mid);
      steps.push({piles:piles,h:h,L:L,R:R,mid:mid,hrs:hrs,ans:ans,msg:'k='+mid+': need '+hrs+'h, have '+h+'h → '+(hrs<=h?'feasible, try slower':'too slow, go faster')});
      if(hrs<=h){ans=mid;R=mid-1;}else{L=mid+1;}
    }
    steps.push({piles:piles,h:h,L:ans,R:ans,ans:ans,mid:ans,msg:'Minimum speed: '+ans});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:150,
    approaches:[{key:'optimal',label:'Binary Search O(n log m)'}],
    inputs:[
      {id:'piles',lbl:'Piles',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defPiles.join(',');i.style.width='110px';return i;})()},
      {id:'h',lbl:'H hours',elem:(function(){var i=document.createElement('input');i.type='number';i.value=defH;i.style.width='55px';return i;})()}
    ],
    onInputs:function(vals){var p=(vals.piles||'').split(',').map(Number).filter(function(x){return!isNaN(x);});var h=parseInt(vals.h)||defH;return buildSteps(p.length?p:defPiles.slice(),h);},
    buildSteps:function(){return buildSteps(defPiles.slice(),defH);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var piles=s.piles||[],n=piles.length,maxP=Math.max.apply(null,piles);
      var bw=40,gap=14,total=n*(bw+gap),sx=(W-total)/2;
      piles.forEach(function(p,i){
        var bh=Math.round(p/maxP*(H-55)),y=H-40-bh;
        ctx.fillStyle='#374151';ctx.fillRect(sx+i*(bw+gap),y,bw,bh);
        if(s.mid){var eh=Math.round(Math.min(p,s.mid)/maxP*(H-55));ctx.fillStyle=CS.active;ctx.fillRect(sx+i*(bw+gap),H-40-eh,bw,eh);}
        lbl(ctx,p,sx+i*(bw+gap)+bw/2,y-6,'#9CA3AF',11,'center');
      });
      lbl(ctx,s.mid?'k='+s.mid+'  hrs='+s.hrs+'  ans='+s.ans:'ans='+s.ans,W/2,H-12,'#A78BFA',12,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P110 Search a 2D Matrix ─────────────────────────────── */
function initSearchMatrix(id){
  var container=document.getElementById(id);if(!container)return;
  var defMatrix=[[1,3,5,7],[10,11,16,20],[23,30,34,60]],defTarget=3;
  function buildSteps(matrix,target){
    var steps=[],m=matrix.length,n=matrix[0].length,total=m*n,L=0,R=total-1;
    steps.push({matrix:matrix,target:target,L:L,R:R,r:-1,c:-1,msg:'Treat '+m+'×'+n+' matrix as 1D sorted array, binary search'});
    while(L<=R){
      var mid=Math.floor((L+R)/2),r=Math.floor(mid/n),c=mid%n,val=matrix[r][c];
      steps.push({matrix:matrix,target:target,L:L,R:R,r:r,c:c,val:val,msg:'mid='+mid+' → ['+r+']['+c+']='+val+' vs target='+target});
      if(val===target){steps.push({matrix:matrix,target:target,r:r,c:c,found:true,msg:'Found '+target+' at ['+r+']['+c+'] → true'});return steps;}
      else if(val<target){L=mid+1;steps.push({matrix:matrix,target:target,L:L,R:R,r:-1,c:-1,msg:'Too small → right half'});}
      else{R=mid-1;steps.push({matrix:matrix,target:target,L:L,R:R,r:-1,c:-1,msg:'Too large → left half'});}
    }
    steps.push({matrix:matrix,target:target,r:-1,c:-1,msg:'Target '+target+' not found → false'});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:160,
    approaches:[{key:'optimal',label:'Binary Search O(log mn)'}],
    inputs:[
      {id:'matrix',lbl:'Matrix (rows with ;)',elem:(function(){var i=document.createElement('input');i.type='text';i.value='1,3,5,7;10,11,16,20;23,30,34,60';i.style.width='210px';return i;})()},
      {id:'target',lbl:'Target',elem:(function(){var i=document.createElement('input');i.type='number';i.value=defTarget;i.style.width='60px';return i;})()}
    ],
    onInputs:function(vals){
      var rows=(vals.matrix||'').split(';').map(function(r){return r.split(',').map(Number);}).filter(function(r){return r.length>0&&!isNaN(r[0]);});
      var t=parseInt(vals.target)||defTarget;
      return buildSteps(rows.length?rows:defMatrix,t);
    },
    buildSteps:function(){return buildSteps(defMatrix,defTarget);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var mat=s.matrix,m=mat.length,n=mat[0].length;
      var cw=Math.min(58,Math.floor((W-40)/n)),ch=Math.min(38,Math.floor((H-28)/m)),sx=(W-n*cw)/2,sy=10;
      for(var r=0;r<m;r++)for(var c=0;c<n;c++){
        var st=s.found&&r===s.r&&c===s.c?'found':r===s.r&&c===s.c?'comparing':'default';
        cell(ctx,sx+c*cw,sy+r*ch,cw-2,ch-2,mat[r][c],st);
      }
      lbl(ctx,'Target: '+s.target,W/2,sy+m*ch+16,'#A78BFA',12,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P111 Validate BST ───────────────────────────────────── */
function initValidateBST(id){
  var container=document.getElementById(id);if(!container)return;
  var defArr=[5,3,7,1,4,6,8];
  function buildSteps(arr){
    var root=_mkTree(arr),steps=[];
    function validate(node,mn,mx,path){
      if(!node)return true;
      steps.push({hl:{[node.val]:'comparing'},msg:'Node '+node.val+': must be in ('+mn+', '+mx+')'});
      if(node.val<=mn||node.val>=mx){
        steps.push({hl:{[node.val]:'comparing'},msg:'INVALID: '+node.val+' violates bounds ('+mn+', '+mx+')'});
        return false;
      }
      steps.push({hl:{[node.val]:'sorted'},msg:node.val+' ✓ valid. Check left in ('+mn+','+node.val+'), right in ('+node.val+','+mx+')'});
      return validate(node.left,mn,node.val,path)&&validate(node.right,node.val,mx,path);
    }
    steps.push({hl:{},msg:'Check each node: must be > all left ancestors and < all right ancestors'});
    var valid=validate(root,-Infinity,Infinity,[]);
    steps.push({hl:{},msg:valid?'All nodes valid → true ✓':'Tree violates BST property → false ✗'});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:220,
    approaches:[{key:'optimal',label:'DFS Bounds O(n)'}],
    inputs:[{id:'arr',lbl:'Level-order (null=_)',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defArr.join(',');i.style.width='180px';return i;})()}],
    onInputs:function(vals){var a=(vals.arr||'').split(',').map(function(x){return x.trim()==='_'?null:Number(x);});return buildSteps(a.length?a:defArr.slice());},
    buildSteps:function(){return buildSteps(defArr.slice());},
    onStep:function(s,ctx,W,H){bg(ctx,W,H);_drawTree(ctx,_mkTree(defArr),W,H,s.hl||{});},
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P112 LCA of Binary Tree ─────────────────────────────── */
function initLCABinaryTree(id){
  var container=document.getElementById(id);if(!container)return;
  var defArr=[3,5,1,6,2,0,8,null,null,7,4],defP=5,defQ=1;
  function buildSteps(arr,p,q){
    var root=_mkTree(arr),steps=[];
    steps.push({hl:{},msg:'DFS: return node if it equals p or q. LCA is where both are found below.'});
    function lca(node){
      if(!node)return null;
      steps.push({hl:{[node.val]:'comparing'},msg:'Visit '+node.val+(node.val===p?' ← found p':node.val===q?' ← found q':'')});
      if(node.val===p||node.val===q){steps.push({hl:{[node.val]:'active'},msg:'Return '+node.val+' to parent'});return node;}
      var L=lca(node.left),R=lca(node.right);
      if(L&&R){steps.push({hl:{[node.val]:'found'},msg:'Both p and q found in subtrees → LCA is '+node.val});return node;}
      return L||R;
    }
    var res=lca(root);
    steps.push({hl:{[res?res.val:-1]:'found'},msg:'LCA of '+p+' and '+q+' is '+(res?res.val:'none')});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:230,
    approaches:[{key:'optimal',label:'DFS O(n)'}],
    inputs:[
      {id:'arr',lbl:'Tree (level-order)',elem:(function(){var i=document.createElement('input');i.type='text';i.value='3,5,1,6,2,0,8';i.style.width='160px';return i;})()},
      {id:'p',lbl:'p',elem:(function(){var i=document.createElement('input');i.type='number';i.value=defP;i.style.width='50px';return i;})()},
      {id:'q',lbl:'q',elem:(function(){var i=document.createElement('input');i.type='number';i.value=defQ;i.style.width='50px';return i;})()}
    ],
    onInputs:function(vals){var a=(vals.arr||'').split(',').map(function(x){return x.trim()==='_'||x.trim()===''?null:Number(x);});return buildSteps(a.length?a:defArr.slice(),parseInt(vals.p)||defP,parseInt(vals.q)||defQ);},
    buildSteps:function(){return buildSteps(defArr.slice(),defP,defQ);},
    onStep:function(s,ctx,W,H){bg(ctx,W,H);_drawTree(ctx,_mkTree(defArr),W,H,s.hl||{});},
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P113 Serialize / Deserialize Binary Tree ────────────── */
function initSerializeTree(id){
  var container=document.getElementById(id);if(!container)return;
  var defArr=[1,2,3,null,null,4,5];
  function buildSteps(arr){
    var root=_mkTree(arr),steps=[];
    // BFS serialize
    var encoded=[],queue=[root];
    steps.push({hl:{},encoded:[],msg:'BFS serialize: visit each node level by level, use "N" for null'});
    while(queue.length){
      var node=queue.shift();
      if(!node){encoded.push('N');}
      else{
        encoded.push(String(node.val));
        steps.push({hl:{[node.val]:'active'},encoded:encoded.slice(),msg:'Encode node '+node.val+' → "'+node.val+'"'});
        queue.push(node.left);queue.push(node.right);
      }
    }
    steps.push({hl:{},encoded:encoded.slice(),msg:'Serialized: "'+encoded.join(',')+'". Now deserialize back:'});
    // BFS deserialize steps
    var tokens=encoded.slice(),idx=0,root2=null;
    if(tokens[idx]==='N'){steps.push({hl:{},encoded:encoded,msg:'Empty tree'});return steps;}
    var root2={val:parseInt(tokens[idx++]),left:null,right:null};
    var q2=[root2];
    while(q2.length){
      var n=q2.shift();
      if(idx<tokens.length&&tokens[idx]!=='N'){n.left={val:parseInt(tokens[idx]),left:null,right:null};q2.push(n.left);}idx++;
      if(idx<tokens.length&&tokens[idx]!=='N'){n.right={val:parseInt(tokens[idx]),left:null,right:null};q2.push(n.right);}idx++;
    }
    steps.push({hl:{[root2.val]:'found'},encoded:encoded,msg:'Tree deserialized successfully — structure matches original ✓'});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:220,
    approaches:[{key:'optimal',label:'BFS O(n)'}],
    inputs:[{id:'arr',lbl:'Tree (level-order)',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defArr.filter(function(x){return x!==null;}).join(',');i.style.width='140px';return i;})()}],
    onInputs:function(vals){var a=(vals.arr||'').split(',').map(function(x){return x.trim()==='N'||x.trim()===''?null:Number(x);});return buildSteps(a.length?a:defArr.slice());},
    buildSteps:function(){return buildSteps(defArr.slice());},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      _drawTree(ctx,_mkTree(defArr),W,H-40,s.hl||{});
      if(s.encoded&&s.encoded.length){lbl(ctx,'Encoded: "'+s.encoded.join(',').slice(0,60)+'"',W/2,H-8,'#A78BFA',10,'center');}
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P114 Reverse Nodes in K-Group ──────────────────────── */
function initReverseKGroup(id){
  var container=document.getElementById(id);if(!container)return;
  var defArr=[1,2,3,4,5],defK=2;
  function buildSteps(arr,k){
    var steps=[],cur=arr.slice(),n=arr.length;
    steps.push({arr:cur.slice(),groups:[],msg:'Reverse every group of '+k+' nodes; leave remainder as-is'});
    var result=[],i=0;
    while(i+k<=n){
      var group=cur.slice(i,i+k).reverse();
      result=result.concat(group);
      var groups=[];
      for(var g=0;g<result.length;g+=k)groups.push(result.slice(g,g+k));
      steps.push({arr:result.concat(cur.slice(i+k)),groups:groups,msg:'Reversed group ['+cur.slice(i,i+k).join('→')+'] → ['+group.join('→')+']'});
      i+=k;
    }
    if(i<n){result=result.concat(cur.slice(i));steps.push({arr:result.slice(),msg:'Remaining '+cur.slice(i).join('→')+' (< '+k+' nodes) left as-is'});}
    steps.push({arr:result.slice(),msg:'Final: '+result.join(' → ')});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:110,
    approaches:[{key:'optimal',label:'Pointer Reversal O(n)'}],
    inputs:[
      {id:'arr',lbl:'List',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defArr.join(',');i.style.width='130px';return i;})()},
      {id:'k',lbl:'k',elem:(function(){var i=document.createElement('input');i.type='number';i.value=defK;i.style.width='50px';return i;})()}
    ],
    onInputs:function(vals){var a=(vals.arr||'').split(',').map(Number).filter(function(x){return!isNaN(x);});var k=parseInt(vals.k)||defK;return buildSteps(a.length?a:defArr.slice(),k);},
    buildSteps:function(){return buildSteps(defArr.slice(),defK);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var a=s.arr,n=a.length,cw=Math.min(56,Math.floor((W-60)/n)),ch=44,sx=(W-n*cw)/2,sy=22;
      for(var i=0;i<n;i++){cell(ctx,sx+i*cw,sy,cw-2,ch,a[i],'sorted');}
      if(i<n-1){ctx.fillStyle='#6B7280';ctx.font='12px monospace';ctx.fillText('→',sx+(i+0.5)*cw,sy+ch/2+4);}
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P115 Copy List with Random Pointer ──────────────────── */
function initCopyListRandom(id){
  var container=document.getElementById(id);if(!container)return;
  var defList=[[7,null],[13,0],[11,4],[10,2],[1,0]];
  function buildSteps(list){
    var steps=[],n=list.length;
    steps.push({phase:'start',msg:'Pass 1: create all cloned nodes, store in map[original] → clone'});
    var map={};
    for(var i=0;i<n;i++){
      map[i]={val:list[i][0]};
      steps.push({phase:'clone',cur:i,msg:'Clone node['+i+'] val='+list[i][0]+' → new node created'});
    }
    steps.push({phase:'link',msg:'Pass 2: link next and random pointers using the map'});
    for(var i=0;i<n;i++){
      var rnd=list[i][1];
      steps.push({phase:'link',cur:i,rnd:rnd,msg:'Node['+i+']: next→node['+(i+1<n?i+1:'null')+']  random→'+(rnd!==null?'node['+rnd+'] (val='+list[rnd][0]+')':'null')});
    }
    steps.push({phase:'done',msg:'Deep copy complete — all next & random pointers wired ✓'});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:170,
    approaches:[{key:'optimal',label:'HashMap Two-Pass O(n)'}],
    inputs:[{id:'list',lbl:'[[val,rnd],…]',elem:(function(){var i=document.createElement('input');i.type='text';i.value='[7,null],[13,0],[11,4],[10,2],[1,0]';i.style.width='220px';return i;})()}],
    onInputs:function(vals){
      try{var a=JSON.parse('['+vals.list+']');return buildSteps(a);}catch(e){return buildSteps(defList);}
    },
    buildSteps:function(){return buildSteps(defList);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var n=defList.length,cw=80,gap=20,sx=(W-n*(cw+gap))/2,sy=30,ch=36;
      // draw original nodes
      defList.forEach(function(item,i){
        var x=sx+i*(cw+gap);
        var st=i===s.cur?'active':'default';
        cell(ctx,x,sy,cw,ch,item[0],st);
        // next arrow
        if(i<n-1){lbl(ctx,'→',x+cw+2,sy+ch/2+4,'#6B7280',13,'left');}
        lbl(ctx,'r:'+(item[1]!==null?item[1]:'∅'),x+cw/2,sy+ch+14,'#A78BFA',10,'center');
      });
      // draw clone row
      defList.forEach(function(item,i){
        var x=sx+i*(cw+gap);
        var st=s.phase==='clone'&&i<=s.cur?'sorted':s.phase==='link'||s.phase==='done'?'sorted':'default';
        cell(ctx,x,sy+ch+30,cw,ch,item[0],st);
        if(i<n-1)lbl(ctx,'→',x+cw+2,sy+ch+30+ch/2+4,'#6B7280',13,'left');
      });
      lbl(ctx,'original',sx-36,sy+ch/2+4,'#6B7280',9,'left');
      lbl(ctx,'clone',sx-36,sy+ch+30+ch/2+4,'#6B7280',9,'left');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P116 LRU Cache ──────────────────────────────────────── */
function initLRUCache(id){
  var container=document.getElementById(id);if(!container)return;
  var defCap=2,defOps=[['put',1,1],['put',2,2],['get',1],['put',3,3],['get',2],['put',4,4],['get',1],['get',3],['get',4]];
  function buildSteps(cap,ops){
    var steps=[],cache={},order=[];
    steps.push({cache:{},order:[],msg:'LRU Cache capacity='+cap+'. HashMap + order list.'});
    ops.forEach(function(op){
      if(op[0]==='get'){
        var k=op[1],hit=k in cache;
        if(hit){order.splice(order.indexOf(k),1);order.push(k);}
        steps.push({cache:Object.assign({},cache),order:order.slice(),msg:'get('+k+') → '+(hit?cache[k]+' (hit, move to MRU)':'-1 (miss)')});
      } else {
        var k=op[1],v=op[2];
        if(k in cache){order.splice(order.indexOf(k),1);}
        else if(order.length>=cap){var evict=order.shift();delete cache[evict];steps.push({cache:Object.assign({},cache),order:order.slice(),msg:'Cache full → evict LRU key='+evict});}
        cache[k]=v;order.push(k);
        steps.push({cache:Object.assign({},cache),order:order.slice(),msg:'put('+k+','+v+') → cache=['+order.map(function(x){return x+':'+cache[x];}).join(', ')+']'});
      }
    });
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:110,
    approaches:[{key:'optimal',label:'HashMap + DLL O(1) per op'}],
    inputs:[{id:'cap',lbl:'Capacity',elem:(function(){var i=document.createElement('input');i.type='number';i.value=defCap;i.style.width='50px';return i;})()}],
    onInputs:function(vals){return buildSteps(parseInt(vals.cap)||defCap,defOps);},
    buildSteps:function(){return buildSteps(defCap,defOps);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var order=s.order||[],cache=s.cache||{},n=order.length;
      var cw=60,gap=10,sx=(W-(n*cw+(n-1)*gap))/2,sy=22,ch=44;
      if(!n){lbl(ctx,'Cache empty',W/2,H/2,'#6B7280',12,'center');return;}
      order.forEach(function(k,i){
        var x=sx+i*(cw+gap);
        cell(ctx,x,sy,cw,ch,k+':'+cache[k],i===n-1?'active':'sorted');
      });
      lbl(ctx,'LRU ← ['+(order.join(' → '))+'] → MRU',W/2,sy+ch+16,'#A78BFA',10,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P117 Combination Sum II ────────────────────────────── */
function initCombinationSumII(id){
  var container=document.getElementById(id);if(!container)return;
  var defCands=[10,1,2,7,6,1,5],defTarget=8;
  function buildSteps(cands,target){
    var steps=[],results=[],sorted=cands.slice().sort(function(a,b){return a-b;});
    steps.push({cands:sorted,cur:[],msg:'Sort first: '+sorted.join(',')+'. Skip duplicate siblings to avoid repeat combos.'});
    function bt(start,cur,rem){
      if(rem===0){results.push(cur.slice());steps.push({cands:sorted,cur:cur.slice(),msg:'Found: ['+cur.join(',')+'] ✓'});return;}
      for(var i=start;i<sorted.length;i++){
        if(sorted[i]>rem)break;
        if(i>start&&sorted[i]===sorted[i-1])continue;
        cur.push(sorted[i]);
        steps.push({cands:sorted,cur:cur.slice(),msg:'Try '+sorted[i]+': ['+cur.join(',')+'] rem='+(rem-sorted[i])});
        bt(i+1,cur,rem-sorted[i]);
        cur.pop();
      }
    }
    bt(0,[],target);
    steps.push({cands:sorted,cur:[],msg:results.length+' combinations found: '+results.map(function(r){return '['+r.join(',')+']';}).join(' ')});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:120,
    approaches:[{key:'optimal',label:'Backtracking O(2ⁿ)'}],
    inputs:[
      {id:'cands',lbl:'Candidates',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defCands.join(',');i.style.width='160px';return i;})()},
      {id:'target',lbl:'Target',elem:(function(){var i=document.createElement('input');i.type='number';i.value=defTarget;i.style.width='55px';return i;})()}
    ],
    onInputs:function(vals){var c=(vals.cands||'').split(',').map(Number).filter(function(x){return!isNaN(x);});return buildSteps(c.length?c:defCands.slice(),parseInt(vals.target)||defTarget);},
    buildSteps:function(){return buildSteps(defCands.slice(),defTarget);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var a=s.cands||[],n=a.length,cw=Math.min(50,Math.floor((W-40)/n)),ch=40,sx=(W-n*cw)/2,sy=14;
      var cur=s.cur||[];
      a.forEach(function(v,i){var inCur=cur.indexOf(v)>=0;cell(ctx,sx+i*cw,sy,cw-2,ch,v,inCur?'active':'default');});
      lbl(ctx,'Current: ['+cur.join(',')+']',W/2,sy+ch+18,'#A78BFA',11,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P118 N-Queens ───────────────────────────────────────── */
function initNQueens(id){
  var container=document.getElementById(id);if(!container)return;
  var defN=4;
  function buildSteps(n){
    var steps=[],results=[],cols=new Set(),diag1=new Set(),diag2=new Set(),board=[];
    steps.push({board:[],n:n,msg:'Place one queen per row. Track blocked columns and diagonals.'});
    function bt(row){
      if(row===n){results.push(board.slice());steps.push({board:board.slice(),n:n,msg:'Solution #'+results.length+': ['+board.join(',')+']'});return;}
      for(var c=0;c<n;c++){
        if(cols.has(c)||diag1.has(row-c)||diag2.has(row+c)){
          steps.push({board:board.slice(),n:n,col:c,row:row,blocked:true,msg:'Row '+row+' col '+c+' blocked — skip'});
          continue;
        }
        cols.add(c);diag1.add(row-c);diag2.add(row+c);board.push(c);
        steps.push({board:board.slice(),n:n,col:c,row:row,msg:'Place queen at row '+row+' col '+c});
        bt(row+1);
        board.pop();cols.delete(c);diag1.delete(row-c);diag2.delete(row+c);
      }
    }
    bt(0);
    steps.push({board:results[0]||[],n:n,msg:results.length+' solution(s) found for '+n+'-Queens'});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:180,
    approaches:[{key:'optimal',label:'Backtracking O(n!)'}],
    inputs:[{id:'n',lbl:'N',elem:(function(){var i=document.createElement('input');i.type='number';i.value=defN;i.min=1;i.max=8;i.style.width='50px';return i;})()}],
    onInputs:function(vals){return buildSteps(Math.min(8,Math.max(1,parseInt(vals.n)||defN)));},
    buildSteps:function(){return buildSteps(defN);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var n=s.n||4,board=s.board||[],cw=Math.min(36,Math.floor((W-40)/n)),sy=10,sx=(W-n*cw)/2;
      for(var r=0;r<n;r++){
        for(var c=0;c<n;c++){
          ctx.fillStyle=(r+c)%2===0?'#1F2937':'#111827';
          ctx.fillRect(sx+c*cw,sy+r*cw,cw,cw);
          if(board[r]===c){
            ctx.fillStyle='#A78BFA';
            ctx.font='bold '+(cw-4)+'px sans-serif';
            ctx.textAlign='center';
            ctx.fillText('♛',sx+c*cw+cw/2,sy+r*cw+cw-4);
          } else if(s.row===r&&s.col===c&&s.blocked){
            ctx.fillStyle='rgba(239,68,68,0.3)';ctx.fillRect(sx+c*cw,sy+r*cw,cw,cw);
          }
        }
      }
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P119 Last Stone Weight ──────────────────────────────── */
function initLastStoneWeight(id){
  var container=document.getElementById(id);if(!container)return;
  var defStones=[2,7,4,1,8,1];
  function buildSteps(stones){
    var steps=[],heap=stones.slice().sort(function(a,b){return b-a;});
    steps.push({heap:heap.slice(),msg:'Max-heap: always smash the two heaviest stones'});
    while(heap.length>1){
      heap.sort(function(a,b){return b-a;});
      var y=heap[0],x=heap[1];
      heap.splice(0,2);
      if(x===y){steps.push({heap:heap.slice(),msg:'Smash '+y+' and '+x+' → both destroyed. Heap: ['+heap.join(',')+']'});}
      else{heap.push(y-x);heap.sort(function(a,b){return b-a;});steps.push({heap:heap.slice(),msg:'Smash '+y+' and '+x+' → '+y+'-'+x+'='+(y-x)+' remains. Heap: ['+heap.join(',')+']'});}
    }
    steps.push({heap:heap.slice(),msg:'Last stone: '+(heap.length?heap[0]:0)});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:120,
    approaches:[{key:'optimal',label:'Max Heap O(n log n)'}],
    inputs:[{id:'stones',lbl:'Stones',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defStones.join(',');i.style.width='150px';return i;})()}],
    onInputs:function(vals){var s=(vals.stones||'').split(',').map(Number).filter(function(x){return!isNaN(x)&&x>0;});return buildSteps(s.length?s:defStones.slice());},
    buildSteps:function(){return buildSteps(defStones.slice());},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var heap=s.heap||[],n=heap.length,maxV=Math.max.apply(null,heap.concat([1]));
      var bw=36,gap=10,sx=(W-(n*(bw+gap)))/2,sy=10;
      heap.forEach(function(v,i){
        var bh=Math.round(v/maxV*(H-45));
        ctx.fillStyle=i===0?CS.active:i===1?CS.comparing:CS.default;
        ctx.fillRect(sx+i*(bw+gap),H-35-bh,bw,bh);
        lbl(ctx,v,sx+i*(bw+gap)+bw/2,H-35-bh-5,'#E5E7EB',11,'center');
      });
      lbl(ctx,heap.length<=1?'Result: '+(heap[0]||0):'Heap: ['+heap.join(',')+']',W/2,H-10,'#A78BFA',11,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P120 Sliding Window Maximum ─────────────────────────── */
function initSlidingWindowMax(id){
  var container=document.getElementById(id);if(!container)return;
  var defNums=[1,3,-1,-3,5,3,6,7],defK=3;
  function buildSteps(nums,k){
    var steps=[],n=nums.length,res=[],deque=[];
    steps.push({nums:nums,L:0,R:0,deque:[],res:[],msg:'Monotonic deque: maintain indices of useful elements (decreasing values)'});
    for(var R=0;R<n;R++){
      while(deque.length&&nums[deque[deque.length-1]]<=nums[R])deque.pop();
      deque.push(R);
      if(deque[0]<R-k+1)deque.shift();
      if(R>=k-1){var L=R-k+1;res.push(nums[deque[0]]);steps.push({nums:nums,L:L,R:R,deque:deque.slice(),res:res.slice(),msg:'Window ['+nums.slice(L,R+1).join(',')+'] max='+nums[deque[0]]});}
      else{steps.push({nums:nums,L:0,R:R,deque:deque.slice(),res:res.slice(),msg:'Building first window… deque: ['+deque.map(function(i){return nums[i];}).join(',')+']'});}
    }
    steps.push({nums:nums,L:0,R:n-1,deque:[],res:res.slice(),msg:'Result: ['+res.join(',')+']'});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:140,
    approaches:[{key:'optimal',label:'Monotonic Deque O(n)'}],
    inputs:[
      {id:'nums',lbl:'Array',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defNums.join(',');i.style.width='160px';return i;})()},
      {id:'k',lbl:'k',elem:(function(){var i=document.createElement('input');i.type='number';i.value=defK;i.style.width='50px';return i;})()}
    ],
    onInputs:function(vals){var n=(vals.nums||'').split(',').map(Number).filter(function(x){return!isNaN(x);});return buildSteps(n.length?n:defNums.slice(),parseInt(vals.k)||defK);},
    buildSteps:function(){return buildSteps(defNums.slice(),defK);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var a=s.nums,n=a.length,cw=Math.min(52,Math.floor((W-40)/n)),ch=36,sx=(W-n*cw)/2,sy=12;
      for(var i=0;i<n;i++){
        var inWin=s.L!==undefined&&i>=s.L&&i<=s.R;
        var isMax=s.deque&&s.deque[0]===i;
        cell(ctx,sx+i*cw,sy,cw-2,ch,a[i],isMax?'found':inWin?'active':'default');
      }
      var res=s.res||[];
      if(res.length){
        lbl(ctx,'Output so far: ['+res.join(',')+']',W/2,sy+ch+14,'#34D399',11,'center');
      }
      lbl(ctx,'Deque (vals): ['+((s.deque||[]).map(function(i){return a[i];})).join(',')+']',W/2,sy+ch+30,'#A78BFA',10,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P121 K Closest Points to Origin ────────────────────── */
function initKClosestPoints(id){
  var container=document.getElementById(id);if(!container)return;
  var defPoints=[[1,3],[-2,2],[3,1],[0,2]],defK=2;
  function dist2(p){return p[0]*p[0]+p[1]*p[1];}
  function buildSteps(points,k){
    var steps=[],sorted=points.slice().sort(function(a,b){return dist2(a)-dist2(b);});
    steps.push({points:points,chosen:[],msg:'Sort all points by distance² = x²+y². Take first k.'});
    sorted.forEach(function(p,i){
      steps.push({points:points,sorted:sorted.slice(0,i+1),chosen:sorted.slice(0,Math.min(i+1,k)),msg:'Point ['+p+'] dist²='+(dist2(p)).toFixed(0)+(i<k?' ← in top k':'')});
    });
    steps.push({points:points,chosen:sorted.slice(0,k),msg:'K='+k+' closest: '+sorted.slice(0,k).map(function(p){return '['+p+']';}).join(', ')});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:200,
    approaches:[{key:'optimal',label:'Sort O(n log n)'}],
    inputs:[
      {id:'points',lbl:'Points [[x,y],…]',elem:(function(){var i=document.createElement('input');i.type='text';i.value='[1,3],[-2,2],[3,1],[0,2]';i.style.width='200px';return i;})()},
      {id:'k',lbl:'k',elem:(function(){var i=document.createElement('input');i.type='number';i.value=defK;i.style.width='50px';return i;})()}
    ],
    onInputs:function(vals){
      try{var p=JSON.parse('['+vals.points+']');}catch(e){var p=defPoints;}
      return buildSteps(p,parseInt(vals.k)||defK);
    },
    buildSteps:function(){return buildSteps(defPoints,defK);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var cx=W/2,cy=H/2,scale=28;
      // axes
      ctx.strokeStyle='#374151';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(20,cy);ctx.lineTo(W-20,cy);ctx.stroke();
      ctx.beginPath();ctx.moveTo(cx,10);ctx.lineTo(cx,H-10);ctx.stroke();
      // origin
      ctx.fillStyle='#6B7280';ctx.beginPath();ctx.arc(cx,cy,3,0,Math.PI*2);ctx.fill();
      var chosen=s.chosen||[];
      (s.points||defPoints).forEach(function(p){
        var px=cx+p[0]*scale,py=cy-p[1]*scale;
        var isCh=chosen.some(function(c){return c[0]===p[0]&&c[1]===p[1];});
        ctx.fillStyle=isCh?CS.found:CS.default;
        ctx.beginPath();ctx.arc(px,py,6,0,Math.PI*2);ctx.fill();
        lbl(ctx,'['+p+']',px+8,py-4,'#9CA3AF',9,'left');
      });
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P122 Time Based Key-Value Store ─────────────────────── */
function initTimeBasedKV(id){
  var container=document.getElementById(id);if(!container)return;
  var defOps=[['set','foo','bar',1],['set','foo','bar2',4],['get','foo',1],['get','foo',3],['get','foo',4],['get','foo',5]];
  function buildSteps(ops){
    var steps=[],store={};
    steps.push({store:{},msg:'HashMap key→[(timestamp,value)…]. get: binary search for largest ts ≤ query.'});
    ops.forEach(function(op){
      if(op[0]==='set'){
        if(!store[op[1]])store[op[1]]=[];
        store[op[1]].push([op[3],op[2]]);
        steps.push({store:JSON.parse(JSON.stringify(store)),op:op,msg:'set("'+op[1]+'","'+op[2]+'",t='+op[3]+') → stored'});
      } else {
        var key=op[1],ts=op[2],arr=store[key]||[],res='';
        var lo=0,hi=arr.length-1;
        while(lo<=hi){var mid=Math.floor((lo+hi)/2);if(arr[mid][0]<=ts){res=arr[mid][1];lo=mid+1;}else hi=mid-1;}
        steps.push({store:JSON.parse(JSON.stringify(store)),op:op,res:res||'""',msg:'get("'+key+'",t='+ts+') → binary search → "'+res+'"'});
      }
    });
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:160,
    approaches:[{key:'optimal',label:'Binary Search O(log n) per get'}],
    inputs:[],
    buildSteps:function(){return buildSteps(defOps);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var store=s.store||{},y=14;
      Object.entries(store).forEach(function(e){
        lbl(ctx,'"'+e[0]+'": '+e[1].map(function(x){return 't='+x[0]+':'+x[1];}).join(' | '),12,y,'#E5E7EB',11,'left');
        y+=20;
      });
      if(s.op){
        var color=s.op[0]==='get'?'#34D399':'#A78BFA';
        lbl(ctx,(s.op[0]==='get'?'get("'+s.op[1]+'",t='+s.op[2]+') → '+(s.res||'""'):'set("'+s.op[1]+'","'+s.op[2]+'",t='+s.op[3]+')'),W/2,H-12,color,12,'center');
      }
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P123 Cheapest Flights Within K Stops ────────────────── */
function initCheapestFlights(id){
  var container=document.getElementById(id);if(!container)return;
  var defN=4,defFlights=[[0,1,100],[1,2,100],[2,0,100],[1,3,600],[2,3,200]],defSrc=0,defDst=3,defK=1;
  function buildSteps(n,flights,src,dst,k){
    var steps=[],INF=1e9;
    var prices=new Array(n).fill(INF);prices[src]=0;
    steps.push({prices:prices.slice(),round:0,msg:'Bellman-Ford: '+( k+1)+' relaxation rounds (k+1 stops = k+1 edges)'});
    for(var i=0;i<=k;i++){
      var tmp=prices.slice();
      flights.forEach(function(f){
        if(prices[f[0]]<INF&&prices[f[0]]+f[2]<tmp[f[1]]){
          tmp[f[1]]=prices[f[0]]+f[2];
          steps.push({prices:tmp.slice(),round:i+1,msg:'Round '+(i+1)+': '+f[0]+'→'+f[1]+' cost='+(prices[f[0]]+f[2])+' improves dist['+f[1]+']'});
        }
      });
      prices=tmp;
    }
    steps.push({prices:prices.slice(),msg:'Cheapest to reach '+dst+': '+(prices[dst]<INF?prices[dst]:-1)});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:130,
    approaches:[{key:'optimal',label:'Bellman-Ford O((k+1)·E)'}],
    inputs:[
      {id:'src',lbl:'src',elem:(function(){var i=document.createElement('input');i.type='number';i.value=defSrc;i.style.width='40px';return i;})()},
      {id:'dst',lbl:'dst',elem:(function(){var i=document.createElement('input');i.type='number';i.value=defDst;i.style.width='40px';return i;})()},
      {id:'k',lbl:'k stops',elem:(function(){var i=document.createElement('input');i.type='number';i.value=defK;i.style.width='40px';return i;})()}
    ],
    onInputs:function(vals){return buildSteps(defN,defFlights,parseInt(vals.src)||defSrc,parseInt(vals.dst)||defDst,parseInt(vals.k)||defK);},
    buildSteps:function(){return buildSteps(defN,defFlights,defSrc,defDst,defK);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var prices=s.prices||[],n=prices.length,INF=1e9;
      var cw=Math.min(80,Math.floor((W-40)/n)),ch=44,sx=(W-n*cw)/2,sy=24;
      prices.forEach(function(v,i){
        cell(ctx,sx+i*cw,sy,cw-4,ch,v>=INF?'∞':v,v>=INF?'default':i===defDst?'found':'sorted');
        lbl(ctx,'node '+i,sx+i*cw+cw/2-2,sy+ch+14,'#6B7280',10,'center');
      });
      lbl(ctx,'Round '+s.round+' of '+(defK+1),W/2,sy+ch+28,'#A78BFA',11,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P124 Alien Dictionary ───────────────────────────────── */
function initAlienDictionary(id){
  var container=document.getElementById(id);if(!container)return;
  var defWords=['wrt','wrf','er','ett','rftt'];
  function buildSteps(words){
    var steps=[],edges={},indegree={},chars=new Set();
    words.forEach(function(w){for(var c of w){chars.add(c);}});
    chars.forEach(function(c){edges[c]=[];indegree[c]=0;});
    steps.push({order:[],msg:'Compare adjacent words to extract character ordering rules'});
    for(var i=0;i<words.length-1;i++){
      var a=words[i],b=words[i+1],len=Math.min(a.length,b.length),found=false;
      for(var j=0;j<len;j++){
        if(a[j]!==b[j]){
          edges[a[j]].push(b[j]);indegree[b[j]]++;found=true;
          steps.push({order:[],msg:'"'+a+'" vs "'+b+'": first diff → '+a[j]+' comes before '+b[j]});break;
        }
      }
      if(!found&&a.length>b.length)steps.push({order:[],msg:'"'+a+'" is prefix of "'+b+'" but longer → invalid'});
    }
    // BFS topo sort
    var queue=[];chars.forEach(function(c){if(indegree[c]===0)queue.push(c);});
    var order=[];
    steps.push({order:[],msg:'BFS topological sort on character graph'});
    while(queue.length){
      queue.sort();var c=queue.shift();order.push(c);
      steps.push({order:order.slice(),msg:'Process "'+c+'" → order so far: ['+order.join(',')+']'});
      (edges[c]||[]).forEach(function(nb){if(--indegree[nb]===0)queue.push(nb);});
    }
    var result=order.length===chars.size?order.join(''):'invalid (cycle detected)';
    steps.push({order:order.slice(),msg:'Alien alphabet order: "'+result+'"'});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:130,
    approaches:[{key:'optimal',label:'Topo Sort O(C) C=unique chars'}],
    inputs:[{id:'words',lbl:'Words',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defWords.join(',');i.style.width='180px';return i;})()}],
    onInputs:function(vals){var w=(vals.words||'').split(',').map(function(x){return x.trim();}).filter(Boolean);return buildSteps(w.length?w:defWords.slice());},
    buildSteps:function(){return buildSteps(defWords.slice());},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var order=s.order||[],n=order.length;
      defWords.forEach(function(w,i){lbl(ctx,'"'+w+'"',12,18+i*20,'#6B7280',11,'left');});
      if(n){
        var cw=36,sx=(W-n*cw)/2-60,sy=30;
        order.forEach(function(c,i){cell(ctx,sx+(W/2-n*cw/2)+i*cw,sy,cw-2,34,c,'sorted');});
        lbl(ctx,'Order: '+order.join(' → '),W/2,sy+46,'#A78BFA',11,'center');
      }
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P125 Hand of Straights ──────────────────────────────── */
function initHandOfStraights(id){
  var container=document.getElementById(id);if(!container)return;
  var defHand=[1,2,3,6,2,3,4,7,8],defW=3;
  function buildSteps(hand,w){
    var steps=[],cnt={};
    hand.forEach(function(c){cnt[c]=(cnt[c]||0)+1;});
    var keys=Object.keys(cnt).map(Number).sort(function(a,b){return a-b;});
    steps.push({cnt:JSON.parse(JSON.stringify(cnt)),msg:'Count each card. Process smallest card first — it must start a group.'});
    var ok=true;
    for(var i=0;i<keys.length;i++){
      var start=keys[i];
      if(!cnt[start])continue;
      var need=cnt[start];
      steps.push({cnt:JSON.parse(JSON.stringify(cnt)),msg:'Smallest available: '+start+' (count='+need+'). Form '+need+' group(s) of '+w+' starting here.'});
      for(var j=0;j<w;j++){
        if(!cnt[start+j]){ok=false;steps.push({cnt:{},msg:'Missing '+(start+j)+' — cannot form group → false'});return steps;}
        cnt[start+j]-=need;
        steps.push({cnt:JSON.parse(JSON.stringify(cnt)),msg:'Use '+need+' of card '+(start+j)});
      }
    }
    steps.push({cnt:{},msg:ok?'All cards grouped successfully → true ✓':'Cannot group → false ✗'});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:110,
    approaches:[{key:'optimal',label:'Greedy + Sorted Map O(n log n)'}],
    inputs:[
      {id:'hand',lbl:'Hand',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defHand.join(',');i.style.width='160px';return i;})()},
      {id:'w',lbl:'Group size',elem:(function(){var i=document.createElement('input');i.type='number';i.value=defW;i.style.width='50px';return i;})()}
    ],
    onInputs:function(vals){var h=(vals.hand||'').split(',').map(Number).filter(function(x){return!isNaN(x);});return buildSteps(h.length?h:defHand.slice(),parseInt(vals.w)||defW);},
    buildSteps:function(){return buildSteps(defHand.slice(),defW);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var cnt=s.cnt||{},entries=Object.entries(cnt).filter(function(e){return e[1]>0;}).sort(function(a,b){return a[0]-b[0];});
      var n=entries.length,cw=Math.min(56,Math.floor((W-40)/Math.max(n,1))),sx=(W-n*cw)/2,sy=22,ch=42;
      entries.forEach(function(e,i){cell(ctx,sx+i*cw,sy,cw-2,ch,e[0]+':'+e[1],'sorted');});
      if(!n)lbl(ctx,'All cards used!',W/2,H/2,'#34D399',13,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P126 Partition Labels ───────────────────────────────── */
function initPartitionLabels(id){
  var container=document.getElementById(id);if(!container)return;
  var defS='ababcbacadefegdehijhklij';
  function buildSteps(s){
    var steps=[],n=s.length,last={};
    for(var i=0;i<n;i++)last[s[i]]=i;
    steps.push({s:s,parts:[],start:0,end:0,msg:'Record last occurrence of each character first'});
    var parts=[],start=0,end=0;
    for(var i=0;i<n;i++){
      end=Math.max(end,last[s[i]]);
      steps.push({s:s,parts:parts.slice(),start:start,end:end,cur:i,msg:'Char "'+s[i]+'" last at '+last[s[i]]+' → partition end='+end});
      if(i===end){
        parts.push(end-start+1);
        steps.push({s:s,parts:parts.slice(),start:start,end:end,msg:'Partition ['+start+'..'+end+'] size '+(end-start+1)+' complete'});
        start=i+1;
      }
    }
    steps.push({s:s,parts:parts.slice(),msg:'Partitions: ['+parts.join(',')+']'});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:120,
    approaches:[{key:'optimal',label:'Greedy O(n)'}],
    inputs:[{id:'s',lbl:'String',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defS;i.style.width='200px';return i;})()}],
    onInputs:function(vals){return buildSteps(vals.s||defS);},
    buildSteps:function(){return buildSteps(defS);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var str=s.s||'',n=str.length,cw=Math.max(8,Math.min(20,Math.floor((W-20)/n))),sy=14,ch=32,sx=10;
      for(var i=0;i<n&&sx+(i+1)*cw<W-10;i++){
        var inPart=s.start!==undefined&&i>=s.start&&i<=s.end;
        var isCur=i===s.cur;
        cell(ctx,sx+i*cw,sy,cw-1,ch,str[i],isCur?'active':inPart?'comparing':'default');
      }
      lbl(ctx,'Partitions: ['+((s.parts||[]).join(','))+']',W/2,sy+ch+16,'#A78BFA',11,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P127 Valid Parenthesis String ───────────────────────── */
function initValidParenString(id){
  var container=document.getElementById(id);if(!container)return;
  var defS='(*))';
  function buildSteps(s){
    var steps=[],lo=0,hi=0;
    steps.push({s:s,lo:0,hi:0,cur:-1,msg:'Track [lo, hi]: min and max possible open count. "*" expands range.'});
    for(var i=0;i<s.length;i++){
      var c=s[i];
      if(c==='('){lo++;hi++;}
      else if(c===')'){lo=Math.max(0,lo-1);hi--;}
      else{lo=Math.max(0,lo-1);hi++;}
      steps.push({s:s,lo:lo,hi:hi,cur:i,msg:'"'+c+'" → lo='+lo+' hi='+hi+(hi<0?' → invalid!':'')});
      if(hi<0){steps.push({s:s,lo:lo,hi:hi,msg:'hi<0: too many ")" → false ✗'});return steps;}
    }
    steps.push({s:s,lo:lo,hi:hi,msg:lo===0?'lo=0 → valid ✓':'lo='+lo+' > 0 → unmatched "(" → false ✗'});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:110,
    approaches:[{key:'optimal',label:'Greedy Range O(n)'}],
    inputs:[{id:'s',lbl:'String',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defS;i.style.width='120px';return i;})()}],
    onInputs:function(vals){return buildSteps(vals.s||defS);},
    buildSteps:function(){return buildSteps(defS);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var str=s.s||'',n=str.length,cw=Math.min(52,Math.floor((W-40)/n)),ch=40,sx=(W-n*cw)/2,sy=16;
      for(var i=0;i<n;i++)cell(ctx,sx+i*cw,sy,cw-2,ch,str[i],i===s.cur?'active':i<s.cur?'sorted':'default');
      lbl(ctx,'lo='+s.lo+'  hi='+s.hi,W/2,sy+ch+18,'#A78BFA',12,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P128 Merge Triplets to Form Target ─────────────────── */
function initMergeTriplets(id){
  var container=document.getElementById(id);if(!container)return;
  var defTriplets=[[2,5,3],[1,8,4],[1,7,5]],defTarget=[2,7,5];
  function buildSteps(triplets,target){
    var steps=[],merged=[0,0,0];
    steps.push({triplets:triplets,merged:[0,0,0],target:target,msg:'Only merge triplets where no value exceeds target. Then check merged == target.'});
    triplets.forEach(function(t,i){
      var valid=t[0]<=target[0]&&t[1]<=target[1]&&t[2]<=target[2];
      if(valid){
        merged=[Math.max(merged[0],t[0]),Math.max(merged[1],t[1]),Math.max(merged[2],t[2])];
        steps.push({triplets:triplets,merged:merged.slice(),target:target,cur:i,msg:'Merge ['+t+'] (valid) → merged=['+merged+']'});
      } else {
        steps.push({triplets:triplets,merged:merged.slice(),target:target,cur:i,msg:'Skip ['+t+'] — exceeds target in some position'});
      }
    });
    var ok=merged[0]===target[0]&&merged[1]===target[1]&&merged[2]===target[2];
    steps.push({triplets:triplets,merged:merged.slice(),target:target,msg:ok?'merged=target → true ✓':'merged≠target → false ✗'});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:150,
    approaches:[{key:'optimal',label:'Greedy O(n)'}],
    inputs:[
      {id:'triplets',lbl:'Triplets [[a,b,c],…]',elem:(function(){var i=document.createElement('input');i.type='text';i.value='[2,5,3],[1,8,4],[1,7,5]';i.style.width='200px';return i;})()},
      {id:'target',lbl:'Target [a,b,c]',elem:(function(){var i=document.createElement('input');i.type='text';i.value='2,7,5';i.style.width='90px';return i;})()}
    ],
    onInputs:function(vals){
      try{var t=JSON.parse('['+vals.triplets+']');}catch(e){var t=defTriplets;}
      var tgt=(vals.target||'').split(',').map(Number);
      return buildSteps(t,tgt.length===3?tgt:defTarget);
    },
    buildSteps:function(){return buildSteps(defTriplets,defTarget);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var trips=s.triplets||[],n=trips.length,rowH=22,sx=12,sy=10;
      trips.forEach(function(t,i){
        var valid=t[0]<=(s.target||defTarget)[0]&&t[1]<=(s.target||defTarget)[1]&&t[2]<=(s.target||defTarget)[2];
        lbl(ctx,'['+t+']',sx,sy+i*rowH,i===s.cur?(valid?'#34D399':'#EF4444'):'#6B7280',11,'left');
      });
      lbl(ctx,'merged: ['+((s.merged||[]).join(','))+']',W/2,sy+n*rowH+4,'#A78BFA',12,'center');
      lbl(ctx,'target: ['+((s.target||defTarget).join(','))+']',W/2,sy+n*rowH+20,'#F59E0B',11,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P129 Meeting Rooms II ───────────────────────────────── */
function initMeetingRoomsII(id){
  var container=document.getElementById(id);if(!container)return;
  var defIntervals=[[0,30],[5,10],[15,20]];
  function buildSteps(intervals){
    var steps=[],sorted=intervals.slice().sort(function(a,b){return a[0]-b[0];});
    steps.push({intervals:intervals,rooms:[],msg:'Sort by start. Use min-heap to track earliest ending room.'});
    var heap=[],rooms=0;
    sorted.forEach(function(iv){
      heap.sort(function(a,b){return a-b;});
      if(heap.length&&heap[0]<=iv[0]){heap.shift();heap.push(iv[1]);}
      else{heap.push(iv[1]);rooms=Math.max(rooms,heap.length);}
      steps.push({intervals:intervals,heap:heap.slice().sort(function(a,b){return a-b;}),rooms:rooms,cur:iv,msg:'Meeting ['+iv+']: heap='+JSON.stringify(heap.slice().sort(function(a,b){return a-b;}))+' rooms needed='+rooms});
    });
    steps.push({intervals:intervals,heap:[],rooms:rooms,msg:'Minimum rooms needed: '+rooms});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:150,
    approaches:[{key:'optimal',label:'Min-Heap O(n log n)'}],
    inputs:[{id:'ivs',lbl:'Intervals [[s,e],…]',elem:(function(){var i=document.createElement('input');i.type='text';i.value='[0,30],[5,10],[15,20]';i.style.width='200px';return i;})()}],
    onInputs:function(vals){try{var a=JSON.parse('['+vals.ivs+']');return buildSteps(a);}catch(e){return buildSteps(defIntervals);}},
    buildSteps:function(){return buildSteps(defIntervals);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var ivs=s.intervals||[],n=ivs.length,maxT=Math.max.apply(null,ivs.map(function(i){return i[1];}));
      var scale=(W-80)/maxT,sy=12,rowH=Math.min(26,(H-40)/n);
      ivs.forEach(function(iv,i){
        var x=40+iv[0]*scale,w=(iv[1]-iv[0])*scale,y=sy+i*rowH;
        var isCur=s.cur&&s.cur[0]===iv[0]&&s.cur[1]===iv[1];
        ctx.fillStyle=isCur?CS.active:CS.sorted;
        ctx.fillRect(x,y,Math.max(w,2),rowH-3);
        lbl(ctx,iv[0],x-3,y+rowH-5,'#6B7280',8,'right');
        lbl(ctx,iv[1],x+w+2,y+rowH-5,'#6B7280',8,'left');
      });
      lbl(ctx,'Rooms: '+s.rooms,W-50,H-10,'#A78BFA',13,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P130 Pow(x, n) ──────────────────────────────────────── */
function initPowXN(id){
  var container=document.getElementById(id);if(!container)return;
  var defX=2.0,defN=10;
  function buildSteps(x,n){
    var steps=[],neg=n<0,absN=Math.abs(n),base=x,result=1;
    steps.push({base:base,result:1,n:absN,msg:'Fast exponentiation: halve the exponent each step — O(log n)'+(neg?' (negative: compute positive then invert)':'')});
    var b=base,e=absN,r=1;
    while(e>0){
      if(e%2===1){r*=b;steps.push({base:b,result:r,n:e,msg:'Exponent odd → multiply result by base: result='+r.toFixed(4)});}
      b*=b;e=Math.floor(e/2);
      if(e>0)steps.push({base:b,result:r,n:e,msg:'Square base: base='+b.toFixed(4)+'  remaining exp='+e});
    }
    if(neg)r=1/r;
    steps.push({base:b,result:r,n:0,msg:(neg?'Invert for negative n: ':'')+'Final: '+x+'^'+n+' = '+r.toFixed(5)});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:110,
    approaches:[{key:'optimal',label:'Fast Exponentiation O(log n)'}],
    inputs:[
      {id:'x',lbl:'x',elem:(function(){var i=document.createElement('input');i.type='number';i.value=defX;i.step='0.1';i.style.width='60px';return i;})()},
      {id:'n',lbl:'n',elem:(function(){var i=document.createElement('input');i.type='number';i.value=defN;i.style.width='60px';return i;})()}
    ],
    onInputs:function(vals){return buildSteps(parseFloat(vals.x)||defX,parseInt(vals.n)||defN);},
    buildSteps:function(){return buildSteps(defX,defN);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var cw=120,gap=20,sx=(W-3*(cw+gap))/2,sy=22,ch=44;
      cell(ctx,sx,sy,cw,ch,'base: '+(s.base||0).toFixed(3),'comparing');
      cell(ctx,sx+cw+gap,sy,cw,ch,'exp: '+s.n,'active');
      cell(ctx,sx+2*(cw+gap),sy,cw,ch,'result: '+(s.result||0).toFixed(3),'sorted');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P131 Word Search II ─────────────────────────────────── */
function initWordSearchII(id){
  var container=document.getElementById(id);if(!container)return;
  var defBoard=[['o','a','a','n'],['e','t','a','e'],['i','h','k','r'],['i','f','l','v']],defWords=['oath','pea','eat','rain'];
  function buildSteps(board,words){
    var steps=[],found=new Set(),rows=board.length,cols=board[0].length;
    // build trie
    var trie={};
    words.forEach(function(w){var n=trie;for(var c of w){if(!n[c])n[c]={};n=n[c];}n['#']=w;});
    steps.push({board:board.map(function(r){return r.slice();}),hl:{},found:[],msg:'Build trie of all words. DFS from each cell.'});
    function dfs(r,c,node,path){
      if(r<0||r>=rows||c<0||c>=cols||board[r][c]==='#')return;
      var ch=board[r][c];
      if(!node[ch])return;
      var next=node[ch];
      if(next['#']&&!found.has(next['#'])){found.add(next['#']);steps.push({board:board.map(function(r){return r.slice();}),hl:{[r+','+c]:'found'},found:Array.from(found),msg:'Found word: "'+next['#']+'" at ('+r+','+c+')'});}
      board[r][c]='#';
      steps.push({board:board.map(function(r){return r.slice();}),hl:{[r+','+c]:'active'},found:Array.from(found),msg:'Visit ('+r+','+c+') "'+ch+'" path='+path+ch});
      [[1,0],[-1,0],[0,1],[0,-1]].forEach(function(d){dfs(r+d[0],c+d[1],next,path+ch);});
      board[r][c]=ch;
    }
    for(var r=0;r<rows;r++)for(var c=0;c<cols;c++)dfs(r,c,trie,'');
    steps.push({board:board.map(function(r){return r.slice();}),hl:{},found:Array.from(found),msg:'Done. Found: ['+Array.from(found).join(', ')+']'});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:190,
    approaches:[{key:'optimal',label:'Trie + DFS O(M·4·3^(L-1))'}],
    inputs:[{id:'words',lbl:'Words',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defWords.join(',');i.style.width='180px';return i;})()}],
    onInputs:function(vals){var w=(vals.words||'').split(',').map(function(x){return x.trim();}).filter(Boolean);return buildSteps(defBoard.map(function(r){return r.slice();}),w.length?w:defWords.slice());},
    buildSteps:function(){return buildSteps(defBoard.map(function(r){return r.slice();}),defWords.slice());},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var board=s.board||defBoard,rows=board.length,cols=board[0].length;
      var cw=Math.min(44,Math.floor((W-40)/cols)),ch=Math.min(34,Math.floor((H-50)/rows)),sx=(W-cols*cw)/2,sy=8;
      for(var r=0;r<rows;r++)for(var c=0;c<cols;c++){
        var k=r+','+c,st=s.hl&&s.hl[k]?s.hl[k]:(board[r][c]==='#'?'comparing':'default');
        cell(ctx,sx+c*cw,sy+r*ch,cw-2,ch-2,board[r][c]==='#'?'·':board[r][c],st);
      }
      lbl(ctx,'Found: '+(s.found||[]).join(', '),W/2,sy+rows*ch+16,'#34D399',11,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P132 Reconstruct Itinerary ──────────────────────────── */
function initReconstructItinerary(id){
  var container=document.getElementById(id);if(!container)return;
  var defTickets=[['MUC','LHR'],['JFK','MUC'],['SFO','SJC'],['LHR','SFO']];
  function buildSteps(tickets){
    var steps=[],graph={};
    tickets.forEach(function(t){if(!graph[t[0]])graph[t[0]]=[];graph[t[0]].push(t[1]);});
    Object.keys(graph).forEach(function(k){graph[k].sort().reverse();});
    steps.push({path:[],graph:JSON.parse(JSON.stringify(graph)),msg:'Sort destinations reverse-lex so popping gives lex order. Hierholzer DFS.'});
    var path=[];
    function dfs(airport){
      steps.push({path:path.slice(),graph:JSON.parse(JSON.stringify(graph)),cur:airport,msg:'Visit '+airport+(graph[airport]&&graph[airport].length?' → next: '+graph[airport][graph[airport].length-1]:'(dead end, add to result)')});
      while(graph[airport]&&graph[airport].length){var next=graph[airport].pop();dfs(next);}
      path.unshift(airport);
      steps.push({path:path.slice(),graph:JSON.parse(JSON.stringify(graph)),cur:airport,msg:'Backtrack: prepend '+airport+' → path: ['+path.join('→')+']'});
    }
    dfs('JFK');
    steps.push({path:path.slice(),graph:{},msg:'Itinerary: '+path.join(' → ')});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:120,
    approaches:[{key:'optimal',label:'Hierholzer DFS O(E log E)'}],
    inputs:[{id:'tickets',lbl:'Tickets [[from,to],…]',elem:(function(){var i=document.createElement('input');i.type='text';i.value='[JFK,MUC],[MUC,LHR],[LHR,SFO],[SFO,SJC]';i.style.width='230px';return i;})()}],
    onInputs:function(vals){
      try{var t=(vals.tickets||'').split('],[').map(function(p){return p.replace(/[\[\]]/g,'').split(',');});return buildSteps(t);}catch(e){return buildSteps(defTickets);}
    },
    buildSteps:function(){return buildSteps(defTickets);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var path=s.path||[],n=path.length,cw=Math.min(68,Math.floor((W-40)/Math.max(n,1))),ch=40,sx=(W-n*cw)/2,sy=22;
      path.forEach(function(ap,i){cell(ctx,sx+i*cw,sy,cw-2,ch,ap,i===0?'found':'sorted');if(i<n-1)lbl(ctx,'→',sx+(i+0.5)*cw+cw/2-4,sy+ch/2+4,'#6B7280',12,'left');});
      if(s.cur&&!path.includes(s.cur))lbl(ctx,'visiting: '+s.cur,W/2,sy+ch+16,'#F59E0B',11,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P133 Sort Colors ────────────────────────────────────── */
function initSortColors(id){
  var container=document.getElementById(id);if(!container)return;
  var defNums=[2,0,2,1,1,0];
  function buildSteps(nums,approach){
    var steps=[],a=nums.slice();
    if(approach==='brute'){
      steps.push({arr:a.slice(),lo:-1,mid:-1,hi:-1,msg:'Count 0s, 1s, 2s then overwrite — O(n) two-pass'});
      var c=[0,0,0];a.forEach(function(v){c[v]++;});
      steps.push({arr:a.slice(),lo:-1,mid:-1,hi:-1,msg:'Counts: 0→'+c[0]+' 1→'+c[1]+' 2→'+c[2]});
      var idx=0;
      for(var v=0;v<3;v++)for(var j=0;j<c[v];j++){a[idx++]=v;steps.push({arr:a.slice(),lo:-1,mid:-1,hi:-1,msg:'Fill '+v+'s'});}
      steps.push({arr:a.slice(),lo:-1,mid:-1,hi:-1,msg:'Sorted: ['+a.join(',')+']'});
    } else {
      var lo=0,mid=0,hi=a.length-1;
      steps.push({arr:a.slice(),lo:lo,mid:mid,hi:hi,msg:'Dutch National Flag: lo=0 mid=0 hi='+(a.length-1)});
      while(mid<=hi){
        if(a[mid]===0){var t=a[lo];a[lo]=a[mid];a[mid]=t;lo++;mid++;steps.push({arr:a.slice(),lo:lo,mid:mid,hi:hi,msg:'0 at mid → swap with lo, advance lo+mid'});}
        else if(a[mid]===1){mid++;steps.push({arr:a.slice(),lo:lo,mid:mid,hi:hi,msg:'1 at mid → skip, advance mid'});}
        else{var t=a[hi];a[hi]=a[mid];a[mid]=t;hi--;steps.push({arr:a.slice(),lo:lo,mid:mid,hi:hi,msg:'2 at mid → swap with hi, shrink hi'});}
      }
      steps.push({arr:a.slice(),lo:lo,mid:mid,hi:hi,msg:'Sorted in one pass: ['+a.join(',')+']'});
    }
    return steps;
  }
  var colors=['#EF4444','#E5E7EB','#3B82F6'];// red=0, white=1, blue=2
  makeProbUI(container,{canvasW:560,canvasH:110,
    approaches:[{key:'brute',label:'Count O(n) 2-pass'},{key:'optimal',label:'Dutch Flag O(n) 1-pass'}],
    inputs:[{id:'nums',lbl:'Array (0,1,2)',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defNums.join(',');i.style.width='140px';return i;})()}],
    onInputs:function(vals,ap){var n=(vals.nums||'').split(',').map(Number).filter(function(x){return x>=0&&x<=2;});return buildSteps(n.length?n:defNums.slice(),ap);},
    buildSteps:function(ap){return buildSteps(defNums.slice(),ap);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var a=s.arr,n=a.length,cw=Math.min(58,Math.floor((W-40)/n)),ch=44,sx=(W-n*cw)/2,sy=18;
      a.forEach(function(v,i){
        var st=i===s.lo?'active':i===s.mid?'comparing':i===s.hi?'found':'default';
        cell(ctx,sx+i*cw,sy,cw-2,ch,v,st);
      });
      if(s.lo>=0)lbl(ctx,'lo',sx+s.lo*cw+cw/2-1,sy+ch+13,'#34D399',10,'center');
      if(s.mid>=0)lbl(ctx,'mid',sx+s.mid*cw+cw/2-1,sy+ch+13,'#F59E0B',10,'center');
      if(s.hi>=0&&s.hi<n)lbl(ctx,'hi',sx+s.hi*cw+cw/2-1,sy+ch+13,'#A78BFA',10,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P134 Largest Number ─────────────────────────────────── */
function initLargestNumber(id){
  var container=document.getElementById(id);if(!container)return;
  var defNums=[3,30,34,5,9];
  function buildSteps(nums){
    var steps=[],strs=nums.map(String);
    steps.push({arr:strs.slice(),msg:'Custom sort: compare "ab" vs "ba" — pick whichever concatenation is larger'});
    var sorted=strs.slice().sort(function(a,b){return (b+a)>(a+b)?1:-1;});
    strs.forEach(function(s,i){
      steps.push({arr:strs.slice(),hi:i,msg:'Comparing "'+s+'" with neighbors: prefer order where concatenation is lexically larger'});
    });
    steps.push({arr:sorted.slice(),msg:'Sorted: ['+sorted.join(',')+'] → "'+sorted.join('')+'"'});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:110,
    approaches:[{key:'optimal',label:'Custom Sort O(n log n)'}],
    inputs:[{id:'nums',lbl:'Numbers',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defNums.join(',');i.style.width='140px';return i;})()}],
    onInputs:function(vals){var n=(vals.nums||'').split(',').map(Number).filter(function(x){return!isNaN(x);});return buildSteps(n.length?n:defNums.slice());},
    buildSteps:function(){return buildSteps(defNums.slice());},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var a=s.arr,n=a.length,cw=Math.min(66,Math.floor((W-40)/n)),ch=44,sx=(W-n*cw)/2,sy=18;
      a.forEach(function(v,i){cell(ctx,sx+i*cw,sy,cw-2,ch,v,i===s.hi?'active':'sorted');});
      lbl(ctx,'Result: "'+a.join('')+'"',W/2,sy+ch+18,'#A78BFA',12,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P135 Median of Two Sorted Arrays ────────────────────── */
function initMedianTwoArrays(id){
  var container=document.getElementById(id);if(!container)return;
  var defA=[1,3],defB=[2];
  function buildSteps(A,B){
    var steps=[],m=A.length,n=B.length;
    if(m>n){var t=A;A=B;B=t;var tt=m;m=n;n=tt;}
    var lo=0,hi=m;
    steps.push({A:A,B:B,lo:lo,hi:hi,pA:-1,pB:-1,msg:'Binary search partition point on smaller array A'});
    while(lo<=hi){
      var pA=Math.floor((lo+hi)/2),pB=Math.floor((m+n+1)/2)-pA;
      var aL=pA>0?A[pA-1]:-Infinity,aR=pA<m?A[pA]:Infinity;
      var bL=pB>0?B[pB-1]:-Infinity,bR=pB<n?B[pB]:Infinity;
      steps.push({A:A,B:B,lo:lo,hi:hi,pA:pA,pB:pB,aL:aL,aR:aR,bL:bL,bR:bR,msg:'pA='+pA+' pB='+pB+': aL='+aL+' aR='+aR+' bL='+bL+' bR='+bR});
      if(aL<=bR&&bL<=aR){
        var med=(m+n)%2===1?Math.max(aL,bL):(Math.max(aL,bL)+Math.min(aR,bR))/2;
        steps.push({A:A,B:B,pA:pA,pB:pB,msg:'Valid partition! Median = '+med});return steps;
      } else if(aL>bR){hi=pA-1;steps.push({A:A,B:B,lo:lo,hi:hi,pA:pA,pB:pB,msg:'aL>bR → move pA left'});}
      else{lo=pA+1;steps.push({A:A,B:B,lo:lo,hi:hi,pA:pA,pB:pB,msg:'bL>aR → move pA right'});}
    }
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:140,
    approaches:[{key:'optimal',label:'Binary Search O(log min(m,n))'}],
    inputs:[
      {id:'a',lbl:'Array A',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defA.join(',');i.style.width='100px';return i;})()},
      {id:'b',lbl:'Array B',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defB.join(',');i.style.width='100px';return i;})()}
    ],
    onInputs:function(vals){
      var a=(vals.a||'').split(',').map(Number).filter(function(x){return!isNaN(x);});
      var b=(vals.b||'').split(',').map(Number).filter(function(x){return!isNaN(x);});
      return buildSteps(a.length?a:defA.slice(),b.length?b:defB.slice());
    },
    buildSteps:function(){return buildSteps(defA.slice(),defB.slice());},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var A=s.A||[],B=s.B||[],pA=s.pA||0,pB=s.pB||0;
      var cwA=Math.min(50,Math.floor((W-60)/(A.length||1))),cwB=Math.min(50,Math.floor((W-60)/(B.length||1))),ch=34;
      var sxA=(W-A.length*cwA)/2,sxB=(W-B.length*cwB)/2,syA=14,syB=syA+ch+20;
      lbl(ctx,'A:',sxA-20,syA+ch/2+4,'#6B7280',10,'left');
      A.forEach(function(v,i){cell(ctx,sxA+i*cwA,syA,cwA-2,ch,v,i<pA?'sorted':i===pA?'active':'default');});
      lbl(ctx,'B:',sxB-20,syB+ch/2+4,'#6B7280',10,'left');
      B.forEach(function(v,i){cell(ctx,sxB+i*cwB,syB,cwB-2,ch,v,i<pB?'sorted':i===pB?'active':'default');});
      if(s.pA>=0)lbl(ctx,'pA='+pA+' pB='+pB,W/2,syB+ch+16,'#A78BFA',11,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P136 Min Arrows to Burst Balloons ───────────────────── */
function initMinArrows(id){
  var container=document.getElementById(id);if(!container)return;
  var defPoints=[[10,16],[2,8],[1,6],[7,12]];
  function buildSteps(points){
    var steps=[],sorted=points.slice().sort(function(a,b){return a[1]-b[1];}),arrows=1,end=sorted[0][1];
    steps.push({points:sorted,arrow:end,arrows:1,cur:0,msg:'Sort by end. First arrow at end of first balloon: '+end});
    for(var i=1;i<sorted.length;i++){
      var p=sorted[i];
      steps.push({points:sorted,arrow:end,arrows:arrows,cur:i,msg:'Balloon ['+p+']: start='+p[0]+' vs arrow='+end});
      if(p[0]>end){arrows++;end=p[1];steps.push({points:sorted,arrow:end,arrows:arrows,cur:i,msg:'Miss! New arrow at '+end+'. Total: '+arrows});}
      else{steps.push({points:sorted,arrow:end,arrows:arrows,cur:i,msg:'Hit! Arrow '+end+' bursts this balloon too'});}
    }
    steps.push({points:sorted,arrow:end,arrows:arrows,msg:'Minimum arrows: '+arrows});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:150,
    approaches:[{key:'optimal',label:'Greedy Sort by End O(n log n)'}],
    inputs:[{id:'pts',lbl:'Balloons [[s,e],…]',elem:(function(){var i=document.createElement('input');i.type='text';i.value='[10,16],[2,8],[1,6],[7,12]';i.style.width='200px';return i;})()}],
    onInputs:function(vals){try{var p=JSON.parse('['+vals.pts+']');return buildSteps(p);}catch(e){return buildSteps(defPoints);}},
    buildSteps:function(){return buildSteps(defPoints);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var pts=s.points||[],n=pts.length,maxV=Math.max.apply(null,pts.map(function(p){return p[1];})),minV=Math.min.apply(null,pts.map(function(p){return p[0];}));
      var scale=(W-80)/(maxV-minV||1),sy=12,rowH=Math.min(24,(H-40)/n);
      pts.forEach(function(p,i){
        var x=40+(p[0]-minV)*scale,w=(p[1]-p[0])*scale,y=sy+i*rowH;
        ctx.fillStyle=i===s.cur?CS.active:CS.sorted;ctx.fillRect(x,y,Math.max(w,2),rowH-3);
        lbl(ctx,p[0]+'→'+p[1],x,y+rowH-4,'#6B7280',8,'left');
      });
      if(s.arrow!==undefined){var ax=40+(s.arrow-minV)*scale;ctx.strokeStyle='#EF4444';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(ax,10);ctx.lineTo(ax,H-20);ctx.stroke();}
      lbl(ctx,'Arrows: '+s.arrows,W-50,H-10,'#A78BFA',13,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P137 Rotate List ────────────────────────────────────── */
function initRotateList(id){
  var container=document.getElementById(id);if(!container)return;
  var defArr=[1,2,3,4,5],defK=2;
  function buildSteps(arr,k){
    var steps=[],n=arr.length;
    if(!n){steps.push({arr:[],msg:'Empty list'});return steps;}
    k=k%n;
    steps.push({arr:arr.slice(),cut:-1,msg:'Rotating by k='+k+' (effective after mod '+n+'='+k+'). Cut point at index '+(n-k-1)+'.'});
    if(k===0){steps.push({arr:arr.slice(),cut:-1,msg:'k=0 after mod — no rotation needed'});return steps;}
    var cut=n-k;
    steps.push({arr:arr.slice(),cut:cut-1,msg:'Connect tail to head, break link before index '+cut});
    var res=arr.slice(cut).concat(arr.slice(0,cut));
    steps.push({arr:res.slice(),cut:-1,msg:'After rotation: ['+res.join('→')+']'});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:110,
    approaches:[{key:'optimal',label:'Find Tail O(n)'}],
    inputs:[
      {id:'arr',lbl:'List',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defArr.join(',');i.style.width='130px';return i;})()},
      {id:'k',lbl:'k',elem:(function(){var i=document.createElement('input');i.type='number';i.value=defK;i.style.width='50px';return i;})()}
    ],
    onInputs:function(vals){var a=(vals.arr||'').split(',').map(Number).filter(function(x){return!isNaN(x);});return buildSteps(a.length?a:defArr.slice(),parseInt(vals.k)||defK);},
    buildSteps:function(){return buildSteps(defArr.slice(),defK);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var a=s.arr,n=a.length,cw=Math.min(62,Math.floor((W-40)/n)),ch=44,sx=(W-n*cw)/2,sy=22;
      a.forEach(function(v,i){
        var st=s.cut>=0&&i>s.cut?'active':s.cut>=0&&i===s.cut?'found':'sorted';
        cell(ctx,sx+i*cw,sy,cw-2,ch,v,st);
        if(i<n-1)lbl(ctx,'→',sx+(i+0.5)*cw+cw/2-4,sy+ch/2+4,'#4B5563',12,'left');
      });
      if(s.cut>=0)lbl(ctx,'↑ cut',sx+s.cut*cw+cw/2-1,sy-10,'#EF4444',10,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P138 Find K Pairs with Smallest Sums ────────────────── */
function initKSmallestPairs(id){
  var container=document.getElementById(id);if(!container)return;
  var defNums1=[1,7,11],defNums2=[2,4,6],defK=3;
  function buildSteps(n1,n2,k){
    var steps=[],result=[],heap=[];
    // seed with (n1[i], n2[0]) for all i
    for(var i=0;i<Math.min(n1.length,k);i++)heap.push([n1[i]+n2[0],i,0]);
    heap.sort(function(a,b){return a[0]-b[0];});
    steps.push({result:[],heap:heap.map(function(h){return '['+n1[h[1]]+','+n2[h[2]]+']';}),msg:'Seed heap with (nums1[i], nums2[0]) for all i'});
    while(heap.length&&result.length<k){
      heap.sort(function(a,b){return a[0]-b[0];});
      var top=heap.shift(),i=top[1],j=top[2];
      result.push([n1[i],n2[j]]);
      steps.push({result:result.slice(),heap:heap.map(function(h){return '['+n1[h[1]]+','+n2[h[2]]+']';}),msg:'Pop ['+n1[i]+','+n2[j]+'] sum='+(n1[i]+n2[j])+(j+1<n2.length?' → push ['+n1[i]+','+n2[j+1]+']':'')});
      if(j+1<n2.length)heap.push([n1[i]+n2[j+1],i,j+1]);
    }
    steps.push({result:result.slice(),heap:[],msg:'K='+k+' smallest pairs: '+result.map(function(p){return '['+p+']';}).join(' ')});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:120,
    approaches:[{key:'optimal',label:'Min-Heap O(k log k)'}],
    inputs:[
      {id:'n1',lbl:'nums1',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defNums1.join(',');i.style.width='90px';return i;})()},
      {id:'n2',lbl:'nums2',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defNums2.join(',');i.style.width='90px';return i;})()},
      {id:'k',lbl:'k',elem:(function(){var i=document.createElement('input');i.type='number';i.value=defK;i.style.width='45px';return i;})()}
    ],
    onInputs:function(vals){
      var n1=(vals.n1||'').split(',').map(Number).filter(function(x){return!isNaN(x);});
      var n2=(vals.n2||'').split(',').map(Number).filter(function(x){return!isNaN(x);});
      return buildSteps(n1.length?n1:defNums1,n2.length?n2:defNums2,parseInt(vals.k)||defK);
    },
    buildSteps:function(){return buildSteps(defNums1,defNums2,defK);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var res=s.result||[],n=res.length,cw=Math.min(72,Math.floor((W-40)/Math.max(n,1))),ch=40,sx=(W-n*cw)/2,sy=20;
      res.forEach(function(p,i){cell(ctx,sx+i*cw,sy,cw-2,ch,'['+p[0]+','+p[1]+']','sorted');});
      lbl(ctx,'heap: ['+((s.heap||[]).join(', '))+']',W/2,sy+ch+18,'#A78BFA',10,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P139 Path Sum II ────────────────────────────────────── */
function initPathSumII(id){
  var container=document.getElementById(id);if(!container)return;
  var defArr=[5,4,8,11,null,13,4,7,2,null,null,null,null,5,1],defTarget=22;
  function buildSteps(arr,target){
    var root=_mkTree(arr),steps=[],results=[];
    steps.push({hl:{},paths:[],msg:'DFS: track path from root. At each leaf check if sum equals target.'});
    function dfs(node,path,sum){
      if(!node)return;
      path.push(node.val);sum+=node.val;
      steps.push({hl:{[node.val]:'active'},paths:results.slice(),msg:'Visit '+node.val+' sum='+sum+' path=['+path.join('→')+']'});
      if(!node.left&&!node.right){
        if(sum===target){results.push(path.slice());steps.push({hl:{[node.val]:'found'},paths:results.slice(),msg:'Leaf! sum='+sum+'=target → path found: ['+path.join('→')+']'});}
        else{steps.push({hl:{[node.val]:'comparing'},paths:results.slice(),msg:'Leaf! sum='+sum+'≠'+target+' — backtrack'});}
      }
      dfs(node.left,path,sum);dfs(node.right,path,sum);
      path.pop();
    }
    dfs(root,[],0);
    steps.push({hl:{},paths:results.slice(),msg:results.length+' path(s) found: '+results.map(function(p){return '['+p.join('→')+']';}).join(' ')});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:220,
    approaches:[{key:'optimal',label:'DFS Backtracking O(n)'}],
    inputs:[{id:'target',lbl:'Target sum',elem:(function(){var i=document.createElement('input');i.type='number';i.value=defTarget;i.style.width='60px';return i;})()}],
    onInputs:function(vals){return buildSteps(defArr.slice(),parseInt(vals.target)||defTarget);},
    buildSteps:function(){return buildSteps(defArr.slice(),defTarget);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      _drawTree(ctx,_mkTree(defArr),W,H-30,s.hl||{});
      if(s.paths&&s.paths.length)lbl(ctx,'Found: '+s.paths.map(function(p){return '['+p.join('→')+']';}).join(' '),W/2,H-8,'#34D399',10,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P140 Count Good Triplets ────────────────────────────── */
function initCountGoodTriplets(id){
  var container=document.getElementById(id);if(!container)return;
  var defArr=[3,0,1,1,9,7],defA=7,defB=2,defC=3;
  function buildSteps(arr,a,b,c){
    var steps=[],n=arr.length,count=0;
    steps.push({arr:arr,i:-1,j:-1,k:-1,count:0,msg:'Brute O(n³): try every triplet (i,j,k) i<j<k, check all 3 conditions'});
    for(var i=0;i<n-2;i++){
      for(var j=i+1;j<n-1;j++){
        if(Math.abs(arr[i]-arr[j])>a)continue;
        for(var k=j+1;k<n;k++){
          var ok=Math.abs(arr[i]-arr[j])<=a&&Math.abs(arr[j]-arr[k])<=b&&Math.abs(arr[i]-arr[k])<=c;
          steps.push({arr:arr,i:i,j:j,k:k,count:count,msg:'('+arr[i]+','+arr[j]+','+arr[k]+'): |'+arr[i]+'-'+arr[j]+'|≤'+a+' |'+arr[j]+'-'+arr[k]+'|≤'+b+' |'+arr[i]+'-'+arr[k]+'|≤'+c+' → '+(ok?'GOOD ✓':'skip')});
          if(ok)count++;
        }
      }
    }
    steps.push({arr:arr,i:-1,j:-1,k:-1,count:count,msg:'Total good triplets: '+count});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:120,
    approaches:[{key:'optimal',label:'Brute O(n³)'}],
    inputs:[
      {id:'arr',lbl:'Array',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defArr.join(',');i.style.width='130px';return i;})()},
      {id:'a',lbl:'a',elem:(function(){var i=document.createElement('input');i.type='number';i.value=defA;i.style.width='40px';return i;})()},
      {id:'b',lbl:'b',elem:(function(){var i=document.createElement('input');i.type='number';i.value=defB;i.style.width='40px';return i;})()},
      {id:'c',lbl:'c',elem:(function(){var i=document.createElement('input');i.type='number';i.value=defC;i.style.width='40px';return i;})()}
    ],
    onInputs:function(vals){
      var arr=(vals.arr||'').split(',').map(Number).filter(function(x){return!isNaN(x);});
      return buildSteps(arr.length?arr:defArr,parseInt(vals.a)||defA,parseInt(vals.b)||defB,parseInt(vals.c)||defC);
    },
    buildSteps:function(){return buildSteps(defArr,defA,defB,defC);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var a=s.arr,n=a.length,cw=Math.min(56,Math.floor((W-40)/n)),ch=44,sx=(W-n*cw)/2,sy=18;
      a.forEach(function(v,i){
        var st=i===s.i||i===s.j||i===s.k?'active':'default';
        cell(ctx,sx+i*cw,sy,cw-2,ch,v,st);
        lbl(ctx,i===s.i?'i':i===s.j?'j':i===s.k?'k':'',sx+i*cw+cw/2-1,sy+ch+13,'#F59E0B',10,'center');
      });
      lbl(ctx,'Good triplets: '+s.count,W/2,sy+ch+28,'#A78BFA',12,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P141 Flatten Binary Tree to Linked List ─────────────── */
function initFlattenTree(id){
  var container=document.getElementById(id);if(!container)return;
  var defArr=[1,2,5,3,4,null,6];
  function buildSteps(arr){
    var root=_mkTree(arr),steps=[],order=[];
    steps.push({hl:{},order:[],msg:'Pre-order DFS to get node order, then re-link as right-only chain'});
    function preorder(n){if(!n)return;order.push(n.val);preorder(n.left);preorder(n.right);}
    preorder(root);
    steps.push({hl:{},order:order.slice(),msg:'Pre-order: ['+order.join('→')+']'});
    for(var i=0;i<order.length;i++){
      steps.push({hl:{[order[i]]:'active'},order:order.slice(0,i+1),msg:'Node '+order[i]+' → right='+( order[i+1]!==undefined?order[i+1]:'null')+', left=null'});
    }
    steps.push({hl:{},order:order.slice(),msg:'Flattened: '+order.join(' → null')+' → null'});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:220,
    approaches:[{key:'optimal',label:'Morris O(n) · O(1) space'}],
    inputs:[{id:'arr',lbl:'Tree (level-order)',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defArr.join(',');i.style.width='160px';return i;})()}],
    onInputs:function(vals){var a=(vals.arr||'').split(',').map(function(x){return x.trim()==='_'||x.trim()===''?null:Number(x);});return buildSteps(a.length?a:defArr.slice());},
    buildSteps:function(){return buildSteps(defArr.slice());},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      _drawTree(ctx,_mkTree(defArr),W,H-38,s.hl||{});
      var ord=s.order||[],n=ord.length,cw=Math.min(44,Math.floor((W-20)/Math.max(n,1)));
      if(n)lbl(ctx,ord.join(' → '),W/2,H-10,'#A78BFA',10,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P142 Symmetric Tree ─────────────────────────────────── */
function initSymmetricTree(id){
  var container=document.getElementById(id);if(!container)return;
  var defArr=[1,2,2,3,4,4,3];
  function buildSteps(arr){
    var root=_mkTree(arr),steps=[];
    steps.push({hl:{},msg:'Mirror check: left subtree must mirror right subtree at every level'});
    function isMirror(l,r){
      if(!l&&!r)return true;
      if(!l||!r)return false;
      return l.val===r.val&&isMirror(l.left,r.right)&&isMirror(l.right,r.left);
    }
    function check(l,r){
      if(!l&&!r){steps.push({hl:{},msg:'Both null → match ✓'});return true;}
      if(!l||!r){steps.push({hl:{},msg:'One null, one not → mismatch ✗'});return false;}
      steps.push({hl:{[l.val]:'comparing',[r.val]:'comparing'},msg:'Compare '+l.val+' ↔ '+r.val+(l.val===r.val?' ✓':' ✗ mismatch')});
      if(l.val!==r.val)return false;
      return check(l.left,r.right)&&check(l.right,r.left);
    }
    var result=check(root&&root.left,root&&root.right);
    steps.push({hl:{},msg:result?'Tree is symmetric ✓':'Tree is NOT symmetric ✗'});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:220,
    approaches:[{key:'optimal',label:'DFS O(n)'}],
    inputs:[{id:'arr',lbl:'Tree (level-order)',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defArr.join(',');i.style.width='160px';return i;})()}],
    onInputs:function(vals){var a=(vals.arr||'').split(',').map(function(x){return x.trim()==='_'||x.trim()===''?null:Number(x);});return buildSteps(a.length?a:defArr.slice());},
    buildSteps:function(){return buildSteps(defArr.slice());},
    onStep:function(s,ctx,W,H){bg(ctx,W,H);_drawTree(ctx,_mkTree(defArr),W,H,s.hl||{});},
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P143 Binary Tree Zigzag Level Order ─────────────────── */
function initZigzagLevelOrder(id){
  var container=document.getElementById(id);if(!container)return;
  var defArr=[3,9,20,null,null,15,7];
  function buildSteps(arr){
    var root=_mkTree(arr),steps=[],result=[],level=0;
    if(!root)return steps;
    var queue=[root];
    steps.push({hl:{},result:[],msg:'BFS level by level, alternate direction each level'});
    while(queue.length){
      var size=queue.length,row=[];
      var hl={};
      for(var i=0;i<size;i++){
        var n=queue.shift();
        row.push(n.val);hl[n.val]='active';
        if(n.left)queue.push(n.left);
        if(n.right)queue.push(n.right);
      }
      var dirRow=level%2===0?row.slice():row.slice().reverse();
      result.push(dirRow);
      steps.push({hl:hl,result:JSON.parse(JSON.stringify(result)),msg:'Level '+level+' ('+(level%2===0?'left→right':'right→left')+'): ['+dirRow.join(',')+']'});
      level++;
    }
    steps.push({hl:{},result:JSON.parse(JSON.stringify(result)),msg:'Result: '+result.map(function(r){return '['+r+']';}).join(' ')});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:230,
    approaches:[{key:'optimal',label:'BFS O(n)'}],
    inputs:[{id:'arr',lbl:'Tree (level-order)',elem:(function(){var i=document.createElement('input');i.type='text';i.value='3,9,20,_,_,15,7';i.style.width='160px';return i;})()}],
    onInputs:function(vals){var a=(vals.arr||'').split(',').map(function(x){return x.trim()==='_'||x.trim()===''?null:Number(x);});return buildSteps(a.length?a:defArr.slice());},
    buildSteps:function(){return buildSteps(defArr.slice());},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      _drawTree(ctx,_mkTree(defArr),W,H-40,s.hl||{});
      var res=s.result||[];
      lbl(ctx,res.map(function(r,i){return (i%2===0?'→':'←')+' ['+r+']';}).join('  '),W/2,H-10,'#A78BFA',10,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P144 Decode String ──────────────────────────────────── */
function initDecodeString(id){
  var container=document.getElementById(id);if(!container)return;
  var defS='3[a2[c]]';
  function buildSteps(s){
    var steps=[],stack=[],cur='',k=0;
    steps.push({stack:[],cur:'',msg:'Stack: push (current_str, repeat_count) on "[", pop and repeat on "]"'});
    for(var i=0;i<s.length;i++){
      var c=s[i];
      if(c>='0'&&c<='9'){k=k*10+(c-'0');steps.push({stack:stack.slice(),cur:cur,k:k,msg:'Digit "'+c+'" → k='+k});}
      else if(c==='['){stack.push([cur,k]);cur='';k=0;steps.push({stack:stack.map(function(x){return x[0]+'×'+x[1];}),cur:cur,k:0,msg:'Push ('+stack[stack.length-1][0]+', ×'+stack[stack.length-1][1]+') → reset cur & k'});}
      else if(c===']'){var top=stack.pop();cur=top[0]+cur.repeat(top[1]);steps.push({stack:stack.map(function(x){return x[0]+'×'+x[1];}),cur:cur,k:0,msg:'Pop: "'+top[0]+'" + "'+cur.slice(top[0].length)+'" ×'+top[1]+' → "'+cur+'"'});}
      else{cur+=c;steps.push({stack:stack.map(function(x){return x[0]+'×'+x[1];}),cur:cur,k:k,msg:'Char "'+c+'" → cur="'+cur+'"'});}
    }
    steps.push({stack:[],cur:cur,msg:'Decoded: "'+cur+'"'});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:120,
    approaches:[{key:'optimal',label:'Stack O(output length)'}],
    inputs:[{id:'s',lbl:'Encoded',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defS;i.style.width='140px';return i;})()}],
    onInputs:function(vals){return buildSteps(vals.s||defS);},
    buildSteps:function(){return buildSteps(defS);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var stack=s.stack||[],n=stack.length,cw=Math.min(90,Math.floor((W-40)/Math.max(n,1))),ch=36,sx=(W-n*cw)/2,sy=16;
      stack.forEach(function(v,i){cell(ctx,sx+i*cw,sy,cw-2,ch,v,'comparing');});
      if(!n)lbl(ctx,'Stack empty',W/2,sy+ch/2+2,'#4B5563',10,'center');
      lbl(ctx,'cur: "'+s.cur+'"',W/2,sy+ch+16,'#A78BFA',12,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P145 Next Permutation ───────────────────────────────── */
function initNextPermutation(id){
  var container=document.getElementById(id);if(!container)return;
  var defArr=[1,2,3];
  function buildSteps(arr){
    var steps=[],a=arr.slice(),n=a.length;
    steps.push({arr:a.slice(),pivot:-1,swap:-1,msg:'Step 1: find rightmost i where a[i] < a[i+1] (the "pivot")'});
    var i=n-2;
    while(i>=0&&a[i]>=a[i+1])i--;
    if(i<0){
      a.reverse();
      steps.push({arr:a.slice(),pivot:-1,swap:-1,msg:'No pivot found — array is descending → reverse all → smallest permutation'});
      return steps;
    }
    steps.push({arr:a.slice(),pivot:i,swap:-1,msg:'Pivot at index '+i+' (value '+a[i]+')'});
    var j=n-1;
    while(a[j]<=a[i])j--;
    steps.push({arr:a.slice(),pivot:i,swap:j,msg:'Rightmost element > pivot: index '+j+' (value '+a[j]+') → swap them'});
    var t=a[i];a[i]=a[j];a[j]=t;
    steps.push({arr:a.slice(),pivot:i,swap:j,msg:'After swap: ['+a.join(',')+'] — now reverse suffix after pivot'});
    var lo=i+1,hi=n-1;
    while(lo<hi){var tt=a[lo];a[lo]=a[hi];a[hi]=tt;lo++;hi--;}
    steps.push({arr:a.slice(),pivot:-1,swap:-1,msg:'Next permutation: ['+a.join(',')+']'});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:110,
    approaches:[{key:'optimal',label:'O(n) · O(1) space'}],
    inputs:[{id:'arr',lbl:'Array',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defArr.join(',');i.style.width='130px';return i;})()}],
    onInputs:function(vals){var a=(vals.arr||'').split(',').map(Number).filter(function(x){return!isNaN(x);});return buildSteps(a.length?a:defArr.slice());},
    buildSteps:function(){return buildSteps(defArr.slice());},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var a=s.arr,n=a.length,cw=Math.min(62,Math.floor((W-40)/n)),ch=44,sx=(W-n*cw)/2,sy=18;
      a.forEach(function(v,i){
        var st=i===s.pivot?'found':i===s.swap?'comparing':'sorted';
        cell(ctx,sx+i*cw,sy,cw-2,ch,v,st);
        if(i===s.pivot)lbl(ctx,'pivot',sx+i*cw+cw/2-1,sy+ch+13,'#34D399',9,'center');
        if(i===s.swap)lbl(ctx,'swap',sx+i*cw+cw/2-1,sy+ch+13,'#F59E0B',9,'center');
      });
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P146 Find All Anagrams in String ────────────────────── */
function initFindAllAnagrams(id){
  var container=document.getElementById(id);if(!container)return;
  var defS='cbaebabacd',defP='abc';
  function buildSteps(s,p){
    var steps=[],n=s.length,k=p.length,need={},have={},result=[];
    for(var c of p)need[c]=(need[c]||0)+1;
    for(var i=0;i<k;i++)have[s[i]]=(have[s[i]]||0)+1;
    function eq(a,b){for(var x in a)if(a[x]!==(b[x]||0))return false;for(var x in b)if((a[x]||0)!==b[x])return false;return true;}
    steps.push({s:s,L:0,R:k-1,result:[],msg:'Fixed window size '+k+', slide and check anagram match'});
    for(var R=k-1;R<n;R++){
      var L=R-k+1,m=eq(need,have);
      if(m)result.push(L);
      steps.push({s:s,L:L,R:R,match:m,result:result.slice(),msg:'Window ['+L+','+R+'] "'+s.slice(L,R+1)+'" match: '+m+(m?' → start index '+L:'')});
      if(R+1<n){have[s[L]]--;if(!have[s[L]])delete have[s[L]];have[s[R+1]]=(have[s[R+1]]||0)+1;}
    }
    steps.push({s:s,L:0,R:n-1,result:result.slice(),msg:'Anagram start indices: ['+result.join(',')+']'});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:110,
    approaches:[{key:'optimal',label:'Sliding Window O(n)'}],
    inputs:[
      {id:'s',lbl:'s',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defS;i.style.width='130px';return i;})()},
      {id:'p',lbl:'p',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defP;i.style.width='70px';return i;})()}
    ],
    onInputs:function(vals){return buildSteps(vals.s||defS,vals.p||defP);},
    buildSteps:function(){return buildSteps(defS,defP);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var str=s.s,n=str.length,cw=Math.min(38,Math.floor((W-20)/n)),ch=38,sx=(W-n*cw)/2,sy=14;
      for(var i=0;i<n;i++){
        var inWin=s.L!==undefined&&i>=s.L&&i<=s.R;
        cell(ctx,sx+i*cw,sy,cw-1,ch,str[i],s.match&&inWin?'found':inWin?'active':'default');
      }
      lbl(ctx,'p="'+s.p+'"  matches at: ['+((s.result||[]).join(','))+']',W/2,sy+ch+16,'#A78BFA',11,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P147 Jump Game III ──────────────────────────────────── */
function initJumpGameIII(id){
  var container=document.getElementById(id);if(!container)return;
  var defArr=[4,2,3,0,3,1,2],defStart=5;
  function buildSteps(arr,start){
    var steps=[],n=arr.length,visited=new Set(),queue=[start];
    visited.add(start);
    steps.push({arr:arr,visited:[start],queue:[start],msg:'BFS from index '+start+': jump ±arr[i] steps. Goal: reach a 0.'});
    var found=false,foundIdx=-1;
    while(queue.length){
      var idx=queue.shift();
      steps.push({arr:arr,visited:Array.from(visited),queue:queue.slice(),cur:idx,msg:'At index '+idx+' value='+arr[idx]+(arr[idx]===0?' → 0 FOUND ✓':'')});
      if(arr[idx]===0){found=true;foundIdx=idx;break;}
      var nexts=[idx+arr[idx],idx-arr[idx]];
      nexts.forEach(function(ni){
        if(ni>=0&&ni<n&&!visited.has(ni)){visited.add(ni);queue.push(ni);steps.push({arr:arr,visited:Array.from(visited),queue:queue.slice(),cur:idx,msg:'Push index '+ni+' (value='+arr[ni]+')'});}
      });
    }
    steps.push({arr:arr,visited:Array.from(visited),queue:[],cur:foundIdx,msg:found?'Can reach 0 at index '+foundIdx+' → true ✓':'No 0 reachable → false ✗'});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:120,
    approaches:[{key:'optimal',label:'BFS O(n)'}],
    inputs:[
      {id:'arr',lbl:'Array',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defArr.join(',');i.style.width='150px';return i;})()},
      {id:'start',lbl:'Start',elem:(function(){var i=document.createElement('input');i.type='number';i.value=defStart;i.style.width='50px';return i;})()}
    ],
    onInputs:function(vals){var a=(vals.arr||'').split(',').map(Number).filter(function(x){return!isNaN(x);});return buildSteps(a.length?a:defArr.slice(),parseInt(vals.start)||defStart);},
    buildSteps:function(){return buildSteps(defArr.slice(),defStart);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var a=s.arr,n=a.length,cw=Math.min(58,Math.floor((W-40)/n)),ch=44,sx=(W-n*cw)/2,sy=18;
      a.forEach(function(v,i){
        var vis=s.visited&&s.visited.indexOf(i)>=0;
        var st=i===s.cur?'active':vis?(v===0?'found':'sorted'):'default';
        cell(ctx,sx+i*cw,sy,cw-2,ch,v,st);
        lbl(ctx,i,sx+i*cw+cw/2-1,sy+ch+13,'#4B5563',10,'center');
      });
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P148 Maximum Product of Word Lengths ────────────────── */
function initMaxProductWordLengths(id){
  var container=document.getElementById(id);if(!container)return;
  var defWords=['abcw','baz','foo','bar','xtfn','abcdef'];
  function buildSteps(words){
    var steps=[],n=words.length,masks=words.map(function(w){var m=0;for(var c of w)m|=1<<(c.charCodeAt(0)-97);return m;});
    steps.push({words:words,masks:masks.map(function(m){return m.toString(2).padStart(8,'0');}),best:0,msg:'Encode each word as a bitmask. No shared letter ↔ masks have no common set bits (AND=0).'});
    var best=0;
    for(var i=0;i<n;i++){
      for(var j=i+1;j<n;j++){
        var noShared=(masks[i]&masks[j])===0;
        var prod=words[i].length*words[j].length;
        if(noShared&&prod>best)best=prod;
        steps.push({words:words,masks:masks.map(function(m){return m.toString(2).padStart(8,'0');}),best:best,i:i,j:j,msg:'"'+words[i]+'" & "'+words[j]+'" AND='+(masks[i]&masks[j])+(noShared?' (no overlap!) len product='+prod:'')});
      }
    }
    steps.push({words:words,masks:masks.map(function(m){return m.toString(2).padStart(8,'0');}),best:best,msg:'Maximum product: '+best});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:140,
    approaches:[{key:'optimal',label:'Bitmask O(n²)'}],
    inputs:[{id:'words',lbl:'Words',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defWords.join(',');i.style.width='220px';return i;})()}],
    onInputs:function(vals){var w=(vals.words||'').split(',').map(function(x){return x.trim();}).filter(Boolean);return buildSteps(w.length?w:defWords.slice());},
    buildSteps:function(){return buildSteps(defWords.slice());},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var words=s.words||[],n=words.length,masks=s.masks||[];
      var rowH=18,sy=10;
      words.forEach(function(w,i){
        var st=i===s.i||i===s.j?'active':'default';
        lbl(ctx,'"'+w+'" → '+masks[i],10,sy+i*rowH,i===s.i?'#34D399':i===s.j?'#F59E0B':'#6B7280',10,'left');
      });
      lbl(ctx,'Best product: '+s.best,W/2,sy+n*rowH+6,'#A78BFA',13,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P149 Pascal's Triangle ──────────────────────────────── */
function initPascalTriangle(id){
  var container=document.getElementById(id);if(!container)return;
  var defN=5;
  function buildSteps(n){
    var steps=[],triangle=[];
    steps.push({triangle:[],msg:"Each row: start and end with 1; interior = sum of two above"});
    for(var r=0;r<n;r++){
      var row=new Array(r+1).fill(0);row[0]=1;row[r]=1;
      for(var c=1;c<r;c++)row[c]=triangle[r-1][c-1]+triangle[r-1][c];
      triangle.push(row);
      steps.push({triangle:JSON.parse(JSON.stringify(triangle)),msg:'Row '+r+': ['+row.join(',')+']'});
    }
    steps.push({triangle:JSON.parse(JSON.stringify(triangle)),msg:'Pascal\'s Triangle for n='+n});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:180,
    approaches:[{key:'optimal',label:'DP O(n²)'}],
    inputs:[{id:'n',lbl:'Rows',elem:(function(){var i=document.createElement('input');i.type='number';i.value=defN;i.min=1;i.max=10;i.style.width='50px';return i;})()}],
    onInputs:function(vals){return buildSteps(Math.min(10,Math.max(1,parseInt(vals.n)||defN)));},
    buildSteps:function(){return buildSteps(defN);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var tri=s.triangle||[],cw=34,ch=26;
      tri.forEach(function(row,r){
        var sx=(W-row.length*cw)/2;
        row.forEach(function(v,c){cell(ctx,sx+c*cw,10+r*ch,cw-2,ch-2,v,r===tri.length-1?'active':'sorted');});
      });
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P150 Minimum Interval to Include Each Query ─────────── */
function initMinIntervalQuery(id){
  var container=document.getElementById(id);if(!container)return;
  var defIntervals=[[1,4],[2,4],[3,6],[4,4]],defQueries=[2,3,4,5];
  function buildSteps(intervals,queries){
    var steps=[],sorted=intervals.slice().sort(function(a,b){return a[0]-b[0];});
    var idxQ=queries.map(function(q,i){return[q,i];}).sort(function(a,b){return a[0]-b[0];});
    var ans=new Array(queries.length).fill(-1),heap=[],i=0;
    steps.push({intervals:sorted,queries:queries,ans:ans.slice(),msg:'Sort intervals by start, queries by value. Sweep with min-heap keyed by interval size.'});
    idxQ.forEach(function(qi){
      var q=qi[0],origIdx=qi[1];
      while(i<sorted.length&&sorted[i][0]<=q){
        var iv=sorted[i],size=iv[1]-iv[0]+1;
        heap.push([size,iv[1]]);heap.sort(function(a,b){return a[0]-b[0];});
        steps.push({intervals:sorted,queries:queries,ans:ans.slice(),cur:q,msg:'Add interval ['+iv+'] size='+size});i++;
      }
      while(heap.length&&heap[0][1]<q)heap.shift();
      if(heap.length){ans[origIdx]=heap[0][0];steps.push({intervals:sorted,queries:queries,ans:ans.slice(),cur:q,msg:'Query '+q+': smallest valid interval size='+heap[0][0]});}
      else{steps.push({intervals:sorted,queries:queries,ans:ans.slice(),cur:q,msg:'Query '+q+': no valid interval → -1'});}
    });
    steps.push({intervals:sorted,queries:queries,ans:ans.slice(),msg:'Answers: ['+ans.join(',')+']'});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:150,
    approaches:[{key:'optimal',label:'Sort + Min-Heap O(n log n + q log n)'}],
    inputs:[
      {id:'ivs',lbl:'Intervals [[s,e],…]',elem:(function(){var i=document.createElement('input');i.type='text';i.value='[1,4],[2,4],[3,6],[4,4]';i.style.width='180px';return i;})()},
      {id:'q',lbl:'Queries',elem:(function(){var i=document.createElement('input');i.type='text';i.value='2,3,4,5';i.style.width='100px';return i;})()}
    ],
    onInputs:function(vals){
      try{var ivs=JSON.parse('['+vals.ivs+']');}catch(e){var ivs=defIntervals;}
      var q=(vals.q||'').split(',').map(Number).filter(function(x){return!isNaN(x);});
      return buildSteps(ivs,q.length?q:defQueries);
    },
    buildSteps:function(){return buildSteps(defIntervals,defQueries);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var ivs=s.intervals||[],n=ivs.length,maxV=Math.max.apply(null,ivs.map(function(i){return i[1];}));
      var scale=(W-80)/maxV,sy=8,rowH=Math.min(20,(H-50)/n);
      ivs.forEach(function(iv,i){
        var x=40+iv[0]*scale,w=(iv[1]-iv[0])*scale;
        ctx.fillStyle=CS.sorted;ctx.fillRect(x,sy+i*rowH,Math.max(w,2),rowH-2);
        lbl(ctx,'['+iv[0]+','+iv[1]+']',x,sy+i*rowH+rowH-3,'#6B7280',8,'left');
      });
      if(s.cur!==undefined){var qx=40+s.cur*scale;ctx.strokeStyle='#F59E0B';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(qx,5);ctx.lineTo(qx,H-28);ctx.stroke();}
      lbl(ctx,'ans: ['+((s.ans||[]).map(function(v){return v===-1?'−1':v;})).join(',')+']',W/2,H-8,'#A78BFA',11,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P151 Climbing Stairs ────────────────────────────────── */
function initClimbingStairs(id){
  var container=document.getElementById(id);if(!container)return;
  var defN=6;
  function buildSteps(n){
    var dp=new Array(n+1).fill(0),steps=[];
    dp[0]=1;if(n>=1)dp[1]=1;
    steps.push({dp:dp.slice(),cur:1,msg:'Base cases: dp[0]=1 (empty), dp[1]=1. dp[i] = ways to reach stair i.'});
    for(var i=2;i<=n;i++){
      dp[i]=dp[i-1]+dp[i-2];
      steps.push({dp:dp.slice(),cur:i,msg:'dp['+i+'] = dp['+(i-1)+']('+(dp[i-1])+') + dp['+(i-2)+']('+(dp[i-2])+') = '+dp[i]});
    }
    steps.push({dp:dp.slice(),cur:n,msg:'Ways to climb '+n+' stairs: '+dp[n]});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:120,
    approaches:[{key:'dp',label:'DP O(n)'},{key:'fib',label:'Fibonacci O(n) · O(1)'}],
    inputs:[{id:'n',lbl:'Stairs n',elem:(function(){var i=document.createElement('input');i.type='number';i.value=defN;i.min=1;i.max=15;i.style.width='55px';return i;})()}],
    onInputs:function(vals){return buildSteps(Math.min(15,Math.max(1,parseInt(vals.n)||defN)));},
    buildSteps:function(){return buildSteps(defN);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var dp=s.dp,n=dp.length,cw=Math.min(50,Math.floor((W-30)/n)),ch=44,sx=(W-n*cw)/2,sy=18;
      dp.forEach(function(v,i){cell(ctx,sx+i*cw,sy,cw-2,ch,v,i===s.cur?'active':i<s.cur?'sorted':'default');lbl(ctx,'['+i+']',sx+i*cw+cw/2-1,sy+ch+13,'#4B5563',9,'center');});
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P152 House Robber ───────────────────────────────────── */
function initHouseRobber(id){
  var container=document.getElementById(id);if(!container)return;
  var defArr=[2,7,9,3,1];
  function buildSteps(nums){
    var n=nums.length,dp=new Array(n).fill(0),steps=[];
    if(!n)return steps;
    dp[0]=nums[0];if(n>1)dp[1]=Math.max(nums[0],nums[1]);
    steps.push({arr:nums,dp:dp.slice(),cur:1,msg:'dp[0]='+dp[0]+', dp[1]='+Math.max(nums[0],nums[1])});
    for(var i=2;i<n;i++){
      dp[i]=Math.max(dp[i-1],dp[i-2]+nums[i]);
      steps.push({arr:nums,dp:dp.slice(),cur:i,msg:'dp['+i+'] = max(dp['+(i-1)+']='+(dp[i-1])+', dp['+(i-2)+']+'+'nums['+i+']='+dp[i-2]+'+'+nums[i]+') = '+dp[i]});
    }
    steps.push({arr:nums,dp:dp.slice(),cur:n-1,msg:'Maximum loot: '+dp[n-1]});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:140,
    approaches:[{key:'dp',label:'DP O(n)'},{key:'var',label:'O(1) Space (2 vars)'}],
    inputs:[{id:'arr',lbl:'Houses',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defArr.join(',');i.style.width='130px';return i;})()}],
    onInputs:function(vals){var a=(vals.arr||'').split(',').map(Number).filter(function(x){return!isNaN(x);});return buildSteps(a.length?a:defArr.slice());},
    buildSteps:function(){return buildSteps(defArr.slice());},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var a=s.arr||[],n=a.length,cw=Math.min(56,Math.floor((W-30)/n)),ch=38,sx=(W-n*cw)/2;
      a.forEach(function(v,i){cell(ctx,sx+i*cw,14,cw-2,ch,v,i===s.cur?'active':'default');lbl(ctx,'h'+i,sx+i*cw+cw/2-1,14+ch+11,'#4B5563',9,'center');});
      var dp=s.dp||[];
      dp.forEach(function(v,i){if(v)cell(ctx,sx+i*cw,72,cw-2,ch,v,i===s.cur?'found':'sorted');});
      lbl(ctx,'dp',sx-20,91,'#A78BFA',9,'right');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P153 Longest Common Subsequence ─────────────────────── */
function initLCSII(id){
  var container=document.getElementById(id);if(!container)return;
  var defA='abcde',defB='ace';
  function buildSteps(a,b){
    var m=a.length,n=b.length,steps=[];
    var dp=Array.from({length:m+1},function(){return new Array(n+1).fill(0);});
    steps.push({dp:dp.map(function(r){return r.slice();}),i:0,j:0,msg:'Fill DP table: dp[i][j] = LCS of first i chars of a, j chars of b'});
    for(var i=1;i<=m;i++){
      for(var j=1;j<=n;j++){
        if(a[i-1]===b[j-1]){dp[i][j]=dp[i-1][j-1]+1;steps.push({dp:dp.map(function(r){return r.slice();}),i:i,j:j,msg:'"'+a[i-1]+'"="'+b[j-1]+'" → dp['+i+']['+j+']=dp['+(i-1)+']['+(j-1)+']+'+'1='+dp[i][j]});}
        else{dp[i][j]=Math.max(dp[i-1][j],dp[i][j-1]);steps.push({dp:dp.map(function(r){return r.slice();}),i:i,j:j,msg:'"'+a[i-1]+'"≠"'+b[j-1]+'" → max('+dp[i-1][j]+','+dp[i][j-1]+')='+dp[i][j]});}
      }
    }
    steps.push({dp:dp.map(function(r){return r.slice();}),i:m,j:n,msg:'LCS length: '+dp[m][n]});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:200,
    approaches:[{key:'dp',label:'DP O(mn)'}],
    inputs:[
      {id:'a',lbl:'Text 1',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defA;i.style.width='80px';return i;})()},
      {id:'b',lbl:'Text 2',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defB;i.style.width='80px';return i;})()}
    ],
    onInputs:function(vals){return buildSteps(vals.a||defA,vals.b||defB);},
    buildSteps:function(){return buildSteps(defA,defB);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var dp=s.dp||[],rows=dp.length,cols=dp[0]?dp[0].length:1;
      var cw=Math.min(32,Math.floor((W-40)/cols)),ch=Math.min(28,Math.floor((H-10)/rows));
      var ox=(W-cols*cw)/2,oy=8;
      dp.forEach(function(row,i){row.forEach(function(v,j){var active=i===s.i&&j===s.j;cell(ctx,ox+j*cw,oy+i*ch,cw-1,ch-1,v,active?'active':v>0?'found':'default');});});
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P154 Coin Change II ─────────────────────────────────── */
function initCoinChangeII(id){
  var container=document.getElementById(id);if(!container)return;
  var defCoins=[1,2,5],defAmount=5;
  function buildSteps(coins,amount){
    var dp=new Array(amount+1).fill(0),steps=[];
    dp[0]=1;
    steps.push({dp:dp.slice(),coin:-1,a:-1,msg:'dp[0]=1 (one way to make 0). dp[a] = number of combos for amount a.'});
    coins.forEach(function(c){
      steps.push({dp:dp.slice(),coin:c,a:-1,msg:'Processing coin '+c});
      for(var a=c;a<=amount;a++){
        dp[a]+=dp[a-c];
        steps.push({dp:dp.slice(),coin:c,a:a,msg:'dp['+a+'] += dp['+(a-c)+']('+dp[a-c]+') → '+dp[a]+' combos (coin='+c+')'});
      }
    });
    steps.push({dp:dp.slice(),coin:-1,a:amount,msg:'Combinations for amount '+amount+': '+dp[amount]});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:110,
    approaches:[{key:'dp',label:'2D DP→1D DP O(n·amount)'}],
    inputs:[
      {id:'coins',lbl:'Coins',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defCoins.join(',');i.style.width='90px';return i;})()},
      {id:'amt',lbl:'Amount',elem:(function(){var i=document.createElement('input');i.type='number';i.value=defAmount;i.style.width='55px';return i;})()}
    ],
    onInputs:function(vals){var c=(vals.coins||'').split(',').map(Number).filter(function(x){return x>0;});return buildSteps(c.length?c:defCoins,parseInt(vals.amt)||defAmount);},
    buildSteps:function(){return buildSteps(defCoins,defAmount);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var dp=s.dp,n=dp.length,cw=Math.min(52,Math.floor((W-30)/n)),ch=44,sx=(W-n*cw)/2,sy=18;
      dp.forEach(function(v,i){cell(ctx,sx+i*cw,sy,cw-2,ch,v,i===s.a?'active':v>0?'found':'default');lbl(ctx,i,sx+i*cw+cw/2-1,sy+ch+13,'#4B5563',9,'center');});
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P155 Unique Paths ───────────────────────────────────── */
function initUniquePaths(id){
  var container=document.getElementById(id);if(!container)return;
  var defM=3,defN=7;
  function buildSteps(m,n){
    var dp=Array.from({length:m},function(){return new Array(n).fill(0);}),steps=[];
    for(var c=0;c<n;c++)dp[0][c]=1;
    for(var r=1;r<m;r++)dp[r][0]=1;
    steps.push({dp:dp.map(function(r){return r.slice();}),row:0,col:0,msg:'Top row and left column = 1 (only one path along edges)'});
    for(var r=1;r<m;r++){
      for(var c=1;c<n;c++){
        dp[r][c]=dp[r-1][c]+dp[r][c-1];
        steps.push({dp:dp.map(function(r){return r.slice();}),row:r,col:c,msg:'dp['+r+']['+c+'] = from top ('+dp[r-1][c]+') + from left ('+dp[r][c-1]+') = '+dp[r][c]});
      }
    }
    steps.push({dp:dp.map(function(r){return r.slice();}),row:m-1,col:n-1,msg:'Unique paths from (0,0) to ('+( m-1)+','+(n-1)+'): '+dp[m-1][n-1]});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:190,
    approaches:[{key:'dp',label:'DP O(m·n)'},{key:'math',label:'Math C(m+n−2, m−1)'}],
    inputs:[
      {id:'m',lbl:'m rows',elem:(function(){var i=document.createElement('input');i.type='number';i.value=defM;i.min=1;i.max=8;i.style.width='45px';return i;})()},
      {id:'n',lbl:'n cols',elem:(function(){var i=document.createElement('input');i.type='number';i.value=defN;i.min=1;i.max=10;i.style.width='45px';return i;})()}
    ],
    onInputs:function(vals){return buildSteps(Math.min(8,Math.max(1,parseInt(vals.m)||defM)),Math.min(10,Math.max(1,parseInt(vals.n)||defN)));},
    buildSteps:function(){return buildSteps(defM,defN);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var dp=s.dp,rows=dp.length,cols=dp[0].length;
      var cw=Math.min(48,Math.floor((W-20)/cols)),ch=Math.min(40,Math.floor((H-10)/rows));
      var ox=(W-cols*cw)/2,oy=(H-rows*ch)/2;
      dp.forEach(function(row,r){row.forEach(function(v,c){cell(ctx,ox+c*cw,oy+r*ch,cw-2,ch-2,v||'',r===s.row&&c===s.col?'active':v>0?'sorted':'default');});});
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P156 Longest Increasing Subsequence ─────────────────── */
function initLIS(id){
  var container=document.getElementById(id);if(!container)return;
  var defArr=[10,9,2,5,3,7,101,18];
  function buildSteps(nums){
    var n=nums.length,dp=new Array(n).fill(1),steps=[];
    steps.push({arr:nums,dp:dp.slice(),cur:-1,msg:'dp[i] = LIS ending at index i. All start at 1 (the element itself).'});
    var best=1;
    for(var i=1;i<n;i++){
      for(var j=0;j<i;j++){
        if(nums[j]<nums[i]&&dp[j]+1>dp[i]){dp[i]=dp[j]+1;steps.push({arr:nums,dp:dp.slice(),cur:i,cmp:j,msg:'nums['+j+']='+nums[j]+' < nums['+i+']='+nums[i]+' → dp['+i+']=max('+dp[i]+',dp['+j+']+1)='+dp[i]});}
      }
      if(dp[i]>best)best=dp[i];
      steps.push({arr:nums,dp:dp.slice(),cur:i,msg:'After i='+i+': dp=['+dp.slice(0,i+1).join(',')+'] best='+best});
    }
    steps.push({arr:nums,dp:dp.slice(),cur:-1,msg:'LIS length: '+best});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:140,
    approaches:[{key:'dp',label:'DP O(n²)'},{key:'bs',label:'Binary Search O(n log n)'}],
    inputs:[{id:'arr',lbl:'Array',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defArr.join(',');i.style.width='160px';return i;})()}],
    onInputs:function(vals){var a=(vals.arr||'').split(',').map(Number).filter(function(x){return!isNaN(x);});return buildSteps(a.length?a:defArr.slice());},
    buildSteps:function(){return buildSteps(defArr.slice());},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var a=s.arr||[],n=a.length,cw=Math.min(52,Math.floor((W-30)/n)),ch=38,sx=(W-n*cw)/2;
      a.forEach(function(v,i){cell(ctx,sx+i*cw,12,cw-2,ch,v,i===s.cur?'active':i===s.cmp?'comparing':'default');});
      var dp=s.dp||[];
      dp.forEach(function(v,i){if(v>0)cell(ctx,sx+i*cw,60,cw-2,ch,v,i===s.cur?'found':'sorted');});
      lbl(ctx,'dp',sx-20,80,'#A78BFA',9,'right');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P157 Edit Distance ──────────────────────────────────── */
function initEditDistance(id){
  var container=document.getElementById(id);if(!container)return;
  var defA='horse',defB='ros';
  function buildSteps(a,b){
    var m=a.length,n=b.length,steps=[];
    var dp=Array.from({length:m+1},function(_,i){return Array.from({length:n+1},function(_,j){return i===0?j:j===0?i:0;});});
    steps.push({dp:dp.map(function(r){return r.slice();}),i:0,j:0,msg:'dp[i][j] = min edits to convert a[0..i-1] to b[0..j-1]'});
    for(var i=1;i<=m;i++){
      for(var j=1;j<=n;j++){
        if(a[i-1]===b[j-1]){dp[i][j]=dp[i-1][j-1];steps.push({dp:dp.map(function(r){return r.slice();}),i:i,j:j,msg:'"'+a[i-1]+'"="'+b[j-1]+'" → copy: dp['+i+']['+j+']='+dp[i][j]});}
        else{dp[i][j]=1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);steps.push({dp:dp.map(function(r){return r.slice();}),i:i,j:j,msg:'"'+a[i-1]+'"≠"'+b[j-1]+'" → 1+min(del,ins,rep)='+dp[i][j]});}
      }
    }
    steps.push({dp:dp.map(function(r){return r.slice();}),i:m,j:n,msg:'Edit distance: '+dp[m][n]});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:200,
    approaches:[{key:'dp',label:'DP O(mn)'}],
    inputs:[
      {id:'a',lbl:'Word 1',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defA;i.style.width='80px';return i;})()},
      {id:'b',lbl:'Word 2',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defB;i.style.width='80px';return i;})()}
    ],
    onInputs:function(vals){return buildSteps(vals.a||defA,vals.b||defB);},
    buildSteps:function(){return buildSteps(defA,defB);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var dp=s.dp||[],rows=dp.length,cols=dp[0]?dp[0].length:1;
      var cw=Math.min(34,Math.floor((W-30)/cols)),ch=Math.min(30,Math.floor((H-10)/rows));
      var ox=(W-cols*cw)/2,oy=6;
      dp.forEach(function(row,i){row.forEach(function(v,j){cell(ctx,ox+j*cw,oy+i*ch,cw-1,ch-1,v,i===s.i&&j===s.j?'active':v===0?'water':'default');});});
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P158 Burst Balloons ─────────────────────────────────── */
function initBurstBalloons(id){
  var container=document.getElementById(id);if(!container)return;
  var defArr=[3,1,5,8];
  function buildSteps(nums){
    var arr=[1].concat(nums).concat([1]),n=arr.length,steps=[];
    var dp=Array.from({length:n},function(){return new Array(n).fill(0);});
    steps.push({dp:dp.map(function(r){return r.slice();}),l:0,r:0,k:0,msg:'Interval DP: dp[l][r] = max coins from bursting all balloons strictly between l and r'});
    for(var len=2;len<n;len++){
      for(var l=0;l<n-len;l++){
        var r=l+len;
        for(var k=l+1;k<r;k++){
          var coins=arr[l]*arr[k]*arr[r]+dp[l][k]+dp[k][r];
          if(coins>dp[l][r]){dp[l][r]=coins;steps.push({dp:dp.map(function(r){return r.slice();}),l:l,r:r,k:k,msg:'dp['+l+']['+r+'] k='+k+': '+arr[l]+'×'+arr[k]+'×'+arr[r]+'+'+dp[l][k]+'+'+dp[k][r]+'='+coins});}
        }
      }
    }
    steps.push({dp:dp.map(function(r){return r.slice();}),l:0,r:n-1,k:0,msg:'Max coins: '+dp[0][n-1]});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:200,
    approaches:[{key:'dp',label:'Interval DP O(n³)'}],
    inputs:[{id:'arr',lbl:'Balloons',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defArr.join(',');i.style.width='120px';return i;})()}],
    onInputs:function(vals){var a=(vals.arr||'').split(',').map(Number).filter(function(x){return!isNaN(x);});return buildSteps(a.length?a:defArr.slice());},
    buildSteps:function(){return buildSteps(defArr.slice());},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var dp=s.dp||[],rows=dp.length,cols=rows;
      var cw=Math.min(40,Math.floor((W-20)/cols)),ch=Math.min(34,Math.floor((H-10)/rows));
      var ox=(W-cols*cw)/2,oy=6;
      dp.forEach(function(row,i){row.forEach(function(v,j){var active=(i===s.l&&j===s.r);cell(ctx,ox+j*cw,oy+i*ch,cw-1,ch-1,v||'·',active?'active':v>0?'found':'water');});});
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P159 Regular Expression Matching ────────────────────── */
function initRegexMatching(id){
  var container=document.getElementById(id);if(!container)return;
  var defS='aab',defP='c*a*b';
  function buildSteps(s,p){
    var m=s.length,n=p.length,steps=[];
    var dp=Array.from({length:m+1},function(){return new Array(n+1).fill(false);});
    dp[0][0]=true;
    for(var j=2;j<=n;j++)if(p[j-1]==='*')dp[0][j]=dp[0][j-2];
    steps.push({dp:dp.map(function(r){return r.slice();}),i:0,j:0,msg:'dp[i][j] = does s[0..i-1] match p[0..j-1]?'});
    for(var i=1;i<=m;i++){
      for(var j=1;j<=n;j++){
        if(p[j-1]==='*'){
          dp[i][j]=dp[i][j-2]||(p[j-2]==='.'||p[j-2]===s[i-1])&&dp[i-1][j];
          steps.push({dp:dp.map(function(r){return r.slice();}),i:i,j:j,msg:'"*": zero copies→dp['+i+']['+(j-2)+']='+dp[i][j-2]+', or one-more: '+dp[i][j]});
        }else if(p[j-1]==='.'||p[j-1]===s[i-1]){dp[i][j]=dp[i-1][j-1];steps.push({dp:dp.map(function(r){return r.slice();}),i:i,j:j,msg:'"'+p[j-1]+'" matches "'+s[i-1]+'" → dp='+dp[i][j]});}
        else{steps.push({dp:dp.map(function(r){return r.slice();}),i:i,j:j,msg:'"'+p[j-1]+'" ≠ "'+s[i-1]+'" → false'});}
      }
    }
    steps.push({dp:dp.map(function(r){return r.slice();}),i:m,j:n,msg:'Match result: '+dp[m][n]});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:200,
    approaches:[{key:'dp',label:'DP O(mn)'}],
    inputs:[
      {id:'s',lbl:'String s',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defS;i.style.width='80px';return i;})()},
      {id:'p',lbl:'Pattern p',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defP;i.style.width='80px';return i;})()}
    ],
    onInputs:function(vals){return buildSteps(vals.s||defS,vals.p||defP);},
    buildSteps:function(){return buildSteps(defS,defP);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var dp=s.dp||[],rows=dp.length,cols=dp[0]?dp[0].length:1;
      var cw=Math.min(36,Math.floor((W-20)/cols)),ch=Math.min(32,Math.floor((H-10)/rows));
      var ox=(W-cols*cw)/2,oy=6;
      dp.forEach(function(row,i){row.forEach(function(v,j){cell(ctx,ox+j*cw,oy+i*ch,cw-1,ch-1,v?'T':'F',i===s.i&&j===s.j?'active':v?'found':'water');});});
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P160 Distinct Subsequences ─────────────────────────── */
function initDistinctSubseq(id){
  var container=document.getElementById(id);if(!container)return;
  var defS='rabbbit',defT='rabbit';
  function buildSteps(s,t){
    var m=s.length,n=t.length,steps=[];
    var dp=Array.from({length:m+1},function(){return new Array(n+1).fill(0);});
    for(var i=0;i<=m;i++)dp[i][0]=1;
    steps.push({dp:dp.map(function(r){return r.slice();}),i:0,j:0,msg:'dp[i][j] = ways to form t[0..j-1] using s[0..i-1]. dp[i][0]=1 always (empty t).'});
    for(var i=1;i<=m;i++){
      for(var j=1;j<=n;j++){
        dp[i][j]=dp[i-1][j];
        if(s[i-1]===t[j-1])dp[i][j]+=dp[i-1][j-1];
        steps.push({dp:dp.map(function(r){return r.slice();}),i:i,j:j,msg:'s['+(i-1)+']='+s[i-1]+' '+(s[i-1]===t[j-1]?'= ':'≠ ')+'t['+(j-1)+']='+t[j-1]+' → dp['+i+']['+j+']='+dp[i][j]});
      }
    }
    steps.push({dp:dp.map(function(r){return r.slice();}),i:m,j:n,msg:'Distinct subsequences: '+dp[m][n]});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:200,
    approaches:[{key:'dp',label:'DP O(mn)'}],
    inputs:[
      {id:'s',lbl:'Source s',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defS;i.style.width='100px';return i;})()},
      {id:'t',lbl:'Target t',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defT;i.style.width='100px';return i;})()}
    ],
    onInputs:function(vals){return buildSteps(vals.s||defS,vals.t||defT);},
    buildSteps:function(){return buildSteps(defS,defT);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var dp=s.dp||[],rows=dp.length,cols=dp[0]?dp[0].length:1;
      var cw=Math.min(36,Math.floor((W-20)/cols)),ch=Math.min(30,Math.floor((H-10)/rows));
      var ox=(W-cols*cw)/2,oy=6;
      dp.forEach(function(row,i){row.forEach(function(v,j){cell(ctx,ox+j*cw,oy+i*ch,cw-1,ch-1,v,i===s.i&&j===s.j?'active':v>0?'found':'water');});});
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P161 Word Break ─────────────────────────────────────── */
function initWordBreak(id){
  var container=document.getElementById(id);if(!container)return;
  var defS='leetcode',defDict=['leet','code'];
  function buildSteps(s,dict){
    var n=s.length,dp=new Array(n+1).fill(false),steps=[],set=new Set(dict);
    dp[0]=true;
    steps.push({dp:dp.slice(),cur:-1,msg:'dp[i] = can we segment s[0..i−1]? dp[0]=true (empty prefix).'});
    for(var i=1;i<=n;i++){
      for(var j=0;j<i;j++){
        var word=s.slice(j,i);
        if(dp[j]&&set.has(word)){dp[i]=true;steps.push({dp:dp.slice(),cur:i,from:j,word:word,msg:'s['+j+'..'+i+'−1]="'+word+'" in dict and dp['+j+']=true → dp['+i+']=true'});break;}
      }
      if(!dp[i])steps.push({dp:dp.slice(),cur:i,msg:'No valid split ending at '+i});
    }
    steps.push({dp:dp.slice(),cur:n,msg:'Word break possible: '+dp[n]});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:120,
    approaches:[{key:'dp',label:'DP O(n²)'},{key:'bfs',label:'BFS O(n²)'}],
    inputs:[
      {id:'s',lbl:'String',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defS;i.style.width='110px';return i;})()},
      {id:'dict',lbl:'Dict (comma)',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defDict.join(',');i.style.width='130px';return i;})()}
    ],
    onInputs:function(vals){var d=(vals.dict||'').split(',').map(function(x){return x.trim();}).filter(Boolean);return buildSteps(vals.s||defS,d.length?d:defDict);},
    buildSteps:function(){return buildSteps(defS,defDict);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var dp=s.dp,n=dp.length,cw=Math.min(48,Math.floor((W-30)/n)),ch=40,sx=(W-n*cw)/2,sy=20;
      dp.forEach(function(v,i){cell(ctx,sx+i*cw,sy,cw-2,ch,v?'T':'F',i===s.cur?'active':v?'found':'default');lbl(ctx,i,sx+i*cw+cw/2-1,sy+ch+13,'#4B5563',9,'center');});
      if(s.word)lbl(ctx,'matched: "'+s.word+'"',W/2,sy+ch+30,'#34D399',11,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P162 Palindrome Partitioning ────────────────────────── */
function initPalindromePartitioning(id){
  var container=document.getElementById(id);if(!container)return;
  var defS='aab';
  function buildSteps(s){
    var steps=[],result=[];
    function isPalin(t){return t===t.split('').reverse().join('');}
    function bt(start,path){
      if(start===s.length){result.push(path.slice());steps.push({path:path.slice(),result:result.slice(),msg:'Partition: ['+path.map(function(x){return '"'+x+'"';}).join(',')+']'});return;}
      for(var end=start+1;end<=s.length;end++){
        var sub=s.slice(start,end),ok=isPalin(sub);
        steps.push({path:path.slice(),result:result.slice(),msg:'"'+sub+'" is '+(ok?'palindrome ✓ → branch':'NOT palindrome ✗ → prune')});
        if(ok){path.push(sub);bt(end,path);path.pop();}
      }
    }
    steps.push({path:[],result:[],msg:'Backtrack: try every prefix. Only extend if it\'s a palindrome.'});
    bt(0,[]);
    steps.push({path:[],result:result.slice(),msg:'All partitions: '+result.length+' found'});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:130,
    approaches:[{key:'bt',label:'Backtrack O(n·2ⁿ)'},{key:'dp',label:'DP precompute isPalin'}],
    inputs:[{id:'s',lbl:'String',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defS;i.style.width='90px';return i;})()}],
    onInputs:function(vals){return buildSteps(vals.s||defS);},
    buildSteps:function(){return buildSteps(defS);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var path=s.path||[],n=path.length,cw=Math.min(72,Math.floor((W-40)/Math.max(n,1))),ch=36,sx=(W-n*cw)/2,sy=20;
      path.forEach(function(v,i){cell(ctx,sx+i*cw,sy,cw-2,ch,v,i%2===0?'found':'active');});
      if(!n)lbl(ctx,'building…',W/2,sy+ch/2,'#4B5563',11,'center');
      lbl(ctx,'partitions found: '+(s.result||[]).length,W/2,sy+ch+20,'#A78BFA',11,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P163 Maximum Product Subarray ──────────────────────── */
function initMaxProductSubarray(id){
  var container=document.getElementById(id);if(!container)return;
  var defArr=[2,3,-2,4];
  function buildSteps(nums){
    var steps=[],n=nums.length,maxP=nums[0],minP=nums[0],best=nums[0];
    steps.push({arr:nums,maxP:maxP,minP:minP,best:best,cur:0,msg:'Track both max and min product (negatives flip sign)'});
    for(var i=1;i<n;i++){
      var v=nums[i],candidates=[v,maxP*v,minP*v];
      var newMax=Math.max.apply(null,candidates),newMin=Math.min.apply(null,candidates);
      maxP=newMax;minP=newMin;
      if(maxP>best)best=maxP;
      steps.push({arr:nums,maxP:maxP,minP:minP,best:best,cur:i,msg:'nums['+i+']='+v+' → max='+maxP+', min='+minP+', best='+best});
    }
    steps.push({arr:nums,maxP:maxP,minP:minP,best:best,cur:-1,msg:'Maximum product subarray: '+best});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:120,
    approaches:[{key:'dp',label:'O(n) · O(1) — track max & min'}],
    inputs:[{id:'arr',lbl:'Array',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defArr.join(',');i.style.width='130px';return i;})()}],
    onInputs:function(vals){var a=(vals.arr||'').split(',').map(Number).filter(function(x){return!isNaN(x);});return buildSteps(a.length?a:defArr.slice());},
    buildSteps:function(){return buildSteps(defArr.slice());},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var a=s.arr,n=a.length,cw=Math.min(58,Math.floor((W-40)/n)),ch=40,sx=(W-n*cw)/2,sy=14;
      a.forEach(function(v,i){cell(ctx,sx+i*cw,sy,cw-2,ch,v,i===s.cur?'active':v<0?'comparing':'default');});
      lbl(ctx,'max='+s.maxP+'  min='+s.minP+'  best='+s.best,W/2,sy+ch+22,'#A78BFA',12,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P164 Minimum Path Sum ───────────────────────────────── */
function initMinPathSum(id){
  var container=document.getElementById(id);if(!container)return;
  var defGrid=[[1,3,1],[1,5,1],[4,2,1]];
  function buildSteps(grid){
    var m=grid.length,n=grid[0].length,steps=[];
    var dp=grid.map(function(r){return r.slice();});
    for(var c=1;c<n;c++)dp[0][c]+=dp[0][c-1];
    for(var r=1;r<m;r++)dp[r][0]+=dp[r-1][0];
    steps.push({dp:dp.map(function(r){return r.slice();}),row:0,col:0,msg:'Initialize: first row and column are cumulative sums'});
    for(var r=1;r<m;r++){
      for(var c=1;c<n;c++){
        dp[r][c]+=Math.min(dp[r-1][c],dp[r][c-1]);
        steps.push({dp:dp.map(function(r){return r.slice();}),row:r,col:c,msg:'dp['+r+']['+c+'] = grid+min(up='+dp[r-1][c]+', left='+dp[r][c-1]+') = '+dp[r][c]});
      }
    }
    steps.push({dp:dp.map(function(r){return r.slice();}),row:m-1,col:n-1,msg:'Minimum path sum: '+dp[m-1][n-1]});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:180,
    approaches:[{key:'dp',label:'DP O(m·n) in-place'}],
    inputs:[{id:'grid',lbl:'Grid rows (;-separated)',elem:(function(){var i=document.createElement('input');i.type='text';i.value='1,3,1;1,5,1;4,2,1';i.style.width='160px';return i;})()}],
    onInputs:function(vals){
      try{var g=(vals.grid||'').split(';').map(function(r){return r.split(',').map(Number);});if(g.length&&g[0].length)return buildSteps(g);}catch(e){}
      return buildSteps(defGrid.map(function(r){return r.slice();}));
    },
    buildSteps:function(){return buildSteps(defGrid.map(function(r){return r.slice();}));},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var dp=s.dp||[],rows=dp.length,cols=dp[0].length;
      var cw=Math.min(56,Math.floor((W-20)/cols)),ch=Math.min(46,Math.floor((H-10)/rows));
      var ox=(W-cols*cw)/2,oy=(H-rows*ch)/2;
      dp.forEach(function(row,r){row.forEach(function(v,c){cell(ctx,ox+c*cw,oy+r*ch,cw-2,ch-2,v,r===s.row&&c===s.col?'active':r+c===0?'pivot':'sorted');});});
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P165 Decode Ways ────────────────────────────────────── */
function initDecodeWays(id){
  var container=document.getElementById(id);if(!container)return;
  var defS='226';
  function buildSteps(s){
    var n=s.length,dp=new Array(n+1).fill(0),steps=[];
    dp[0]=1;dp[1]=s[0]==='0'?0:1;
    steps.push({dp:dp.slice(),cur:1,msg:'dp[0]=1, dp[1]='+(s[0]==='0'?0:1)+'. dp[i]=ways to decode s[0..i−1]'});
    for(var i=2;i<=n;i++){
      var one=Number(s[i-1]),two=Number(s.slice(i-2,i));
      if(one>=1&&one<=9)dp[i]+=dp[i-1];
      if(two>=10&&two<=26)dp[i]+=dp[i-2];
      steps.push({dp:dp.slice(),cur:i,one:s[i-1],two:s.slice(i-2,i),msg:'s['+(i-1)+']="'+s[i-1]+'" (+'+dp[i-1]+'?='+(one>=1)+'), "'+s.slice(i-2,i)+'" (+'+dp[i-2]+'?='+(two>=10&&two<=26)+') → dp['+i+']='+dp[i]});
    }
    steps.push({dp:dp.slice(),cur:n,msg:'Total decode ways: '+dp[n]});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:120,
    approaches:[{key:'dp',label:'DP O(n) · O(1) space'}],
    inputs:[{id:'s',lbl:'Digit string',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defS;i.style.width='110px';return i;})()}],
    onInputs:function(vals){return buildSteps(vals.s||defS);},
    buildSteps:function(){return buildSteps(defS);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var dp=s.dp,n=dp.length,cw=Math.min(52,Math.floor((W-30)/n)),ch=40,sx=(W-n*cw)/2,sy=20;
      dp.forEach(function(v,i){cell(ctx,sx+i*cw,sy,cw-2,ch,v,i===s.cur?'active':v>0?'found':'default');lbl(ctx,i,sx+i*cw+cw/2-1,sy+ch+13,'#4B5563',9,'center');});
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P166 Partition Equal Subset Sum ─────────────────────── */
function initPartitionEqualSubset(id){
  var container=document.getElementById(id);if(!container)return;
  var defArr=[1,5,11,5];
  function buildSteps(nums){
    var total=nums.reduce(function(a,b){return a+b;},0),steps=[];
    if(total%2!==0){steps.push({dp:[false],cur:0,msg:'Sum='+total+' is odd → impossible'});return steps;}
    var target=total/2,dp=new Array(target+1).fill(false);
    dp[0]=true;
    steps.push({dp:dp.slice(),cur:-1,msg:'Target = '+target+'. dp[s] = can we form sum s from the numbers?'});
    nums.forEach(function(num){
      for(var s=target;s>=num;s--){
        if(dp[s-num]){dp[s]=true;}
        if(s===target||s===Math.floor(target/2))steps.push({dp:dp.slice(),cur:s,msg:'num='+num+': dp['+s+'] += dp['+(s-num)+'] → '+dp[s]});
      }
    });
    steps.push({dp:dp.slice(),cur:target,msg:'Can partition equally: '+dp[target]});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:110,
    approaches:[{key:'dp',label:'0/1 Knapsack DP O(n·sum)'}],
    inputs:[{id:'arr',lbl:'Numbers',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defArr.join(',');i.style.width='120px';return i;})()}],
    onInputs:function(vals){var a=(vals.arr||'').split(',').map(Number).filter(function(x){return!isNaN(x);});return buildSteps(a.length?a:defArr.slice());},
    buildSteps:function(){return buildSteps(defArr.slice());},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var dp=s.dp,n=dp.length,cw=Math.min(42,Math.floor((W-30)/n)),ch=40,sx=(W-n*cw)/2,sy=20;
      dp.forEach(function(v,i){cell(ctx,sx+i*cw,sy,cw-2,ch,v?'T':'F',i===s.cur?'active':v?'found':'default');lbl(ctx,i,sx+i*cw+cw/2-1,sy+ch+13,'#4B5563',9,'center');});
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P167 Maximal Square ─────────────────────────────────── */
function initMaximalSquare(id){
  var container=document.getElementById(id);if(!container)return;
  var defGrid=[['1','0','1','0','0'],['1','0','1','1','1'],['1','1','1','1','1'],['1','0','0','1','0']];
  function buildSteps(grid){
    var m=grid.length,n=grid[0].length,steps=[];
    var dp=Array.from({length:m},function(){return new Array(n).fill(0);}),best=0,br=-1,bc=-1;
    steps.push({dp:dp.map(function(r){return r.slice();}),row:-1,col:-1,best:0,msg:'dp[r][c] = side length of largest all-1 square with bottom-right at (r,c)'});
    for(var r=0;r<m;r++){
      for(var c=0;c<n;c++){
        if(grid[r][c]==='1'||grid[r][c]===1){
          dp[r][c]=r===0||c===0?1:Math.min(dp[r-1][c],dp[r][c-1],dp[r-1][c-1])+1;
          if(dp[r][c]>best){best=dp[r][c];br=r;bc=c;}
          steps.push({dp:dp.map(function(r){return r.slice();}),row:r,col:c,best:best,msg:'dp['+r+']['+c+']='+dp[r][c]+' (best='+best+'²='+(best*best)+')'});
        }
      }
    }
    steps.push({dp:dp.map(function(r){return r.slice();}),row:br,col:bc,best:best,msg:'Max square area: '+best*best+' (side '+best+')'});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:210,
    approaches:[{key:'dp',label:'DP O(m·n)'}],
    inputs:[{id:'grid',lbl:'Grid (;=row, v=0/1)',elem:(function(){var i=document.createElement('input');i.type='text';i.value='1,0,1,0,0;1,0,1,1,1;1,1,1,1,1;1,0,0,1,0';i.style.width='220px';return i;})()}],
    onInputs:function(vals){
      try{var g=(vals.grid||'').split(';').map(function(r){return r.split(',');});if(g.length)return buildSteps(g);}catch(e){}
      return buildSteps(defGrid);
    },
    buildSteps:function(){return buildSteps(defGrid);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var dp=s.dp||[],rows=dp.length,cols=dp[0]?dp[0].length:1;
      var cw=Math.min(50,Math.floor((W-20)/cols)),ch=Math.min(42,Math.floor((H-16)/rows));
      var ox=(W-cols*cw)/2,oy=8;
      dp.forEach(function(row,r){row.forEach(function(v,c){cell(ctx,ox+c*cw,oy+r*ch,cw-2,ch-2,v||'0',r===s.row&&c===s.col?'active':v>0?'found':'water');});});
      lbl(ctx,'best side: '+s.best+' → area: '+(s.best*s.best),W/2,H-6,'#A78BFA',12,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P168 Stock Buy Sell with Cooldown ───────────────────── */
function initStockCooldown(id){
  var container=document.getElementById(id);if(!container)return;
  var defPrices=[1,2,3,0,2];
  function buildSteps(prices){
    var n=prices.length,steps=[];
    var hold=new Array(n).fill(0),sold=new Array(n).fill(0),rest=new Array(n).fill(0);
    hold[0]=-prices[0];sold[0]=0;rest[0]=0;
    steps.push({hold:hold.slice(),sold:sold.slice(),rest:rest.slice(),cur:0,msg:'States: hold=holding stock, sold=just sold, rest=cooldown/idle'});
    for(var i=1;i<n;i++){
      hold[i]=Math.max(hold[i-1],rest[i-1]-prices[i]);
      sold[i]=hold[i-1]+prices[i];
      rest[i]=Math.max(rest[i-1],sold[i-1]);
      steps.push({hold:hold.slice(),sold:sold.slice(),rest:rest.slice(),cur:i,msg:'day '+i+': hold='+hold[i]+', sold='+sold[i]+', rest='+rest[i]});
    }
    var ans=Math.max(sold[n-1],rest[n-1]);
    steps.push({hold:hold.slice(),sold:sold.slice(),rest:rest.slice(),cur:n-1,msg:'Max profit: '+ans});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:150,
    approaches:[{key:'sm',label:'State Machine O(n) · O(1)'}],
    inputs:[{id:'p',lbl:'Prices',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defPrices.join(',');i.style.width='130px';return i;})()}],
    onInputs:function(vals){var a=(vals.p||'').split(',').map(Number).filter(function(x){return!isNaN(x);});return buildSteps(a.length?a:defPrices.slice());},
    buildSteps:function(){return buildSteps(defPrices.slice());},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var rows=[s.hold||[],s.sold||[],s.rest||[]],labels=['hold','sold','rest'],colors=['comparing','found','sorted'];
      var n=(rows[0]||[]).length,cw=Math.min(48,Math.floor((W-40)/Math.max(n,1))),ch=28,sx=(W-n*cw)/2;
      rows.forEach(function(row,ri){
        lbl(ctx,labels[ri],sx-24,20+ri*ch+ch/2,'#A78BFA',9,'right');
        row.forEach(function(v,i){cell(ctx,sx+i*cw,20+ri*ch,cw-2,ch-2,v,i===s.cur?colors[ri]:'default');});
      });
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P169 Longest Palindromic Substring ─────────────────── */
function initLongestPalinSubstring(id){
  var container=document.getElementById(id);if(!container)return;
  var defS='babad';
  function buildSteps(s){
    var n=s.length,steps=[],best='',bestL=0,bestR=0;
    function expand(l,r){
      while(l>=0&&r<n&&s[l]===s[r]){l--;r++;}
      return s.slice(l+1,r);
    }
    steps.push({s:s,L:-1,R:-1,best:'',msg:'Expand around each center (odd and even length palindromes)'});
    for(var i=0;i<n;i++){
      var odd=expand(i,i),even=expand(i,i+1);
      var longer=odd.length>=even.length?odd:even;
      if(longer.length>best.length){best=longer;bestL=s.indexOf(longer);bestR=bestL+longer.length-1;}
      steps.push({s:s,L:bestL,R:bestR,best:best,cur:i,msg:'Center '+i+': odd="'+odd+'", even="'+even+'" → best="'+best+'"'});
    }
    steps.push({s:s,L:bestL,R:bestR,best:best,msg:'Longest palindromic substring: "'+best+'"'});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:110,
    approaches:[{key:'expand',label:'Expand Centers O(n²)'},{key:'manacher',label:"Manacher's O(n)"}],
    inputs:[{id:'s',lbl:'String',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defS;i.style.width='110px';return i;})()}],
    onInputs:function(vals){return buildSteps(vals.s||defS);},
    buildSteps:function(){return buildSteps(defS);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var str=s.s||'',n=str.length,cw=Math.min(48,Math.floor((W-30)/n)),ch=42,sx=(W-n*cw)/2,sy=16;
      for(var i=0;i<n;i++){
        var inPalin=s.L!==undefined&&s.L>=0&&i>=s.L&&i<=s.R;
        cell(ctx,sx+i*cw,sy,cw-2,ch,str[i],i===s.cur?'pivot':inPalin?'found':'default');
      }
      lbl(ctx,'best: "'+s.best+'"',W/2,sy+ch+18,'#34D399',12,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P170 Target Sum ─────────────────────────────────────── */
function initTargetSum(id){
  var container=document.getElementById(id);if(!container)return;
  var defArr=[1,1,1,1,1],defTarget=3;
  function buildSteps(nums,target){
    var steps=[],count=0;
    function dfs(i,cur){
      if(i===nums.length){if(cur===target)count++;steps.push({arr:nums,idx:i,sum:cur,count:count,msg:(cur===target?'✓ sum='+cur+' = target':'sum='+cur+' ≠ '+target)+' count='+count});return;}
      steps.push({arr:nums,idx:i,sum:cur,count:count,msg:'at ['+i+']='+nums[i]+' cur='+cur+' try +'});
      dfs(i+1,cur+nums[i]);
      steps.push({arr:nums,idx:i,sum:cur,count:count,msg:'at ['+i+']='+nums[i]+' cur='+cur+' try −'});
      dfs(i+1,cur-nums[i]);
    }
    steps.push({arr:nums,idx:-1,sum:0,count:0,msg:'DFS: assign + or − to each number. Reach target='+target+'.'});
    dfs(0,0);
    steps.push({arr:nums,idx:-1,sum:0,count:count,msg:'Ways to reach target '+target+': '+count});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:110,
    approaches:[{key:'dfs',label:'DFS O(2ⁿ)'},{key:'dp',label:'DP O(n·sum)'}],
    inputs:[
      {id:'arr',lbl:'Numbers',elem:(function(){var i=document.createElement('input');i.type='text';i.value=defArr.join(',');i.style.width='100px';return i;})()},
      {id:'target',lbl:'Target',elem:(function(){var i=document.createElement('input');i.type='number';i.value=defTarget;i.style.width='50px';return i;})()}
    ],
    onInputs:function(vals){var a=(vals.arr||'').split(',').map(Number).filter(function(x){return!isNaN(x);});return buildSteps(a.length?a:defArr.slice(),parseInt(vals.target)||defTarget);},
    buildSteps:function(){return buildSteps(defArr.slice(),defTarget);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var a=s.arr||[],n=a.length,cw=Math.min(58,Math.floor((W-40)/n)),ch=40,sx=(W-n*cw)/2,sy=18;
      a.forEach(function(v,i){cell(ctx,sx+i*cw,sy,cw-2,ch,v,i===s.idx?'active':i<s.idx?'sorted':'default');});
      lbl(ctx,'sum='+s.sum+'  ways found: '+s.count,W/2,sy+ch+22,'#A78BFA',12,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P171 Number of Islands ─────────────────────────────── */
function initNumberOfIslands(id){
  var container=document.getElementById(id);if(!container)return;
  var defGrid=[['1','1','0','0','0'],['1','1','0','0','0'],['0','0','1','0','0'],['0','0','0','1','1']];
  function buildSteps(grid){
    var g=grid.map(function(r){return r.slice();}),m=g.length,n=g[0].length,count=0,steps=[];
    steps.push({g:g.map(function(r){return r.slice();}),count:0,msg:'BFS/DFS: for each unvisited "1", flood-fill the island and increment count'});
    function bfs(r,c){
      var q=[[r,c]];g[r][c]='2';
      while(q.length){var rc=q.shift(),cr=rc[0],cc=rc[1];[[cr-1,cc],[cr+1,cc],[cr,cc-1],[cr,cc+1]].forEach(function(p){if(p[0]>=0&&p[0]<m&&p[1]>=0&&p[1]<n&&g[p[0]][p[1]]==='1'){g[p[0]][p[1]]='2';q.push(p);}});}
    }
    for(var r=0;r<m;r++){for(var c=0;c<n;c++){if(g[r][c]==='1'){bfs(r,c);count++;steps.push({g:g.map(function(r){return r.slice();}),count:count,msg:'Island '+count+' found starting at ('+r+','+c+')'});}}}
    steps.push({g:g.map(function(r){return r.slice();}),count:count,msg:'Total islands: '+count});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:200,
    approaches:[{key:'bfs',label:'BFS O(m·n)'},{key:'dfs',label:'DFS O(m·n)'}],
    inputs:[{id:'grid',lbl:'Grid (;=row)',elem:(function(){var i=document.createElement('input');i.type='text';i.value='1,1,0,0;1,1,0,0;0,0,1,0;0,0,0,1';i.style.width='190px';return i;})()}],
    onInputs:function(vals){var g=(vals.grid||'').split(';').map(function(r){return r.split(',');});return buildSteps(g.length?g:defGrid);},
    buildSteps:function(){return buildSteps(defGrid.map(function(r){return r.slice();}));},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var g=s.g||[],rows=g.length,cols=g[0]?g[0].length:1;
      var cw=Math.min(52,Math.floor((W-20)/cols)),ch=Math.min(42,Math.floor((H-24)/rows));
      var ox=(W-cols*cw)/2,oy=8;
      g.forEach(function(row,r){row.forEach(function(v,c){cell(ctx,ox+c*cw,oy+r*ch,cw-2,ch-2,v==='0'?'·':v,v==='2'?'found':v==='1'?'active':'water');});});
      lbl(ctx,'islands: '+s.count,W/2,H-6,'#34D399',13,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P172 Course Schedule ────────────────────────────────── */
function initCourseSchedule(id){
  var container=document.getElementById(id);if(!container)return;
  var defN=4,defPre=[[1,0],[2,0],[3,1],[3,2]];
  function buildSteps(n,pre){
    var adj=Array.from({length:n},function(){return[];}),indeg=new Array(n).fill(0),steps=[];
    pre.forEach(function(p){adj[p[1]].push(p[0]);indeg[p[0]]++;});
    var queue=[],state=new Array(n).fill('default'),order=[];
    for(var i=0;i<n;i++)if(indeg[i]===0){queue.push(i);state[i]='active';}
    steps.push({state:state.slice(),indeg:indeg.slice(),order:[],msg:'Kahn BFS: start with all 0-indegree nodes'});
    while(queue.length){
      var u=queue.shift();order.push(u);state[u]='found';
      adj[u].forEach(function(v){indeg[v]--;if(indeg[v]===0){queue.push(v);state[v]='active';}});
      steps.push({state:state.slice(),indeg:indeg.slice(),order:order.slice(),msg:'Process '+u+' → order=['+order.join(',')+']'});
    }
    var ok=order.length===n;
    steps.push({state:state.slice(),indeg:indeg.slice(),order:order.slice(),msg:ok?'Finished! All '+n+' courses completable ✓':'Cycle detected — '+( n-order.length)+' course(s) stuck ✗'});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:140,
    approaches:[{key:'kahn',label:"Kahn's BFS O(V+E)"},{key:'dfs',label:'DFS cycle detect O(V+E)'}],
    inputs:[
      {id:'n',lbl:'Courses',elem:(function(){var i=document.createElement('input');i.type='number';i.value=defN;i.min=2;i.max=8;i.style.width='45px';return i;})()},
      {id:'pre',lbl:'Prereqs [[a,b],…]',elem:(function(){var i=document.createElement('input');i.type='text';i.value='[1,0],[2,0],[3,1],[3,2]';i.style.width='190px';return i;})()}
    ],
    onInputs:function(vals){var p=[];try{p=JSON.parse('['+vals.pre+']');}catch(e){p=defPre;}return buildSteps(parseInt(vals.n)||defN,p);},
    buildSteps:function(){return buildSteps(defN,defPre);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var state=s.state||[],n=state.length,cw=Math.min(58,Math.floor((W-40)/n)),ch=44,sx=(W-n*cw)/2,sy=20;
      state.forEach(function(st,i){cell(ctx,sx+i*cw,sy,cw-2,ch,i,st);lbl(ctx,'in:'+s.indeg[i],sx+i*cw+cw/2-1,sy+ch+13,'#4B5563',9,'center');});
      lbl(ctx,'order: ['+((s.order||[]).join('→'))+']',W/2,sy+ch+30,'#A78BFA',12,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P173 Pacific Atlantic Water Flow ────────────────────── */
function initPacificAtlantic(id){
  var container=document.getElementById(id);if(!container)return;
  var defH=[[1,2,2,3,5],[3,2,3,4,4],[2,4,5,3,1],[6,7,1,4,5],[5,1,1,2,4]];
  function buildSteps(heights){
    var m=heights.length,n=heights[0].length,steps=[];
    var pac=Array.from({length:m},function(){return new Array(n).fill(false);}),
        atl=Array.from({length:m},function(){return new Array(n).fill(false);});
    function bfs(queue,visited){
      while(queue.length){
        var rc=queue.shift(),r=rc[0],c=rc[1];
        [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].forEach(function(p){
          var nr=p[0],nc=p[1];
          if(nr>=0&&nr<m&&nc>=0&&nc<n&&!visited[nr][nc]&&heights[nr][nc]>=heights[r][c]){visited[nr][nc]=true;queue.push([nr,nc]);}
        });
      }
    }
    var pq=[],aq=[];
    for(var r=0;r<m;r++){pac[r][0]=true;pq.push([r,0]);atl[r][n-1]=true;aq.push([r,n-1]);}
    for(var c=0;c<n;c++){pac[0][c]=true;pq.push([0,c]);atl[m-1][c]=true;aq.push([m-1,c]);}
    steps.push({pac:pac.map(function(r){return r.slice();}),atl:atl.map(function(r){return r.slice();}),msg:'Start BFS from Pacific borders (top, left) and Atlantic borders (bottom, right)'});
    bfs(pq,pac);bfs(aq,atl);
    var result=[];
    for(var r=0;r<m;r++)for(var c=0;c<n;c++)if(pac[r][c]&&atl[r][c])result.push([r,c]);
    steps.push({pac:pac.map(function(r){return r.slice();}),atl:atl.map(function(r){return r.slice();}),result:result,msg:'Cells reachable by BOTH: '+result.length+' cells'});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:210,
    approaches:[{key:'bfs',label:'Multi-source BFS O(m·n)'}],
    inputs:[{id:'h',lbl:'Heights (;=row)',elem:(function(){var i=document.createElement('input');i.type='text';i.value='1,2,2,3,5;3,2,3,4,4;2,4,5,3,1;6,7,1,4,5;5,1,1,2,4';i.style.width='230px';return i;})()}],
    onInputs:function(vals){try{var g=(vals.h||'').split(';').map(function(r){return r.split(',').map(Number);});if(g.length&&g[0].length)return buildSteps(g);}catch(e){}return buildSteps(defH);},
    buildSteps:function(){return buildSteps(defH);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var pac=s.pac||[],atl=s.atl||[],rows=pac.length,cols=pac[0]?pac[0].length:1,res=s.result||[];
      var cw=Math.min(44,Math.floor((W-20)/cols)),ch=Math.min(36,Math.floor((H-18)/rows));
      var ox=(W-cols*cw)/2,oy=8;
      pac.forEach(function(row,r){row.forEach(function(pv,c){
        var av=atl[r]&&atl[r][c];
        var st=pv&&av?'found':pv?'selected':av?'visited':'default';
        cell(ctx,ox+c*cw,oy+r*ch,cw-2,ch-2,defH[r]?defH[r][c]||'':'-',st);
      });});
      lbl(ctx,'■ both  ■ pacific  ■ atlantic   result: '+res.length,W/2,H-5,'#A78BFA',10,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P174 Max Area of Island ─────────────────────────────── */
function initMaxAreaIsland(id){
  var container=document.getElementById(id);if(!container)return;
  var defGrid=[[0,0,1,0,0,0,0,1,0,0],[0,0,0,0,0,0,0,1,1,1],[0,1,1,0,1,0,0,0,0,0],[0,1,0,0,1,1,0,0,1,0],[0,1,0,0,1,1,0,0,0,0],[0,0,0,0,0,0,0,0,0,0],[1,1,0,0,0,0,0,1,1,0],[1,0,0,0,0,0,0,0,0,0]];
  var simpleGrid=[[0,1,1,0],[0,1,0,0],[1,1,0,1],[0,0,0,1]];
  function buildSteps(grid){
    var g=grid.map(function(r){return r.map(Number);}),m=g.length,n=g[0].length,best=0,steps=[];
    steps.push({g:g.map(function(r){return r.slice();}),best:0,msg:'DFS each unvisited 1, count cells, track maximum area'});
    function dfs(r,c){if(r<0||r>=m||c<0||c>=n||g[r][c]!==1)return 0;g[r][c]=2;return 1+dfs(r-1,c)+dfs(r+1,c)+dfs(r,c-1)+dfs(r,c+1);}
    for(var r=0;r<m;r++){for(var c=0;c<n;c++){if(g[r][c]===1){var area=dfs(r,c);if(area>best)best=area;steps.push({g:g.map(function(r){return r.slice();}),best:best,msg:'Island at ('+r+','+c+'): area='+area+', best='+best});}}}
    steps.push({g:g.map(function(r){return r.slice();}),best:best,msg:'Max island area: '+best});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:190,
    approaches:[{key:'dfs',label:'DFS O(m·n)'}],
    inputs:[{id:'grid',lbl:'Grid (;=row)',elem:(function(){var i=document.createElement('input');i.type='text';i.value='0,1,1,0;0,1,0,0;1,1,0,1;0,0,0,1';i.style.width='180px';return i;})()}],
    onInputs:function(vals){var g=(vals.grid||'').split(';').map(function(r){return r.split(',').map(Number);});return buildSteps(g.length&&g[0].length?g:simpleGrid);},
    buildSteps:function(){return buildSteps(simpleGrid.map(function(r){return r.slice();}));},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var g=s.g||[],rows=g.length,cols=g[0]?g[0].length:1;
      var cw=Math.min(52,Math.floor((W-20)/cols)),ch=Math.min(42,Math.floor((H-22)/rows));
      var ox=(W-cols*cw)/2,oy=8;
      g.forEach(function(row,r){row.forEach(function(v,c){cell(ctx,ox+c*cw,oy+r*ch,cw-2,ch-2,v===0?'·':v===2?'★':'1',v===2?'found':v===1?'active':'water');});});
      lbl(ctx,'max area: '+s.best,W/2,H-5,'#34D399',13,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P175 Rotting Oranges ────────────────────────────────── */
function initRottingOranges(id){
  var container=document.getElementById(id);if(!container)return;
  var defGrid=[[2,1,1],[1,1,0],[0,1,1]];
  function buildSteps(grid){
    var g=grid.map(function(r){return r.slice();}),m=g.length,n=g[0].length,steps=[];
    var queue=[],fresh=0;
    for(var r=0;r<m;r++)for(var c=0;c<n;c++){if(g[r][c]===2)queue.push([r,c,0]);if(g[r][c]===1)fresh++;}
    steps.push({g:g.map(function(r){return r.slice();}),time:0,fresh:fresh,msg:'Multi-source BFS from all rotten oranges simultaneously'});
    var time=0;
    while(queue.length){
      var rc=queue.shift(),r=rc[0],c=rc[1],t=rc[2];
      time=Math.max(time,t);
      [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].forEach(function(p){
        var nr=p[0],nc=p[1];
        if(nr>=0&&nr<m&&nc>=0&&nc<n&&g[nr][nc]===1){g[nr][nc]=2;fresh--;queue.push([nr,nc,t+1]);steps.push({g:g.map(function(r){return r.slice();}),time:t+1,fresh:fresh,msg:'Minute '+(t+1)+': orange at ('+nr+','+nc+') rots. Fresh left: '+fresh});}
      });
    }
    steps.push({g:g.map(function(r){return r.slice();}),time:fresh>0?-1:time,fresh:fresh,msg:fresh>0?'Impossible — '+fresh+' fresh orange(s) unreachable':'All rotten in '+time+' minute(s)'});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:185,
    approaches:[{key:'bfs',label:'Multi-source BFS O(m·n)'}],
    inputs:[{id:'grid',lbl:'Grid (;=row)',elem:(function(){var i=document.createElement('input');i.type='text';i.value='2,1,1;1,1,0;0,1,1';i.style.width='140px';return i;})()}],
    onInputs:function(vals){var g=(vals.grid||'').split(';').map(function(r){return r.split(',').map(Number);});return buildSteps(g.length&&g[0].length?g:defGrid);},
    buildSteps:function(){return buildSteps(defGrid.map(function(r){return r.slice();}));},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var g=s.g||[],rows=g.length,cols=g[0]?g[0].length:1;
      var cw=Math.min(64,Math.floor((W-20)/cols)),ch=Math.min(52,Math.floor((H-24)/rows));
      var ox=(W-cols*cw)/2,oy=10;
      g.forEach(function(row,r){row.forEach(function(v,c){cell(ctx,ox+c*cw,oy+r*ch,cw-2,ch-2,v===0?'·':v===1?'🍊':'💀',v===2?'found':v===1?'active':'water');});});
      lbl(ctx,'minute: '+s.time+'  fresh left: '+s.fresh,W/2,H-5,'#A78BFA',12,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P176 Clone Graph ────────────────────────────────────── */
function initCloneGraph(id){
  var container=document.getElementById(id);if(!container)return;
  var defAdj=[[2,4],[1,3],[2,4],[1,3]];
  function buildSteps(adj){
    var n=adj.length,steps=[],cloned=new Array(n+1).fill(false),order=[];
    steps.push({cloned:cloned.slice(),order:[],msg:'BFS from node 1: clone each node on first visit, then clone all edges'});
    var queue=[1];cloned[1]=true;
    while(queue.length){
      var u=queue.shift();order.push(u);
      adj[u-1].forEach(function(v){if(!cloned[v]){cloned[v]=true;queue.push(v);}});
      steps.push({cloned:cloned.slice(),order:order.slice(),cur:u,msg:'Clone node '+u+' → neighbors: ['+adj[u-1].join(',')+']'});
    }
    steps.push({cloned:cloned.slice(),order:order.slice(),msg:'All '+n+' nodes cloned with edges preserved'});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:140,
    approaches:[{key:'bfs',label:'BFS O(V+E)'},{key:'dfs',label:'DFS + HashMap O(V+E)'}],
    inputs:[{id:'adj',lbl:'Adjacency [[neighbors],…]',elem:(function(){var i=document.createElement('input');i.type='text';i.value='[2,4],[1,3],[2,4],[1,3]';i.style.width='200px';return i;})()}],
    onInputs:function(vals){try{var a=JSON.parse('['+vals.adj+']');return buildSteps(a);}catch(e){return buildSteps(defAdj);}},
    buildSteps:function(){return buildSteps(defAdj);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var n=s.cloned.length-1,cw=Math.min(58,Math.floor((W-40)/Math.max(n,1))),ch=44,sx=(W-n*cw)/2,sy=20;
      for(var i=1;i<=n;i++){cell(ctx,sx+(i-1)*cw,sy,cw-2,ch,i,i===s.cur?'active':s.cloned[i]?'found':'default');}
      lbl(ctx,'cloned: ['+((s.order||[]).join('→'))+']',W/2,sy+ch+22,'#A78BFA',12,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P177 Number of Connected Components ─────────────────── */
function initConnectedComponents(id){
  var container=document.getElementById(id);if(!container)return;
  var defN=5,defEdges=[[0,1],[1,2],[3,4]];
  function buildSteps(n,edges){
    var parent=Array.from({length:n},function(_,i){return i;}),rank=new Array(n).fill(0),components=n,steps=[];
    function find(x){while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x];}return x;}
    function union(a,b){var pa=find(a),pb=find(b);if(pa===pb)return false;if(rank[pa]<rank[pb]){var t=pa;pa=pb;pb=t;}parent[pb]=pa;if(rank[pa]===rank[pb])rank[pa]++;components--;return true;}
    steps.push({parent:parent.slice(),comp:components,msg:'Union-Find: start with '+n+' components (one per node)'});
    edges.forEach(function(e){
      var merged=union(e[0],e[1]);
      if(merged)components=components;
      steps.push({parent:parent.slice(),comp:components,cur:e,msg:'Union('+e[0]+','+e[1]+'): '+(merged?'merged → '+components+' components':'already same component')});
    });
    steps.push({parent:parent.slice(),comp:components,msg:'Connected components: '+components});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:130,
    approaches:[{key:'uf',label:'Union-Find O(α·n)'},{key:'dfs',label:'DFS O(V+E)'}],
    inputs:[
      {id:'n',lbl:'Nodes',elem:(function(){var i=document.createElement('input');i.type='number';i.value=defN;i.min=2;i.max=8;i.style.width='45px';return i;})()},
      {id:'edges',lbl:'Edges [[a,b],…]',elem:(function(){var i=document.createElement('input');i.type='text';i.value='[0,1],[1,2],[3,4]';i.style.width='180px';return i;})()}
    ],
    onInputs:function(vals){var e=[];try{e=JSON.parse('['+vals.edges+']');}catch(ex){e=defEdges;}return buildSteps(parseInt(vals.n)||defN,e);},
    buildSteps:function(){return buildSteps(defN,defEdges);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var par=s.parent||[],n=par.length,cw=Math.min(58,Math.floor((W-40)/n)),ch=44,sx=(W-n*cw)/2,sy=18;
      par.forEach(function(p,i){var isRoot=p===i;cell(ctx,sx+i*cw,sy,cw-2,ch,i,s.cur&&(i===s.cur[0]||i===s.cur[1])?'active':isRoot?'found':'sorted');lbl(ctx,'→'+p,sx+i*cw+cw/2-1,sy+ch+13,'#4B5563',9,'center');});
      lbl(ctx,'components: '+s.comp,W/2,sy+ch+28,'#A78BFA',13,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P178 Redundant Connection ───────────────────────────── */
function initRedundantConnection(id){
  var container=document.getElementById(id);if(!container)return;
  var defEdges=[[1,2],[1,3],[2,3]];
  function buildSteps(edges){
    var n=edges.length,parent=Array.from({length:n+1},function(_,i){return i;}),steps=[],result=null;
    function find(x){while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x];}return x;}
    steps.push({parent:parent.slice(),result:null,msg:'Union-Find: add edges one by one. If both endpoints already share a root, this edge is redundant.'});
    edges.forEach(function(e){
      var pa=find(e[0]),pb=find(e[1]);
      if(pa===pb){result=e;steps.push({parent:parent.slice(),result:e,msg:'Edge ['+e[0]+','+e[1]+']: both root='+pa+' → REDUNDANT ✓'});}
      else{parent[pb]=pa;steps.push({parent:parent.slice(),result:null,cur:e,msg:'Edge ['+e[0]+','+e[1]+']: union '+pa+' + '+pb+' → OK'});}
    });
    steps.push({parent:parent.slice(),result:result,msg:'Redundant edge: ['+( result||[])+']'});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:130,
    approaches:[{key:'uf',label:'Union-Find O(n·α)'}],
    inputs:[{id:'edges',lbl:'Edges [[a,b],…]',elem:(function(){var i=document.createElement('input');i.type='text';i.value='[1,2],[1,3],[2,3]';i.style.width='180px';return i;})()}],
    onInputs:function(vals){var e=[];try{e=JSON.parse('['+vals.edges+']');}catch(ex){e=defEdges;}return buildSteps(e);},
    buildSteps:function(){return buildSteps(defEdges);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var par=s.parent||[],n=par.length,cw=Math.min(54,Math.floor((W-40)/n)),ch=42,sx=(W-n*cw)/2,sy=18;
      par.forEach(function(p,i){if(i===0)return;var isRoot=p===i;cell(ctx,sx+(i-1)*cw,sy,cw-2,ch,i,s.cur&&(i===s.cur[0]||i===s.cur[1])?'active':s.result&&(i===s.result[0]||i===s.result[1])?'pivot':isRoot?'found':'sorted');lbl(ctx,'→'+p,sx+(i-1)*cw+cw/2-1,sy+ch+13,'#4B5563',9,'center');});
      if(s.result)lbl(ctx,'redundant: ['+s.result.join(',')+']',W/2,sy+ch+28,'#F87171',13,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P179 Graph Valid Tree ───────────────────────────────── */
function initGraphValidTree(id){
  var container=document.getElementById(id);if(!container)return;
  var defN=5,defEdges=[[0,1],[0,2],[0,3],[1,4]];
  function buildSteps(n,edges){
    var parent=Array.from({length:n},function(_,i){return i;}),steps=[],hasCycle=false;
    function find(x){while(parent[x]!==x){parent[x]=parent[parent[x]];x=parent[x];}return x;}
    steps.push({parent:parent.slice(),ok:null,msg:'Valid tree: n−1 edges, no cycle, all connected'});
    if(edges.length!==n-1){steps.push({parent:parent.slice(),ok:false,msg:'Edge count '+edges.length+' ≠ n−1='+(n-1)+' → NOT a tree'});return steps;}
    for(var i=0;i<edges.length;i++){
      var e=edges[i],pa=find(e[0]),pb=find(e[1]);
      if(pa===pb){hasCycle=true;steps.push({parent:parent.slice(),ok:false,cur:e,msg:'Cycle: ['+e[0]+','+e[1]+'] already connected → NOT a tree'});break;}
      parent[pb]=pa;steps.push({parent:parent.slice(),ok:null,cur:e,msg:'Add edge ['+e[0]+','+e[1]+'] → OK'});
    }
    if(!hasCycle)steps.push({parent:parent.slice(),ok:true,msg:'No cycle + n−1 edges → VALID TREE ✓'});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:130,
    approaches:[{key:'uf',label:'Union-Find O(n·α)'},{key:'dfs',label:'DFS cycle check O(V+E)'}],
    inputs:[
      {id:'n',lbl:'Nodes',elem:(function(){var i=document.createElement('input');i.type='number';i.value=defN;i.min=2;i.max=8;i.style.width='45px';return i;})()},
      {id:'edges',lbl:'Edges [[a,b],…]',elem:(function(){var i=document.createElement('input');i.type='text';i.value='[0,1],[0,2],[0,3],[1,4]';i.style.width='180px';return i;})()}
    ],
    onInputs:function(vals){var e=[];try{e=JSON.parse('['+vals.edges+']');}catch(ex){e=defEdges;}return buildSteps(parseInt(vals.n)||defN,e);},
    buildSteps:function(){return buildSteps(defN,defEdges);},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var par=s.parent||[],n=par.length,cw=Math.min(58,Math.floor((W-40)/n)),ch=44,sx=(W-n*cw)/2,sy=18;
      par.forEach(function(p,i){cell(ctx,sx+i*cw,sy,cw-2,ch,i,s.cur&&(i===s.cur[0]||i===s.cur[1])?'active':p===i?'found':'sorted');lbl(ctx,'→'+p,sx+i*cw+cw/2-1,sy+ch+13,'#4B5563',9,'center');});
      var msg=s.ok===true?'✓ Valid Tree':s.ok===false?'✗ Not a Tree':'checking…';
      lbl(ctx,msg,W/2,sy+ch+28,s.ok===true?'#34D399':s.ok===false?'#F87171':'#A78BFA',13,'center');
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── P180 Surrounded Regions ─────────────────────────────── */
function initSurroundedRegions(id){
  var container=document.getElementById(id);if(!container)return;
  var defBoard=[['X','X','X','X'],['X','O','O','X'],['X','X','O','X'],['X','O','X','X']];
  function buildSteps(board){
    var g=board.map(function(r){return r.slice();}),m=g.length,n=g[0].length,steps=[];
    steps.push({g:g.map(function(r){return r.slice();}),msg:'Step 1: BFS from all border O\'s — mark them safe (S)'});
    function bfs(r,c){var q=[[r,c]];g[r][c]='S';while(q.length){var p=q.shift(),pr=p[0],pc=p[1];[[pr-1,pc],[pr+1,pc],[pr,pc-1],[pr,pc+1]].forEach(function(pp){if(pp[0]>=0&&pp[0]<m&&pp[1]>=0&&pp[1]<n&&g[pp[0]][pp[1]]==='O'){g[pp[0]][pp[1]]='S';q.push(pp);}});}}
    for(var r=0;r<m;r++){if(g[r][0]==='O')bfs(r,0);if(g[r][n-1]==='O')bfs(r,n-1);}
    for(var c=0;c<n;c++){if(g[0][c]==='O')bfs(0,c);if(g[m-1][c]==='O')bfs(m-1,c);}
    steps.push({g:g.map(function(r){return r.slice();}),msg:'Step 2: remaining O\'s are surrounded — flip to X. S → O (restore safe cells)'});
    for(var r=0;r<m;r++)for(var c=0;c<n;c++){if(g[r][c]==='O')g[r][c]='X';else if(g[r][c]==='S')g[r][c]='O';}
    steps.push({g:g.map(function(r){return r.slice();}),msg:'Done: all surrounded O\'s flipped to X'});
    return steps;
  }
  makeProbUI(container,{canvasW:560,canvasH:200,
    approaches:[{key:'bfs',label:'BFS from borders O(m·n)'}],
    inputs:[{id:'grid',lbl:'Board (;=row)',elem:(function(){var i=document.createElement('input');i.type='text';i.value='X,X,X,X;X,O,O,X;X,X,O,X;X,O,X,X';i.style.width='200px';return i;})()}],
    onInputs:function(vals){var g=(vals.grid||'').split(';').map(function(r){return r.split(',');});return buildSteps(g.length&&g[0].length?g:defBoard.map(function(r){return r.slice();}));},
    buildSteps:function(){return buildSteps(defBoard.map(function(r){return r.slice();}));},
    onStep:function(s,ctx,W,H){
      bg(ctx,W,H);
      var g=s.g||[],rows=g.length,cols=g[0]?g[0].length:1;
      var cw=Math.min(60,Math.floor((W-20)/cols)),ch=Math.min(48,Math.floor((H-20)/rows));
      var ox=(W-cols*cw)/2,oy=10;
      g.forEach(function(row,r){row.forEach(function(v,c){cell(ctx,ox+c*cw,oy+r*ch,cw-2,ch-2,v,v==='X'?'water':v==='S'?'visited':'found');});});
    },
    onReset:function(ctx,W,H){bg(ctx,W,H);}
  });
}

/* ── Export ────────────────────────────────────────────────── */
window.DSAProbs={
  twoSum:initTwoSum,
  bestStock:initBestStock,
  validParens:initValidParens,
  longestSubstr:initLongestSubstr,
  climbingStairs:initClimbingStairs,
  coinChange:initCoinChange,
  mergeIntervals:initMergeIntervals,
  numIslands:initNumIslands,
  fibonacci:initFibonacci,
  houseRobber:initHouseRobber,
  subsets:initSubsets,
  permutations:initPermutations,
  binarySearch:initBinarySearch,
  maxSubarray:initMaxSubarray,
  threeSum:initThreeSum,
  lcs:initLCS,
  productExceptSelf:initProductExceptSelf,
  containerWater:initContainerWater,
  jumpGame:initJumpGame,
  combinationSum:initCombinationSum,
  validPalindrome:initValidPalindrome,
  trappingRain:initTrappingRain,
  wordBreak:initWordBreak,
  findMinRotated:initFindMinRotated,
  reverseLinkedList:initReverseLinkedList,
  spiralMatrix:initSpiralMatrix,
  topKFrequent:initTopKFrequent,
  longestPalindrome:initLongestPalindrome,
  maxDepthTree:initMaxDepthTree,
  generateParentheses:initGenerateParentheses,
  meetingRooms:initMeetingRooms,
  rotateArray:initRotateArray,
  linkedListCycle:initLinkedListCycle,
  mergeSortedLists:initMergeSortedLists,
  searchRotatedArray:initSearchRotatedArray,
  courseSchedule:initCourseSchedule,
  invertBinaryTree:initInvertBinaryTree,
  levelOrderTraversal:initLevelOrderTraversal,
  minStack:initMinStack,
  evalRPN:initEvalRPN,
  numberOf1Bits:initNumberOf1Bits,
  missingNumber:initMissingNumber,
  removeNthFromEnd:initRemoveNthFromEnd,
  longestConsecutive:initLongestConsecutive,
  maxProductSubarray:initMaxProductSubarray,
  balancedBinaryTree:initBalancedBinaryTree,
  diameterBinaryTree:initDiameterBinaryTree,
  sameTree:initSameTree,
  subtreeCheck:initSubtreeCheck,
  rightSideView:initRightSideView,
  countGoodNodes:initCountGoodNodes,
  kthSmallestBST:initKthSmallestBST,
  lcaOfBST:initLCAofBST,
  wordSearch:initWordSearch,
  reorderList:initReorderList,
  mergeKLists:initMergeKLists,
  cloneGraph:initCloneGraph,
  pacificAtlantic:initPacificAtlantic,
  rottingOranges:initRottingOranges,
  connectedComponents:initConnectedComponents,
  lis:initLIS,
  uniquePaths:initUniquePaths,
  editDistance:initEditDistance,
  coinChangeII:initCoinChangeII,
  partitionSubset:initPartitionSubset,
  houseRobberII:initHouseRobberII,
  trie:initTrie,
  findMedian:initFindMedian,
  decodeWays:initDecodeWays,
  jumpGameII:initJumpGameII,
  kthLargest:initKthLargest,
  taskScheduler:initTaskScheduler,
  gasStation:initGasStation,
  nonOverlappingIntervals:initNonOverlappingIntervals,
  palindromicSubstrings:initPalindromicSubstrings,
  minWindowSubstring:initMinWindowSubstring,
  maxPathSum:initMaxPathSum,
  constructBinaryTree:initConstructBinaryTree,
  letterCombinations:initLetterCombinations,
  rotateImage:initRotateImage,
  setMatrixZeroes:initSetMatrixZeroes,
  longestPalinSubseq:initLongestPalinSubseq,
  singleNumber:initSingleNumber,
  countingBits:initCountingBits,
  sumTwoIntegers:initSumTwoIntegers,
  happyNumber:initHappyNumber,
  palinPartition:initPalinPartition,
  subsetsII:initSubsetsII,
  insertInterval:initInsertInterval,
  reverseBits:initReverseBits,
  minCostPoints:initMinCostPoints,
  networkDelay:initNetworkDelay,
  redundantConnection:initRedundantConnection,
  burstBalloons:initBurstBalloons,
  regexMatch:initRegexMatch,
  wordDictionary:initWordDictionary,
  wordLadder:initWordLadder,
  largestRectHistogram:initLargestRectHistogram,
  longestPathMatrix:initLongestPathMatrix,
  findDuplicate:initFindDuplicate,
  containsDuplicate:initContainsDuplicate,
  validAnagram:initValidAnagram,
  groupAnagrams:initGroupAnagrams,
  twoSumII:initTwoSumII,
  longestRepeatingReplace:initLongestRepeatingReplace,
  permutationInString:initPermutationInString,
  dailyTemperatures:initDailyTemperatures,
  carFleet:initCarFleet,
  kokoEating:initKokoEating,
  searchMatrix:initSearchMatrix,
  validateBST:initValidateBST,
  lcaBinaryTree:initLCABinaryTree,
  serializeTree:initSerializeTree,
  reverseKGroup:initReverseKGroup,
  copyListRandom:initCopyListRandom,
  lruCache:initLRUCache,
  combinationSumII:initCombinationSumII,
  nQueens:initNQueens,
  lastStoneWeight:initLastStoneWeight,
  slidingWindowMax:initSlidingWindowMax,
  kClosestPoints:initKClosestPoints,
  timeBasedKV:initTimeBasedKV,
  cheapestFlights:initCheapestFlights,
  alienDictionary:initAlienDictionary,
  handOfStraights:initHandOfStraights,
  partitionLabels:initPartitionLabels,
  validParenString:initValidParenString,
  mergeTriplets:initMergeTriplets,
  meetingRoomsII:initMeetingRoomsII,
  powXN:initPowXN,
  wordSearchII:initWordSearchII,
  reconstructItinerary:initReconstructItinerary,
  sortColors:initSortColors,
  largestNumber:initLargestNumber,
  medianTwoArrays:initMedianTwoArrays,
  minArrows:initMinArrows,
  rotateList:initRotateList,
  kSmallestPairs:initKSmallestPairs,
  pathSumII:initPathSumII,
  countGoodTriplets:initCountGoodTriplets,
  flattenTree:initFlattenTree,
  symmetricTree:initSymmetricTree,
  zigzagLevelOrder:initZigzagLevelOrder,
  decodeString:initDecodeString,
  nextPermutation:initNextPermutation,
  findAllAnagrams:initFindAllAnagrams,
  jumpGameIII:initJumpGameIII,
  maxProductWordLengths:initMaxProductWordLengths,
  pascalTriangle:initPascalTriangle,
  minIntervalQuery:initMinIntervalQuery,
  climbingStairs:initClimbingStairs,
  houseRobber:initHouseRobber,
  lcsII:initLCSII,
  coinChangeII:initCoinChangeII,
  uniquePaths:initUniquePaths,
  lis:initLIS,
  editDistance:initEditDistance,
  burstBalloons:initBurstBalloons,
  regexMatching:initRegexMatching,
  distinctSubseq:initDistinctSubseq,
  wordBreak:initWordBreak,
  palindromePartitioning:initPalindromePartitioning,
  maxProductSubarray:initMaxProductSubarray,
  minPathSum:initMinPathSum,
  decodeWays:initDecodeWays,
  partitionEqualSubset:initPartitionEqualSubset,
  maximalSquare:initMaximalSquare,
  stockCooldown:initStockCooldown,
  longestPalinSubstring:initLongestPalinSubstring,
  targetSum:initTargetSum,
  numberOfIslands:initNumberOfIslands,
  courseSchedule:initCourseSchedule,
  pacificAtlantic:initPacificAtlantic,
  maxAreaIsland:initMaxAreaIsland,
  rottingOranges:initRottingOranges,
  cloneGraph:initCloneGraph,
  connectedComponents:initConnectedComponents,
  redundantConnection:initRedundantConnection,
  graphValidTree:initGraphValidTree,
  surroundedRegions:initSurroundedRegions,
};

/* Auto-init problems.html inline demos if present */
(function(){
  function run(){
    if(document.getElementById('prob-two-sum'))initTwoSum('prob-two-sum');
    if(document.getElementById('prob-best-stock'))initBestStock('prob-best-stock');
    if(document.getElementById('prob-valid-parens'))initValidParens('prob-valid-parens');
    if(document.getElementById('prob-longest-substr'))initLongestSubstr('prob-longest-substr');
    if(document.getElementById('prob-climbing-stairs'))initClimbingStairs('prob-climbing-stairs');
    if(document.getElementById('prob-coin-change'))initCoinChange('prob-coin-change');
    if(document.getElementById('prob-merge-intervals'))initMergeIntervals('prob-merge-intervals');
    if(document.getElementById('prob-num-islands'))initNumIslands('prob-num-islands');
    if(document.getElementById('prob-fibonacci'))initFibonacci('prob-fibonacci');
    if(document.getElementById('prob-house-robber'))initHouseRobber('prob-house-robber');
    if(document.getElementById('prob-subsets'))initSubsets('prob-subsets');
    if(document.getElementById('prob-permutations'))initPermutations('prob-permutations');
    if(document.getElementById('prob-binary-search'))initBinarySearch('prob-binary-search');
    if(document.getElementById('prob-max-subarray'))initMaxSubarray('prob-max-subarray');
    if(document.getElementById('prob-three-sum'))initThreeSum('prob-three-sum');
    if(document.getElementById('prob-lcs'))initLCS('prob-lcs');
    if(document.getElementById('prob-product-except-self'))initProductExceptSelf('prob-product-except-self');
    if(document.getElementById('prob-container-water'))initContainerWater('prob-container-water');
    if(document.getElementById('prob-jump-game'))initJumpGame('prob-jump-game');
    if(document.getElementById('prob-combination-sum'))initCombinationSum('prob-combination-sum');
    if(document.getElementById('prob-valid-palindrome'))initValidPalindrome('prob-valid-palindrome');
    if(document.getElementById('prob-trapping-rain'))initTrappingRain('prob-trapping-rain');
    if(document.getElementById('prob-word-break'))initWordBreak('prob-word-break');
    if(document.getElementById('prob-find-min-rotated'))initFindMinRotated('prob-find-min-rotated');
    if(document.getElementById('prob-reverse-linked-list'))initReverseLinkedList('prob-reverse-linked-list');
    if(document.getElementById('prob-spiral-matrix'))initSpiralMatrix('prob-spiral-matrix');
    if(document.getElementById('prob-top-k-frequent'))initTopKFrequent('prob-top-k-frequent');
    if(document.getElementById('prob-longest-palindrome'))initLongestPalindrome('prob-longest-palindrome');
    if(document.getElementById('prob-max-depth-tree'))initMaxDepthTree('prob-max-depth-tree');
    if(document.getElementById('prob-generate-parens'))initGenerateParentheses('prob-generate-parens');
    if(document.getElementById('prob-meeting-rooms'))initMeetingRooms('prob-meeting-rooms');
    if(document.getElementById('prob-rotate-array'))initRotateArray('prob-rotate-array');
    if(document.getElementById('prob-linked-list-cycle'))initLinkedListCycle('prob-linked-list-cycle');
    if(document.getElementById('prob-merge-sorted-lists'))initMergeSortedLists('prob-merge-sorted-lists');
    if(document.getElementById('prob-search-rotated'))initSearchRotatedArray('prob-search-rotated');
    if(document.getElementById('prob-course-schedule'))initCourseSchedule('prob-course-schedule');
    if(document.getElementById('prob-invert-tree'))initInvertBinaryTree('prob-invert-tree');
    if(document.getElementById('prob-level-order'))initLevelOrderTraversal('prob-level-order');
    if(document.getElementById('prob-min-stack'))initMinStack('prob-min-stack');
    if(document.getElementById('prob-eval-rpn'))initEvalRPN('prob-eval-rpn');
    if(document.getElementById('prob-num-1-bits'))initNumberOf1Bits('prob-num-1-bits');
    if(document.getElementById('prob-missing-number'))initMissingNumber('prob-missing-number');
    if(document.getElementById('prob-remove-nth'))initRemoveNthFromEnd('prob-remove-nth');
    if(document.getElementById('prob-longest-consecutive'))initLongestConsecutive('prob-longest-consecutive');
    if(document.getElementById('prob-max-product'))initMaxProductSubarray('prob-max-product');
    if(document.getElementById('prob-balanced-tree'))initBalancedBinaryTree('prob-balanced-tree');
    if(document.getElementById('prob-diameter-tree'))initDiameterBinaryTree('prob-diameter-tree');
    if(document.getElementById('prob-same-tree'))initSameTree('prob-same-tree');
    if(document.getElementById('prob-subtree'))initSubtreeCheck('prob-subtree');
    if(document.getElementById('prob-right-side-view'))initRightSideView('prob-right-side-view');
    if(document.getElementById('prob-count-good-nodes'))initCountGoodNodes('prob-count-good-nodes');
    if(document.getElementById('prob-kth-smallest'))initKthSmallestBST('prob-kth-smallest');
    if(document.getElementById('prob-lca-bst'))initLCAofBST('prob-lca-bst');
    if(document.getElementById('prob-word-search'))initWordSearch('prob-word-search');
    if(document.getElementById('prob-reorder-list'))initReorderList('prob-reorder-list');
    if(document.getElementById('prob-merge-k-lists'))initMergeKLists('prob-merge-k-lists');
    if(document.getElementById('prob-clone-graph'))initCloneGraph('prob-clone-graph');
    if(document.getElementById('prob-pacific-atlantic'))initPacificAtlantic('prob-pacific-atlantic');
    if(document.getElementById('prob-rotting-oranges'))initRottingOranges('prob-rotting-oranges');
    if(document.getElementById('prob-connected-components'))initConnectedComponents('prob-connected-components');
    if(document.getElementById('prob-lis'))initLIS('prob-lis');
    if(document.getElementById('prob-unique-paths'))initUniquePaths('prob-unique-paths');
    if(document.getElementById('prob-edit-distance'))initEditDistance('prob-edit-distance');
    if(document.getElementById('prob-coin-change-ii'))initCoinChangeII('prob-coin-change-ii');
    if(document.getElementById('prob-partition-subset'))initPartitionSubset('prob-partition-subset');
    if(document.getElementById('prob-house-robber-ii'))initHouseRobberII('prob-house-robber-ii');
    if(document.getElementById('prob-trie'))initTrie('prob-trie');
    if(document.getElementById('prob-find-median'))initFindMedian('prob-find-median');
    if(document.getElementById('prob-decode-ways'))initDecodeWays('prob-decode-ways');
    if(document.getElementById('prob-jump-game-ii'))initJumpGameII('prob-jump-game-ii');
    if(document.getElementById('prob-kth-largest'))initKthLargest('prob-kth-largest');
    if(document.getElementById('prob-task-scheduler'))initTaskScheduler('prob-task-scheduler');
    if(document.getElementById('prob-gas-station'))initGasStation('prob-gas-station');
    if(document.getElementById('prob-non-overlapping'))initNonOverlappingIntervals('prob-non-overlapping');
    if(document.getElementById('prob-palindromic-substrings'))initPalindromicSubstrings('prob-palindromic-substrings');
    if(document.getElementById('prob-min-window'))initMinWindowSubstring('prob-min-window');
    if(document.getElementById('prob-max-path-sum'))initMaxPathSum('prob-max-path-sum');
    if(document.getElementById('prob-construct-bt'))initConstructBinaryTree('prob-construct-bt');
    if(document.getElementById('prob-letter-combinations'))initLetterCombinations('prob-letter-combinations');
    if(document.getElementById('prob-rotate-image'))initRotateImage('prob-rotate-image');
    if(document.getElementById('prob-set-matrix-zeroes'))initSetMatrixZeroes('prob-set-matrix-zeroes');
    if(document.getElementById('prob-longest-palin-subseq'))initLongestPalinSubseq('prob-longest-palin-subseq');
    if(document.getElementById('prob-single-number'))initSingleNumber('prob-single-number');
    if(document.getElementById('prob-counting-bits'))initCountingBits('prob-counting-bits');
    if(document.getElementById('prob-sum-two-integers'))initSumTwoIntegers('prob-sum-two-integers');
    if(document.getElementById('prob-happy-number'))initHappyNumber('prob-happy-number');
    if(document.getElementById('prob-palin-partition'))initPalinPartition('prob-palin-partition');
    if(document.getElementById('prob-subsets-ii'))initSubsetsII('prob-subsets-ii');
    if(document.getElementById('prob-insert-interval'))initInsertInterval('prob-insert-interval');
    if(document.getElementById('prob-reverse-bits'))initReverseBits('prob-reverse-bits');
    if(document.getElementById('prob-min-cost-points'))initMinCostPoints('prob-min-cost-points');
    if(document.getElementById('prob-network-delay'))initNetworkDelay('prob-network-delay');
    if(document.getElementById('prob-redundant-connection'))initRedundantConnection('prob-redundant-connection');
    if(document.getElementById('prob-burst-balloons'))initBurstBalloons('prob-burst-balloons');
    if(document.getElementById('prob-regex-match'))initRegexMatch('prob-regex-match');
    if(document.getElementById('prob-word-dict'))initWordDictionary('prob-word-dict');
    if(document.getElementById('prob-word-ladder'))initWordLadder('prob-word-ladder');
    if(document.getElementById('prob-largest-rect-hist'))initLargestRectHistogram('prob-largest-rect-hist');
    if(document.getElementById('prob-longest-path-matrix'))initLongestPathMatrix('prob-longest-path-matrix');
    if(document.getElementById('prob-find-duplicate'))initFindDuplicate('prob-find-duplicate');
    if(document.getElementById('prob-contains-dup'))initContainsDuplicate('prob-contains-dup');
    if(document.getElementById('prob-valid-anagram'))initValidAnagram('prob-valid-anagram');
    if(document.getElementById('prob-group-anagrams'))initGroupAnagrams('prob-group-anagrams');
    if(document.getElementById('prob-two-sum-ii'))initTwoSumII('prob-two-sum-ii');
    if(document.getElementById('prob-longest-repeat-replace'))initLongestRepeatingReplace('prob-longest-repeat-replace');
    if(document.getElementById('prob-perm-in-string'))initPermutationInString('prob-perm-in-string');
    if(document.getElementById('prob-daily-temps'))initDailyTemperatures('prob-daily-temps');
    if(document.getElementById('prob-car-fleet'))initCarFleet('prob-car-fleet');
    if(document.getElementById('prob-koko-eating'))initKokoEating('prob-koko-eating');
    if(document.getElementById('prob-search-matrix'))initSearchMatrix('prob-search-matrix');
    if(document.getElementById('prob-validate-bst'))initValidateBST('prob-validate-bst');
    if(document.getElementById('prob-lca-bt'))initLCABinaryTree('prob-lca-bt');
    if(document.getElementById('prob-serialize-tree'))initSerializeTree('prob-serialize-tree');
    if(document.getElementById('prob-reverse-k-group'))initReverseKGroup('prob-reverse-k-group');
    if(document.getElementById('prob-copy-list-random'))initCopyListRandom('prob-copy-list-random');
    if(document.getElementById('prob-lru-cache'))initLRUCache('prob-lru-cache');
    if(document.getElementById('prob-combo-sum-ii'))initCombinationSumII('prob-combo-sum-ii');
    if(document.getElementById('prob-n-queens'))initNQueens('prob-n-queens');
    if(document.getElementById('prob-last-stone'))initLastStoneWeight('prob-last-stone');
    if(document.getElementById('prob-sliding-win-max'))initSlidingWindowMax('prob-sliding-win-max');
    if(document.getElementById('prob-k-closest'))initKClosestPoints('prob-k-closest');
    if(document.getElementById('prob-time-based-kv'))initTimeBasedKV('prob-time-based-kv');
    if(document.getElementById('prob-cheapest-flights'))initCheapestFlights('prob-cheapest-flights');
    if(document.getElementById('prob-alien-dict'))initAlienDictionary('prob-alien-dict');
    if(document.getElementById('prob-hand-straights'))initHandOfStraights('prob-hand-straights');
    if(document.getElementById('prob-partition-labels'))initPartitionLabels('prob-partition-labels');
    if(document.getElementById('prob-valid-paren-str'))initValidParenString('prob-valid-paren-str');
    if(document.getElementById('prob-merge-triplets'))initMergeTriplets('prob-merge-triplets');
    if(document.getElementById('prob-meeting-rooms-ii'))initMeetingRoomsII('prob-meeting-rooms-ii');
    if(document.getElementById('prob-pow-x-n'))initPowXN('prob-pow-x-n');
    if(document.getElementById('prob-word-search-ii'))initWordSearchII('prob-word-search-ii');
    if(document.getElementById('prob-reconstruct-itinerary'))initReconstructItinerary('prob-reconstruct-itinerary');
    if(document.getElementById('prob-sort-colors'))initSortColors('prob-sort-colors');
    if(document.getElementById('prob-largest-number'))initLargestNumber('prob-largest-number');
    if(document.getElementById('prob-median-two-arrays'))initMedianTwoArrays('prob-median-two-arrays');
    if(document.getElementById('prob-min-arrows'))initMinArrows('prob-min-arrows');
    if(document.getElementById('prob-rotate-list'))initRotateList('prob-rotate-list');
    if(document.getElementById('prob-k-smallest-pairs'))initKSmallestPairs('prob-k-smallest-pairs');
    if(document.getElementById('prob-path-sum-ii'))initPathSumII('prob-path-sum-ii');
    if(document.getElementById('prob-count-good-triplets'))initCountGoodTriplets('prob-count-good-triplets');
    if(document.getElementById('prob-flatten-tree'))initFlattenTree('prob-flatten-tree');
    if(document.getElementById('prob-symmetric-tree'))initSymmetricTree('prob-symmetric-tree');
    if(document.getElementById('prob-zigzag-level-order'))initZigzagLevelOrder('prob-zigzag-level-order');
    if(document.getElementById('prob-decode-string'))initDecodeString('prob-decode-string');
    if(document.getElementById('prob-next-permutation'))initNextPermutation('prob-next-permutation');
    if(document.getElementById('prob-find-all-anagrams'))initFindAllAnagrams('prob-find-all-anagrams');
    if(document.getElementById('prob-jump-game-iii'))initJumpGameIII('prob-jump-game-iii');
    if(document.getElementById('prob-max-product-word-lengths'))initMaxProductWordLengths('prob-max-product-word-lengths');
    if(document.getElementById('prob-pascal-triangle'))initPascalTriangle('prob-pascal-triangle');
    if(document.getElementById('prob-min-interval-query'))initMinIntervalQuery('prob-min-interval-query');
    if(document.getElementById('prob-climbing-stairs'))initClimbingStairs('prob-climbing-stairs');
    if(document.getElementById('prob-house-robber'))initHouseRobber('prob-house-robber');
    if(document.getElementById('prob-lcs-ii'))initLCSII('prob-lcs-ii');
    if(document.getElementById('prob-coin-change-ii'))initCoinChangeII('prob-coin-change-ii');
    if(document.getElementById('prob-unique-paths'))initUniquePaths('prob-unique-paths');
    if(document.getElementById('prob-lis'))initLIS('prob-lis');
    if(document.getElementById('prob-edit-distance'))initEditDistance('prob-edit-distance');
    if(document.getElementById('prob-burst-balloons'))initBurstBalloons('prob-burst-balloons');
    if(document.getElementById('prob-regex-matching'))initRegexMatching('prob-regex-matching');
    if(document.getElementById('prob-distinct-subseq'))initDistinctSubseq('prob-distinct-subseq');
    if(document.getElementById('prob-word-break'))initWordBreak('prob-word-break');
    if(document.getElementById('prob-palindrome-partitioning'))initPalindromePartitioning('prob-palindrome-partitioning');
    if(document.getElementById('prob-max-product-subarray'))initMaxProductSubarray('prob-max-product-subarray');
    if(document.getElementById('prob-min-path-sum'))initMinPathSum('prob-min-path-sum');
    if(document.getElementById('prob-decode-ways'))initDecodeWays('prob-decode-ways');
    if(document.getElementById('prob-partition-equal-subset'))initPartitionEqualSubset('prob-partition-equal-subset');
    if(document.getElementById('prob-maximal-square'))initMaximalSquare('prob-maximal-square');
    if(document.getElementById('prob-stock-cooldown'))initStockCooldown('prob-stock-cooldown');
    if(document.getElementById('prob-longest-palin-substring'))initLongestPalinSubstring('prob-longest-palin-substring');
    if(document.getElementById('prob-target-sum'))initTargetSum('prob-target-sum');
    if(document.getElementById('prob-number-of-islands'))initNumberOfIslands('prob-number-of-islands');
    if(document.getElementById('prob-course-schedule'))initCourseSchedule('prob-course-schedule');
    if(document.getElementById('prob-pacific-atlantic'))initPacificAtlantic('prob-pacific-atlantic');
    if(document.getElementById('prob-max-area-island'))initMaxAreaIsland('prob-max-area-island');
    if(document.getElementById('prob-rotting-oranges'))initRottingOranges('prob-rotting-oranges');
    if(document.getElementById('prob-clone-graph'))initCloneGraph('prob-clone-graph');
    if(document.getElementById('prob-connected-components'))initConnectedComponents('prob-connected-components');
    if(document.getElementById('prob-redundant-connection'))initRedundantConnection('prob-redundant-connection');
    if(document.getElementById('prob-graph-valid-tree'))initGraphValidTree('prob-graph-valid-tree');
    if(document.getElementById('prob-surrounded-regions'))initSurroundedRegions('prob-surrounded-regions');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
})();

})();
