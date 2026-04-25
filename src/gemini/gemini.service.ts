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
  async generateEmbedding(text: string): Promise<number[]> {
    const model = this.client.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(text);
    return result.embedding.values;
  }
}
