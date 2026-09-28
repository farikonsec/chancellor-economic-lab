/*
 * Quarterly educational macro engine.
 * Monetary values are annualised £bn unless noted. The equations are a compact,
 * inspectable teaching model: an IS-style output gap, expectations-augmented
 * Phillips curve, smoothed monetary reaction, Okun response, fiscal/debt block
 * and financial-stress feedback. It is not an official forecast.
 */
const QUARTERLY_SHOCKS={
 globalDownturn:{id:'global-downturn',kind:'external',name:'Global recession',strap:'Export orders and investment fall together.',growth:-1.15,inflation:-.18,sterling:-1.2,bank:5,household:4,confidence:-7,duration:4},
 energy:{id:'energy-crunch',kind:'fuel',name:'Energy-price shock',strap:'Imported fuel costs hit households and firms.',growth:-.5,inflation:1.15,sterling:-1.8,bank:1,household:7,confidence:-5,duration:5},
 finance:{id:'credit-seizure',kind:'financial',name:'Credit-market seizure',strap:'Funding costs rise and banks restrict lending.',growth:-.9,inflation:-.12,sterling:-2.2,bank:18,household:8,confidence:-11,duration:5},
 trade:{id:'trade-disruption',kind:'external',name:'Trade disruption',strap:'Imports cost more while export demand weakens.',growth:-.45,inflation:.55,sterling:-1.4,bank:2,household:3,confidence:-4,duration:4},
 housing:{id:'housing-correction',kind:'internal',name:'Housing correction',strap:'Falling prices expose leveraged households.',growth:-.55,inflation:-.08,sterling:-.4,bank:7,household:13,confidence:-6,duration:5},
 productivity:{id:'productivity-breakthrough',kind:'positive',name:'Productivity breakthrough',strap:'Firms can produce more without raising prices.',growth:.75,inflation:-.2,sterling:1.1,bank:-2,household:-2,confidence:8,duration:6},
 investment:{id:'investment-wave',kind:'positive',name:'Investment wave',strap:'Business investment and hiring accelerate.',growth:.5,inflation:.08,sterling:.7,bank:-1,household:-1,confidence:6,duration:5}
};

const CAMPAIGN_SCHEDULES={
 sandbox:[],
 recovery:[[1,'globalDownturn'],[10,'productivity']],
 stability:[[5,'housing']],
 resilience:[[2,'energy'],[8,'finance'],[14,'trade'],[17,'productivity']]
};

function qClamp(n,min,max){return Math.max(min,Math.min(max,n));}
function qRng(seed){let x=(seed>>>0)||1;return()=>{x=(Math.imul(1664525,x)+1013904223)>>>0;return(x+.5)/4294967296;};}
function qCopyPolicy(p){return{tax:{...(p?.tax||{})},spend:{...(p?.spend||{})},custom:(p?.custom||[]).map(x=>({...x})),hidden:p?.hidden||0};}
function quarterlyInitial(d,s={},mission='sandbox'){
 const cfg={...DEFAULTS,...s},gap=Number.isFinite(cfg.outputGap)?cfg.outputGap:0;
 return {mission,quarter:0,year:d.year,q:1,gdp:d.gdp,realGdp:d.gdp,debt:d.debt,price:1,potentialGrowth:cfg.growth,outputGap:gap,growth:d.growth??cfg.growth,inflation:d.inflation??cfg.inflation,bankRate:d.rate??cfg.neutralRate,unemployment:cfg.unemployment,sterlingIndex:100,riskPremium:Math.max(0,d.debt/d.gdp*100-90)*cfg.debtRiskSlope,effectiveRate:d.debt?d.interest/d.debt:cfg.yield/100,marketConfidence:75,bankStress:8,householdStress:8,serviceIndex:100,productivityIndex:100,interest:d.interest,receipts:d.receipts,spending:d.spending,borrowing:d.borrowing,activeShocks:[],lastShock:null,news:['You have taken office. Build a budget, then advance one quarter.']};
}

function scheduledQuarterlyShock(mission,quarter,seed,enabled=true){
 if(!enabled)return null;
 const fixed=(CAMPAIGN_SCHEDULES[mission]||[]).find(x=>x[0]===quarter);
 if(fixed)return{...QUARTERLY_SHOCKS[fixed[1]],source:'mission'};
 const random=qRng((seed>>>0)+quarter*7919),draw=random();
 if(draw>.075)return null;
 const keys=['globalDownturn','energy','finance','trade','housing','productivity','investment'];
 return {...QUARTERLY_SHOCKS[keys[Math.floor(random()*keys.length)]],source:'stochastic'};
}

function quarterlyStep(previous,d,p,s={},options={}){
 const cfg={...DEFAULTS,...s},state={...previous},q=previous.quarter+1,base=inputs(d,{tax:{},spend:{},custom:[]}),changed=inputs(d,p||{tax:{},spend:{},custom:[]});
 const event=options.shock||null,response=options.response||{},spendDelta=changed.total-base.total+(response.spend||0),taxDelta=changed.revenue-base.revenue+(response.tax||0);
 const debtRatio=state.debt/state.gdp*100,capital=(p?.spend?.economic||0)*cfg.capitalShare+(p?.spend?.education||0)*.25;
 const transfer=(p?.spend?.social||0)+(response.transfer||0),current=spendDelta-capital-transfer;
 const stateScale=qClamp(1-.1*state.outputGap,.6,1.4),fiscalImpulse=stateScale*(capital*1+current*.45+transfer*(cfg.targeting==='targeted'?.75:.6)-taxDelta*.33)/state.gdp*100;
 const shock=event||{growth:0,inflation:0,sterling:0,bank:0,household:0,confidence:0,duration:0};
 const laggedShocks=(state.activeShocks||[]).map(x=>({...x,remaining:x.remaining-1})).filter(x=>x.remaining>0),allShocks=event?[...laggedShocks,{...event,remaining:event.duration}]:laggedShocks;
 const shockFlow=allShocks.reduce((a,x)=>{const fade=x.remaining/Math.max(1,x.duration);a.growth+=x.growth*fade;a.inflation+=x.inflation*fade;a.sterling+=x.sterling*fade;a.bank+=x.bank*fade;a.household+=x.household*fade;a.confidence+=x.confidence*fade;return a;},{growth:0,inflation:0,sterling:0,bank:0,household:0,confidence:0});
 const realRate=state.bankRate-state.inflation,rateGap=realRate-(cfg.neutralRate-cfg.inflationTarget),creditDrag=Math.max(0,state.bankStress-35)*.012+Math.max(0,state.householdStress-45)*.007;
 const newGap=qClamp(.76*state.outputGap+.42*fiscalImpulse-.055*rateGap-creditDrag+shockFlow.growth/4+(response.gap||0),-12,10);
 const supplyBoost=qClamp(capital/state.gdp*100*.035,0,.16)+(response.supply||0),potentialGrowth=qClamp(.92*state.potentialGrowth+.08*(cfg.growth+supplyBoost*4),-3,6);
 const annualGrowth=qClamp(potentialGrowth+(newGap-state.outputGap)*2.2,-15,12);
 const sterlingMove=.12*(state.bankRate-cfg.neutralRate)-.22*(state.inflation-cfg.inflationTarget)-.35*state.riskPremium+shockFlow.sterling/4+(response.sterling||0);
 const sterling=qClamp(state.sterlingIndex*(1+sterlingMove/100),35,145),imported=Math.max(0,100-sterling)*cfg.fxPassThrough/18;
 const inflation=qClamp(.78*state.inflation+.22*cfg.inflationTarget+.14*newGap+imported+shockFlow.inflation/4+(response.inflation||0),-3,35);
 const targetRate=qClamp(cfg.neutralRate+cfg.monetaryResponse*(inflation-cfg.inflationTarget)+.25*newGap,0,18),bankRate=qClamp(.72*state.bankRate+.28*targetRate,0,18);
 const unemployment=qClamp(state.unemployment-.11*(annualGrowth-potentialGrowth)+Math.max(0,shockFlow.growth<0?-shockFlow.growth*.035:0),2,25);
 const realQuarterGrowth=Math.pow(Math.max(.5,1+annualGrowth/100),.25)-1,realGdp=state.realGdp*(1+realQuarterGrowth),quarterInflation=Math.pow(Math.max(.5,1+inflation/100),.25)-1,price=state.price*(1+quarterInflation),gdp=realGdp*price;
 const nextDebtRatio=state.debt/gdp*100,riskPremium=qClamp(Math.max(0,nextDebtRatio-90)*cfg.debtRiskSlope+Math.max(0,55-state.marketConfidence)*.018,0,5);
 const newDebtYield=qClamp(cfg.yield+.7*(bankRate-(d.rate??cfg.neutralRate))+riskPremium,0,20),effectiveRate=state.effectiveRate+(newDebtYield/100-state.effectiveRate)/(cfg.maturity*4);
 const interest=Math.max(0,state.debt)*effectiveRate,receipts=(base.revenue+taxDelta)*gdp/d.gdp-Math.max(0,taxDelta)*cfg.taxResponse;
 const demographicPressure=.0035*q,serviceInvestment=((p?.spend?.health||0)+(p?.spend?.education||0)+(p?.spend?.housing||0))/Math.max(1,base.total)*12;
 const serviceIndex=qClamp(100-demographicPressure+serviceInvestment+(response.service||0),35,160);
 const nonInterest=base.total-d.interest+spendDelta,spending=nonInterest*price+interest,borrowing=spending-receipts,debt=state.debt+borrowing/4;
 const bankStress=qClamp(state.bankStress*.86+Math.max(0,bankRate-4)*.85+Math.max(0,-annualGrowth)*1.15+Math.max(0,unemployment-6)*.55+riskPremium*2.2+shockFlow.bank/4+(response.bank||0),0,100);
 const householdStress=qClamp(state.householdStress*.88+Math.max(0,bankRate-4)*.9+Math.max(0,unemployment-5)*.8+Math.max(0,inflation-4)*.45+shockFlow.household/4+(response.household||0),0,100);
 const marketConfidence=qClamp(82-riskPremium*10-Math.max(0,borrowing/gdp*100-4)*2.1-Math.max(0,inflation-4)*1.25+shockFlow.confidence/4+(response.confidence||0),0,100);
 const news=[];
 if(event)news.push(`${event.name}: ${event.strap}`);
 if(inflation>7)news.push('Prices are rising fast and the Bank is tightening policy.');
 if(bankStress>48)news.push('Banks are restricting credit as losses and funding pressure build.');
 if(riskPremium>1)news.push('Gilt investors are demanding a material risk premium.');
 if(annualGrowth>=2&&inflation<=3.2)news.push('Growth is broadening without excessive inflation.');
 if(!news.length)news.push('No major threshold crossed this quarter.');
 return {...state,quarter:q,year:d.year+Math.floor(q/4),q:q%4+1,gdp,realGdp,debt,price,potentialGrowth,outputGap:newGap,growth:annualGrowth,inflation,bankRate,unemployment,sterlingIndex:sterling,riskPremium,effectiveRate,marketConfidence,bankStress,householdStress,serviceIndex,productivityIndex:state.productivityIndex*(1+supplyBoost/100),interest,receipts,spending,borrowing,activeShocks:allShocks,lastShock:event,news,fiscalImpulse,newDebtYield};
}

function quarterlyScore(state,start,targets={}){
 const debt=state.debt/state.gdp*100,startDebt=start.debt/start.gdp*100;
 const parts={prosperity:qClamp(55+(state.growth-1.2)*15-(state.unemployment-4.5)*4,0,100),stability:qClamp(100-Math.abs(state.inflation-2)*18-Math.max(0,state.bankRate-5)*5,0,100),jobs:qClamp(100-Math.max(0,state.unemployment-3)*13,0,100),services:qClamp(state.serviceIndex-20,0,100),fiscal:qClamp(70-(debt-startDebt)*4-Math.max(0,debt-100)*2,0,100),confidence:qClamp(state.marketConfidence-state.bankStress*.25,0,100)};
 const score=Math.round(parts.prosperity*.25+parts.stability*.2+parts.jobs*.2+parts.services*.15+parts.fiscal*.15+parts.confidence*.05),term=targets.termQuarters??20;
 const fatal=state.inflation>=30||state.bankStress>=90||state.marketConfidence<=10||debt>=170;
 const met={growth:state.growth>=(targets.growth??1.5),inflation:state.inflation<=(targets.inflation??3),unemployment:state.unemployment<=(targets.unemployment??6),debt:debt<=(targets.debt??105)};
 return{score:Math.round(score*10),parts,fatal,met,debt,won:state.quarter>=term&&Object.values(met).every(Boolean)&&!fatal,lost:fatal||score<=25};
}

if(typeof module!=='undefined')module.exports={QUARTERLY_SHOCKS,CAMPAIGN_SCHEDULES,quarterlyInitial,quarterlyStep,quarterlyScore,scheduledQuarterlyShock,qCopyPolicy};
