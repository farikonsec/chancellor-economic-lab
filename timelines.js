const TIMELINE_EVENTS=[
{id:'submarines',name:'Submarine commissions',group:'Defence',notes:'Selected Astute-class commissioning ceremonies, not submarines built per year. Construction, launch, delivery, commissioning and operational availability are different dates. This is a selected event list, not a complete fleet history.',events:[
{year:2010,name:'HMS Astute commissioned',url:'https://www.gov.uk/government/news/uks-most-powerful-submarine-joins-the-navy'},
{year:2013,name:'HMS Ambush commissioned',url:'https://www.gov.uk/government/news/submarine-hms-ambush-commissioned-into-the-royal-navy'},
{year:2016,name:'HMS Artful commissioned',url:'https://www.royalnavy.mod.uk/news/2016/march/18/160318-hms-artful'},
{year:2021,name:'HMS Audacious commissioning ceremony',url:'https://www.royalnavy.mod.uk/news/2021/september/23/20210923-fourth-astute-class-submarine-formally-commissioned'},
{year:2022,name:'HMS Anson commissioned',url:'https://www.royalnavy.mod.uk/news/2023/february/20/230220-hms-anson-sails-for-the-first-time'}]},
{id:'nuclear',name:'Nuclear station milestones',group:'Infrastructure',notes:'Selected UK station milestones. First grid connection, permanent end of generation and defuelling decisions are distinguished. Not a complete opening/closure count; no marker does not mean no event.',events:[
{year:1995,name:'Sizewell B: first grid connection',url:'https://www.edfenergy.com/media-centre/sizewell-b-turns-thirty'},
{year:2021,name:'Dungeness B: permanent defuelling decision',url:'https://www.edfenergy.com/media-centre/news-releases/uk-nuclear-fleet-strategy-update-september-2021'},
{year:2022,name:'Hunterston B: end of generation',url:'https://www.edfenergy.com/about/nuclear/decommissioning'},
{year:2022,name:'Hinkley Point B: end of generation',url:'https://www.edfenergy.com/media-centre/news-releases/new-dawn-hinkley-point-b-ends-generation'}]},
{id:'conflicts',name:'Military deployments',group:'Defence',notes:'Selected milestones involving British forces. Includes combat and peacekeeping. Markers identify starts or major events, not annual totals, full campaign durations, costs or causal effects on the economy.',events:[
{year:1990,name:'British deployment for the Gulf crisis',url:'https://www.nam.ac.uk/explore/gulf-war'},
{year:1991,name:'Gulf War combat operations',url:'https://www.nam.ac.uk/explore/gulf-war'},
{year:1999,name:'Kosovo: British peacekeeping deployment',url:'https://www.nam.ac.uk/explore/kosovo'},
{year:2000,name:'Sierra Leone: Operations Palliser and Barras',url:'https://paradata.org.uk/content/4634960'},
{year:2001,name:'Afghanistan: British operations begin',url:'https://www.nam.ac.uk/explore/war-afghanistan'},
{year:2003,name:'Iraq: invasion and subsequent campaign',url:'https://www.nam.ac.uk/subjects/2000s'}]},
{id:'royal',name:'Royal state visits abroad',group:'Culture & curiosities',notes:'Selected outbound state visits by the reigning monarch. Not a complete annual count; official visits, Commonwealth tours and other royal family travel are not interchangeable with state visits.',events:[
{year:1991,name:'Elizabeth II: state visit to the USA',url:'https://www.royal.uk/us-state-visit-programme'},
{year:2007,name:'Elizabeth II: state visit to the USA',url:'https://www.royal.uk/us-state-visit-programme'},
{year:2010,name:'Elizabeth II: state visits to Oman and UAE',url:'https://www.royal.uk/sites/default/files/media/full_report_2010-11.pdf'},
{year:2023,name:'Charles III: state visit to Germany',url:'https://www.royal.uk/media-pack/financial-reports-2022-23'}]}
];
const UNSOURCED_TRACKS=[
{name:'Schools opened / closed',group:'Public services',reason:'No consistent UK annual opening/closure register imported. Academy conversions must not be counted as new schools.'},
{name:'Universities opened / closed',group:'Public services',reason:'No harmonised annual UK series imported. University status changes, mergers and campuses require separate definitions.'},
{name:'Train stations opened',group:'Infrastructure',reason:'No verified annual openings series imported. Changes in total station stock cannot identify gross openings or reopenings.'},
{name:'Banks opened / closed',group:'Business & travel',reason:'Bank legal entities and retail branches are different. Branch density is available; annual openings and closures have not been imported.'},
{name:'Foxes hunted',group:'Culture & curiosities',reason:'No consistent, verified UK annual kill-count series imported. A missing observation must not be shown as zero.'},
{name:'Banknotes printed',group:'Money & work',reason:'No annual production series imported. Banknotes, reserve creation and broad money are different measures. Broad money / GDP is available separately.'}
];
const EXTRA_COLORS=['#368c83','#9675b6','#467bc5','#b78c39','#bc737c','#5798a6'];
let enabledTracks=new Set();
try{const saved=JSON.parse(localStorage.getItem('chancellor-timeline-preferences')||'[]');if(Array.isArray(saved))enabledTracks=new Set(saved.filter(id=>[...EXTRA_TRACKS,...TIMELINE_EVENTS].some(t=>t.id===id)));}catch{}
function saveTrackPrefs(){try{localStorage.setItem('chancellor-timeline-preferences',JSON.stringify([...enabledTracks]));}catch{}}
function trackCoverage(t){if(t.events)return 'Selected events · '+Math.min(...t.events.map(e=>e.year))+'–'+Math.max(...t.events.map(e=>e.year));const y=Object.keys(t.values).map(Number);return Math.min(...y)+'–'+Math.max(...y);}
function trackValue(n,unit,compact=false){if(!Number.isFinite(n))return 'No data';if(unit.startsWith('£/'))return '£'+fmt(n,2);if(unit.startsWith('p/'))return fmt(n,2)+'p';if(unit.startsWith('index'))return fmt(n,1);if(unit.includes('%')||unit==='years'||unit==='births per woman'||unit==='per 100k adults')return fmt(n,unit==='years'?1:2)+(unit==='%'?'%':unit==='% of GDP'?'% GDP':'');if(compact&&Math.abs(n)>=1e6)return fmt(n/1e6,1)+'m';if(compact&&Math.abs(n)>=1000)return fmt(n/1000,1)+'k';return fmt(n,0);}
function toggleTrack(id,on){if(on)enabledTracks.add(id);else enabledTracks.delete(id);saveTrackPrefs();renderTimeline();}
function openTrackPicker(){
 modal(`<div class="eyebrow">BUILD YOUR OWN VIEW</div><h2>Add timelines.</h2><p>Tick a track to place it below the economic charts. All optional tracks start off.</p><input id="trackSearch" type="search" aria-label="Search timelines" placeholder="Search population, schools, strikes…"><div class="track-picker-top"><span id="enabledCount"></span><button id="clearTracks">Clear optional tracks</button></div><div id="trackOptions"></div><div class="info">Historical context, not simulated outcomes. Shared timing does not establish causation. Selections are remembered on this device.</div>`);
 function options(){
  const query=$('#trackSearch').value.toLowerCase().trim();const all=[...EXTRA_TRACKS,...TIMELINE_EVENTS];const groups=['Consumer prices','People','Public services','Business & travel','Infrastructure','Defence','Money & work','Culture & curiosities'];
  let html='';for(const group of groups){const matching=all.filter(t=>t.group===group&&`${t.name} ${t.notes} ${group}`.toLowerCase().includes(query));const missing=UNSOURCED_TRACKS.filter(t=>t.group===group&&`${t.name} ${group}`.toLowerCase().includes(query));if(!matching.length&&!missing.length)continue;
   html+=`<h3 class="picker-group">${group}</h3>`+matching.map(t=>`<div class="picker-option"><label><input type="checkbox" data-toggle="${t.id}" ${enabledTracks.has(t.id)?'checked':''}><span><strong>${esc(t.name)}</strong><small>${t.events?'Event markers':esc(t.unit)} · ${trackCoverage(t)}</small></span></label><button class="track-info" data-info="${t.id}" aria-label="Source and definition for ${esc(t.name)}">ⓘ</button></div>`).join('')+missing.map(t=>`<div class="picker-option unavailable"><label><input type="checkbox" disabled><span><strong>${esc(t.name)}</strong><small>Not yet sourced</small></span></label><details><summary>Why?</summary><p>${esc(t.reason)}</p></details></div>`).join('');
  }$('#trackOptions').innerHTML=html||'<p>No matching timelines.</p>';$('#enabledCount').textContent=enabledTracks.size+' selected';
  $$('[data-toggle]').forEach(el=>el.onchange=()=>{toggleTrack(el.dataset.toggle,el.checked);$('#enabledCount').textContent=enabledTracks.size+' selected';});
  $$('[data-info]').forEach(el=>el.onclick=()=>showTrackInfo(el.dataset.info,true));
 }
 $('#trackSearch').oninput=options;$('#clearTracks').onclick=()=>{enabledTracks.clear();saveTrackPrefs();renderTimeline();options();};options();
}
function showTrackInfo(id,back=false){
 const t=[...EXTRA_TRACKS,...TIMELINE_EVENTS].find(t=>t.id===id);if(!t)return;
 const body=t.events?`<div class="event-list">${t.events.map(e=>`<a href="${esc(e.url)}" target="_blank" rel="noopener"><b>${e.year}</b><span>${esc(e.name)} ↗</span></a>`).join('')}</div>`:`<div class="info"><strong>${year}: ${trackValue(t.values[year],t.unit)} ${Number.isFinite(t.values[year])&&!t.unit.includes('%')?esc(t.unit):''}</strong><br>Coverage: ${trackCoverage(t)}. Blank years are missing observations, never zero.</div><a href="${esc(t.source)}" target="_blank" rel="noopener">Open original source ↗</a><details><summary>Annual observations</summary><div class="table-scroll" style="max-height:350px"><table class="data-table"><thead><tr><th>Year</th><th>${esc(t.unit)}</th></tr></thead><tbody>${Object.entries(t.values).reverse().map(([y,v])=>`<tr><td>${y}</td><td>${trackValue(v,t.unit)}</td></tr>`).join('')}</tbody></table></div></details>`;
 modal(`<div class="eyebrow">${esc(t.group)} · SOURCE & DEFINITION</div><h2>${esc(t.name)}</h2><p>${esc(t.notes)}</p>${body}<p class="fine">Retrieved 23 September 2026. Imported data can lag or be revised. Optional tracks do not feed the fiscal simulation.</p><button id="trackToggleDetail" class="wide">${enabledTracks.has(id)?'Remove from':'Add to'} timeline</button><button id="backPicker" class="wide">← All timelines</button>`);
 $('#trackToggleDetail').onclick=()=>{toggleTrack(id,!enabledTracks.has(id));showTrackInfo(id,back);};$('#backPicker').onclick=openTrackPicker;
}
function extraTimelineHtml(first,last){
 const ds=DATA.filter(d=>d.year>=first&&d.year<=last),years=ds.map(d=>d.year);let html='';
 [...EXTRA_TRACKS,...TIMELINE_EVENTS].filter(t=>enabledTracks.has(t.id)).forEach((t,i)=>{
  const color=EXTRA_COLORS[i%EXTRA_COLORS.length];const v=t.values?.[year];let chart;
  if(t.events){const inRange=t.events.filter(e=>e.year>=first&&e.year<=last);const grouped={};inRange.forEach(e=>(grouped[e.year]??=[]).push(e));chart=`<div class="event-lane" aria-label="${esc(t.name)}"><span class="event-axis"></span><span class="event-cursor" style="left:${(year-first)/(last-first)*100}%"></span>${Object.entries(grouped).map(([y,events])=>`<button class="event-dot" style="left:${(+y-first)/(last-first)*100}%;--event-color:${color}" data-event-track="${t.id}" data-event-year="${y}" title="${y}: ${esc(events.map(e=>e.name).join('; '))}" aria-label="${y}: ${esc(events.map(e=>e.name).join('; '))}">${events.length>1?events.length:'◆'}</button>`).join('')}${!inRange.length?'<span class="track-empty">No listed events in this window</span>':''}</div>`;
  }else{const vals=ds.map(d=>t.values[d.year]??null);chart=vals.some(Number.isFinite)?lineSvg(vals,color,900,45,year,years):'<div class="track-empty">No observations in this window</div>';}
  const current=t.events?(t.events.some(e=>e.year===year)?'Event in '+year:'Selected events'):trackValue(v,t.unit,true);
  html+=`<div class="track optional-track"><div class="track-label"><button class="track-label-button" data-info="${t.id}" title="Source and definition">${esc(t.name)} ⓘ</button><strong style="color:${color}">${current}</strong><small class="chart-range">${t.events?'Event markers':esc(t.unit)} · ${trackCoverage(t).replace('Selected events · ','')}</small></div><div class="optional-chart" ${t.events?'':`data-chart="extra-${t.id}"`}>${chart}<button class="remove-track" data-remove="${t.id}" aria-label="Remove ${esc(t.name)}">×</button></div></div>`;
 });return html;
}
function bindExtraTracks(){
 const b=$('#addTimelines');b.textContent=enabledTracks.size?'＋ Timelines · '+enabledTracks.size:'＋ Add timelines';
 $$('#timeline [data-info]').forEach(el=>el.onclick=()=>showTrackInfo(el.dataset.info));
 $$('[data-remove]').forEach(el=>el.onclick=e=>{e.stopPropagation();toggleTrack(el.dataset.remove,false);});
 $$('[data-event-track]').forEach(el=>el.onclick=()=>{setYear(+el.dataset.eventYear);showTrackInfo(el.dataset.eventTrack);});
}
