const fs=require('fs'),vm=require('vm'),assert=require('assert');const dir=__dirname+'/';const ctx=vm.createContext({console});vm.runInContext(fs.readFileSync(dir+'data.js','utf8')+fs.readFileSync(dir+'model.js','utf8')+';globalThis.api={DATA,simulate,inputs,DEFAULTS,baseSpending,fiscalLevel,sensitivity};',ctx);const {DATA,simulate,inputs,DEFAULTS,baseSpending,fiscalLevel,sensitivity}=ctx.api;const p={tax:{},spend:{},custom:[]};let n=0;
for(const d of DATA){const a=inputs(d,p);assert(Math.abs(a.revenue-d.receipts)<.01);assert(Math.abs(a.total-d.spending)<.01);const r=simulate(d,p,DEFAULTS,50);for(let j=0;j<r.length;j++){const t=r[j];assert(Object.values(t).filter(v=>typeof v==='number').every(Number.isFinite));assert(Math.abs(t.spending-t.receipts-t.borrowing)<1e-8);if(j)assert(Math.abs(t.debt-r[j-1].debt-t.borrowing)<1e-8);n++;}assert(Math.abs(r[0].spending-d.spending)<.01);assert(Math.abs(r[0].receipts-d.receipts)<.01);}
const d=DATA.find(x=>x.year===2024),a=simulate(d,p,DEFAULTS,20),b=simulate(d,{...p,spend:{health:10}},DEFAULTS,20);assert(Math.abs(b[0].borrowing-a[0].borrowing-10)<1e-8);const c=simulate(d,p,{...DEFAULTS,pension:'earnings'},20);assert(c.at(-1).debt<=a.at(-1).debt);const z=simulate(d,{...p,tax:{tax16:10}},DEFAULTS,5);assert(Math.abs(z[0].borrowing-a[0].borrowing+10)<1e-8);console.log('PASS:',DATA.length,'historical reconciliations;',n,'annual stock-flow checks; policy cost and pension tests.');

for(let i=1;i<b.length;i++)assert(Math.abs((b[i].debt/b[i].gdp-b[i-1].debt/b[i-1].gdp)*100-b[i].snowball-b[i].primaryContribution)<1e-8);
const shock={tax:{},spend:{health:10},custom:[]};assert(Math.abs(fiscalLevel(d,shock,DEFAULTS,1)-4.5/d.gdp)<1e-12);assert.strictEqual(fiscalLevel(d,shock,DEFAULTS,6),0);
const mc=sensitivity(d,shock,DEFAULTS,10,300);assert.strictEqual(JSON.stringify(mc),JSON.stringify(sensitivity(d,shock,DEFAULTS,10,300)));for(const r of mc.bands)assert(r.p10<=r.p50&&r.p50<=r.p90);
const zero=sensitivity(d,p,{...DEFAULTS,growthSigma:0,inflationSigma:0,yieldSigma:0},5,10);for(const r of zero.bands)assert(r.p10===r.p50&&r.p50===r.p90);assert(zero.effect.p50===0);
assert.throws(()=>simulate(d,{tax:{shock:1e6},spend:{},custom:[]},DEFAULTS,5));
console.log('PASS: debt-ratio decomposition, OBR level decay, reproducible Monte Carlo, zero-uncertainty collapse and extreme-shock guard.');
vm.runInContext(fs.readFileSync(dir+'funding.js','utf8')+';globalThis.fund={fundingTransaction};',ctx);
const ft=ctx.fund.fundingTransaction;
for(const [mode,source]of [['borrow',null],['sector','education'],['equal',null],['tax','tax16']]){
 const q=ft(d,p,'defence',50,mode,source),before=inputs(d,p),after=inputs(d,q.next);
 assert(Math.abs((after.total-after.revenue)-(before.total-before.revenue)-(mode==='borrow'?50:0))<1e-8);
 assert(Math.abs(q.next.spend.defence-50)<1e-8);
 const again=ft(d,q.next,'defence',60,mode,source);assert(Math.abs(again.transaction.amount-10)<1e-8);
 const reverse=ft(d,q.next,'defence',0,mode,source);for(const v of Object.values(reverse.next.spend))assert(Math.abs(v)<1e-8);for(const v of Object.values(reverse.next.tax))assert(Math.abs(v)<1e-8);
}
assert.throws(()=>ft(d,p,'defence',2000,'sector','education'));
assert.throws(()=>ft(d,p,'defence',50,'sector','defence'));
assert.throws(()=>ft(d,p,'defence',2000,'equal'));
assert.throws(()=>ft(d,p,'defence',NaN,'borrow'));
const saved=ft(d,p,'defence',-10,'sector','education');assert(saved.next.spend.education===10);
console.log('PASS: funding reconciliation, repeat edits, reversal, savings allocation, insufficient funds and invalid inputs.');
