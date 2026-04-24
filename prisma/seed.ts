import 'dotenv/config';
import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL']! });
const prisma = new PrismaClient({ adapter });

// ── 도메인 → 태그 → 문제 시드 데이터 ──

interface SeedQuestion {
  type: string;
  difficulty: number;
  content: string;
  options: string[];
  answer: string;
  explanation?: string;
}

interface SeedTag {
  name: string;
  questions: SeedQuestion[];
}

interface SeedDomain {
  name: string;
  description: string;
  tags: SeedTag[];
}

const SEED_DATA: SeedDomain[] = [
  {
    name: '토익',
    description: 'TOEIC 시험 대비 영어 학습',
    tags: [
      {
        name: 'listening',
        questions: [
          { type: 'multi', difficulty: 1, content: 'Part 1에서 주로 출제되는 문제 유형은?', options: ['사진 묘사', '질의응답', '짧은 대화', '긴 대화'], answer: '사진 묘사' },
          { type: 'multi', difficulty: 2, content: '"Where is the meeting held?" 에 대한 적절한 응답은?', options: ['Yes, I held it.', 'In the conference room.', 'At 3 o\'clock.', 'Mr. Kim did.'], answer: 'In the conference room.' },
        ],
      },
      {
        name: 'grammar',
        questions: [
          { type: 'multi', difficulty: 1, content: '"She ___ to school every day." 빈칸에 알맞은 것은?', options: ['go', 'goes', 'going', 'gone'], answer: 'goes', explanation: '3인칭 단수 현재형에는 -es를 붙입니다.' },
          { type: 'multi', difficulty: 2, content: '"If I ___ rich, I would travel the world." 빈칸에 알맞은 것은?', options: ['am', 'was', 'were', 'be'], answer: 'were', explanation: '가정법 과거에서는 be동사를 were로 씁니다.' },
          { type: 'multi', difficulty: 3, content: '"The report ___ by the time the meeting starts." 빈칸에 알맞은 것은?', options: ['will complete', 'will be completed', 'will have been completed', 'is completing'], answer: 'will have been completed', explanation: '미래완료 수동태입니다.' },
        ],
      },
      {
        name: 'vocabulary',
        questions: [
          { type: 'multi', difficulty: 1, content: '"Abundant"의 의미는?', options: ['부족한', '풍부한', '평범한', '희���한'], answer: '풍부한' },
          { type: 'multi', difficulty: 3, content: '"Ubiquitous"의 의미는?', options: ['어디에나 있는', '독특한', '희귀한', '위험한'], answer: '어디에나 있는' },
        ],
      },
      {
        name: 'reading',
        questions: [
          { type: 'multi', difficulty: 2, content: '다음 중 "nevertheless"와 가장 비슷한 의미는?', options: ['therefore', 'however', 'moreover', 'furthermore'], answer: 'however' },
          { type: 'multi', difficulty: 3, content: 'Part 7 지문에서 "infer" 문제가 요구하는 것은?', options: ['직접 언급된 정보', '추론된 정보', '작성자의 이름', '날짜 정보'], answer: '추론된 정보' },
        ],
      },
    ],
  },
  {
    name: '대수학',
    description: '방정식, 함수, 수열 등 대수적 사고',
    tags: [
      {
        name: '방정식',
        questions: [
          { type: 'single', difficulty: 1, content: '2x + 3 = 11 일 때 x의 값은?', options: [], answer: '4', explanation: '2x = 8, x = 4' },
          { type: 'multi', difficulty: 2, content: 'x² - 5x + 6 = 0 의 근은?', options: ['1, 6', '2, 3', '-2, -3', '1, 5'], answer: '2, 3', explanation: '(x-2)(x-3) = 0' },
        ],
      },
      {
        name: '함수',
        questions: [
          { type: 'single', difficulty: 3, content: 'f(x) = 2x + 1 일 때 f(3)의 값은?', options: [], answer: '7', explanation: 'f(3) = 2(3) + 1 = 7' },
        ],
      },
      {
        name: '미적분',
        questions: [
          { type: 'single', difficulty: 4, content: 'f(x) = 3x² + 2x 일 때 f\'(x)는?', options: [], answer: '6x + 2', explanation: '미분: 3·2x + 2 = 6x + 2' },
        ],
      },
    ],
  },
  {
    name: '기하학',
    description: '도형, 공간, 좌표 관련 수학',
    tags: [
      {
        name: '평면도형',
        questions: [
          { type: 'multi', difficulty: 1, content: '삼각형의 내각의 합은?', options: ['90°', '180°', '270°', '360°'], answer: '180°' },
          { type: 'multi', difficulty: 3, content: '반지름이 5인 원의 넓이는? (π ≈ 3.14)', options: ['31.4', '78.5', '15.7', '25'], answer: '78.5', explanation: 'πr² = 3.14 × 25 = 78.5' },
        ],
      },
    ],
  },
  {
    name: 'JavaScript',
    description: 'JavaScript 프로그래밍 언어',
    tags: [
      {
        name: '기초문법',
        questions: [
          { type: 'multi', difficulty: 1, content: 'JavaScript에서 변수를 선언하는 키워드가 아닌 것은?', options: ['let', 'const', 'var', 'int'], answer: 'int' },
          { type: 'multi', difficulty: 2, content: '`typeof null`의 결과는?', options: ['"null"', '"undefined"', '"object"', '"boolean"'], answer: '"object"', explanation: 'JavaScript의 역사적 버그입니다.' },
        ],
      },
      {
        name: '비동기',
        questions: [
          { type: 'multi', difficulty: 3, content: 'Promise의 세 가지 상태가 아닌 것은?', options: ['pending', 'fulfilled', 'rejected', 'completed'], answer: 'completed' },
        ],
      },
    ],
  },
  {
    name: 'Python',
    description: 'Python 프로그래밍 언어',
    tags: [
      {
        name: '기초문법',
        questions: [
          { type: 'multi', difficulty: 1, content: 'Python에서 리스트에 요소를 추가하는 메서드는?', options: ['add()', 'append()', 'push()', 'insert_end()'], answer: 'append()' },
        ],
      },
    ],
  },
  {
    name: '알고리즘',
    description: '자료구조와 알고리즘',
    tags: [
      {
        name: '정렬',
        questions: [
          { type: 'multi', difficulty: 3, content: '퀵소트의 평균 시간복잡도는?', options: ['O(n)', 'O(n log n)', 'O(n²)', 'O(log n)'], answer: 'O(n log n)' },
        ],
      },
      {
        name: 'SQL',
        questions: [
          { type: 'multi', difficulty: 2, content: 'SQL에서 중복을 제거하는 키워드는?', options: ['UNIQUE', 'DISTINCT', 'DIFFERENT', 'SINGLE'], answer: 'DISTINCT' },
        ],
      },
    ],
  },
  {
    name: '제과제빵',
    description: '빵, 케이크, 과자 만들기',
    tags: [
      {
        name: '반죽',
        questions: [
          { type: 'multi', difficulty: 3, content: '빵 반죽에서 글루텐이 형성되는 주재료는?', options: ['설탕', '밀가루', '버터', '이스트'], answer: '밀가루' },
        ],
      },
      {
        name: '발효',
        questions: [
          { type: 'multi', difficulty: 2, content: '이스트 발효에 가장 적합한 온도 범위는?', options: ['0~10°C', '25~35°C', '50~60°C', '70~80°C'], answer: '25~35°C' },
        ],
      },
    ],
  },
  {
    name: '한식조리',
    description: '한국 전통 요리 및 조리법',
    tags: [
      {
        name: '기초',
        questions: [
          { type: 'multi', difficulty: 1, content: '된장찌개의 기본 재료가 아닌 것은?', options: ['된장', '두부', '고추장', '파'], answer: '고추장' },
          { type: 'multi', difficulty: 1, content: '계란을 삶을 때 반숙이 되려면 끓는 물에 약 몇 분?', options: ['3분', '6분', '12분', '20분'], answer: '6분' },
        ],
      },
      {
        name: '위생안전',
        questions: [
          { type: 'multi', difficulty: 1, content: '식중독 예방을 위한 올바른 손씻기 시간은 최소?', options: ['5초', '10초', '20초', '60초'], answer: '20초' },
        ],
      },
    ],
  },
  {
    name: '일본어',
    description: '일본어 학습 (히라가나, 문법, 한자)',
    tags: [
      {
        name: '히라가나',
        questions: [
          { type: 'multi', difficulty: 1, content: '"あ"의 발음은?', options: ['a', 'i', 'u', 'e'], answer: 'a' },
        ],
      },
      {
        name: '문법',
        questions: [
          { type: 'multi', difficulty: 2, content: '"私は学生です"의 의미는?', options: ['나는 선생님입니다', '나는 학생입니다', '나는 회사원입니다', '나는 의사입니다'], answer: '나는 학생입니다' },
          { type: 'multi', difficulty: 4, content: '"彼は走りながら音楽を聴いている"에서 "ながら"의 역할은?', options: ['이유', '동시 동작', '역접', '조건'], answer: '동시 동작' },
        ],
      },
      {
        name: '어휘',
        questions: [
          { type: 'multi', difficulty: 1, content: '"ありがとう"의 의미는?', options: ['안녕하세요', '감사합니다', '죄송합니다', '잘 부탁합니다'], answer: '감사합니다' },
        ],
      },
      {
        name: '한자',
        questions: [
          { type: 'multi', difficulty: 3, content: '"食べる(たべる)"의 의미는?', options: ['자다', '먹다', '마시다', '걷다'], answer: '먹다' },
        ],
      },
    ],
  },
  {
    name: '한국사',
    description: '한국 역사 전반',
    tags: [
      {
        name: '고대',
        questions: [
          { type: 'multi', difficulty: 1, content: '고조선의 건국 신화에서 건국자는?', options: ['주몽', '단군왕검', '혁거세', '온조'], answer: '단군왕검' },
        ],
      },
      {
        name: '고려',
        questions: [
          { type: 'multi', difficulty: 2, content: '고려를 건국한 인물은?', options: ['왕건', '궁예', '견훤', '이성계'], answer: '왕건' },
        ],
      },
      {
        name: '조선',
        questions: [
          { type: 'multi', difficulty: 2, content: '훈민정음을 창제한 왕은?', options: ['태종', '세종', '성종', '영조'], answer: '세종' },
          { type: 'multi', difficulty: 4, content: '임진왜란에서 거북선을 이끈 장군은?', options: ['권율', '이순신', '곽재우', '김시민'], answer: '이순신' },
        ],
      },
      {
        name: '근현대',
        questions: [
          { type: 'multi', difficulty: 3, content: '3·1 운동이 일어난 해는?', options: ['1910년', '1919년', '1945년', '1950년'], answer: '1919년' },
        ],
      },
    ],
  },
];

async function main() {
  console.log('[seed] Seeding domains, tags, and questions...');

  for (const domainData of SEED_DATA) {
    // 1. Domain upsert
    const domain = await prisma.domain.upsert({
      where: { name: domainData.name },
      update: { description: domainData.description },
      create: { name: domainData.name, description: domainData.description },
    });
    console.log(`[seed] Domain: ${domain.name} (${domain.id})`);

    for (const tagData of domainData.tags) {
      // 2. Tag upsert (domain_id + name unique)
      const tag = await prisma.tag.upsert({
        where: { domain_id_name: { domain_id: domain.id, name: tagData.name } },
        update: {},
        create: {
          name: tagData.name,
          domain_id: domain.id,
          created_by: 'seed',
        },
      });
      console.log(`[seed]   Tag: ${tag.name} (${tag.id})`);

      // 3. Questions (skip duplicates by content)
      for (const q of tagData.questions) {
        const existing = await prisma.question.findFirst({
          where: { content: q.content },
        });
        if (!existing) {
          await prisma.question.create({
            data: {
              tag_id: tag.id,
              type: q.type,
              difficulty: q.difficulty,
              content: q.content,
              options: q.options,
              answer: q.answer,
              explanation: q.explanation,
            },
          });
        }
      }
    }
  }

  console.log('[seed] Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
