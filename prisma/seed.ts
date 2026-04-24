import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL']! });
const prisma = new PrismaClient({ adapter });

const DOMAINS = [
  '영어', '수학', '프로그래밍', '요리', '일본어',
  '한국사', '경제학', '물리학', '심리학', '음악이론',
];

const QUESTIONS: Record<string, Array<{
  tag: string; type: string; difficulty: number;
  content: string; options: string[]; answer: string; explanation?: string;
}>> = {
  '영어': [
    { tag: 'grammar', type: 'multi', difficulty: 1, content: '"She ___ to school every day." 빈칸에 알맞은 것은?', options: ['go', 'goes', 'going', 'gone'], answer: 'goes', explanation: '3인칭 단수 현재형에는 -es를 붙입니다.' },
    { tag: 'grammar', type: 'multi', difficulty: 2, content: '"If I ___ rich, I would travel the world." 빈칸에 알맞은 것은?', options: ['am', 'was', 'were', 'be'], answer: 'were', explanation: '가정법 과거에서는 be동사를 were로 씁니다.' },
    { tag: 'vocabulary', type: 'multi', difficulty: 1, content: '"Abundant"의 의미는?', options: ['부족한', '풍부한', '평범한', '희귀한'], answer: '풍부한' },
    { tag: 'vocabulary', type: 'multi', difficulty: 3, content: '"Ubiquitous"의 의미는?', options: ['어디에나 있는', '독특한', '희귀한', '위험한'], answer: '어디에나 있는' },
    { tag: 'reading', type: 'multi', difficulty: 2, content: '다음 중 "nevertheless"와 가장 비슷한 의미는?', options: ['therefore', 'however', 'moreover', 'furthermore'], answer: 'however' },
  ],
  '수학': [
    { tag: 'algebra', type: 'single', difficulty: 1, content: '2x + 3 = 11 일 때 x의 값은?', options: [], answer: '4', explanation: '2x = 8, x = 4' },
    { tag: 'algebra', type: 'multi', difficulty: 2, content: 'x² - 5x + 6 = 0 의 근은?', options: ['1, 6', '2, 3', '-2, -3', '1, 5'], answer: '2, 3', explanation: '(x-2)(x-3) = 0' },
    { tag: 'geometry', type: 'multi', difficulty: 1, content: '삼각형의 내각의 합은?', options: ['90°', '180°', '270°', '360°'], answer: '180°' },
    { tag: 'geometry', type: 'multi', difficulty: 3, content: '반지름이 5인 원의 넓이는? (π ≈ 3.14)', options: ['31.4', '78.5', '15.7', '25'], answer: '78.5', explanation: 'πr² = 3.14 × 25 = 78.5' },
    { tag: 'calculus', type: 'single', difficulty: 4, content: 'f(x) = 3x² + 2x 일 때 f\'(x)는?', options: [], answer: '6x + 2', explanation: '미분: 3·2x + 2 = 6x + 2' },
  ],
  '프로그래밍': [
    { tag: 'javascript', type: 'multi', difficulty: 1, content: 'JavaScript에서 변수를 선언하는 키워드가 아닌 것은?', options: ['let', 'const', 'var', 'int'], answer: 'int' },
    { tag: 'javascript', type: 'multi', difficulty: 2, content: '`typeof null`의 결과는?', options: ['"null"', '"undefined"', '"object"', '"boolean"'], answer: '"object"', explanation: 'JavaScript의 역사적 버그입니다.' },
    { tag: 'python', type: 'multi', difficulty: 1, content: 'Python에서 리스트에 요소를 추가하는 메서드는?', options: ['add()', 'append()', 'push()', 'insert_end()'], answer: 'append()' },
    { tag: 'algorithm', type: 'multi', difficulty: 3, content: '퀵소트의 평균 시간복잡도는?', options: ['O(n)', 'O(n log n)', 'O(n²)', 'O(log n)'], answer: 'O(n log n)' },
    { tag: 'database', type: 'multi', difficulty: 2, content: 'SQL에서 중복을 제거하는 키워드는?', options: ['UNIQUE', 'DISTINCT', 'DIFFERENT', 'SINGLE'], answer: 'DISTINCT' },
  ],
  '요리': [
    { tag: 'basics', type: 'multi', difficulty: 1, content: '계란을 삶을 때 반숙이 되려면 끓는 물에 약 몇 분?', options: ['3분', '6분', '12분', '20분'], answer: '6분' },
    { tag: 'basics', type: 'multi', difficulty: 1, content: '된장찌개의 기본 재료가 아닌 것은?', options: ['된장', '두부', '고추장', '파'], answer: '고추장' },
    { tag: 'technique', type: 'multi', difficulty: 2, content: '볶음 요리 시 팬에 기름을 먼저 두르는 이유는?', options: ['맛을 위해', '재료가 눌러붙지 않게', '색을 내기 위해', '영양소 보존'], answer: '재료가 눌러붙지 않게' },
    { tag: 'baking', type: 'multi', difficulty: 3, content: '빵 반죽에서 글루텐이 형성되는 주재료는?', options: ['설탕', '밀가루', '버터', '이스트'], answer: '밀가루' },
    { tag: 'safety', type: 'multi', difficulty: 1, content: '식중독 예방을 위한 올바른 손씻기 시간은 최소?', options: ['5초', '10초', '20초', '60초'], answer: '20초' },
  ],
  '일본어': [
    { tag: 'hiragana', type: 'multi', difficulty: 1, content: '"あ"의 발음은?', options: ['a', 'i', 'u', 'e'], answer: 'a' },
    { tag: 'grammar', type: 'multi', difficulty: 2, content: '"私は学生です"의 의미는?', options: ['나는 선생님입니다', '나는 학생입니다', '나는 회사원입니다', '나는 의사입니다'], answer: '나는 학생입니다' },
    { tag: 'vocabulary', type: 'multi', difficulty: 1, content: '"ありがとう"의 의미는?', options: ['안녕하세요', '감사합니다', '죄송합니다', '잘 부탁합니다'], answer: '감사합니다' },
    { tag: 'kanji', type: 'multi', difficulty: 3, content: '"食べる(たべる)"의 의미는?', options: ['자다', '먹다', '마시다', '걷다'], answer: '먹다' },
    { tag: 'grammar', type: 'multi', difficulty: 4, content: '"彼は走りながら音楽を聴いている"에서 "ながら"의 역할은?', options: ['이유', '동시 동작', '역접', '조건'], answer: '동시 동작' },
  ],
  '한국사': [
    { tag: 'ancient', type: 'multi', difficulty: 1, content: '고조선의 건국 신화에서 건국자는?', options: ['주몽', '단군왕검', '혁거세', '온조'], answer: '단군왕검' },
    { tag: 'medieval', type: 'multi', difficulty: 2, content: '고려를 건국한 인물은?', options: ['왕건', '궁예', '견훤', '이성계'], answer: '왕건' },
    { tag: 'joseon', type: 'multi', difficulty: 2, content: '훈민정음을 창제한 왕은?', options: ['태종', '세종', '성종', '영조'], answer: '세종' },
    { tag: 'modern', type: 'multi', difficulty: 3, content: '3·1 운동이 일어난 해는?', options: ['1910년', '1919년', '1945년', '1950년'], answer: '1919년' },
    { tag: 'joseon', type: 'multi', difficulty: 4, content: '임진왜란에서 거북선을 이끈 장군은?', options: ['권율', '이순신', '곽재우', '김시민'], answer: '이순신' },
  ],
  '경제학': [
    { tag: 'micro', type: 'multi', difficulty: 1, content: '수요와 공급이 만나는 점을 무엇이라 하는가?', options: ['최적점', '균형점', '한계점', '극대점'], answer: '균형점' },
    { tag: 'micro', type: 'multi', difficulty: 2, content: '가격이 오르면 수요량은 일반적으로?', options: ['증가한다', '감소한다', '변하지 않는다', '예측 불가'], answer: '감소한다', explanation: '수요의 법칙' },
    { tag: 'macro', type: 'multi', difficulty: 2, content: 'GDP의 풀네임은?', options: ['Gross Domestic Product', 'General Domestic Price', 'Gross Domestic Price', 'General Development Product'], answer: 'Gross Domestic Product' },
    { tag: 'macro', type: 'multi', difficulty: 3, content: '인플레이션이 지속될 때 중앙은행이 취하는 일반적 정책은?', options: ['금리 인하', '금리 인상', '화폐 발행 증가', '세금 감면'], answer: '금리 인상' },
    { tag: 'finance', type: 'multi', difficulty: 3, content: '기회비용이란?', options: ['실제 지출 비용', '포기한 대안의 가치', '생산 비용', '고정 비용'], answer: '포기한 대안의 가치' },
  ],
  '물리학': [
    { tag: 'mechanics', type: 'multi', difficulty: 1, content: '뉴턴의 제1법칙은?', options: ['작용-반작용', '관성의 법칙', '가속도의 법칙', '만유인력'], answer: '관성의 법칙' },
    { tag: 'mechanics', type: 'single', difficulty: 2, content: 'F = ma에서 질량 5kg, 가속도 3m/s²일 때 힘(N)은?', options: [], answer: '15', explanation: 'F = 5 × 3 = 15N' },
    { tag: 'thermodynamics', type: 'multi', difficulty: 2, content: '절대영도는 섭씨 몇 도인가?', options: ['-100°C', '-273.15°C', '0°C', '-460°C'], answer: '-273.15°C' },
    { tag: 'optics', type: 'multi', difficulty: 3, content: '빛의 3원색이 아닌 것은?', options: ['빨강', '초록', '파랑', '노랑'], answer: '노랑', explanation: '빛의 3원색은 RGB (빨강, 초록, 파랑)' },
    { tag: 'electromagnetism', type: 'multi', difficulty: 4, content: '옴의 법칙에서 V = IR 일 때, 저항이 2배가 되면 전류는?', options: ['2배', '1/2배', '변화 없음', '4배'], answer: '1/2배' },
  ],
  '심리학': [
    { tag: 'general', type: 'multi', difficulty: 1, content: '파블로프의 개 실험에서 나타난 현상은?', options: ['조작적 조건형성', '고전적 조건형성', '관찰 학습', '통찰 학습'], answer: '고전적 조건형성' },
    { tag: 'cognitive', type: 'multi', difficulty: 2, content: '단기기억의 용량은 약 몇 개 항목인가?', options: ['3±1', '5±2', '7±2', '10±3'], answer: '7±2', explanation: '밀러의 마법의 수 7±2' },
    { tag: 'developmental', type: 'multi', difficulty: 2, content: '피아제의 인지발달 단계에서 가장 먼저 오는 것은?', options: ['전조작기', '감각운동기', '구체적 조작기', '형식적 조작기'], answer: '감각운동기' },
    { tag: 'social', type: 'multi', difficulty: 3, content: '밀그램 실험이 보여준 심리 현상은?', options: ['동조', '복종', '방관자 효과', '인지 부조화'], answer: '복종' },
    { tag: 'clinical', type: 'multi', difficulty: 3, content: 'DSM-5에서 우울장애의 핵심 증상 지속 기간 기준은?', options: ['1주', '2주', '1개월', '3개월'], answer: '2주' },
  ],
  '음악이론': [
    { tag: 'basics', type: 'multi', difficulty: 1, content: '음계에서 "도레미파솔라시"는 총 몇 음인가?', options: ['5', '7', '8', '12'], answer: '7' },
    { tag: 'basics', type: 'multi', difficulty: 1, content: '4/4 박자에서 한 마디의 총 박수는?', options: ['2박', '3박', '4박', '6박'], answer: '4박' },
    { tag: 'harmony', type: 'multi', difficulty: 2, content: 'C 메이저 코드의 구성음은?', options: ['C-D-E', 'C-E-G', 'C-F-A', 'C-E-A'], answer: 'C-E-G' },
    { tag: 'harmony', type: 'multi', difficulty: 3, content: '딸림7화음(V7)이 으뜸화음(I)으로 가는 것을 무엇이라 하는가?', options: ['반종지', '정격종지', '변격종지', '편종지'], answer: '정격종지' },
    { tag: 'rhythm', type: 'multi', difficulty: 2, content: '점4분음표의 길이는 4분음표의 몇 배인가?', options: ['1배', '1.5배', '2배', '0.5배'], answer: '1.5배' },
  ],
};

async function main() {
  console.log('Seeding domains...');

  for (const name of DOMAINS) {
    await prisma.domain.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log(`Seeded ${DOMAINS.length} domains`);

  console.log('Seeding questions...');
  let count = 0;

  for (const [, questions] of Object.entries(QUESTIONS)) {
    for (const q of questions) {
      // Check if identical question already exists
      const existing = await prisma.question.findFirst({
        where: { content: q.content },
      });
      if (!existing) {
        await prisma.question.create({ data: q });
        count++;
      }
    }
  }

  console.log(`Seeded ${count} new questions`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
