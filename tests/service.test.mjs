import test from 'node:test';
import assert from 'node:assert/strict';
import {server,parseResponse} from '../server.mjs';
import {matching,majors,relatedWords,normalize,dateOnly} from '../catalog.mjs';
test('세부전공과 직무별 키워드 연결',()=>{
 const major=majors.find(m=>m.id==='business');const words=relatedWords(major,'회계·재무','회계·재무');
 assert.equal(matching({title:'회계 담당',field:'예산',content:''},words).score,6);
 assert.equal(matching({title:'미술관 전시',field:'디자인',content:''},words).score,0);
});
test('JSON 응답 구조 및 빈 결과, 인증 오류 처리',()=>{
 assert.equal(parseResponse({response:{header:{resultCode:'00'},body:{items:{item:{title:'공고'}},totalCount:1}}}).jobs[0].title,'공고');
 assert.deepEqual(parseResponse({getJobOpnngInfo:{totalCount:0,items:''}}).jobs,[]);
 assert.throws(()=>parseResponse({response:{header:{resultCode:'30',resultMsg:'sensitive upstream detail'}}}),e=>!e.message.includes('sensitive'));
});
test('원문 HTML, 키 값, 인코딩 키를 응답에서 제거',()=>{
 const j=normalize({title:'<script>alert(1)</script>',content:'secret-test secret%2Bkey ServiceKey=abc'},'secret-test');
 assert.ok(!j.title.includes('<script>'));assert.ok(!JSON.stringify(j).includes('secret-test'));
 assert.ok(!JSON.stringify(normalize({content:'a%2Bb'},'a+b')).includes('a%2Bb'));
 assert.equal(dateOnly('2026-02-30'),null);assert.equal(dateOnly('20261028'),'2026-10-28');
});
test('웹 경로 제한, 비밀 비노출, 예시 검색과 필터',async()=>{
 const prior=process.env.BUSAN_API_KEY;delete process.env.BUSAN_API_KEY;
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  for(const p of ['/.env','/register-key.ps1','/server.mjs','/.git/config'])assert.equal((await fetch(base+p)).status,404);
  assert.equal((await fetch(base+'/api/jobs?major=software')).status,503);
  assert.equal((await fetch(base+'/api/jobs?major=unknown&demo=1')).status,400);
  assert.equal((await fetch(base+'/api/jobs?major=software&demo=1&area=west&district='+encodeURIComponent('해운대구'))).status,400);
  const local=await(await fetch(base+'/api/jobs?major=software&demo=1&area=east&district='+encodeURIComponent('해운대구')+'&town='+encodeURIComponent('우동')+'&experience='+encodeURIComponent('신입')+'&employment='+encodeURIComponent('인턴'))).json();assert.equal(local.jobs.length,1);assert.equal(local.jobs[0].location.locations[0].town,'우동');
  const departments=await(await fetch(base+'/api/departments?q='+encodeURIComponent('경영정보학과'))).json();
  const exact=departments.items.find(d=>d.name==='경영정보학과');assert.ok(exact);
  const profile=await(await fetch(base+'/api/department?id='+exact.id)).json();assert.equal(profile.department.year,2026);
  const related=await(await fetch(base+'/api/jobs?department='+exact.id+'&demo=1&role='+encodeURIComponent('전산·정보화'))).json();
  assert.ok(related.jobs.some(j=>j.field==='전산·데이터 관리'));assert.ok(related.jobs.every(j=>!j.match.words.includes('회계')));
  assert.equal((await fetch(base+'/data/university-departments.json')).status,404);
  const jobs=await(await fetch(base+'/api/jobs?major=business&sub='+encodeURIComponent('회계·재무')+'&demo=1')).json();assert.equal(jobs.jobs.length,1);assert.equal(jobs.mode,'demo');
  const filtered=await(await fetch(base+'/api/jobs?major=software&demo=1&type='+encodeURIComponent('청년인턴'))).json();assert.ok(filtered.jobs.length>0);assert.ok(filtered.jobs.every(j=>j.type==='청년인턴'));
  process.env.BUSAN_API_KEY='sensitive-test-key';const original=globalThis.fetch;
  globalThis.fetch=async(url,options)=>{if(String(url).startsWith('https://apis.data.go.kr/1051000/recruitment/'))throw new Error('sensitive-test-key');return original(url,options);};
  try{const response=await original(base+'/api/jobs?major=software');assert.equal(response.status,502);assert.ok(!(await response.text()).includes('sensitive-test-key'));}finally{globalThis.fetch=original;}
 }finally{await new Promise(r=>server.close(r));if(prior===undefined)delete process.env.BUSAN_API_KEY;else process.env.BUSAN_API_KEY=prior;}
});
