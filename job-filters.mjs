// Three service areas follow the grouping used by Busan Development Institute.
// These areas are browsing groups, not administrative districts.
export const busanAreas = [
 {id:'east',name:'동부산권',districts:['해운대구','수영구','기장군']},
 {id:'central',name:'중부산권',districts:['중구','서구','동구','영도구','부산진구','동래구','남구','금정구','연제구']},
 {id:'west',name:'서부산권',districts:['강서구','북구','사상구','사하구']}
];
export const experienceOptions=['신입','경력','경력무관','정보 미제공'];
export const employmentOptions=['인턴','계약직','정규직','공무직','무기계약직','임기제','정보 미제공'];
export const areaSource='https://data.bdi.re.kr/PDF/View.do?dir=report&path=RPT_00000000001&savename=20250715153603_87757';
const districts=busanAreas.flatMap(a=>a.districts);
const districtPattern=new RegExp(districts.slice().sort((a,b)=>b.length-a.length).join('|'),'g');
const otherCity=/(?:^|[\s(])(?:서울(?:특별시)?|대구(?:광역시)?|인천(?:광역시)?|광주(?:광역시)?|대전(?:광역시)?|울산(?:광역시)?|세종(?:특별자치시)?|경기도|강원(?:특별자치도)?|충청[남북]도|전라[남북]도|전북특별자치도|전남광주통합특별시|경상[남북]도|제주(?:특별자치도)?)/;
const compact=s=>String(s??'').replace(/\s+/g,'').replace(/제(?=\d+동)/g,'');
export function locationOf(region){
 const text=String(region||'').trim(),locations=[];
 let cityOnly=false;
 for(let chunk of text.split(/[,;\/\n]|\s+및\s+/)){
  const hasBusan=/부산/.test(chunk),other=chunk.match(otherCity);
  if(other&&!hasBusan)continue;
  if(hasBusan){chunk=chunk.slice(chunk.indexOf('부산'));const next=chunk.match(otherCity);if(next)chunk=chunk.slice(0,next.index);cityOnly=true;}
  const found=[...chunk.matchAll(districtPattern)];
  // A district-only value is interpreted within this Busan-specific provider.
  for(let i=0;i<found.length;i++){
   const district=found[i][0],tail=chunk.slice(found[i].index+district.length,found[i+1]?.index??chunk.length);
   const towns=[...tail.matchAll(/(?:^|[\s(])[가-힣][가-힣0-9제·ㆍ]*(?:동(?:\d+가)?|읍|면)(?=$|[\s),;])/g)].map(m=>compact(m[0].replace(/^[\s(]+/,'')));
   const area=busanAreas.find(a=>a.districts.includes(district)).id;
   if(towns.length)for(const town of towns)locations.push({area,district,town});
   else locations.push({area,district,town:''});
  }
 }
 const unique=[...new Map(locations.map(l=>[JSON.stringify(l),l])).values()];
 return {city:cityOnly||unique.length?'부산광역시':'',locations:unique,detail:unique.length?(unique.some(l=>l.town)?'동·읍·면 표기':'구·군까지만 표기'):cityOnly?'상세 지역 미제공':'부산 근무 여부 미확인'};
}
function clauseWithoutPreference(s){return s.split(/[\n.;。]/).filter(c=>!/우대/.test(c)).join(' ');}
export function careerOf(job){
 const text=`${job.title||''} ${job.content||''}`;
 if(/경력\s*(?:무관|제한\s*없음|관계\s*없음)|경력\s*요건\s*없음/.test(text))return '경력무관';
 const title=job.title||'',requirements=clauseWithoutPreference(job.content||'');
 const entry=/신입/.test(title)||/신입\s*(?:지원|가능|채용|모집|및|·|ㆍ|\/|,|또는|사원)|(?:구분|대상|조건|요건|자격)\s*[:：]?\s*신입/.test(requirements);
 const experienced=/경력(?:직|자|사원|채용|\s*모집)/.test(title)||/경력\s*\d+\s*(?:년|개월)\s*(?:이상|필수)|(?:요건|자격|대상|구분)\s*[:：]?\s*경력|경력직|경력자\s*(?:채용|모집|지원)/.test(requirements)||/신입\s*(?:및|·|ㆍ|\/|,|또는)\s*경력/.test(text);
 return entry&&experienced?'신입·경력':entry?'신입':experienced?'경력':'정보 미제공';
}
export function employmentOf(job){
 const type=job.type||'',title=job.title||'',text=type+' '+title;
 const values=[];
 if(/인턴/.test(text))values.push('인턴');
 if(/계약직|기간제/.test(text.replaceAll('무기계약','')))values.push('계약직');
 if(/공무직/.test(text))values.push('공무직');
 if(/무기계약/.test(text))values.push('무기계약직');
 if(/임기제/.test(text))values.push('임기제');
 if(/정규직/.test(text)&&!/비정규직|정규직\s*전환/.test(text))values.push('정규직');
 return values.length?values:['정보 미제공'];
}
export function annotateJob(job){return {...job,location:locationOf(job.region),experience:careerOf(job),employment:employmentOf(job)};}
export function locationCatalog(jobs=[]){
 return {city:'부산광역시',source:areaSource,townBasis:'공고 근무지역 표기 기준 · 법정동/행정동 자동 변환 없음',areas:busanAreas.map(a=>({...a,districts:a.districts.map(name=>({name,towns:[...new Set(jobs.flatMap(j=>(j.location||locationOf(j.region)).locations.filter(l=>l.district===name&&l.town).map(l=>l.town)))].sort((a,b)=>a.localeCompare(b,'ko'))}))})),experienceOptions,employmentOptions};
}
export function validateFilters(params){
 const area=params.get('area')||'',district=params.get('district')||'',town=params.get('town')||'';
 const careers=params.getAll('experience'),types=params.getAll('employment');
 if(area&&!busanAreas.some(a=>a.id===area))return false;
 if(district&&!districts.includes(district))return false;
 if(area&&district&&!busanAreas.find(a=>a.id===area).districts.includes(district))return false;
 if(town&&(!district||town.length>40||!/(?:동(?:\d+가)?|읍|면)$/.test(town)))return false;
 return careers.every(x=>experienceOptions.includes(x))&&types.every(x=>employmentOptions.includes(x));
}
export function passesFilters(job,params){
 const area=params.get('area')||'',district=params.get('district')||'',town=params.get('town')||'';
 const unknown=params.get('includeUnknownLocation')==='1',loc=job.location;
 if(loc.city!=='부산광역시')return false;
 const hasSelection=area||district||town;
 if(hasSelection){
  const matches=loc.locations.some(l=>(!area||l.area===area)&&(!district||l.district===district)&&(!town||compact(l.town)===compact(town)));
  const missing=unknown&&(loc.locations.length===0||town&&loc.locations.some(l=>(!area||l.area===area)&&l.district===district&&!l.town));
  if(!matches&&!missing)return false;
 }
 const careers=params.getAll('experience'),types=params.getAll('employment');
 if(careers.length&&!careers.some(x=>x===job.experience||x==='신입'&&['신입·경력','경력무관'].includes(job.experience)||x==='경력'&&['신입·경력','경력무관'].includes(job.experience)))return false;
 if(types.length&&!types.some(x=>job.employment.includes(x)))return false;
 return true;
}
