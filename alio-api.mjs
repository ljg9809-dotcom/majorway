import {createHash} from 'node:crypto';
import {clean,dateOnly} from './catalog.mjs';

export const alioSource='https://job.alio.go.kr/recruit.do';
const endpoint='https://apis.data.go.kr/1051000/recruitment/list';
export class AlioError extends Error {constructor(message,status=502){super(message);this.status=status;}}
export function alioKey(){let key=(process.env.ALIO_API_KEY||process.env.BUSAN_API_KEY||'').trim();try{if(key.includes('%'))key=decodeURIComponent(key);}catch{}return key;}
const pieces=value=>Array.isArray(value)?value.map(String):String(value??'').split(/[,|;]/).map(v=>v.trim()).filter(Boolean);
export function normalizeAlio(row,key=''){
 const pick=name=>clean(Array.isArray(row[name])?row[name].join(', '):row[name],key);
 const careerCodes=pieces(row.recrutSe),career=pick('recrutSeNm');
 const experience=careerCodes.includes('R2030')||/신입.*경력|경력.*신입/.test(career)?'신입·경력':careerCodes.includes('R2010')?'신입':careerCodes.includes('R2020')?'경력':/경력무관|관계없음/.test(career)?'경력무관':'정보 미제공';
 const types=pieces(row.hireTypeLst),employment=[];
 for(const [codes,label] of [[['R1010'],'정규직'],[['R1030'],'무기계약직'],[['R1040'],'계약직'],[['R1060','R1070'],'인턴']])if(codes.some(code=>types.includes(code)))employment.push(label);
 const id=pick('recrutPblntSn');
 // Link to the official public notice by its numeric ID, never an arbitrary upstream URL.
 const sourceUrl=/^\d+$/.test(id)?`https://job.alio.go.kr/recruitview.do?idx=${id}`:alioSource;
 return {id,source:'alio',title:pick('recrutPbancTtl'),agency:pick('instNm'),field:pick('ncsCdNmLst'),region:pick('workRgnNmLst'),type:pick('hireTypeNmLst'),start:dateOnly(row.pbancBgngYmd),end:dateOnly(row.pbancEndYmd),method:'잡알리오 원문 확인',content:[['지원 자격',pick('aplyQlfcCn')],['우대 조건',pick('prefCn')],['우대 사항',pick('prefCondCn')],['전형 절차',pick('scrnprcdrMthdExpln')],['결격 사유',pick('disqlfcRsn')]].filter(([,text])=>text).map(([name,text])=>`${name}\n${text}`).join('\n\n'),experience,employment:employment.length?employment:['정보 미제공'],careerLabel:career,ongoing:row.ongoingYn==='N'?'N':row.ongoingYn==='Y'?'Y':'',sourceUrl};
}
export function parseAlio(data,key=''){
 if(!data||typeof data!=='object'||Array.isArray(data))throw new AlioError('잡알리오 응답 형식을 확인하지 못했습니다.');
 if(!['0','00','0000','200'].includes(String(data.resultCode))){
  const code=/^\d{1,3}$/.test(String(data.resultCode))?` (응답 코드 ${data.resultCode})`:'';
  throw new AlioError(`잡알리오 API 인증 또는 이용 상태를 확인해 주세요${code}. 해당 API 활용신청 승인과 Vercel BUSAN_API_KEY 값을 확인해 주세요.`);
 }
 const total=Number(data.totalCount);if(!/^\d+$/.test(String(data.totalCount))||!Number.isSafeInteger(total))throw new AlioError('잡알리오 전체 공고 건수를 확인하지 못했습니다.');
 let rows=data.result;
 if(rows&&typeof rows==='object'&&!Array.isArray(rows))rows=rows.item;
 if(rows==null&&total===0)rows=[];
 if(!Array.isArray(rows))throw new AlioError('잡알리오 채용공고 목록을 확인하지 못했습니다.');
 const jobs=rows.filter(r=>r&&typeof r==='object').map(r=>normalizeAlio(r.item&&typeof r.item==='object'?r.item:r,key));
 if(total>0&&!jobs.length)throw new AlioError('잡알리오 채용공고 목록이 비어 있습니다. 잠시 후 다시 조회해 주세요.');
 return {jobs,total};
}
let cached=null,pending=null;
export async function loadAlio(fetchImpl=globalThis.fetch){
 const key=alioKey();if(!key)throw new AlioError('잡알리오 API 키를 Vercel의 BUSAN_API_KEY 또는 로컬 .env에 등록해 주세요.',503);
 const identity=createHash('sha256').update(key).digest('hex');
 if(cached?.identity===identity&&Date.now()-cached.time<300000)return cached;
 if(pending?.identity===identity)return pending.promise;
 const promise=(async()=>{
  async function page(pageNo){
   const url=new URL(endpoint);url.search=new URLSearchParams({serviceKey:key,pageNo:String(pageNo),numOfRows:'100',workRgnLst:'R3014'});
   let text;try{const response=await fetchImpl(url,{headers:{Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(12000)});if(!response.ok)throw new Error();text=await response.text();}catch{throw new AlioError('잡알리오 API에 연결하지 못했습니다. 잠시 후 다시 조회해 주세요.');}
   if(text.length>8000000)throw new AlioError('잡알리오 응답이 너무 큽니다. 잠시 후 다시 조회해 주세요.');
   let parsed;try{parsed=JSON.parse(text);}catch{throw new AlioError('잡알리오에서 JSON 응답을 받지 못했습니다. API 활용신청 승인과 Vercel BUSAN_API_KEY를 확인해 주세요.');}
   return parseAlio(parsed,key);
  }
  const first=await page(1),batches=[first];
  const pageCount=Math.min(5,Math.ceil(first.total/100));
  for(let next=2;next<=pageCount;next+=2)batches.push(...await Promise.all([next,next+1].filter(p=>p<=pageCount).map(page)));
  const unique=new Map();for(const batch of batches)for(const job of batch.jobs)unique.set(job.id||JSON.stringify([job.title,job.agency,job.start,job.end]),job);
  const jobs=[...unique.values()],scanned=batches.reduce((n,b)=>n+b.jobs.length,0);
  cached={identity,jobs,total:first.total,scanned,partial:jobs.length<first.total,time:Date.now(),source:'alio',sourceLabel:'잡알리오 · 공공기관 채용',sourceUrl:alioSource};return cached;
 })();pending={identity,promise};try{return await promise;}finally{if(pending?.promise===promise)pending=null;}
}
