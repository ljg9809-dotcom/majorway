import test from 'node:test';
import assert from 'node:assert/strict';
import {busanAreas,locationOf,careerOf,employmentOf,annotateJob,passesFilters,validateFilters,locationCatalog} from '../job-filters.mjs';
const job=(region,extra={})=>annotateJob({region,title:'공고',content:'',type:'',...extra});
const params=x=>new URLSearchParams(x);
test('부산 16개 구군과 권역 분류, 구동 쌍 일치',()=>{
 assert.equal(new Set(busanAreas.flatMap(a=>a.districts)).size,16);
 const j=job('부산광역시 해운대구 우동, 부산광역시 연제구 연산동');
 assert.equal(passesFilters(j,params({area:'east',district:'해운대구',town:'우동'})),true);
 assert.equal(passesFilters(j,params({district:'해운대구',town:'연산동'})),false);
 assert.equal(passesFilters(j,params({area:'west'})),false);
 assert.equal(locationOf('부산 기장군 일광읍').locations[0].town,'일광읍');
 assert.equal(locationOf('부산 중구 중앙동4가').locations[0].town,'중앙동4가');
 assert.equal(locationOf('부산 남구 대연제1동').locations[0].town,'대연1동');
});
test('타 시도·부산 미확인 제외, 상세지역 미제공은 명시적 포함만',()=>{
 assert.equal(passesFilters(job('서울특별시 강서구'),params({includeUnknownLocation:'1'})),false);
 assert.equal(passesFilters(job(''),params({includeUnknownLocation:'1'})),false);
 assert.equal(passesFilters(job('부산'),params({area:'east'})),false);
 assert.equal(passesFilters(job('부산'),params({area:'east',includeUnknownLocation:'1'})),true);
 assert.equal(passesFilters(job('부산 해운대구'),params({district:'해운대구',town:'우동',includeUnknownLocation:'1'})),true);
 assert.equal(passesFilters(job('부산 연제구'),params({district:'해운대구',town:'우동',includeUnknownLocation:'1'})),false);
 const j=job('부산 해운대구',{content:'접수처: 부산 남구 대연동'});
 assert.deepEqual(j.location.locations.map(l=>l.district),['해운대구']);
});
test('경력 필수·무관·우대·미제공을 구분',()=>{
 assert.equal(careerOf({title:'인턴 채용',content:'경력증명서 제출'}),'정보 미제공');
 assert.equal(careerOf({content:'경력 2년 이상 우대.'}),'정보 미제공');
 assert.equal(careerOf({content:'응시자격: 경력 2년 이상 필수.'}),'경력');
 assert.equal(careerOf({title:'신입 및 경력직 채용'}),'신입·경력');
 assert.equal(careerOf({content:'경력 무관.'}),'경력무관');
 assert.deepEqual(employmentOf({type:'기간제 근로자'}),['계약직']);
 assert.deepEqual(employmentOf({type:'정규직 전환형 인턴'}),['인턴']);
 assert.deepEqual(employmentOf({type:'무기계약직'}),['무기계약직']);
});
test('같은 조건 OR, 경력과 고용형태는 AND, 경력무관 포괄',()=>{
 const j=job('부산 수영구 광안동',{type:'청년인턴',content:'경력무관.'});
 assert.ok(passesFilters(j,params({experience:'신입',employment:'인턴'})));
 assert.ok(!passesFilters(j,params({experience:'신입',employment:'계약직'})));
 const p=params({experience:'경력'});p.append('employment','계약직');p.append('employment','인턴');assert.ok(passesFilters(j,p));
 assert.ok(!validateFilters(params({area:'west',district:'해운대구'})));
 assert.ok(!validateFilters(params({town:'우동'})));
 assert.ok(!validateFilters(params({employment:'임의값'})));
 const areas=locationCatalog([j]).areas;assert.deepEqual(areas.find(a=>a.id==='east').districts.find(d=>d.name==='수영구').towns,['광안동']);
});
