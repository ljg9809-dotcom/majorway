import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceHealth,jobStatus} from '../job-health.mjs';
import {server} from '../server.mjs';

test('제목의 연도로 접수 기간을 추정하지 않고 원천 누락을 구분',()=>{
 const jobs=[{title:'2026년 채용',region:'',start:null,end:null},{title:'과거 공고',region:'부산',end:'2021-04-26'},{title:'현재 타지역',region:'서울',end:'2026-11-01'}];
 const health=sourceHealth(jobs,'2026-10-28');
 assert.equal(jobStatus(jobs[0],'2026-10-28'),'일정 확인');
 assert.equal(health.missingDeadline,1);assert.equal(health.missingLocation,1);
 assert.equal(health.current,1);assert.equal(health.currentDomestic,1);assert.equal(health.warning,'');
 assert.ok(sourceHealth(jobs.slice(0,2),'2026-10-28').warning);
 const current={title:'부산 채용',region:'부산 해운대구',start:'2026-10-28',end:'2026-10-28'};
 assert.equal(sourceHealth([current],'2026-10-28').warning,'');
 assert.equal(jobStatus({...current,start:'2026-10-29',end:'2026-11-01'},'2026-10-28'),'접수 예정');
});

test('잡알리오의 조회 범위와 기간 필터 이전 결과를 응답',async()=>{
 const original=globalThis.fetch,prior=process.env.BUSAN_API_KEY;process.env.BUSAN_API_KEY='test-health-key';let calls=0;
 globalThis.fetch=async(url,options)=>{
  if(!String(url).startsWith('https://apis.data.go.kr/1051000/recruitment/'))return original(url,options);
  calls++;assert.equal(new URL(url).searchParams.get('numOfRows'),'100');
  return Response.json({resultCode:0,totalCount:1000,result:[{recrutPblntSn:1,recrutPbancTtl:'회계 담당',instNm:'테스트',workRgnNmLst:'부산',pbancEndYmd:'20210426'},{recrutPblntSn:2,recrutPbancTtl:'2026년 회계 채용'}]});
 };
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  const data=await(await original(base+'/api/jobs?major=business&open=1')).json();
  assert.equal(calls,5);assert.equal(data.source,'alio');assert.equal(data.partial,true);assert.equal(data.unique,2);
  assert.equal(data.jobs.length,0);assert.equal(data.matchedBeforeOpen,1);assert.equal(data.health.latestDeadline,'2021-04-26');assert.ok(data.health.warning);
  assert.ok(!JSON.stringify(data).includes('test-health-key'));
  const archive=await(await original(base+'/api/jobs?major=business&open=0')).json();assert.equal(archive.jobs.length,1);assert.equal(archive.jobs[0].status,'마감');assert.equal(calls,5);
 }finally{globalThis.fetch=original;await new Promise(r=>server.close(r));if(prior===undefined)delete process.env.BUSAN_API_KEY;else process.env.BUSAN_API_KEY=prior;}
});
