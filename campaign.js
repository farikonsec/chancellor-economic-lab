// Guided quarterly campaign, target adviser, short manual and universal button help.
let campaignState=null,campaignStart=null,campaignMission=null,campaignTargets=null,campaignResponses=[];

const MISSION_TARGETS={
 sandbox:{growth:1.5,inflation:3,unemployment:6,debt:105},
 recovery:{growth:1.8,inflation:3.5,unemployment:6,debt:105},
 stability:{growth:1.3,inflation:3,unemployment:6.5,debt:95},
 resilience:{growth:1.4,inflation:3.5,unemployment:7,debt:110}
};

const EVENT_CHOICES={
 'global-downturn':[
  {name:'Accelerate investment',detail:'Spend £12bn on shovel-ready transport, housing and energy projects.',effect:{spend:12,gap:.16,supply:.04,confidence:2}},
  {name:'Temporary tax relief',detail:'Return £6bn to households for one year.',effect:{tax:-6,gap:.12,household:-2}},
  {name:'Hold the line',detail:'Protect the fiscal position and allow automatic stabilisers to work.',effect:{confidence:1}}
 ],
 'energy-crunch':[
  {name:'Targeted household support',detail:'Direct £12bn to households under the greatest pressure.',effect:{spend:12,transfer:12,inflation:-.08,household:-5,confidence:2}},
  {name:'Universal price cap',detail:'Spend £30bn suppressing bills now, with greater fiscal exposure.',effect:{spend:30,transfer:12,inflation:-.28,household:-8,confidence:-2}},
  {name:'Windfall levy and support',detail:'Raise £8bn from producers and spend £6bn on targeted relief.',effect:{tax:8,spend:6,transfer:6,inflation:-.05,household:-3,confidence:1}}
 ],
 'credit-seizure':[
  {name:'Capital backstop',detail:'Commit £10bn to preserve lending and stabilise confidence.',effect:{spend:10,bank:-15,confidence:7}},
  {name:'Funding guarantees',detail:'Guarantee eligible funding with a smaller expected fiscal cost.',effect:{spend:3,bank:-9,confidence:5}},
  {name:'No intervention',detail:'Avoid public exposure and accept a sharper credit contraction.',effect:{bank:5,confidence:-5}}
 ],
 'trade-disruption':[
  {name:'Support exporters',detail:'Spend £6bn on logistics, working capital and market access.',effect:{spend:6,gap:.08,supply:.02,confidence:2}},
  {name:'Cut border charges',detail:'Forgo £3bn of receipts to reduce immediate trade friction.',effect:{tax:-3,inflation:-.05,confidence:1}},
  {name:'Absorb the shock',detail:'Keep the Budget unchanged.',effect:{}}
 ],
 'housing-correction':[
  {name:'Target mortgage support',detail:'Spend £5bn on temporary, means-tested support.',effect:{spend:5,household:-7,confidence:2}},
  {name:'Build through the downturn',detail:'Add £10bn of housing investment and construction capacity.',effect:{spend:10,supply:.035,gap:.09,confidence:3}},
  {name:'Protect the balance sheet',detail:'Keep fiscal space available for a deeper emergency.',effect:{confidence:1}}
 ],
 'productivity-breakthrough':[
  {name:'Co-invest with industry',detail:'Add £8bn for research, skills and infrastructure.',effect:{spend:8,supply:.07,confidence:4}},
  {name:'Bank the dividend',detail:'Allow stronger receipts to improve the debt path.',effect:{tax:3,confidence:3}},
  {name:'Reduce business taxes',detail:'Return £5bn to firms to encourage faster adoption.',effect:{tax:-5,supply:.035,confidence:2}}
 ],
 'investment-wave':[
  {name:'Remove capacity bottlenecks',detail:'Invest £7bn in skills, planning and grid connections.',effect:{spend:7,supply:.06,confidence:3}},
  {name:'Rebuild fiscal space',detail:'Use stronger activity to reduce borrowing.',effect:{tax:2,confidence:3}},
  {name:'Let markets lead',detail:'Make no immediate fiscal change.',effect:{confidence:1}}
 ]
};

function resetQuarterlyCampaign(){campaignState=null;campaignStart=null;campaignMission=null;campaignTargets=null;campaignResponses=[];}
function campaignLength(){return Math.max(20,(MISSIONS.find(x=>x.id===activeMission)?.years||5)*4);}
function campaignEnsure(){
 if(!campaignState||campaignMission!==activeMission||campaignStart?.year!==year){campaignMission=activeMission;campaignTargets={...(MISSION_TARGETS[activeMission]||MISSION_TARGETS.sandbox),termQuarters:campaignLength()};campaignStart=quarterlyInitial(datum(),settings,activeMission);campaignState={...campaignStart};campaignResponses=[];}
 return campaignState;
}
function campaignTone(value,good,warning){return good(value)?'good':warning(value)?'warn':'bad';}
function campaignArrow(value,base){const d=value-base;if(Math.abs(d)<.02)return'→';return d>0?'↑':'↓';}
function campaignMetric(id,label,value,suffix,tone,arrow,note){return `<button class="nation-card ${tone}" data-national="${id}"><span>${label}</span><strong>${fmt(value,1)}${suffix} <i>${arrow}</i></strong><small>${note} · tap to explain</small></button>`;}
function renderCampaign(){
 const root=$('#campaignDesk');if(!root)return;const s=campaignEnsure(),start=campaignStart,out=quarterlyScore(s,start,campaignTargets),total=campaignLength(),progress=Math.min(100,s.quarter/total*100),debt=s.debt/s.gdp*100;
 const metrics=[
  campaignMetric('growth','Living standards',s.growth,'%',campaignTone(s.growth,x=>x>=1.5,x=>x>=.5),campaignArrow(s.growth,start.growth),s.growth>=1.5?'Real growth is supporting incomes.':'Weak growth is squeezing incomes.'),
  campaignMetric('inflation','Prices',s.inflation,'%',campaignTone(s.inflation,x=>x>=1&&x<=3,x=>x<=5),campaignArrow(s.inflation,start.inflation),`Target ${fmt(settings.inflationTarget,1)}%.`),
  campaignMetric('jobs','Jobs',s.unemployment,'%',campaignTone(s.unemployment,x=>x<5.5,x=>x<8),campaignArrow(s.unemployment,start.unemployment),'Unemployment rate proxy.'),
  campaignMetric('debt','Public debt',debt,'%',campaignTone(debt,x=>x<=campaignTargets.debt,x=>x<=campaignTargets.debt+15),campaignArrow(debt,start.debt/start.gdp*100),'Share of annual GDP.'),
  campaignMetric('confidence','Trust',s.marketConfidence,'',campaignTone(s.marketConfidence,x=>x>=70,x=>x>=45),campaignArrow(s.marketConfidence,start.marketConfidence),'Market-confidence index.')
 ];
 const goalRows=[['Growth',s.growth,campaignTargets.growth,'≥','%'],['Inflation',s.inflation,campaignTargets.inflation,'≤','%'],['Unemployment',s.unemployment,campaignTargets.unemployment,'≤','%'],['Debt',debt,campaignTargets.debt,'≤','%']].map(([name,v,t,op,u])=>{const met=op==='≥'?v>=t:v<=t;return `<span class="goal-chip ${met?'met':'miss'}"><i>${met?'✓':'•'}</i>${name} ${op} ${fmt(t,1)}${u}</span>`}).join('');
 const dots=Array.from({length:total},(_,i)=>`<i class="${i<s.quarter?'past':i===s.quarter?'now':''}" title="Quarter ${i+1}"></i>`).join('');
 const verdict=out.lost?`<div class="campaign-verdict lost"><b>Government falls</b><span>A systemic crisis or a score below 250 has ended your term.</span><button id="campaignRestart">Try again</button></div>`:out.won?`<div class="campaign-verdict won"><b>You win the election</b><span>You completed the brief and kept the economy resilient.</span><button id="campaignRestart">Start another term</button></div>`:s.quarter>=total?`<div class="campaign-verdict missed"><b>Mandate missed</b><span>The country survived, but one or more targets were missed.</span><button id="campaignRestart">Try again</button></div>`:'';
 root.innerHTML=`<div class="campaign-top"><div><div class="eyebrow">GUIDED TERM · ${s.quarter?`YEAR ${Math.ceil(s.quarter/4)} · Q${s.q}`:'READY ROOM'}</div><h2>${s.quarter?'The country is responding.':'Your first 60 seconds.'}</h2><p>${s.quarter?s.news[0]:'Choose a brief, build one budget change, then advance a quarter. The Bank of England and the economy react automatically.'}</p></div><div class="campaign-score"><span>SCORE</span><strong>${s.quarter?out.score:500}</strong><small>/ 1,000</small></div></div>${verdict}<div class="nation-grid">${metrics.join('')}</div><div class="campaign-goals"><div><b>Your finish line</b>${goalRows}</div><button id="editTargets">Set targets</button></div><div class="term-track"><div><span>TERM PROGRESS</span><b>${s.quarter} / ${total} quarters</b></div><div class="quarter-dots">${dots}</div><span style="width:${progress}%"></span></div><div class="campaign-actions"><button id="buildBudget">01 · Build the Budget</button><button id="askAdviser">02 · Ask the adviser</button><button id="advanceQuarter" class="primary" ${out.lost||out.won||s.quarter>=total?'disabled':''}>${s.quarter?'Advance one quarter →':'Start the clock →'}</button></div><div class="campaign-news"><b>${s.lastShock?'LATEST EVENT':'CABINET NOTE'}</b><span>${s.news[0]}</span>${s.lastShock?`<em>${s.lastShock.kind.toUpperCase()} SHOCK</em>`:'<em>QUARTERLY MODEL</em>'}</div><button id="openTreasuryLab" class="campaign-lab-link">Open the detailed Treasury Lab ↓</button>`;
 root.querySelectorAll('[data-national]').forEach(b=>b.onclick=()=>openNationalIndicator(b.dataset.national));
 $('#buildBudget').onclick=()=>{$('#budgetView').scrollIntoView({behavior:'smooth',block:'start'});toast('Select any receipt or spending card to change it');};
 $('#askAdviser').onclick=openCampaignAdviser;$('#editTargets').onclick=openTargetPlanner;$('#advanceQuarter').onclick=advanceCampaignQuarter;$('#openTreasuryLab').onclick=()=>$('#economicExplorer').scrollIntoView({behavior:'smooth'});
 if($('#campaignRestart'))$('#campaignRestart').onclick=()=>{resetQuarterlyCampaign();render();toast('A new term is ready');};
 refreshButtonTips();
}

function openNationalIndicator(id){const s=campaignEnsure(),debt=s.debt/s.gdp*100,content={
 growth:['Living standards & growth',`${fmt(s.growth,1)}% annualised`,`Potential growth is ${fmt(s.potentialGrowth,1)}%. The output gap is ${fmt(s.outputGap,1)}%. Fiscal demand, real interest rates, credit stress and active shocks move actual growth around capacity.`],
 inflation:['Prices',`${fmt(s.inflation,1)}% annual inflation`,`Inflation responds to spare capacity, imported prices, sterling and supply shocks. The Bank Rate proxy reacts gradually toward the ${fmt(settings.inflationTarget,1)}% target.`],
 jobs:['Jobs',`${fmt(s.unemployment,1)}% unemployment`,`An Okun-style relationship makes unemployment fall when growth exceeds potential and rise during prolonged weakness. Financial shocks can make the adjustment worse.`],
 debt:['Public debt',`${fmt(debt,1)}% of GDP`,`Debt changes with quarterly borrowing. Interest costs reprice gradually, while weak growth increases the ratio's denominator pressure. The current new-debt risk premium is ${fmt(s.riskPremium,2)} percentage points.`],
 confidence:['Market trust',`${fmt(s.marketConfidence,1)} / 100`,`Confidence falls when borrowing, inflation, financial stress and the debt-risk premium rise. Low confidence then raises gilt costs, creating a feedback into debt interest.`]
}[id];if(!content)return;modal(`<div class="eyebrow">WHY DID IT MOVE?</div><h2>${content[0]}</h2><div class="big-edit">${content[1]}</div><p>${content[2]}</p><div class="info">Latest quarter: Bank Rate ${fmt(s.bankRate,2)}% · sterling index ${fmt(s.sterlingIndex,1)} · bank stress ${fmt(s.bankStress,1)} · household stress ${fmt(s.householdStress,1)}.</div><button class="wide" id="indicatorMethods">Read the equations</button>`);$('#indicatorMethods').onclick=methodsInfo;refreshButtonTips();}

function advanceCampaignQuarter(){
 const state=campaignEnsure(),next=state.quarter+1,event=scheduledQuarterlyShock(activeMission,next,settings.seed,settings.shockMode==='events');
 if(event){openShockDecision(event);return;}
 commitCampaignQuarter(null,{});
}
function commitCampaignQuarter(event,effect){
 campaignState=quarterlyStep(campaignState,datum(),qCopyPolicy(policy),settings,{shock:event,response:effect});
 if(event)campaignResponses.push({quarter:campaignState.quarter,event:event.name,choice:effect.choice||'Response selected'});
 renderCampaign();
 const out=quarterlyScore(campaignState,campaignStart,campaignTargets);
 if(out.lost)toast('Systemic crisis — your government has fallen');else if(out.won)toast('You completed the brief and won the term');else toast(`Quarter ${campaignState.quarter} complete · score ${out.score}`);
}
function openShockDecision(event){
 const choices=EVENT_CHOICES[event.id]||[{name:'Continue',detail:'Allow the economy to adjust.',effect:{}}];
 modal(`<div class="shock-modal ${event.kind}"><div class="shock-siren">${event.kind==='positive'?'OPPORTUNITY':'ECONOMIC SHOCK'} · ${event.kind.toUpperCase()}</div><h2>${event.name}</h2><p>${event.strap}</p><div class="shock-transmission"><span>Growth ${event.growth>=0?'+':''}${fmt(event.growth,1)}pp</span><span>Inflation ${event.inflation>=0?'+':''}${fmt(event.inflation,1)}pp</span><span>Duration ≈ ${event.duration} quarters</span></div><h3>Cabinet needs a decision.</h3><div class="shock-choices">${choices.map((c,i)=>`<button data-shock-choice="${i}"><b>${esc(c.name)}</b><span>${esc(c.detail)}</span><em>Choose →</em></button>`).join('')}</div><p class="fine">The displayed shock is a coherent educational stress scenario, not a forecast. Effects fade over time and interact with your existing economy.</p></div>`);
 $$('#drawer [data-shock-choice]').forEach(b=>b.onclick=()=>{const c=choices[+b.dataset.shockChoice];$('#drawer').close();commitCampaignQuarter(event,{...c.effect,choice:c.name});});refreshButtonTips();
}

function openHowToPlay(){
 modal(`<div class="manual"><div class="eyebrow">60-SECOND MANUAL</div><h2>Run Britain in five moves.</h2><ol><li><b>Choose a brief.</b><span>Each mission has a different economy and finish line.</span></li><li><b>Build a Budget.</b><span>Change a tax or service. Every pound must come from tax, another service or borrowing.</span></li><li><b>Check the preview.</b><span>Green helps that measure; red worsens it; amber signals risk.</span></li><li><b>Advance a quarter.</b><span>Growth, prices, jobs, debt, sterling and confidence respond over time.</span></li><li><b>Handle shocks.</b><span>Make Cabinet decisions and finish the term with every target met.</span></li></ol><div class="manual-win"><b>WIN</b><span>Complete the brief, avoid systemic crisis and finish with your targets met.</span><b>LOSE</b><span>Your score falls below 250 or inflation, debt, confidence or banking stress reaches crisis level.</span></div><div class="info">The Bank of England reacts automatically. Forecasts are ranges from an educational model; historical figures and modelled outcomes are labelled separately.</div><button class="primary wide" id="manualStart">Take office →</button><button class="wide" id="manualMethods">How the model works</button></div>`);
 $('#manualStart').onclick=()=>{$('#drawer').close();$('#missionControl').scrollIntoView({behavior:'smooth'});};$('#manualMethods').onclick=methodsInfo;refreshButtonTips();
}

function openTargetPlanner(){const t=campaignTargets||MISSION_TARGETS.sandbox;
 modal(`<div class="eyebrow">WHAT DOES SUCCESS MEAN?</div><h2>Set your finish line.</h2><p>The adviser will look for packages that move toward all four targets. Demanding combinations may be infeasible.</p>${[['growth','Real growth at least',-2,6,.1,'%'],['inflation','Inflation no more than',0,15,.1,'%'],['unemployment','Unemployment no more than',2,15,.1,'%'],['debt','Debt/GDP no more than',50,180,1,'%']].map(([k,l,min,max,step,u])=>`<label for="target-${k}">${l}<span class="setting-value" id="target-value-${k}">${fmt(t[k],1)}${u}</span></label><input id="target-${k}" type="range" min="${min}" max="${max}" step="${step}" value="${t[k]}">`).join('')}<button id="saveTargets" class="primary wide">Use these targets</button>`);
 ['growth','inflation','unemployment','debt'].forEach(k=>{$('#target-'+k).oninput=e=>$('#target-value-'+k).textContent=fmt(+e.target.value,1)+'%';});$('#saveTargets').onclick=()=>{campaignTargets={...Object.fromEntries(['growth','inflation','unemployment','debt'].map(k=>[k,+$('#target-'+k).value])),termQuarters:campaignLength()};$('#drawer').close();renderCampaign();toast('Your finish line has been updated');};refreshButtonTips();}

function candidatePolicy(changes){const p=qCopyPolicy(policy);for(const[k,v]of Object.entries(changes.spend||{}))p.spend[k]=(p.spend[k]||0)+v;for(const[k,v]of Object.entries(changes.tax||{}))p.tax[k]=(p.tax[k]||0)+v;return p;}
function adviceFit(r,t){const debt=r.debt/r.gdp*100,miss=Math.max(0,t.growth-r.growth)*12+Math.max(0,r.inflation-t.inflation)*10+Math.max(0,r.unemployment-t.unemployment)*9+Math.max(0,debt-t.debt)*2;return Math.max(0,Math.round(100-miss));}
function openCampaignAdviser(){
 const d=datum(),t=campaignTargets||MISSION_TARGETS.sandbox,has=id=>d.taxes.some(x=>x.id===id),aggregate=d.taxes[0]?.id||'aggregate',paye=has('tax16')?'tax16':aggregate,company=has('tax20')?'tax20':aggregate,vat=has('tax2')?'tax2':aggregate,levies=(...pairs)=>pairs.reduce((a,[k,v])=>(a[k]=(a[k]||0)+v,a),{}),candidates=[
  {id:'capacity',name:'Capacity first',summary:'Invest in transport, education and health; recover part of the cost from company receipts.',changes:{spend:{economic:12,education:8,health:5},tax:levies([company,10])}},
  {id:'balanced',name:'Balanced repair',summary:'Moderate investment with broad revenue and a smaller general-services budget.',changes:{spend:{economic:8,education:5,general:-5},tax:levies([paye,6],[company,5])}},
  {id:'resilience',name:'Fiscal resilience',summary:'Raise revenue and trim lower-priority administration to reduce refinancing exposure.',changes:{spend:{general:-8,culture:-2},tax:levies([paye,8],[vat,5])}},
  {id:'households',name:'Household support',summary:'Target social and housing support, funded mainly from higher receipts.',changes:{spend:{social:8,housing:6,health:4},tax:levies([paye,8],[company,7])}}
 ];
 const scored=candidates.map(c=>{const proposed=candidatePolicy(c.changes),path=simulate(d,proposed,{...settings,shockMode:'none'},5),r=path.at(-1);return{...c,proposed,r,fit:adviceFit(r,t)};}).sort((a,b)=>b.fit-a.fit).slice(0,3);
 modal(`<div class="eyebrow">TREASURY ADVISER</div><h2>Three routes toward your targets.</h2><p>These packages are generated from a small, disclosed policy set. They are starting points, not optimal forecasts.</p><div class="adviser-targets">Growth ≥ ${fmt(t.growth,1)}% · inflation ≤ ${fmt(t.inflation,1)}% · unemployment ≤ ${fmt(t.unemployment,1)}% · debt ≤ ${fmt(t.debt,1)}%</div><div class="advice-grid">${scored.map((c,i)=>`<article><span>OPTION 0${i+1} · ${c.fit}% TARGET FIT</span><h3>${c.name}</h3><p>${c.summary}</p><div><b>${fmt(c.r.growth,1)}%</b><small>growth</small><b>${fmt(c.r.inflation,1)}%</b><small>inflation</small><b>${fmt(c.r.debt/c.r.gdp*100,1)}%</b><small>debt</small></div><button data-advice="${c.id}" class="${i===0?'primary':''}">Stage this package</button></article>`).join('')}</div><p class="fine">Five-year central path before random events. Results change with assumptions, implementation and shocks.</p>`);
 $$('#drawer [data-advice]').forEach(b=>b.onclick=()=>{const c=scored.find(x=>x.id===b.dataset.advice);policy=qCopyPolicy(c.proposed);result=null;$('#drawer').close();render();toast(`${c.name} staged — inspect or edit any line`);});refreshButtonTips();
}

const BUTTON_TIPS={sources:'Open data sources, assumptions and limitations.',reset:'Discard this run and start a new mandate.',assumptions:'Change economic assumptions and simulation settings.',run:'Run the annual model and open the full outlook.',howToPlay:'Open the short game manual.',scoreboard:'Show scores saved in this browser.',toggleMissions:'Show or hide the available Chancellor briefs.',buildBudget:'Jump to the tax and spending controls.',askAdviser:'Generate three budget packages for your targets.',advanceQuarter:'Move the guided economy forward by three months.',editTargets:'Choose the economic targets required to win.',openTreasuryLab:'Jump to the detailed policy simulator.',newTax:'Create an illustrative new revenue source.',review:'Review every change in your current Budget.',nhsPreset:'Add £10bn of annual NHS spending and choose its funding.',pensionPreset:'Switch between the triple lock and earnings uprating.',consumerPrices:'Find consumer-price history tracks.',addTimelines:'Add optional historical indicators.',pin:'Keep this year visible for comparison.',prev:'Load the previous historical year.',next:'Load the next historical year.',disclaimer:'Open sources, data coverage and limitations.'};
function inferButtonTip(button){
 if(BUTTON_TIPS[button.id])return BUTTON_TIPS[button.id];
 if(button.dataset.mission)return `Load the ${button.querySelector('strong')?.textContent||'selected'} mission and its win conditions.`;
 if(button.dataset.share)return `Share this result using ${button.textContent.trim()}.`;
 if(button.dataset.national)return `Explain what moved ${button.querySelector('span')?.textContent||'this national indicator'}.`;
 if(button.classList.contains('budget-row'))return `Adjust ${button.querySelector('.row-top span')?.textContent||'this budget line'}.`;
 if(button.classList.contains('scenario-card'))return `Inspect this ready-made Budget and its projected consequences.`;
 if(button.classList.contains('nav'))return `Open ${button.textContent.trim()}.`;
 if(button.classList.contains('close'))return 'Close this panel.';
 const text=button.textContent.replace(/\s+/g,' ').trim().replace(/[↗→←＋▶↺⚙−]/g,'').trim();
 return text?`${text.slice(0,90)}.`:'Use this control.';
}
function refreshButtonTips(){document.querySelectorAll('button').forEach(b=>{const tip=inferButtonTip(b);b.dataset.tip=tip;if(!b.title)b.title=tip;});}
function installTooltipLayer(){
 if($('#buttonTooltip'))return;const tip=document.createElement('div');tip.id='buttonTooltip';tip.setAttribute('role','tooltip');document.body.appendChild(tip);
 const show=e=>{const b=e.target.closest?.('button');if(!b)return;refreshButtonTips();tip.textContent=b.dataset.tip;const r=b.getBoundingClientRect();tip.classList.add('show');const w=tip.offsetWidth;tip.style.left=Math.max(8,Math.min(innerWidth-w-8,r.left+r.width/2-w/2))+'px';tip.style.top=Math.max(8,r.top-tip.offsetHeight-9)+'px';};
 const hide=e=>{if(e.target.closest?.('button'))tip.classList.remove('show');};
 document.addEventListener('mouseover',show);document.addEventListener('focusin',show);document.addEventListener('mouseout',hide);document.addEventListener('focusout',hide);
}
