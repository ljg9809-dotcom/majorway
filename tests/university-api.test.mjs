import test from 'node:test';
import assert from 'node:assert/strict';
import {parseUniversityXml,universityDetails} from '../school-major-api.mjs';
const wrap=(items,total)=>`<response><header><resultCode>00</resultCode></header><body><items>${items}</items><totalCount>${total}</totalCount></body></response>`;
test('대학 XML 필드 정규화·CDATA·인증정보 제거 및 외부 엔티티 거부',()=>{
 const xml=wrap('<item><schlNm>테스트대학교</schlNm><korMjrNm>경영정보학과</korMjrNm><edcCrseLtrCtnt><![CDATA[<p>정보시스템</p>]]></edcCrseLtrCtnt><pwayEmplLtrCtnt>분석가 &amp; 개발자</pwayEmplLtrCtnt><mjrUpdtDtm>test-only-secret</mjrUpdtDtm></item>',1);
 const data=parseUniversityXml(xml,'test-only-secret');assert.equal(data.rows[0].curriculum,'정보시스템');assert.equal(data.rows[0].occupations,'분석가 & 개발자');assert.ok(!JSON.stringify(data).includes('test-only-secret'));
 assert.throws(()=>parseUniversityXml('<!DOCTYPE foo>'+xml));assert.throws(()=>parseUniversityXml('<header><resultCode>30</resultCode><resultMsg>secret</resultMsg></header>'),e=>!e.message.includes('secret'));
 assert.deepEqual(parseUniversityXml(wrap('',0)),{rows:[],total:0});assert.throws(()=>parseUniversityXml('<response><resultCode>00</resultCode></response>'));
});
test('공식 API 요청 규격과 연도 전환 표시, 학과·학교·학위 정확 일치',async()=>{
 const previous=process.env.UNIVERSITY_API_KEY;process.env.UNIVERSITY_API_KEY='test-only-key';
 const calls=[],profile={name:'경영정보학과',department:{offerings:[{schoolId:'test-school',school:'테스트대학교'}]}};
 const mock=async(url,options)=>{assert.equal(url.origin,'https://apis.data.go.kr');assert.equal(url.pathname,'/B340014/SchoolMajorInfoService/getSchoolMajorInfo');assert.equal(url.searchParams.get('serviceKey'),'test-only-key');assert.equal(options.redirect,'error');calls.push(url.searchParams.get('svyYr'));return {ok:true,text:async()=>url.searchParams.get('svyYr')==='2026'?wrap('',0):wrap('<item><schlNm>테스트대학교</schlNm><korMjrNm>경영정보학과</korMjrNm><pbnfDgriCrseDivNm>학사</pbnfDgriCrseDivNm><svyYr>2025</svyYr></item><item><schlNm>테스트대학교</schlNm><korMjrNm>경영정보학과</korMjrNm><pbnfDgriCrseDivNm>석사</pbnfDgriCrseDivNm></item><item><schlNm>다른대학교</schlNm><korMjrNm>경영정보학과</korMjrNm><pbnfDgriCrseDivNm>학사</pbnfDgriCrseDivNm></item>',3)};};
 try{const result=await universityDetails(profile,'test-school',2026,mock);assert.equal(result.fallback,true);assert.equal(result.providedYear,2025);assert.equal(result.records.length,1);assert.deepEqual(calls,['2026','2025']);assert.ok(!JSON.stringify(result).includes('test-only-key'));await universityDetails(profile,'test-school',2026,mock);assert.equal(calls.length,2);await assert.rejects(()=>universityDetails(profile,'invalid',2026,mock));}
 finally{if(previous===undefined)delete process.env.UNIVERSITY_API_KEY;else process.env.UNIVERSITY_API_KEY=previous;}
});
