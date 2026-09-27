// HERO: missions, score and an inspectable economic consequence engine.
const MISSIONS=[
 {id:'sandbox',code:'00',name:'Open sandbox',brief:'Explore freely with the published baseline and no random events.',years:5,settings:{outputGap:0,shockMode:'none'},goals:['Choose your own trade-offs']},
 {id:'recovery',code:'01',name:'Recession response',brief:'Demand is weak. Lift living standards without sending debt or inflation off course.',years:5,settings:{outputGap:-2,shockMode:'events'},goals:['GDP/person +0.3% vs baseline','Debt below 105%','Inflation below 3.5%']},
 {id:'stability',code:'02',name:'Debt stabiliser',brief:'Rates are restrictive and fiscal space is narrow. Put debt on a safer path.',years:10,settings:{outputGap:1,shockMode:'none'},goals:['Debt below unchanged policy','Borrowing below unchanged policy','Protect core services']},
 {id:'resilience',code:'03',name:'Shock-proof Britain',brief:'A seeded sequence of downturn, energy and productivity risks may arrive.',years:10,settings:{outputGap:0,shockMode:'events'},goals:['Debt below 110%','Inflation within 1.5pp of target','No deep service cuts']}
];
let activeMission='sandbox',missionsOpen=true;
const clampScore=n=>Math.max(0,Math.min(100,Math.round(n)));
const condition=(id,name,tone,points,detail,severe=false)=>({id,name,tone,points,detail,severe});
function economicConditions(rows){
 const found=new Map(),startDebt=rows[0].debt/rows[0].gdp*100;
 rows.slice(1).forEach(r=>{
  const debt=r.debt/r.gdp*100,add=c=>{if(!found.has(c.id))found.set(c.id,{...c,year:r.year});};
  if(r.inflation>=50)add(condition('hyperinflation-risk','Hyperinflation warning','bad',-240,'Annual inflation has exceeded 50%. True hyperinflation is normally defined from monthly data, which this model does not contain.',true));
  else if(r.inflation>=15)add(condition('inflation-spiral','Inflation spiral','bad',-180,'Inflation has exceeded 15%; prices are no longer anchored.',true));
  else if(r.inflation>=7)add(condition('high-inflation','High inflation','bad',-70,'Household purchasing power is falling rapidly.'));
  if(r.growth>4&&r.inflation>4)add(condition('overheating','Overheated economy','bad',-55,'Demand is outrunning productive capacity.'));
  if(r.growth<0&&r.inflation>=4)add(condition('stagflation','Stagflation','bad',-90,'Output is shrinking while prices keep rising.'));
  else if(r.growth<1)add(condition('stagnation','Stagnation','bad',-35,'Growth is below 1%.'));
  if(r.bankRate>=8)add(condition('high-rates','Punishing interest rates','bad',-65,'The policy-rate proxy has reached 8%.'));
  if(r.sterlingIndex<=82)add(condition('sterling-crisis','Sterling devaluation','bad',-80,'The modelled sterling index is down at least 18%.'));
  if(r.unemployment>=12||r.growth<=-5)add(condition('depression','Depression conditions','bad',-220,'A deep output or employment collapse has developed.',true));
  else if(r.unemployment>=8)add(condition('unemployment','High unemployment','bad',-70,'The unemployment proxy has reached 8%.'));
  if(r.bankStress>=70)add(condition('banking-crisis','Banking crisis','bad',-170,'Rate, credit and recession stress have overwhelmed bank resilience.',true));
  else if(r.bankStress>=48)add(condition('bank-stress','Banks under stress','bad',-55,'Credit losses and funding pressure are building.'));
  if(r.householdStress>=65)add(condition('insolvency-wave','Mortgage & insolvency crisis','bad',-110,'Rates, prices and unemployment are pushing households into distress.'));
  else if(r.householdStress>=45)add(condition('mortgage-squeeze','Mortgage squeeze','bad',-45,'Debt servicing costs are severely pressuring households.'));
  if(debt>=140||r.riskPremium>=2.5)add(condition('debt-crisis','Debt sustainability crisis','bad',-200,'Debt and refinancing costs are reinforcing one another.',true));
  else if(r.riskPremium>=1)add(condition('gilt-selloff','Gilt sell-off','bad',-85,'Investors demand a material premium to hold new UK debt.'));
  if(r.fiscalLevel>.02&&settings.outputGap>0&&r.riskPremium>.25)add(condition('credibility-shock','Fiscal credibility shock','bad',-85,'A large expansion into a capacity-constrained economy has raised financing pressure.'));
  if(r.growth>=3&&r.inflation<=3&&r.unemployment<6)add(condition('productive-boom','Productive boom','good',70,'Strong growth is arriving without excessive inflation.'));
  if(r.growth>=1.2&&r.growth<=3&&r.inflation>=1&&r.inflation<=3&&r.unemployment<6)add(condition('soft-landing','Soft landing','good',40,'Growth, prices and employment are jointly stable.'));
  if(debt<=startDebt-5)add(condition('debt-turnaround','Debt turnaround','good',65,'Debt/GDP has fallen by at least five percentage points.'));
  if(r.marketConfidence>=82&&r.bankStress<20)add(condition('trusted-market','High market confidence','good',30,'Funding pressure is low and the financial system is resilient.'));
 });
 return [...found.values()].sort((a,b)=>a.year-b.year||a.points-b.points);
}
function scoreOutcome(r,b){
 const pcDelta=(r.realGdp/r.population/(b.realGdp/b.population)-1)*100,debt=r.debt/r.gdp*100;
 const serviceDelta=sum(['health','education','economic','housing','environment'].map(k=>policy.spend[k]||0));
 return {growth:clampScore(50+pcDelta*45),debt:clampScore(100-Math.max(0,debt-80)*3),prices:clampScore(100-Math.abs(r.inflation-settings.inflationTarget)*28),jobs:clampScore(100-Math.max(0,r.unemployment-3)*13),services:clampScore(50+serviceDelta/datum().gdp*850),confidence:clampScore(r.marketConfidence)};
}
function gameOutcome(rows,base){
 const events=economicConditions(rows),r=rows.at(-1),b=base.at(-1),s=scoreOutcome(r,b);let points=500;
 rows.slice(1).forEach((x,i)=>{const prev=rows[i],debt=x.debt/x.gdp*100,oldDebt=prev.debt/prev.gdp*100;points+=Math.round(8-Math.abs(x.inflation-settings.inflationTarget)*7+Math.max(-25,Math.min(25,(x.growth-1)*9))+Math.max(-20,Math.min(14,(6-x.unemployment)*4))+Math.max(-18,Math.min(18,(oldDebt-debt)*5))+(x.marketConfidence-60)/5);});
 points+=sum(events.map(e=>e.points));points=Math.max(0,Math.min(1000,Math.round(points)));
 const fatal=events.some(e=>e.severe),won=points>=700&&!fatal,lost=points<=250||fatal;
 return {points,events,s,won,lost,state:won?'YOU WIN':lost?'GOVERNMENT FALLS':'MANDATE IN PROGRESS'};
}
function renderMissions(){
 const root=$('#missionControl');if(!root)return;const m=MISSIONS.find(x=>x.id===activeMission),game=result&&baseline?gameOutcome(result,baseline):null;
 const hud=game?`<div class="game-hud ${game.won?'won':game.lost?'lost':''}"><div><span>CHANCELLOR SCORE</span><strong>${game.points}</strong><small>/ 1,000</small></div><div class="score-track"><i style="width:${game.points/10}%"></i><b style="left:25%">LOSE 250</b><b style="left:70%">WIN 700</b></div><em>${game.state}</em></div>`:`<div class="game-rules"><b>Start 500</b><span>Good growth, stable prices, jobs, services and sustainable debt earn points.</span><span><strong>Win 700</strong> · Lose at 250 or after a systemic crisis.</span></div>`;
 root.innerHTML=`${hud}<div class="mission-head"><div><div class="eyebrow">CHANCELLOR'S BRIEF</div><h2>${m.name}</h2><p>${m.brief}</p></div><button id="toggleMissions" aria-expanded="${missionsOpen}">${missionsOpen?'Hide briefs −':'Choose a mission +'}</button></div>${missionsOpen?`<div class="mission-grid">${MISSIONS.map(x=>`<button class="mission-card ${x.id===activeMission?'selected':''}" data-mission="${x.id}"><span>${x.code}</span><strong>${x.name}</strong><small>${x.goals[0]}</small></button>`).join('')}</div><div class="mission-goals">${m.goals.map(g=>`<span>✓ ${g}</span>`).join('')}</div>`:''}`;
 $('#toggleMissions').onclick=()=>{missionsOpen=!missionsOpen;renderMissions();};
 root.querySelectorAll('[data-mission]').forEach(b=>b.onclick=()=>{const next=MISSIONS.find(x=>x.id===b.dataset.mission);activeMission=next.id;horizon=next.years;Object.assign(settings,next.settings);result=null;baseline=null;$('#run').textContent=`▶ Run ${horizon} years`;missionsOpen=false;render();toast(`${next.name} loaded · build your budget`);});
}
function missionResult(r,b,s){
 const debt=r.debt/r.gdp*100,baseDebt=b.debt/b.gdp*100,pc=(r.realGdp/r.population/(b.realGdp/b.population)-1)*100;
 if(activeMission==='recovery')return pc>=.3&&debt<105&&r.inflation<3.5;
 if(activeMission==='stability')return debt<baseDebt&&r.borrowing<b.borrowing&&s.services>=40;
 if(activeMission==='resilience')return debt<110&&Math.abs(r.inflation-settings.inflationTarget)<=1.5&&s.services>=35;
 return null;
}
function enhanceOutlook(){
 if(!result||!baseline)return;const r=result.at(-1),b=baseline.at(-1),game=gameOutcome(result,baseline),s=game.s,passed=missionResult(r,b,s);
 const initial=inputs(datum(),policy),baseInput=inputs(datum(),emptyPolicy()),fiscal=(initial.total-baseInput.total)-(initial.revenue-baseInput.revenue);
 const gdpDelta=r.realGdp-b.realGdp,interestDelta=r.interest-b.interest,debtDelta=r.debt-b.debt;
 const status=game.won?'You won the mandate':game.lost?'Your government has fallen':passed==null?'Mandate still in play':passed?'Mission achieved':'Mission missed';
 const explanation=[`Your budget changed the initial funding need by <b>${signed(fiscal)}</b> a year.`,`Demand, supply and rate feedback left real GDP <b>${gdpDelta>=0?'+':''}${cash(gdpDelta)}</b> versus unchanged policy in ${r.year}.`,`Debt changed by <b>${debtDelta>=0?'+':''}${cash(debtDelta)}</b>; annual interest changed by <b>${interestDelta>=0?'+':''}${cash(interestDelta)}</b>.`,`Bank Rate ended at <b>${fmt(r.bankRate,2)}%</b>, unemployment at <b>${fmt(r.unemployment,1)}%</b> and sterling at <b>${fmt(r.sterlingIndex,0)}</b> (start 100).`];
 const ledger=game.events.length?`<div class="consequence-ledger"><h4>Economic consequences</h4>${game.events.map(e=>`<div class="consequence ${e.tone}"><span>${e.year}</span><b>${e.name}</b><p>${e.detail}</p><strong>${e.points>0?'+':''}${e.points}</strong></div>`).join('')}</div>`:`<div class="event-tape"><b>No regime event triggered.</b> The economy stayed inside the game’s stress thresholds.</div>`;
 $('#outlookView').insertAdjacentHTML('beforeend',`<section class="debrief"><div class="debrief-head"><div><div class="eyebrow">POLICY DEBRIEF · ${game.points} POINTS</div><h3>${status}</h3></div><span class="mission-status ${game.lost||passed===false?'miss':''}">${game.won?'VICTORY':game.lost?'DEFEAT':passed==null?'KEEP PLAYING':passed?'PASSED':'RETRY'}</span></div><div class="score-grid">${Object.entries(s).map(([k,v])=>`<div><span>${k}</span><strong>${v}</strong><i><b style="width:${v}%"></b></i></div>`).join('')}</div><div class="cause-chain">${explanation.map((x,i)=>`<div><span>0${i+1}</span><p>${x}</p></div>`).join('')}</div>${ledger}<details><summary>How the game decides</summary><p>Each year rewards growth near a sustainable range, inflation near target, employment, market confidence and falling debt/GDP. Recession, inflation, financial stress and rising debt subtract points. Systemic thresholds can end a government immediately. These rules are transparent educational stress tests, not event forecasts.</p></details></section>`);
 renderMissions();
}
