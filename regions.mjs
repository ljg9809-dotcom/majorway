import fs from 'node:fs';
const data=JSON.parse(fs.readFileSync(new URL('./data/regions.json',import.meta.url),'utf8'));
export const provinces=data.provinces;
export const regionMetadata={source:data.source,retrievedAt:data.retrievedAt,basis:data.basis,townCount:data.townCount};
const extra={'서울특별시':['서울'],'부산광역시':['부산'],'대구광역시':['대구'],'인천광역시':['인천'],'대전광역시':['대전'],'울산광역시':['울산'],'세종특별자치시':['세종'],'경기도':['경기'],'강원특별자치도':['강원','강원도'],'충청북도':['충북'],'충청남도':['충남'],'전북특별자치도':['전북','전라북도'],'경상북도':['경북'],'경상남도':['경남'],'제주특별자치도':['제주','제주도'],'전남광주통합특별시':['전남광주','전남','전라남도','광주','광주광역시']};
const escape=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const aliases=new Map(provinces.flatMap(p=>[p.name,...extra[p.name]||[]].map(name=>[name,p])));
const provincePattern=new RegExp('(?:^|[\\s,(;/])('+[...aliases.keys()].sort((a,b)=>b.length-a.length).map(escape).join('|')+')(?=$|[\\s,);/])','g');
const tokenMatch=(text,name)=>new RegExp('(?:^|[\\s(])'+escape(name).replaceAll(' ','\\s*')+'(?=$|[\\s),;])').test(text);
export function locationOf(region){
 const text=String(region||'').trim(),locations=[];
 const markers=[...text.matchAll(provincePattern)];
 for(let i=0;i<markers.length;i++){
  const p=aliases.get(markers[i][1]),chunk=text.slice(markers[i].index+markers[i][0].length,markers[i+1]?.index??text.length);
  let found=false;
  const districtMarkers=p.districts.filter(d=>!d.direct).map(d=>({d,match:chunk.match(new RegExp('(?:^|[\\s(])'+escape(d.name).replaceAll(' ','\\s*')+'(?=$|[\\s),;])'))})).filter(x=>x.match).sort((a,b)=>a.match.index-b.match.index);
  const entries=districtMarkers.length?districtMarkers:p.districts.filter(d=>d.direct).map(d=>({d,match:null}));
  for(let di=0;di<entries.length;di++){
   const {d,match}=entries[di],districtText=match?chunk.slice(match.index+match[0].length,entries[di+1]?.match?.index??chunk.length):chunk;
   if(d.direct&&!chunk.trim()){locations.push({province:p.id,district:'',town:''});found=true;continue;}
   const towns=d.towns.filter(t=>tokenMatch(districtText,t.name));
   if(d.direct&&!towns.length)continue;
   if(towns.length)for(const t of towns)locations.push({province:p.id,district:d.id,town:t.id});
   else locations.push({province:p.id,district:d.id,town:''});
   found=true;
  }
  if(!found){
   const parents=[...new Set(p.districts.filter(d=>d.name.includes(' ')).map(d=>d.name.split(' ')[0]))].filter(name=>tokenMatch(chunk,name));
   if(parents.length)for(const municipality of parents)locations.push({province:p.id,district:'',town:'',municipality});
   else locations.push({province:p.id,district:'',town:''});
  }
 }
 if(/(?:^|[\s,])전국(?:$|[\s,])/.test(text))for(const p of provinces)locations.push({province:p.id,district:'',town:''});
 const unique=[...new Map(locations.map(l=>[JSON.stringify(l),l])).values()];
 const ids=[...new Set(unique.map(l=>l.province))];
 return {city:ids.length===1?provinces.find(p=>p.id===ids[0]).name:'',provinces:ids,locations:unique,detail:unique.some(l=>l.town)?'읍·면·동 표기':unique.some(l=>l.district)?'시·군·구까지만 표기':unique.length?'시·도까지만 표기':'국내 근무지역 미확인'};
}
export function regionSelection(params){
 const province=params.get('province')||'',district=params.get('district')||'',town=params.get('town')||'';
 const p=provinces.find(p=>p.id===province),d=p?.districts.find(d=>d.id===district);
 return {province,district,town,p,d};
}
export function validRegion(params){
 const {province,district,town,p,d}=regionSelection(params);
 return !params.get('area')&&(!province||!!p)&&(!district||!!d)&&(!town||!!d?.towns.some(t=>t.id===town));
}
export function passesRegion(location,params){
 if(!location.locations.length)return false;
 const {province,district,town,d}=regionSelection(params),unknown=params.get('includeUnknownLocation')==='1';
 return location.locations.some(l=>(!province||l.province===province)&&(
  (!district&&!town)||
  ((!district||l.district===district||d?.direct&&!l.district)&&(!town||l.town===town))||
  (unknown&&(!l.municipality||d?.name.split(' ')[0]===l.municipality)&&((district&&!l.district)||(town&&l.district===district&&!l.town)))
 ));
}
