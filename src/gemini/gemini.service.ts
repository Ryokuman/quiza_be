import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly client: GoogleGenerativeAI;

  constructor(private readonly configService: ConfigService) {
    this.client = new GoogleGenerativeAI(
      this.configService.getOrThrow<string>('GEMINI_API_KEY'),
    );
  }

  /**
   * 유저 자연어 입력에서 도메인 태그를 추출한다.
   * 예: "토익 800점 맞고 싶어" → ["영어", "토익", "시험준비"]
   */
  async extractTags(userInput: string): Promise<string[]> {
    const model = this.client.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent(
      `유저가 공부하고 싶은 내용을 자연어로 입력했습니다. 이 입력에서 관련 도메인 태그를 추출해주세요.

규칙:
- 태그는 한국어로 출력
- 가장 넓은 카테고리(도메인)를 첫 번째로
- 세부 주제를 뒤에
- 3~5개 태그
- JSON 배열 형식으로만 응답 (다른 텍스트 없이)

유저 입력: "${userInput}"`,
    );

    const text = result.response.text().trim();
    const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');

    try {
      const tags = JSON.parse(cleaned);
      if (Array.isArray(tags)) return tags;
    } catch {
      this.logger.warn(`Failed to parse extractTags response: ${text}`);
    }
    return [];
  }

  /**
   * 도메인에 적합한 학습 태그를 추천한다.
   * 예: domain="토익", target="800점" → ["listening", "reading", "grammar", "vocabulary", "part5_문법"]
   */
  async suggestDomainTags(domain: string, target?: string): Promise<string[]> {
    const model = this.client.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const context = target ? `도메인: "${domain}", 학습 목표: "${target}"` : `도메인: "${domain}"`;

    const result = await model.generateContent(
      `${context}에 적합한 세부 학습 주제 태그를 추천해주세요.

규칙:
- 5~8개 태그
- 한국어 또는 해당 분야에서 통용되는 용어
- 구체적인 하위 주제 (너무 넓지 않게)
- JSON 배열 형식으로만 응답 (다른 텍스트 없이)`,
    );

    const text = result.response.text().trim();
    const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');

    try {
      const tags = JSON.parse(cleaned);
      if (Array.isArray(tags)) return tags;
    } catch {
      this.logger.warn(`Failed to parse suggestDomainTags response: ${text}`);
    }
    return [];
  }

  /**
   * 텍스트를 768차원 임베딩 벡터로 변환한다.
   * Gemini text-embedding-004 모델 사용.
   */
  /**
   * 서술형 문제를 생성한다.
   * Gemini로 rubric(채점 기준) 포함 서술형 문제 + 모범답안을 생성.
   */
  async generateEssayQuestions(
    tagName: string,
    difficulty: number,
    count: number,
  ): Promise<
    {
      content: string;
      answer: string;
      rubric: string;
      max_score: number;
      explanation: string;
    }[]
  > {
    const model = this.client.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent(
      `당신은 교육 전문가입니다. "${tagName}" 주제로 서술형 문제를 생성해주세요.

요구사항:
- 난이도: ${difficulty}/5
- 문제 수: ${count}개
- 각 문제마다 다음을 포함:
  - content: 문제 본문 (서술형으로 답해야 하는 질문)
  - answer: 모범답안 (완전한 서술형 답변)
  - rubric: 채점 기준 (핵심 키워드, 논리 구조, 배점 기준을 명시)
  - max_score: 배점 (난이도에 따라 5~10)
  - explanation: 해설

JSON 배열 형식으로만 응답 (다른 텍스트 없이):
[{"content":"...","answer":"...","rubric":"...","max_score":10,"explanation":"..."}]`,
    );

    const text = result.response.text().trim();
    const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');

    try {
      const questions = JSON.parse(cleaned);
      if (Array.isArray(questions)) return questions;
    } catch {
      this.logger.warn(`Failed to parse generateEssayQuestions response: ${text}`);
    }
    return [];
  }

  /**
   * 단답형 의미 동일 여부를 판단한다.
   * 편집 거리 > 2인 경우 Gemini로 의미 비교.
   */
  async judgeSingleAnswer(
    correctAnswer: string,
    userAnswer: string,
  ): Promise<{ isCorrect: boolean; reason: string }> {
    const model = this.client.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent(
      `정답: "${correctAnswer}"
유저 답변: "${userAnswer}"

유저의 답변이 정답과 의미적으로 동일한지 판단해주세요.
- 동의어, 다른 표현, 약어 등도 정답으로 인정
- 의미가 다르면 오답

JSON으로만 응답:
{"is_correct": true/false, "reason": "판단 근거"}`,
    );

    const text = result.response.text().trim();
    const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');

    try {
      const parsed = JSON.parse(cleaned);
      return { isCorrect: !!parsed.is_correct, reason: parsed.reason ?? '' };
    } catch {
      this.logger.warn(`Failed to parse judgeSingleAnswer response: ${text}`);
      return { isCorrect: false, reason: 'AI 판단 실패' };
    }
  }

  /**
   * 서술형 답안을 rubric 기반으로 채점한다.
   * 점수(0~max_score) + 채점 근거를 반환.
   */
  async gradeEssay(
    question: string,
    correctAnswer: string,
    rubric: string,
    maxScore: number,
    userAnswer: string,
  ): Promise<{ score: number; reason: string }> {
    const model = this.client.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent(
      `당신은 공정한 채점관입니다. 아래 서술형 답안을 채점해주세요.

[문제]
${question}

[모범답안]
${correctAnswer}

[채점 기준 (rubric)]
${rubric}

[배점]
${maxScore}점 만점

[유저 답안]
${userAnswer}

채점 규칙:
- rubric의 각 기준에 따라 부분점수 부여
- 0점 ~ ${maxScore}점 사이 정수 또는 0.5 단위
- 핵심 키워드 포함 여부, 논리 구조, 정확성을 종합 평가

JSON으로만 응답:
{"score": 숫자, "reason": "채점 근거 (어떤 기준을 충족/미충족했는지)"}`,
    );

    const text = result.response.text().trim();
    const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');

    try {
      const parsed = JSON.parse(cleaned);
      const score = Math.max(0, Math.min(maxScore, Number(parsed.score)));
      return { score, reason: parsed.reason ?? '' };
    } catch {
      this.logger.warn(`Failed to parse gradeEssay response: ${text}`);
      return { score: 0, reason: 'AI 채점 실패' };
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const model = this.client.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(text);
    return result.embedding.values;
  }
}
