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
    '.prob-cv-wrap{border-radius:10px;overflow:hidden;border:1px solid rgba(139,92,246,0.2);',
    'margin-bottom:0.6rem;background:#06030e;}',
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

/* Background: dark radial gradient + dot grid */
function bg(ctx,W,H){
  ctx.clearRect(0,0,W,H);
  var g=ctx.createRadialGradient(W*0.5,H*0.4,0,W*0.5,H*0.4,Math.max(W,H)*0.75);
  g.addColorStop(0,'#140830');g.addColorStop(0.6,'#0a051e');g.addColorStop(1,'#06030e');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='rgba(139,92,246,0.05)';
  for(var x=20;x<W;x+=22)for(var y=20;y<H;y+=22){ctx.beginPath();ctx.arc(x,y,0.9,0,Math.PI*2);ctx.fill();}
}

/* Color table per state */
var CS={
  default:   {g0:'#2E1B6B',g1:'#120930',sk:'#7C3AED',gl:null,      tx:'#ddd6fe'},
  comparing: {g0:'#C2410C',g1:'#7c2d12',sk:'#fb923c',gl:'rgba(251,146,60,.85)',tx:'#fff7ed'},
  active:    {g0:'#5B21B6',g1:'#2e1065',sk:'#c4b5fd',gl:'rgba(196,181,253,.65)',tx:'#f5f3ff'},
  found:     {g0:'#047857',g1:'#064e3b',sk:'#34d399',gl:'rgba(52,211,153,.9)', tx:'#d1fae5'},
  sorted:    {g0:'#065F46',g1:'#052e16',sk:'#10b981',gl:null,                  tx:'#a7f3d0'},
  pivot:     {g0:'#B91C1C',g1:'#7f1d1d',sk:'#f87171',gl:'rgba(248,113,113,.8)',tx:'#fee2e2'},
  selected:  {g0:'#3730A3',g1:'#1e1b4b',sk:'#818cf8',gl:'rgba(129,140,248,.6)',tx:'#e0e7ff'},
  visited:   {g0:'#15803D',g1:'#14532d',sk:'#4ade80',gl:'rgba(74,222,128,.6)', tx:'#dcfce7'},
  water:     {g0:'#0f172a',g1:'#020617',sk:'rgba(139,92,246,.18)',gl:null,     tx:'rgba(167,139,250,.3)'},
};

function cell(ctx,x,y,w,h,val,state){
  var s=CS[state]||CS.default;
  var r=Math.min(9,w*.26,h*.26);
  ctx.save();
  if(s.gl){ctx.shadowColor=s.gl;ctx.shadowBlur=22;}
  var g=ctx.createLinearGradient(x,y,x,y+h);
  g.addColorStop(0,s.g0);g.addColorStop(1,s.g1);
  rr(ctx,x,y,w,h,r);ctx.fillStyle=g;ctx.fill();
  ctx.shadowBlur=0;
  ctx.strokeStyle=s.sk;ctx.lineWidth=1.8;ctx.stroke();
  // inner top highlight
  ctx.strokeStyle='rgba(255,255,255,0.09)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(x+r+2,y+1.5);ctx.lineTo(x+w-r-2,y+1.5);ctx.stroke();
  ctx.fillStyle=s.tx||'#ede9fe';
  ctx.font='bold 13px "JetBrains Mono",monospace';
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
  spdW.innerHTML='Speed <input type="range" min="0.5" max="4" step="0.5" value="1" style="width:58px"> <span>1×</span>';
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
      if(now-lastT>700/speed){doStep();lastT=now;}
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
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
})();

})();
