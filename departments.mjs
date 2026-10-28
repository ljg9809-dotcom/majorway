import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {majors} from './catalog.mjs';
const dataset=JSON.parse(fs.readFileSync(new URL('./data/university-departments.json',import.meta.url),'utf8'));
export const departmentMetadata=dataset.metadata;
const index=new Map();
for(const row of dataset.records){
 if(!row.mjr_nm||/^(기타\(소속학과없음\)|학과없음)$/.test(row.mjr_nm))continue;
 const name=row.mjr_nm,small=row.srs_sclft_nm;
 const id=createHash('sha256').update(name+'\0'+small).digest('hex').slice(0,16);
 if(!index.has(id))index.set(id,{id,name,large:row.srs_lclft_nm,middle:row.srs_mclft_nm,small,offerings:[]});
 index.get(id).offerings.push({schoolId:row.schl_id,school:row.schl_nm,campus:row.psbs_div_nm,status:row.schl_mjr_stat_nm,region:row.mjr_area_nm,kind:row.schl_knd_nm,shift:row.dght_div_nm,code:row.schl_mjr_id});
}
const compact=s=>s.normalize('NFKC').replace(/[\s·ㆍ・.,()\[\]_-]/g,'').toLowerCase();
export function searchDepartments(query='',school='',includeClosed=false,limit=30){
 const q=compact(String(query).slice(0,100)),s=compact(String(school).slice(0,100));
 const result=[];
 for(const dept of index.values()){
  if(q&&!compact(dept.name).includes(q)&&!compact(dept.small).includes(q)&&!compact(dept.middle).includes(q))continue;
  const offers=dept.offerings.filter(o=>(includeClosed||o.status!=='폐과')&&(!s||compact(o.school).includes(s)));
  if(!offers.length)continue;
  const schools=[...new Set(offers.map(o=>o.school))];
  result.push({id:dept.id,name:dept.name,small:dept.small,middle:dept.middle,large:dept.large,schoolCount:schools.length,schools:schools.slice(0,4),closedOnly:offers.every(o=>o.status==='폐과'),rank:compact(dept.name)===q?0:compact(dept.name).startsWith(q)?1:2});
 }
 result.sort((a,b)=>a.rank-b.rank||a.name.localeCompare(b.name,'ko')||a.small.localeCompare(b.small,'ko'));
 return {items:result.slice(0,limit).map(({rank,...item})=>item),total:result.length,metadata:departmentMetadata};
}
const role=(name,desc,words)=>({name,desc,words});
const base=id=>majors.find(m=>m.id===id).roles;
const specs=[
 [/경영정보/,()=>[base('business')[0],...base('software')]],
 [/글로벌.*경영|국제.*경영|무역|유통|물류|국제통상/,()=>[base('business')[0],role('국제·통상·물류','국제 협력과 무역·물류 관련 행정 및 사업을 지원해요.',['국제','통상','무역','물류','유통','해외','외국어'])]],
 [/회계|세무|금융|보험/,()=>[base('business')[1],role('금융·경제 조사','금융·경제 자료를 정리하고 관련 사업을 지원해요.',['금융','경제','통계','조사'])]],
 [/관광|호텔|항공서비스|컨벤션/,()=>base('tourism')],
 [/경영|경제|비서|행정|정치외교|부동산/,()=>base('business')],
 [/전산|컴퓨터|소프트웨어|인공지능|정보.*통신|정보보안|데이터|반도체/,()=>base('software')],
 [/사회복지|심리|아동|가족|상담/,()=>base('welfare')],
 [/간호|의학|의료|보건|재활|약학|치위생|응급|의공/,()=>[role('보건·의료 지원','공공 보건사업이나 전공 관련 의료 업무를 살펴봐요. 자격·면허 요건을 확인하세요.',['보건','의료','간호','재활','건강','의약','임상'])]],
 [/식품|영양|조리/,()=>[role('식품·영양·위생','급식·영양 관리와 식품 위생 관련 업무를 살펴봐요.',['식품','영양','급식','조리','위생'])]],
 [/법학|경찰|군사|국방|안보/,()=>[role('법무·공공안전','기관의 법무·민원과 공공안전 관련 업무를 살펴봐요.',['법무','법률','경찰','안전','민원','행정'])]],
 [/문헌정보|교육/,()=>base('education')],
 [/디자인|미술|전시|문화|영상|영화|방송|광고|홍보|게임|만화|애니메이션|언론/,()=>base('design')],
 [/체육|스포츠|무용/,()=>[role('체육·생활체육','주민 체육 프로그램과 스포츠시설 운영을 지원해요.',['체육','스포츠','운동','생활체육','체육시설'])]],
 [/음악|국악|성악|기악|작곡|연극|공예|예술/,()=>[role('문화예술 사업','공연과 문화예술 프로그램 운영·기획을 지원해요.',['문화','예술','공연','음악','전시'])]],
 [/농림|수산|산림|원예|축산|동물|조경/,()=>[role('농림·수산·생태','농림·수산과 생태·녹지 관련 현장 및 연구 업무를 살펴봐요.',['농업','산림','수산','생태','조경','녹지','동물'])]],
 [/기계|전기|전자|건축|토목|도시공학|교통|자동차|철도|항공|선박|조선|산업|안전|에너지|재료|금속|섬유|고분자|화학공학|신소재/,()=>base('engineering')],
 [/환경|해양|생명|바이오|화학|물리|수학|통계|천문|지구|지질/,()=>[...base('environment'),role('과학·자료 분석','전공 관련 연구보조와 조사·통계 업무를 살펴봐요.',['연구','통계','분석','실험','조사'])]],
 [/어문|문학|언어|국문|영어|중국|일본|프랑스|독일|러시아|스페인|국제학|국제지역/,()=>[role('언어·국제 교류','언어 역량을 활용하는 번역·국제 교류와 교육 업무를 살펴봐요.',['번역','통역','국제','외국어','한국어','교육'])]],
 [/역사|고고|철학|윤리|인문|종교|인류|사회학/,()=>[role('인문·사회 조사','인문·사회 분야의 자료 조사와 문화·교육 사업을 지원해요.',['연구','조사','문화','교육','기록'])]]
];
export function getDepartment(id){
 const d=index.get(id);if(!d)return null;
 // Specific department names take precedence over the broader official subject.
 const direct=specs.find(([re])=>re.test(d.name));
 const hit=direct||specs.find(([re])=>re.test(d.small+' '+d.middle));
 const roles=hit?hit[1]():[];
 return {id:'department-'+d.id,name:d.name,group:d.middle,subs:[d.name],roles,skills:[],department:{...d,source:departmentMetadata.source,year:departmentMetadata.year,mapping:hit?'keyword-inference':'unmapped'},officialKeywords:[...new Set(roles.flatMap(r=>r.words))]};
}
