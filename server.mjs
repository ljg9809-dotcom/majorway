import http from 'node:http';
import {readFileSync,existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {majors,relatedWords,matching,normalize,demoJobs} from './catalog.mjs';
import {searchDepartments,getDepartment,departmentMetadata} from './departments.mjs';
import {locationCatalog,annotateJob,validateFilters,passesFilters} from './job-filters.mjs';
import {universityDetails,UniversityError} from './school-major-api.mjs';
import {jobStatus,sourceHealth} from './job-health.mjs';
import {loadAlio,alioKey,AlioError} from './alio-api.mjs';

const root=path.dirname(fileURLToPath(import.meta.url));
if(existsSync(path.join(root,'.env'))) process.loadEnvFile(path.join(root,'.env'));

class PublicError extends Error { constructor(message,status=502){super(message);this.status=status;} }
export function parseResponse(data,key=''){
 const envelope=data?.response??data?.getJobOpnngInfo??data;
 const header=envelope?.header??envelope;
 const code=header?.resultCode;
 if(code!==undefined&&!['00','0','0000','NORMAL_SERVICE'].includes(String(code))) throw new PublicError('인증 승인 상태 또는 공공 API 이용 상태를 확인해 주세요.');
 const body=envelope?.body??envelope;
 let rows=body?.items?.item??body?.items??body?.item;
 if(rows==null){if(Number(body?.totalCount)===0)return {jobs:[],total:0};throw new PublicError('공공 API 응답 형식을 확인하지 못했습니다.');}
 if(!Array.isArray(rows))rows=[rows];
 return {jobs:rows.filter(x=>x&&typeof x==='object').map(x=>normalize(x,key)),total:Number(body.totalCount)||rows.length};
}
function send(res,status,payload){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(payload));}
export async function handler(req,res){
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
 res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
 try{
  const url=new URL(req.url,'http://localhost');
  if(req.method!=='GET')return send(res,405,{error:'허용되지 않은 요청입니다.'});
  if(url.pathname==='/api/catalog')return send(res,200,{majors,configured:!!alioKey(),jobSource:'alio',universityConfigured:!!process.env.UNIVERSITY_API_KEY?.trim(),departmentMetadata,filters:locationCatalog()});
  if(url.pathname==='/api/university-info'){
   const profile=getDepartment(url.searchParams.get('department'));
   const year=Number(url.searchParams.get('year')||2026);
   if(!profile||![2024,2025,2026].includes(year))return send(res,400,{error:'학과와 조회 연도를 다시 선택해 주세요.'});
   return send(res,200,await universityDetails(profile,url.searchParams.get('school')||'',year));
  }
  if(url.pathname==='/api/departments')return send(res,200,searchDepartments(url.searchParams.get('q')||'',url.searchParams.get('school')||'',url.searchParams.get('closed')==='1'));
  if(url.pathname==='/api/department'){
   const department=getDepartment(url.searchParams.get('id'));
   return department?send(res,200,department):send(res,404,{error:'학과를 찾을 수 없습니다.'});
  }
  if(url.pathname==='/api/jobs'){
   const departmentId=url.searchParams.get('department');
   const major=departmentId?getDepartment(departmentId):majors.find(m=>m.id===url.searchParams.get('major'));
   if(!major)return send(res,400,{error:'전공을 선택해 주세요.'});
   if(!major.roles.length)return send(res,400,{error:'이 학과는 직무 연결 검토 중입니다. 아래의 가까운 분야를 선택해 탐색해 주세요.'});
   const sub=url.searchParams.get('sub')||'',role=url.searchParams.get('role')||'';
   if((sub&&!major.subs.includes(sub))||(role&&!major.roles.some(r=>r.name===role)))return send(res,400,{error:'세부 전공 또는 직무를 다시 선택해 주세요.'});
   if(!validateFilters(url.searchParams))return send(res,400,{error:'지역 또는 채용 조건을 다시 선택해 주세요.'});
   const demo=url.searchParams.get('demo')==='1';
   const words=relatedWords(major,sub,role);
   const data=demo?{jobs:demoJobs(),total:8,scanned:8,time:Date.now()}:await loadAlio();
   const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
   const q=(url.searchParams.get('q')||'').trim().slice(0,100),type=url.searchParams.get('type')||'';
   const annotated=data.jobs.map(annotateJob),facets=locationCatalog(annotated);
   let jobs=annotated.map(j=>({...j,match:matching(j,words),status:jobStatus(j,today)}));
   jobs=jobs.filter(j=>j.match.score>0&&(!q||`${j.title} ${j.agency} ${j.content}`.includes(q))&&(!type||j.type.includes(type)));
   jobs=jobs.filter(j=>passesFilters(j,url.searchParams));
   const matchedBeforeOpen=jobs.length;
   if(url.searchParams.get('open')==='1')jobs=jobs.filter(j=>j.status==='접수 중');
   jobs.sort((a,b)=>b.match.score-a.match.score||(a.end||'9999').localeCompare(b.end||'9999'));
   const health=demo?null:sourceHealth(data.jobs,today);if(health&&!data.jobs.length)health.warning='';
   return send(res,200,{jobs,facets,mode:demo?'demo':'live',source:data.source,sourceLabel:data.sourceLabel,sourceUrl:data.sourceUrl,searchCount:data.searchCount,queryTotal:data.queryTotal,total:data.total,scanned:data.scanned,unique:data.jobs.length,partial:!!data.partial,health,matchedBeforeOpen,updatedAt:new Date(data.time).toISOString(),words});
  }
  const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css'};
  if(!files[url.pathname])return send(res,404,{error:'페이지를 찾을 수 없습니다.'});
  const type={'index.html':'text/html','app.js':'text/javascript','style.css':'text/css'}[files[url.pathname]];
  res.writeHead(200,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store'});res.end(readFileSync(path.join(root,'public',files[url.pathname])));
 }catch(error){const safe=error instanceof PublicError||error instanceof UniversityError||error instanceof AlioError;send(res,safe?error.status:502,{error:safe?error.message:'요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'});}
}
export const server=http.createServer(handler);
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.env.PORT)||3000;
 server.on('error',()=>{console.error('서버를 시작하지 못했습니다. 사용 중인 포트인지 확인해 주세요.');process.exitCode=1;});
 server.listen(port,'127.0.0.1',()=>console.log(`Majorway 실행: http://localhost:${port}`));
}
