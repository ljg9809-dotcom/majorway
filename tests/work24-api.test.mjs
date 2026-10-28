import test from 'node:test';
import assert from 'node:assert/strict';
import {parseWork24Xml,work24Date,safeWork24Url,loadWork24,work24Key} from '../work24-api.mjs';
import {annotateJob,passesFilters} from '../job-filters.mjs';
import {jobStatus} from '../job-health.mjs';
import {matching} from '../catalog.mjs';

const xml='<wantedRoot><total>1</total><wanted><wantedAuthNo>K123</wantedAuthNo><title><![CDATA[경력 개발자 모집]]></title><company>테스트 &amp; 회사</company><region>부산 해운대구</region><basicAddr>부산광역시 해운대구 우동</basicAddr><career>신입</career><empTpCd>20</empTpCd><holidayTpNm>주 5일</holidayTpNm><regDt>26-10-28</regDt><closeDt>26-11-30</closeDt><wantedInfoUrl>https://www.work24.go.kr/job/detail?authKey=test-work-key&amp;wantedAuthNo=K123</wantedInfoUrl></wanted></wantedRoot>';
test('공식 XML 필드·두 자리 연도·원문 링크·구동·경력/계약 분류',()=>{
 const data=parseWork24Xml(xml,'test-work-key','소프트웨어'),j=annotateJob(data.jobs[0]);
 assert.equal(j.end,'2026-11-30');assert.equal(j.registered,'2026-10-28');assert.equal(j.start,null);
 assert.equal(j.agency,'테스트 & 회사');assert.equal(j.experience,'신입');assert.deepEqual(j.employment,['계약직']);assert.equal(j.type,'기간의 정함이 있는 근로계약');
 assert.equal(j.location.locations[0].town,'2635010500');assert.ok(passesFilters(j,new URLSearchParams({province:'26',district:'26350',town:'2635010500',experience:'신입',employment:'계약직'})));
 assert.ok(!JSON.stringify(j).includes('test-work-key'));assert.ok(!j.sourceUrl.includes('authKey'));assert.ok(j.sourceUrl.includes('wantedAuthNo=K123'));
 assert.ok(matching(j,['소프트웨어']).words.includes('소프트웨어'));
 assert.equal(work24Date('26.2.30'),null);assert.equal(work24Date('2026.2.3'),'2026-02-03');
 const rolling=parseWork24Xml(xml.replace('26-11-30','채용시까지')).jobs[0];assert.equal(jobStatus(rolling,'2026-10-28'),'접수 중');
 const indefinite=annotateJob(parseWork24Xml(xml.replace('<empTpCd>20','<empTpCd>10')).jobs[0]);assert.deepEqual(indefinite.employment,['정규직']);
});
test('인증 실패/HTML/외부 엔티티를 거부하고 임의 링크를 제거',()=>{
 for(const body of ['<error>test-work-key</error>','<html>login</html>','<!DOCTYPE foo><wantedRoot><total>0</total></wantedRoot>','<wantedRoot><message>test-work-key</message></wantedRoot>','<wantedRoot><total>1</total></wantedRoot>'])assert.throws(()=>parseWork24Xml(body,'test-work-key'),e=>!e.message.includes('test-work-key'));
 assert.deepEqual(parseWork24Xml('<wantedRoot><total>0</total></wantedRoot>').jobs,[]);
 assert.equal(safeWork24Url('https://evil.example/?authKey=test'),'');assert.equal(safeWork24Url('javascript:alert(1)'),'');assert.equal(safeWork24Url('https://work24.go.kr.evil.example/'),'');
 assert.throws(()=>parseWork24Xml('<GO24><error>신청하신 OpenApi 서비스가 존재하지 않습니다 test-work-key</error></GO24>','test-work-key'),e=>e.message.includes('서비스를 찾지 못')&&!e.message.includes('test-work-key'));
 assert.throws(()=>parseWork24Xml('<GO24><error>인증키 오류 test-work-key</error></GO24>','test-work-key'),e=>e.message.includes('인증이 거부')&&!e.message.includes('test-work-key'));
 assert.throws(()=>parseWork24Xml('<GO24><error>일시적인 장애입니다 test-work-key https://example.com/123</error></GO24>','test-work-key'),e=>e.message.includes('일시적인 장애')&&!/test-work-key|example|123/.test(e.message));
 assert.throws(()=>parseWork24Xml('<GO24><error>개인회원은 사용할 수 없는 API 입니다.</error></GO24>'),e=>e.message.includes('기업회원으로 발급'));
});
test('BUSAN_API_KEY 호환, 새 변수 우선, 부산 한정 요청·중복 제거·캐시·비밀 제거',async()=>{
 const previous={BUSAN_API_KEY:process.env.BUSAN_API_KEY,WORK24_API_KEY:process.env.WORK24_API_KEY};
 try{process.env.BUSAN_API_KEY='compat-key';delete process.env.WORK24_API_KEY;assert.equal(work24Key(),'compat-key');process.env.WORK24_API_KEY='test-work-key';assert.equal(work24Key(),'test-work-key');let calls=0;
  const fake=async url=>{calls++;const u=new URL(url);assert.equal(u.hostname,'www.work24.go.kr');assert.equal(u.searchParams.get('authKey'),'test-work-key');assert.equal(u.searchParams.get('region'),'26000');assert.equal(u.searchParams.get('callTp'),'L');assert.equal(u.searchParams.get('returnType'),'XML');return new Response(xml);};
  const data=await loadWork24(['소프트웨어','개발'],fake);assert.equal(calls,2);assert.equal(data.jobs.length,1);assert.equal(data.scanned,2);assert.equal(data.partial,false);assert.deepEqual(data.jobs[0].matchedKeywords,['소프트웨어','개발']);
  assert.ok(!JSON.stringify(data).includes('test-work-key'));await loadWork24(['소프트웨어','개발'],fake);assert.equal(calls,2);
  await assert.rejects(loadWork24(['네트워크'],async()=>{throw new Error('test-work-key');}),e=>!e.message.includes('test-work-key'));
 }finally{for(const [name,v] of Object.entries(previous))if(v===undefined)delete process.env[name];else process.env[name]=v;}
});
