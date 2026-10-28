import {clean} from './catalog.mjs';
export const universitySource='https://www.data.go.kr/data/15158666/openapi.do';
const endpoint='https://apis.data.go.kr/B340014/SchoolMajorInfoService/getSchoolMajorInfo';
const fields={schlNm:'school',korMjrNm:'name',svyYr:'year',clgNm:'college',dghtDivNm:'shift',edcCrseLtrCtnt:'curriculum',pwayEmplLtrCtnt:'occupations',pbnfDgriCrseDivNm:'degree',lsnTrmNm:'duration',schlMjrStatNm:'status',schlKndNm:'schoolKind',schlMjrCharNm:'characteristic',onsfSrsClftNm:'category',stdClftMjrId:'classificationCode',kediMjrId:'majorCode',mjrAreaNm:'region',mjrAreaSignguNm:'district',eschlPscpNum:'admissionQuota',grdtNum:'graduates',lstUpdtDtm:'dataDate',mjrUpdtDtm:'updatedDate'};
export class UniversityError extends Error {constructor(message,status=502){super(message);this.status=status;}}
function xmlValue(xml,tag){
 const matched=xml.match(new RegExp('<'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)</'+tag+'\\s*>'));
 if(!matched)return '';
 return matched[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,(_,v)=>v).replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{const num=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return num>0&&num<=0x10ffff&&!(num>=0xd800&&num<=0xdfff)?String.fromCodePoint(num):'';}).replace(/&quot;/g,'"').replace(/&apos;/g,"'");
}
export function parseUniversityXml(xml,key=''){
 if(typeof xml!=='string'||xml.length>8000000||/<!DOCTYPE|<!ENTITY/i.test(xml))throw new UniversityError('대학 API 응답 형식을 확인하지 못했습니다.');
 const code=xmlValue(xml,'resultCode'),gatewayCode=xmlValue(xml,'returnReasonCode');
 if(gatewayCode||!['00','0','0000'].includes(code))throw new UniversityError('대학 API 인증 또는 제공 상태를 확인해 주세요.');
 const totalText=xmlValue(xml,'totalCount').trim(),total=Number(totalText);
 if(!/^\d+$/.test(totalText)||!Number.isSafeInteger(total)||total<0)throw new UniversityError('대학 API 건수 정보를 확인하지 못했습니다.');
 const rows=[...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item\s*>/g)].map(m=>Object.fromEntries(Object.entries(fields).map(([tag,name])=>[name,clean(xmlValue(m[1],tag),key)])));
 if(total>0&&!rows.length)throw new UniversityError('대학 API 학과 목록을 확인하지 못했습니다.');
 return {rows,total};
}
let cached=new Map(),pending=new Map();
export async function fetchSchoolMajors(school,year,fetchImpl=globalThis.fetch){
 let key=(process.env.UNIVERSITY_API_KEY||'').trim();if(!key)throw new UniversityError('대학 학과 API 키를 등록한 뒤 서버를 다시 시작해 주세요.',503);
 try{if(key.includes('%'))key=decodeURIComponent(key);}catch{}
 const identity=school+'|'+year,existing=cached.get(identity);
 if(existing&&Date.now()-existing.time<600000)return existing;
 if(pending.has(identity))return pending.get(identity);
 const promise=(async()=>{
  let rows=[],total=0;
  for(let page=1;page<=10;page++){
   const url=new URL(endpoint);url.search=new URLSearchParams({serviceKey:key,svyYr:String(year),schlKrnNm:school,pageNo:String(page),numOfRows:'100'});
   let response,text;
   try{response=await fetchImpl(url,{redirect:'error',signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error();text=await response.text();}catch{throw new UniversityError('대학 API에 연결하지 못했습니다. 잠시 후 다시 조회해 주세요.');}
   const data=parseUniversityXml(text,key);rows.push(...data.rows);total=data.total;
   if(rows.length>=total||!data.rows.length)break;
  }
  const result={rows,total,scanned:rows.length,partial:rows.length<total,time:Date.now(),year};
  if(cached.size>=40)cached.delete(cached.keys().next().value);cached.set(identity,result);return result;
 })();
 pending.set(identity,promise);try{return await promise;}finally{pending.delete(identity);}
}
const normalized=s=>String(s||'').normalize('NFKC').replace(/[\s·ㆍ・]/g,'').toLowerCase();
export async function universityDetails(profile,schoolId,requestedYear=2026,fetchImpl=globalThis.fetch){
 const offer=profile.department.offerings.find(o=>o.schoolId===schoolId);
 if(!offer)throw new UniversityError('선택한 학과의 개설 대학을 선택해 주세요.',400);
 let result=await fetchSchoolMajors(offer.school,requestedYear,fetchImpl),fallback=false;
 if(result.total===0&&requestedYear===2026){result=await fetchSchoolMajors(offer.school,2025,fetchImpl);fallback=true;}
 const records=result.rows.filter(r=>normalized(r.school)===normalized(offer.school)&&normalized(r.name)===normalized(profile.name)&&/학사/.test(r.degree)&&!/석사|박사/.test(r.degree));
 return {source:universitySource,school:offer.school,department:profile.name,requestedYear,providedYear:result.year,fallback,records,totalForSchool:result.total,scanned:result.scanned,partial:result.partial,updatedAt:new Date(result.time).toISOString(),note:fallback?'이 대학의 2026년 API 자료가 없어 2025년 자료를 조회했습니다.':'선택한 연도의 공식 API 자료입니다.'};
}
