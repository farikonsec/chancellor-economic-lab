/* Transparent educational model. All monetary quantities £bn. */
const DEFAULTS={method:'obr',capitalShare:.5,multiplierScale:1,growthSigma:.75,inflationSigma:1,yieldSigma:1,seed:2026,growth:1.5,inflation:2,yield:4,maturity:14,multiplier:.6,taxResponse:.15,investmentReturn:.08,healthReturn:.025,births:10,deathWorking:2,deathOld:40,migration:300000,wages:2.5,pension:'triple',hidden:0};
const SECTORS=[['health','Health','#2d8b9c'],['social','Social protection','#a48ac9'],['education','Education','#6c91d6'],['defence','Defence','#778ca9'],['economic','Economy & transport','#deaa5d'],['order','Police & justice','#79a799'],['housing','Housing & communities','#c09174'],['environment','Environment','#6ca580'],['culture','Culture & recreation','#bc8fba'],['aid','Foreign economic aid','#af97d4'],['general','General public services','#98a4b1'],['residual','Accounting reconciliation','#aeb7c1']];
const sum=xs=>xs.reduce((a,b)=>a+b,0);
function baseSpending(d){
 if(d.sectors)return {...d.sectors};
 // Historical disaggregation is unavailable outside imported PESA years. User-editable allocation, never an outturn claim.
 const weights={health:.22,social:.34,education:.10,defence:.05,economic:.09,order:.04,housing:.02,environment:.015,culture:.015,aid:.008,general:.062,residual:.04};
 return Object.fromEntries(Object.entries(weights).map(([k,v])=>[k,(d.spending-d.interest)*v]));
}
function inputs(d,p){
 const tax=d.taxes.length?d.taxes:[{id:'aggregate',name:'All public receipts',value:d.receipts}];
 const revenues=tax.map(t=>({...t,amount:t.value+(p.tax[t.id]||0)}));
 const custom=p.custom.map(t=>({...t,value:0,amount:t.base*t.rate/100*t.compliance/100}));
 const spending=Object.fromEntries(Object.entries(baseSpending(d)).map(([k,v])=>[k,v+(p.spend[k]||0)]));
 const revenue=sum(revenues.map(t=>t.amount))+sum(custom.map(t=>t.amount));
 return {revenues:[...revenues,...custom],spending,revenue,total:sum(Object.values(spending))+d.interest+(p.hidden||0)};
}
function simulate(d,p,settings,years){
 const s={...DEFAULTS,...settings};const base=inputs(d,{tax:{},spend:{},custom:[]});const changed=inputs(d,p);
 const pop=d.population||DATA.find(x=>x.year===2024).population;
 let young=pop*(d.young||17.5)/100,old=pop*(d.old||19)/100,working=pop-young-old;
 const initOld=old,initWorking=working;
 let gdp=d.gdp,realGdp=d.gdp,debt=d.debt,price=1,effective=d.interest/d.debt,prevGdp=d.gdp,rows=[];
 let pension=d.pensions??base.spending.social*.5; let baseNonPension=base.spending.social-pension;
 const taxChange=changed.revenue-base.revenue;
 const spendChange=changed.total-base.total;
 for(let t=0;t<=years;t++){
  const population=young+working+old;
  const demand=s.method==='obr'?fiscalLevel(d,p,s,t):(t===0?0:(spendChange-s.multiplier*.5*taxChange)/d.gdp*s.multiplier*Math.exp(-(t-1)/3));
  if(1+demand<=0)throw new RangeError('Policy shock exceeds this model’s valid range. Reduce the tax or spending change.');
  const priorDemand=s.method==='obr'?fiscalLevel(d,p,s,t-1):0;
  const delayed=Math.min(Math.max(t-2,0)/5,1);
  const supply=(p.spend.economic||0)/d.gdp*s.investmentReturn*delayed+(p.spend.health||0)/d.gdp*s.healthReturn*delayed;
  let growth=t===0?(d.growth??s.growth):s.growth+100*demand+100*supply;
  const inflation=t===0?(d.inflation??s.inflation):Math.max(-2,s.inflation+30*demand);
  if(t>0){
   const prevWorking=working;
   const ageIn=young/15,ageOut=working/50;
   const births=population*s.births/1000;
   young=Math.max(0,young+births-ageIn+s.migration*.15);
   working=Math.max(1,working+ageIn-ageOut-working*s.deathWorking/1000+s.migration*.8);
   old=Math.max(1,old+ageOut-old*s.deathOld/1000+s.migration*.05);
   const labourGrowth=(working/prevWorking-1)*.6;
   const oldReal=realGdp;
   realGdp*=s.method==='obr'?(1+s.growth/100+labourGrowth+supply)*(1+demand)/(1+priorDemand):1+growth/100+labourGrowth;
   if(!Number.isFinite(realGdp)||realGdp<=0)throw new RangeError('These assumptions exceed the model’s valid range. Reduce the policy shock or adjust growth.');
   growth=(realGdp/oldReal-1)*100;
   price*=1+inflation/100;gdp=realGdp*price;
   const uprate=s.pension==='triple'?Math.max(s.wages,inflation,2.5):s.pension==='earnings'?s.wages:s.pension==='inflation'?inflation:0;
   pension*=1+uprate/100;
  }
  const nPop=young+working+old;
  let categories={};for(const [k,v]of Object.entries(changed.spending)){
   let ageFactor=k==='health'?(nPop+2*old)/(pop+2*initOld):k==='education'?young/(pop*(d.young||17.5)/100):nPop/pop;
   categories[k]=v*price*ageFactor;
  }
  // Social protection: a transparent 50% pension proxy, rest population/CPI indexed.
  categories.social=(pension*old/initOld+baseNonPension*price*nPop/pop)+(p.spend.social||0)*price*nPop/pop;
  const behavioural=t===0?0:Math.max(0,taxChange)*s.taxResponse*price;
  const receipts=changed.revenue*gdp/d.gdp-behavioural;
  if(t>0)effective+=(s.yield/100-effective)/s.maturity;
  const interest=t===0?d.interest:Math.max(0,debt)*effective;
  const spending=sum(Object.values(categories))+interest+s.hidden*price;
  const borrowing=spending-receipts;
  const openingDebt=debt;
  if(t>0)debt+=borrowing;
  const primaryBalance=receipts-(spending-interest);
  const nominalGrowth=t===0?0:gdp/prevGdp-1;
  const snowball=t===0?0:(interest/gdp-openingDebt/prevGdp*nominalGrowth/(1+nominalGrowth))*100;
  const primaryContribution=-primaryBalance/gdp*100;
  rows.push({primaryBalance,nominalGrowth,snowball,primaryContribution,fiscalLevel:demand,year:d.year+t,receipts,spending,borrowing,debt,openingDebt,interest,gdp,realGdp,price,growth,inflation,population:nPop,young,working,old,categories,effective,refinancing:Math.max(0,openingDebt)/s.maturity,grossFunding:Math.max(0,openingDebt)/s.maturity+borrowing});
  prevGdp=gdp;
 }
 return rows;
}
// OBR June 2026 FER table 2.1: temporary GDP LEVEL response to a permanent fiscal shift.
const OBR_WEIGHTS={tax:[.33,.30,.23,.14,.05,0],ame:[.60,.57,.43,.23,.07,0],rdel:[.45,.42,.29,.13,.04,0],cdel:[1,.83,.43,.23,.07,0]};
function fiscalLevel(d,p,s,t){
 if(t<1||t>6)return 0;
 const i=t-1,capital=(p.spend.economic||0)*s.capitalShare;
 const transfers=p.spend.social||0;
 const current=sum(Object.values(p.spend))-capital-transfers+(s.hidden||0);
 const tax=sum(Object.values(p.tax))+sum(p.custom.map(c=>c.base*c.rate/100*c.compliance/100));
 return s.multiplierScale*(capital*OBR_WEIGHTS.cdel[i]+current*OBR_WEIGHTS.rdel[i]+transfers*OBR_WEIGHTS.ame[i]-tax*OBR_WEIGHTS.tax[i])/d.gdp;
}
function sensitivity(d,p,s,years,runs=300){
 let seed=s.seed>>>0;
 const uniform=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return(seed+.5)/4294967296;};
 const normal=()=>Math.sqrt(-2*Math.log(uniform()))*Math.cos(2*Math.PI*uniform());
 const draws=[],effects=[];
 for(let i=0;i<runs;i++){
  const zi=normal(),zg=normal(),zr=normal();
  const params={...s,growth:Math.max(-5,Math.min(8,s.growth+s.growthSigma*zg)),inflation:Math.max(-2,Math.min(15,s.inflation+s.inflationSigma*zi)),yield:Math.max(0,Math.min(20,s.yield+s.yieldSigma*(.4*zi+Math.sqrt(1-.16)*zr)))};
  const scenario=simulate(d,p,params,years),base=simulate(d,{tax:{},spend:{},custom:[]},{...params,pension:'triple',hidden:0},years);
  draws.push(scenario.map(r=>r.debt/r.gdp*100));effects.push(scenario.at(-1).debt/scenario.at(-1).gdp*100-base.at(-1).debt/base.at(-1).gdp*100);
 }
 const quant=(arr,q)=>{const v=arr.slice().sort((a,b)=>a-b);const x=(v.length-1)*q,l=Math.floor(x);return v[l]+(v[Math.min(l+1,v.length-1)]-v[l])*(x-l);};
 return {runs,seed:s.seed,bands:Array.from({length:years+1},(_,t)=>({year:d.year+t,p10:quant(draws.map(a=>a[t]),.1),p50:quant(draws.map(a=>a[t]),.5),p90:quant(draws.map(a=>a[t]),.9)})),effect:{p10:quant(effects,.1),p50:quant(effects,.5),p90:quant(effects,.9)}};
}
if(typeof module!=='undefined')module.exports={DEFAULTS,baseSpending,inputs,simulate,fiscalLevel,sensitivity,OBR_WEIGHTS};
