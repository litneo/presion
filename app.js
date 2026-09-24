const DB="MiPresionPro",VER=3, P="patients",O="operators",R="readings",G="glucose";
let db,trendChart,catChart,installPrompt,operatorMap=new Map();
const $=id=>document.getElementById(id);
const screens=["dashboard","quickStart","confirmScreen","formScreen","history","glucoseHistory","glucoseStart","glucoseConfirm","reports","patients","settings"];

document.addEventListener("DOMContentLoaded",async()=>{await openDB();await defaults();bind();$("seniorMode").checked=localStorage.getItem("seniorMode")!=="0";await refresh();registerSW()});
function openDB(){return new Promise((res,rej)=>{let q=indexedDB.open(DB,VER);q.onupgradeneeded=e=>{let d=e.target.result; if(!d.objectStoreNames.contains(P))d.createObjectStore(P,{keyPath:"id",autoIncrement:true});if(!d.objectStoreNames.contains(O))d.createObjectStore(O,{keyPath:"id",autoIncrement:true});if(!d.objectStoreNames.contains(R)){let s=d.createObjectStore(R,{keyPath:"id",autoIncrement:true});s.createIndex("date","date");s.createIndex("patientId","patientId")}if(!d.objectStoreNames.contains(G)){let s=d.createObjectStore(G,{keyPath:"id",autoIncrement:true});s.createIndex("date","date");s.createIndex("patientId","patientId")}};q.onsuccess=()=>{db=q.result;res()};q.onerror=()=>rej(q.error)})}
function store(n,m="readonly"){return db.transaction(n,m).objectStore(n)}
function all(n){return new Promise((r,j)=>{let q=store(n).getAll();q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error)})}
function add(n,x){return new Promise((r,j)=>{let q=store(n,"readwrite").add(x);q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error)})}
function put(n,x){return new Promise((r,j)=>{let q=store(n,"readwrite").put(x);q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error)})}
function del(n,id){return new Promise((r,j)=>{let q=store(n,"readwrite").delete(id);q.onsuccess=()=>r();q.onerror=()=>j(q.error)})}
async function defaults(){if(!(await all(P)).length){let id=await add(P,{name:"Paciente principal"});localStorage.setItem("patientId",id)}if(!(await all(O)).length)await add(O,{name:"Yo"})}
function bind(){
$("newReading").onclick=()=>startQuick();
$("newGlucose").onclick=()=>startGlucose();
$("glucoseBack").onclick=()=>show("dashboard");
$("glucoseContinue").onclick=prepareGlucoseConfirmation;
$("glucoseConfirmEdit").onclick=()=>show("glucoseStart");
$("glucoseConfirmSave").onclick=saveGlucose;
$("clearGlucoseFilters").onclick=()=>{ $("glucoseFrom").value=""; $("glucoseTo").value=""; renderGlucoseHistory(); };
document.querySelectorAll(".glucose-timing").forEach(b=>b.onclick=()=>{document.querySelectorAll(".glucose-timing").forEach(x=>x.classList.remove("selected"));b.classList.add("selected")});
$("advancedReading").onclick=()=>{resetForm();show("formScreen")};
$("quickBack").onclick=()=>show("dashboard");
$("backDashboard").onclick=()=>show("dashboard");
$("quickContinue").onclick=prepareConfirmation;
$("confirmEdit").onclick=()=>show("quickStart");
$("confirmSave").onclick=saveQuick;
$("closeEmergency").onclick=()=>$("emergencyModal").classList.add("d-none");
document.querySelectorAll(".quick-choice").forEach(b=>b.onclick=()=>{document.querySelectorAll(".quick-choice").forEach(x=>x.classList.remove("selected"));b.classList.add("selected")});
$("changePatient").onclick=()=>show("patients");
$("readingForm").onsubmit=save;["fromDate","toDate","historyPatient"].forEach(id=>$(id).onchange=renderHistory);
$("clearFilters").onclick=()=>{["fromDate","toDate"].forEach(x=>$(x).value="");$("historyPatient").value="";renderHistory()};
["reportPatient","reportPeriod"].forEach(id=>$(id).onchange=renderReports);
$("addPatient").onclick=addPatient;$("addOperator").onclick=addOperator;$("exportBtn").onclick=exportData;$("importFile").onchange=importData;$("clearData").onclick=clearData;$("printReport").onclick=printReport;$("seniorMode").onchange=()=>localStorage.setItem("seniorMode",$("seniorMode").checked?"1":"0");
document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>show(b.dataset.screen));
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();installPrompt=e;$("installBtn").classList.remove("d-none")});
$("installBtn").onclick=async()=>{if(installPrompt){installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;$("installBtn").classList.add("d-none")}};
}
function show(id){screens.forEach(s=>$(s).classList.add("d-none"));$(id).classList.remove("d-none");document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.screen===id));if(id==="dashboard")renderDashboard();if(id==="history")renderHistory();if(id==="glucoseHistory")renderGlucoseHistory();if(id==="reports")renderReports();if(id==="patients")renderPeople();scrollTo({top:0,behavior:"smooth"})}
async function refresh(){await fillSelects();await renderDashboard();await renderHistory();await renderGlucoseHistory();await renderReports();await renderPeople()}
async function fillSelects(){let ps=(await all(P)).sort(nameSort),os=(await all(O)).sort(nameSort);let pid=Number(localStorage.getItem("patientId"))||ps[0]?.id;if(pid) localStorage.setItem("patientId",pid);
$("dashboardPatient").textContent=ps.find(x=>x.id===Number(pid))?.name||"—";
operatorMap=new Map(os.map(x=>[x.id,x.name]));$("operator").innerHTML='<option value="">Seleccione una persona</option>'+os.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join("");
let opts='<option value="">Todos</option>'+ps.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join("");$("historyPatient").innerHTML=opts;$("reportPatient").innerHTML=ps.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join("");$("historyPatient").value="";$("reportPatient").value=String(pid)}

async function startQuick(){
  await fillSelects();
  const pid=Number(localStorage.getItem("patientId"));
  $("quickPatient").innerHTML=(await all(P)).sort(nameSort).map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join("");
  $("quickPatient").value=String(pid);
  const ops=(await all(O)).sort(nameSort);
  $("quickOperator").innerHTML=ops.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join("");
  $("quickSystolic").value=""; $("quickDiastolic").value=""; $("quickPulse").value="";
  document.querySelectorAll(".quick-choice").forEach(x=>x.classList.toggle("selected",x.dataset.rest==="yes"));
  show("quickStart");
  setTimeout(()=>$("quickSystolic").focus(),150);
}
function prepareConfirmation(){
  const s=Number($("quickSystolic").value),d=Number($("quickDiastolic").value);
  if(!s||!d||s<50||s>300||d<30||d>200){toast("Revise los valores de presión.");return}
  const ps=Number($("quickPatient").value),op=Number($("quickOperator").value);
  const p=all(P),o=all(O);
  Promise.all([p,o]).then(([patients,ops])=>{
    const pn=patients.find(x=>x.id===ps)?.name||"—",on=ops.find(x=>x.id===op)?.name||"—";
    $("confirmPatient").textContent=`Paciente: ${pn}`;
    $("confirmPressure").textContent=`${s} / ${d} mmHg`;
    $("confirmPulse").textContent=$("quickPulse").value?`Pulso: ${$("quickPulse").value} lpm`:"Pulso: no registrado";
    $("confirmOperator").textContent=`Registró: ${on}`;
    const n=new Date();$("confirmTime").textContent=`${fmt(isoDate(n))} · ${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`;
    $("confirmStatus").innerHTML=statusBadge(s,d);
    if(s>=180||d>=120){$("emergencyText").textContent=`Se registró ${s}/${d} mmHg. Si al repetir correctamente la medición sigue en este nivel, especialmente con síntomas, busque atención médica inmediata.`;$("emergencyModal").classList.remove("d-none")}
    show("confirmScreen");
  });
}
async function saveQuick(){
  const n=new Date(),d=isoDate(n),t=`${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`;
  await add(R,{patientId:Number($("quickPatient").value),operatorId:Number($("quickOperator").value),systolic:Number($("quickSystolic").value),diastolic:Number($("quickDiastolic").value),pulse:$("quickPulse").value?Number($("quickPulse").value):null,date:d,time:t,dateTime:n.toISOString(),rested:document.querySelector(".quick-choice.selected")?.dataset.rest==="yes",medication:false,notes:"",createdAt:n.toISOString()});
  toast("✓ Medición guardada correctamente.");
  await refresh(); show("dashboard");
}

async function renderGlucoseDashboard(){
  const pid=Number(localStorage.getItem("patientId"));
  const gs=(await all(G)).filter(x=>x.patientId===pid).sort((a,b)=>b.dateTime.localeCompare(a.dateTime));
  if(!gs.length){$("lastGlucoseValue").textContent="Sin registros";$("lastGlucoseMeta").textContent="Registre una medición de azúcar.";return}
  const x=gs[0];
  $("lastGlucoseValue").textContent=`${x.value} mg/dL`;
  $("lastGlucoseMeta").textContent=`${x.timing} · ${operatorMap.get(x.operatorId)||"—"} · ${fmt(x.date)} · ${x.time}`;
}
async function renderDashboard(){
await renderGlucoseDashboard();
let pid=Number(localStorage.getItem("patientId")), rs=(await all(R)).filter(x=>x.patientId===pid).sort((a,b)=>b.dateTime.localeCompare(a.dateTime)),now=new Date(),today=isoDate(now),week=new Date(now-6*86400000);
$("todayCount").textContent=rs.filter(x=>x.date===today).length;$("weekCount").textContent=rs.filter(x=>new Date(x.date)>=new Date(week.toDateString())).length;
if(!rs.length){$("lastValue").textContent="Sin registros";$("lastMeta").textContent="Registre la primera medición.";$("lastStatus").innerHTML="";$("recentList").innerHTML='<div class="empty-state">Todavía no hay mediciones.</div>';drawTrend([]);return}
let last=rs[0],avg=average(rs.slice(0,7));$("avgValue").textContent=avg?`${avg.s}/${avg.d}`:"—";$("lastValue").textContent=`${last.systolic} / ${last.diastolic} mmHg`;$("lastMeta").textContent=`${operatorName(last.operatorId)} · ${fmt(last.date)} · ${last.time}`;$("lastStatus").innerHTML=statusBadge(last.systolic,last.diastolic);$("recentList").innerHTML=rs.slice(0,5).map(card).join("");bindDeletes();drawTrend(rs.slice(0,14).reverse())}
function average(rs){if(!rs.length)return null;return{s:Math.round(rs.reduce((a,x)=>a+x.systolic,0)/rs.length),d:Math.round(rs.reduce((a,x)=>a+x.diastolic,0)/rs.length)}}
function classify(s,d){if(s>=180||d>=120)return["Consulta urgente","danger"];if(s>=140||d>=90)return["Elevada","warning"];if(s>=130||d>=80)return["Por encima del rango de referencia","info"];return["Dentro del rango de referencia","success"]}
function statusBadge(s,d){let [t,c]=classify(s,d);return`<span class="badge text-bg-${c}">${t}</span>`}
function card(r){return`<div class="history-item"><div class="d-flex justify-content-between"><div><div class="history-value">${r.systolic}/${r.diastolic} <small>mmHg</small></div><div class="text-secondary">${esc(operatorName(r.operatorId))}</div></div><div class="text-end"><b>${fmt(r.date)}</b><div class="text-secondary">${r.time}</div></div></div>${r.pulse?`<div class="small mt-2">Pulso: <b>${r.pulse} lpm</b></div>`:""}<div class="mt-2">${statusBadge(r.systolic,r.diastolic)}</div>${r.notes?`<div class="small text-secondary mt-2">${esc(r.notes)}</div>`:""}<button class="btn btn-sm btn-outline-danger mt-3 delete-reading" data-id="${r.id}">Eliminar</button></div>`}
function bindDeletes(){document.querySelectorAll(".delete-reading").forEach(b=>b.onclick=async()=>{if(confirm("¿Eliminar esta medición?")){await del(R,Number(b.dataset.id));refresh()}})}
function drawTrend(rs){if(trendChart)trendChart.destroy();trendChart=new Chart($("trendChart"),{type:"line",data:{labels:rs.map(x=>fmtShort(x.date)),datasets:[{label:"Sistólica",data:rs.map(x=>x.systolic),tension:.3},{label:"Diastólica",data:rs.map(x=>x.diastolic),tension:.3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom"}},scales:{y:{beginAtZero:false}}}})}
async function save(e){e.preventDefault();let f=e.currentTarget;if(!f.checkValidity()||!$("operator").value){f.classList.add("was-validated");return}let d=$("date").value,t=$("time").value;await add(R,{patientId:Number(localStorage.getItem("patientId")),operatorId:Number($("operator").value),systolic:+$("systolic").value,diastolic:+$("diastolic").value,pulse:$("pulse").value?+$("pulse").value:null,date:d,time:t,dateTime:new Date(`${d}T${t}`).toISOString(),rested:$("rested").checked,medication:$("medication").checked,notes:$("notes").value.trim(),createdAt:new Date().toISOString()});toast("Medición guardada.");show("dashboard");refresh()}
function resetForm(){let n=new Date();$("readingForm").reset();$("date").value=isoDate(n);$("time").value=String(n.getHours()).padStart(2,"0")+":"+String(n.getMinutes()).padStart(2,"0");$("rested").checked=true}

async function startGlucose(){
  await fillSelects();
  const ps=await all(P), os=await all(O), pid=Number(localStorage.getItem("patientId"));
  $("glucosePatient").innerHTML=ps.sort(nameSort).map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join("");
  $("glucosePatient").value=String(pid);
  $("glucoseOperator").innerHTML=os.sort(nameSort).map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join("");
  $("glucoseValue").value="";
  document.querySelectorAll(".glucose-timing").forEach(x=>x.classList.toggle("selected",x.dataset.timing==="Ayunas"));
  show("glucoseStart");setTimeout(()=>$("glucoseValue").focus(),150);
}
function prepareGlucoseConfirmation(){
  const v=Number($("glucoseValue").value);
  if(!v||v<20||v>1000){toast("Revise el valor del glucómetro.");return}
  Promise.all([all(P),all(O)]).then(([ps,os])=>{
    const p=ps.find(x=>x.id===Number($("glucosePatient").value)),o=os.find(x=>x.id===Number($("glucoseOperator").value)),n=new Date();
    $("glucoseConfirmPatient").textContent=`Paciente: ${p?.name||"—"}`;
    $("glucoseConfirmValue").textContent=`${v} mg/dL`;
    $("glucoseConfirmTiming").innerHTML=`<span class="badge text-bg-secondary">${esc(document.querySelector(".glucose-timing.selected")?.dataset.timing||"")}</span>`;
    $("glucoseConfirmOperator").textContent=`Registró: ${o?.name||"—"}`;
    $("glucoseConfirmTime").textContent=`${fmt(isoDate(n))} · ${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`;
    show("glucoseConfirm");
  });
}
async function saveGlucose(){
  const n=new Date();
  await add(G,{patientId:Number($("glucosePatient").value),operatorId:Number($("glucoseOperator").value),value:Number($("glucoseValue").value),timing:document.querySelector(".glucose-timing.selected")?.dataset.timing||"Otro momento",date:isoDate(n),time:`${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`,dateTime:n.toISOString(),createdAt:n.toISOString()});
  toast("✓ Medición de azúcar guardada.");await refresh();show("dashboard");
}
async function renderGlucoseHistory(){
  if(!$("glucoseHistoryList"))return;
  const pid=Number(localStorage.getItem("patientId")),from=$("glucoseFrom").value,to=$("glucoseTo").value;
  const rs=(await all(G)).filter(x=>x.patientId===pid&&(!from||x.date>=from)&&(!to||x.date<=to)).sort((a,b)=>b.dateTime.localeCompare(a.dateTime));
  $("glucoseHistoryList").innerHTML=rs.length?rs.map(x=>`<div class="history-item"><div class="d-flex justify-content-between"><div><div class="history-value">${x.value} <small>mg/dL</small></div><div class="text-secondary">${esc(x.timing)}</div></div><div class="text-end"><b>${fmt(x.date)}</b><div class="text-secondary">${x.time}</div></div></div><div class="small mt-2">Registró: ${esc(operatorMap.get(x.operatorId)||"—")}</div><button class="btn btn-sm btn-outline-danger mt-3 delete-glucose" data-id="${x.id}">Eliminar</button></div>`).join(""):'<div class="empty-state">No hay mediciones de azúcar.</div>';
  document.querySelectorAll(".delete-glucose").forEach(b=>b.onclick=async()=>{if(confirm("¿Eliminar esta medición?")){await del(G,+b.dataset.id);refresh()}});
}
async function renderHistory(){let pid=Number(localStorage.getItem("patientId")),from=$("fromDate").value,to=$("toDate").value,fp=$("historyPatient").value;let rs=(await all(R)).filter(x=>(!fp?x.patientId===pid:x.patientId===Number(fp))&&(!from||x.date>=from)&&(!to||x.date<=to)).sort((a,b)=>b.dateTime.localeCompare(a.dateTime));$("historyList").innerHTML=rs.length?rs.map(card).join(""):'<div class="empty-state">No hay mediciones con estos filtros.</div>';bindDeletes()}
async function renderReports(){let pid=Number($("reportPatient").value||localStorage.getItem("patientId")),days=+$("reportPeriod").value||30,end=new Date(),start=new Date(end-days*86400000),rs=(await all(R)).filter(x=>x.patientId===pid&&new Date(x.date)>=start);let av=average(rs);$("rAvg").textContent=av?`${av.s}/${av.d}`:"—";$("rCount").textContent=rs.length;let c={normal:0,above:0,high:0};rs.forEach(x=>{let z=classify(x.systolic,x.diastolic)[1];if(z==="success")c.normal++;else if(z==="warning"||z==="info")c.above++;else c.high++});if(catChart)catChart.destroy();catChart=new Chart($("categoryChart"),{type:"doughnut",data:{labels:["Dentro de referencia","Por encima","Muy elevada"],datasets:[{data:[c.normal,c.above,c.high]}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:"bottom"}}}})}
async function renderPeople(){let ps=(await all(P)).sort(nameSort),os=(await all(O)).sort(nameSort);$("patientList").innerHTML=ps.map(x=>`<div class="history-item d-flex justify-content-between align-items-center"><b>${esc(x.name)}</b><button class="btn btn-outline-primary select-patient" data-id="${x.id}">Usar</button></div>`).join("");document.querySelectorAll(".select-patient").forEach(b=>b.onclick=()=>{localStorage.setItem("patientId",b.dataset.id);refresh();show("dashboard")});$("operatorList").innerHTML=os.map(x=>`<div class="person-row"><span>${esc(x.name)}</span><button class="btn btn-sm btn-outline-danger del-op" data-id="${x.id}">Eliminar</button></div>`).join("");document.querySelectorAll(".del-op").forEach(b=>b.onclick=async()=>{if(confirm("¿Eliminar esta persona?")){await del(O,+b.dataset.id);refresh()}})}
async function addPatient(){let n=$("newPatient").value.trim();if(!n)return toast("Ingrese un nombre.");await add(P,{name:n});$("newPatient").value="";refresh()}
async function addOperator(){let n=$("newOperator").value.trim();if(!n)return toast("Ingrese un nombre.");await add(O,{name:n});$("newOperator").value="";refresh()}
async function exportData(){let payload={app:"Mi Presión Pro",version:2,exportedAt:new Date().toISOString(),patients:await all(P),operators:await all(O),readings:await all(R),glucose:await all(G)};let b=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=`mi-presion-respaldo-${isoDate(new Date())}.json`;a.click();URL.revokeObjectURL(a.href);toast("Respaldo exportado.")}
async function importData(e){let f=e.target.files[0];if(!f)return;try{let x=JSON.parse(await f.text());for(let p of x.patients||[])await put(P,p);for(let o of x.operators||[])await put(O,o);for(let r of x.readings||[])await put(R,r);for(let g of x.glucose||[])await put(G,g);refresh();toast("Respaldo importado.")}catch{toast("Respaldo inválido.")}e.target.value=""}
async function clearData(){if(!confirm("Esta acción eliminará todos los datos. ¿Continuar?"))return;for(let n of [P,O,R,G])for(let x of await all(n))await del(n,x.id);localStorage.clear();await defaults();refresh();toast("Datos eliminados.")}
async function printReport(){let pid=Number($("reportPatient").value),p=(await all(P)).find(x=>x.id===pid),rs=(await all(R)).filter(x=>x.patientId===pid).sort((a,b)=>b.dateTime.localeCompare(a.dateTime));let w=open("","_blank");w.document.write(`<html><head><title>Informe de presión</title><style>body{font-family:Arial;padding:30px}table{width:100%;border-collapse:collapse}th,td{padding:8px;border:1px solid #ddd}h1{color:#0d6efd}</style></head><body><h1>Informe de presión sanguínea</h1><h2>${esc(p?.name||"")}</h2><p>Generado: ${new Date().toLocaleString()}</p><table><tr><th>Fecha</th><th>Hora</th><th>Presión</th><th>Pulso</th><th>Registró</th></tr>${rs.map(x=>`<tr><td>${fmt(x.date)}</td><td>${x.time}</td><td>${x.systolic}/${x.diastolic} mmHg</td><td>${x.pulse||""}</td><td>${esc(operatorName(x.operatorId))}</td></tr>`).join("")}</table></body></html>`);w.document.close();w.print()}
async function operatorName(id){return operatorMap.get(id)||"—"}
function nameSort(a,b){return a.name.localeCompare(b.name)}
function isoDate(d){return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function fmt(v){let[a,b,c]=v.split("-");return`${c}/${b}/${a}`}
function fmtShort(v){let[a,b,c]=v.split("-");return`${c}/${b}`}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function toast(m){let id="t"+Date.now();$("toastContainer").insertAdjacentHTML("beforeend",`<div id="${id}" class="toast show"><div class="toast-body">${esc(m)}</div></div>`);setTimeout(()=>$(id)?.remove(),2500)}
function registerSW(){if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js")}
