/* Plotline studio: a measured plan shared by illustrated 2D and projected 3D. */
(() => {
  'use strict';
  const P=window.plotline, {state,$,svg}=P, ns='http://www.w3.org/2000/svg';
  const workspace=document.querySelector('.workspace');
  let editingCorners=false;
  let view='plan', history=[], cursor=-1, restoring=false, queued=false, panMode=false;
  let camera={yaw:-.55,pitch:.72,zoom:1};
  const blank='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="#e9eee4"/></svg>');
  const plants=[
    {name:'Olive',diameter:4,height:4,color:'#788e69',light:'#a5ae8b',dark:'#536b50',form:'airy'},
    {name:'Citrus',diameter:3,height:3,color:'#477647',light:'#6f9653',dark:'#315d3b',fruit:'#e3ae45',form:'round'},
    {name:'Avocado',aliases:['persea'],diameter:5,height:7,color:'#356b46',light:'#5d8a55',dark:'#244f38',fruit:'#214f32',form:'avocado'},
    {name:'Lavender',diameter:.8,height:.6,color:'#9588b3',light:'#b4a4ca',dark:'#6e6c91',form:'mound'},
    {name:'Rosemary',diameter:1.2,height:1,color:'#6f8f70',light:'#91a984',dark:'#4e715c',form:'mound'},
    {name:'Hydrangea',diameter:1.5,height:1.2,color:'#b790a6',light:'#d0b1bf',dark:'#866f91',foliage:'#587652',form:'flower'},
    {name:'Cypress',diameter:1.6,height:6,color:'#416a4d',light:'#66815b',dark:'#2d5140',form:'column'}
  ];
  const el=(tag,attrs={},parent)=>{const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));if(parent)parent.appendChild(e);return e;};
  function species(o){const name=(o.species||'').toLowerCase();return plants.find(p=>name.includes(p.name.toLowerCase())||(p.aliases||[]).some(a=>name.includes(a)))||{color:'#5f8052',light:'#809a69',dark:'#456744',height:3,name:'Tree',form:'round'};}
  function plantIcon(p){
    if(p.form==='column')return `<svg viewBox="0 0 50 50" aria-hidden="true"><ellipse cx="25" cy="45" rx="13" ry="3" fill="#dfe5d3"/><path d="M25 4C15 15 16 35 25 44C34 35 35 15 25 4Z" fill="${p.dark}"/><path d="M25 8C21 18 21 34 25 40C29 32 29 18 25 8Z" fill="${p.light}" opacity=".65"/></svg>`;
    if(p.form==='avocado')return `<svg viewBox="0 0 50 50" aria-hidden="true"><ellipse cx="26" cy="44" rx="18" ry="3" fill="#dfe5d3"/><path d="M24 43V28M24 34l-7-7m7 4 9-9" stroke="#7a5940" stroke-width="3" stroke-linecap="round"/><ellipse cx="18" cy="21" rx="12" ry="15" fill="${p.dark}" transform="rotate(-18 18 21)"/><ellipse cx="31" cy="20" rx="13" ry="16" fill="${p.color}" transform="rotate(18 31 20)"/><ellipse cx="25" cy="13" rx="11" ry="10" fill="${p.light}"/><path d="M34 30c-4 0-5 6-1 8 5 0 6-7 1-8Z" fill="${p.fruit}"/></svg>`;
    return `<svg viewBox="0 0 50 50" aria-hidden="true"><ellipse cx="27" cy="42" rx="19" ry="4" fill="#dfe5d3"/><circle cx="24" cy="23" r="17" fill="${p.color}"/><circle cx="17" cy="18" r="9" fill="${p.light}" opacity=".8"/><circle cx="32" cy="21" r="10" fill="${p.dark}" opacity=".7"/>${p.fruit?`<circle cx="15" cy="25" r="2" fill="${p.fruit}"/><circle cx="30" cy="14" r="2" fill="${p.fruit}"/>`:''}</svg>`;
  }
  function snapshot(){return JSON.stringify({image:state.image,unit:state.unit});}
  function track(){
    const value=snapshot();
    if(!restoring&&history[cursor]!==value){history=history.slice(0,cursor+1);history.push(value);if(history.length>60)history.shift();cursor=history.length-1;}
    try{localStorage.setItem('plotline.studio',value);$('saveLabel').textContent='Saved in this browser';}catch{$('saveLabel').textContent='Storage full: export your plan';}
    $('undoBtn').disabled=cursor<=0;$('redoBtn').disabled=cursor>=history.length-1;
  }
  function undo(delta){if(cursor+delta<0||cursor+delta>=history.length)return;cursor+=delta;restoring=true;const old=JSON.parse(history[cursor]);Object.assign(state.image,old.image);state.unit=old.unit;state.selectedId=null;P.persistImage();refresh();restoring=false;P.setStatus(delta<0?'Undone':'Redone');}
  function refresh(){svg.setAttribute('viewBox',`0 0 ${state.image.width} ${state.image.height}`);P.renderImage();P.refreshSelected();P.updateObjectList();enhance();track();if(view==='three')draw3d();}
  document.querySelector('.brand').innerHTML='<span class="brand-mark">♧</span><span>plotline<small>YOUR GARDEN, IMAGINED</small></span>';
  document.querySelector('.top-actions').insertAdjacentHTML('afterbegin','<span class="saved-dot" id="saveLabel">Saved in this browser</span>');
  document.querySelector('.top-actions').insertAdjacentHTML('afterbegin','<button class="btn" id="uploadReferenceBtn">Upload image</button>');
  $('uploadReferenceBtn').onclick=()=>$('imageUpload').click();
  document.querySelector('.top-actions').insertAdjacentHTML('afterbegin','<button class="btn" id="traceBoundary">Trace boundary</button>');
  $('traceBoundary').onclick=()=>{if(view==='three')setView('plan');P.clearTool();P.chooseTool('property');$('sidebar').classList.remove('open');P.setStatus('Click each corner around your garden in order, then Finish outline. Any shape is supported.');};
  document.querySelector('.top-actions').insertAdjacentHTML('afterbegin','<button class="btn" id="quickCalibrate">Set scale</button>');
  document.body.insertAdjacentHTML('beforeend',`<dialog id="scaleDialog" class="studio-dialog"><form id="scaleForm"><h2>How far apart are these points?</h2><p>Enter the real distance you measured. This sets the scale for your whole image.</p><div class="field"><label for="knownDistance" id="distanceLabel">Distance in meters</label><input id="knownDistance" type="number" min="0.001" step="any" required placeholder="Enter measured distance"/></div><p id="scaleError" role="alert"></p><div class="row"><button class="btn" type="button" id="cancelScale">Cancel</button><button class="btn primary" type="submit">Apply scale</button></div></form></dialog>`);
  const startOriginal=$('calibrateBtn').onclick;
  function calibrate(){
    if(!state.image.src||state.image.src===blank){P.setStatus('Upload a reference image before calibrating');return;}
    localStorage.setItem('plotline.referenceMode','image');setView('reference');$('sidebar').classList.remove('open');startOriginal();
    P.setStatus('Step 1 of 3 · click the first end of a distance you know');
  }
  $('calibrateBtn').onclick=calibrate;$('quickCalibrate').onclick=calibrate;
  document.addEventListener('plotline:calibration-ready',()=>{
    $('distanceLabel').textContent=state.unit==='imperial'?'Distance in feet':'Distance in meters';$('knownDistance').value='';$('scaleError').textContent='';$('scaleDialog').showModal();$('knownDistance').focus();
  });
  function cancelScale(){P.clearTool();$('scaleDialog').close();P.setStatus('Calibration cancelled · previous scale unchanged');}
  $('cancelScale').onclick=cancelScale;$('scaleDialog').addEventListener('cancel',e=>{e.preventDefault();cancelScale();});
  $('scaleForm').onsubmit=e=>{
    e.preventDefault();const distance=Number($('knownDistance').value),[a,b]=state.image.calibration;
    if(!a||!b||!Number.isFinite(distance)||distance<=0){$('scaleError').textContent='Enter a positive measured distance.';return;}
    const px=Math.hypot(b.x-a.x,b.y-a.y);if(px<5)return;
    state.image.metersPerPixel=distance*(state.unit==='imperial'?.3048:1)/px;
    $('scaleDialog').close();P.clearTool();P.persistImage();refresh();
    P.setStatus('Scale saved · trace your garden boundary, then open the 2D plan');
  };
  document.addEventListener('plotline:image-loaded',e=>{
    localStorage.setItem('plotline.referenceMode','image');
    setView('reference');
    $('sidebar').classList.remove('open');
    $('scaleHint').textContent='Image loaded. Calibrate a known distance before using measurements.';
    P.setStatus(`${e.detail.name} loaded · calibrate a known distance next`);
  });
  $('sidebar').insertAdjacentHTML('afterbegin','<div class="project-title">My garden</div><div class="project-subtitle">A little space to make your own.</div>');
  const sections=$('sidebar').querySelectorAll('.section');
  sections[0].querySelector('h3').textContent='01 / Your starting point';
  sections[0].insertAdjacentHTML('beforeend','<button class="btn primary" id="traceBtn" style="width:100%;margin-top:10px">Use traced area in design →</button><div class="dimension-note">Trace the boundary first. Satellite coordinates set the scale; uploaded images need calibration.</div><button class="btn" id="blankBtn" style="width:100%;margin-top:10px">Set garden dimensions</button>');
  sections[1].querySelector('h3').textContent='02 / Shape your space';
  sections[1].insertAdjacentHTML('afterend','<section class="section"><h3>03 / Bring it to life</h3><div class="plant-palette" id="plantPalette"></div><div class="hint">Choose a plant, then click to place. Canopies show mature spread. Drag any object to move it.</div></section>');
  sections[4].style.display='none';
  sections[5].insertAdjacentHTML('beforeend','<button class="btn" id="sampleBtn" style="width:100%;margin-top:10px">Explore a sample garden</button>');
  sections[5].insertAdjacentHTML('beforeend','<button class="btn" id="restoreReferenceBtn" style="width:100%;margin-top:10px">Restore previous image layout</button>');
  $('restoreReferenceBtn').onclick=()=>{const prior=P.store.get('plotline.previousImageProject');if(!prior){P.setStatus('No previous image layout is backed up');return;}state.image=prior;state.selectedId=null;setView('plan');};
  $('selectedSection').insertAdjacentHTML('beforeend','<div class="field" id="heightField"><label for="objectHeight">Height (meters, for 3D)</label><input type="number" min="0.1" max="40" step="0.1" id="objectHeight" value="3"></div><button class="btn" id="duplicateBtn" style="width:100%;margin-top:10px">Duplicate selected</button>');
  workspace.insertAdjacentHTML('beforeend',`<div class="studio-head"><h1>A garden, taking shape.</h1><p id="gardenSummary">Plan your space. Plant something good.</p></div><div class="view-switch" role="group" aria-label="Garden view"><button id="referenceView">Reference</button><button id="planView" class="active">2D plan</button><button id="threeView">3D garden</button></div><div class="canvas-tools"><button id="panBtn" title="Pan canvas (H or Space)" aria-label="Pan canvas">✋</button><button id="selectBtn" title="Select and move (V)" aria-label="Select and move">↖</button><button id="finishBtn" title="Finish drawing (Enter)" aria-label="Finish drawing">✓</button><hr/><button id="undoBtn" title="Undo (⌘Z)" aria-label="Undo">↶</button><button id="redoBtn" title="Redo (⌘⇧Z)" aria-label="Redo">↷</button><hr/><button id="zoomIn" title="Zoom in" aria-label="Zoom in">+</button><button id="zoomOut" title="Zoom out" aria-label="Zoom out">−</button><button id="fitBtn" title="Fit garden" aria-label="Fit garden">⊡</button></div><div class="north"><span>↑</span>N</div><div class="studio-legend"><strong id="scaleLabel">5 m</strong></div><canvas id="threeCanvas" aria-label="3D garden. Drag to orbit, scroll to zoom. Edit objects in the 2D plan."></canvas>`);
  document.body.insertAdjacentHTML('beforeend',`<dialog id="gardenDialog" class="studio-dialog"><h2>Make room for your garden.</h2><p>Start with a measured rectangle. You can also trace an irregular boundary from a reference image.</p><div class="row"><div class="field"><label for="gardenWidth">Width, meters</label><input id="gardenWidth" type="number" min="1" max="500" value="20"/></div><div class="field"><label for="gardenDepth">Depth, meters</label><input id="gardenDepth" type="number" min="1" max="500" value="15"/></div></div><p id="replaceNote">This replaces the current design. You can undo it.</p><div class="row"><button class="btn" id="cancelGarden">Cancel</button><button class="btn primary" id="createGarden">Create garden</button></div></dialog>`);
  workspace.insertAdjacentHTML('beforeend','<div id="outlineBar" class="outline-bar" hidden><span id="outlineProgress">Click the corners in order</span><button class="btn" id="removeCorner">Undo last point</button><button class="btn primary" id="finishOutline">Finish outline</button><button class="btn" id="cancelOutline">Cancel</button></div>');
  $('selectedSection').insertAdjacentHTML('beforeend','<button class="btn" id="editCorners" style="width:100%;margin-top:10px">Edit corners</button>');
  $('editCorners').onclick=()=>{editingCorners=!editingCorners;$('sidebar').classList.remove('open');enhance();P.setStatus(editingCorners?'Drag a corner to reshape. The + handles add corners.':'Drag the shape to move the whole object');};
  $('finishOutline').onclick=()=>$('finishBtn').click();
  $('removeCorner').onclick=()=>{state.image.draft.pop();P.renderImage();};
  $('cancelOutline').onclick=()=>{P.clearTool();P.setStatus('Outline cancelled');};
  plants.forEach(p=>{
    const b=document.createElement('button');b.title=`Place ${p.name}, ${p.diameter} m mature spread`;b.innerHTML=`${plantIcon(p)}<span>${p.name}</span>`;
    b.onclick=()=>{if(view!=='plan')setView('plan');$('treeCanopy').value=state.unit==='imperial'?p.diameter/0.3048:p.diameter;$('treeSpecies').value=p.name;P.chooseTool('tree');P.setStatus(`Click to plant ${p.name.toLowerCase()} · ${P.lengthText(p.diameter)} mature spread`);};$('plantPalette').appendChild(b);
  });
  function setView(next){
    if(next==='three'&&!state.image.metersPerPixel&&state.image.src){P.setStatus('Calibrate your reference image before opening a measured 3D view');return;}
    if(next!=='reference'&&state.mode==='satellite'){
      const live=state.draw?.getAll()?.features;
      const fs=live?.length?live:P.store.get('plotline.mapGeoJSON',{}).features||[];
      if(fs.length&&!state.image.src){convertSatellite(fs);}
    }
    view=next;P.clearTool();panMode=next==='reference';
    localStorage.setItem('plotline.studioView',next);
    document.body.classList.toggle('studio-mode',next!=='reference');document.body.classList.toggle('studio-reference',next==='reference');
    ['reference','plan','three'].forEach(n=>$(n+'View').classList.toggle('active',n===next));
    if(next==='reference'){P.switchMode(localStorage.getItem('plotline.referenceMode')||'image');}
    else {ensureCanvas();P.switchMode('image');$('tokenGate').style.display='none';$('imageWorkspace').style.display=next==='plan'?'block':'none';}
    $('threeCanvas').style.display=next==='three'?'block':'none';
    document.querySelector('.north').style.display=next==='three'?'none':'';
    P.setStatus(next==='three'?'Drag to orbit · scroll to zoom · edit in 2D · heights are illustrative until set':next==='plan'?'Select and drag to move · choose a plant or shape to add':'Trace your garden boundary, then use it in your design');
    refresh();
  }
  function ensureCanvas(){if(!state.image.src){state.image.src=blank;state.image.width=1200;state.image.height=900;state.image.metersPerPixel=.025;}svg.setAttribute('viewBox',`0 0 ${state.image.width} ${state.image.height}`);}
  function resetGarden(w,d){state.image={src:blank,width:w*40+240,height:d*40+240,metersPerPixel:.025,objects:[{id:P.uid(),kind:'property',name:'My garden',points:[{x:120,y:120},{x:120+w*40,y:120},{x:120+w*40,y:120+d*40},{x:120,y:120+d*40}]}],draft:[],calibration:[]};state.selectedId=null;setView('plan');}
  function convertSatellite(features){
    const coords=features.flatMap(f=>f.geometry.type==='Point'?[f.geometry.coordinates]:f.geometry.type==='Polygon'?f.geometry.coordinates[0]:f.geometry.coordinates);
    if(!coords.length)return false;
    const lon=coords.reduce((s,p)=>s+p[0],0)/coords.length, lat=coords.reduce((s,p)=>s+p[1],0)/coords.length;
    const project=p=>({x:(p[0]-lon)*Math.PI/180*6371008.8*Math.cos(lat*Math.PI/180),y:-(p[1]-lat)*Math.PI/180*6371008.8});
    const xy=coords.map(project),minx=Math.min(...xy.map(p=>p.x)),miny=Math.min(...xy.map(p=>p.y)),maxx=Math.max(...xy.map(p=>p.x)),maxy=Math.max(...xy.map(p=>p.y));
    const pt=p=>{const v=project(p);return{x:(v.x-minx)*40+120,y:(v.y-miny)*40+120};};
    state.image={src:blank,width:(maxx-minx)*40+240,height:(maxy-miny)*40+240,metersPerPixel:.025,objects:features.map(f=>{
      const m=state.satelliteObjects[f.id]||{},o={...m,id:P.uid(),kind:m.kind||'bed',name:m.name||'Garden object'};
      if(f.geometry.type==='Point')return{...o,kind:'tree',point:pt(f.geometry.coordinates)};
      const points=(f.geometry.type==='Polygon'?f.geometry.coordinates[0].slice(0,-1):f.geometry.coordinates).map(pt);
      if(o.kind==='pergola')return{...o,center:{x:points.reduce((s,p)=>s+p.x,0)/points.length,y:points.reduce((s,p)=>s+p.y,0)/points.length}};
      return{...o,points};
    }),draft:[],calibration:[]};return true;
  }
  $('traceBtn').onclick=()=>{
    if(state.mode==='satellite'){
      const live=state.draw?.getAll()?.features;
      const fs=live?.length?live:P.store.get('plotline.mapGeoJSON',{}).features||[];
      if(!fs.length){P.setStatus('Draw a property boundary on the satellite map first');return;}
      convertSatellite(fs);
    }else if(!state.image.metersPerPixel){P.setStatus('Calibrate your image with a known distance first');return;}
    setView('plan');P.setStatus('Measured layout ready · reference hidden · drag objects to arrange your garden');
  };
  $('blankBtn').onclick=()=>$('gardenDialog').showModal();$('cancelGarden').onclick=()=>$('gardenDialog').close();
  $('createGarden').onclick=()=>{const w=+$('gardenWidth').value,d=+$('gardenDepth').value;if(!Number.isFinite(w)||!Number.isFinite(d)||w<1||d<1||w>500||d>500)return;resetGarden(w,d);$('gardenDialog').close();};
  $('sampleBtn').onclick=()=>{
    if(state.image.objects.length&&!confirm('Replace this design with a sample? You can undo this change.'))return;
    resetGarden(20,15);
    const point=(x,y)=>({x:120+x*40,y:120+y*40});
    state.image.objects.push({id:P.uid(),kind:'path',name:'Garden walk',widthM:1.2,points:[point(10,15),point(10,8),point(15,8),point(15,3)]},{id:P.uid(),kind:'bed',name:'Kitchen garden',points:[point(1,1),point(7,1),point(7,4),point(1,4)]},{id:P.uid(),kind:'bed',name:'Flowers & herbs',points:[point(1,11),point(7,11),point(7,14),point(1,14)]},{id:P.uid(),kind:'pergola',name:'A shady corner',widthM:4,depthM:3,heightM:2.5,center:point(15,3),rotationDeg:0});
    [[3,7,0],[17,11,1],[13,12,2],[18,6,6],[3,12,3],[4.5,12,3],[6,12,4],[2,2.5,5],[4,2.5,4],[6,2.5,4]].forEach(([x,y,i])=>{const p=plants[i];state.image.objects.push({id:P.uid(),kind:'tree',name:p.name,species:p.name,canopyM:p.diameter,heightM:p.height,point:point(x,y)});});
    refresh();P.setStatus('Sample garden · 20 × 15 meters · try dragging a tree or switching to 3D');
  };
  $('referenceView').onclick=()=>setView('reference');$('planView').onclick=()=>setView('plan');$('threeView').onclick=()=>setView('three');
  ['satelliteTab','imageTab'].forEach((id,i)=>{const old=$(id).onclick;$(id).onclick=()=>{localStorage.setItem('plotline.referenceMode',i?'image':'satellite');setView('reference');old();};});
  $('panBtn').onclick=()=>{P.clearTool();panMode=true;enhance();P.setStatus('Drag anywhere to move the whole canvas · scroll to zoom · Fit resets the view');};
  $('selectBtn').onclick=()=>{P.clearTool();panMode=false;enhance();P.setStatus('Click any object to select it; drag to move. Arrow keys nudge by 10 cm.');};
  $('undoBtn').onclick=()=>undo(-1);$('redoBtn').onclick=()=>undo(1);
  $('finishBtn').onclick=()=>{
    const kind=state.tool,points=state.image.draft;
    if(!['property','bed','path'].includes(kind)||points.length<(kind==='path'?2:3))return;
    if(kind!=='path'&&!validOutline(points)){P.setStatus('The outline crosses itself or has no area. Undo the last point and follow the edge in order.');return;}
    const id=P.uid();state.image.objects.push({id,kind,name:kind==='bed'?'Planting bed':kind==='path'?'Path':'Garden boundary',points:points.map(p=>({...p})),widthM:kind==='path'?Number($('pathWidth').value)*(state.unit==='imperial'?.3048:1):undefined});P.clearTool();state.selectedId=id;editingCorners=true;refresh();P.setStatus('Outline saved · drag its corners to adjust the shape');
  };
  function validOutline(points){
    if(points.length<3||points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y))||P.imagePolygonArea(points)<1)return false;
    const cross=(a,b,c)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
    for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
      if(j===i+1||(i===0&&j===points.length-1))continue;
      const a=points[i],b=points[(i+1)%points.length],c=points[j],d=points[(j+1)%points.length];
      if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)return false;
    }return true;
  }
  $('duplicateBtn').onclick=()=>{const o=state.image.objects.find(o=>o.id===state.selectedId);if(!o||state.mode!=='image')return;const copy=structuredClone(o);copy.id=P.uid();copy.name+=' copy';P.applyDrag(copy,P.objectOrigin(copy),1/state.image.metersPerPixel,1/state.image.metersPerPixel);state.image.objects.push(copy);state.selectedId=copy.id;refresh();};
  $('resetBtn').onclick=()=>{if(!confirm('Clear this design? You can undo this change.'))return;state.image.objects=[];state.selectedId=null;refresh();};
  const applyOriginal=$('applySelected').onclick;
  $('applySelected').onclick=()=>{const o=P.selectedObject();if(!o)return;const fields=o.kind==='pergola'?['selectedPergolaWidth','selectedPergolaDepth']:o.kind==='tree'?['selectedTreeCanopy']:o.kind==='path'?['selectedPathWidth']:[];if(fields.some(id=>!Number.isFinite(+$(id).value)||+$(id).value<=0)){P.setStatus('Dimensions must be greater than zero');return;}applyOriginal();};
  $('sidebar').addEventListener('click',e=>{if(e.target.closest('.tool')){panMode=false;if(view==='three')setView('plan');}},true);
  $('sidebar').addEventListener('click',e=>{if(e.target.closest('.tool,.plant-palette button'))$('sidebar').classList.remove('open');});
  $('objectHeight').onchange=()=>{const o=state.image.objects.find(o=>o.id===state.selectedId),h=+$('objectHeight').value;if(o&&Number.isFinite(h)&&h>0&&h<=40){o.heightM=h;refresh();}};
  const unitOriginal=$('unitSelect').onchange;$('unitSelect').onchange=e=>{unitOriginal(e);refresh();};
  function zoomPlan(f,clientX,clientY){const v=svg.viewBox.baseVal,b=svg.getBoundingClientRect(),nx=clientX==null?.5:(clientX-b.left)/b.width,ny=clientY==null?.5:(clientY-b.top)/b.height,w=v.width/f,h=v.height/f;svg.setAttribute('viewBox',`${v.x+(v.width-w)*nx} ${v.y+(v.height-h)*ny} ${w} ${h}`);enhance();}
  $('zoomIn').onclick=()=>{if(view==='three'){camera.zoom=Math.min(5,camera.zoom*1.2);draw3d();}else zoomPlan(1.2);};$('zoomOut').onclick=()=>{if(view==='three'){camera.zoom=Math.max(.3,camera.zoom/1.2);draw3d();}else zoomPlan(1/1.2);};$('fitBtn').onclick=()=>{camera.zoom=1;svg.setAttribute('viewBox',`0 0 ${state.image.width} ${state.image.height}`);if(view==='three')draw3d();else enhance();};
  document.addEventListener('keydown',e=>{
    if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||$('gardenDialog').open)return;
    if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo(e.shiftKey?1:-1);return;}
    if(e.key==='Escape'||e.key.toLowerCase()==='v'){P.clearTool();panMode=false;enhance();}
    if(e.key.toLowerCase()==='h'){P.clearTool();panMode=true;enhance();P.setStatus('Hand tool · drag anywhere to move the canvas');}
    if(e.key==='Enter')$('finishBtn').click();
    if(view==='reference')return;
    if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();$('deleteSelected').click();}
    const dir={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
    const o=state.image.objects.find(o=>o.id===state.selectedId);
    if(dir&&o){e.preventDefault();const step=(e.shiftKey?1:.1)/state.image.metersPerPixel;P.applyDrag(o,P.objectOrigin(o),dir[0]*step,dir[1]*step);refresh();}
  });
  let pan=null,spaceHeld=false;
  document.addEventListener('keydown',e=>{if(e.code==='Space'&&!/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)){e.preventDefault();spaceHeld=true;enhance();}});
  document.addEventListener('keyup',e=>{if(e.code==='Space'){spaceHeld=false;enhance();}});
  svg.addEventListener('pointerdown',e=>{if(state.tool||view==='three'||(!panMode&&!spaceHeld&&view!=='reference'))return;e.preventDefault();e.stopImmediatePropagation();const v=svg.viewBox.baseVal;pan={x:e.clientX,y:e.clientY,v:{x:v.x,y:v.y,width:v.width,height:v.height}};enhance();},true);
  window.addEventListener('pointermove',e=>{if(!pan)return;e.preventDefault();const bounds=svg.getBoundingClientRect(),k=Math.max(pan.v.width/bounds.width,pan.v.height/bounds.height);svg.setAttribute('viewBox',`${pan.v.x-(e.clientX-pan.x)*k} ${pan.v.y-(e.clientY-pan.y)*k} ${pan.v.width} ${pan.v.height}`);},{capture:true});
  window.addEventListener('pointerup',()=>{if(!pan)return;pan=null;enhance();},{capture:true});window.addEventListener('pointercancel',()=>{if(!pan)return;pan=null;enhance();},{capture:true});
  svg.addEventListener('mousedown',e=>{if(pan||state.tool||view==='three'||(!panMode&&!spaceHeld&&view!=='reference'))return;e.preventDefault();e.stopImmediatePropagation();const v=svg.viewBox.baseVal;pan={x:e.clientX,y:e.clientY,v:{x:v.x,y:v.y,width:v.width,height:v.height}};enhance();},true);
  window.addEventListener('mousemove',e=>{if(!pan)return;e.preventDefault();const bounds=svg.getBoundingClientRect(),k=Math.max(pan.v.width/bounds.width,pan.v.height/bounds.height);svg.setAttribute('viewBox',`${pan.v.x-(e.clientX-pan.x)*k} ${pan.v.y-(e.clientY-pan.y)*k} ${pan.v.width} ${pan.v.height}`);},{capture:true});
  window.addEventListener('mouseup',()=>{if(!pan)return;pan=null;enhance();},{capture:true});
  svg.addEventListener('wheel',e=>{if(view==='three')return;e.preventDefault();zoomPlan(Math.exp(-e.deltaY*.0015),e.clientX,e.clientY);},{passive:false});
  function enhance(){
    observer.disconnect();
    $('imageEmpty').style.display=state.image.src?'none':'grid';
    $('scaleHint').textContent=state.image.metersPerPixel?`Scale set · 100 image pixels = ${P.lengthText(state.image.metersPerPixel*100)}`:'Scale not set · mark two points with a known distance.';
    svg.querySelectorAll('.studio-art,.studio-defs,.corner-controls').forEach(n=>n.remove());
    const drawing=state.mode==='image'&&['property','bed','path'].includes(state.tool);
    $('outlineBar').hidden=!drawing;$('outlineProgress').textContent=`${state.image.draft.length} points · click around the edge`;
    $('finishOutline').disabled=state.image.draft.length<(state.tool==='path'?2:3);$('removeCorner').disabled=!state.image.draft.length;
    document.body.classList.toggle('drawing',!!state.tool);document.body.classList.toggle('panning',!!pan);
    $('panBtn').classList.toggle('active',(panMode||spaceHeld)&&!state.tool);$('selectBtn').classList.toggle('active',!panMode&&!spaceHeld&&!state.tool);
    if(view!=='reference'){
      const base=svg.querySelector('image');if(base)base.style.opacity='0';
      const defs=el('defs',{class:'studio-defs'},svg);
      const grid=el('pattern',{id:'meterGrid',width:1/(state.image.metersPerPixel||.025),height:1/(state.image.metersPerPixel||.025),patternUnits:'userSpaceOnUse'},defs);
      el('path',{d:`M 0 ${1/(state.image.metersPerPixel||.025)} L 0 0 ${1/(state.image.metersPerPixel||.025)} 0`,fill:'none',stroke:'#bfcbb4','stroke-width':'.65'},grid);
      const bed=el('pattern',{id:'soil',width:14,height:14,patternUnits:'userSpaceOnUse'},defs);el('rect',{width:14,height:14,fill:'#b3ac83'},bed);el('circle',{cx:3,cy:4,r:1,fill:'#918967'},bed);el('circle',{cx:11,cy:10,r:.8,fill:'#d3c9a1'},bed);
      const ground=el('rect',{class:'studio-art',x:-10000,y:-10000,width:20000,height:20000,fill:'url(#meterGrid)','pointer-events':'none'});svg.insertBefore(ground,svg.firstChild);
      const objects=[...state.image.objects].sort((a,b)=>(a.kind==='property'?-1:0)-(b.kind==='property'?-1:0));
      objects.forEach(o=>{
        const shape=[...svg.querySelectorAll('.svg-object')].find(n=>n.getAttribute('data-id')===o.id);if(!shape)return;
        if(o.kind==='property'){
          shape.setAttribute('fill','#dce6c9');shape.setAttribute('stroke','#90a578');shape.setAttribute('stroke-width','1.5');svg.insertBefore(shape,ground.nextSibling);
          const dims=el('g',{class:'studio-art','pointer-events':'none'},svg);
          o.points.forEach((p,i)=>{const q=o.points[(i+1)%o.points.length],length=Math.hypot(q.x-p.x,q.y-p.y)*(state.image.metersPerPixel||0);if(length<1)return;const t=el('text',{x:(p.x+q.x)/2,y:(p.y+q.y)/2-12,'text-anchor':'middle',fill:'#6b805a','font-size':Math.max(state.image.width*.011,12)},dims);t.textContent=P.lengthText(length);});
        }
        if(o.kind==='bed'){shape.setAttribute('fill','url(#soil)');shape.setAttribute('stroke','#9a966e');shape.setAttribute('stroke-width','2');}
        if(o.kind==='path'){shape.setAttribute('stroke','#d2c6a4');shape.removeAttribute('vector-effect');}
        if(o.kind==='pergola'){
          shape.setAttribute('fill','#e2d6b9');shape.setAttribute('stroke','#b09a71');
          const s=state.image.metersPerPixel||.025,w=o.widthM/s,h=o.depthM/s;
          const art=el('g',{class:'studio-art','data-art-for':o.id,'pointer-events':'none',transform:`rotate(${o.rotationDeg||0} ${o.center.x} ${o.center.y})`});
          for(let i=0;i<=8;i++)el('line',{x1:o.center.x-w/2+i*w/8,x2:o.center.x-w/2+i*w/8,y1:o.center.y-h/2,y2:o.center.y+h/2,stroke:'#ac956f','stroke-width':Math.max(2,w/45)},art);
          shape.after(art);
        }
        if(o.kind==='tree'){
          const r=(o.canopyM||3)/(state.image.metersPerPixel||.025)/2,sp=species(o);
          shape.setAttribute('r',r);shape.setAttribute('fill',sp.form==='airy'?sp.light:(sp.foliage||sp.dark||sp.color));shape.setAttribute('fill-opacity',sp.form==='airy'?.42:1);shape.setAttribute('stroke',o.id===state.selectedId?'#355739':'#58764b');shape.setAttribute('stroke-width',o.id===state.selectedId?2:0);
          shape.style.filter='drop-shadow(5px 9px 4px #39512426)';
          const art=el('g',{class:'studio-art','data-art-for':o.id,'pointer-events':'none'});
          if(sp.form==='avocado'){
            const lobes=[[0,-.28,.58,.52,-8],[-.38,-.05,.55,.48,-28],[.38,-.04,.58,.5,26],[-.22,.34,.58,.46,18],[.3,.33,.52,.43,-18],[0,.08,.62,.57,0]];
            lobes.forEach(([dx,dy,rx,ry,rot],i)=>el('ellipse',{cx:o.point.x+dx*r,cy:o.point.y+dy*r,rx:rx*r,ry:ry*r,transform:`rotate(${rot} ${o.point.x+dx*r} ${o.point.y+dy*r})`,fill:i%3===0?sp.light:i%2?sp.dark:sp.color,opacity:.9},art));
            for(let i=0;i<11;i++){const a=i*2.399,x=o.point.x+Math.cos(a)*r*(.2+(i%4)*.14),y=o.point.y+Math.sin(a)*r*(.18+(i%3)*.18);el('ellipse',{cx:x,cy:y,rx:r*.065,ry:r*.11,transform:`rotate(${i*47} ${x} ${y})`,fill:i%2?sp.light:'#7da36a',opacity:.72},art);}
            el('circle',{cx:o.point.x,cy:o.point.y,r:r*.11,fill:'#77543b'},art);
            for(let i=0;i<5;i++){const a=.7+i*1.47,x=o.point.x+Math.cos(a)*r*.52,y=o.point.y+Math.sin(a)*r*.5;el('ellipse',{cx:x,cy:y,rx:r*.035,ry:r*.06,transform:`rotate(${i*29} ${x} ${y})`,fill:sp.fruit},art);}
          }else if(sp.form==='airy'){
            el('circle',{cx:o.point.x,cy:o.point.y,r:r*.09,fill:'#76583f'},art);
            for(let i=0;i<9;i++){const a=i*2.17,rr=r*(.22+(i%3)*.2),x=o.point.x+Math.cos(a)*rr,y=o.point.y+Math.sin(a)*rr;el('circle',{cx:x,cy:y,r:r*(.22+(i%2)*.07),fill:i%3===0?sp.light:i%2?sp.color:sp.dark,opacity:.84},art);}
          }else if(sp.form==='flower'){
            for(let i=0;i<9;i++){const a=i*2.25,rr=r*(.12+(i%3)*.17),x=o.point.x+Math.cos(a)*rr,y=o.point.y+Math.sin(a)*rr;el('circle',{cx:x,cy:y,r:r*.24,fill:sp.foliage,opacity:.9},art);el('circle',{cx:x+r*.04,cy:y-r*.03,r:r*.12,fill:i%3===0?sp.light:sp.color,opacity:.92},art);}
          }else if(sp.form==='mound'){
            for(let i=0;i<12;i++){const a=i*2.12,rr=r*(.12+(i%4)*.13),x=o.point.x+Math.cos(a)*rr,y=o.point.y+Math.sin(a)*rr;el('ellipse',{cx:x,cy:y,rx:r*.2,ry:r*.1,transform:`rotate(${i*31} ${x} ${y})`,fill:i%3===0?sp.light:i%2?sp.color:sp.dark,opacity:.9},art);}
          }else if(sp.form==='column'){
            for(let i=0;i<4;i++)el('circle',{cx:o.point.x,cy:o.point.y,r:r*(.78-i*.16),fill:i%2?sp.color:sp.dark,opacity:.82},art);
          }else{
            for(let i=0;i<8;i++){const a=i*2.4,x=o.point.x+Math.cos(a)*r*.36,y=o.point.y+Math.sin(a)*r*.36;el('circle',{cx:x,cy:y,r:r*(.36+(i%3)*.06),fill:i%3===0?sp.light:i%2?sp.color:sp.dark,opacity:.72},art);}
            if(sp.name==='Citrus')for(let i=0;i<8;i++)el('circle',{cx:o.point.x+Math.cos(i*2.4)*r*.6,cy:o.point.y+Math.sin(i*2.4)*r*.6,r:r*.055,fill:sp.fruit},art);
          }
          shape.after(art);
        }
      });
    }else {const base=svg.querySelector('image');if(base)base.style.opacity='1';}
    svg.querySelectorAll('[data-label-for]').forEach(label=>{const o=state.image.objects.find(o=>o.id===label.getAttribute('data-label-for'));if(!o)return;label.style.display=view!=='reference'&&o.id!==state.selectedId&&['property','tree','path'].includes(o.kind)?'none':'';label.textContent=o.species&&o.name===o.species?o.name:o.name;});
    const props=state.image.objects.filter(o=>o.kind==='property'),scale=state.image.metersPerPixel;
    $('gardenSummary').textContent=`${props.length&&scale?P.areaText(props.reduce((a,o)=>a+P.imagePolygonArea(o.points)*scale*scale,0))+' garden · ':''}${state.image.objects.filter(o=>o.kind==='tree').length} plants · ${view==='three'?'3D preview':'Measured design'}`;
    const selected=state.image.objects.find(o=>o.id===state.selectedId);if(selected)$('objectHeight').value=selected.heightM||species(selected).height;
    $('editCorners').style.display=selected?.points&&state.mode==='image'?'block':'none';
    $('editCorners').textContent=editingCorners?'Done editing corners':'Edit corners';
    if(editingCorners&&selected?.points&&!state.tool&&view!=='three'){
      const group=el('g',{class:'corner-controls'},svg),bounds=svg.getBoundingClientRect(),v=svg.viewBox.baseVal;
      const r=7*Math.max(v.width/bounds.width,v.height/bounds.height);
      const point=e=>{const p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(svg.getScreenCTM().inverse());};
      selected.points.forEach((p,i)=>{
        const handle=el('circle',{cx:p.x,cy:p.y,r,fill:'#fff',stroke:'#315e4b','stroke-width':2,'vector-effect':'non-scaling-stroke',tabindex:0,role:'button','aria-label':`Move corner ${i+1}`},group);
        handle.style.cursor='move';handle.addEventListener('pointerdown',e=>{
          e.stopPropagation();e.preventDefault();handle.setPointerCapture(e.pointerId);const old={...p};
          const shape=[...svg.querySelectorAll('.svg-object')].find(n=>n.getAttribute('data-id')===selected.id);
          const move=ev=>{const q=point(ev);p.x=q.x;p.y=q.y;handle.setAttribute('cx',p.x);handle.setAttribute('cy',p.y);shape?.setAttribute('points',selected.points.map(p=>`${p.x},${p.y}`).join(' '));};
          const finish=ev=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',finish);handle.removeEventListener('pointercancel',cancel);if(selected.kind!=='path'&&!validOutline(selected.points)){Object.assign(p,old);P.setStatus('That corner would cross another edge. Move cancelled.');}refresh();};
          const cancel=()=>{Object.assign(p,old);finish();};
          handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',cancel);
        });
        handle.addEventListener('click',e=>e.stopPropagation());
        if(selected.kind==='path'&&i===selected.points.length-1)return;
        const q=selected.points[(i+1)%selected.points.length],x=(p.x+q.x)/2,y=(p.y+q.y)/2;
        const mid=el('g',{tabindex:0,role:'button','aria-label':`Add corner after ${i+1}`},group);
        el('circle',{cx:x,cy:y,r:r*.8,fill:'#eaf2e0',stroke:'#6f8b5b','stroke-width':1,'vector-effect':'non-scaling-stroke'},mid);
        const plus=el('text',{x,y:y+r*.4,'text-anchor':'middle','font-size':r*1.5,fill:'#315e4b','pointer-events':'none'},mid);plus.textContent='+';mid.style.cursor='pointer';
        mid.addEventListener('pointerdown',e=>e.stopPropagation());mid.addEventListener('click',e=>{e.stopPropagation();selected.points.splice(i+1,0,{x,y});refresh();});
      });
    }
    $('heightField').style.display=selected&&['tree','pergola','bed'].includes(selected.kind)?'grid':'none';
    document.querySelector('.studio-legend').style.display=view==='three'?'none':'';
    const meterWidth=svg.getBoundingClientRect().width/(svg.viewBox.baseVal.width||1200)/(scale||.025)*5;
    $('scaleLabel').textContent=P.lengthText(5);$('scaleLabel').style.width=Math.min(180,Math.max(20,meterWidth))+'px';
    svg.style.cursor=state.tool==='calibrate'?'crosshair':'';
    observer.observe(svg,{childList:true});
  }
  const observer=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance();track();if(view==='three')draw3d();});});
  // Three dimensional orthographic scene. Every x/z coordinate comes from the measured plan.
  const canvas=$('threeCanvas'),ctx=canvas.getContext('2d');
  function draw3d(){
    if(view!=='three')return;
    const rect=canvas.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);canvas.width=rect.width*dpr;canvas.height=rect.height*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);
    const W=rect.width,H=rect.height,s=state.image.metersPerPixel||.025,gw=state.image.width*s,gd=state.image.height*s;
    const unit=Math.min(W/(gw+gd*.4),H/(gd*.65+gw*.35+8))*.78*camera.zoom;
    const cy=Math.cos(camera.yaw),sy=Math.sin(camera.yaw),cp=Math.cos(camera.pitch),sp=Math.sin(camera.pitch);
    const project=([x,y,z])=>{x-=gw/2;z-=gd/2;const a=x*cy-z*sy,b=x*sy+z*cy;return{x:W/2+a*unit,y:H*.56+(b*sp-y*cp)*unit,depth:b*cp+y*sp};};
    ctx.fillStyle='#e9eee4';ctx.fillRect(0,0,W,H);
    let layer=3;
    const faces=[];const face=(points,color,stroke)=>faces.push({points,color,stroke,layer,depth:points.reduce((sum,p)=>sum+project(p).depth,0)/points.length});
    function box(x,y,z,w,h,d,color){const a=[x-w/2,y,z-d/2],b=[x+w/2,y,z-d/2],c=[x+w/2,y,z+d/2],e=[x-w/2,y,z+d/2],up=p=>[p[0],p[1]+h,p[2]];face([a,b,up(b),up(a)],color);face([b,c,up(c),up(b)],shade(color,-18));face([c,e,up(e),up(c)],shade(color,-8));face([e,a,up(a),up(e)],shade(color,5));face([up(a),up(b),up(c),up(e)],shade(color,22));}
    function canopy(x,y,z,rx,h,color,rz=rx){const n=10,rings=5;for(let j=0;j<rings;j++){const t1=-Math.PI/2+j*Math.PI/rings,t2=-Math.PI/2+(j+1)*Math.PI/rings;for(let i=0;i<n;i++){const a=i*2*Math.PI/n,b=(i+1)*2*Math.PI/n;const p=(t,a)=>[x+Math.cos(t)*Math.cos(a)*rx,y+Math.sin(t)*h,z+Math.cos(t)*Math.sin(a)*rz];face([p(t1,a),p(t1,b),p(t2,b),p(t2,a)],shade(color,Math.round(Math.cos(a)*12+j*5-9)));}}}
    function limb(a,b,w,color){const dx=b[0]-a[0],dz=b[2]-a[2],len=Math.hypot(dx,dz)||1,px=-dz/len*w/2,pz=dx/len*w/2,up=[0,w*.45,0];face([[a[0]+px,a[1],a[2]+pz],[a[0]-px,a[1],a[2]-pz],[b[0]-px,b[1],b[2]-pz],[b[0]+px,b[1],b[2]+pz]],color);face([[a[0]+px+up[0],a[1]+up[1],a[2]+pz+up[2]],[b[0]+px+up[0],b[1]+up[1],b[2]+pz+up[2]],[b[0]-px+up[0],b[1]+up[1],b[2]-pz+up[2]],[a[0]-px+up[0],a[1]+up[1],a[2]-pz+up[2]]],shade(color,16));}
    layer=0;face([[0,-.1,0],[gw,-.1,0],[gw,-.1,gd],[0,-.1,gd]],'#dfe7d4');
    state.image.objects.forEach(o=>{
      layer=o.kind==='property'?1:['path','bed'].includes(o.kind)?2:3;
      if(o.kind==='property'||o.kind==='bed'){
        const h=o.kind==='property'?.01:(o.heightM||.18);const pts=o.points.map(p=>[p.x*s,h,p.y*s]);face(pts,o.kind==='property'?'#cadbb4':'#afa17b');
        if(o.kind==='bed')pts.forEach((p,i)=>{const q=pts[(i+1)%pts.length];face([p,q,[q[0],0,q[2]],[p[0],0,p[2]]],'#95825c');});
      }else if(o.kind==='path'){
        for(let i=1;i<o.points.length;i++){const a=o.points[i-1],b=o.points[i],len=Math.hypot(b.x-a.x,b.y-a.y);if(!len)continue;const dx=-(b.y-a.y)/len*(o.widthM||1)/2,dz=(b.x-a.x)/len*(o.widthM||1)/2;face([[a.x*s+dx,.035,a.y*s+dz],[b.x*s+dx,.035,b.y*s+dz],[b.x*s-dx,.035,b.y*s-dz],[a.x*s-dx,.035,a.y*s-dz]],'#d8caaa');}
      }else if(o.kind==='tree'){
        const x=o.point.x*s,z=o.point.y*s,sp=species(o),h=o.heightM||sp.height,r=(o.canopyM||3)/2;
        if(sp.form==='avocado'){
          const fork=h*.48;box(x,0,z,.2,fork,.2,'#79573e');
          const crown=[[0,h*.72,0,.7,.27,.62],[-.46,h*.68,-.08,.55,.25,.48],[.43,h*.7,.08,.58,.26,.5],[-.2,h*.84,-.3,.52,.23,.5],[.18,h*.86,.32,.5,.22,.47],[0,h*.94,0,.44,.18,.42]];
          crown.slice(1).forEach(([dx,y,dz])=>limb([x,fork,z],[x+dx*r,y-h*.08,z+dz*r],.11,'#76543c'));
          crown.forEach(([dx,y,dz,rx,ry,rz],i)=>canopy(x+dx*r,y,z+dz*r,r*rx,h*ry,i%3===0?sp.light:i%2?sp.dark:sp.color,r*rz));
          for(let i=0;i<7;i++){const a=i*2.399,rr=r*(.25+(i%3)*.2);canopy(x+Math.cos(a)*rr,h*(.61+(i%4)*.055),z+Math.sin(a)*rr,.055,.095,sp.fruit,.045);}
        }else if(sp.form==='column'){
          box(x,0,z,.13,h*.78,.13,'#816044');for(let i=0;i<5;i++)canopy(x,h*(.35+i*.12),z,r*(.72-i*.09),h*.18,i%2?sp.color:sp.dark,r*(.72-i*.09));
        }else if(sp.form==='airy'){
          const fork=h*.42;box(x,0,z,.18,fork,.18,'#806044');
          for(let i=0;i<7;i++){const a=i*2.31,rr=r*(.28+(i%3)*.18),cx=x+Math.cos(a)*rr,cz=z+Math.sin(a)*rr,cy=h*(.62+(i%3)*.09);limb([x,fork,z],[cx,cy-h*.08,cz],.09,'#806044');canopy(cx,cy,cz,r*(.3+(i%2)*.08),h*.18,i%3===0?sp.light:i%2?sp.color:sp.dark,r*(.26+(i%2)*.08));}
        }else if(sp.form==='mound'){
          for(let i=0;i<7;i++){const a=i*2.36,rr=r*(.08+(i%3)*.22);canopy(x+Math.cos(a)*rr,h*(.28+(i%2)*.08),z+Math.sin(a)*rr,r*(.34+(i%2)*.08),h*.3,i%3===0?sp.light:i%2?sp.color:sp.dark,r*.3);}
        }else if(sp.form==='flower'){
          for(let i=0;i<7;i++){const a=i*2.36,rr=r*(.08+(i%3)*.22),cx=x+Math.cos(a)*rr,cz=z+Math.sin(a)*rr,cy=h*(.32+(i%2)*.08);canopy(cx,cy,cz,r*.34,h*.3,sp.foliage,r*.3);canopy(cx,cy+h*.18,cz,r*.12,h*.1,i%3===0?sp.light:sp.color,r*.12);}
        }else{
          box(x,0,z,.14,h*.62,.14,'#92724e');canopy(x,h*.66,z,r,h*.35,sp.color);
          if(sp.name==='Citrus')for(let i=0;i<7;i++){const a=i*2.4;canopy(x+Math.cos(a)*r*.7,h*(.62+(i%3)*.08),z+Math.sin(a)*r*.7,.065,.065,sp.fruit,.055);}
        }
      }else if(o.kind==='pergola'){
        const start=faces.length,x=o.center.x*s,z=o.center.y*s,w=o.widthM,d=o.depthM,h=o.heightM||2.5;
        box(x,.04,z,w,.08,d,'#cabc9b');for(const dx of [-w/2,w/2])for(const dz of [-d/2,d/2])box(x+dx,.1,z+dz,.14,h,.14,'#ac9066');
        for(let i=0;i<9;i++)box(x-w/2+i*w/8,h,z,.12,.14,d+.25,'#b29a70');
        const a=(o.rotationDeg||0)*Math.PI/180;for(let i=start;i<faces.length;i++){faces[i].points=faces[i].points.map(p=>[x+(p[0]-x)*Math.cos(a)-(p[2]-z)*Math.sin(a),p[1],z+(p[0]-x)*Math.sin(a)+(p[2]-z)*Math.cos(a)]);faces[i].depth=faces[i].points.reduce((sum,p)=>sum+project(p).depth,0)/faces[i].points.length;}
      }
    });
    faces.sort((a,b)=>a.layer-b.layer||a.depth-b.depth).forEach(f=>{ctx.beginPath();f.points.forEach((p,i)=>{const v=project(p);i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y);});ctx.closePath();ctx.fillStyle=f.color;ctx.fill();});
    ctx.fillStyle='#718266';ctx.font='11px system-ui';ctx.fillText('ORTHOGRAPHIC / DIMENSIONS PRESERVED',25,H-75);
  }
  function shade(hex,n){const c=hex.replace('#','');return '#'+[0,2,4].map(i=>Math.max(0,Math.min(255,parseInt(c.slice(i,i+2),16)+n)).toString(16).padStart(2,'0')).join('');}
  let orbit=null;canvas.onpointerdown=e=>{orbit={x:e.clientX,y:e.clientY,yaw:camera.yaw,pitch:camera.pitch};canvas.setPointerCapture(e.pointerId);};canvas.onpointermove=e=>{if(!orbit)return;camera.yaw=orbit.yaw+(e.clientX-orbit.x)*.008;camera.pitch=Math.max(.15,Math.min(1.4,orbit.pitch+(e.clientY-orbit.y)*.005));draw3d();};canvas.onpointerup=canvas.onpointercancel=()=>orbit=null;canvas.addEventListener('wheel',e=>{e.preventDefault();camera.zoom=Math.max(.3,Math.min(5,camera.zoom*Math.exp(-e.deltaY*.001)));draw3d();},{passive:false});
  new ResizeObserver(()=>{if(view==='three')draw3d();}).observe(workspace);
  // Restore the complete canvas, including its reference image, after a reload.
  const saved=P.store.get('plotline.studio',null);if(saved?.image){Object.assign(state.image,saved.image);state.image.draft=[];state.image.calibration=[];state.unit=saved.unit||state.unit;$('unitSelect').value=state.unit;}
  if(!saved&&!localStorage.getItem('plotline.unit')){state.unit='metric';$('unitSelect').value='metric';$('pergolaWidth').value=4;$('pergolaDepth').value=3;$('pathWidth').value=1.2;$('treeCanopy').value=3;}
  setView(localStorage.getItem('plotline.studioView')||'plan');
  if(!state.image.objects.length){P.setStatus(view==='reference'?'Reference image ready · calibrate a known distance, then trace your garden':'Set your garden dimensions, trace a reference, or explore the sample garden');}
})();
