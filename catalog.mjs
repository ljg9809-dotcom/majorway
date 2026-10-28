export const majors = [
  {id:'software',group:'공학',name:'컴퓨터·소프트웨어',subs:['소프트웨어공학','인공지능·데이터','정보보안'],roles:[{name:'전산·정보화',desc:'기관의 시스템과 데이터를 운영하고 정보 서비스를 개선해요.',words:['전산','정보화','소프트웨어','개발','데이터','보안','시스템']}],skills:['프로그래밍','데이터베이스','정보처리']},
  {id:'business',group:'사회·경영',name:'경영·경제',subs:['경영학','회계·재무','경제학'],roles:[{name:'경영·행정 지원',desc:'기관 운영에 필요한 사업 기획과 행정 업무를 맡아요.',words:['경영','행정','사무','인사','총무','사업관리','경영기획']},{name:'회계·재무',desc:'예산과 회계를 관리하고 지출의 흐름을 살펴봐요.',words:['회계','재무','예산','세무','결산']}],skills:['문서 작성','자료 분석','회계 기초']},
  {id:'tourism',group:'사회·경영',name:'관광·호텔',subs:['관광경영','호텔경영','관광콘텐츠'],roles:[{name:'관광·문화 사업',desc:'지역의 관광 자원을 알리고 방문객을 위한 프로그램을 운영해요.',words:['관광','호텔','축제','콘텐츠','문화','홍보','마케팅']}],skills:['콘텐츠 기획','외국어','서비스 운영']},
  {id:'welfare',group:'인문·교육',name:'사회복지·심리',subs:['사회복지학','상담심리','아동·청소년'],roles:[{name:'복지·상담',desc:'주민에게 필요한 지원을 연결하고 상담과 복지 프로그램을 운영해요.',words:['복지','상담','아동','청소년','돌봄','사례관리','장애인']}],skills:['상담·소통','복지 제도 이해','사례 관리']},
  {id:'design',group:'예술·디자인',name:'디자인·예술',subs:['시각디자인','영상·미디어','미술·전시'],roles:[{name:'디자인·전시',desc:'정보를 시각적으로 전달하거나 전시와 문화 프로그램을 만들어요.',words:['디자인','미술','전시','큐레이터','영상','홍보','콘텐츠']}],skills:['시각 표현','포트폴리오','콘텐츠 제작']},
  {id:'engineering',group:'공학',name:'기계·전기·건축',subs:['기계공학','전기·전자공학','건축·토목공학'],roles:[{name:'시설·기술',desc:'공공시설과 설비가 안전하게 작동하도록 점검하고 관리해요.',words:['기계','전기','전자','건축','토목','시설','설비','안전','기술']}],skills:['도면 이해','안전 관리','전공 기술']},
  {id:'environment',group:'자연·해양',name:'환경·해양',subs:['환경공학','해양과학','생명과학'],roles:[{name:'환경·해양 조사',desc:'환경과 해양 자료를 수집·분석하고 관련 연구를 도와요.',words:['환경','해양','생태','수질','생명','조사','연구']}],skills:['자료 분석','현장 조사','연구 방법']},
  {id:'education',group:'인문·교육',name:'교육·인문',subs:['교육학','문헌정보학','어문학'],roles:[{name:'교육·도서관',desc:'학습 프로그램과 도서관 서비스를 운영하며 배움의 기회를 연결해요.',words:['교육','도서관','사서','강사','학습','번역','국제']}],skills:['프로그램 기획','글쓰기','소통']}
];
const specific = {
 '회계·재무':['회계','재무','예산','세무','결산'], '정보보안':['보안','정보보호','전산'],
 '인공지능·데이터':['인공지능','데이터','통계','분석'], '소프트웨어공학':['전산','개발','소프트웨어','시스템'],
 '기계공학':['기계','설비'], '전기·전자공학':['전기','전자'], '건축·토목공학':['건축','토목'],
 '상담심리':['상담','심리'], '아동·청소년':['아동','청소년','돌봄'], '미술·전시':['미술','전시','큐레이터'],
 '시각디자인':['디자인','시각','홍보'], '영상·미디어':['영상','미디어','콘텐츠'],
 '환경공학':['환경','수질','생태'], '해양과학':['해양','수산'], '생명과학':['생명','생물','연구'],
 '문헌정보학':['도서관','사서'], '교육학':['교육','학습','강사'], '어문학':['번역','국제','외국어'],
 '호텔경영':['호텔','숙박','관광'], '관광콘텐츠':['관광','콘텐츠','축제']
};
export function relatedWords(major, sub, role) {
 const roles = role ? major.roles.filter(r=>r.name===role) : major.roles;
 const words = roles.flatMap(r=>r.words);
 if(major.officialKeywords)return [...new Set(words)];
 return [...new Set(sub && specific[sub] ? words.filter(w=>specific[sub].includes(w)).concat(specific[sub]) : words)];
}
export function matching(job, words) {
 const primary = `${job.title} ${job.field}`;
 const found = words.filter(w=>`${primary} ${job.content}`.toLowerCase().includes(w.toLowerCase()));
 return {words:found,score:found.reduce((n,w)=>n+(primary.includes(w)?3:1),0)};
}
export function dateOnly(value) {
 const s=String(value??'').trim();
 const m=s.match(/^(\d{4})[-./]?(\d{2})[-./]?(\d{2})(?:$|[ T])/);
 if(!m)return null;
 const iso=`${m[1]}-${m[2]}-${m[3]}`;
 const d=new Date(iso+'T00:00:00Z');
 return !isNaN(d)&&d.toISOString().slice(0,10)===iso?iso:null;
}
export function clean(value, key='') {
 let s=String(value??'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').trim();
 for(const secret of [key,encodeURIComponent(key)]) if(secret) s=s.split(secret).join('[비공개]');
 return s.replace(/(?:ServiceKey|serviceKey|BUSAN_API_KEY)\s*[=:]\s*[^\s&<>"']+/gi,'인증정보=[비공개]').slice(0,30000);
}
export function normalize(row, key='') {
 const pick = k=>clean(row[k],key);
 return { title:pick('title'),agency:pick('recruitAgencyName'),field:pick('bunya'),type:pick('workDate_nm'),region:pick('workregiontxt'),start:dateOnly(row.reqDate_s),end:dateOnly(row.reqDate_e),method:pick('reqType_nm'),content:pick('content') };
}
export function demoJobs() {
 const now=new Date();const day=n=>new Date(now.getTime()+n*86400000).toISOString().slice(0,10);
 return [
 ['정보화 시스템 운영 지원 청년인턴','예시 공공기관 A','전산·데이터 관리','청년인턴','전산 시스템 운영과 데이터 정리, 정보보안 점검을 지원합니다.'],
 ['경영지원 및 회계 사무원 모집','예시 공공기관 B','행정·회계','기간제','사업 기획 및 행정, 예산 집행과 회계 결산 업무를 지원합니다.'],
 ['관광 콘텐츠 기획 운영 인턴','예시 공공기관 C','관광·홍보','청년인턴','지역 관광 콘텐츠와 축제 홍보, 온라인 마케팅 업무를 지원합니다.'],
 ['청소년 복지 프로그램 운영 담당','예시 공공기관 D','복지·상담','기간제','아동·청소년 상담과 돌봄 프로그램 운영, 사례관리를 지원합니다.'],
 ['시각디자인 및 전시 운영 지원','예시 공공기관 E','디자인·전시','기간제','문화 전시 홍보 디자인, 영상 콘텐츠 제작 및 큐레이터 업무를 지원합니다.'],
 ['공공시설 기술직 채용','예시 공공기관 F','전기·기계·시설','공무직','공공시설의 전기, 기계 설비 안전 점검과 건축 시설 관리를 수행합니다.'],
 ['해양환경 조사 연구보조원','예시 공공기관 G','환경·해양','기간제','해양 환경 및 수질 현장 조사와 생태 연구 데이터 분석을 지원합니다.'],
 ['도서관 교육 프로그램 운영','예시 공공기관 H','교육·사서','기간제','도서관 학습 프로그램 기획과 교육 운영, 사서 업무를 지원합니다.']
 ].map(([title,agency,field,type,content],i)=>({title,agency,field,type,content:content+' '+['경력무관.','응시자격: 경력 2년 이상 필수.','신입 지원 가능.','신입 및 경력자 모집.','','응시자격: 경력 3년 이상 필수.','신입 지원 가능.','경력무관.'][i],region:['부산광역시 해운대구 우동','부산광역시 부산진구 부전동','부산광역시 수영구 광안동','부산광역시 사상구 괘법동','부산광역시 중구 중앙동4가','부산광역시 강서구 명지동','부산광역시 기장군 일광읍','부산'][i],start:day(-7),end:day(7+i),method:'기관 안내 확인'}));
}
