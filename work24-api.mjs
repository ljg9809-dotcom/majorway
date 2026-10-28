import {createHash} from 'node:crypto';
import {clean,dateOnly} from './catalog.mjs';

export const work24Source='https://www.work24.go.kr';
const endpoint='https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210L01.do';
export class Work24Error extends Error {constructor(message,status=502){super(message);this.status=status;}}
export function work24Key(){return (process.env.WORK24_API_KEY||process.env.BUSAN_API_KEY||'').trim();}
function value(xml,tag){
 const match=xml.match(new RegExp('<'+tag+'(?:\\s[^>]*)?>([\\s\\S]*?)</'+tag+'\\s*>'));
 return (match?.[1]||'').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,(_,v)=>v).replace(/&#(x[0-9a-f]+|\d+);/gi,(_,n)=>{const code=n[0].toLowerCase()==='x'?parseInt(n.slice(1),16):Number(n);return code>0&&code<=0x10ffff&&!(code>=0xd800&&code<=0xdfff)?String.fromCodePoint(code):'';}).replace(/&quot;/g,'"').replace(/&apos;/g,"'");
}
export function work24Date(text){
 const raw=String(text||'').trim();
 const m=raw.match(/^(\d{2}|\d{4})[-./](\d{1,2})[-./](\d{1,2})(?:$|\s|\()/);
 return m?dateOnly(`${m[1].length===2?'20':''}${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`):dateOnly(raw);
}
export function safeWork24Url(text,key=''){
 try{const url=new URL(text);if(!['http:','https:'].includes(url.protocol)||!/(^|\.)(work24|work)\.go\.kr$/.test(url.hostname)||url.username||url.password)return '';
  url.protocol='https:';
  for(const [name,v] of [...url.searchParams])if(/key|token|secret/i.test(name)||key&&v.includes(key))url.searchParams.delete(name);
  let decoded=url.href;try{decoded=decodeURIComponent(decoded);}catch{}
  return key&&(url.href.includes(key)||decoded.includes(key))?'':url.href;
 }catch{return '';}
}
export function parseWork24Xml(xml,key='',keyword=''){
 if(typeof xml!=='string'||xml.length>8000000||/<!DOCTYPE|<!ENTITY/i.test(xml))throw new Work24Error('고용24 응답을 확인하지 못했습니다. 채용정보 API 승인 상태를 확인해 주세요.');
 // Work24 sends service/authentication failures in a separate GO24 envelope.
 // Classify known errors; never forward the arbitrary upstream error text.
 if(/<GO24(?:\s|>)/.test(xml)){
  const error=value(xml,'error');
  if(/개인회원/.test(error))throw new Work24Error('고용24 채용정보 API는 개인회원 키로 사용할 수 없습니다. 기업회원으로 발급받은 채용정보 API 키를 Vercel BUSAN_API_KEY에 등록해 주세요.');
  if(/신청하신.*서비스가 존재하지/.test(error))throw new Work24Error('고용24가 신청한 OpenAPI 서비스를 찾지 못했습니다. 채용정보 API 승인 상태와 Vercel BUSAN_API_KEY에 입력한 고용24 키를 확인해 주세요.');
  if(/인증|키|승인|권한/.test(error))throw new Work24Error('고용24 인증이 거부되었습니다. 채용정보 API 승인 상태와 Vercel BUSAN_API_KEY 값을 확인해 주세요.');
  // Only a short Korean explanation may leave the server: strip keys, URLs,
  // ASCII identifiers and numbers, then render as plain text in the client.
  const note=clean(error,key).replace(/[^가-힣\s]/g,' ').replace(/\s+/g,' ').trim().slice(0,160);
  throw new Work24Error(note?`고용24 안내: ${note}. 이용 승인 상태와 채용정보 API 설정을 확인해 주세요.`:'고용24가 API 오류를 반환했습니다. 이용 승인 상태를 확인한 뒤 다시 조회해 주세요.');
 }
 if(!/<wantedRoot(?:\s|>)/.test(xml))throw new Work24Error('고용24 채용정보 형식의 응답을 받지 못했습니다. 채용정보 API 승인 상태를 확인해 주세요.');
 if(/<(?:error|message|errorMsg|resultMsg)(?:\s|>)/.test(xml)&&!/<wanted(?:\s|>)/.test(xml)&&!/^(?:0|00)$/.test(value(xml,'resultCode')))throw new Work24Error('고용24 인증 또는 이용 상태를 확인해 주세요. Vercel의 BUSAN_API_KEY에는 고용24에서 발급한 키가 필요합니다.');
 const totalText=value(xml,'total').trim(),total=Number(totalText);
 if(!/^\d+$/.test(totalText)||!Number.isSafeInteger(total))throw new Work24Error('고용24 채용정보 건수를 확인하지 못했습니다. 인증 승인 상태를 확인해 주세요.');
 const jobs=[...xml.matchAll(/<wanted(?:\s[^>]*)?>([\s\S]*?)<\/wanted\s*>/g)].map(m=>{
  const pick=tag=>clean(value(m[1],tag),key),code=pick('empTpCd'),deadline=pick('closeDt');
  const career=pick('career'),experience=/신입.*경력|경력.*신입/.test(career)?'신입·경력':/관계없음|무관/.test(career)?'경력무관':/신입/.test(career)?'신입':/경력/.test(career)?'경력':'정보 미제공';
  const title=pick('title'),contracts={'10':'기간의 정함이 없는 근로계약','11':'기간의 정함이 없는 근로계약(시간제)','20':'기간의 정함이 있는 근로계약','21':'기간의 정함이 있는 근로계약(시간제)'};
  const employment=/인턴/.test(title)?['인턴']:['10','11'].includes(code)?['정규직']:['20','21'].includes(code)?['계약직']:null;
  return {id:pick('wantedAuthNo'),source:'work24',title,agency:pick('company'),field:'',type:contracts[code]||pick('holidayTpNm'),region:pick('region'),workAddress:[pick('basicAddr'),pick('detailAddr')].filter(Boolean).join(' '),start:null,end:work24Date(deadline),registered:work24Date(pick('regDt')),deadlineLabel:deadline,rolling:/^(?:채용시|채용 시|상시)/.test(deadline),method:'고용24 원문 확인',content:'고용24 채용정보 목록입니다. 상세 직무·지원 자격·지원 방법은 공고 원문에서 확인해 주세요.',experience,employment,careerLabel:career,salary:[pick('salTpNm'),pick('sal')].filter(Boolean).join(' '),sourceUrl:safeWork24Url(value(m[1],'wantedInfoUrl').replace(/&amp;/g,'&'),key),matchedKeywords:keyword?[keyword]:[]};
 });
 if(total>0&&!jobs.length)throw new Work24Error('고용24 채용정보 목록을 확인하지 못했습니다.');
 return {jobs,total};
}
const cached=new Map(),pending=new Map();
async function fetchKeyword(keyword,key,fetchImpl){
 const identity=createHash('sha256').update(key).digest('hex')+'|'+keyword;
 const prior=cached.get(identity);if(prior&&Date.now()-prior.time<300000)return prior;
 if(pending.has(identity))return pending.get(identity);
 const promise=(async()=>{
  const url=new URL(endpoint);url.search=new URLSearchParams({authKey:key,callTp:'L',returnType:'XML',startPage:'1',display:'100',region:'26000',keyword,sortOrderBy:'DESC'});
  let xml;try{const res=await fetchImpl(url,{redirect:'error',signal:AbortSignal.timeout(10000)});if(!res.ok)throw new Error();xml=await res.text();}catch{throw new Work24Error('고용24에 연결하지 못했습니다. 잠시 후 다시 조회해 주세요.');}
  const result={...parseWork24Xml(xml,key,keyword),time:Date.now()};
  if(cached.size>=100)cached.delete(cached.keys().next().value);cached.set(identity,result);return result;
 })();pending.set(identity,promise);try{return await promise;}finally{pending.delete(identity);}
}
export async function loadWork24(words,fetchImpl=globalThis.fetch){
 const key=work24Key();if(!key)throw new Work24Error('고용24 API 키를 Vercel의 BUSAN_API_KEY 또는 로컬 .env에 등록해 주세요.',503);
 const keywords=[...new Set(words)].slice(0,12),batches=[];
 // Single-keyword searches avoid relying on undocumented AND/OR syntax.
 // Three workers bound upstream load and complete within the server's 60-second budget.
 for(let offset=0;offset<keywords.length;offset+=3)batches.push(...await Promise.all(keywords.slice(offset,offset+3).map(w=>fetchKeyword(w,key,fetchImpl))));
 const unique=new Map();
 for(const batch of batches)for(const job of batch.jobs){const id=job.id||JSON.stringify([job.title,job.agency,job.end,job.region]);const existing=unique.get(id);if(existing)existing.matchedKeywords=[...new Set([...existing.matchedKeywords,...job.matchedKeywords])];else unique.set(id,{...job,matchedKeywords:[...job.matchedKeywords]});}
 const jobs=[...unique.values()];
 return {jobs,total:jobs.length,scanned:batches.reduce((n,b)=>n+b.jobs.length,0),partial:keywords.length<words.length||batches.some(b=>b.jobs.length<b.total),time:Math.min(...batches.map(b=>b.time)),source:'work24',sourceLabel:'고용24 · 민간기업 포함',sourceUrl:work24Source,searchCount:keywords.length,queryTotal:batches.reduce((n,b)=>n+b.total,0)};
}
