import test from 'node:test';
import assert from 'node:assert/strict';
import {locationOf,careerOf,employmentOf,annotateJob,passesFilters,validateFilters,locationCatalog} from '../job-filters.mjs';
const job=(region,extra={})=>annotateJob({region,title:'공고',content:'',type:'',...extra});
const geo=(province,name,town)=>{
 const p=locationCatalog().provinces.find(p=>p.id===province),d=p?.districts.find(d=>d.name===name),t=d?.towns.find(t=>t.name===town);
 return new URLSearchParams({province:province||'',district:d?.id||'',town:t?.id||''});
};
test('전국 법정동 목록과 세종·일반구·읍면·동 단계 검증',()=>{
 const data=locationCatalog();assert.ok(data.provinces.length>=15);assert.ok(data.townCount>5000);
 assert.ok(data.provinces.find(p=>p.id==='36').districts[0].direct);
 for(const [p,d,t] of [['26','해운대구','우동'],['11','강서구','화곡동'],['41','수원시 장안구','정자동'],['36','시·군·구 구분 없음','조치원읍']]){
  const params=geo(p,d,t);assert.ok(params.get('town'));assert.ok(validateFilters(params));
 }
 const invalid=geo('26','해운대구','우동');invalid.set('province','11');assert.equal(validateFilters(invalid),false);
 assert.equal(validateFilters(new URLSearchParams({town:'2635010500'})),false);
});
test('전국·시도·시군구·법정동 필터와 여러 근무지의 구동 쌍 유지',()=>{
 const j=job('부산광역시 해운대구 우동, 부산광역시 연제구 연산동');
 assert.ok(passesFilters(j,geo('26','해운대구','우동')));
 assert.ok(!passesFilters(j,geo('26','해운대구','반여동')));
 assert.ok(!passesFilters(j,geo('11','강서구','화곡동')));
 assert.ok(passesFilters(job('서울특별시 강서구 화곡동'),geo('11','강서구','화곡동')));
 assert.ok(passesFilters(job('경기 수원시 장안구 정자동'),geo('41','수원시 장안구','정자동')));
 assert.ok(passesFilters(job('세종 조치원읍'),geo('36','시·군·구 구분 없음','조치원읍')));
 assert.ok(passesFilters(job('세종'),geo('36','시·군·구 구분 없음')));
 assert.ok(passesFilters(job('전국'),geo('51')));
 assert.equal(locationOf('해외').locations.length,0);assert.equal(locationOf('강서구').locations.length,0);
});
test('상세 미제공은 선택한 시도 안에서만 포함하고 접수처를 근무지로 추정하지 않음',()=>{
 const p=geo('26','해운대구','우동');assert.equal(passesFilters(job('부산'),p),false);p.set('includeUnknownLocation','1');assert.equal(passesFilters(job('부산'),p),true);
 assert.equal(passesFilters(job('서울'),p),false);assert.equal(passesFilters(job('부산 연제구'),p),false);
 const parent=geo('41','수원시 장안구');parent.set('includeUnknownLocation','1');assert.ok(passesFilters(job('경기 수원시'),parent));
 const other=geo('41','성남시 분당구');other.set('includeUnknownLocation','1');assert.ok(!passesFilters(job('경기 수원시'),other));
 assert.equal(passesFilters(job(''),p),false);assert.equal(passesFilters(job('부산 해운대구',{content:'접수처 부산 해운대구 우동'}),geo('26','해운대구','우동')),false);
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
test('경력·고용형태는 지역 조건과 함께 적용',()=>{
 const j=job('부산 수영구 광안동',{type:'청년인턴',content:'경력무관.'});const p=geo('26','수영구','광안동');p.set('experience','신입');p.set('employment','인턴');assert.ok(passesFilters(j,p));p.set('employment','계약직');assert.ok(!passesFilters(j,p));assert.ok(!validateFilters(new URLSearchParams({employment:'임의값'})));
});
