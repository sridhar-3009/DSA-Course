(function(){
'use strict';

/* ── shared helpers ──────────────────────────────────────────── */
function raf(fn){return requestAnimationFrame(fn);}
function rrect(ctx,x,y,w,h,r){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();
}
var FILL={default:'#1E1047',comparing:'#451A00',sorted:'#052E16',found:'#052E16',active:'#1C0037',selected:'#2E1065',pivot:'#450A0A',visited:'#1a2e14'};
var STROKE={default:'#8B5CF6',comparing:'#F59E0B',sorted:'#10B981',found:'#34D399',active:'#E879F9',selected:'#A78BFA',pivot:'#EF4444',visited:'#4ade80'};
var GLOW={comparing:'rgba(245,158,11,0.7)',found:'rgba(52,211,153,0.8)',active:'rgba(232,121,249,0.6)',selected:'rgba(167,139,250,0.45)',pivot:'rgba(239,68,68,0.7)',visited:'rgba(74,222,128,0.5)'};

function mkCanvas(wrap,w,h){
  var c=document.createElement('canvas');
  c.style.cssText='width:100%;max-width:'+w+'px;height:'+h+'px;display:block;background:#06030e;border-radius:8px;';
  var dpr=Math.min(window.devicePixelRatio||1,2);
  c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);
  var ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
  wrap.appendChild(c);
  return {canvas:c,ctx:ctx,W:w,H:h};
}

function drawCell(ctx,x,y,w,h,val,state){
  ctx.save();
  if(GLOW[state]){ctx.shadowColor=GLOW[state];ctx.shadowBlur=14;}
  rrect(ctx,x,y,w,h,4);
  ctx.fillStyle=FILL[state]||FILL.default;ctx.fill();
  ctx.shadowBlur=0;
  ctx.strokeStyle=STROKE[state]||STROKE.default;ctx.lineWidth=1.8;ctx.stroke();
  ctx.fillStyle='#EDE9FE';ctx.font='bold 11px "JetBrains Mono",monospace';
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(String(val),x+w/2,y+h/2);
  ctx.restore();
}

function label(ctx,text,x,y,color,size){
  ctx.fillStyle=color||'rgba(167,139,250,0.7)';
  ctx.font=(size||10)+'px "JetBrains Mono",monospace';
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(text,x,y);
}

function makeControls(container,opts){
  var bar=document.createElement('div');bar.className='algo-controls';
  var playBtn=document.createElement('button');playBtn.className='algo-btn';playBtn.textContent='Play';
  var pauseBtn=document.createElement('button');pauseBtn.className='algo-btn';pauseBtn.textContent='Pause';pauseBtn.disabled=true;
  var stepBtn=document.createElement('button');stepBtn.className='algo-btn';stepBtn.textContent='Step';
  var resetBtn=document.createElement('button');resetBtn.className='algo-btn';resetBtn.textContent='Reset';
  var counter=document.createElement('span');counter.className='step-counter';counter.textContent='Step 0 / 0';
  var speedWrap=document.createElement('label');speedWrap.className='speed-wrap';
  speedWrap.innerHTML='Speed <input type="range" min="0.5" max="4" step="0.5" value="1"> <span>1x</span>';
  var speedSlider=speedWrap.querySelector('input'),speedLabel=speedWrap.querySelector('span');
  speedSlider.addEventListener('input',function(){speedLabel.textContent=speedSlider.value+'x';if(opts.onSpeed)opts.onSpeed(parseFloat(speedSlider.value));});
  playBtn.addEventListener('click',function(){playBtn.disabled=true;pauseBtn.disabled=false;stepBtn.disabled=true;if(opts.onPlay)opts.onPlay();});
  pauseBtn.addEventListener('click',function(){pauseBtn.disabled=true;playBtn.disabled=false;stepBtn.disabled=false;if(opts.onPause)opts.onPause();});
  stepBtn.addEventListener('click',function(){if(opts.onStep)opts.onStep();});
  resetBtn.addEventListener('click',function(){playBtn.disabled=false;pauseBtn.disabled=true;stepBtn.disabled=false;if(opts.onReset)opts.onReset();});
  bar.appendChild(playBtn);bar.appendChild(pauseBtn);bar.appendChild(stepBtn);bar.appendChild(resetBtn);
  bar.appendChild(speedWrap);bar.appendChild(counter);
  var statusBar=document.createElement('div');statusBar.className='status-bar';statusBar.textContent='Ready.';
  container.parentElement.insertBefore(bar,container);
  container.parentElement.insertBefore(statusBar,container.nextSibling);
  return {
    counter:counter,status:statusBar,
    setStep:function(n,total){counter.textContent='Step '+n+' / '+total;},
    setStatus:function(s){statusBar.textContent=s;},
    setPlaying:function(p){playBtn.disabled=p;pauseBtn.disabled=!p;stepBtn.disabled=p;},
    speed:function(){return parseFloat(speedSlider.value);}
  };
}

function runSteps(steps,ctrl,applyFn,speed){
  var idx=0,playing=false,rafId=null,lastTime=0,spd=speed||{val:1};
  ctrl.setStep(0,steps.length);
  function step(){
    if(idx<steps.length){applyFn(steps[idx]);idx++;ctrl.setStep(idx,steps.length);}
    else{playing=false;ctrl.setPlaying(false);ctrl.setStatus('Done! Step count: '+steps.length);}
  }
  function loop(){
    if(!playing||idx>=steps.length){if(idx>=steps.length){playing=false;ctrl.setPlaying(false);}return;}
    var now=performance.now(),delay=500/spd.val;
    if(now-lastTime>delay){step();lastTime=now;}
    rafId=raf(loop);
  }
  ctrl.setStep=function(n,total){ctrl.counter.textContent='Step '+n+' / '+total;};
  return {
    play:function(){playing=true;loop();},
    pause:function(){playing=false;if(rafId)cancelAnimationFrame(rafId);},
    step:step,
    reset:function(){playing=false;idx=0;if(rafId)cancelAnimationFrame(rafId);}
  };
}

/* ════════════════════════════════════════════════════════════════
   PROBLEM 1 — Two Sum
════════════════════════════════════════════════════════════════ */
function initTwoSum(){
  var sec=document.getElementById('prob-two-sum');if(!sec)return;
  var wrap=sec.querySelector('.prob-canvas-wrap');
  var cv=mkCanvas(wrap,700,180);
  var ctx=cv.ctx,W=cv.W,H=cv.H;

  var arr=[2,7,11,15,3,6],target=9;
  var approach='brute';
  var steps=[],stepIdx=0,playing=false,speed=1,rafId=null,lastTime=0;
  var states=[],pointers={};

  function buildBrute(a,t){
    var s=[];
    for(var i=0;i<a.length;i++)
      for(var j=i+1;j<a.length;j++){
        s.push({st:a.map(function(_,k){return k===i?'comparing':k===j?'active':'default';}),ptr:{i:i,j:j},msg:'Brute: check '+a[i]+'+'+a[j]+'='+(a[i]+a[j])+(a[i]+a[j]===t?' ✓ FOUND!':'')});
        if(a[i]+a[j]===t){s.push({st:a.map(function(_,k){return k===i||k===j?'found':'default';}),ptr:{i:i,j:j},msg:'Found! indices ['+i+','+j+'] sum to '+t+'. O(n²) — '+s.length+' steps.'});return s;}
      }
    return s;
  }

  function buildOptimal(a,t){
    var s=[],map={};
    for(var i=0;i<a.length;i++){
      var comp=t-a[i];
      s.push({st:a.map(function(_,k){return k===i?'comparing':'default';}),ptr:{i:i},mapState:Object.assign({},map),msg:'Hash: need '+comp+' to pair with '+a[i]+(map[comp]!==undefined?' — found at index '+map[comp]+'!':' — not in map yet')});
      if(map[comp]!==undefined){
        s.push({st:a.map(function(_,k){return k===i||k===map[comp]?'found':'default';}),ptr:{i:i,j:map[comp]},mapState:Object.assign({},map),msg:'Found! indices ['+map[comp]+','+i+']. O(n) — '+s.length+' steps.'});return s;
      }
      map[a[i]]=i;
    }
    return s;
  }

  function draw(st,ptr,mapSt){
    ctx.clearRect(0,0,W,H);
    var cw=52,ch=40,startX=20,y=H/2-20;
    arr.forEach(function(v,i){drawCell(ctx,startX+i*(cw+4),y,cw,ch,v,st?st[i]:'default');});
    ctx.fillStyle='rgba(167,139,250,0.5)';ctx.font='10px "JetBrains Mono",monospace';ctx.textAlign='center';
    arr.forEach(function(_,i){ctx.fillText(i,startX+i*(cw+4)+cw/2,y+ch+14);});
    label(ctx,'target='+target,startX+arr.length*(cw+4)+36,y+ch/2,'#F59E0B',12);
    if(ptr){
      if(ptr.i!==undefined){var px=startX+ptr.i*(cw+4)+cw/2;ctx.fillStyle='#A78BFA';ctx.fillText('i',px,y-14);}
      if(ptr.j!==undefined){var px2=startX+ptr.j*(cw+4)+cw/2;ctx.fillStyle='#F59E0B';ctx.fillText('j',px2,y-14);}
    }
    if(mapSt&&Object.keys(mapSt).length>0){
      var mx=20,my=H-32;
      ctx.fillStyle='rgba(167,139,250,0.5)';ctx.font='9px "JetBrains Mono",monospace';ctx.textAlign='left';ctx.fillText('HashMap:',mx,my);
      mx+=72;
      Object.keys(mapSt).forEach(function(k){drawCell(ctx,mx,my-12,52,22,k+'→'+mapSt[k],'selected');mx+=58;});
    }
  }

  function applyStep(s){states=s.st;pointers=s.ptr;draw(s.st,s.ptr,s.mapState);sec.querySelector('.prob-status').textContent=s.msg;}

  function buildSteps(){return approach==='brute'?buildBrute(arr,target):buildOptimal(arr,target);}

  // controls
  var ctrl={counter:sec.querySelector('.prob-counter'),status:sec.querySelector('.prob-status'),
    setStep:function(n,t){this.counter.textContent='Step '+n+' / '+t;},
    setStatus:function(s){this.status.textContent=s;},
    setPlaying:function(p){sec.querySelector('.prob-play').disabled=p;sec.querySelector('.prob-pause').disabled=!p;}};

  sec.querySelector('.prob-play').addEventListener('click',function(){
    steps=buildSteps();if(!steps.length)return;
    playing=true;ctrl.setPlaying(true);
    function loop(){
      if(!playing||stepIdx>=steps.length){if(stepIdx>=steps.length){playing=false;ctrl.setPlaying(false);}return;}
      var now=performance.now();
      if(now-lastTime>500/speed){applyStep(steps[stepIdx]);stepIdx++;ctrl.setStep(stepIdx,steps.length);lastTime=now;}
      rafId=raf(loop);
    }loop();
  });
  sec.querySelector('.prob-pause').addEventListener('click',function(){playing=false;if(rafId)cancelAnimationFrame(rafId);ctrl.setPlaying(false);});
  sec.querySelector('.prob-step').addEventListener('click',function(){
    if(!steps.length)steps=buildSteps();
    if(stepIdx<steps.length){applyStep(steps[stepIdx]);stepIdx++;ctrl.setStep(stepIdx,steps.length);}
  });
  sec.querySelector('.prob-reset').addEventListener('click',function(){
    playing=false;stepIdx=0;steps=[];if(rafId)cancelAnimationFrame(rafId);
    ctrl.setStep(0,0);ctrl.setStatus('Ready.');ctrl.setPlaying(false);draw();
  });
  sec.querySelector('.prob-speed').addEventListener('input',function(){speed=parseFloat(this.value);this.nextElementSibling.textContent=speed+'x';});
  sec.querySelectorAll('.prob-approach').forEach(function(btn){
    btn.addEventListener('click',function(){
      approach=this.dataset.approach;
      sec.querySelectorAll('.prob-approach').forEach(function(b){b.classList.remove('active');});
      this.classList.add('active');
      playing=false;stepIdx=0;steps=[];if(rafId)cancelAnimationFrame(rafId);ctrl.setPlaying(false);
      ctrl.setStatus(approach==='brute'?'Brute Force O(n²) — nested loops':'Optimal O(n) — HashMap');
      draw();
    });
  });
  sec.querySelector('.prob-input-apply').addEventListener('click',function(){
    var raw=sec.querySelector('.prob-input-arr').value.trim();
    var t=parseInt(sec.querySelector('.prob-input-target').value);
    var parsed=raw.split(',').map(function(s){return parseInt(s.trim());}).filter(function(v){return !isNaN(v);});
    if(parsed.length>=2&&!isNaN(t)){arr=parsed;target=t;stepIdx=0;steps=[];ctrl.setStep(0,0);ctrl.setStatus('Array updated.');draw();}
  });

  draw();ctrl.setStatus('Pick approach then Play / Step. O(n²) brute vs O(n) hash map.');
}

/* ════════════════════════════════════════════════════════════════
   PROBLEM 2 — Best Time to Buy and Sell Stock
════════════════════════════════════════════════════════════════ */
function initBestStock(){
  var sec=document.getElementById('prob-best-stock');if(!sec)return;
  var wrap=sec.querySelector('.prob-canvas-wrap');
  var cv=mkCanvas(wrap,700,200);
  var ctx=cv.ctx,W=cv.W,H=cv.H;

  var prices=[7,1,5,3,6,4],approach='brute';
  var steps=[],stepIdx=0,playing=false,speed=1,rafId=null,lastTime=0;

  function buildBrute(p){
    var s=[],maxP=0;
    for(var i=0;i<p.length;i++)
      for(var j=i+1;j<p.length;j++){
        var profit=p[j]-p[i];
        if(profit>maxP)maxP=profit;
        s.push({buy:i,sell:j,profit:profit,maxP:maxP,msg:'Brute: buy@'+p[i]+' sell@'+p[j]+' profit='+profit+' maxProfit='+maxP});
      }
    s.push({done:true,maxP:maxP,msg:'Max profit = '+maxP+'. O(n²) — '+s.length+' steps.'});
    return s;
  }

  function buildOptimal(p){
    var s=[],minP=p[0],maxP=0;
    for(var i=1;i<p.length;i++){
      s.push({minIdx:p.indexOf(minP),curIdx:i,profit:p[i]-minP,maxP:Math.max(maxP,p[i]-minP),msg:'Slide: price='+p[i]+' minSoFar='+minP+' profit='+(p[i]-minP)+' maxProfit='+Math.max(maxP,p[i]-minP)});
      if(p[i]-minP>maxP)maxP=p[i]-minP;
      if(p[i]<minP)minP=p[i];
    }
    s.push({done:true,maxP:maxP,msg:'Max profit = '+maxP+'. O(n) — '+s.length+' steps.'});
    return s;
  }

  function draw(s){
    ctx.clearRect(0,0,W,H);
    var cw=50,ch=35,sx=24,sy=20,gap=4;
    var maxP=Math.max.apply(null,prices);
    prices.forEach(function(v,i){
      var barH=Math.round((v/maxP)*(H-80));
      var x=sx+i*(cw+gap),y=H-50-barH;
      var st='default';
      if(s){
        if(s.buy===i)st='found';
        else if(s.sell===i)st='comparing';
        else if(s.minIdx===i)st='found';
        else if(s.curIdx===i)st='active';
      }
      ctx.save();
      if(GLOW[st]){ctx.shadowColor=GLOW[st];ctx.shadowBlur=12;}
      rrect(ctx,x,y,cw,barH,3);
      ctx.fillStyle=FILL[st]||FILL.default;ctx.fill();ctx.shadowBlur=0;
      ctx.strokeStyle=STROKE[st]||STROKE.default;ctx.lineWidth=1.5;ctx.stroke();
      ctx.restore();
      ctx.fillStyle='#EDE9FE';ctx.font='bold 11px "JetBrains Mono",monospace';ctx.textAlign='center';ctx.fillText(v,x+cw/2,y-10);
      ctx.fillStyle='rgba(167,139,250,0.5)';ctx.font='9px "JetBrains Mono",monospace';ctx.fillText('d'+i,x+cw/2,H-36);
    });
    if(s&&s.maxP!==undefined){
      ctx.fillStyle='#34D399';ctx.font='bold 12px "JetBrains Mono",monospace';ctx.textAlign='left';
      ctx.fillText('Max Profit: '+s.maxP,W-140,30);
    }
  }

  function applyStep(s){draw(s);sec.querySelector('.prob-status').textContent=s.msg;}
  function buildSteps(){return approach==='brute'?buildBrute(prices):buildOptimal(prices);}

  var ctrl={counter:sec.querySelector('.prob-counter'),
    setStep:function(n,t){this.counter.textContent='Step '+n+' / '+t;},
    setStatus:function(s){sec.querySelector('.prob-status').textContent=s;},
    setPlaying:function(p){sec.querySelector('.prob-play').disabled=p;sec.querySelector('.prob-pause').disabled=!p;}};

  sec.querySelector('.prob-play').addEventListener('click',function(){
    steps=buildSteps();if(!steps.length)return;playing=true;ctrl.setPlaying(true);
    function loop(){
      if(!playing||stepIdx>=steps.length){if(stepIdx>=steps.length){playing=false;ctrl.setPlaying(false);}return;}
      var now=performance.now();if(now-lastTime>500/speed){applyStep(steps[stepIdx]);stepIdx++;ctrl.setStep(stepIdx,steps.length);lastTime=now;}
      rafId=raf(loop);
    }loop();
  });
  sec.querySelector('.prob-pause').addEventListener('click',function(){playing=false;if(rafId)cancelAnimationFrame(rafId);ctrl.setPlaying(false);});
  sec.querySelector('.prob-step').addEventListener('click',function(){if(!steps.length)steps=buildSteps();if(stepIdx<steps.length){applyStep(steps[stepIdx]);stepIdx++;ctrl.setStep(stepIdx,steps.length);}});
  sec.querySelector('.prob-reset').addEventListener('click',function(){playing=false;stepIdx=0;steps=[];if(rafId)cancelAnimationFrame(rafId);ctrl.setPlaying(false);ctrl.setStep(0,0);draw();});
  sec.querySelector('.prob-speed').addEventListener('input',function(){speed=parseFloat(this.value);this.nextElementSibling.textContent=speed+'x';});
  sec.querySelectorAll('.prob-approach').forEach(function(btn){
    btn.addEventListener('click',function(){
      approach=this.dataset.approach;
      sec.querySelectorAll('.prob-approach').forEach(function(b){b.classList.remove('active');});this.classList.add('active');
      playing=false;stepIdx=0;steps=[];if(rafId)cancelAnimationFrame(rafId);ctrl.setPlaying(false);draw();
    });
  });
  sec.querySelector('.prob-input-apply').addEventListener('click',function(){
    var raw=sec.querySelector('.prob-input-arr').value.trim();
    var parsed=raw.split(',').map(function(s){return parseInt(s.trim());}).filter(function(v){return !isNaN(v);});
    if(parsed.length>=2){prices=parsed;stepIdx=0;steps=[];ctrl.setStep(0,0);draw();}
  });

  draw();ctrl.setStatus('Kadane-style O(n) vs O(n²) brute. Pick approach then Play.');
}

/* ════════════════════════════════════════════════════════════════
   PROBLEM 3 — Valid Parentheses
════════════════════════════════════════════════════════════════ */
function initValidParens(){
  var sec=document.getElementById('prob-valid-parens');if(!sec)return;
  var wrap=sec.querySelector('.prob-canvas-wrap');
  var cv=mkCanvas(wrap,700,180);
  var ctx=cv.ctx,W=cv.W,H=cv.H;

  var input='({[]})';
  var steps=[],stepIdx=0,playing=false,speed=1,rafId=null,lastTime=0;

  function buildSteps(s){
    var out=[],stack=[];
    var match={')'+'':'(','}'+'':'{',']':'['};
    for(var i=0;i<s.length;i++){
      var ch=s[i];
      if('([{'.includes(ch)){
        stack.push(ch);
        out.push({idx:i,stack:stack.slice(),state:'active',msg:'Push "'+ch+'" onto stack. Stack: ['+stack.join('')+']'});
      } else {
        var top=stack[stack.length-1];
        if(top===match[ch]){
          stack.pop();
          out.push({idx:i,stack:stack.slice(),state:'found',msg:'Match! "'+top+'" + "'+ch+'" pair. Stack: ['+stack.join('')+']'});
        } else {
          out.push({idx:i,stack:stack.slice(),state:'pivot',msg:'INVALID: "'+ch+'" cannot match "'+top+'"'});
          return out;
        }
      }
    }
    out.push({idx:-1,stack:[],state:stack.length?'pivot':'sorted',msg:stack.length?'INVALID: unclosed brackets remain':'VALID! All brackets matched. O(n).'});
    return out;
  }

  function draw(s){
    ctx.clearRect(0,0,W,H);
    var cw=40,ch=40,sx=(W-input.length*(cw+4))/2,sy=20;
    input.split('').forEach(function(ch,i){
      var st=s&&s.idx===i?s.state:'default';
      drawCell(ctx,sx+i*(cw+4),sy,cw,ch,ch,st);
      ctx.fillStyle='rgba(167,139,250,0.4)';ctx.font='9px "JetBrains Mono",monospace';ctx.textAlign='center';ctx.fillText(i,sx+i*(cw+4)+cw/2,sy+ch+12);
    });
    if(s&&s.stack!==undefined){
      ctx.fillStyle='rgba(167,139,250,0.5)';ctx.font='10px "JetBrains Mono",monospace';ctx.textAlign='left';ctx.fillText('Stack →',20,H-28);
      s.stack.forEach(function(c,i){drawCell(ctx,90+i*(36+4),H-42,36,30,c,'selected');});
    }
  }

  function applyStep(s){draw(s);sec.querySelector('.prob-status').textContent=s.msg;}

  var ctrl={counter:sec.querySelector('.prob-counter'),
    setStep:function(n,t){this.counter.textContent='Step '+n+' / '+t;},
    setPlaying:function(p){sec.querySelector('.prob-play').disabled=p;sec.querySelector('.prob-pause').disabled=!p;}};

  sec.querySelector('.prob-play').addEventListener('click',function(){
    steps=buildSteps(input);if(!steps.length)return;playing=true;ctrl.setPlaying(true);
    function loop(){
      if(!playing||stepIdx>=steps.length){if(stepIdx>=steps.length){playing=false;ctrl.setPlaying(false);}return;}
      var now=performance.now();if(now-lastTime>500/speed){applyStep(steps[stepIdx]);stepIdx++;ctrl.setStep(stepIdx,steps.length);lastTime=now;}
      rafId=raf(loop);
    }loop();
  });
  sec.querySelector('.prob-pause').addEventListener('click',function(){playing=false;if(rafId)cancelAnimationFrame(rafId);ctrl.setPlaying(false);});
  sec.querySelector('.prob-step').addEventListener('click',function(){if(!steps.length)steps=buildSteps(input);if(stepIdx<steps.length){applyStep(steps[stepIdx]);stepIdx++;ctrl.setStep(stepIdx,steps.length);}});
  sec.querySelector('.prob-reset').addEventListener('click',function(){playing=false;stepIdx=0;steps=[];if(rafId)cancelAnimationFrame(rafId);ctrl.setPlaying(false);ctrl.setStep(0,0);draw(null);});
  sec.querySelector('.prob-speed').addEventListener('input',function(){speed=parseFloat(this.value);this.nextElementSibling.textContent=speed+'x';});
  sec.querySelector('.prob-input-apply').addEventListener('click',function(){
    var v=sec.querySelector('.prob-input-arr').value.trim();
    if(v){input=v;stepIdx=0;steps=[];ctrl.setStep(0,0);sec.querySelector('.prob-status').textContent='Input updated.';draw(null);}
  });

  draw(null);sec.querySelector('.prob-status').textContent='Stack-based O(n). Press Play or Step.';
}

/* ════════════════════════════════════════════════════════════════
   PROBLEM 4 — Longest Substring Without Repeating Characters
════════════════════════════════════════════════════════════════ */
function initLongestSubstr(){
  var sec=document.getElementById('prob-longest-substr');if(!sec)return;
  var wrap=sec.querySelector('.prob-canvas-wrap');
  var cv=mkCanvas(wrap,700,180);
  var ctx=cv.ctx,W=cv.W,H=cv.H;

  var input='abcabcbb',approach='brute';
  var steps=[],stepIdx=0,playing=false,speed=1,rafId=null,lastTime=0;

  function buildBrute(s){
    var out=[],maxL=0;
    for(var i=0;i<s.length;i++){
      var seen={};
      for(var j=i;j<s.length;j++){
        if(seen[s[j]]){
          out.push({L:i,R:j-1,max:maxL,dup:j,msg:'Brute ['+i+'..'+j+']: duplicate "'+s[j]+'" — stop. maxLen='+maxL});break;
        }
        seen[s[j]]=true;
        if(j-i+1>maxL)maxL=j-i+1;
        out.push({L:i,R:j,max:maxL,msg:'Brute ['+i+'..'+j+']: "'+s.slice(i,j+1)+'" valid. maxLen='+maxL});
      }
    }
    out.push({L:-1,R:-1,max:maxL,msg:'Max length = '+maxL+'. O(n²) — '+out.length+' steps.'});
    return out;
  }

  function buildOptimal(s){
    var out=[],map={},maxL=0,L=0;
    for(var R=0;R<s.length;R++){
      if(map[s[R]]!==undefined&&map[s[R]]>=L){
        out.push({L:L,R:R,max:maxL,shrink:true,msg:'Slide: "'+s[R]+'" seen at '+map[s[R]]+'. Move L to '+(map[s[R]]+1)});
        L=map[s[R]]+1;
      }
      map[s[R]]=R;
      if(R-L+1>maxL)maxL=R-L+1;
      out.push({L:L,R:R,max:maxL,msg:'Window ['+L+'..'+R+']: "'+s.slice(L,R+1)+'" len='+(R-L+1)+' maxLen='+maxL});
    }
    out.push({L:-1,R:-1,max:maxL,msg:'Max length = '+maxL+'. O(n) sliding window — '+out.length+' steps.'});
    return out;
  }

  function draw(s){
    ctx.clearRect(0,0,W,H);
    var cw=36,ch=36,sx=(W-input.length*(cw+3))/2,sy=24;
    input.split('').forEach(function(ch,i){
      var st='default';
      if(s){
        if(i===s.dup)st='pivot';
        else if(s.L>=0&&i>=s.L&&i<=s.R)st=s.shrink&&i===s.L?'comparing':'active';
      }
      drawCell(ctx,sx+i*(cw+3),sy,cw,ch,ch,st);
    });
    if(s&&s.max!==undefined&&s.L>=0){
      ctx.strokeStyle='#10B981';ctx.lineWidth=2;ctx.setLineDash([4,3]);
      ctx.strokeRect(sx+s.L*(cw+3)-2,sy-2,(s.R-s.L+1)*(cw+3)+1,ch+4);ctx.setLineDash([]);
    }
    if(s&&s.max!==undefined){
      ctx.fillStyle='#34D399';ctx.font='bold 12px "JetBrains Mono",monospace';ctx.textAlign='left';
      ctx.fillText('Max Length: '+s.max,16,H-14);
    }
  }

  function applyStep(s){draw(s);sec.querySelector('.prob-status').textContent=s.msg;}
  function buildStepsNow(){return approach==='brute'?buildBrute(input):buildOptimal(input);}

  var ctrl={counter:sec.querySelector('.prob-counter'),
    setStep:function(n,t){this.counter.textContent='Step '+n+' / '+t;},
    setPlaying:function(p){sec.querySelector('.prob-play').disabled=p;sec.querySelector('.prob-pause').disabled=!p;}};

  sec.querySelector('.prob-play').addEventListener('click',function(){
    steps=buildStepsNow();if(!steps.length)return;playing=true;ctrl.setPlaying(true);
    function loop(){
      if(!playing||stepIdx>=steps.length){if(stepIdx>=steps.length){playing=false;ctrl.setPlaying(false);}return;}
      var now=performance.now();if(now-lastTime>400/speed){applyStep(steps[stepIdx]);stepIdx++;ctrl.setStep(stepIdx,steps.length);lastTime=now;}
      rafId=raf(loop);
    }loop();
  });
  sec.querySelector('.prob-pause').addEventListener('click',function(){playing=false;if(rafId)cancelAnimationFrame(rafId);ctrl.setPlaying(false);});
  sec.querySelector('.prob-step').addEventListener('click',function(){if(!steps.length)steps=buildStepsNow();if(stepIdx<steps.length){applyStep(steps[stepIdx]);stepIdx++;ctrl.setStep(stepIdx,steps.length);}});
  sec.querySelector('.prob-reset').addEventListener('click',function(){playing=false;stepIdx=0;steps=[];if(rafId)cancelAnimationFrame(rafId);ctrl.setPlaying(false);ctrl.setStep(0,0);draw(null);});
  sec.querySelector('.prob-speed').addEventListener('input',function(){speed=parseFloat(this.value);this.nextElementSibling.textContent=speed+'x';});
  sec.querySelectorAll('.prob-approach').forEach(function(btn){
    btn.addEventListener('click',function(){
      approach=this.dataset.approach;
      sec.querySelectorAll('.prob-approach').forEach(function(b){b.classList.remove('active');});this.classList.add('active');
      playing=false;stepIdx=0;steps=[];if(rafId)cancelAnimationFrame(rafId);ctrl.setPlaying(false);draw(null);
    });
  });
  sec.querySelector('.prob-input-apply').addEventListener('click',function(){
    var v=sec.querySelector('.prob-input-arr').value.trim();
    if(v){input=v;stepIdx=0;steps=[];ctrl.setStep(0,0);draw(null);}
  });

  draw(null);sec.querySelector('.prob-status').textContent='O(n²) brute vs O(n) sliding window.';
}

/* ════════════════════════════════════════════════════════════════
   PROBLEM 5 — Climbing Stairs
════════════════════════════════════════════════════════════════ */
function initClimbingStairs(){
  var sec=document.getElementById('prob-climbing-stairs');if(!sec)return;
  var wrap=sec.querySelector('.prob-canvas-wrap');
  var cv=mkCanvas(wrap,700,200);
  var ctx=cv.ctx,W=cv.W,H=cv.H;

  var N=7,approach='brute';
  var steps=[],stepIdx=0,playing=false,speed=1,rafId=null,lastTime=0;
  var callCount=0;

  function buildBrute(n){
    var out=[],calls=0;
    function rec(k){
      calls++;
      out.push({step:k,calls:calls,msg:'Recursive call: climbStairs('+k+'). Total calls so far: '+calls});
      if(k<=1)return 1;
      return rec(k-1)+rec(k-2);
    }
    var ans=rec(n);
    out.push({step:n,calls:calls,ans:ans,msg:'Answer='+ans+'. Total recursive calls='+calls+'. O(2ⁿ)!'});
    return out;
  }

  function buildDP(n){
    var out=[],dp=new Array(n+1).fill(0);
    dp[0]=1;dp[1]=1;
    out.push({dp:dp.slice(),idx:1,msg:'Base: dp[0]=1 (1 way to stay), dp[1]=1 (1 way to take 1 step)'});
    for(var i=2;i<=n;i++){
      dp[i]=dp[i-1]+dp[i-2];
      out.push({dp:dp.slice(),idx:i,msg:'dp['+i+']=dp['+(i-1)+']+dp['+(i-2)+']='+dp[i-1]+'+'+dp[i-2]+'='+dp[i]});
    }
    out.push({dp:dp.slice(),idx:n,ans:dp[n],msg:'Ways to climb '+n+' stairs = '+dp[n]+'. O(n) DP.'});
    return out;
  }

  function buildSpaceOpt(n){
    var out=[],prev2=1,prev1=1;
    out.push({prev2:prev2,prev1:prev1,msg:'Space-Opt: prev2=1, prev1=1 (only 2 vars needed)'});
    for(var i=2;i<=n;i++){
      var cur=prev1+prev2;
      out.push({prev2:prev2,prev1:prev1,cur:cur,step:i,msg:'Step '+i+': cur='+prev1+'+'+prev2+'='+cur+'. Slide window.'});
      prev2=prev1;prev1=cur;
    }
    out.push({prev1:prev1,ans:prev1,msg:'Answer='+prev1+'. O(n) time O(1) space!'});
    return out;
  }

  function draw(s){
    ctx.clearRect(0,0,W,H);
    if(approach==='brute'){
      ctx.fillStyle='rgba(167,139,250,0.7)';ctx.font='13px "JetBrains Mono",monospace';ctx.textAlign='center';
      ctx.fillText('Recursive tree: exponential branches',W/2,40);
      if(s){
        ctx.fillStyle='#F59E0B';ctx.font='bold 20px "JetBrains Mono",monospace';
        ctx.fillText('Calls so far: '+s.calls,W/2,90);
        ctx.fillStyle='rgba(167,139,250,0.5)';ctx.font='12px "JetBrains Mono",monospace';
        ctx.fillText('Computing climbStairs('+s.step+')',W/2,120);
        if(s.ans!==undefined){ctx.fillStyle='#34D399';ctx.font='bold 16px "JetBrains Mono",monospace';ctx.fillText('Answer: '+s.ans,W/2,155);}
      }
    } else {
      var dp=s&&s.dp?s.dp:new Array(N+1).fill(0);
      var cw=42,ch=36,sx=(W-(N+1)*(cw+4))/2,sy=60;
      dp.forEach(function(v,i){
        var st=(s&&s.idx===i)?'active':(s&&i<s.idx&&v>0)?'sorted':'default';
        drawCell(ctx,sx+i*(cw+4),sy,cw,ch,v||0,st);
        ctx.fillStyle='rgba(167,139,250,0.5)';ctx.font='9px "JetBrains Mono",monospace';ctx.textAlign='center';ctx.fillText('dp['+i+']',sx+i*(cw+4)+cw/2,sy+ch+14);
      });
      if(approach==='space'){
        if(s){
          ctx.fillStyle='rgba(167,139,250,0.6)';ctx.font='11px "JetBrains Mono",monospace';ctx.textAlign='left';
          ctx.fillText('prev2='+s.prev2+'  prev1='+s.prev1+(s.cur!==undefined?'  cur='+s.cur:''),sx,sy-18);
        }
      }
      if(s&&s.ans!==undefined){ctx.fillStyle='#34D399';ctx.font='bold 13px "JetBrains Mono",monospace';ctx.textAlign='center';ctx.fillText('Ways = '+s.ans,W/2,H-18);}
    }
  }

  function applyStep(s){draw(s);sec.querySelector('.prob-status').textContent=s.msg;}
  function buildStepsNow(){
    if(approach==='brute')return buildBrute(N);
    if(approach==='dp')return buildDP(N);
    return buildSpaceOpt(N);
  }

  var ctrl={counter:sec.querySelector('.prob-counter'),
    setStep:function(n,t){this.counter.textContent='Step '+n+' / '+t;},
    setPlaying:function(p){sec.querySelector('.prob-play').disabled=p;sec.querySelector('.prob-pause').disabled=!p;}};

  sec.querySelector('.prob-play').addEventListener('click',function(){
    steps=buildStepsNow();if(!steps.length)return;playing=true;ctrl.setPlaying(true);
    function loop(){
      if(!playing||stepIdx>=steps.length){if(stepIdx>=steps.length){playing=false;ctrl.setPlaying(false);}return;}
      var now=performance.now();if(now-lastTime>450/speed){applyStep(steps[stepIdx]);stepIdx++;ctrl.setStep(stepIdx,steps.length);lastTime=now;}
      rafId=raf(loop);
    }loop();
  });
  sec.querySelector('.prob-pause').addEventListener('click',function(){playing=false;if(rafId)cancelAnimationFrame(rafId);ctrl.setPlaying(false);});
  sec.querySelector('.prob-step').addEventListener('click',function(){if(!steps.length)steps=buildStepsNow();if(stepIdx<steps.length){applyStep(steps[stepIdx]);stepIdx++;ctrl.setStep(stepIdx,steps.length);}});
  sec.querySelector('.prob-reset').addEventListener('click',function(){playing=false;stepIdx=0;steps=[];if(rafId)cancelAnimationFrame(rafId);ctrl.setPlaying(false);ctrl.setStep(0,0);draw(null);});
  sec.querySelector('.prob-speed').addEventListener('input',function(){speed=parseFloat(this.value);this.nextElementSibling.textContent=speed+'x';});
  sec.querySelectorAll('.prob-approach').forEach(function(btn){
    btn.addEventListener('click',function(){
      approach=this.dataset.approach;
      sec.querySelectorAll('.prob-approach').forEach(function(b){b.classList.remove('active');});this.classList.add('active');
      playing=false;stepIdx=0;steps=[];if(rafId)cancelAnimationFrame(rafId);ctrl.setPlaying(false);draw(null);
    });
  });
  sec.querySelector('.prob-input-apply').addEventListener('click',function(){
    var v=parseInt(sec.querySelector('.prob-input-arr').value);
    if(!isNaN(v)&&v>0&&v<=15){N=v;stepIdx=0;steps=[];ctrl.setStep(0,0);draw(null);}
  });

  draw(null);sec.querySelector('.prob-status').textContent='O(2ⁿ) brute vs O(n) DP vs O(1) space.';
}

/* ════════════════════════════════════════════════════════════════
   PROBLEM 6 — Coin Change
════════════════════════════════════════════════════════════════ */
function initCoinChange(){
  var sec=document.getElementById('prob-coin-change');if(!sec)return;
  var wrap=sec.querySelector('.prob-canvas-wrap');
  var cv=mkCanvas(wrap,700,200);
  var ctx=cv.ctx,W=cv.W,H=cv.H;

  var coins=[1,2,5],amount=11,approach='brute';
  var steps=[],stepIdx=0,playing=false,speed=1,rafId=null,lastTime=0;

  function buildGreedy(c,a){
    var out=[],rem=a,used=[],sorted=c.slice().sort(function(x,y){return y-x;});
    for(var i=0;i<sorted.length;i++){
      while(rem>=sorted[i]){
        used.push(sorted[i]);rem-=sorted[i];
        out.push({used:used.slice(),rem:rem,coin:sorted[i],msg:'Greedy: pick coin '+sorted[i]+'. Remaining: '+rem});
      }
    }
    out.push({used:used.slice(),rem:rem,msg:rem===0?'Done! '+used.length+' coins: ['+used.join(',')+'] (Greedy — may not be optimal!)':'Cannot make change!'});
    return out;
  }

  function buildDP(c,a){
    var out=[],dp=new Array(a+1).fill(Infinity);dp[0]=0;
    for(var i=1;i<=a;i++){
      c.forEach(function(coin){
        if(coin<=i&&dp[i-coin]+1<dp[i])dp[i]=dp[i-coin]+1;
      });
      out.push({dp:dp.slice(),idx:i,msg:'dp['+i+']='+( dp[i]===Infinity?'∞':dp[i])+' (min coins for amount '+i+')'});
    }
    out.push({dp:dp.slice(),idx:a,ans:dp[a],msg:'Min coins for '+a+' = '+(dp[a]===Infinity?'impossible':dp[a])+'. O(amount×coins).'});
    return out;
  }

  function draw(s){
    ctx.clearRect(0,0,W,H);
    if(approach==='brute'){
      if(s&&s.used){
        ctx.fillStyle='rgba(167,139,250,0.6)';ctx.font='11px "JetBrains Mono",monospace';ctx.textAlign='left';ctx.fillText('Coins used:',20,50);
        s.used.forEach(function(c,i){drawCell(ctx,130+i*44,36,40,28,c,'active');});
        ctx.fillStyle='#F59E0B';ctx.font='bold 13px "JetBrains Mono",monospace';ctx.textAlign='left';ctx.fillText('Remaining: '+s.rem,20,100);
        if(s.ans!==undefined){ctx.fillStyle='#34D399';ctx.font='bold 14px "JetBrains Mono",monospace';ctx.fillText('Total coins: '+s.used.length,20,135);}
      }
    } else {
      var dp=s&&s.dp?s.dp:new Array(amount+1).fill(0);
      var cw=Math.max(28,Math.floor((W-30)/(amount+1))-2),ch=36;
      var sx=15,sy=50;
      dp.forEach(function(v,i){
        var st=(s&&s.idx===i)?'active':(s&&i<s.idx&&v!==Infinity)?'sorted':'default';
        drawCell(ctx,sx+i*(cw+2),sy,cw,ch,v===Infinity?'∞':v,st);
        ctx.fillStyle='rgba(167,139,250,0.4)';ctx.font='8px "JetBrains Mono",monospace';ctx.textAlign='center';ctx.fillText(i,sx+i*(cw+2)+cw/2,sy+ch+12);
      });
      if(s&&s.ans!==undefined){ctx.fillStyle='#34D399';ctx.font='bold 13px "JetBrains Mono",monospace';ctx.textAlign='center';ctx.fillText('Min coins: '+(s.ans===Infinity?'impossible':s.ans),W/2,H-14);}
    }
    // show coins
    ctx.fillStyle='rgba(167,139,250,0.5)';ctx.font='10px "JetBrains Mono",monospace';ctx.textAlign='left';ctx.fillText('Coins: ['+coins.join(',')+']  Amount: '+amount,16,H-10);
  }

  function applyStep(s){draw(s);sec.querySelector('.prob-status').textContent=s.msg;}
  function buildStepsNow(){return approach==='brute'?buildGreedy(coins,amount):buildDP(coins,amount);}

  var ctrl={counter:sec.querySelector('.prob-counter'),
    setStep:function(n,t){this.counter.textContent='Step '+n+' / '+t;},
    setPlaying:function(p){sec.querySelector('.prob-play').disabled=p;sec.querySelector('.prob-pause').disabled=!p;}};

  sec.querySelector('.prob-play').addEventListener('click',function(){
    steps=buildStepsNow();if(!steps.length)return;playing=true;ctrl.setPlaying(true);
    function loop(){
      if(!playing||stepIdx>=steps.length){if(stepIdx>=steps.length){playing=false;ctrl.setPlaying(false);}return;}
      var now=performance.now();if(now-lastTime>500/speed){applyStep(steps[stepIdx]);stepIdx++;ctrl.setStep(stepIdx,steps.length);lastTime=now;}
      rafId=raf(loop);
    }loop();
  });
  sec.querySelector('.prob-pause').addEventListener('click',function(){playing=false;if(rafId)cancelAnimationFrame(rafId);ctrl.setPlaying(false);});
  sec.querySelector('.prob-step').addEventListener('click',function(){if(!steps.length)steps=buildStepsNow();if(stepIdx<steps.length){applyStep(steps[stepIdx]);stepIdx++;ctrl.setStep(stepIdx,steps.length);}});
  sec.querySelector('.prob-reset').addEventListener('click',function(){playing=false;stepIdx=0;steps=[];if(rafId)cancelAnimationFrame(rafId);ctrl.setPlaying(false);ctrl.setStep(0,0);draw(null);});
  sec.querySelector('.prob-speed').addEventListener('input',function(){speed=parseFloat(this.value);this.nextElementSibling.textContent=speed+'x';});
  sec.querySelectorAll('.prob-approach').forEach(function(btn){
    btn.addEventListener('click',function(){
      approach=this.dataset.approach;
      sec.querySelectorAll('.prob-approach').forEach(function(b){b.classList.remove('active');});this.classList.add('active');
      playing=false;stepIdx=0;steps=[];if(rafId)cancelAnimationFrame(rafId);ctrl.setPlaying(false);draw(null);
    });
  });
  sec.querySelector('.prob-input-apply').addEventListener('click',function(){
    var rawCoins=sec.querySelector('.prob-input-arr').value.trim();
    var amt=parseInt(sec.querySelector('.prob-input-target').value);
    var c=rawCoins.split(',').map(function(s){return parseInt(s.trim());}).filter(function(v){return !isNaN(v)&&v>0;});
    if(c.length&&!isNaN(amt)&&amt>0){coins=c;amount=amt;stepIdx=0;steps=[];ctrl.setStep(0,0);draw(null);}
  });

  draw(null);sec.querySelector('.prob-status').textContent='Greedy (may fail) vs DP O(amount×coins).';
}

/* ════════════════════════════════════════════════════════════════
   PROBLEM 7 — Merge Intervals
════════════════════════════════════════════════════════════════ */
function initMergeIntervals(){
  var sec=document.getElementById('prob-merge-intervals');if(!sec)return;
  var wrap=sec.querySelector('.prob-canvas-wrap');
  var cv=mkCanvas(wrap,700,200);
  var ctx=cv.ctx,W=cv.W,H=cv.H;

  var intervals=[[1,3],[2,6],[8,10],[15,18]],approach='brute';
  var steps=[],stepIdx=0,playing=false,speed=1,rafId=null,lastTime=0;

  function buildBrute(ivs){
    var out=[],merged=ivs.slice().map(function(x){return x.slice();});
    var changed=true;
    while(changed){
      changed=false;
      for(var i=0;i<merged.length;i++){
        for(var j=i+1;j<merged.length;j++){
          if(merged[i][1]>=merged[j][0]){
            out.push({ivs:merged.map(function(x){return x.slice();}),hi:[i,j],msg:'Brute: ['+merged[i]+'] overlaps ['+merged[j]+']. Merge.'});
            merged[i]=[Math.min(merged[i][0],merged[j][0]),Math.max(merged[i][1],merged[j][1])];
            merged.splice(j,1);changed=true;break;
          }
        }
        if(changed)break;
      }
    }
    out.push({ivs:merged,hi:[],done:true,msg:'Done! '+merged.length+' merged intervals. O(n²).'});
    return out;
  }

  function buildOptimal(ivs){
    var out=[],sorted=ivs.slice().sort(function(a,b){return a[0]-b[0];});
    out.push({ivs:sorted,hi:[],msg:'Sort by start time. O(n log n).'});
    var res=[sorted[0].slice()];
    for(var i=1;i<sorted.length;i++){
      var last=res[res.length-1];
      if(sorted[i][0]<=last[1]){
        out.push({ivs:res.concat([sorted[i]]),hi:[res.length-1,res.length],msg:'Overlap: ['+last+'] ∩ ['+sorted[i]+']. Extend to '+Math.max(last[1],sorted[i][1])});
        last[1]=Math.max(last[1],sorted[i][1]);
      } else {
        res.push(sorted[i].slice());
        out.push({ivs:res.slice(),hi:[res.length-1],msg:'No overlap. Add ['+sorted[i]+'] to result.'});
      }
    }
    out.push({ivs:res,hi:[],done:true,msg:'Done! '+res.length+' merged intervals. O(n log n).'});
    return out;
  }

  function drawIntervals(ivs,hi){
    ctx.clearRect(0,0,W,H);
    var maxVal=20,scaleX=(W-80)/(maxVal),sy=30,rowH=28;
    ivs.forEach(function(iv,i){
      var x1=40+iv[0]*scaleX,x2=40+iv[1]*scaleX,y=sy+i*rowH;
      var isHi=hi&&hi.includes(i);
      ctx.save();
      if(isHi){ctx.shadowColor='rgba(245,158,11,0.7)';ctx.shadowBlur=12;}
      rrect(ctx,x1,y,x2-x1,20,3);
      ctx.fillStyle=isHi?'#451A00':'#1E1047';ctx.fill();ctx.shadowBlur=0;
      ctx.strokeStyle=isHi?'#F59E0B':'#8B5CF6';ctx.lineWidth=1.8;ctx.stroke();
      ctx.restore();
      ctx.fillStyle='#EDE9FE';ctx.font='bold 10px "JetBrains Mono",monospace';ctx.textAlign='center';ctx.fillText('['+iv[0]+','+iv[1]+']',(x1+x2)/2,y+11);
    });
    // axis
    ctx.strokeStyle='rgba(139,92,246,0.2)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(40,sy+ivs.length*rowH+8);ctx.lineTo(W-40,sy+ivs.length*rowH+8);ctx.stroke();
    for(var v=0;v<=maxVal;v+=2){
      var x=40+v*scaleX;
      ctx.fillStyle='rgba(167,139,250,0.3)';ctx.font='8px sans-serif';ctx.textAlign='center';ctx.fillText(v,x,sy+ivs.length*rowH+20);
    }
  }

  function applyStep(s){drawIntervals(s.ivs,s.hi);sec.querySelector('.prob-status').textContent=s.msg;}
  function buildStepsNow(){return approach==='brute'?buildBrute(intervals):buildOptimal(intervals);}

  var ctrl={counter:sec.querySelector('.prob-counter'),
    setStep:function(n,t){this.counter.textContent='Step '+n+' / '+t;},
    setPlaying:function(p){sec.querySelector('.prob-play').disabled=p;sec.querySelector('.prob-pause').disabled=!p;}};

  sec.querySelector('.prob-play').addEventListener('click',function(){
    steps=buildStepsNow();if(!steps.length)return;playing=true;ctrl.setPlaying(true);
    function loop(){
      if(!playing||stepIdx>=steps.length){if(stepIdx>=steps.length){playing=false;ctrl.setPlaying(false);}return;}
      var now=performance.now();if(now-lastTime>500/speed){applyStep(steps[stepIdx]);stepIdx++;ctrl.setStep(stepIdx,steps.length);lastTime=now;}
      rafId=raf(loop);
    }loop();
  });
  sec.querySelector('.prob-pause').addEventListener('click',function(){playing=false;if(rafId)cancelAnimationFrame(rafId);ctrl.setPlaying(false);});
  sec.querySelector('.prob-step').addEventListener('click',function(){if(!steps.length)steps=buildStepsNow();if(stepIdx<steps.length){applyStep(steps[stepIdx]);stepIdx++;ctrl.setStep(stepIdx,steps.length);}});
  sec.querySelector('.prob-reset').addEventListener('click',function(){playing=false;stepIdx=0;steps=[];if(rafId)cancelAnimationFrame(rafId);ctrl.setPlaying(false);ctrl.setStep(0,0);drawIntervals(intervals,[]);});
  sec.querySelector('.prob-speed').addEventListener('input',function(){speed=parseFloat(this.value);this.nextElementSibling.textContent=speed+'x';});
  sec.querySelectorAll('.prob-approach').forEach(function(btn){
    btn.addEventListener('click',function(){
      approach=this.dataset.approach;
      sec.querySelectorAll('.prob-approach').forEach(function(b){b.classList.remove('active');});this.classList.add('active');
      playing=false;stepIdx=0;steps=[];if(rafId)cancelAnimationFrame(rafId);ctrl.setPlaying(false);drawIntervals(intervals,[]);
    });
  });

  drawIntervals(intervals,[]);sec.querySelector('.prob-status').textContent='O(n²) brute vs O(n log n) sort+merge.';
}

/* ════════════════════════════════════════════════════════════════
   PROBLEM 8 — Number of Islands
════════════════════════════════════════════════════════════════ */
function initNumIslands(){
  var sec=document.getElementById('prob-num-islands');if(!sec)return;
  var wrap=sec.querySelector('.prob-canvas-wrap');
  var cv=mkCanvas(wrap,700,220);
  var ctx=cv.ctx,W=cv.W,H=cv.H;

  var grid=[
    ['1','1','0','0','0'],
    ['1','1','0','1','1'],
    ['0','0','0','1','1'],
    ['0','0','0','0','0'],
    ['1','0','1','0','1']
  ];
  var approach='dfs';
  var steps=[],stepIdx=0,playing=false,speed=1,rafId=null,lastTime=0;

  function buildDFS(g){
    var out=[],rows=g.length,cols=g[0].length;
    var visited=g.map(function(r){return r.map(function(){return false;});});
    var islands=0;
    function dfs(r,c){
      if(r<0||r>=rows||c<0||c>=cols||visited[r][c]||g[r][c]==='0')return;
      visited[r][c]=true;
      out.push({grid:visited.map(function(row){return row.slice();}),cur:[r,c],islands:islands,msg:'DFS visit ('+r+','+c+'). Island #'+islands});
      [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].forEach(function(n){dfs(n[0],n[1]);});
    }
    for(var r=0;r<rows;r++)for(var c=0;c<cols;c++){
      if(!visited[r][c]&&g[r][c]==='1'){
        islands++;
        out.push({grid:visited.map(function(row){return row.slice();}),cur:[r,c],islands:islands,msg:'New island #'+islands+' found at ('+r+','+c+'). DFS expanding...'});
        dfs(r,c);
      }
    }
    out.push({grid:visited.map(function(row){return row.slice();}),cur:null,islands:islands,done:true,msg:'Total islands = '+islands+'. O(rows×cols).'});
    return out;
  }

  function buildBFS(g){
    var out=[],rows=g.length,cols=g[0].length;
    var visited=g.map(function(r){return r.map(function(){return false;});});
    var islands=0;
    for(var r=0;r<rows;r++)for(var c=0;c<cols;c++){
      if(!visited[r][c]&&g[r][c]==='1'){
        islands++;var queue=[[r,c]];visited[r][c]=true;
        out.push({grid:visited.map(function(row){return row.slice();}),cur:[r,c],islands:islands,msg:'BFS island #'+islands+' from ('+r+','+c+')'});
        while(queue.length){
          var cell=queue.shift(),cr=cell[0],cc=cell[1];
          [[cr-1,cc],[cr+1,cc],[cr,cc-1],[cr,cc+1]].forEach(function(nb){
            var nr=nb[0],nc=nb[1];
            if(nr>=0&&nr<rows&&nc>=0&&nc<cols&&!visited[nr][nc]&&g[nr][nc]==='1'){
              visited[nr][nc]=true;queue.push([nr,nc]);
              out.push({grid:visited.map(function(row){return row.slice();}),cur:[nr,nc],islands:islands,msg:'BFS enqueue ('+nr+','+nc+'). Island #'+islands});
            }
          });
        }
      }
    }
    out.push({grid:visited.map(function(row){return row.slice();}),cur:null,islands:islands,done:true,msg:'Total islands = '+islands+'. O(rows×cols).'});
    return out;
  }

  function draw(s){
    ctx.clearRect(0,0,W,H);
    var rows=grid.length,cols=grid[0].length;
    var cw=50,ch=36,sx=(W-cols*cw-cols*3)/2+10,sy=20;
    for(var r=0;r<rows;r++)for(var c=0;c<cols;c++){
      var visited=s&&s.grid&&s.grid[r][c];
      var isCur=s&&s.cur&&s.cur[0]===r&&s.cur[1]===c;
      var isLand=grid[r][c]==='1';
      var st=isCur?'comparing':(visited&&isLand)?'found':(isLand?'default':'visited');
      if(!isLand)st='default';
      ctx.save();
      if(isCur){ctx.shadowColor='rgba(245,158,11,0.8)';ctx.shadowBlur=16;}
      else if(visited&&isLand){ctx.shadowColor='rgba(52,211,153,0.5)';ctx.shadowBlur=10;}
      rrect(ctx,sx+c*(cw+3),sy+r*(ch+3),cw,ch,4);
      ctx.fillStyle=isCur?'#451A00':(visited&&isLand)?'#052E16':(isLand?'#2E1065':'#0a0a14');ctx.fill();
      ctx.shadowBlur=0;
      ctx.strokeStyle=isCur?'#F59E0B':(visited&&isLand)?'#34D399':(isLand?'#8B5CF6':'rgba(139,92,246,0.2)');ctx.lineWidth=1.5;ctx.stroke();
      ctx.restore();
      ctx.fillStyle=isLand?'#EDE9FE':'rgba(167,139,250,0.25)';ctx.font='bold 13px "JetBrains Mono",monospace';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(grid[r][c],sx+c*(cw+3)+cw/2,sy+r*(ch+3)+ch/2);
    }
    if(s&&s.islands!==undefined){
      ctx.fillStyle='#34D399';ctx.font='bold 13px "JetBrains Mono",monospace';ctx.textAlign='right';ctx.textBaseline='top';
      ctx.fillText('Islands: '+s.islands,W-16,16);
    }
  }

  function applyStep(s){draw(s);sec.querySelector('.prob-status').textContent=s.msg;}
  function buildStepsNow(){return approach==='dfs'?buildDFS(grid):buildBFS(grid);}

  var ctrl={counter:sec.querySelector('.prob-counter'),
    setStep:function(n,t){this.counter.textContent='Step '+n+' / '+t;},
    setPlaying:function(p){sec.querySelector('.prob-play').disabled=p;sec.querySelector('.prob-pause').disabled=!p;}};

  sec.querySelector('.prob-play').addEventListener('click',function(){
    steps=buildStepsNow();if(!steps.length)return;playing=true;ctrl.setPlaying(true);
    function loop(){
      if(!playing||stepIdx>=steps.length){if(stepIdx>=steps.length){playing=false;ctrl.setPlaying(false);}return;}
      var now=performance.now();if(now-lastTime>400/speed){applyStep(steps[stepIdx]);stepIdx++;ctrl.setStep(stepIdx,steps.length);lastTime=now;}
      rafId=raf(loop);
    }loop();
  });
  sec.querySelector('.prob-pause').addEventListener('click',function(){playing=false;if(rafId)cancelAnimationFrame(rafId);ctrl.setPlaying(false);});
  sec.querySelector('.prob-step').addEventListener('click',function(){if(!steps.length)steps=buildStepsNow();if(stepIdx<steps.length){applyStep(steps[stepIdx]);stepIdx++;ctrl.setStep(stepIdx,steps.length);}});
  sec.querySelector('.prob-reset').addEventListener('click',function(){playing=false;stepIdx=0;steps=[];if(rafId)cancelAnimationFrame(rafId);ctrl.setPlaying(false);ctrl.setStep(0,0);draw(null);});
  sec.querySelector('.prob-speed').addEventListener('input',function(){speed=parseFloat(this.value);this.nextElementSibling.textContent=speed+'x';});
  sec.querySelectorAll('.prob-approach').forEach(function(btn){
    btn.addEventListener('click',function(){
      approach=this.dataset.approach;
      sec.querySelectorAll('.prob-approach').forEach(function(b){b.classList.remove('active');});this.classList.add('active');
      playing=false;stepIdx=0;steps=[];if(rafId)cancelAnimationFrame(rafId);ctrl.setPlaying(false);draw(null);
    });
  });

  draw(null);sec.querySelector('.prob-status').textContent='DFS vs BFS flood-fill — same O(m×n) complexity.';
}

/* ════════════════════════════════════════════════════════════════
   BOOT
════════════════════════════════════════════════════════════════ */
function init(){
  initTwoSum();
  initBestStock();
  initValidParens();
  initLongestSubstr();
  initClimbingStairs();
  initCoinChange();
  initMergeIntervals();
  initNumIslands();
}

if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',init);}else{init();}

})();
