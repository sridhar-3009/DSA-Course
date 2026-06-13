(function(){
'use strict';

/* ── Shared utilities ──────────────────────────────────────── */
function raf(fn){return requestAnimationFrame(fn)}
function lerp(a,b,t){return a+(b-a)*t}
function clamp(v,lo,hi){return Math.max(lo,Math.min(hi,v))}
function ease(t){return t<0.5?2*t*t:-1+(4-2*t)*t}

function setupHiDPI(canvas){
  var dpr=Math.min(window.devicePixelRatio||1,2);
  var rect=canvas.getBoundingClientRect();
  var w=rect.width||600,h=rect.height||300;
  canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
  canvas.style.width=w+'px';canvas.style.height=h+'px';
  var ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
  return {ctx:ctx,w:w,h:h};
}

function rrect(ctx,x,y,w,h,r){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
  ctx.lineTo(x+r,y+h);ctx.arcTo(x,y+h,x,y+h-r,r);
  ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();
}

function drawCell(ctx,x,y,w,h,val,state){
  var FILL={default:'#1E1047',comparing:'#451A00',sorted:'#052E16',pivot:'#450A0A',selected:'#2E1065',found:'#052E16',active:'#1C0037'};
  var STROKE={default:'#8B5CF6',comparing:'#F59E0B',sorted:'#10B981',pivot:'#EF4444',selected:'#A78BFA',found:'#34D399',active:'#E879F9'};
  var GLOW={comparing:'rgba(245,158,11,0.7)',sorted:'rgba(16,185,129,0.45)',pivot:'rgba(239,68,68,0.7)',found:'rgba(52,211,153,0.8)',active:'rgba(232,121,249,0.6)',selected:'rgba(167,139,250,0.4)'};
  ctx.save();
  if(GLOW[state]){ctx.shadowColor=GLOW[state];ctx.shadowBlur=14;}
  rrect(ctx,x,y,w,h,4);
  ctx.fillStyle=FILL[state]||FILL.default;ctx.fill();
  ctx.shadowBlur=0;
  ctx.strokeStyle=STROKE[state]||STROKE.default;ctx.lineWidth=1.8;ctx.stroke();
  ctx.fillStyle='#EDE9FE';ctx.font='bold 12px "JetBrains Mono",monospace';
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(String(val),x+w/2,y+h/2);
  ctx.restore();
}

function drawBox(ctx,x,y,w,h,label,sub,color){
  rrect(ctx,x,y,w,h,6);ctx.fillStyle='rgba(6,3,14,0.93)';ctx.fill();
  ctx.strokeStyle=color||'#8B5CF6';ctx.lineWidth=1.5;ctx.stroke();
  rrect(ctx,x,y,w,3,1);ctx.fillStyle=color||'#8B5CF6';ctx.fill();
  ctx.fillStyle='#EDE9FE';ctx.font='bold 11px "JetBrains Mono",monospace';
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(label,x+w/2,sub?y+h/2-7:y+h/2);
  if(sub){ctx.fillStyle='rgba(167,139,250,0.7)';ctx.font='9px "JetBrains Mono",monospace';ctx.fillText(sub,x+w/2,y+h/2+8);}
}

function drawArrow(ctx,x1,y1,x2,y2,color,dashed){
  ctx.save();ctx.strokeStyle=color||'#8B5CF6';ctx.lineWidth=1.5;ctx.globalAlpha=0.7;
  if(dashed)ctx.setLineDash([5,4]);
  ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
  ctx.setLineDash([]);ctx.globalAlpha=1;
  var a=Math.atan2(y2-y1,x2-x1);ctx.fillStyle=color||'#8B5CF6';
  ctx.beginPath();ctx.moveTo(x2,y2);
  ctx.lineTo(x2-8*Math.cos(a-0.4),y2-8*Math.sin(a-0.4));
  ctx.lineTo(x2-8*Math.cos(a+0.4),y2-8*Math.sin(a+0.4));
  ctx.closePath();ctx.fill();ctx.restore();
}

function drawTreeNode(ctx,x,y,r,val,state,pulse){
  var NODE_COL={default:'#8B5CF6',visited:'#F59E0B',path:'#10B981',active:'#EC4899',found:'#34D399'};
  var col=NODE_COL[state]||NODE_COL.default;
  ctx.save();
  if(pulse!==undefined&&pulse>0&&state!=='default'){
    var pr=r+4+pulse*14;
    ctx.beginPath();ctx.arc(x,y,pr,0,Math.PI*2);
    ctx.strokeStyle=col;ctx.lineWidth=2;ctx.globalAlpha=(1-pulse)*0.55;ctx.stroke();
    ctx.globalAlpha=1;
  }
  if(state!=='default'){ctx.shadowColor=col;ctx.shadowBlur=18;}
  ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);
  ctx.fillStyle='rgba(6,3,14,0.95)';ctx.fill();
  ctx.shadowBlur=0;
  ctx.strokeStyle=col;ctx.lineWidth=2.2;ctx.stroke();
  ctx.fillStyle='#EDE9FE';ctx.font='bold '+(r>16?'12':'10')+'px "JetBrains Mono",monospace';
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText(String(val),x,y);
  ctx.restore();
}

function drawEdge(ctx,x1,y1,x2,y2,color,weight,state){
  var stateCol={traversed:'#10B981',active:'#EC4899',path:'#F59E0B'};
  var col=stateCol[state]||color||'rgba(139,92,246,0.35)';
  var lw=state?2.8:1.5;
  ctx.save();
  if(state){ctx.shadowColor=col;ctx.shadowBlur=10;}
  ctx.strokeStyle=col;ctx.lineWidth=lw;
  ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
  ctx.shadowBlur=0;
  if(weight!==undefined){
    var mx=(x1+x2)/2,my=(y1+y2)/2;
    ctx.fillStyle=state?col:'#F59E0B';ctx.font='10px "JetBrains Mono",monospace';
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(weight,mx,my-8);
  }
  ctx.restore();
}

function mkCanvas(wrap,w,h){
  var c=document.createElement('canvas');
  c.style.cssText='width:100%;max-width:'+w+'px;height:auto;display:block;';
  var dpr=Math.min(window.devicePixelRatio||1,2);
  c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);
  var ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);
  wrap.appendChild(c);
  return {canvas:c,ctx:ctx,W:w,H:h};
}

function makeControls(container,opts){
  // opts: {label, onPlay, onPause, onStep, onReset, onSpeed, extras:[{label,fn}]}
  var bar=document.createElement('div');bar.className='algo-controls';
  var playBtn=document.createElement('button');playBtn.className='algo-btn';playBtn.textContent='Play';
  var pauseBtn=document.createElement('button');pauseBtn.className='algo-btn';pauseBtn.textContent='Pause';pauseBtn.disabled=true;
  var stepBtn=document.createElement('button');stepBtn.className='algo-btn';stepBtn.textContent='Step';
  var resetBtn=document.createElement('button');resetBtn.className='algo-btn';resetBtn.textContent='Reset';
  var counter=document.createElement('span');counter.className='step-counter';counter.textContent='Step 0 / 0';
  var speedWrap=document.createElement('label');speedWrap.className='speed-wrap';
  speedWrap.innerHTML='Speed <input type="range" min="0.25" max="3" step="0.25" value="1"> <span>1x</span>';
  var speedSlider=speedWrap.querySelector('input');
  var speedLabel=speedWrap.querySelector('span');
  speedSlider.addEventListener('input',function(){speedLabel.textContent=speedSlider.value+'x';if(opts.onSpeed)opts.onSpeed(parseFloat(speedSlider.value));});

  playBtn.addEventListener('click',function(){
    playBtn.disabled=true;pauseBtn.disabled=false;stepBtn.disabled=true;
    if(opts.onPlay)opts.onPlay();
  });
  pauseBtn.addEventListener('click',function(){
    pauseBtn.disabled=true;playBtn.disabled=false;stepBtn.disabled=false;
    if(opts.onPause)opts.onPause();
  });
  stepBtn.addEventListener('click',function(){if(opts.onStep)opts.onStep();});
  resetBtn.addEventListener('click',function(){
    playBtn.disabled=false;pauseBtn.disabled=true;stepBtn.disabled=false;
    if(opts.onReset)opts.onReset();
  });

  bar.appendChild(playBtn);bar.appendChild(pauseBtn);bar.appendChild(stepBtn);bar.appendChild(resetBtn);
  if(opts.extras){opts.extras.forEach(function(e){var b=document.createElement('button');b.className='algo-btn';b.textContent=e.label;b.addEventListener('click',e.fn);bar.appendChild(b);});}
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

/* ═══════════════════════════════════════════════════════════
   01  Array Demo
═══════════════════════════════════════════════════════════ */
function initArrayDemo(){
  var container=document.getElementById('demo-array');if(!container)return;
  var wrap=container.querySelector('.demo-canvas-wrap');
  var cv=mkCanvas(wrap,680,220);
  var ctx=cv.ctx,W=cv.W,H=cv.H;

  var arr=[3,7,1,9,4,6,2,8,5,10];
  var states=arr.map(function(){return 'default';});
  var animTargets=arr.map(function(v,i){return {x:40+i*62,y:H/2-20,alpha:1};});
  var CW=58,CH=44;
  var rafId=null,playing=false,steps=[],stepIdx=0,speed=1;

  function buildSearchSteps(val){
    var s=[];
    for(var i=0;i<arr.length;i++){
      s.push({type:'compare',idx:i,msg:'Comparing index '+i+' (value '+arr[i]+') with '+val});
      if(arr[i]===val){s.push({type:'found',idx:i,msg:'Found '+val+' at index '+i+'!'});break;}
    }
    if(!s.some(function(x){return x.type==='found';}))s.push({type:'notfound',msg:'Value '+val+' not found.'});
    return s;
  }
  function buildTwoPointerSteps(){
    var s=[],L=0,R=arr.length-1;
    s.push({type:'tp',L:L,R:R,msg:'Two pointer: L=0, R='+(arr.length-1)});
    while(L<R){L++;R--;s.push({type:'tp',L:L,R:R,msg:'Move L to '+L+', R to '+R});}
    s.push({type:'done',msg:'Pointers met — traversal complete.'});
    return s;
  }
  function buildWindowSteps(){
    var s=[],W2=3;
    for(var i=0;i<=arr.length-W2;i++){
      var sum=arr[i]+arr[i+1]+arr[i+2];
      s.push({type:'window',start:i,end:i+W2-1,sum:sum,msg:'Window ['+i+'...'+(i+W2-1)+'] sum = '+sum});
    }
    return s;
  }

  var ctrl=makeControls(wrap,{
    onPlay:function(){playing=true;runAnim();},
    onPause:function(){playing=false;if(rafId)cancelAnimationFrame(rafId);},
    onStep:function(){if(stepIdx<steps.length){applyStep(steps[stepIdx]);stepIdx++;ctrl.setStep(stepIdx,steps.length);}},
    onReset:function(){reset();},
    onSpeed:function(s){speed=s;},
    extras:[
      {label:'Two Pointer',fn:function(){reset();steps=buildTwoPointerSteps();ctrl.setStep(0,steps.length);ctrl.setStatus('Two pointer ready. Press Play or Step.');}},
      {label:'Sliding Window',fn:function(){reset();steps=buildWindowSteps();ctrl.setStep(0,steps.length);ctrl.setStatus('Sliding window ready. Press Play or Step.');}}
    ]
  });

  // Input controls
  var inputArea=document.createElement('div');
  inputArea.style.cssText='display:flex;gap:0.5rem;flex-wrap:wrap;padding:0.6rem 1rem;background:var(--surface-2);border-bottom:1px solid var(--border);align-items:center;font-family:var(--font-mono);font-size:0.78rem;color:var(--text-muted);';
  inputArea.innerHTML='<input class="demo-input" id="arr-search-val" placeholder="value" style="width:64px"><button class="algo-btn" id="arr-search-btn">Search</button><input class="demo-input" id="arr-ins-val" placeholder="val" style="width:48px"><input class="demo-input" id="arr-ins-idx" placeholder="idx" style="width:48px"><button class="algo-btn" id="arr-ins-btn">Insert</button><input class="demo-input" id="arr-del-idx" placeholder="idx" style="width:48px"><button class="algo-btn" id="arr-del-btn">Delete</button>';
  wrap.parentElement.insertBefore(inputArea,wrap);

  inputArea.querySelector('#arr-search-btn').addEventListener('click',function(){
    var v=parseInt(inputArea.querySelector('#arr-search-val').value);
    if(isNaN(v))return;
    reset();steps=buildSearchSteps(v);ctrl.setStep(0,steps.length);ctrl.setStatus('Search for '+v+' ready.');
  });
  inputArea.querySelector('#arr-ins-btn').addEventListener('click',function(){
    var v=parseInt(inputArea.querySelector('#arr-ins-val').value);
    var idx=parseInt(inputArea.querySelector('#arr-ins-idx').value);
    if(isNaN(v)||isNaN(idx))return;
    idx=clamp(idx,0,arr.length);
    arr.splice(idx,0,v);
    states=arr.map(function(){return 'default';});
    states[idx]='selected';
    animTargets=arr.map(function(x,i){return {x:40+i*Math.min(62,Math.floor((W-40)/arr.length)),y:H/2-20,alpha:1};});
    ctrl.setStatus('Inserted '+v+' at index '+idx);
    draw(1);
  });
  inputArea.querySelector('#arr-del-btn').addEventListener('click',function(){
    var idx=parseInt(inputArea.querySelector('#arr-del-idx').value);
    if(isNaN(idx)||idx<0||idx>=arr.length)return;
    arr.splice(idx,1);
    states=arr.map(function(){return 'default';});
    animTargets=arr.map(function(x,i){return {x:40+i*Math.min(62,Math.floor((W-40)/arr.length)),y:H/2-20,alpha:1};});
    ctrl.setStatus('Deleted index '+idx);
    draw(1);
  });

  var tpState=null,windowState=null;

  function applyStep(s){
    states=arr.map(function(){return 'default';});
    tpState=null;windowState=null;
    if(s.type==='compare'){states[s.idx]='comparing';}
    else if(s.type==='found'){states[s.idx]='found';}
    else if(s.type==='tp'){tpState={L:s.L,R:s.R};}
    else if(s.type==='window'){windowState={start:s.start,end:s.end};}
    ctrl.setStatus(s.msg);
    draw(1);
  }

  var lastTime=0;
  function runAnim(){
    if(!playing||stepIdx>=steps.length){
      if(stepIdx>=steps.length){playing=false;ctrl.setPlaying(false);ctrl.setStatus('Done!');}
      return;
    }
    var now=performance.now();
    var delay=1300/speed;
    if(now-lastTime>delay){
      applyStep(steps[stepIdx]);stepIdx++;ctrl.setStep(stepIdx,steps.length);lastTime=now;
    }
    rafId=raf(runAnim);
  }

  function reset(){
    playing=false;stepIdx=0;steps=[];
    states=arr.map(function(){return 'default';});
    tpState=null;windowState=null;
    ctrl.setStep(0,0);ctrl.setStatus('Ready. Choose an operation.');
    ctrl.setPlaying(false);
    draw(1);
  }

  function draw(alpha){
    ctx.clearRect(0,0,W,H);
    var cellW=Math.min(58,Math.floor((W-40)/arr.length));
    arr.forEach(function(v,i){
      var x=40+i*(cellW+2),y=H/2-22;
      drawCell(ctx,x,y,cellW,44,v,states[i]);
      // index label
      ctx.fillStyle='rgba(167,139,250,0.5)';ctx.font='10px "JetBrains Mono",monospace';
      ctx.textAlign='center';ctx.fillText(i,x+cellW/2,y+54);
    });
    // two pointer markers
    if(tpState){
      var cellW2=Math.min(58,Math.floor((W-40)/arr.length));
      [[tpState.L,'#10B981','L'],[tpState.R,'#EF4444','R']].forEach(function(p){
        var px=40+p[0]*(cellW2+2)+cellW2/2,py=H/2-32;
        ctx.fillStyle=p[1];ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px-7,py-12);ctx.lineTo(px+7,py-12);ctx.closePath();ctx.fill();
        ctx.fillStyle=p[1];ctx.font='bold 10px "JetBrains Mono",monospace';ctx.textAlign='center';ctx.fillText(p[2],px,py-16);
      });
    }
    // sliding window bracket
    if(windowState){
      var cellW3=Math.min(58,Math.floor((W-40)/arr.length));
      var wx1=40+windowState.start*(cellW3+2)-2,wx2=40+(windowState.end+1)*(cellW3+2)-4;
      ctx.strokeStyle='#F59E0B';ctx.lineWidth=2;
      ctx.strokeRect(wx1,H/2-24,wx2-wx1,48);
    }
  }

  draw(1);
  ctrl.setStatus('Ready. Choose an operation above or press Two Pointer / Sliding Window.');
}

/* ═══════════════════════════════════════════════════════════
   02  Linked List Demo
═══════════════════════════════════════════════════════════ */
function initLinkedListDemo(){
  var container=document.getElementById('demo-linkedlist');if(!container)return;
  var wrap=container.querySelector('.demo-canvas-wrap');
  var cv=mkCanvas(wrap,680,220);
  var ctx=cv.ctx,W=cv.W,H=cv.H;

  var nodes=[5,12,8,3,17];
  var doubly=false;
  var steps=[],stepIdx=0,playing=false,speed=1,rafId=null;
  var highlights=[];
  var slowPtr=0,fastPtr=0,cycleMode=false;

  function getPositions(){
    var n=nodes.length,bw=70,gap=40;
    var total=n*bw+(n-1)*gap;
    var startX=(W-total)/2;
    return nodes.map(function(v,i){return {x:startX+i*(bw+gap),y:H/2-18,w:bw,h:36};});
  }

  function draw(){
    ctx.clearRect(0,0,W,H);
    var pos=getPositions();
    // "head" label
    if(pos.length>0){
      ctx.fillStyle='#A78BFA';ctx.font='bold 10px "JetBrains Mono",monospace';ctx.textAlign='center';
      ctx.fillText('head',pos[0].x+pos[0].w/2,pos[0].y-12);
      ctx.beginPath();ctx.moveTo(pos[0].x+pos[0].w/2,pos[0].y-8);ctx.lineTo(pos[0].x+pos[0].w/2,pos[0].y);
      ctx.strokeStyle='#A78BFA';ctx.lineWidth=1;ctx.stroke();
    }
    pos.forEach(function(p,i){
      var hi=highlights.indexOf(i)>=0;
      var col=hi?'#F59E0B':'#8B5CF6';
      if(cycleMode){
        if(i===slowPtr&&i===fastPtr)col='#EC4899';
        else if(i===slowPtr)col='#10B981';
        else if(i===fastPtr)col='#EF4444';
      }
      drawBox(ctx,p.x,p.y,p.w,p.h,String(nodes[i]),null,col);
      // forward arrow
      if(i<pos.length-1){
        drawArrow(ctx,p.x+p.w,p.y+p.h/2,pos[i+1].x,pos[i+1].y+pos[i+1].h/2,'rgba(139,92,246,0.7)',false);
      }
      // null
      if(i===pos.length-1){
        ctx.fillStyle='rgba(167,139,250,0.5)';ctx.font='10px "JetBrains Mono",monospace';
        ctx.textAlign='left';ctx.fillText('null',p.x+p.w+14,p.y+p.h/2+4);
      }
      // back arrows (doubly)
      if(doubly&&i>0){
        drawArrow(ctx,p.x,p.y+p.h/2-6,pos[i-1].x+pos[i-1].w,pos[i-1].y+pos[i-1].h/2-6,'rgba(236,72,153,0.5)',true);
      }
    });
    // cycle mode legend
    if(cycleMode){
      ctx.font='10px "JetBrains Mono",monospace';ctx.textAlign='left';
      ctx.fillStyle='#10B981';ctx.fillText('slow',10,H-30);
      ctx.fillStyle='#EF4444';ctx.fillText('fast',10,H-15);
    }
  }

  var ctrl=makeControls(wrap,{
    onPlay:function(){playing=true;runAnim();},
    onPause:function(){playing=false;if(rafId)cancelAnimationFrame(rafId);},
    onStep:function(){if(stepIdx<steps.length){applyStep(steps[stepIdx]);stepIdx++;ctrl.setStep(stepIdx,steps.length);}},
    onReset:function(){reset();},
    onSpeed:function(s){speed=s;},
    extras:[
      {label:'Insert Head',fn:function(){
        var v=Math.floor(Math.random()*30)+1;
        nodes.unshift(v);highlights=[0];ctrl.setStatus('Inserted '+v+' at head.');draw();
      }},
      {label:'Insert Tail',fn:function(){
        var v=Math.floor(Math.random()*30)+1;
        nodes.push(v);highlights=[nodes.length-1];ctrl.setStatus('Inserted '+v+' at tail.');draw();
      }},
      {label:'Reverse',fn:function(){
        reset();
        var s=[];
        var tmp=nodes.slice().reverse();
        for(var i=0;i<tmp.length;i++){s.push({type:'rev',arr:tmp.slice(0,i+1).concat(nodes.slice(i+1)),msg:'Reversed '+(i+1)+' node(s).'});}
        s.push({type:'rev',arr:tmp,msg:'List fully reversed!'});
        steps=s;ctrl.setStep(0,steps.length);ctrl.setStatus('Reverse ready.');
      }},
      {label:'Toggle Doubly',fn:function(){doubly=!doubly;ctrl.setStatus(doubly?'Doubly linked list — back arrows shown.':'Singly linked list.');draw();}},
      {label:'Slow/Fast Ptr',fn:function(){
        cycleMode=!cycleMode;slowPtr=0;fastPtr=0;
        if(cycleMode){steps=[];for(var i=0;i<nodes.length;i++){var nf=Math.min(fastPtr+2,nodes.length-1);steps.push({type:'ptr',slow:i,fast:nf,msg:'Slow='+i+', Fast='+nf});}fastPtr=0;}
        ctrl.setStatus(cycleMode?'Slow/Fast pointer mode active. Press Play.':'Slow/Fast pointer off.');
        ctrl.setStep(0,steps.length);draw();
      }}
    ]
  });

  function applyStep(s){
    if(s.type==='rev'){nodes=s.arr.slice();highlights=[];}
    else if(s.type==='ptr'){slowPtr=s.slow;fastPtr=s.fast;}
    ctrl.setStatus(s.msg);draw();
  }

  var lastTime=0;
  function runAnim(){
    if(!playing||stepIdx>=steps.length){
      if(stepIdx>=steps.length){playing=false;ctrl.setPlaying(false);ctrl.setStatus('Done!');}
      return;
    }
    var now=performance.now(),delay=1300/speed;
    if(now-lastTime>delay){applyStep(steps[stepIdx]);stepIdx++;ctrl.setStep(stepIdx,steps.length);lastTime=now;}
    rafId=raf(runAnim);
  }

  function reset(){
    playing=false;stepIdx=0;steps=[];highlights=[];cycleMode=false;slowPtr=0;fastPtr=0;
    nodes=[5,12,8,3,17];
    ctrl.setStep(0,0);ctrl.setStatus('Ready.');ctrl.setPlaying(false);draw();
  }

  draw();
  ctrl.setStatus('Ready. Use buttons to insert, reverse, or run pointer algorithms.');
}

/* ═══════════════════════════════════════════════════════════
   03  Stack & Queue Demo
═══════════════════════════════════════════════════════════ */
function initStackQueueDemo(){
  var container=document.getElementById('demo-stackqueue');if(!container)return;
  var wrap=container.querySelector('.demo-canvas-wrap');
  var cv=mkCanvas(wrap,680,260);
  var ctx=cv.ctx,W=cv.W,H=cv.H;

  var stack=[],queue=[];
  var steps=[],stepIdx=0,playing=false,speed=1,rafId=null;

  function draw(){
    ctx.clearRect(0,0,W,H);
    // divider
    ctx.strokeStyle='rgba(139,92,246,0.25)';ctx.lineWidth=1;ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.moveTo(W/2,10);ctx.lineTo(W/2,H-10);ctx.stroke();ctx.setLineDash([]);

    // STACK (left)
    ctx.fillStyle='rgba(167,139,250,0.6)';ctx.font='bold 11px "JetBrains Mono",monospace';ctx.textAlign='center';
    ctx.fillText('STACK (LIFO)',W/4,22);
    var bw=80,bh=32,sx=W/4-bw/2;
    stack.forEach(function(v,i){
      var sy=H-30-(i+1)*(bh+4);
      rrect(ctx,sx,sy,bw,bh,4);ctx.fillStyle='#2E1065';ctx.fill();
      ctx.strokeStyle=i===stack.length-1?'#A78BFA':'#8B5CF6';ctx.lineWidth=1.5;ctx.stroke();
      ctx.fillStyle='#EDE9FE';ctx.font='bold 12px "JetBrains Mono",monospace';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(v,sx+bw/2,sy+bh/2);
    });
    // TOP arrow
    if(stack.length>0){
      var topY=H-30-stack.length*(bh+4);
      ctx.fillStyle='#10B981';ctx.font='10px "JetBrains Mono",monospace';ctx.textAlign='right';ctx.textBaseline='middle';
      ctx.fillText('TOP ->',sx-4,topY+bh/2);
    }
    // stack base
    ctx.strokeStyle='rgba(139,92,246,0.5)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(sx-10,H-28);ctx.lineTo(sx+bw+10,H-28);ctx.stroke();

    // QUEUE (right)
    ctx.fillStyle='rgba(167,139,250,0.6)';ctx.font='bold 11px "JetBrains Mono",monospace';ctx.textAlign='center';ctx.textBaseline='alphabetic';
    ctx.fillText('QUEUE (FIFO)',3*W/4,22);
    var qh=36,qw=54,qy=H/2-qh/2;
    queue.forEach(function(v,i){
      var qx=W/2+20+i*(qw+4);
      rrect(ctx,qx,qy,qw,qh,4);ctx.fillStyle='#1E1B4B';ctx.fill();
      ctx.strokeStyle=i===0?'#10B981':i===queue.length-1?'#EF4444':'#8B5CF6';ctx.lineWidth=1.5;ctx.stroke();
      ctx.fillStyle='#EDE9FE';ctx.font='bold 12px "JetBrains Mono",monospace';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText(v,qx+qw/2,qy+qh/2);
    });
    // FRONT/REAR labels
    if(queue.length>0){
      var fx=W/2+20,rx=W/2+20+(queue.length-1)*(qw+4);
      ctx.font='9px "JetBrains Mono",monospace';ctx.textBaseline='alphabetic';
      ctx.fillStyle='#10B981';ctx.textAlign='center';ctx.fillText('FRONT',fx+qw/2,qy-4);
      ctx.fillStyle='#EF4444';ctx.textAlign='center';ctx.fillText('REAR',rx+qw/2,qy-4);
      // dequeue arrow
      drawArrow(ctx,fx-2,qy+qh/2,W/2+4,qy+qh/2,'rgba(16,185,129,0.6)',false);
    }
  }

  var ctrl=makeControls(wrap,{
    onPlay:function(){playing=true;runAnim();},
    onPause:function(){playing=false;if(rafId)cancelAnimationFrame(rafId);},
    onStep:function(){if(stepIdx<steps.length){applyStep(steps[stepIdx]);stepIdx++;ctrl.setStep(stepIdx,steps.length);}},
    onReset:function(){reset();},
    onSpeed:function(s){speed=s;},
    extras:[
      {label:'Push',fn:function(){var v=Math.floor(Math.random()*99)+1;stack.push(v);ctrl.setStatus('Pushed '+v+' onto stack. Top='+v);draw();}},
      {label:'Pop',fn:function(){if(!stack.length){ctrl.setStatus('Stack is empty!');return;}var v=stack.pop();ctrl.setStatus('Popped '+v+' from stack.');draw();}},
      {label:'Enqueue',fn:function(){var v=Math.floor(Math.random()*99)+1;queue.push(v);ctrl.setStatus('Enqueued '+v+'. Rear='+v);draw();}},
      {label:'Dequeue',fn:function(){if(!queue.length){ctrl.setStatus('Queue is empty!');return;}var v=queue.shift();ctrl.setStatus('Dequeued '+v+'. New front='+(queue[0]||'(empty)'));draw();}},
      {label:'Brackets Demo',fn:function(){runBracketsDemo();}}
    ]
  });

  function runBracketsDemo(){
    reset();
    var expr='(({[]}))';
    var s=[];var tmpStack=[];var valid=true;
    var pairs={'(':')','[':']','{':'}'};
    for(var i=0;i<expr.length;i++){
      var ch=expr[i];
      if('([{'.includes(ch)){tmpStack.push(ch);s.push({stack:tmpStack.slice(),msg:'Push "'+ch+'" — stack: ['+tmpStack.join('')+']',valid:null});}
      else{
        if(!tmpStack.length||pairs[tmpStack[tmpStack.length-1]]!==ch){valid=false;s.push({stack:tmpStack.slice(),msg:'Mismatch! "'+ch+'" unexpected.',valid:false});break;}
        tmpStack.pop();s.push({stack:tmpStack.slice(),msg:'Pop for "'+ch+'" — stack: ['+tmpStack.join('')+']',valid:null});
      }
    }
    if(valid)s.push({stack:[],msg:'Result: VALID — all brackets matched!',valid:true});
    steps=s;ctrl.setStep(0,steps.length);ctrl.setStatus('Balanced brackets demo: '+expr);
  }

  function applyStep(s){
    if(s.stack!==undefined)stack=s.stack.slice();
    ctrl.setStatus(s.msg);
    if(s.valid===true)ctrl.setStatus('VALID! '+s.msg);
    else if(s.valid===false)ctrl.setStatus('INVALID! '+s.msg);
    draw();
  }

  var lastTime=0;
  function runAnim(){
    if(!playing||stepIdx>=steps.length){if(stepIdx>=steps.length){playing=false;ctrl.setPlaying(false);}return;}
    var now=performance.now(),delay=1300/speed;
    if(now-lastTime>delay){applyStep(steps[stepIdx]);stepIdx++;ctrl.setStep(stepIdx,steps.length);lastTime=now;}
    rafId=raf(runAnim);
  }

  function reset(){
    playing=false;stepIdx=0;steps=[];stack=[];queue=[];
    ctrl.setStep(0,0);ctrl.setStatus('Ready.');ctrl.setPlaying(false);draw();
  }

  draw();
  ctrl.setStatus('Push/Pop the stack or Enqueue/Dequeue the queue. Try Brackets Demo.');
}

/* ═══════════════════════════════════════════════════════════
   04  Tree Demo (BST)
═══════════════════════════════════════════════════════════ */
function initTreeDemo(){
  var container=document.getElementById('demo-tree');if(!container)return;
  var wrap=container.querySelector('.demo-canvas-wrap');
  var cv=mkCanvas(wrap,680,320);
  var ctx=cv.ctx,W=cv.W,H=cv.H;

  var root=null;
  var steps=[],stepIdx=0,playing=false,speed=1,rafId=null;
  var highlighted=[];

  function Node(v){return {val:v,left:null,right:null,x:0,y:0};}
  function insert(nd,v){
    if(!nd)return Node(v);
    if(v<nd.val)nd.left=insert(nd.left,v);
    else nd.right=insert(nd.right,v);
    return nd;
  }
  function layout(nd,x,y,spread){
    if(!nd)return;
    nd.x=x;nd.y=y;
    layout(nd.left,x-spread,y+55,spread/2);
    layout(nd.right,x+spread,y+55,spread/2);
  }
  function inorder(nd,out){if(!nd)return;inorder(nd.left,out);out.push(nd.val);inorder(nd.right,out);}
  function preorder(nd,out){if(!nd)return;out.push(nd.val);preorder(nd.left,out);preorder(nd.right,out);}
  function postorder(nd,out){if(!nd)return;postorder(nd.left,out);postorder(nd.right,out);out.push(nd.val);}

  function buildInsertSteps(v){
    var path=[],cur=root;
    while(cur){path.push(cur.val);cur=(v<cur.val)?cur.left:cur.right;}
    var s=path.map(function(pv,i){return {hi:[...path.slice(0,i+1)],msg:'Traversing: '+pv+(v<pv?' (go left)':' (go right)')};});
    s.push({hi:path,inserted:v,msg:'Inserted '+v+'!'});
    return s;
  }

  function getTraversalSteps(type){
    var out=[];
    if(type==='inorder')inorder(root,out);
    else if(type==='preorder')preorder(root,out);
    else postorder(root,out);
    var s=[],acc=[];
    out.forEach(function(v){acc.push(v);s.push({hi:acc.slice(),msg:type+': visit '+v});});
    return s;
  }

  var pulseT=0,pulseRafId=null;

  function drawTree(nd,parentX,parentY){
    if(!nd)return;
    if(parentX!==undefined)drawEdge(ctx,parentX,parentY,nd.x,nd.y,'rgba(139,92,246,0.35)');
    var isHi=highlighted.includes(nd.val);
    var state=isHi?'visited':'default';
    drawTreeNode(ctx,nd.x,nd.y,20,nd.val,state,isHi?pulseT:undefined);
    drawTree(nd.left,nd.x,nd.y);drawTree(nd.right,nd.x,nd.y);
  }

  function draw(){
    ctx.clearRect(0,0,W,H);
    if(!root){ctx.fillStyle='rgba(167,139,250,0.4)';ctx.font='14px "JetBrains Mono",monospace';ctx.textAlign='center';ctx.fillText('Insert values to build the BST',W/2,H/2);return;}
    layout(root,W/2,40,140);
    drawTree(root);
  }

  function pulseLoop(){
    pulseT=(pulseT+0.025)%1;
    draw();
    if(highlighted.length>0)pulseRafId=raf(pulseLoop);else{pulseRafId=null;draw();}
  }
  function startPulse(){if(!pulseRafId&&highlighted.length>0)pulseRafId=raf(pulseLoop);}

  var ctrl=makeControls(wrap,{
    onPlay:function(){playing=true;runAnim();},
    onPause:function(){playing=false;if(rafId)cancelAnimationFrame(rafId);},
    onStep:function(){if(stepIdx<steps.length){applyStep(steps[stepIdx]);stepIdx++;ctrl.setStep(stepIdx,steps.length);}},
    onReset:function(){reset();},
    onSpeed:function(s){speed=s;},
    extras:[
      {label:'InOrder',fn:function(){if(!root)return;reset2();steps=getTraversalSteps('inorder');ctrl.setStep(0,steps.length);ctrl.setStatus('InOrder traversal ready.');}},
      {label:'PreOrder',fn:function(){if(!root)return;reset2();steps=getTraversalSteps('preorder');ctrl.setStep(0,steps.length);ctrl.setStatus('PreOrder traversal ready.');}},
      {label:'PostOrder',fn:function(){if(!root)return;reset2();steps=getTraversalSteps('postorder');ctrl.setStep(0,steps.length);ctrl.setStatus('PostOrder traversal ready.');}}
    ]
  });

  var inputArea=document.createElement('div');
  inputArea.style.cssText='display:flex;gap:0.5rem;padding:0.6rem 1rem;background:var(--surface-2);border-bottom:1px solid var(--border);align-items:center;';
  inputArea.innerHTML='<input class="demo-input" id="tree-ins-val" placeholder="value"><button class="algo-btn" id="tree-ins-btn">Insert</button><button class="algo-btn" id="tree-reset-btn">Clear Tree</button>';
  wrap.parentElement.insertBefore(inputArea,wrap);

  inputArea.querySelector('#tree-ins-btn').addEventListener('click',function(){
    var v=parseInt(inputArea.querySelector('#tree-ins-val').value);
    if(isNaN(v))return;
    var s=buildInsertSteps(v);
    root=insert(root,v);layout(root,W/2,40,140);
    steps=s;stepIdx=0;ctrl.setStep(0,steps.length);ctrl.setStatus('Inserting '+v+'...');
  });
  inputArea.querySelector('#tree-reset-btn').addEventListener('click',function(){root=null;reset();});

  // seed tree
  [50,30,70,20,40,60,80].forEach(function(v){root=insert(root,v);});

  function applyStep(s){
    highlighted=s.hi||[];
    if(s.inserted){highlighted=s.hi||[];}
    ctrl.setStatus(s.msg);draw();startPulse();
  }

  var lastTime=0;
  function runAnim(){
    if(!playing||stepIdx>=steps.length){if(stepIdx>=steps.length){playing=false;ctrl.setPlaying(false);ctrl.setStatus('Done!');}return;}
    var now=performance.now(),delay=1200/speed;
    if(now-lastTime>delay){applyStep(steps[stepIdx]);stepIdx++;ctrl.setStep(stepIdx,steps.length);lastTime=now;}
    rafId=raf(runAnim);
  }
  function reset2(){playing=false;stepIdx=0;steps=[];highlighted=[];ctrl.setPlaying(false);if(pulseRafId){cancelAnimationFrame(pulseRafId);pulseRafId=null;}}
  function reset(){reset2();draw();}

  draw();
  ctrl.setStatus('BST loaded with [50,30,70,20,40,60,80]. Insert values or run traversals.');
}

/* ═══════════════════════════════════════════════════════════
   05  Heap Demo
═══════════════════════════════════════════════════════════ */
function initHeapDemo(){
  var container=document.getElementById('demo-heap');if(!container)return;
  var wrap=container.querySelector('.demo-canvas-wrap');
  var cv=mkCanvas(wrap,680,320);
  var ctx=cv.ctx,W=cv.W,H=cv.H;

  var heap=[],isMin=true;
  var steps=[],stepIdx=0,playing=false,speed=1,rafId=null;
  var compareIdxs=[];

  function parent(i){return Math.floor((i-1)/2);}
  function left(i){return 2*i+1;}
  function right(i){return 2*i+2;}
  function cmp(a,b){return isMin?a<b:a>b;}

  function buildInsertSteps(val){
    var h=heap.slice();h.push(val);
    var s=[{h:h.slice(),ci:[h.length-1],msg:'Added '+val+' at end of heap array (index '+(h.length-1)+').'}];
    var i=h.length-1;
    while(i>0&&cmp(h[i],h[parent(i)])){
      var p=parent(i);
      s.push({h:h.slice(),ci:[i,p],msg:'Swap index '+i+' ('+h[i]+') with parent '+p+' ('+h[p]+'). Bubble up.'});
      var tmp=h[i];h[i]=h[p];h[p]=tmp;
      s.push({h:h.slice(),ci:[p],msg:'After swap: '+h[p]+' now at index '+p+'.'});
      i=p;
    }
    s.push({h:h.slice(),ci:[],msg:'Heap property restored. '+(isMin?'Min':'Max')+'-heap valid.'});
    return s;
  }

  function buildExtractSteps(){
    if(!heap.length)return[];
    var h=heap.slice();
    var root=h[0];
    var s=[{h:h.slice(),ci:[0],msg:'Extract root: '+root+'. Replace with last element ('+h[h.length-1]+').'}];
    h[0]=h.pop();
    s.push({h:h.slice(),ci:[0],msg:'Last element '+h[0]+' moved to root (index 0). Begin bubble-down.'});
    var i=0;
    while(true){
      var l=left(i),r=right(i),target=i;
      if(l<h.length&&cmp(h[l],h[target]))target=l;
      if(r<h.length&&cmp(h[r],h[target]))target=r;
      if(target===i)break;
      s.push({h:h.slice(),ci:[i,target],msg:'Swap index '+i+' ('+h[i]+') with child '+target+' ('+h[target]+'). Bubble down.'});
      var tmp=h[i];h[i]=h[target];h[target]=tmp;
      s.push({h:h.slice(),ci:[target],msg:'Swapped. Continue from index '+target+'.'});
      i=target;
    }
    s.push({h:h.slice(),ci:[],msg:'Heap property restored. Extracted: '+root});
    return s;
  }

  function nodePos(i,total){
    var depth=Math.floor(Math.log2(i+1));
    var posInRow=i-Math.pow(2,depth)+1;
    var rowCount=Math.pow(2,depth);
    var x=(posInRow+0.5)/rowCount*W*0.85+W*0.075;
    var y=38+depth*54;
    return {x:x,y:y};
  }

  function draw(){
    ctx.clearRect(0,0,W,H);
    // tree view
    heap.forEach(function(v,i){
      if(i>0){
        var p=nodePos(parent(i),heap.length),c=nodePos(i,heap.length);
        drawEdge(ctx,p.x,p.y,c.x,c.y,'rgba(139,92,246,0.35)');
      }
    });
    heap.forEach(function(v,i){
      var pos=nodePos(i,heap.length);
      var state=compareIdxs.includes(i)?'comparing':'default';
      drawTreeNode(ctx,pos.x,pos.y,18,v,state);
    });
    // array strip at bottom
    var aw=Math.min(48,(W-40)/Math.max(1,heap.length));
    var startX=(W-aw*heap.length)/2;
    heap.forEach(function(v,i){
      var state=compareIdxs.includes(i)?'comparing':'default';
      drawCell(ctx,startX+i*aw,H-42,aw-2,32,v,state);
    });
    // heap type label
    ctx.fillStyle='rgba(167,139,250,0.7)';ctx.font='bold 11px "JetBrains Mono",monospace';ctx.textAlign='left';ctx.textBaseline='top';
    ctx.fillText((isMin?'MIN':'MAX')+'-HEAP: parent '+(isMin?'<=':'>=')+'children',10,8);
  }

  var ctrl=makeControls(wrap,{
    onPlay:function(){playing=true;runAnim();},
    onPause:function(){playing=false;if(rafId)cancelAnimationFrame(rafId);},
    onStep:function(){if(stepIdx<steps.length){applyStep(steps[stepIdx]);stepIdx++;ctrl.setStep(stepIdx,steps.length);}},
    onReset:function(){reset();},
    onSpeed:function(s){speed=s;},
    extras:[
      {label:'Toggle Min/Max',fn:function(){isMin=!isMin;heap=[];ctrl.setStatus('Switched to '+(isMin?'MIN':'MAX')+'-heap. Heap cleared.');draw();}},
      {label:'Extract Root',fn:function(){if(!heap.length){ctrl.setStatus('Heap is empty!');return;}var s=buildExtractSteps();var last=s[s.length-1];heap=last.h.slice();steps=s;stepIdx=0;ctrl.setStep(0,steps.length);ctrl.setStatus('Extract ready.');}}
    ]
  });

  var inputArea=document.createElement('div');
  inputArea.style.cssText='display:flex;gap:0.5rem;padding:0.6rem 1rem;background:var(--surface-2);border-bottom:1px solid var(--border);align-items:center;';
  inputArea.innerHTML='<input class="demo-input" id="heap-ins-val" placeholder="value"><button class="algo-btn" id="heap-ins-btn">Insert</button>';
  wrap.parentElement.insertBefore(inputArea,wrap);

  inputArea.querySelector('#heap-ins-btn').addEventListener('click',function(){
    var v=parseInt(inputArea.querySelector('#heap-ins-val').value);
    if(isNaN(v))return;
    var s=buildInsertSteps(v);
    var last=s[s.length-1];heap=last.h.slice();
    steps=s;stepIdx=0;ctrl.setStep(0,steps.length);ctrl.setStatus('Inserting '+v+' into heap...');
  });

  function applyStep(s){
    heap=s.h.slice();compareIdxs=s.ci||[];ctrl.setStatus(s.msg);draw();
  }
  var lastTime=0;
  function runAnim(){
    if(!playing||stepIdx>=steps.length){if(stepIdx>=steps.length){playing=false;ctrl.setPlaying(false);ctrl.setStatus('Done!');}return;}
    var now=performance.now(),delay=1300/speed;
    if(now-lastTime>delay){applyStep(steps[stepIdx]);stepIdx++;ctrl.setStep(stepIdx,steps.length);lastTime=now;}
    rafId=raf(runAnim);
  }
  function reset(){
    playing=false;stepIdx=0;steps=[];heap=[10,20,15,30,40];compareIdxs=[];
    ctrl.setStep(0,0);ctrl.setStatus('Ready.');ctrl.setPlaying(false);draw();
  }

  heap=[10,20,15,30,40];draw();
  ctrl.setStatus('Min-heap loaded. Insert values or Extract Root.');
}

/* ═══════════════════════════════════════════════════════════
   06  Hash Table Demo
═══════════════════════════════════════════════════════════ */
function initHashDemo(){
  var container=document.getElementById('demo-hash');if(!container)return;
  var wrap=container.querySelector('.demo-canvas-wrap');
  var cv=mkCanvas(wrap,680,320);
  var ctx=cv.ctx,W=cv.W,H=cv.H;

  var BUCKETS=10;
  var table=[];for(var i=0;i<BUCKETS;i++)table.push([]);
  var openAddr=new Array(BUCKETS).fill(null);
  var useOpen=false;
  var steps=[],stepIdx=0,playing=false,speed=1,rafId=null;
  var activeHash=-1,animMsg='';

  function hashFn(key){
    var s=String(key),sum=0;for(var i=0;i<s.length;i++)sum+=s.charCodeAt(i);return sum%BUCKETS;
  }

  function buildInsertSteps(key){
    var s=String(key),chars=s.split(''),sum=0,steps2=[];
    var charSteps=chars.map(function(c){sum+=c.charCodeAt(0);return {msg:'ASCII("'+c+'")='+c.charCodeAt(0)+' running sum='+sum,partial:sum};});
    steps2=steps2.concat(charSteps.map(function(x){return {type:'ascii',msg:x.msg};}));
    var idx=sum%BUCKETS;
    steps2.push({type:'mod',bucket:idx,msg:'Sum '+sum+' mod '+BUCKETS+' = '+idx+' → Bucket '+idx});
    steps2.push({type:'insert',key:key,bucket:idx,msg:'Inserting "'+key+'" into bucket '+idx+(table[idx].length>0?' (collision — chaining)':'')+'.'});
    return steps2;
  }

  function draw(){
    ctx.clearRect(0,0,W,H);
    var bh=26,bw=90,startY=10,startX=12;
    for(var i=0;i<BUCKETS;i++){
      var by=startY+i*(bh+4);
      rrect(ctx,startX,by,bw,bh,3);
      ctx.fillStyle=i===activeHash?'rgba(139,92,246,0.3)':'rgba(30,27,74,0.8)';ctx.fill();
      ctx.strokeStyle=i===activeHash?'#A78BFA':'rgba(139,92,246,0.4)';ctx.lineWidth=1.5;ctx.stroke();
      ctx.fillStyle='rgba(167,139,250,0.7)';ctx.font='10px "JetBrains Mono",monospace';ctx.textAlign='center';ctx.textBaseline='middle';
      ctx.fillText('Bucket '+i,startX+bw/2,by+bh/2);
      // chain
      var chain=useOpen?[]:table[i];
      chain.forEach(function(k,j){
        var kx=startX+bw+12+j*68,ky=by;
        rrect(ctx,kx,ky,62,bh,3);ctx.fillStyle='#2E1065';ctx.fill();
        ctx.strokeStyle='#8B5CF6';ctx.lineWidth=1;ctx.stroke();
        ctx.fillStyle='#EDE9FE';ctx.font='bold 10px "JetBrains Mono",monospace';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(String(k),kx+31,ky+bh/2);
        if(j>0)drawArrow(ctx,kx-6,ky+bh/2,kx,ky+bh/2,'rgba(139,92,246,0.5)',false);
      });
    }
    // open addr
    if(useOpen){
      openAddr.forEach(function(k,i){
        if(k===null)return;
        var by=startY+i*(bh+4);
        var kx=startX+bw+12;
        rrect(ctx,kx,by,62,bh,3);ctx.fillStyle='#2E1065';ctx.fill();
        ctx.strokeStyle='#F59E0B';ctx.lineWidth=1;ctx.stroke();
        ctx.fillStyle='#EDE9FE';ctx.font='bold 10px "JetBrains Mono",monospace';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(String(k),kx+31,by+bh/2);
      });
    }
    // load factor
    var keys=useOpen?openAddr.filter(function(x){return x!==null;}).length:table.reduce(function(a,b){return a+b.length;},0);
    var lf=keys/BUCKETS;
    ctx.fillStyle='rgba(167,139,250,0.6)';ctx.font='10px "JetBrains Mono",monospace';ctx.textAlign='left';ctx.textBaseline='top';
    ctx.fillText('Load factor: '+lf.toFixed(2)+' / 1.0',W-160,8);
    rrect(ctx,W-160,22,140,10,3);ctx.fillStyle='rgba(30,27,74,0.8)';ctx.fill();
    ctx.strokeStyle='rgba(139,92,246,0.4)';ctx.lineWidth=1;ctx.stroke();
    rrect(ctx,W-160,22,Math.round(140*Math.min(lf,1)),10,3);ctx.fillStyle=lf>0.7?'#EF4444':lf>0.5?'#F59E0B':'#10B981';ctx.fill();
  }

  var ctrl=makeControls(wrap,{
    onPlay:function(){playing=true;runAnim();},
    onPause:function(){playing=false;if(rafId)cancelAnimationFrame(rafId);},
    onStep:function(){if(stepIdx<steps.length){applyStep(steps[stepIdx]);stepIdx++;ctrl.setStep(stepIdx,steps.length);}},
    onReset:function(){reset();},
    onSpeed:function(s){speed=s;},
    extras:[
      {label:'Open Addr',fn:function(){useOpen=!useOpen;ctrl.setStatus('Mode: '+(useOpen?'Open Addressing (linear probing)':'Separate Chaining'));draw();}},
      {label:'Resize x2',fn:function(){
        var allKeys=table.reduce(function(a,b){return a.concat(b);},[]);
        BUCKETS*=2;table=[];for(var i=0;i<BUCKETS;i++)table.push([]);
        allKeys.forEach(function(k){table[hashFn(k)].push(k);});
        ctrl.setStatus('Resized to '+BUCKETS+' buckets. All keys rehashed.');draw();
        BUCKETS=10;table=[];for(var i=0;i<BUCKETS;i++)table.push([]);
        allKeys.forEach(function(k){table[hashFn(k)].push(k);});
      }}
    ]
  });

  var inputArea=document.createElement('div');
  inputArea.style.cssText='display:flex;gap:0.5rem;padding:0.6rem 1rem;background:var(--surface-2);border-bottom:1px solid var(--border);align-items:center;';
  inputArea.innerHTML='<input class="demo-input" id="hash-key" placeholder="key"><button class="algo-btn" id="hash-ins-btn">Insert</button>';
  wrap.parentElement.insertBefore(inputArea,wrap);

  inputArea.querySelector('#hash-ins-btn').addEventListener('click',function(){
    var k=inputArea.querySelector('#hash-key').value.trim();
    if(!k)return;
    var s=buildInsertSteps(k);
    steps=s;stepIdx=0;ctrl.setStep(0,steps.length);ctrl.setStatus('Hashing "'+k+'"...');
  });

  function applyStep(s){
    if(s.type==='ascii'){}
    else if(s.type==='mod'){activeHash=s.bucket;}
    else if(s.type==='insert'){
      activeHash=s.bucket;
      if(!useOpen)table[s.bucket].push(s.key);
      else{var idx=s.bucket;while(openAddr[idx]!==null)idx=(idx+1)%BUCKETS;openAddr[idx]=s.key;}
    }
    ctrl.setStatus(s.msg);draw();
  }

  var lastTime=0;
  function runAnim(){
    if(!playing||stepIdx>=steps.length){if(stepIdx>=steps.length){playing=false;ctrl.setPlaying(false);activeHash=-1;ctrl.setStatus('Done!');draw();}return;}
    var now=performance.now(),delay=1300/speed;
    if(now-lastTime>delay){applyStep(steps[stepIdx]);stepIdx++;ctrl.setStep(stepIdx,steps.length);lastTime=now;}
    rafId=raf(runAnim);
  }
  function reset(){
    playing=false;stepIdx=0;steps=[];activeHash=-1;
    BUCKETS=10;table=[];for(var i=0;i<BUCKETS;i++)table.push([]);
    openAddr=new Array(BUCKETS).fill(null);
    ctrl.setStep(0,0);ctrl.setStatus('Ready.');ctrl.setPlaying(false);draw();
  }

  // seed
  ['cat','dog','fox','ant','bee','owl'].forEach(function(k){table[hashFn(k)].push(k);});
  draw();
  ctrl.setStatus('Hash table loaded. Type a key and press Insert.');
}

/* ═══════════════════════════════════════════════════════════
   07  Graph Demo
═══════════════════════════════════════════════════════════ */
function initGraphDemo(){
  var container=document.getElementById('demo-graph');if(!container)return;
  var wrap=container.querySelector('.demo-canvas-wrap');
  var cv=mkCanvas(wrap,680,340);
  var ctx=cv.ctx,W=cv.W,H=cv.H;

  var nodeLabels=['A','B','C','D','E','F','G','H'];
  var nodePos=[
    [W*0.15,H*0.18],[W*0.5,H*0.08],[W*0.82,H*0.18],
    [W*0.08,H*0.54],[W*0.38,H*0.54],[W*0.65,H*0.54],
    [W*0.25,H*0.85],[W*0.72,H*0.85]
  ];
  var edges=[[0,1,4],[0,3,2],[1,2,3],[1,4,5],[2,5,1],[3,4,6],[3,6,3],[4,5,2],[4,7,4],[5,7,5],[6,7,1]];
  var nodeStates=nodeLabels.map(function(){return 'default';});
  var edgeStates={};
  var steps=[],stepIdx=0,playing=false,speed=1,rafId=null;
  var algo='bfs';
  var distTable=nodeLabels.map(function(){return Infinity;});
  var queueVis=[],stackVis=[];

  function adj(i){return edges.filter(function(e){return e[0]===i||e[1]===i;}).map(function(e){return e[0]===i?{to:e[1],w:e[2]}:{to:e[0],w:e[2]};});}

  function buildBFS(start){
    var visited=new Array(8).fill(false),queue=[start],s=[];
    s.push({ns:nodeLabels.map(function(x,i){return i===start?'active':'default';}),q:[start],es:{},msg:'BFS start at '+nodeLabels[start]+'. Enqueue.'});
    while(queue.length){
      var cur=queue.shift();visited[cur]=true;
      var ns2=nodeLabels.map(function(x,i){return visited[i]?'visited':queue.includes(i)?'active':'default';});
      s.push({ns:ns2,q:queue.slice(),es:{},msg:'Visit '+nodeLabels[cur]+'. Process neighbors.'});
      adj(cur).forEach(function(nb){
        if(!visited[nb.to]&&!queue.includes(nb.to)){
          queue.push(nb.to);
          var ns3=nodeLabels.map(function(x,i){return visited[i]?'visited':queue.includes(i)?'active':'default';});
          s.push({ns:ns3,q:queue.slice(),es:{},msg:'Enqueue '+nodeLabels[nb.to]+' (neighbor of '+nodeLabels[cur]+')'});
        }
      });
    }
    return s;
  }

  function buildDFS(start){
    var visited=new Array(8).fill(false),stack=[start],s=[];
    s.push({ns:nodeLabels.map(function(x,i){return i===start?'active':'default';}),stk:[start],msg:'DFS start at '+nodeLabels[start]+'.'});
    while(stack.length){
      var cur=stack.pop();
      if(visited[cur])continue;
      visited[cur]=true;
      var ns2=nodeLabels.map(function(x,i){return visited[i]?'visited':stack.includes(i)?'active':'default';});
      s.push({ns:ns2,stk:stack.slice(),msg:'Visit '+nodeLabels[cur]+'.'});
      adj(cur).forEach(function(nb){if(!visited[nb.to]){stack.push(nb.to);}});
    }
    return s;
  }

  function buildDijkstra(start){
    var dist=new Array(8).fill(Infinity),prev=new Array(8).fill(-1),visited=new Array(8).fill(false),s=[];
    dist[start]=0;
    for(var iter=0;iter<8;iter++){
      var u=-1;dist.forEach(function(d,i){if(!visited[i]&&(u===-1||d<dist[u]))u=i;});
      if(u===-1||dist[u]===Infinity)break;
      visited[u]=true;
      s.push({ns:nodeLabels.map(function(x,i){return i===u?'active':visited[i]?'path':'default';}),dist:dist.slice(),msg:'Visit '+nodeLabels[u]+'. Dist='+dist[u]+'.'});
      adj(u).forEach(function(nb){
        var nd=dist[u]+nb.w;
        if(nd<dist[nb.to]){dist[nb.to]=nd;prev[nb.to]=u;s.push({ns:nodeLabels.map(function(x,i){return i===nb.to?'visited':visited[i]?'path':'default';}),dist:dist.slice(),msg:'Update dist['+nodeLabels[nb.to]+']='+nd+' via '+nodeLabels[u]+'.'});}
      });
    }
    return s;
  }

  function getSteps(){
    if(algo==='bfs')return buildBFS(0);
    if(algo==='dfs')return buildDFS(0);
    return buildDijkstra(0);
  }

  function draw(){
    ctx.clearRect(0,0,W,H);
    var stateColors={default:'#8B5CF6',visited:'#F59E0B',active:'#10B981',path:'#EC4899'};
    edges.forEach(function(e){
      var p1=nodePos[e[0]],p2=nodePos[e[1]];
      drawEdge(ctx,p1[0],p1[1],p2[0],p2[1],'rgba(139,92,246,0.3)',e[2]);
    });
    nodeStates.forEach(function(st,i){
      drawTreeNode(ctx,nodePos[i][0],nodePos[i][1],18,nodeLabels[i],st);
    });
    // queue/stack strip
    if(algo==='bfs'&&queueVis.length){
      ctx.fillStyle='rgba(167,139,250,0.5)';ctx.font='9px "JetBrains Mono",monospace';ctx.textAlign='left';ctx.fillText('Queue:',10,H-8);
      queueVis.forEach(function(v,i){drawCell(ctx,58+i*28,H-22,24,18,nodeLabels[v],'selected');});
    }
    if(algo==='dfs'&&stackVis.length){
      ctx.fillStyle='rgba(167,139,250,0.5)';ctx.font='9px "JetBrains Mono",monospace';ctx.textAlign='left';ctx.fillText('Stack:',10,H-8);
      stackVis.forEach(function(v,i){drawCell(ctx,58+i*28,H-22,24,18,nodeLabels[v],'selected');});
    }
    // dijkstra dist table
    if(algo==='dijkstra'){
      ctx.fillStyle='rgba(167,139,250,0.5)';ctx.font='9px "JetBrains Mono",monospace';ctx.textAlign='left';ctx.fillText('Dist:',10,H-8);
      distTable.forEach(function(d,i){
        var txt=d===Infinity?'INF':String(d);
        drawCell(ctx,50+i*36,H-22,32,18,nodeLabels[i]+':'+txt,'default');
      });
    }
  }

  var ctrl=makeControls(wrap,{
    onPlay:function(){playing=true;runAnim();},
    onPause:function(){playing=false;if(rafId)cancelAnimationFrame(rafId);},
    onStep:function(){if(stepIdx<steps.length){applyStep(steps[stepIdx]);stepIdx++;ctrl.setStep(stepIdx,steps.length);}},
    onReset:function(){reset();},
    onSpeed:function(s){speed=s;},
    extras:[
      {label:'BFS',fn:function(){algo='bfs';reset();steps=getSteps();ctrl.setStep(0,steps.length);ctrl.setStatus('BFS from A ready.');}},
      {label:'DFS',fn:function(){algo='dfs';reset();steps=getSteps();ctrl.setStep(0,steps.length);ctrl.setStatus('DFS from A ready.');}},
      {label:'Dijkstra',fn:function(){algo='dijkstra';reset();steps=getSteps();ctrl.setStep(0,steps.length);ctrl.setStatus('Dijkstra from A ready.');}}
    ]
  });

  function applyStep(s){
    nodeStates=s.ns||nodeStates;
    if(s.q)queueVis=s.q;
    if(s.stk)stackVis=s.stk;
    if(s.dist)distTable=s.dist.slice();
    ctrl.setStatus(s.msg);draw();
  }

  var lastTime=0;
  function runAnim(){
    if(!playing||stepIdx>=steps.length){if(stepIdx>=steps.length){playing=false;ctrl.setPlaying(false);ctrl.setStatus('Done!');}return;}
    var now=performance.now(),delay=1300/speed;
    if(now-lastTime>delay){applyStep(steps[stepIdx]);stepIdx++;ctrl.setStep(stepIdx,steps.length);lastTime=now;}
    rafId=raf(runAnim);
  }
  function reset(){
    playing=false;stepIdx=0;steps=[];
    nodeStates=nodeLabels.map(function(){return 'default';});
    distTable=nodeLabels.map(function(){return Infinity;});
    queueVis=[];stackVis=[];
    ctrl.setStep(0,0);ctrl.setStatus('Ready.');ctrl.setPlaying(false);draw();
  }

  steps=getSteps();ctrl.setStep(0,steps.length);
  draw();ctrl.setStatus('BFS from A ready. Press Play or Step.');
}

/* ═══════════════════════════════════════════════════════════
   08  Sort Demo
═══════════════════════════════════════════════════════════ */
function initSortDemo(){
  var container=document.getElementById('demo-sort');if(!container)return;
  var wrap=container.querySelector('.demo-canvas-wrap');
  var cv=mkCanvas(wrap,680,280);
  var ctx=cv.ctx,W=cv.W,H=cv.H;

  var N=20,arr=[],steps=[],stepIdx=0,playing=false,speed=1,rafId=null;
  var algo='bubble',comparisons=0,swaps=0;
  var barStates=[],barAnimH=[],lerpRafId=null;

  function newArr(){
    arr=[];for(var i=0;i<N;i++)arr.push(Math.floor(Math.random()*80)+10);
    barStates=arr.map(function(){return 'default';});
    comparisons=0;swaps=0;steps=[];stepIdx=0;
    barAnimH=arr.map(function(v){return Math.round((v/100)*(H-50));});
  }

  function lerpLoop(){
    var settled=true,maxH=H-50;
    arr.forEach(function(v,i){
      var t=Math.round((v/100)*maxH),d=t-(barAnimH[i]||0);
      if(Math.abs(d)>0.5){barAnimH[i]=(barAnimH[i]||0)+d*0.18;settled=false;}
      else barAnimH[i]=t;
    });
    draw();
    if(!settled)lerpRafId=raf(lerpLoop);else lerpRafId=null;
  }
  function triggerLerp(){if(lerpRafId)cancelAnimationFrame(lerpRafId);lerpRafId=raf(lerpLoop);}

  function buildBubble(a){
    var s=[],b=a.slice(),n=b.length,comps=0,swp=0;
    for(var i=0;i<n-1;i++){
      for(var j=0;j<n-i-1;j++){
        comps++;
        var st=b.map(function(v,k){return k>=n-i?'sorted':'default';});
        st[j]='comparing';st[j+1]='comparing';
        s.push({a:b.slice(),states:st,comps:comps,swaps:swp,msg:'Compare index '+j+' ('+b[j]+') with '+(j+1)+' ('+b[j+1]+')'});
        if(b[j]>b[j+1]){var tmp=b[j];b[j]=b[j+1];b[j+1]=tmp;swp++;s.push({a:b.slice(),states:st,comps:comps,swaps:swp,msg:'Swap '+b[j+1]+' and '+b[j]});}
      }
    }
    var done=b.map(function(){return 'sorted';});
    s.push({a:b.slice(),states:done,comps:comps,swaps:swp,msg:'Sorted!'});
    return s;
  }

  function buildQuick(a){
    var s=[],b=a.slice();
    function qsort(lo,hi){
      if(lo>=hi)return;
      var pivot=b[hi],i=lo-1,comps=0;
      s.push({a:b.slice(),states:b.map(function(v,k){return k===hi?'pivot':k>=lo&&k<=hi?'default':'sorted';}),comps:0,swaps:0,msg:'Pivot = '+pivot+' (index '+hi+')'});
      for(var j=lo;j<hi;j++){
        comps++;
        if(b[j]<=pivot){i++;var tmp=b[i];b[i]=b[j];b[j]=tmp;}
      }
      i++;var tmp=b[i];b[i]=b[hi];b[hi]=tmp;
      s.push({a:b.slice(),states:b.map(function(v,k){return k===i?'found':k<lo||k>hi?'sorted':'default';}),comps:comps,swaps:1,msg:'Pivot '+pivot+' placed at index '+i});
      qsort(lo,i-1);qsort(i+1,hi);
    }
    qsort(0,b.length-1);
    s.push({a:b.slice(),states:b.map(function(){return 'sorted';}),comps:0,swaps:0,msg:'Sorted!'});
    return s;
  }

  function buildInsertion(a){
    var s=[],b=a.slice();
    for(var i=1;i<b.length;i++){
      var key=b[i],j=i-1;
      s.push({a:b.slice(),states:b.map(function(v,k){return k<i?'sorted':k===i?'comparing':'default';}),comps:0,swaps:0,msg:'Insert '+key+' (index '+i+')'});
      while(j>=0&&b[j]>key){b[j+1]=b[j];j--;s.push({a:b.slice(),states:b.map(function(v,k){return k<=i?'comparing':'default';}),comps:1,swaps:1,msg:'Shift '+b[j+1]+' right'});}
      b[j+1]=key;
    }
    s.push({a:b.slice(),states:b.map(function(){return 'sorted';}),comps:0,swaps:0,msg:'Sorted!'});
    return s;
  }

  function buildSelection(a){
    var s=[],b=a.slice();
    for(var i=0;i<b.length-1;i++){
      var minIdx=i;
      for(var j=i+1;j<b.length;j++){
        if(b[j]<b[minIdx])minIdx=j;
        s.push({a:b.slice(),states:b.map(function(v,k){return k<i?'sorted':k===minIdx?'found':k===j?'comparing':'default';}),comps:1,swaps:0,msg:'Min so far: '+b[minIdx]+' at '+minIdx});
      }
      var tmp=b[i];b[i]=b[minIdx];b[minIdx]=tmp;
      s.push({a:b.slice(),states:b.map(function(v,k){return k<=i?'sorted':'default';}),comps:0,swaps:1,msg:'Swap min '+b[i]+' to position '+i});
    }
    s.push({a:b.slice(),states:b.map(function(){return 'sorted';}),comps:0,swaps:0,msg:'Sorted!'});
    return s;
  }

  function getSteps(){
    if(algo==='bubble')return buildBubble(arr);
    if(algo==='quick')return buildQuick(arr);
    if(algo==='insertion')return buildInsertion(arr);
    return buildSelection(arr);
  }

  function draw(){
    ctx.clearRect(0,0,W,H);
    var bw=Math.floor((W-20)/N)-1,maxH=H-50;
    var FILL={default:'#1E1047',comparing:'#451A00',sorted:'#052E16',pivot:'#450A0A',found:'#052E16',selected:'#2E1065'};
    var STROKE={default:'#8B5CF6',comparing:'#F59E0B',sorted:'#10B981',pivot:'#EF4444',found:'#34D399',selected:'#A78BFA'};
    var GLOW={comparing:'rgba(245,158,11,0.7)',pivot:'rgba(239,68,68,0.75)',found:'rgba(52,211,153,0.8)',selected:'rgba(167,139,250,0.45)'};
    arr.forEach(function(v,i){
      if(barAnimH[i]===undefined)barAnimH[i]=Math.round((v/100)*maxH);
      var bh=Math.max(2,barAnimH[i]),x=10+i*(bw+1),y=H-30-bh;
      var st=barStates[i]||'default';
      ctx.save();
      if(GLOW[st]){ctx.shadowColor=GLOW[st];ctx.shadowBlur=14;}
      rrect(ctx,x,y,bw,bh,2);
      ctx.fillStyle=FILL[st]||FILL.default;ctx.fill();
      ctx.shadowBlur=0;
      ctx.strokeStyle=STROKE[st]||STROKE.default;ctx.lineWidth=1;ctx.stroke();
      ctx.restore();
      if(N<=20){ctx.fillStyle='rgba(167,139,250,0.5)';ctx.font='8px sans-serif';ctx.textAlign='center';ctx.textBaseline='top';ctx.fillText(v,x+bw/2,y-10);}
    });
    ctx.fillStyle='rgba(167,139,250,0.6)';ctx.font='10px "JetBrains Mono",monospace';ctx.textAlign='left';ctx.textBaseline='bottom';
    ctx.fillText('Comparisons: '+comparisons+'  Swaps: '+swaps,10,H-2);
  }

  var ctrl=makeControls(wrap,{
    onPlay:function(){playing=true;runAnim();},
    onPause:function(){playing=false;if(rafId)cancelAnimationFrame(rafId);},
    onStep:function(){if(stepIdx<steps.length){applyStep(steps[stepIdx]);stepIdx++;ctrl.setStep(stepIdx,steps.length);}},
    onReset:function(){newArr();steps=getSteps();ctrl.setStep(0,steps.length);ctrl.setStatus('Ready.');draw();},
    onSpeed:function(s){speed=s;},
    extras:[
      {label:'Bubble',fn:function(){algo='bubble';newArr();steps=getSteps();ctrl.setStep(0,steps.length);ctrl.setStatus('Bubble sort ready.');draw();}},
      {label:'Quick',fn:function(){algo='quick';newArr();steps=getSteps();ctrl.setStep(0,steps.length);ctrl.setStatus('Quick sort ready.');draw();}},
      {label:'Insertion',fn:function(){algo='insertion';newArr();steps=getSteps();ctrl.setStep(0,steps.length);ctrl.setStatus('Insertion sort ready.');draw();}},
      {label:'Selection',fn:function(){algo='selection';newArr();steps=getSteps();ctrl.setStep(0,steps.length);ctrl.setStatus('Selection sort ready.');draw();}},
      {label:'New Array',fn:function(){newArr();steps=getSteps();ctrl.setStep(0,steps.length);ctrl.setStatus('New array generated.');draw();}}
    ]
  });

  function applyStep(s){
    arr=s.a.slice();barStates=s.states.slice();comparisons=s.comps;swaps=s.swaps;
    ctrl.setStatus(s.msg);triggerLerp();
  }
  var lastTime=0;
  function runAnim(){
    if(!playing||stepIdx>=steps.length){if(stepIdx>=steps.length){playing=false;ctrl.setPlaying(false);ctrl.setStatus('Sorted! Comparisons: '+comparisons+' Swaps: '+swaps);}return;}
    var now=performance.now(),delay=80/speed;
    if(now-lastTime>delay){applyStep(steps[stepIdx]);stepIdx++;ctrl.setStep(stepIdx,steps.length);lastTime=now;}
    rafId=raf(runAnim);
  }

  newArr();steps=getSteps();ctrl.setStep(0,steps.length);
  draw();ctrl.setStatus('Bubble sort ready. Press Play or Step. Try other algorithms above.');
}

/* ═══════════════════════════════════════════════════════════
   09  Search Demo
═══════════════════════════════════════════════════════════ */
function initSearchDemo(){
  var container=document.getElementById('demo-search');if(!container)return;
  var wrap=container.querySelector('.demo-canvas-wrap');
  var cv=mkCanvas(wrap,680,220);
  var ctx=cv.ctx,W=cv.W,H=cv.H;

  var arr=[2,5,8,12,15,19,23,28,34,41,47,52,58,63,70,77,84,91,95,99,104,112,118,125];
  var steps=[],stepIdx=0,playing=false,speed=1,rafId=null;
  var cellStates=arr.map(function(){return 'default';});
  var markers={};
  var searchMode='binary';
  var comparisonsUsed={binary:0,linear:0,jump:0};

  function buildBinary(target){
    var s=[],L=0,R=arr.length-1,comps=0;
    while(L<=R){
      var mid=Math.floor((L+R)/2);comps++;
      var st=arr.map(function(v,i){return i===L?'selected':i===R?'selected':i===mid?'comparing':'default';});
      s.push({states:st,L:L,R:R,mid:mid,comps:comps,msg:'L='+L+' R='+R+' mid='+mid+' arr[mid]='+arr[mid]});
      if(arr[mid]===target){
        st[mid]='found';s.push({states:st,L:L,R:R,mid:mid,comps:comps,msg:'Found '+target+' at index '+mid+'! Comparisons: '+comps});
        comparisonsUsed.binary=comps;return s;
      }else if(arr[mid]<target){L=mid+1;s.push({states:st,L:L,R:R,mid:-1,comps:comps,msg:arr[mid]+'<'+target+': search right half'});}
      else{R=mid-1;s.push({states:st,L:L,R:R,mid:-1,comps:comps,msg:arr[mid]+'>'+target+': search left half'});}
    }
    s.push({states:arr.map(function(){return 'default';}),comps:comps,msg:'Not found. Comparisons: '+comps});
    comparisonsUsed.binary=comps;return s;
  }

  function buildLinear(target){
    var s=[],comps=0;
    for(var i=0;i<arr.length;i++){
      comps++;var st=arr.map(function(v,j){return j<i?'sorted':j===i?'comparing':'default';});
      s.push({states:st,comps:comps,msg:'Check index '+i+': arr['+i+']='+arr[i]+(arr[i]===target?' (match!)':'')});
      if(arr[i]===target){st[i]='found';s.push({states:st,comps:comps,msg:'Found '+target+' at index '+i+'! Comparisons: '+comps});comparisonsUsed.linear=comps;return s;}
    }
    s.push({states:arr.map(function(){return 'default';}),comps:comps,msg:'Not found. Comparisons: '+comps});
    comparisonsUsed.linear=comps;return s;
  }

  function draw(){
    ctx.clearRect(0,0,W,H);
    var cw=Math.floor((W-20)/arr.length);
    arr.forEach(function(v,i){
      drawCell(ctx,10+i*cw,H/2-28,cw-2,38,v,cellStates[i]);
      ctx.fillStyle='rgba(167,139,250,0.4)';ctx.font='8px "JetBrains Mono",monospace';ctx.textAlign='center';ctx.textBaseline='top';
      ctx.fillText(i,10+i*cw+cw/2,H/2+14);
    });
    // L/R markers
    if(markers.L!==undefined){
      var px=10+markers.L*cw+cw/2;
      ctx.fillStyle='#10B981';ctx.font='bold 10px "JetBrains Mono",monospace';ctx.textAlign='center';ctx.textBaseline='bottom';
      ctx.fillText('L',px,H/2-32);
    }
    if(markers.R!==undefined){
      var px2=10+markers.R*cw+cw/2;
      ctx.fillStyle='#EF4444';ctx.font='bold 10px "JetBrains Mono",monospace';ctx.textAlign='center';ctx.textBaseline='bottom';
      ctx.fillText('R',px2,H/2-32);
    }
    if(markers.mid!==undefined&&markers.mid>=0){
      var px3=10+markers.mid*cw+cw/2;
      ctx.fillStyle='#F59E0B';ctx.font='bold 10px "JetBrains Mono",monospace';ctx.textAlign='center';ctx.textBaseline='bottom';
      ctx.fillText('M',px3,H/2-32);
    }
  }

  var ctrl=makeControls(wrap,{
    onPlay:function(){playing=true;runAnim();},
    onPause:function(){playing=false;if(rafId)cancelAnimationFrame(rafId);},
    onStep:function(){if(stepIdx<steps.length){applyStep(steps[stepIdx]);stepIdx++;ctrl.setStep(stepIdx,steps.length);}},
    onReset:function(){reset();},
    onSpeed:function(s){speed=s;},
    extras:[
      {label:'Binary',fn:function(){searchMode='binary';ctrl.setStatus('Binary search selected.');}},
      {label:'Linear',fn:function(){searchMode='linear';ctrl.setStatus('Linear search selected.');}}
    ]
  });

  var inputArea=document.createElement('div');
  inputArea.style.cssText='display:flex;gap:0.5rem;padding:0.6rem 1rem;background:var(--surface-2);border-bottom:1px solid var(--border);align-items:center;';
  inputArea.innerHTML='<input class="demo-input" id="search-val" placeholder="target"><button class="algo-btn" id="search-btn">Search</button>';
  wrap.parentElement.insertBefore(inputArea,wrap);

  inputArea.querySelector('#search-btn').addEventListener('click',function(){
    var v=parseInt(inputArea.querySelector('#search-val').value);
    if(isNaN(v))return;
    reset();
    steps=searchMode==='linear'?buildLinear(v):buildBinary(v);
    ctrl.setStep(0,steps.length);ctrl.setStatus('Searching for '+v+' using '+(searchMode==='binary'?'binary':'linear')+' search...');
  });

  function applyStep(s){
    cellStates=s.states.slice();
    markers={L:s.L,R:s.R,mid:s.mid};
    ctrl.setStatus(s.msg);draw();
  }
  var lastTime=0;
  function runAnim(){
    if(!playing||stepIdx>=steps.length){if(stepIdx>=steps.length){playing=false;ctrl.setPlaying(false);}return;}
    var now=performance.now(),delay=1200/speed;
    if(now-lastTime>delay){applyStep(steps[stepIdx]);stepIdx++;ctrl.setStep(stepIdx,steps.length);lastTime=now;}
    rafId=raf(runAnim);
  }
  function reset(){
    playing=false;stepIdx=0;steps=[];markers={};
    cellStates=arr.map(function(){return 'default';});
    ctrl.setStep(0,0);ctrl.setStatus('Ready.');ctrl.setPlaying(false);draw();
  }

  draw();ctrl.setStatus('Enter a target value. Select Binary or Linear search, then press Search.');
}

/* ═══════════════════════════════════════════════════════════
   10  DP Demo
═══════════════════════════════════════════════════════════ */
function initDPDemo(){
  var container=document.getElementById('demo-dp');if(!container)return;
  var wrap=container.querySelector('.demo-canvas-wrap');
  var cv=mkCanvas(wrap,680,320);
  var ctx=cv.ctx,W=cv.W,H=cv.H;

  var tab='fib';
  var steps=[],stepIdx=0,playing=false,speed=1,rafId=null;
  var memo={},calls=0,memoCalls=0;
  var gridVals=[];
  var items=[{w:2,v:3},{w:3,v:4},{w:4,v:5},{w:5,v:6}];
  var capacity=8;
  var highlightCell=[-1,-1];
  var useMemo=false;

  function buildFibSteps(n,withMemo){
    var s=[],m={},callCount=0;
    function fib(k){
      callCount++;
      if(withMemo&&m[k]!==undefined){s.push({type:'fib',n:k,result:m[k],memo:Object.assign({},m),calls:callCount,msg:'fib('+k+') = '+m[k]+' (CACHED! saved work)'});return m[k];}
      s.push({type:'fib',n:k,result:null,memo:Object.assign({},m),calls:callCount,msg:'fib('+k+') called (call #'+callCount+')'});
      if(k<=1){m[k]=k;return k;}
      var a=fib(k-1),b=fib(k-2);
      m[k]=a+b;
      s.push({type:'fib',n:k,result:m[k],memo:Object.assign({},m),calls:callCount,msg:'fib('+k+')=fib('+(k-1)+')+fib('+(k-2)+')='+m[k]});
      return m[k];
    }
    fib(n);return s;
  }

  function buildKnapsackSteps(){
    var n=items.length,W2=capacity;
    var dp=[];
    for(var i=0;i<=n;i++){dp.push(new Array(W2+1).fill(0));}
    var s=[];
    for(var i=1;i<=n;i++){
      for(var w=0;w<=W2;w++){
        dp[i][w]=dp[i-1][w];
        if(items[i-1].w<=w){
          var withItem=dp[i-1][w-items[i-1].w]+items[i-1].v;
          if(withItem>dp[i][w])dp[i][w]=withItem;
        }
        s.push({type:'ks',grid:dp.map(function(r){return r.slice();}),hi:[i,w],msg:'Item '+i+' (w='+items[i-1].w+',v='+items[i-1].v+') cap='+w+': dp['+i+']['+w+']='+dp[i][w]});
      }
    }
    s.push({type:'ks',grid:dp.map(function(r){return r.slice();}),hi:[-1,-1],msg:'Optimal value: '+dp[n][W2]});
    return s;
  }

  function draw(){
    ctx.clearRect(0,0,W,H);
    if(tab==='fib'){
      // draw memo table
      ctx.fillStyle='rgba(167,139,250,0.6)';ctx.font='bold 12px "JetBrains Mono",monospace';ctx.textAlign='left';ctx.textBaseline='top';
      ctx.fillText('Fibonacci'+(useMemo?' (with memoization)':' (no memo)'),10,10);
      ctx.fillText('Calls: '+calls,10,30);
      var mx=0;
      Object.keys(memo).sort(function(a,b){return a-b;}).forEach(function(k,i){
        var x=10+i*64,y=60;
        rrect(ctx,x,y,58,32,4);ctx.fillStyle=useMemo?'#064E3B':'#2E1065';ctx.fill();
        ctx.strokeStyle=useMemo?'#10B981':'#8B5CF6';ctx.lineWidth=1.5;ctx.stroke();
        ctx.fillStyle='#EDE9FE';ctx.font='10px "JetBrains Mono",monospace';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText('fib('+k+')='+memo[k],x+29,y+16);mx=i;
      });
      if(Object.keys(memo).length===0){
        ctx.fillStyle='rgba(167,139,250,0.3)';ctx.font='12px "JetBrains Mono",monospace';ctx.textAlign='center';ctx.fillText('Press Play to see calls',W/2,H/2);
      }
    } else {
      // knapsack grid
      var n=items.length,W2=capacity;
      if(!gridVals.length)return;
      var cw=Math.floor((W-100)/(W2+1)),ch=Math.floor((H-80)/(n+1));
      ctx.fillStyle='rgba(167,139,250,0.6)';ctx.font='9px "JetBrains Mono",monospace';ctx.textAlign='center';ctx.textBaseline='middle';
      for(var w=0;w<=W2;w++){ctx.fillText(w,100+w*cw+cw/2,40);}
      for(var i=0;i<=n;i++){
        ctx.textAlign='right';ctx.fillText(i===0?'0':('I'+i+'(w='+items[i-1].w+',v='+items[i-1].v+')'),96,60+i*ch+ch/2);
        for(var w=0;w<=W2;w++){
          var hi=highlightCell[0]===i&&highlightCell[1]===w;
          var v=gridVals[i]?gridVals[i][w]||0:0;
          drawCell(ctx,100+w*cw,50+i*ch,cw-2,ch-2,v,hi?'comparing':'default');
        }
      }
    }
  }

  var ctrl=makeControls(wrap,{
    onPlay:function(){playing=true;runAnim();},
    onPause:function(){playing=false;if(rafId)cancelAnimationFrame(rafId);},
    onStep:function(){if(stepIdx<steps.length){applyStep(steps[stepIdx]);stepIdx++;ctrl.setStep(stepIdx,steps.length);}},
    onReset:function(){reset();},
    onSpeed:function(s){speed=s;},
    extras:[
      {label:'Fibonacci',fn:function(){tab='fib';reset();ctrl.setStatus('Fibonacci DP. Toggle memo to see the difference.');}},
      {label:'Knapsack',fn:function(){tab='ks';reset();steps=buildKnapsackSteps();ctrl.setStep(0,steps.length);ctrl.setStatus('Knapsack DP ready. Press Play.');}},
      {label:'Toggle Memo',fn:function(){useMemo=!useMemo;reset();ctrl.setStatus('Memoization '+(useMemo?'ON — calls drop dramatically':'OFF — recomputing everything'));}}
    ]
  });

  function applyStep(s){
    if(s.type==='fib'){memo=s.memo;calls=s.calls;}
    else if(s.type==='ks'){gridVals=s.grid.map(function(r){return r.slice();});highlightCell=s.hi||[-1,-1];}
    ctrl.setStatus(s.msg);draw();
  }
  var lastTime=0;
  function runAnim(){
    if(!playing||stepIdx>=steps.length){if(stepIdx>=steps.length){playing=false;ctrl.setPlaying(false);ctrl.setStatus('Done!');}return;}
    var now=performance.now(),delay=(tab==='fib'?1200:80)/speed;
    if(now-lastTime>delay){applyStep(steps[stepIdx]);stepIdx++;ctrl.setStep(stepIdx,steps.length);lastTime=now;}
    rafId=raf(runAnim);
  }
  function reset(){
    playing=false;stepIdx=0;steps=[];memo={};calls=0;gridVals=[];highlightCell=[-1,-1];
    if(tab==='fib'){steps=buildFibSteps(8,useMemo);}
    else{steps=buildKnapsackSteps();}
    ctrl.setStep(0,steps.length);ctrl.setStatus('Ready.');ctrl.setPlaying(false);draw();
  }

  steps=buildFibSteps(8,false);ctrl.setStep(0,steps.length);
  draw();ctrl.setStatus('Fibonacci DP. Press Play. Toggle Memo to see memoization effect.');
}

/* ═══════════════════════════════════════════════════════════
   11  Greedy Demo
═══════════════════════════════════════════════════════════ */
function initGreedyDemo(){
  var container=document.getElementById('demo-greedy');if(!container)return;
  var wrap=container.querySelector('.demo-canvas-wrap');
  var cv=mkCanvas(wrap,680,300);
  var ctx=cv.ctx,W=cv.W,H=cv.H;

  var tab='coin';
  var coins=[25,10,5,1],target=41;
  var activities=[
    {s:1,e:4,label:'A'},{s:3,e:5,label:'B'},{s:0,e:6,label:'C'},
    {s:5,e:7,label:'D'},{s:3,e:9,label:'E'},{s:6,e:10,label:'F'}
  ];
  var steps=[],stepIdx=0,playing=false,speed=1,rafId=null;
  var selectedCoins=[],selectedActivities=[],rejectedActivities=[];
  var coinStates=[];

  function buildCoinSteps(t){
    var s=[],rem=t,sel=[],sorted=coins.slice().sort(function(a,b){return b-a;});
    s.push({sel:[],rem:t,msg:'Target amount: '+t+'. Greedy: always pick largest coin.'});
    sorted.forEach(function(c){
      while(rem>=c){rem-=c;sel.push(c);s.push({sel:sel.slice(),rem:rem,msg:'Pick coin '+c+'. Remaining: '+rem});}
    });
    s.push({sel:sel.slice(),rem:rem,msg:'Done! Used '+sel.length+' coins: ['+sel.join(',')+']'});
    return s;
  }

  function buildActivitySteps(){
    var s=[],sorted=activities.slice().sort(function(a,b){return a.e-b.e;});
    var sel=[],lastEnd=-Infinity;
    s.push({sel:[],rej:[],msg:'Activity selection: sort by end time. Greedy: pick earliest ending.'});
    sorted.forEach(function(a){
      if(a.s>=lastEnd){sel.push(a.label);lastEnd=a.e;s.push({sel:sel.slice(),rej:sorted.filter(function(x){return !sel.includes(x.label);}).map(function(x){return x.label;}),msg:'Select '+a.label+' (end='+a.e+'). Last end now '+a.e});}
      else{s.push({sel:sel.slice(),rej:sorted.filter(function(x){return !sel.includes(x.label);}).map(function(x){return x.label;}),msg:'Skip '+a.label+' (start='+a.s+' overlaps last end '+lastEnd+')'});}
    });
    s.push({sel:sel.slice(),rej:activities.filter(function(x){return !sel.includes(x.label);}).map(function(x){return x.label;}),msg:'Optimal selection: ['+sel.join(',')+']'});
    return s;
  }

  function draw(){
    ctx.clearRect(0,0,W,H);
    if(tab==='coin'){
      ctx.fillStyle='rgba(167,139,250,0.6)';ctx.font='bold 11px "JetBrains Mono",monospace';ctx.textAlign='left';ctx.textBaseline='top';
      ctx.fillText('Greedy Coin Change — Target: '+target,10,10);
      selectedCoins.forEach(function(c,i){
        var x=10+i*52,y=50;
        rrect(ctx,x,y,44,44,22);ctx.fillStyle='#1E1B4B';ctx.fill();
        ctx.strokeStyle='#F59E0B';ctx.lineWidth=2;ctx.stroke();
        ctx.fillStyle='#EDE9FE';ctx.font='bold 14px "JetBrains Mono",monospace';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(c,x+22,y+22);
      });
      var total=selectedCoins.reduce(function(a,b){return a+b;},0);
      ctx.fillStyle='rgba(167,139,250,0.8)';ctx.font='12px "JetBrains Mono",monospace';ctx.textAlign='left';ctx.textBaseline='top';
      ctx.fillText('Total: '+total+' / '+target+'  Coins used: '+selectedCoins.length,10,H-30);
    } else {
      // activity timeline
      ctx.fillStyle='rgba(167,139,250,0.6)';ctx.font='bold 11px "JetBrains Mono",monospace';ctx.textAlign='left';ctx.textBaseline='top';
      ctx.fillText('Activity Selection — Greedy by earliest finish time',10,8);
      var timeW=W-80,startX=60,timeScale=timeW/12;
      // timeline axis
      for(var t2=0;t2<=12;t2++){
        var tx=startX+t2*timeScale;
        ctx.strokeStyle='rgba(139,92,246,0.2)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(tx,30);ctx.lineTo(tx,H-20);ctx.stroke();
        ctx.fillStyle='rgba(167,139,250,0.5)';ctx.font='9px "JetBrains Mono",monospace';ctx.textAlign='center';ctx.textBaseline='top';ctx.fillText(t2,tx,H-16);
      }
      activities.forEach(function(a,i){
        var x1=startX+a.s*timeScale,x2=startX+a.e*timeScale,y=35+i*36,h=26;
        var sel=selectedActivities.includes(a.label),rej=rejectedActivities.includes(a.label);
        rrect(ctx,x1,y,x2-x1,h,4);
        ctx.fillStyle=sel?'rgba(16,185,129,0.3)':rej?'rgba(239,68,68,0.15)':'rgba(139,92,246,0.15)';ctx.fill();
        ctx.strokeStyle=sel?'#10B981':rej?'#EF4444':'#8B5CF6';ctx.lineWidth=sel?2:1;ctx.stroke();
        ctx.fillStyle=sel?'#10B981':rej?'rgba(239,68,68,0.5)':'#EDE9FE';ctx.font='bold 11px "JetBrains Mono",monospace';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(a.label+' ('+a.s+'-'+a.e+')',x1+(x2-x1)/2,y+h/2);
      });
    }
  }

  var ctrl=makeControls(wrap,{
    onPlay:function(){playing=true;runAnim();},
    onPause:function(){playing=false;if(rafId)cancelAnimationFrame(rafId);},
    onStep:function(){if(stepIdx<steps.length){applyStep(steps[stepIdx]);stepIdx++;ctrl.setStep(stepIdx,steps.length);}},
    onReset:function(){reset();},
    onSpeed:function(s){speed=s;},
    extras:[
      {label:'Coin Change',fn:function(){tab='coin';reset();ctrl.setStatus('Coin change greedy. Coins: [25,10,5,1] Target: '+target);}},
      {label:'Activity Sel.',fn:function(){tab='act';reset();ctrl.setStatus('Activity selection greedy. Sort by end time.');}}
    ]
  });

  var inputArea=document.createElement('div');
  inputArea.style.cssText='display:flex;gap:0.5rem;padding:0.6rem 1rem;background:var(--surface-2);border-bottom:1px solid var(--border);align-items:center;font-family:var(--font-mono);font-size:0.78rem;color:var(--text-muted);';
  inputArea.innerHTML='Target: <input class="demo-input" id="greedy-target" value="41" style="width:56px"> <button class="algo-btn" id="greedy-go">Run</button>';
  wrap.parentElement.insertBefore(inputArea,wrap);
  inputArea.querySelector('#greedy-go').addEventListener('click',function(){
    target=parseInt(inputArea.querySelector('#greedy-target').value)||41;
    reset();
  });

  function applyStep(s){
    if(s.sel!==undefined&&tab==='coin'){selectedCoins=s.sel.slice();ctrl.setStatus(s.msg);}
    else if(tab==='act'){selectedActivities=(s.sel||[]).slice();rejectedActivities=(s.rej||[]).slice();ctrl.setStatus(s.msg);}
    draw();
  }
  var lastTime=0;
  function runAnim(){
    if(!playing||stepIdx>=steps.length){if(stepIdx>=steps.length){playing=false;ctrl.setPlaying(false);ctrl.setStatus('Done!');}return;}
    var now=performance.now(),delay=1300/speed;
    if(now-lastTime>delay){applyStep(steps[stepIdx]);stepIdx++;ctrl.setStep(stepIdx,steps.length);lastTime=now;}
    rafId=raf(runAnim);
  }
  function reset(){
    playing=false;stepIdx=0;selectedCoins=[];selectedActivities=[];rejectedActivities=[];
    steps=tab==='coin'?buildCoinSteps(target):buildActivitySteps();
    ctrl.setStep(0,steps.length);ctrl.setStatus('Ready.');ctrl.setPlaying(false);draw();
  }

  reset();draw();ctrl.setStatus('Greedy coin change ready. Press Play or Step.');
}

/* ═══════════════════════════════════════════════════════════
   12  Big-O / Interview Guide Demo
═══════════════════════════════════════════════════════════ */
function initDSAInterviewDemo(){
  var container=document.getElementById('demo-dsa-interview');if(!container)return;
  var wrap=container.querySelector('.demo-canvas-wrap');
  var cv=mkCanvas(wrap,680,340);
  var ctx=cv.ctx,W=cv.W,H=cv.H;

  var mouseX=-1;
  var complexities=[
    {label:'O(1)',       color:'#10B981', fn:function(n){return 1;}},
    {label:'O(log n)',   color:'#06B6D4', fn:function(n){return Math.log2(n);}},
    {label:'O(n)',       color:'#8B5CF6', fn:function(n){return n;}},
    {label:'O(n log n)', color:'#F59E0B', fn:function(n){return n*Math.log2(n);}},
    {label:'O(n^2)',     color:'#EF4444', fn:function(n){return n*n;}},
    {label:'O(2^n)',     color:'#DC2626', fn:function(n){return Math.pow(2,n);}}
  ];
  var maxN=50,maxOps=2000,pad={l:50,t:20,r:20,b:40};
  var gW=W-pad.l-pad.r,gH=H-pad.t-pad.b;

  function nToX(n){return pad.l+((n-1)/(maxN-1))*gW;}
  function opsToY(ops){return pad.t+gH-clamp(ops/maxOps,0,1)*gH;}

  function draw(){
    ctx.clearRect(0,0,W,H);
    // grid
    ctx.strokeStyle='rgba(139,92,246,0.1)';ctx.lineWidth=1;
    for(var i=0;i<=5;i++){
      var y=pad.t+i*(gH/5);
      ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(W-pad.r,y);ctx.stroke();
      ctx.fillStyle='rgba(167,139,250,0.4)';ctx.font='9px "JetBrains Mono",monospace';ctx.textAlign='right';ctx.textBaseline='middle';
      ctx.fillText(Math.round(maxOps*(1-i/5)),pad.l-4,y);
    }
    for(var j=0;j<=5;j++){
      var x=pad.l+j*(gW/5);
      ctx.beginPath();ctx.moveTo(x,pad.t);ctx.lineTo(x,H-pad.b);ctx.stroke();
      ctx.fillStyle='rgba(167,139,250,0.4)';ctx.font='9px "JetBrains Mono",monospace';ctx.textAlign='center';ctx.textBaseline='top';
      ctx.fillText(Math.round(1+(j/5)*(maxN-1)),x,H-pad.b+4);
    }
    // axes
    ctx.strokeStyle='rgba(139,92,246,0.5)';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.moveTo(pad.l,pad.t);ctx.lineTo(pad.l,H-pad.b);ctx.lineTo(W-pad.r,H-pad.b);ctx.stroke();
    ctx.fillStyle='rgba(167,139,250,0.5)';ctx.font='10px "JetBrains Mono",monospace';ctx.textAlign='center';
    ctx.fillText('n (input size)',pad.l+gW/2,H-4);
    // curves
    complexities.forEach(function(c){
      ctx.beginPath();ctx.strokeStyle=c.color;ctx.lineWidth=2;
      for(var n=1;n<=maxN;n++){
        var ops=c.fn(n),x=nToX(n),y=opsToY(ops);
        n===1?ctx.moveTo(x,y):ctx.lineTo(x,y);
      }
      ctx.stroke();
      // label at right
      var lastN=maxN,lastOps=c.fn(lastN);
      var ly=opsToY(lastOps);
      ctx.fillStyle=c.color;ctx.font='bold 9px "JetBrains Mono",monospace';ctx.textAlign='left';ctx.textBaseline='middle';
      if(ly>pad.t)ctx.fillText(c.label,W-pad.r+2,clamp(ly,pad.t+8,H-pad.b-8));
    });
    // vertical line on hover
    if(mouseX>=pad.l&&mouseX<=W-pad.r){
      var n=Math.round(1+(mouseX-pad.l)/gW*(maxN-1));
      ctx.strokeStyle='rgba(167,139,250,0.3)';ctx.lineWidth=1;ctx.setLineDash([4,4]);
      ctx.beginPath();ctx.moveTo(nToX(n),pad.t);ctx.lineTo(nToX(n),H-pad.b);ctx.stroke();ctx.setLineDash([]);
      // tooltips
      var ty=pad.t+10;
      complexities.forEach(function(c){
        var ops=c.fn(n);
        ctx.fillStyle=c.color;ctx.font='9px "JetBrains Mono",monospace';ctx.textAlign='left';ctx.textBaseline='top';
        ctx.fillText(c.label+': '+Math.round(ops),mouseX<W*0.7?mouseX+6:mouseX-80,ty);
        ty+=13;
      });
      ctx.fillStyle='rgba(167,139,250,0.8)';ctx.font='bold 10px "JetBrains Mono",monospace';ctx.textAlign='center';ctx.textBaseline='bottom';
      ctx.fillText('n='+n,nToX(n),H-pad.b-2);
    }
  }

  wrap.addEventListener('mousemove',function(e){
    var rect=cv.canvas.getBoundingClientRect();
    var scaleX=cv.W/rect.width;
    mouseX=(e.clientX-rect.left)*scaleX;
    draw();
  });
  wrap.addEventListener('mouseleave',function(){mouseX=-1;draw();});

  var ctrl=makeControls(wrap,{
    onPlay:function(){ctrl.setPlaying(false);},
    onPause:function(){},
    onStep:function(){},
    onReset:function(){mouseX=-1;draw();ctrl.setStatus('Hover to inspect complexity values.');},
    onSpeed:function(){}
  });
  ctrl.setStep(0,0);

  var inputArea=document.createElement('div');
  inputArea.style.cssText='display:flex;gap:0.5rem;padding:0.6rem 1rem;background:var(--surface-2);border-bottom:1px solid var(--border);align-items:center;font-family:var(--font-mono);font-size:0.78rem;color:var(--text-muted);';
  inputArea.innerHTML='Max n: <input class="demo-input" id="bigo-maxn" value="50" style="width:56px"> Max ops: <input class="demo-input" id="bigo-maxops" value="2000" style="width:72px"> <button class="algo-btn" id="bigo-apply">Apply</button>';
  wrap.parentElement.insertBefore(inputArea,wrap);
  inputArea.querySelector('#bigo-apply').addEventListener('click',function(){
    maxN=parseInt(inputArea.querySelector('#bigo-maxn').value)||50;
    maxOps=parseInt(inputArea.querySelector('#bigo-maxops').value)||2000;
    draw();ctrl.setStatus('Chart updated. Hover to inspect complexity values.');
  });

  draw();ctrl.setStatus('Hover over the chart to see exact operations at each n value.');
}

/* ── Bootstrap ──────────────────────────────────────────── */
function init(){
  initArrayDemo();
  initLinkedListDemo();
  initStackQueueDemo();
  initTreeDemo();
  initHeapDemo();
  initHashDemo();
  initGraphDemo();
  initSortDemo();
  initSearchDemo();
  initDPDemo();
  initGreedyDemo();
  initDSAInterviewDemo();

  var obs=new IntersectionObserver(function(es){
    es.forEach(function(e){if(e.isIntersecting)e.target.classList.add('visible');});
  },{threshold:0.1});
  document.querySelectorAll('.reveal').forEach(function(el){obs.observe(el);});
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);
else init();
})();
