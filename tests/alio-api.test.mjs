import test from 'node:test';
import assert from 'node:assert/strict';
import {alioKey,parseAlio,normalizeAlio,loadAlio} from '../alio-api.mjs';
import {annotateJob,passesFilters} from '../job-filters.mjs';
import {jobStatus} from '../job-health.mjs';
const row={recrutPblntSn:306441,recrutPbancTtl:'정보화 지원 인턴',instNm:'테스트 기관',workRgnNmLst:'서울,부산',ncsCdNmLst:'정보통신',hireTypeLst:'R1010,R1060',hireTypeNmLst:'정규직,청년인턴(체험형)',recrutSe:'R2030',recrutSeNm:'신입+경력',pbancBgngYmd:'20261001',pbancEndYmd:'20261101',ongoingYn:'Y',aplyQlfcCn:'전산 관련 전공',prefCn:'<b>경력 우대</b> secret+test',srcUrl:'https://evil.example/?serviceKey=secret+test'};
test('잡알리오 공식 필드·코드·기간·부산 근무지와 원문 링크',()=>{
 const j=annotateJob(normalizeAlio(row,'secret+test'));
 assert.equal(j.start,'2026-10-01');assert.equal(j.end,'2026-11-01');assert.equal(j.experience,'신입·경력');assert.deepEqual(j.employment,['정규직','인턴']);
 assert.equal(j.location.city,'부산광역시');assert.equal(j.location.locations.length,0);assert.equal(j.sourceUrl,'https://job.alio.go.kr/recruitview.do?idx=306441');assert.ok(!JSON.stringify(j).includes('secret+test'));assert.ok(!j.content.includes('<b>'));
 assert.equal(jobStatus(j,'2026-10-28'),'접수 중');assert.equal(jobStatus({...j,ongoing:'N'},'2026-10-28'),'마감');
 assert.equal(passesFilters(j,new URLSearchParams({district:'해운대구'})),false);assert.equal(passesFilters(j,new URLSearchParams({district:'해운대구',includeUnknownLocation:'1'})),true);
 assert.deepEqual(normalizeAlio({...row,hireTypeLst:'R1040'}).employment,['계약직']);assert.deepEqual(normalizeAlio({...row,hireTypeLst:'R1030'}).employment,['무기계약직']);
 assert.equal(normalizeAlio({...row,recrutSe:'R2040',recrutSeNm:'외국인 전형'}).experience,'정보 미제공');
});
test('정상 JSON·래핑된 항목·빈 결과와 인증 실패 비노출',()=>{
 assert.equal(parseAlio({resultCode:0,totalCount:1,result:[row]}).jobs.length,1);
 assert.equal(parseAlio({resultCode:200,totalCount:1,result:[row]}).jobs.length,1);
 assert.equal(parseAlio({resultCode:'00',totalCount:1,result:[{item:row}]}).jobs[0].agency,'테스트 기관');
 assert.deepEqual(parseAlio({resultCode:0,totalCount:0,result:[]}).jobs,[]);
 for(const data of [{resultCode:30,resultMsg:'secret+test'},{resultCode:0,totalCount:1,result:[]},{resultCode:0,totalCount:'bad',result:[]}])assert.throws(()=>parseAlio(data,'secret+test'),e=>!e.message.includes('secret+test'));
});
test('BUSAN_API_KEY 호환·기존 고용24 변수 무시·부산 코드·페이지·캐시',async()=>{
 const previous=Object.fromEntries(['BUSAN_API_KEY','ALIO_API_KEY','WORK24_API_KEY'].map(k=>[k,process.env[k]]));
 try{process.env.BUSAN_API_KEY='secret%2Btest';process.env.WORK24_API_KEY='old-key';delete process.env.ALIO_API_KEY;assert.equal(alioKey(),'secret+test');process.env.ALIO_API_KEY='alio-specific';assert.equal(alioKey(),'alio-specific');let calls=0;
  const fake=async(url,options)=>{calls++;const u=new URL(url);assert.equal(u.origin,'https://apis.data.go.kr');assert.equal(u.pathname,'/1051000/recruitment/list');assert.equal(u.searchParams.get('serviceKey'),'alio-specific');assert.equal(u.searchParams.get('workRgnLst'),'R3014');assert.equal(options.headers.Accept,'application/json');const page=Number(u.searchParams.get('pageNo'));return Response.json({resultCode:0,totalCount:101,result:Array.from({length:page===1?100:1},(_,i)=>({...row,recrutPblntSn:(page-1)*100+i+1}))});};
  const data=await loadAlio(fake);assert.equal(calls,2);assert.equal(data.jobs.length,101);assert.equal(data.partial,false);await loadAlio(fake);assert.equal(calls,2);
  process.env.ALIO_API_KEY='other-secret';await assert.rejects(loadAlio(async()=>{throw new Error('other-secret');}),e=>!e.message.includes('other-secret'));
 }finally{for(const [k,v] of Object.entries(previous))if(v===undefined)delete process.env[k];else process.env[k]=v;}
});
