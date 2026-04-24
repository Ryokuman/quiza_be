import { Injectable } from '@nestjs/common';
import { DomainService } from '../domain/domain.service.js';
import { GeminiService } from '../gemini/gemini.service.js';
import type {
  IOnboardingChatBody,
  IOnboardingChatResult,
  IOnboardingDomainSuggestion,
} from './dto/onboarding.dto.js';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly domainService: DomainService,
    private readonly gemini: GeminiService,
  ) {}

  /**
   * 온보딩 대화 처리 (최대 3턴).
   *
   * 턴 1: 유저 입력 → 벡터DB 도메인 검색 → 추천
   * 턴 2: 도메인 선택 → 확인 + 태그 검색 → 태그 추천
   * 턴 3: 매칭 실패 시 LLM 도메인 추출 → 유저 선택
   */
  async chat(
    body: IOnboardingChatBody,
  ): Promise<IOnboardingChatResult> {
    const { turn, context } = body;

    // 도메인이 이미 선택된 상태 → 태그 추천
    if (context?.selectedDomainId) {
      return this.handleTagSearch(body);
    }

    // 턴별 분기
    switch (turn) {
      case 1:
        return this.handleTurn1(body);
      case 2:
        return this.handleTurn2(body);
      case 3:
        return this.handleTurn3(body);
      default:
        return this.handleTurn1(body);
    }
  }

  /**
   * 턴 1: 임베딩 → 벡터DB 도메인 검색
   */
  private async handleTurn1(
    body: IOnboardingChatBody,
  ): Promise<IOnboardingChatResult> {
    const { tags, matches } = await this.domainService.searchDomains(
      body.message,
    );

    if (matches.length > 0) {
      return {
        type: 'suggest_domains',
        message: '추천 도메인이에요! 이 중에 있으신가요?',
        domains: matches.map((m) => ({
          id: m.id,
          name: m.name,
          similarity: m.similarity,
          isNew: false,
        })),
      };
    }

    // 벡터DB 매칭 없음 → 태그 기반 검색 시도
    if (tags.length > 0) {
      const domains = await this.domainService.findDomainsByNames(tags);
      if (domains.length > 0) {
        return {
          type: 'suggest_domains',
          message: '혹시 이런 분야를 찾으시나요?',
          domains: domains.map((d) => ({
            id: d.id,
            name: d.name,
            similarity: 0.8,
            isNew: false,
          })),
        };
      }
    }

    // 아무것도 안 나옴 → 더 자세히 물어보기
    return {
      type: 'suggest_domains',
      message: '정확한 도메인을 찾지 못했어요. 좀 더 자세히 말씀해주세요!',
      domains: [],
    };
  }

  /**
   * 턴 2: 유저가 추가 입력하거나 도메인 선택을 확인
   */
  private async handleTurn2(
    body: IOnboardingChatBody,
  ): Promise<IOnboardingChatResult> {
    // 유저가 도메인 이름을 직접 입력한 경우 → 재검색
    const { matches } = await this.domainService.searchDomains(body.message);

    if (matches.length > 0) {
      return {
        type: 'suggest_domains',
        message: '이 도메인이 맞으신가요?',
        domains: matches.map((m) => ({
          id: m.id,
          name: m.name,
          similarity: m.similarity,
          isNew: false,
        })),
      };
    }

    // 여전히 없으면 → LLM fallback 미리 시도
    return this.handleTurn3(body);
  }

  /**
   * 턴 3 (fallback): LLM으로 도메인 추출 → 최대 5개 제안
   */
  private async handleTurn3(
    body: IOnboardingChatBody,
  ): Promise<IOnboardingChatResult> {
    const tags = await this.gemini.extractTags(body.message);

    const suggestions: IOnboardingDomainSuggestion[] = tags
      .slice(0, 5)
      .map((tag) => ({
        name: tag,
        isNew: true,
      }));

    if (suggestions.length === 0) {
      return {
        type: 'suggest_domains',
        message: '도메인을 파악하기 어려워요. 공부하고 싶은 주제를 구체적으로 알려주세요!',
        domains: [],
      };
    }

    return {
      type: 'suggest_domains',
      message: '이런 도메인을 새로 만들 수 있어요. 하나를 선택해주세요!',
      domains: suggestions,
    };
  }

  /**
   * 도메인 선택 완료 → 태그 검색/추천
   */
  private async handleTagSearch(
    body: IOnboardingChatBody,
  ): Promise<IOnboardingChatResult> {
    const { context } = body;
    const domainId = context!.selectedDomainId!;
    const domainName = context!.selectedDomainName!;

    // 기존 태그 조회
    const existingTags = await this.domainService.getTagsByDomainId(domainId);

    if (existingTags.length > 0) {
      // 벡터 검색으로 유저 입력과 관련 높은 태그 우선 정렬
      const tagResults = await this.domainService.searchTags(
        domainId,
        body.message,
      );

      const tags =
        tagResults.length > 0
          ? tagResults.map((t) => ({ id: t.id, name: t.name, similarity: t.similarity }))
          : existingTags.map((t) => ({ id: t.id, name: t.name }));

      return {
        type: 'suggest_tags',
        message: `${domainName}의 세부 주제예요. 관심 있는 태그를 선택해주세요!`,
        tags,
      };
    }

    // 태그가 없으면 LLM으로 생성 추천
    const suggestedNames = await this.gemini.suggestDomainTags(
      domainName,
      body.message,
    );

    // 태그 생성 후 반환
    const createdTags = [];
    for (const name of suggestedNames) {
      const tag = await this.domainService.findOrCreateTag(domainId, name, 'llm');
      createdTags.push(tag);
    }

    return {
      type: 'suggest_tags',
      message: `${domainName}에 맞는 학습 주제를 만들었어요. 선택해주세요!`,
      tags: createdTags.map((t) => ({ id: t.id, name: t.name })),
    };
  }
}
