// HERO: a playable deck of fiscal philosophies with live, comparable consequences.
const SCENARIOS=[
 {id:'austerity',number:'01',name:'Austerity budget',tag:'Shrink the state',colour:'#a45a40',brief:'Reduce most departmental budgets, switch pensions to earnings and use the savings to cut borrowing.',spend:{health:-.06,social:-.08,education:-.10,defence:-.04,economic:-.12,order:-.08,housing:-.18,environment:-.18,culture:-.20,aid:-.25,general:-.10},tax:{},pension:'earnings'},
 {id:'welfare',number:'02',name:'Social-welfare budget',tag:'Stronger safety net',colour:'#a06caf',brief:'Expand health, housing and social protection, funded by broader income, company and consumption-tax receipts.',spend:{health:.10,social:.14,education:.05,housing:.30,aid:.10},tax:{tax16:.06,tax20:.10,tax2:.04,tax17:.08},pension:'triple'},
 {id:'militarist',number:'03',name:'Militarist budget',tag:'Defence-first state',colour:'#65788e',brief:'Build a permanently larger defence budget, funded by service transfers, a smaller aid budget and some borrowing.',spend:{defence:.55,order:.12,economic:.06,aid:-.45,culture:-.20,environment:-.10,education:-.05,general:-.05},tax:{tax2:.025},pension:'earnings'},
 {id:'capitalist',number:'04',name:'Extreme-capitalist budget',tag:'Low tax, small state',colour:'#c58a2d',brief:'Cut major taxes and social spending sharply while protecting economic investment. A stylised package, not a manifesto.',spend:{social:-.22,health:-.10,education:-.12,housing:-.30,aid:-.45,culture:-.30,environment:-.22,order:-.08,general:-.15,economic:.08},tax:{tax20:-.25,tax16:-.10,tax27:-.10,tax2:-.08,tax17:-.12},pension:'earnings'},
 {id:'socialist',number:'05',name:'Socialist budget',tag:'Universal services',colour:'#c55858',brief:'Expand health, education, housing and welfare, funded by materially higher income and company-tax receipts.',spend:{health:.18,social:.20,education:.18,housing:.55,economic:.12,environment:.20,culture:.12,aid:.15},tax:{tax16:.14,tax17:.20,tax20:.28,tax27:.08,tax2:.04},pension:'triple'},
 {id:'science',number:'06',name:'Science & education first',tag:'Long-run capacity',colour:'#4376c5',brief:'Prioritise education, research-linked economic investment and health, with smaller cuts elsewhere and higher company receipts.',spend:{education:.30,economic:.28,health:.06,defence:-.08,order:-.05,culture:-.05,general:-.06,aid:-.10},tax:{tax20:.12,tax17:.05},pension:'earnings'},
 {id:'war',number:'07',name:'War budget',tag:'Emergency mobilisation',colour:'#913d36',brief:'A temporary-looking but annually repeated mobilisation: defence, security and logistics surge, financed mainly through tax and debt.',spend:{defence:1.20,order:.25,economic:.20,health:.04,aid:-.50,culture:-.35,environment:-.20,housing:-.15},tax:{tax2:.08,tax16:.05,tax20:.08},pension:'earnings'}
];
let scenarioChoice=null;
function scenarioPolicy(s,d=datum()){
 const base=baseSpending(d),p=emptyPolicy();
 for(const[k,share]of Object.entries(s.spend))p.spend[k]=base[k]*share;
 const receipts=inputs(d,p).revenues,reference=DATA.find(x=>x.year===2024),referenceReceipts=inputs(reference,emptyPolicy()).revenues;let fallback=0;
 for(const[k,share]of Object.entries(s.tax)){
  const item=receipts.find(r=>r.id===k),referenceItem=referenceReceipts.find(r=>r.id===k);
  if(item)p.tax[k]=item.value*share;
  else if(referenceItem)fallback+=d.receipts*(referenceItem.value*share/reference.receipts);
 }
 if(fallback)p.tax.aggregate=fallback;
 return p;
}
function scenarioStats(s){
 const d=datum(),p=scenarioPolicy(s,d),years=10,opts={...settings,pension:s.pension,hidden:0};
 const rows=simulate(d,p,opts,years),base=simulate(d,emptyPolicy(),{...settings,pension:'triple',hidden:0},years),now=inputs(d,p),end=rows.at(-1),control=base.at(-1);
 return {p,rows,base,receipts:now.revenue-d.receipts,spending:now.total-d.spending,borrowing:(now.total-now.revenue)-(d.spending-d.receipts),debt:end.debt/end.gdp*100,baseDebt:control.debt/control.gdp*100,gdp:(end.realGdp/end.population/(control.realGdp/control.population)-1)*100,inflation:end.inflation-control.inflation};
}
function renderScenarios(){
 const el=$('#scenarioDeck');if(!el)return;
 el.innerHTML=`<div class="scenario-head"><div><div class="eyebrow">READY-MADE SIMULATIONS</div><h2>Seven ways to run Britain.</h2><p>Fictional packages for exploring trade-offs. Select one to inspect it before applying.</p></div><div class="scenario-tools"><button id="shuffleScenario">⤨ Draw a random brief</button><span>10-year comparison</span></div></div><div class="scenario-rail">${SCENARIOS.map(s=>`<button class="scenario-card ${scenarioChoice===s.id?'active':''}" data-scenario="${s.id}" style="--scenario:${s.colour}"><span class="scenario-number">${s.number}</span><span class="scenario-tag">${s.tag}</span><strong>${s.name}</strong><span>${s.brief}</span><i>Inspect package →</i></button>`).join('')}</div><div id="scenarioPreview"></div>`;
 $$('[data-scenario]').forEach(card=>card.onclick=()=>{scenarioChoice=card.dataset.scenario;renderScenarios();openScenarioPreview(scenarioChoice);});
 $('#shuffleScenario').onclick=()=>{const choices=SCENARIOS.filter(s=>s.id!==scenarioChoice),s=choices[Math.floor(Math.random()*choices.length)];scenarioChoice=s.id;renderScenarios();openScenarioPreview(s.id);$('#scenarioPreview').scrollIntoView({behavior:'smooth',block:'nearest'});};
 if(scenarioChoice)openScenarioPreview(scenarioChoice);
}
function scenarioPolicyLines(s,stats){
 const d=datum(),spend=Object.entries(stats.p.spend).filter(([,v])=>Math.abs(v)>.01).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]));
 const taxes=Object.entries(stats.p.tax).filter(([,v])=>Math.abs(v)>.01).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]));
 return `<div class="scenario-lines"><div><b>Spending</b>${spend.map(([k,v])=>`<span class="${v>0?'up':'down'}">${esc(SECTORS.find(x=>x[0]===k)[1])}<strong>${signed(v)}</strong></span>`).join('')}</div><div><b>Receipts</b>${taxes.length?taxes.map(([k,v])=>{const item=inputs(d,emptyPolicy()).revenues.find(x=>x.id===k);return `<span class="${v>0?'up':'down'}">${esc(shortName(item.name))}<strong>${signed(v)}</strong></span>`;}).join(''):'<span>No direct tax changes</span>'}<span class="rule">Pension uprating<strong>${s.pension==='earnings'?'Earnings':'Triple lock'}</strong></span></div></div>`;
}
function openScenarioPreview(id){
 const s=SCENARIOS.find(x=>x.id===id),stats=scenarioStats(s),el=$('#scenarioPreview');if(!el)return;
 el.innerHTML=`<div class="scenario-detail" style="--scenario:${s.colour}"><div class="scenario-title"><span>${s.number}</span><div><div class="eyebrow">SIMULATION BRIEF · ${fy(year)}</div><h3>${s.name}</h3><p>${s.brief}</p></div><button id="closeScenario" aria-label="Close scenario preview">×</button></div>${scenarioPolicyLines(s,stats)}<div class="scenario-outcomes"><div><span>Immediate borrowing</span><strong>${signed(stats.borrowing)}</strong><small>per year</small></div><div><span>Debt / GDP</span><strong>${fmt(stats.debt)}%</strong><small>${fmt(stats.debt-stats.baseDebt,1)} pp vs unchanged</small></div><div><span>Real GDP / person</span><strong>${fmt(stats.gdp,2)}%</strong><small>vs unchanged</small></div><div><span>Final-year inflation</span><strong>${fmt(stats.inflation,2)} pp</strong><small>vs unchanged</small></div></div><div class="scenario-actions"><p>Illustrative package. Tax controls change receipt yields, not statutory rates. Repeating annual emergency spending for ten years can exaggerate a temporary policy.</p><button id="applyScenario" class="primary">Apply & simulate 10 years →</button></div></div>`;
 $('#closeScenario').onclick=()=>{scenarioChoice=null;renderScenarios();};
 $('#applyScenario').onclick=()=>{policy=stats.p;policy.funding=[];settings={...settings,pension:s.pension,hidden:0};horizon=10;result=stats.rows;baseline=stats.base;$('#run').textContent='▶ Run 10 years';render();showView('outlook');toast(`${s.name} applied · 10 years simulated`);};
}
