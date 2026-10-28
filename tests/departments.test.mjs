import test from 'node:test';
import assert from 'node:assert/strict';
import {searchDepartments,getDepartment,departmentMetadata} from '../departments.mjs';
import {relatedWords} from '../catalog.mjs';
test('대학알리미 전체 응답 건수와 학부 수집 범위',()=>{
 assert.equal(departmentMetadata.sourceCount,40155);
 assert.equal(departmentMetadata.activeRecords,16180);
 assert.equal(departmentMetadata.activeNames,8165);
 assert.equal(departmentMetadata.year,2026);
});
test('경영정보학과는 경영과 정보화 직무로 연결',()=>{
 const result=searchDepartments('경영정보학과');
 const exact=result.items.find(d=>d.name==='경영정보학과');assert.ok(exact);
 const p=getDepartment(exact.id);
 assert.ok(p.roles.some(r=>r.name==='전산·정보화'));
 assert.ok(p.roles.some(r=>r.name==='경영·행정 지원'));
 assert.ok(!relatedWords(p,'','전산·정보화').includes('회계'));
 assert.ok(p.department.offerings.some(o=>o.school==='동아대학교'));
});
test('학교 필터와 띄어쓰기, 폐과 포함 검색',()=>{
 const spaced=searchDepartments('경영 정보','동아');
 assert.ok(spaced.total>0);assert.ok(spaced.items.every(d=>d.schools.every(s=>s.includes('동아'))));
 assert.ok(searchDepartments('', '',true,100000).total>searchDepartments('', '',false,100000).total);
 const global=searchDepartments('글로벌경영');assert.ok(global.total>0);
 const profile=getDepartment(global.items[0].id);assert.ok(profile.roles.some(r=>r.name==='국제·통상·물류'));
 assert.equal(getDepartment('../.env'),null);
});
