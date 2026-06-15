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
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
})();

})();
