/* Plotline studio: a measured plan shared by illustrated 2D and projected 3D. */
(() => {
  'use strict';
  const P=window.plotline, {state,$,svg}=P, ns='http://www.w3.org/2000/svg';
  const workspace=document.querySelector('.workspace');
  let editingCorners=false;
  let view='plan', history=[], cursor=-1, restoring=false, queued=false, panMode=false, pendingPlant=null;
  let irrigationVisible=localStorage.getItem('plotline.irrigationVisible')!=='false';
  let camera={yaw:-.55,pitch:.72,zoom:1};
  const blank='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="#e9eee4"/></svg>');
  const plants=[
    {name:'Olive',category:'Trees',diameter:4,height:4,color:'#788e69',light:'#a5ae8b',dark:'#536b50',form:'airy'},
    {name:'Avocado',category:'Trees',aliases:['persea','hass'],diameter:5,height:7,color:'#356b46',light:'#5d8a55',dark:'#244f38',fruit:'#214f32',form:'avocado'},
    {name:'Grapefruit',category:'Trees',diameter:4,height:4,color:'#477647',light:'#6f9653',dark:'#315d3b',fruit:'#e6c35e',form:'round'},
    {name:'Guava',category:'Trees',diameter:4,height:4,color:'#4e7a4e',light:'#7e9c68',dark:'#315c3b',fruit:'#bad36a',form:'round'},
    {name:'Almond',category:'Trees',diameter:4,height:5,color:'#7f946a',light:'#d8b8bf',dark:'#576e50',fruit:'#9b7650',form:'airy'},
    {name:'Lime',category:'Trees',aliases:['lime tree'],diameter:3,height:3.5,color:'#3f7543',light:'#6a9856',dark:'#29563a',fruit:'#9dca45',form:'round'},
    {name:'Cypress',category:'Trees',diameter:1.6,height:6,color:'#416a4d',light:'#66815b',dark:'#2d5140',form:'column'},
    {name:'Grape row',category:'Berries & vines',aliases:['grape','vine'],diameter:4,height:1.8,color:'#55794d',light:'#7c9b61',dark:'#365c42',fruit:'#6e557f',form:'vineRow'},
    {name:'Strawberries',category:'Berries & vines',aliases:['strawberry'],diameter:.45,height:.25,color:'#5f8a4f',light:'#82a866',dark:'#3f6a43',fruit:'#c84e47',form:'groundcover'},
    {name:'Raspberries',category:'Berries & vines',aliases:['raspberry'],diameter:1.1,height:1.7,color:'#5d8155',light:'#83a46b',dark:'#416342',fruit:'#bd3f58',form:'bramble'},
    {name:'Blackberries',category:'Berries & vines',aliases:['blackberry'],diameter:1.4,height:1.8,color:'#506f4d',light:'#779264',dark:'#36583e',fruit:'#3f304a',form:'bramble'},
    {name:'Blueberries',category:'Berries & vines',aliases:['blueberry'],diameter:1.2,height:1.5,color:'#567b52',light:'#7f9d69',dark:'#395d40',fruit:'#435a8c',form:'bramble'},
    {name:'Herbs',category:'Crops & herbs',diameter:.5,height:.4,color:'#6d9661',light:'#91b279',dark:'#4e7450',form:'herb'},
    {name:'Lavender',category:'Crops & herbs',diameter:.8,height:.6,color:'#9588b3',light:'#b4a4ca',dark:'#6e6c91',form:'mound'},
    {name:'Rosemary',category:'Crops & herbs',diameter:1.2,height:1,color:'#6f8f70',light:'#91a984',dark:'#4e715c',form:'mound'},
    {name:'Hydrangea',category:'Crops & herbs',diameter:1.5,height:1.2,color:'#b790a6',light:'#d0b1bf',dark:'#866f91',foliage:'#587652',form:'flower'},
    {name:'Tomatoes',category:'Crops & herbs',aliases:['tomato'],diameter:.7,height:1.6,color:'#56804d',light:'#7da264',dark:'#38603f',fruit:'#c94c3d',form:'stake'},
    {name:'Peppers',category:'Crops & herbs',aliases:['pepper'],diameter:.55,height:.8,color:'#527d4c',light:'#78a05e',dark:'#365f3e',fruit:'#c9573e',form:'crop'},
    {name:'Courgettes',category:'Crops & herbs',aliases:['courgette','zucchini'],diameter:1.2,height:.6,color:'#58824c',light:'#83a965',dark:'#39633e',fruit:'#467345',form:'squash'},
    {name:'Onions',category:'Crops & herbs',aliases:['onion'],diameter:.18,height:.45,color:'#75925d',light:'#a8bb7c',dark:'#587348',form:'bulb'},
    {name:'Garlic',category:'Crops & herbs',diameter:.16,height:.5,color:'#6f8e5e',light:'#a1b67e',dark:'#506e49',form:'bulb'},
    {name:'Brassicas',category:'Crops & herbs',aliases:['cabbage','broccoli','cauliflower'],diameter:.65,height:.6,color:'#5d7f5d',light:'#88a17c',dark:'#405f49',form:'rosette'},
    {name:'Carrots',category:'Crops & herbs',aliases:['carrot'],diameter:.18,height:.35,color:'#699158',light:'#92af72',dark:'#4d7048',fruit:'#d8793b',form:'root'},
    {name:'Salads',category:'Crops & herbs',aliases:['lettuce','salad'],diameter:.35,height:.25,color:'#73a35f',light:'#a0c27e',dark:'#527c4f',form:'rosette'},
    {name:'Potatoes',category:'Crops & herbs',aliases:['potato'],diameter:.65,height:.65,color:'#678359',light:'#8fa675',dark:'#486747',form:'crop'},
    {name:'Dry beans',category:'Crops & herbs',aliases:['dry bean','bean'],diameter:.45,height:1.8,color:'#5c8051',light:'#83a36a',dark:'#3f6241',form:'stake'},
    {name:'Sweet potatoes',category:'Crops & herbs',aliases:['sweet potato'],diameter:.9,height:.3,color:'#688d58',light:'#91ad70',dark:'#486b47',form:'groundcover'},
    {name:'Fava / chickpea',category:'Crops & herbs',aliases:['fava','broad bean','chickpea'],diameter:.5,height:1.2,color:'#668757',light:'#8ba66e',dark:'#476745',form:'crop'}
  ];
  const el=(tag,attrs={},parent)=>{const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));if(parent)parent.appendChild(e);return e;};
  function species(o){const name=(o.species||'').toLowerCase(),match=plants.map(p=>({p,score:[p.name,...(p.aliases||[])].reduce((best,key)=>name.includes(key.toLowerCase())?Math.max(best,key.length):best,0)})).filter(x=>x.score).sort((a,b)=>b.score-a.score)[0];return match?.p||{color:'#5f8052',light:'#809a69',dark:'#456744',height:3,name:'Tree',form:'round'};}
  const pivot=o=>o.point||o.center||{x:o.points.reduce((v,p)=>v+p.x,0)/o.points.length,y:o.points.reduce((v,p)=>v+p.y,0)/o.points.length};
  function turnPoint(p,c,angle){const a=angle*Math.PI/180,dx=p.x-c.x,dy=p.y-c.y;return{x:c.x+dx*Math.cos(a)-dy*Math.sin(a),y:c.y+dx*Math.sin(a)+dy*Math.cos(a)};}
  function inside(p,poly){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)yes=!yes;}return yes;}
  function bedPlants(o){
    if(o.kind!=='bed'||!o.species)return[];
    const s=state.image.metersPerPixel||.025,sp=species(o),c=pivot(o),a=o.rotationDeg||0,poly=o.points.map(p=>turnPoint(p,c,-a));
    const xs=poly.map(p=>p.x),ys=poly.map(p=>p.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    const step=Math.max((o.spacingM||sp.diameter)/s,Math.sqrt((maxX-minX)*(maxY-minY)/220)),result=[];
    for(let y=minY+step/2;y<maxY;y+=step)for(let x=minX+step/2;x<maxX;x+=step){const p={x,y};if(inside(p,poly))result.push({kind:'tree',species:o.species,point:turnPoint(p,c,a),canopyM:Math.min(sp.diameter,step*s*.85),heightM:sp.height,baseHeight:o.heightM||.18,rotationDeg:a,crop:true});}
    return result;
  }
  function plantIcon(p){
    if(p.form==='column')return `<svg viewBox="0 0 50 50" aria-hidden="true"><ellipse cx="25" cy="45" rx="13" ry="3" fill="#dfe5d3"/><path d="M25 4C15 15 16 35 25 44C34 35 35 15 25 4Z" fill="${p.dark}"/><path d="M25 8C21 18 21 34 25 40C29 32 29 18 25 8Z" fill="${p.light}" opacity=".65"/></svg>`;
    if(p.form==='avocado')return `<svg viewBox="0 0 50 50" aria-hidden="true"><ellipse cx="26" cy="44" rx="18" ry="3" fill="#dfe5d3"/><path d="M24 43V28M24 34l-7-7m7 4 9-9" stroke="#7a5940" stroke-width="3" stroke-linecap="round"/><ellipse cx="18" cy="21" rx="12" ry="15" fill="${p.dark}" transform="rotate(-18 18 21)"/><ellipse cx="31" cy="20" rx="13" ry="16" fill="${p.color}" transform="rotate(18 31 20)"/><ellipse cx="25" cy="13" rx="11" ry="10" fill="${p.light}"/><path d="M34 30c-4 0-5 6-1 8 5 0 6-7 1-8Z" fill="${p.fruit}"/></svg>`;
    if(p.form==='vineRow')return `<svg viewBox="0 0 50 50" aria-hidden="true"><path d="M7 40V12M43 40V12M7 18h36M7 29h36" stroke="#856a4b" stroke-width="2"/><path d="M10 18c7-8 12 8 19 0s10 5 14 0" fill="none" stroke="${p.color}" stroke-width="5"/><circle cx="18" cy="30" r="3" fill="${p.fruit}"/><circle cx="33" cy="27" r="3" fill="${p.fruit}"/></svg>`;
    if(['stake','bramble'].includes(p.form))return `<svg viewBox="0 0 50 50" aria-hidden="true"><path d="M25 45V7" stroke="#826848" stroke-width="2"/><circle cx="18" cy="20" r="9" fill="${p.light}"/><circle cx="31" cy="27" r="10" fill="${p.color}"/><circle cx="18" cy="30" r="3" fill="${p.fruit||p.dark}"/><circle cx="32" cy="18" r="3" fill="${p.fruit||p.dark}"/></svg>`;
    if(['groundcover','herb','bulb','root','rosette','squash','crop'].includes(p.form))return `<svg viewBox="0 0 50 50" aria-hidden="true"><ellipse cx="25" cy="43" rx="16" ry="3" fill="#dfe5d3"/>${[0,1,2,3,4,5].map(i=>`<ellipse cx="25" cy="25" rx="6" ry="17" fill="${i%2?p.light:p.color}" transform="rotate(${i*60} 25 25)" opacity=".88"/>`).join('')}${p.fruit?`<circle cx="31" cy="30" r="3" fill="${p.fruit}"/>`:''}</svg>`;
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
  sections[1].insertAdjacentHTML('afterend','<section class="section"><h3>03 / Bring it to life</h3><label class="plant-filter-label" for="plantCategory">Plant group</label><select id="plantCategory" class="plant-filter"><option>Trees</option><option>Berries &amp; vines</option><option>Crops &amp; herbs</option></select><div class="plant-palette" id="plantPalette"></div><div class="crop-rotation"><strong>Five-stage crop rotation</strong><span>Potato → dry bean → sweet potato → fava / chickpea → potato</span></div><div class="hint">Choose a plant, then click to place. Sizes show mature spread or row length. Drag any object to move it.</div></section>');
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
  $('cancelOutline').onclick=()=>{pendingPlant=null;P.clearTool();P.setStatus('Drawing cancelled');};
  function renderPlantPalette(){
    const group=$('plantCategory').value,palette=$('plantPalette');palette.replaceChildren();
    plants.filter(p=>p.category===group).forEach(p=>{
      const row=p.form==='vineRow',measure=row?'row length':'mature spread',b=document.createElement('button');
      b.title=p.category!=='Trees'&&!row?`Draw a ${p.name.toLowerCase()} bed`:`Place ${p.name}, ${p.diameter} m ${measure}`;b.innerHTML=`${plantIcon(p)}<span>${p.name}</span>`;
      b.onclick=()=>{if(view!=='plan')setView('plan');pendingPlant=p;if(row){$('pathWidth').value=state.unit==='imperial'?(.8/.3048).toFixed(1):.8;P.chooseTool('path');P.setStatus('Click points along the grape row, then press Enter or Finish');return;}$('treeCanopy').value=state.unit==='imperial'?p.diameter/0.3048:p.diameter;$('treeSpecies').value=p.name;$('treeCanopy').closest('.field').querySelector('label').textContent='Mature canopy diameter';P.chooseTool('tree');P.setStatus(`Click to place ${p.name.toLowerCase()} · ${P.lengthText(p.diameter)} ${measure}`);};palette.appendChild(b);
    });
  }
  $('plantCategory').onchange=renderPlantPalette;renderPlantPalette();
  $('plantPalette').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const p=plants.find(p=>p.name===b.querySelector('span')?.textContent);if(p&&p.category!=='Trees'&&p.form!=='vineRow'){pendingPlant=p;P.chooseTool('bed');P.setStatus(`Draw the ${p.name.toLowerCase()} bed · click its corners, then Finish outline`);}});
  $('plantPalette').closest('.section').querySelector('.hint').textContent='Draw crop and herb beds as polygons. Place trees individually and draw grapes along a row.';
  $('selectedSection').insertAdjacentHTML('beforeend','<div class="field"><label for="objectRotation">Rotation (°)</label><input id="objectRotation" type="number" step="5" value="0"><button class="btn" id="quarterTurn">Rotate 90°</button></div><div id="cropBedFields"><div class="field"><label for="bedCrop">Bed crop</label><select id="bedCrop"><option value="">Unplanted bed</option></select></div><div class="field"><label for="bedSpacing">Plant spacing (meters)</label><input id="bedSpacing" type="number" min="0.1" max="5" step="0.05"></div><small>Large beds show a representative planting pattern.</small></div>');
  plants.filter(p=>p.category!=='Trees'&&p.form!=='vineRow').forEach(p=>$('bedCrop').add(new Option(p.name,p.name)));
  $('selectedPergolaRotation').closest('.field').hidden=true;
  function rotateSelected(value){const o=P.selectedObject();if(!o||state.mode!=='image'||!Number.isFinite(value))return;const angle=((value%360)+360)%360;if(o.points){const c=pivot(o);o.points=o.points.map(p=>turnPoint(p,c,angle-(o.rotationDeg||0)));}o.rotationDeg=angle;refresh();}
  $('objectRotation').onchange=e=>rotateSelected(+e.target.value);$('quarterTurn').onclick=()=>rotateSelected((P.selectedObject()?.rotationDeg||0)+90);
  $('bedCrop').onchange=e=>{const o=P.selectedObject();if(o?.kind!=='bed')return;o.species=e.target.value;o.spacingM=species(o).diameter||.5;if(o.species)o.name=o.species+' bed';refresh();};
  $('bedSpacing').onchange=e=>{const o=P.selectedObject(),v=+e.target.value;if(o?.kind==='bed'&&v>=.1&&v<=5){o.spacingM=v;refresh();}};
  ['pathWidth','selectedPathWidth'].forEach(id=>{$(id).min='0.1';$(id).step='0.1';});
  document.querySelector('[data-tool="path"]').addEventListener('click',()=>{$('pathWidth').value=state.unit==='imperial'?(0.5/.3048).toFixed(3):'0.5';});
  ['accessoryType','selectedAccessoryType'].forEach(id=>{$(id).add(new Option('Pirate ship playground','playground'));[...$(id).options].find(o=>o.value==='greenhouse').textContent='Hoop greenhouse';});
  const accessories=[['compost','Compost bin'],['waterButt','Water butt'],['shed','Tool shed'],['greenhouse','Hoop greenhouse'],['coldFrame','Cold frame'],['bench','Bench'],['playground','Pirate ship playground']];
  $('plantPalette').closest('.section').insertAdjacentHTML('afterend','<section class="section"><h3>04 / Garden things</h3><div class="garden-things" id="gardenThings"></div></section><section class="section layer-panel"><h3>Layers</h3><label><input id="irrigationLayer" type="checkbox"/> <span><strong>Irrigation</strong><small>Show pipes, drip lines, and sprinklers</small></span></label></section>');
  accessories.forEach(([type,name])=>{const b=document.createElement('button');b.innerHTML=`<span class="garden-thing-icon ${type}"></span><span>${name}</span>`;b.onclick=()=>{if(view!=='plan')setView('plan');$('accessoryType').value=type;P.chooseTool('accessory');P.setStatus(`Click to place ${name.toLowerCase()}`);};$('gardenThings').appendChild(b);});
  $('irrigationLayer').checked=irrigationVisible;$('irrigationLayer').onchange=e=>{irrigationVisible=e.target.checked;localStorage.setItem('plotline.irrigationVisible',irrigationVisible);refresh();P.setStatus(irrigationVisible?'Irrigation layer shown':'Irrigation layer hidden');};
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
    P.setStatus(next==='three'?'Drag to orbit · scroll to zoom · edit in 2D · heights are illustrative until set':next==='plan'?'Drag objects to move · drag empty space to pan · click to place or draw':'Trace your garden boundary, then use it in your design');
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
      if(f.geometry.type==='Point')return{...o,kind:m.kind||'tree',point:pt(f.geometry.coordinates)};
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
    state.image.objects.push({id:P.uid(),kind:'path',name:'Garden walk',widthM:1.2,points:[point(10,15),point(10,8),point(15,8),point(15,3)]},{id:P.uid(),kind:'path',name:'Grape row',species:'Grape row',rowPlant:true,widthM:.8,heightM:1.8,points:[point(8,2),point(12,2)]},{id:P.uid(),kind:'irrigation',name:'Supply line',irrigationType:'supply',points:[point(8,1),point(8,14)]},{id:P.uid(),kind:'irrigation',name:'Kitchen garden drip line',irrigationType:'drip',points:[point(1.5,3.5),point(6.5,3.5)]},{id:P.uid(),kind:'accessory',name:'Compost bin',accessoryType:'compost',widthM:1.2,depthM:1.2,heightM:1.2,point:point(8.8,13.2)},{id:P.uid(),kind:'bed',name:'Kitchen garden',points:[point(1,1),point(7,1),point(7,4),point(1,4)]},{id:P.uid(),kind:'bed',name:'Flowers & herbs',points:[point(1,11),point(7,11),point(7,14),point(1,14)]},{id:P.uid(),kind:'pergola',name:'A shady corner',widthM:4,depthM:3,heightM:2.5,center:point(15,3),rotationDeg:0});
    [['Olive',2,5.5],['Grapefruit',17,11],['Avocado',13,12],['Cypress',18,6],['Lime',18,3]].forEach(([name,x,y])=>{const p=plants.find(p=>p.name===name);state.image.objects.push({id:P.uid(),kind:'tree',name:p.name,species:p.name,canopyM:p.diameter,heightM:p.height,point:point(x,y)});});
    state.image.objects.filter(o=>o.kind==='bed').forEach((o,i)=>{o.species=i?'Salads':'Potatoes';o.name=o.species+' bed';o.spacingM=species(o).diameter;});
    state.image.objects.push({id:P.uid(),kind:'accessory',name:'Hoop greenhouse',accessoryType:'greenhouse',point:point(10,5),widthM:3,depthM:5,heightM:2.2,rotationDeg:90},{id:P.uid(),kind:'accessory',name:'Pirate ship playground',accessoryType:'playground',point:point(4,8.5),widthM:5,depthM:3,heightM:3.5});
    refresh();P.setStatus('Sample garden · 20 × 15 meters · try dragging a tree or switching to 3D');
  };
  $('referenceView').onclick=()=>setView('reference');$('planView').onclick=()=>setView('plan');$('threeView').onclick=()=>setView('three');
  ['satelliteTab','imageTab'].forEach((id,i)=>{const old=$(id).onclick;$(id).onclick=()=>{localStorage.setItem('plotline.referenceMode',i?'image':'satellite');setView('reference');old();};});
  $('panBtn').onclick=()=>{P.clearTool();panMode=true;enhance();P.setStatus('Drag anywhere to move the whole canvas · scroll to zoom · Fit resets the view');};
  $('selectBtn').onclick=()=>{P.clearTool();panMode=false;enhance();P.setStatus('Click any object to select it; drag to move. Arrow keys nudge by 10 cm.');};
  $('undoBtn').onclick=()=>undo(-1);$('redoBtn').onclick=()=>undo(1);
  $('finishBtn').onclick=()=>{
    const kind=state.tool,points=state.image.draft;
    const line=['path','irrigation'].includes(kind);if(!['property','bed','path','irrigation'].includes(kind)||points.length<(line?2:3))return;
    if(!line&&!validOutline(points)){P.setStatus('The outline crosses itself or has no area. Undo the last point and follow the edge in order.');return;}
    const row=kind==='path'&&pendingPlant?.form==='vineRow',crop=kind==='bed'&&pendingPlant,irrigation=kind==='irrigation',id=P.uid(),width=Number($('pathWidth').value)*(state.unit==='imperial'?.3048:1);
    if(kind==='path'&&(!Number.isFinite(width)||width<=0)){P.setStatus('Enter a path width greater than zero');return;}
    state.image.objects.push({id,kind,name:crop?pendingPlant.name+' bed':row?pendingPlant.name:irrigation?({drip:'Drip line',supply:'Supply line',sprinkler:'Sprinkler line'}[$('irrigationType').value]):kind==='bed'?'Planting bed':kind==='path'?'Path':'Garden boundary',species:row||crop?pendingPlant.name:undefined,spacingM:crop?pendingPlant.diameter:undefined,rowPlant:row||undefined,irrigationType:irrigation?$('irrigationType').value:undefined,heightM:row?pendingPlant.height:undefined,points:points.map(p=>({...p})),widthM:kind==='path'?width:undefined});pendingPlant=null;P.clearTool();state.selectedId=id;editingCorners=true;refresh();P.setStatus(row?'Grape row saved · drag its points to adjust the line':irrigation?'Irrigation route saved on its own layer':'Outline saved · drag its corners to adjust the shape');
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
  $('applySelected').onclick=()=>{const o=P.selectedObject();if(!o)return;const fields=o.kind==='pergola'?['selectedPergolaWidth','selectedPergolaDepth']:o.kind==='tree'?['selectedTreeCanopy']:o.kind==='path'?['selectedPathWidth']:o.kind==='accessory'?['selectedAccessoryWidth','selectedAccessoryDepth']:[];if(fields.some(id=>!Number.isFinite(+$(id).value)||+$(id).value<=0)){P.setStatus('Dimensions must be greater than zero');return;}applyOriginal();};
  $('sidebar').addEventListener('click',e=>{if(e.target.closest('.tool')){pendingPlant=null;panMode=false;if(view==='three')setView('plan');}},true);
  $('sidebar').addEventListener('click',e=>{if(e.target.closest('.tool,.plant-palette button,.garden-things button'))$('sidebar').classList.remove('open');});
  $('objectHeight').onchange=()=>{const o=state.image.objects.find(o=>o.id===state.selectedId),h=+$('objectHeight').value;if(o&&Number.isFinite(h)&&h>0&&h<=40){o.heightM=h;refresh();}};
  const unitOriginal=$('unitSelect').onchange;$('unitSelect').onchange=e=>{const factor=state.unit===e.target.value?1:state.unit==='imperial'?.3048:1/.3048;['pathWidth','treeCanopy','pergolaWidth','pergolaDepth'].forEach(id=>{$(id).value=+(Number($(id).value)*factor).toFixed(3);});unitOriginal(e);refresh();};
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
    if(dir&&o&&o.kind!=='property'){e.preventDefault();const step=(e.shiftKey?1:.1)/state.image.metersPerPixel;P.applyDrag(o,P.objectOrigin(o),dir[0]*step,dir[1]*step);refresh();}
  });
  let pan=null,spaceHeld=false;
  document.addEventListener('keydown',e=>{if(e.code==='Space'&&!/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)){e.preventDefault();spaceHeld=true;enhance();}});
  document.addEventListener('keyup',e=>{if(e.code==='Space'){spaceHeld=false;enhance();}});
  let suppressPanClick=false;
  svg.addEventListener('click',e=>{if(suppressPanClick){e.preventDefault();e.stopImmediatePropagation();suppressPanClick=false;}},true);
  svg.addEventListener('pointerdown',e=>{suppressPanClick=false;if(e.button!==0||view==='three'||e.target.closest('.corner-controls'))return;const object=e.target.closest('.svg-object');if(object&&!panMode&&!spaceHeld)return;e.preventDefault();e.stopImmediatePropagation();const v=svg.viewBox.baseVal;pan={x:e.clientX,y:e.clientY,v:{x:v.x,y:v.y,width:v.width,height:v.height}};},true);
  window.addEventListener('pointermove',e=>{if(!pan)return;if(Math.hypot(e.clientX-pan.x,e.clientY-pan.y)<4&&!suppressPanClick)return;suppressPanClick=true;document.body.classList.add('panning');e.preventDefault();const bounds=svg.getBoundingClientRect(),k=Math.max(pan.v.width/bounds.width,pan.v.height/bounds.height);svg.setAttribute('viewBox',`${pan.v.x-(e.clientX-pan.x)*k} ${pan.v.y-(e.clientY-pan.y)*k} ${pan.v.width} ${pan.v.height}`);},{capture:true});
  window.addEventListener('pointerup',()=>{if(!pan)return;pan=null;if(suppressPanClick)enhance();},{capture:true});window.addEventListener('pointercancel',()=>{if(!pan)return;pan=null;enhance();},{capture:true});
  svg.addEventListener('wheel',e=>{if(view==='three')return;e.preventDefault();zoomPlan(Math.exp(-e.deltaY*.0015),e.clientX,e.clientY);},{passive:false});
  function enhance(){
    observer.disconnect();
    $('imageEmpty').style.display=state.image.src?'none':'grid';
    $('scaleHint').textContent=state.image.metersPerPixel?`Scale set · 100 image pixels = ${P.lengthText(state.image.metersPerPixel*100)}`:'Scale not set · mark two points with a known distance.';
    svg.querySelectorAll('.studio-art,.studio-defs,.corner-controls').forEach(n=>n.remove());
    const drawing=state.mode==='image'&&['property','bed','path','irrigation'].includes(state.tool);
    const grapeLine=state.tool==='path'&&pendingPlant?.form==='vineRow',irrigationLine=state.tool==='irrigation';$('outlineBar').hidden=!drawing;$('outlineProgress').textContent=grapeLine?`${state.image.draft.length} points · click along the grape row`:irrigationLine?`${state.image.draft.length} points · click along the irrigation route`:`${state.image.draft.length} points · click around the edge`;$('finishOutline').textContent=grapeLine?'Finish grape row':irrigationLine?'Finish irrigation':'Finish outline';
    $('finishOutline').disabled=state.image.draft.length<(['path','irrigation'].includes(state.tool)?2:3);$('removeCorner').disabled=!state.image.draft.length;
    if(drawing&&['property','bed'].includes(state.tool)&&state.image.draft.length>=3)$('outlineProgress').textContent+=state.image.metersPerPixel?` · ${P.areaText(P.imagePolygonArea(state.image.draft)*state.image.metersPerPixel**2)}`:' · Set scale to calculate area';
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
        if(o.kind==='irrigation'&&!irrigationVisible){shape.style.display='none';return;}
        if(o.kind==='property'){
          shape.setAttribute('fill','#dce6c9');shape.setAttribute('stroke','#90a578');shape.setAttribute('stroke-width','1.5');svg.insertBefore(shape,ground.nextSibling);
          const dims=el('g',{class:'studio-art','pointer-events':'none'},svg);
          o.points.forEach((p,i)=>{const q=o.points[(i+1)%o.points.length],length=Math.hypot(q.x-p.x,q.y-p.y)*(state.image.metersPerPixel||0);if(length<1)return;const t=el('text',{x:(p.x+q.x)/2,y:(p.y+q.y)/2-12,'text-anchor':'middle',fill:'#6b805a','font-size':Math.max(state.image.width*.011,12)},dims);t.textContent=P.lengthText(length);});
        }
        if(o.kind==='bed'){shape.setAttribute('fill','url(#soil)');shape.setAttribute('stroke','#9a966e');shape.setAttribute('stroke-width','2');if(o.species){const art=el('g',{class:'studio-art','data-art-for':o.id,'pointer-events':'none'}),clip=el('clipPath',{id:'bed-'+o.id},defs);el('polygon',{points:o.points.map(p=>`${p.x},${p.y}`).join(' ')},clip);art.setAttribute('clip-path',`url(#bed-${o.id})`);for(const p of bedPlants(o)){const sp=species(p),r=p.canopyM/(state.image.metersPerPixel||.025)/2;for(let i=0;i<5;i++){const a=i*2.4;el('ellipse',{cx:p.point.x+Math.cos(a)*r*.3,cy:p.point.y+Math.sin(a)*r*.3,rx:r*.55,ry:r*.35,fill:i%2?sp.light:sp.color,transform:`rotate(${i*72} ${p.point.x} ${p.point.y})`},art);}}shape.after(art);}}
        if(o.kind==='path'&&o.rowPlant){
          shape.setAttribute('stroke','transparent');shape.removeAttribute('vector-effect');
          const sp=species(o),art=el('g',{class:'studio-art','data-art-for':o.id,'pointer-events':'none'}),scale=state.image.metersPerPixel||.025,rowWidth=(o.widthM||.8)/scale;
          for(let j=1;j<o.points.length;j++){const a=o.points[j-1],b=o.points[j],len=Math.hypot(b.x-a.x,b.y-a.y);if(!len)continue;const nx=-(b.y-a.y)/len,ny=(b.x-a.x)/len;[-1,1].forEach(side=>el('line',{x1:a.x+nx*rowWidth*.32,y1:a.y+ny*rowWidth*.32,x2:b.x+nx*rowWidth*.32,y2:b.y+ny*rowWidth*.32,stroke:'#80694a','stroke-width':Math.max(2,rowWidth*.08)},art));const count=Math.max(2,Math.ceil(len*scale/.8));for(let i=0;i<=count;i++){const t=i/count,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;if(i%2===0)el('line',{x1:x+nx*rowWidth*.48,y1:y+ny*rowWidth*.48,x2:x-nx*rowWidth*.48,y2:y-ny*rowWidth*.48,stroke:'#80694a','stroke-width':Math.max(2,rowWidth*.06)},art);el('circle',{cx:x,cy:y,r:rowWidth*.34,fill:i%2?sp.color:sp.light,opacity:.9},art);if(i%3===1)el('circle',{cx:x+nx*rowWidth*.18,cy:y+ny*rowWidth*.18,r:rowWidth*.08,fill:sp.fruit},art);}}
          shape.after(art);
        }else if(o.kind==='path'){shape.setAttribute('stroke','#d2c6a4');shape.removeAttribute('vector-effect');}
        if(o.kind==='irrigation'){
          const type=o.irrigationType||'drip',color=type==='supply'?'#2878a6':type==='sprinkler'?'#51a6cb':'#318db5';shape.setAttribute('stroke',color);shape.setAttribute('stroke-width',type==='supply'?4.5:3);shape.setAttribute('stroke-dasharray',type==='drip'?'2 9':'none');shape.setAttribute('opacity','.78');shape.style.filter='drop-shadow(0 1px 1px #174e6b35)';shape.parentNode.appendChild(shape);
          const art=el('g',{class:'studio-art','data-art-for':o.id,'pointer-events':'none'});for(let j=1;j<o.points.length;j++){const a=o.points[j-1],b=o.points[j],len=Math.hypot(b.x-a.x,b.y-a.y),count=Math.max(1,Math.floor(len*(state.image.metersPerPixel||.025)/(type==='drip'?.5:2)));for(let i=0;i<=count;i++){const t=i/count,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;if(type==='sprinkler'){el('circle',{cx:x,cy:y,r:Math.max(5,1/(state.image.metersPerPixel||.025))*.25,fill:'none',stroke:'#58acd0','stroke-width':1,'stroke-dasharray':'3 4',opacity:.55},art);el('circle',{cx:x,cy:y,r:3,fill:'#2878a6'},art);}else if(type==='drip')el('circle',{cx:x,cy:y,r:2.2,fill:'#1d6f99'},art);}}shape.after(art);
        }
        if(o.kind==='accessory'){
          const type=o.accessoryType||'compost',colors={compost:['#6d7657','#46523f'],waterButt:['#547986','#355d6c'],shed:['#987657','#674f3c'],greenhouse:['#b9d6c7','#6d9b87'],coldFrame:['#b9d6c7','#6d9b87'],bench:['#a47c50','#705338'],playground:['#b18a55','#67513a']}[type]||['#788270','#4f5d4a'];shape.setAttribute('fill',colors[0]);shape.setAttribute('stroke',colors[1]);
          const s=state.image.metersPerPixel||.025,w=o.widthM/s,h=o.depthM/s,x=o.point.x,y=o.point.y,art=el('g',{class:'studio-art','data-art-for':o.id,'pointer-events':'none'});
          if(type==='compost')for(let i=-2;i<=2;i++)el('line',{x1:x-w*.42,x2:x+w*.42,y1:y+i*h*.15,y2:y+i*h*.15,stroke:'#46523f','stroke-width':Math.max(1,w*.025)},art);
          if(type==='waterButt'){el('ellipse',{cx:x,cy:y-h*.35,rx:w*.36,ry:h*.1,fill:'#6f97a0'},art);el('circle',{cx:x+w*.25,cy:y+h*.2,r:w*.05,fill:'#d7b260'},art);}
          if(['greenhouse','coldFrame'].includes(type)){el('line',{x1:x-w*.45,y1:y,x2:x+w*.45,y2:y,stroke:'#6d9b87','stroke-width':2},art);el('line',{x1:x,y1:y-h*.45,x2:x,y2:y+h*.45,stroke:'#6d9b87','stroke-width':2},art);}
          if(type==='bench'){for(const yy of [-.22,0,.22])el('line',{x1:x-w*.42,x2:x+w*.42,y1:y+yy*h,y2:y+yy*h,stroke:'#705338','stroke-width':Math.max(2,h*.12)},art);}
          if(type==='greenhouse')for(let i=-3;i<=3;i++)el('line',{x1:x-w*.48,x2:x+w*.48,y1:y+i*h/8,y2:y+i*h/8,stroke:'#71958c','stroke-width':2},art);
          if(type==='playground'){el('path',{d:`M ${x-w*.46} ${y} L ${x-w*.28} ${y-h*.38} H ${x+w*.38} V ${y+h*.38} H ${x-w*.28} Z`,fill:'#cba574',stroke:'#73563c','stroke-width':3},art);el('circle',{cx:x,cy:y,r:w*.045,fill:'#73563c'},art);el('path',{d:`M ${x} ${y} L ${x+w*.28} ${y-h*.23} L ${x+w*.28} ${y+h*.23} Z`,fill:'#f3ead3'},art);}
          shape.after(art);
        }
        if(o.kind==='pergola'){
          shape.setAttribute('fill','#e2d6b9');shape.setAttribute('stroke','#b09a71');
          const s=state.image.metersPerPixel||.025,w=o.widthM/s,h=o.depthM/s;
          const art=el('g',{class:'studio-art','data-art-for':o.id,'pointer-events':'none',transform:`rotate(${o.rotationDeg||0} ${o.center.x} ${o.center.y})`});
          for(let i=0;i<=8;i++)el('line',{x1:o.center.x-w/2+i*w/8,x2:o.center.x-w/2+i*w/8,y1:o.center.y-h/2,y2:o.center.y+h/2,stroke:'#ac956f','stroke-width':Math.max(2,w/45)},art);
          shape.after(art);
        }
        if(o.kind==='tree'){
          const r=(o.canopyM||3)/(state.image.metersPerPixel||.025)/2,sp=species(o);
          const detailed=['airy','groundcover','herb','stake','crop','squash','bulb','root','rosette','bramble','vineRow'].includes(sp.form);shape.setAttribute('r',r);shape.setAttribute('fill',sp.form==='airy'?sp.light:(sp.foliage||sp.dark||sp.color));shape.setAttribute('fill-opacity',sp.form==='vineRow'?0:detailed?.3:1);shape.setAttribute('stroke',o.id===state.selectedId?'#355739':'#58764b');shape.setAttribute('stroke-width',o.id===state.selectedId?2:0);
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
          }else if(sp.form==='bramble'){
            for(let i=0;i<7;i++){const a=i*2.25,rr=r*(.1+(i%3)*.2),x=o.point.x+Math.cos(a)*rr,y=o.point.y+Math.sin(a)*rr;el('line',{x1:o.point.x,y1:o.point.y,x2:x,y2:y,stroke:'#725b45','stroke-width':r*.035},art);el('circle',{cx:x,cy:y,r:r*.25,fill:i%2?sp.light:sp.color},art);el('circle',{cx:x+r*.08,cy:y-r*.05,r:r*.055,fill:sp.fruit},art);}
          }else if(sp.form==='stake'){
            el('line',{x1:o.point.x,y1:o.point.y-r*.72,x2:o.point.x,y2:o.point.y+r*.72,stroke:'#80684b','stroke-width':r*.07},art);for(let i=0;i<8;i++){const a=i*.78,x=o.point.x+Math.cos(a)*r*.43,y=o.point.y+Math.sin(a)*r*.55;el('ellipse',{cx:x,cy:y,rx:r*.22,ry:r*.11,transform:`rotate(${i*41} ${x} ${y})`,fill:i%2?sp.light:sp.color},art);if(sp.fruit&&i%3===0)el('circle',{cx:x+r*.06,cy:y+r*.06,r:r*.075,fill:sp.fruit},art);}
          }else if(['groundcover','herb'].includes(sp.form)){
            for(let i=0;i<10;i++){const a=i*2.1,rr=r*(.08+(i%4)*.15),x=o.point.x+Math.cos(a)*rr,y=o.point.y+Math.sin(a)*rr;el('ellipse',{cx:x,cy:y,rx:r*.24,ry:r*.12,transform:`rotate(${i*37} ${x} ${y})`,fill:i%2?sp.light:sp.color},art);if(sp.fruit&&i%4===0)el('circle',{cx:x+r*.08,cy:y+r*.04,r:r*.065,fill:sp.fruit},art);}
          }else if(sp.form==='squash'){
            for(let i=0;i<8;i++)el('ellipse',{cx:o.point.x,cy:o.point.y-r*.34,rx:r*.27,ry:r*.54,transform:`rotate(${i*45} ${o.point.x} ${o.point.y})`,fill:i%2?sp.light:sp.color,opacity:.9},art);el('ellipse',{cx:o.point.x+r*.24,cy:o.point.y+r*.12,rx:r*.1,ry:r*.28,transform:`rotate(55 ${o.point.x+r*.24} ${o.point.y+r*.12})`,fill:sp.fruit},art);
          }else if(['bulb','root'].includes(sp.form)){
            for(let i=0;i<9;i++)el('ellipse',{cx:o.point.x,cy:o.point.y-r*.27,rx:r*.06,ry:r*.5,transform:`rotate(${i*40} ${o.point.x} ${o.point.y})`,fill:i%2?sp.light:sp.color},art);el('circle',{cx:o.point.x,cy:o.point.y,r:r*.13,fill:sp.fruit||'#d6ccb1'},art);
          }else if(sp.form==='rosette'){
            for(let i=0;i<10;i++)el('ellipse',{cx:o.point.x,cy:o.point.y-r*.25,rx:r*.18,ry:r*.42,transform:`rotate(${i*36} ${o.point.x} ${o.point.y})`,fill:i%2?sp.light:sp.color,opacity:.92},art);el('circle',{cx:o.point.x,cy:o.point.y,r:r*.2,fill:sp.light},art);
          }else if(sp.form==='crop'){
            for(let i=0;i<8;i++){const a=i*2.3,x=o.point.x+Math.cos(a)*r*.32,y=o.point.y+Math.sin(a)*r*.32;el('ellipse',{cx:x,cy:y,rx:r*.22,ry:r*.13,transform:`rotate(${i*43} ${x} ${y})`,fill:i%2?sp.light:sp.color},art);if(sp.fruit&&i%3===0)el('circle',{cx:x,cy:y,r:r*.07,fill:sp.fruit},art);}
          }else if(sp.form==='mound'){
            for(let i=0;i<12;i++){const a=i*2.12,rr=r*(.12+(i%4)*.13),x=o.point.x+Math.cos(a)*rr,y=o.point.y+Math.sin(a)*rr;el('ellipse',{cx:x,cy:y,rx:r*.2,ry:r*.1,transform:`rotate(${i*31} ${x} ${y})`,fill:i%3===0?sp.light:i%2?sp.color:sp.dark,opacity:.9},art);}
          }else if(sp.form==='column'){
            for(let i=0;i<4;i++)el('circle',{cx:o.point.x,cy:o.point.y,r:r*(.78-i*.16),fill:i%2?sp.color:sp.dark,opacity:.82},art);
          }else{
            for(let i=0;i<8;i++){const a=i*2.4,x=o.point.x+Math.cos(a)*r*.36,y=o.point.y+Math.sin(a)*r*.36;el('circle',{cx:x,cy:y,r:r*(.36+(i%3)*.06),fill:i%3===0?sp.light:i%2?sp.color:sp.dark,opacity:.72},art);}
            if(sp.fruit)for(let i=0;i<8;i++)el('circle',{cx:o.point.x+Math.cos(i*2.4)*r*.6,cy:o.point.y+Math.sin(i*2.4)*r*.6,r:r*.055,fill:sp.fruit},art);
          }
          shape.after(art);
        }
      });
    }else {const base=svg.querySelector('image');if(base)base.style.opacity='1';}
    // Paint ground first regardless of creation order. Vines remain above paths.
    const rank=o=>o.kind==='property'?0:o.kind==='path'&&!o.rowPlant?1:o.kind==='bed'?2:3;
    [...state.image.objects].sort((a,b)=>rank(a)-rank(b)).forEach(o=>{const shape=svg.querySelector(`[data-id="${o.id}"]`),art=svg.querySelector(`[data-art-for="${o.id}"]`);if(shape)svg.appendChild(shape);if(art)svg.appendChild(art);if(o.point&&o.rotationDeg){const t=`rotate(${o.rotationDeg} ${o.point.x} ${o.point.y})`;shape?.setAttribute('transform',t);art?.setAttribute('transform',t);}});
    [...svg.children].filter(n=>!n.hasAttribute('data-id')&&!n.hasAttribute('data-label-for')&&!n.classList.contains('studio-art')&&['polygon','polyline','circle'].includes(n.tagName)).forEach(n=>{n.style.pointerEvents='none';svg.appendChild(n);});
    svg.querySelectorAll('[data-label-for]').forEach(label=>{const o=state.image.objects.find(o=>o.id===label.getAttribute('data-label-for'));if(!o)return;const plot=['property','bed'].includes(o.kind);label.style.display=o.kind==='irrigation'&&!irrigationVisible?'none':view!=='reference'&&o.id!==state.selectedId&&['tree','path','irrigation'].includes(o.kind)?'none':'';label.textContent=plot?`${o.name} · ${state.image.metersPerPixel?P.areaText(P.imagePolygonArea(o.points)*state.image.metersPerPixel**2):'Set scale to calculate area'}`:o.name;svg.appendChild(label);});
    if(view!=='three'){
      const placed=[];[...svg.querySelectorAll('[data-label-for]')].filter(label=>label.style.display!=='none').forEach(label=>{
        const baseY=Number(label.getAttribute('y')),fontSize=Number.parseFloat(label.style.fontSize)||14;let attempt=0,box;
        do{const step=attempt?Math.ceil(attempt/2)*(fontSize+7)*(attempt%2?1:-1):0;label.setAttribute('y',baseY+step);box=label.getBBox();attempt++;}while(attempt<11&&placed.some(other=>box.x<other.x+other.width+5&&box.x+box.width+5>other.x&&box.y<other.y+other.height+4&&box.y+box.height+4>other.y));
        placed.push(box);
      });
    }
    const props=state.image.objects.filter(o=>o.kind==='property'),scale=state.image.metersPerPixel;
    $('gardenSummary').textContent=`${props.length&&scale?P.areaText(props.reduce((a,o)=>a+P.imagePolygonArea(o.points)*scale*scale,0))+' garden · ':''}${state.image.objects.filter(o=>o.kind==='tree'||o.rowPlant||(o.kind==='bed'&&o.species)).length} plantings · ${view==='three'?'3D preview':'Measured design'}`;
    const selected=state.image.objects.find(o=>o.id===state.selectedId);if(selected)$('objectHeight').value=selected.heightM||(selected.kind==='bed'?.18:species(selected).height);
    $('objectRotation').value=selected?.rotationDeg||0;$('cropBedFields').hidden=selected?.kind!=='bed';if(selected?.kind==='bed'){$('bedCrop').value=selected.species||'';$('bedSpacing').value=selected.spacingM||species(selected).diameter||.5;}
    $('editCorners').style.display=selected?.points&&selected.kind!=='property'&&state.mode==='image'?'block':'none';
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
          const finish=ev=>{handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',finish);handle.removeEventListener('pointercancel',cancel);if(!['path','irrigation'].includes(selected.kind)&&!validOutline(selected.points)){Object.assign(p,old);P.setStatus('That corner would cross another edge. Move cancelled.');}refresh();};
          const cancel=()=>{Object.assign(p,old);finish();};
          handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',cancel);
        });
        handle.addEventListener('click',e=>e.stopPropagation());
        if(['path','irrigation'].includes(selected.kind)&&i===selected.points.length-1)return;
        const q=selected.points[(i+1)%selected.points.length],x=(p.x+q.x)/2,y=(p.y+q.y)/2;
        const mid=el('g',{tabindex:0,role:'button','aria-label':`Add corner after ${i+1}`},group);
        el('circle',{cx:x,cy:y,r:r*.8,fill:'#eaf2e0',stroke:'#6f8b5b','stroke-width':1,'vector-effect':'non-scaling-stroke'},mid);
        const plus=el('text',{x,y:y+r*.4,'text-anchor':'middle','font-size':r*1.5,fill:'#315e4b','pointer-events':'none'},mid);plus.textContent='+';mid.style.cursor='pointer';
        mid.addEventListener('pointerdown',e=>e.stopPropagation());mid.addEventListener('click',e=>{e.stopPropagation();selected.points.splice(i+1,0,{x,y});refresh();});
      });
    }
    $('heightField').style.display=selected&&(['tree','pergola','bed','accessory'].includes(selected.kind)||selected.rowPlant)?'grid':'none';
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
    const sceneObjects=[...state.image.objects,...state.image.objects.flatMap(bedPlants)],properties=state.image.objects.filter(o=>o.kind==='property'&&o.points?.length>2);
    const footprint=(properties.length?properties.flatMap(o=>o.points):state.image.objects.flatMap(o=>o.points||[o.point||o.center].filter(Boolean)));
    const px=footprint.length?footprint.map(p=>p.x):[0,state.image.width],pz=footprint.length?footprint.map(p=>p.y):[0,state.image.height];
    const rawMinX=Math.min(...px)*s,rawMaxX=Math.max(...px)*s,rawMinZ=Math.min(...pz)*s,rawMaxZ=Math.max(...pz)*s;
    const span=Math.max(rawMaxX-rawMinX,rawMaxZ-rawMinZ),padding=Math.max(1.2,span*.035);
    const minX=rawMinX-padding,maxX=rawMaxX+padding,minZ=rawMinZ-padding,maxZ=rawMaxZ+padding,centerX=(minX+maxX)/2,centerZ=(minZ+maxZ)/2;
    const maxHeight=Math.max(2,...sceneObjects.map(o=>o.heightM||(o.kind==='tree'?species(o).height:o.rowPlant?species(o).height:0)));
    const cy=Math.cos(camera.yaw),sy=Math.sin(camera.yaw),cp=Math.cos(camera.pitch),sp=Math.sin(camera.pitch);
    const rawProject=([x,y,z])=>{x-=centerX;z-=centerZ;const a=x*cy-z*sy,b=x*sy+z*cy;return{x:a,y:b*sp-y*cp,depth:b*cp+y*sp};};
    const framePoints=[];for(const x of [minX,maxX])for(const z of [minZ,maxZ]){framePoints.push(rawProject([x,0,z]));framePoints.push(rawProject([x,maxHeight,z]));}
    const frameX=framePoints.map(p=>p.x),frameY=framePoints.map(p=>p.y),frameMinX=Math.min(...frameX),frameMaxX=Math.max(...frameX),frameMinY=Math.min(...frameY),frameMaxY=Math.max(...frameY);
    const inset={left:50,right:50,top:42,bottom:92},availableW=Math.max(100,W-inset.left-inset.right),availableH=Math.max(100,H-inset.top-inset.bottom);
    const unit=Math.max(.01,Math.min(availableW/Math.max(.01,frameMaxX-frameMinX),availableH/Math.max(.01,frameMaxY-frameMinY))*.94*camera.zoom);
    const originX=inset.left+availableW/2-(frameMinX+frameMaxX)*unit/2,originY=inset.top+availableH/2-(frameMinY+frameMaxY)*unit/2;
    const project=p=>{const v=rawProject(p);return{x:originX+v.x*unit,y:originY+v.y*unit,depth:v.depth};};
    const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#dbe8eb');sky.addColorStop(.65,'#edf1e7');sky.addColorStop(1,'#d5dfcc');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    let layer=3,cropDetail=false;
    const faces=[],labels=[];const face=(points,color,stroke)=>faces.push({points,color,stroke,layer,depth:points.reduce((sum,p)=>sum+project(p).depth,0)/points.length});
    function box(x,y,z,w,h,d,color){const a=[x-w/2,y,z-d/2],b=[x+w/2,y,z-d/2],c=[x+w/2,y,z+d/2],e=[x-w/2,y,z+d/2],up=p=>[p[0],p[1]+h,p[2]];face([a,b,up(b),up(a)],color);face([b,c,up(c),up(b)],shade(color,-18));face([c,e,up(e),up(c)],shade(color,-8));face([e,a,up(a),up(e)],shade(color,5));face([up(a),up(b),up(c),up(e)],shade(color,22));}
    function cylinder(x,y,z,r,h,color,n=10){const bottom=[],top=[];for(let i=0;i<n;i++){const a=i*Math.PI*2/n;bottom.push([x+Math.cos(a)*r,y,z+Math.sin(a)*r]);top.push([x+Math.cos(a)*r,y+h,z+Math.sin(a)*r]);}for(let i=0;i<n;i++)face([bottom[i],bottom[(i+1)%n],top[(i+1)%n],top[i]],shade(color,Math.round(Math.cos(i*Math.PI*2/n)*14)));face(top,shade(color,20));}
    function canopy(x,y,z,rx,h,color,rz=rx){const n=rx<.15||cropDetail?6:14,rings=rx<.15||cropDetail?3:7;for(let j=0;j<rings;j++){const t1=-Math.PI/2+j*Math.PI/rings,t2=-Math.PI/2+(j+1)*Math.PI/rings;for(let i=0;i<n;i++){const a=i*2*Math.PI/n,b=(i+1)*2*Math.PI/n,t=(t1+t2)/2,light=Math.cos(t)*Math.cos(a)*-.45+Math.sin(t)*.8+Math.cos(t)*Math.sin(a)*-.3;const p=(t,a)=>[x+Math.cos(t)*Math.cos(a)*rx,y+Math.sin(t)*h,z+Math.cos(t)*Math.sin(a)*rz];face([p(t1,a),p(t1,b),p(t2,b),p(t2,a)],shade(color,Math.round(light*30-5)));}}}
    function leaf(x,y,z,a,r,color){const tip=[x+Math.cos(a)*r,y+r*.18,z+Math.sin(a)*r],base=[x,y,z],mid=[x+Math.cos(a)*r*.5,y+r*.25,z+Math.sin(a)*r*.5],left=[mid[0]-Math.sin(a)*r*.28,mid[1]-.04,mid[2]+Math.cos(a)*r*.28],right=[mid[0]+Math.sin(a)*r*.28,mid[1]-.04,mid[2]-Math.cos(a)*r*.28];face([base,left,tip,mid],shade(color,14));face([base,mid,tip,right],shade(color,-7));}
    function limb(a,b,w,color){const dx=b[0]-a[0],dz=b[2]-a[2],len=Math.hypot(dx,dz)||1,px=-dz/len*w/2,pz=dx/len*w/2,up=[0,w*.45,0];face([[a[0]+px,a[1],a[2]+pz],[a[0]-px,a[1],a[2]-pz],[b[0]-px,b[1],b[2]-pz],[b[0]+px,b[1],b[2]+pz]],color);face([[a[0]+px+up[0],a[1]+up[1],a[2]+pz+up[2]],[b[0]+px+up[0],b[1]+up[1],b[2]+pz+up[2]],[b[0]-px+up[0],b[1]+up[1],b[2]-pz+up[2]],[a[0]-px+up[0],a[1]+up[1],a[2]-pz+up[2]]],shade(color,16));}
    layer=0;
    const groundShapes=properties.length?properties.map(o=>o.points.map(p=>[p.x*s,-.06,p.y*s])):[[[minX,-.06,minZ],[maxX,-.06,minZ],[maxX,-.06,maxZ],[minX,-.06,maxZ]]];
    groundShapes.forEach(points=>{face(points,'#dfe7d4','#aebc9f');points.forEach((p,i)=>{const q=points[(i+1)%points.length];face([p,q,[q[0],-.3,q[2]],[p[0],-.3,p[2]]],i%2?'#aeb99a':'#b9c5a5');});});
    // Ground shadows give plant heights and footprints a readable visual anchor.
    const shadows=[];
    for(const o of state.image.objects){if(!o.point||!['tree','accessory'].includes(o.kind))continue;const h=o.heightM||(o.kind==='tree'?species(o).height:1),r=o.kind==='tree'?(o.canopyM||3)/2:(o.widthM||1)*.65;shadows.push(Array.from({length:24},(_,i)=>{const a=i*Math.PI/12;return[o.point.x*s+h*.28+Math.cos(a)*r,.025,o.point.y*s+h*.18+Math.sin(a)*r*.65];}));}
    sceneObjects.forEach(o=>{
      if(o.kind==='irrigation'&&!irrigationVisible)return;cropDetail=!!o.crop;const objectStart=faces.length;layer=o.kind==='property'?1:o.kind==='path'&&!o.rowPlant?1.5:['bed','irrigation'].includes(o.kind)?2:3;
      if(o.kind==='property')return;
      if(o.kind==='bed'){
        const h=o.heightM||.18,pts=o.points.map(p=>[p.x*s,h,p.y*s]);face(pts,'#afa17b');
        pts.forEach((p,i)=>{const q=pts[(i+1)%pts.length];face([p,q,[q[0],0,q[2]],[p[0],0,p[2]]],'#95825c');});
        {
          for(let i=0;i<o.points.length;i++){const a=o.points[i],b=o.points[(i+1)%o.points.length];limb([a.x*s,h+.02,a.y*s],[b.x*s,h+.02,b.y*s],.065,'#a18b61');}
          const c=pivot(o),xs=o.points.map(p=>p.x),ys=o.points.map(p=>p.y),area=(Math.max(...xs)-Math.min(...xs))*(Math.max(...ys)-Math.min(...ys));
          labels.push({point:[c.x*s,h+.09,c.y*s],text:o.name||'Planting bed'});
          for(let i=0;i<Math.min(240,area*s*s*12);i++){const p={x:Math.min(...xs)+(Math.sin(i*78.233)*43758.5453%1+1)%1*(Math.max(...xs)-Math.min(...xs)),y:Math.min(...ys)+(Math.sin(i*39.425)*24634.6345%1+1)%1*(Math.max(...ys)-Math.min(...ys))};if(inside(p,o.points))face([[p.x*s,h+.006,p.y*s],[p.x*s+.025,h+.006,p.y*s+.015],[p.x*s+.01,h+.006,p.y*s+.035]],i%2?'#8f7b58':'#c4ad86');}
        }
      }else if(o.kind==='path'&&o.rowPlant){
        const vine=species(o),h=o.heightM||vine.height||1.8;
        for(let i=1;i<o.points.length;i++){const a=o.points[i-1],b=o.points[i],ax=a.x*s,az=a.y*s,bx=b.x*s,bz=b.y*s,len=Math.hypot(bx-ax,bz-az);if(!len)continue;limb([ax,h*.72,az],[bx,h*.72,bz],.09,'#806348');limb([ax,h*.42,az],[bx,h*.42,bz],.06,'#8b704f');const count=Math.max(2,Math.ceil(len/1.1));for(let j=0;j<=count;j++){const t=j/count,x=ax+(bx-ax)*t,z=az+(bz-az)*t;if(j%2===0)box(x,0,z,.09,h,.09,'#806348');canopy(x,h*.62,z,.38,h*.2,j%2?vine.color:vine.light,.25);if(j%3===1)for(let k=0;k<3;k++)canopy(x+(k-1)*.07,h*(.42-k*.025),z+.04,.035,.055,vine.fruit,.03);}}
      }else if(o.kind==='path'){
        for(let i=1;i<o.points.length;i++){const a=o.points[i-1],b=o.points[i],len=Math.hypot(b.x-a.x,b.y-a.y);if(!len)continue;const dx=-(b.y-a.y)/len*(o.widthM||1)/2,dz=(b.x-a.x)/len*(o.widthM||1)/2;face([[a.x*s+dx,.035,a.y*s+dz],[b.x*s+dx,.035,b.y*s+dz],[b.x*s-dx,.035,b.y*s-dz],[a.x*s-dx,.035,a.y*s-dz]],'#d8caaa');}
      }else if(o.kind==='irrigation'){
        const type=o.irrigationType||'drip',color=type==='supply'?'#2878a6':type==='sprinkler'?'#51a6cb':'#318db5',width=type==='supply'?.09:.045;for(let i=1;i<o.points.length;i++){const a=o.points[i-1],b=o.points[i],ax=a.x*s,az=a.y*s,bx=b.x*s,bz=b.y*s,len=Math.hypot(bx-ax,bz-az);if(!len)continue;const nx=-(bz-az)/len*width,nz=(bx-ax)/len*width;face([[ax+nx,.055,az+nz],[bx+nx,.055,bz+nz],[bx-nx,.055,bz-nz],[ax-nx,.055,az-nz]],color);const spacing=type==='drip'?.5:2,count=Math.max(1,Math.floor(len/spacing));for(let j=0;j<=count;j++){const t=j/count,x=ax+(bx-ax)*t,z=az+(bz-az)*t;if(type==='drip')cylinder(x,.055,z,.035,.035,'#1d6f99',7);if(type==='sprinkler'){cylinder(x,.055,z,.045,.12,'#2878a6',7);canopy(x,.18,z,.32,.025,'#8ccde0',.32);}}}
      }else if(o.kind==='tree'){
        const x=o.point.x*s,z=o.point.y*s,sp=species(o),h=o.heightM||sp.height,r=(o.canopyM||3)/2;
        if(sp.form==='avocado'){
          const fork=h*.48;box(x,0,z,.2,fork,.2,'#79573e');
          const crown=[[0,h*.72,0,.7,.27,.62],[-.46,h*.68,-.08,.55,.25,.48],[.43,h*.7,.08,.58,.26,.5],[-.2,h*.84,-.3,.52,.23,.5],[.18,h*.86,.32,.5,.22,.47],[0,h*.94,0,.44,.18,.42]];
          crown.slice(1).forEach(([dx,y,dz])=>limb([x,fork,z],[x+dx*r,y-h*.08,z+dz*r],.11,'#76543c'));
          crown.forEach(([dx,y,dz,rx,ry,rz],i)=>canopy(x+dx*r,y,z+dz*r,r*rx,h*ry,i%3===0?sp.light:i%2?sp.dark:sp.color,r*rz));
          for(let i=0;i<7;i++){const a=i*2.399,rr=r*(.25+(i%3)*.2);canopy(x+Math.cos(a)*rr,h*(.61+(i%4)*.055),z+Math.sin(a)*rr,.055,.095,sp.fruit,.045);}
        }else if(sp.form==='vineRow'){
          limb([x-r,h*.7,z],[x+r,h*.7,z],.09,'#806348');limb([x-r,h*.4,z],[x+r,h*.4,z],.06,'#8b704f');for(let i=0;i<=6;i++){const px=x-r+i*r/3;if(i%2===0)box(px,0,z,.09,h,.09,'#806348');canopy(px,h*.62,z,.38,h*.2,i%2?sp.color:sp.light,.25);if(i%3===1)canopy(px,h*.43,z,.07,.09,sp.fruit,.06);}
        }else if(sp.form==='column'){
          box(x,0,z,.13,h*.78,.13,'#816044');for(let i=0;i<5;i++)canopy(x,h*(.35+i*.12),z,r*(.72-i*.09),h*.18,i%2?sp.color:sp.dark,r*(.72-i*.09));
        }else if(sp.form==='airy'){
          const fork=h*.42;box(x,0,z,.18,fork,.18,'#806044');
          for(let i=0;i<7;i++){const a=i*2.31,rr=r*(.28+(i%3)*.18),cx=x+Math.cos(a)*rr,cz=z+Math.sin(a)*rr,cy=h*(.62+(i%3)*.09);limb([x,fork,z],[cx,cy-h*.08,cz],.09,'#806044');canopy(cx,cy,cz,r*(.3+(i%2)*.08),h*.18,i%3===0?sp.light:i%2?sp.color:sp.dark,r*(.26+(i%2)*.08));}
        }else if(sp.form==='mound'){
          for(let i=0;i<7;i++){const a=i*2.36,rr=r*(.08+(i%3)*.22);canopy(x+Math.cos(a)*rr,h*(.28+(i%2)*.08),z+Math.sin(a)*rr,r*(.34+(i%2)*.08),h*.3,i%3===0?sp.light:i%2?sp.color:sp.dark,r*.3);}
        }else if(sp.form==='flower'){
          for(let i=0;i<7;i++){const a=i*2.36,rr=r*(.08+(i%3)*.22),cx=x+Math.cos(a)*rr,cz=z+Math.sin(a)*rr,cy=h*(.32+(i%2)*.08);canopy(cx,cy,cz,r*.34,h*.3,sp.foliage,r*.3);canopy(cx,cy+h*.18,cz,r*.12,h*.1,i%3===0?sp.light:sp.color,r*.12);}
        }else if(sp.form==='bramble'){
          for(let i=0;i<7;i++){const a=i*2.2,rr=r*(.08+(i%3)*.2),cx=x+Math.cos(a)*rr,cz=z+Math.sin(a)*rr,cy=h*(.4+(i%3)*.15);limb([x,.05,z],[cx,cy,cz],.035,'#765844');canopy(cx,cy,cz,r*.24,h*.15,i%2?sp.light:sp.color,r*.2);canopy(cx+r*.08,cy-h*.08,cz,.035,.045,sp.fruit,.03);}
        }else if(sp.form==='stake'){
          box(x,0,z,.055,h,.055,'#80684b');for(let i=0;i<7;i++){const a=i*2.2,cy=h*(.25+i*.09),cx=x+Math.cos(a)*r*.3,cz=z+Math.sin(a)*r*.3;canopy(cx,cy,cz,r*.25,h*.1,i%2?sp.light:sp.color,r*.15);if(sp.fruit&&i%2===0)canopy(cx+r*.08,cy-h*.07,cz,.045,.055,sp.fruit,.04);}
        }else if(['groundcover','herb'].includes(sp.form)){
          for(let i=0;i<8;i++){const a=i*2.25;leaf(x,h*.2,z,a,r,i%2?sp.light:sp.color);if(sp.fruit&&i%3===0)canopy(x+Math.cos(a)*r*.5,h*.2,z+Math.sin(a)*r*.5,.035,.035,sp.fruit);}
        }else if(sp.form==='squash'){
          for(let i=0;i<8;i++){const a=i*Math.PI/4;canopy(x+Math.cos(a)*r*.32,h*.25,z+Math.sin(a)*r*.32,r*.3,h*.15,i%2?sp.light:sp.color,r*.18);}canopy(x+r*.25,h*.18,z+r*.1,.08,.08,sp.fruit,.2);
        }else if(['bulb','root'].includes(sp.form)){
          for(let i=0;i<7;i++){const a=i*.9;limb([x,.03,z],[x+Math.cos(a)*r*.42,h,z+Math.sin(a)*r*.42],.025,i%2?sp.light:sp.color);}canopy(x,.1,z,r*.13,.1,sp.fruit||'#d6ccb1');
        }else if(sp.form==='rosette'){
          for(let i=0;i<10;i++)leaf(x,h*.18,z,i*2.399,r*1.15,i%2?sp.light:sp.color);canopy(x,h*.4,z,r*.38,h*.3,sp.light);
        }else if(sp.form==='crop'){
          limb([x,0,z],[x,h*.72,z],.02,sp.dark);for(let i=0;i<9;i++){const a=i*2.399,cy=h*(.2+(i%4)*.12);leaf(x,cy,z,a,r*.85,i%2?sp.light:sp.color);if(sp.fruit&&i%3===0)canopy(x+Math.cos(a)*r*.5,cy-.05,z+Math.sin(a)*r*.5,.045,.065,sp.fruit);}
        }else{
          cylinder(x,0,z,.09,h*.48,'#826144');
          for(let i=0;i<9;i++){const a=i*2.399,rr=i===0?0:r*.5,cx=x+Math.cos(a)*rr,cz=z+Math.sin(a)*rr,cy=h*(.62+(i%3)*.075);limb([x,h*.36,z],[cx,cy,cz],.065,'#826144');canopy(cx,cy,cz,r*.52,h*.24,i%3===0?sp.light:i%3===1?sp.color:sp.dark,r*.48);}
          if(sp.fruit)for(let i=0;i<7;i++){const a=i*2.4;canopy(x+Math.cos(a)*r*.7,h*(.62+(i%3)*.08),z+Math.sin(a)*r*.7,.065,.065,sp.fruit,.055);}
        }
      }else if(o.kind==='accessory'){
        const x=o.point.x*s,z=o.point.y*s,w=o.widthM||1,d=o.depthM||1,h=o.heightM||1,type=o.accessoryType||'compost';
        if(type==='shed'){const eave=h*.82,over=.08,roof='#646958';face([[x-w/2-over,eave,z-d/2-over],[x,h,z-d/2-over],[x,h,z+d/2+over],[x-w/2-over,eave,z+d/2+over]],roof);face([[x,h,z-d/2-over],[x+w/2+over,eave,z-d/2-over],[x+w/2+over,eave,z+d/2+over],[x,h,z+d/2+over]],shade(roof,-16));}
        if(type==='compost'){box(x,0,z,w,h,d,'#667052');for(let i=1;i<5;i++)box(x,h*i/5,z+d/2+.012,w+.04,.035,.035,'#47523f');}
        if(type==='waterButt'){cylinder(x,0,z,w*.46,h,'#547986',12);cylinder(x+w*.32,h*.2,z+d*.38,.045,.12,'#d0a954',7);}
        if(type==='shed'){box(x,0,z,w,h*.82,d,'#927052');face([[x-w*.56,h*.82,z-d*.55],[x,h,z-d*.55],[x+w*.56,h*.82,z-d*.55]],'#6b5140');face([[x-w*.56,h*.82,z+d*.55],[x+w*.56,h*.82,z+d*.55],[x,h,z+d*.55]],'#795b45');}
        if(type==='greenhouse'){
          box(x,.015,z,w,.04,d,'#9a8b67');
          const hoop=(a,zz)=>[x+Math.cos(a)*w/2,.08+Math.sin(a)*(h-.08),zz],segments=20;
          for(let i=0;i<segments;i++){const a=i*Math.PI/segments,b=(i+1)*Math.PI/segments;face([hoop(a,z-d/2),hoop(b,z-d/2),hoop(b,z+d/2),hoop(a,z+d/2)],shade('#c0dcd4',Math.round(Math.sin(a)*22-Math.cos(a)*14)));}
          for(let j=0;j<=6;j++)for(let i=0;i<segments;i++)limb(hoop(i*Math.PI/segments,z-d/2+j*d/6),hoop((i+1)*Math.PI/segments,z-d/2+j*d/6),.045,'#76978c');
          for(const zz of [z-d/2-.01,z+d/2+.01]){const end=Array.from({length:21},(_,i)=>hoop(i*Math.PI/20,zz));face(end,'#b6d3c8');box(x,0,zz,w*.3,h*.67,.035,'#87aa9e');for(const dx of [-w*.15,w*.15])box(x+dx,0,zz,.045,h*.68,.055,'#537f70');box(x,h*.68,zz,w*.34,.045,.055,'#537f70');}
        }
        if(type==='playground'){
          const outline=[[-.5,0],[-.28,-.34],[.4,-.34],[.46,0],[.4,.34],[-.28,.34]],deck=h*.24;
          const top=outline.map(([a,b])=>[x+a*w,deck,z+b*d]);face(top,'#d2ad7b');top.forEach((p,i)=>{const q=top[(i+1)%top.length];face([p,q,[x+(q[0]-x)*.84,.12,z+(q[2]-z)*.8],[x+(p[0]-x)*.84,.12,z+(p[2]-z)*.8]],i%2?'#9c7048':'#b88c59');limb(p,q,.07,'#785335');});
          for(let i=-3;i<=3;i++)box(x+i*w*.09,deck+.01,z,.025,.02,d*.64,'#b48c5d');
          for(const side of [-1,1]){limb([x-w*.25,deck+h*.17,z+side*d*.34],[x+w*.39,deck+h*.17,z+side*d*.34],.07,'#a77b4c');for(let i=0;i<5;i++)box(x-w*.25+i*w*.16,deck,z+side*d*.34,.06,h*.17,.06,'#967046');}
          cylinder(x,deck,z,.06,h*.7,'#8a623c',10);limb([x-w*.23,h*.76,z],[x+w*.23,h*.76,z],.065,'#89633f');
          face([[x-w*.22,h*.74,z],[x+w*.22,h*.74,z],[x+w*.16,h*.43,z+.12],[x-w*.16,h*.43,z+.12]],'#f5e8c9');
          face([[x,h*.94,z],[x+w*.18,h*.88,z],[x,h*.83,z]],'#36494a');
          box(x+w*.3,deck,z,w*.2,.08,d*.58,'#c39a65');
          for(let i=0;i<5;i++)box(x+w*.43+i*w*.045,deck*(1-i/5),z,w*.09,.07,d*.22,'#bb8f59');
          limb([x-w*.36,deck,z],[x-w*.48,.12,z],.04,'#d7c697');
        }
        if(type==='coldFrame'){box(x,0,z,w,h,d,'#9fc8b6');box(x,h,z,.035,.04,d,'#6d9b87');box(x,h,z,w,.04,.035,'#6d9b87');}
        if(type==='bench'){box(x,h*.48,z,w,.12,d,'#9b744c');box(x,h*.62,z+d*.38,w,h*.32,.1,'#8d6847');for(const dx of [-w*.38,w*.38])for(const dz of [-d*.3,d*.3])box(x+dx,0,z+dz,.08,h*.5,.08,'#705338');}
      }else if(o.kind==='pergola'){
        const start=faces.length,x=o.center.x*s,z=o.center.y*s,w=o.widthM,d=o.depthM,h=o.heightM||2.5;
        box(x,.04,z,w,.08,d,'#cabc9b');for(const dx of [-w/2,w/2])for(const dz of [-d/2,d/2])box(x+dx,.1,z+dz,.14,h,.14,'#ac9066');
        for(let i=0;i<9;i++)box(x-w/2+i*w/8,h,z,.12,.14,d+.25,'#b29a70');
        const a=(o.rotationDeg||0)*Math.PI/180;for(let i=start;i<faces.length;i++){faces[i].points=faces[i].points.map(p=>[x+(p[0]-x)*Math.cos(a)-(p[2]-z)*Math.sin(a),p[1],z+(p[0]-x)*Math.sin(a)+(p[2]-z)*Math.cos(a)]);faces[i].depth=faces[i].points.reduce((sum,p)=>sum+project(p).depth,0)/faces[i].points.length;}
      }
      if(o.point&&(o.rotationDeg||o.baseHeight)){const c=o.point,a=(o.rotationDeg||0)*Math.PI/180;for(let i=objectStart;i<faces.length;i++){faces[i].points=faces[i].points.map(p=>{const dx=p[0]-c.x*s,dz=p[2]-c.y*s;return[c.x*s+dx*Math.cos(a)-dz*Math.sin(a),p[1]+(o.baseHeight||0),c.y*s+dx*Math.sin(a)+dz*Math.cos(a)];});faces[i].depth=faces[i].points.reduce((sum,p)=>sum+project(p).depth,0)/faces[i].points.length;}}
    });
    layer=1.8;shadows.forEach(points=>face(points,'rgba(43,62,35,.13)'));
    ctx.lineJoin='round';ctx.lineCap='round';faces.sort((a,b)=>a.layer-b.layer||a.depth-b.depth).forEach(f=>{ctx.beginPath();f.points.forEach((p,i)=>{const v=project(p);i?ctx.lineTo(v.x,v.y):ctx.moveTo(v.x,v.y);});ctx.closePath();ctx.fillStyle=f.color;ctx.fill();if(f.stroke){ctx.strokeStyle=f.stroke;ctx.lineWidth=1;ctx.stroke();}});
    ctx.font='600 11px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';const placedLabels=[];
    labels.map(label=>({...label,anchor:project(label.point)})).sort((a,b)=>a.anchor.y-b.anchor.y).forEach(label=>{
      const text=label.text.length>28?label.text.slice(0,27)+'…':label.text,w=ctx.measureText(text).width+16,h=24,x=Math.max(w/2+8,Math.min(W-w/2-8,label.anchor.x));let y=Math.max(54,Math.min(H-86,label.anchor.y)),attempt=0;
      const overlaps=()=>placedLabels.some(r=>Math.abs(x-r.x)<(w+r.w)/2+5&&Math.abs(y-r.y)<h+4);
      while(overlaps()&&attempt<10){attempt++;const step=Math.ceil(attempt/2)*28;y=Math.max(54,Math.min(H-86,label.anchor.y+(attempt%2?1:-1)*step));}
      if(Math.hypot(x-label.anchor.x,y-label.anchor.y)>8){ctx.strokeStyle='rgba(91,105,76,.45)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(label.anchor.x,label.anchor.y);ctx.lineTo(x,y);ctx.stroke();}
      placedLabels.push({x,y,w});ctx.fillStyle='rgba(255,255,248,.9)';ctx.beginPath();ctx.roundRect(x-w/2,y-h/2,w,h,7);ctx.fill();ctx.strokeStyle='rgba(91,105,76,.34)';ctx.lineWidth=1;ctx.stroke();ctx.fillStyle='#45533f';ctx.fillText(text,x,y+.5);
    });
    ctx.textAlign='left';ctx.textBaseline='alphabetic';
    ctx.fillStyle='#718266';ctx.font='11px system-ui';ctx.fillText('ORTHOGRAPHIC / DIMENSIONS PRESERVED',25,H-75);
  }
  function shade(hex,n){const c=hex.replace('#','');return '#'+[0,2,4].map(i=>Math.max(0,Math.min(255,parseInt(c.slice(i,i+2),16)+n)).toString(16).padStart(2,'0')).join('');}
  let orbit=null;canvas.onpointerdown=e=>{orbit={x:e.clientX,y:e.clientY,yaw:camera.yaw,pitch:camera.pitch};canvas.setPointerCapture(e.pointerId);};canvas.onpointermove=e=>{if(!orbit)return;camera.yaw=orbit.yaw+(e.clientX-orbit.x)*.008;camera.pitch=Math.max(.15,Math.min(1.4,orbit.pitch+(e.clientY-orbit.y)*.005));draw3d();};canvas.onpointerup=canvas.onpointercancel=()=>orbit=null;canvas.addEventListener('wheel',e=>{e.preventDefault();camera.zoom=Math.max(.3,Math.min(5,camera.zoom*Math.exp(-e.deltaY*.001)));draw3d();},{passive:false});
  new ResizeObserver(()=>{if(view==='three')draw3d();}).observe(workspace);
  // Restore the complete canvas, including its reference image, after a reload.
  const saved=P.store.get('plotline.studio',null);if(saved?.image){Object.assign(state.image,saved.image);state.image.draft=[];state.image.calibration=[];state.unit=saved.unit||state.unit;$('unitSelect').value=state.unit;}
  if(!saved&&!localStorage.getItem('plotline.unit')){state.unit='metric';$('unitSelect').value='metric';$('pergolaWidth').value=4;$('pergolaDepth').value=3;$('treeCanopy').value=3;}
  $('pathWidth').value=state.unit==='imperial'?(0.5/.3048).toFixed(3):'0.5';
  setView(localStorage.getItem('plotline.studioView')||'plan');
  if(!state.image.objects.length){P.setStatus(view==='reference'?'Reference image ready · calibrate a known distance, then trace your garden':'Set your garden dimensions, trace a reference, or explore the sample garden');}
})();
