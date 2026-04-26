import { Injectable } from '@nestjs/common';
import { DomainService } from '../domain/domain.service';
import { GeminiService } from '../gemini/gemini.service';
import type {
  IOnboardingChatBody,
  IOnboardingChatResult,
  IOnboardingDomainSuggestion,
} from './dto/onboarding.dto';

@Injectable()
export class OnboardingService {
  constructor(
    private readonly domainService: DomainService,
    private readonly gemini: GeminiService,
  ) {}

  async chat(body: IOnboardingChatBody): Promise<IOnboardingChatResult> {
    const { context } = body;
    const hasDomain = context?.selectedDomainId || context?.selectedDomainName;

    // 태그까지 선택 완료 → 목표 확정
    if (hasDomain && context?.selectedTagIds?.length) {
      return {
        type: 'confirm' as const,
        message: '목표가 설정되었어요! 아래에서 확인하고 학습을 시작해주세요.',
        confirmed: {
          domainId: context.selectedDomainId ?? '',
          domainName: context.selectedDomainName ?? '',
          target: body.message,
          tagIds: context.selectedTagIds,
        },
      };
    }

    // 도메인 선택됨 → 태그 단계
    if (hasDomain) {
      return this.handleTagStep(body);
    }

    // 도메인 미선택 → 도메인 검색/추천
    return this.handleDomainStep(body);
  }

  /**
   * 도메인 검색 단계.
   * - 임베딩 유사도 검색 (offset 기반 페이지네이션)
   * - 매칭 없으면 LLM 도메인 추출 → 새 도메인 제안
   */
  private async handleDomainStep(
    body: IOnboardingChatBody,
  ): Promise<IOnboardingChatResult> {
    const offset = body.context?.suggestedDomains?.length ?? 0;
    const { tags, matches } = await this.domainService.searchDomains(
      body.message,
    );

    if (matches.length > offset) {
      // 아직 안 보여준 매칭 도메인이 있으면 다음 5개
      const nextBatch = matches.slice(offset, offset + 5);
      const hasMore = matches.length > offset + 5;

      return {
        type: 'suggest_domains',
        message: offset === 0
          ? '추천 도메인이에요! 이 중에 있으신가요?'
          : '더 찾아봤어요! 이 중에 있으신가요?',
        domains: [
          ...nextBatch.map((m) => ({
            id: m.id,
            name: m.name,
            similarity: m.similarity,
            isNew: false,
          })),
          // 매칭이 더 있거나, 없으면 직접 생성 옵션
          ...(hasMore
            ? []
            : []),
        ],
      };
    }

    // 태그 기반 이름 매칭 시도
    if (tags.length > 0) {
      const domains = await this.domainService.findDomainsByNames(tags);
      const unseen = domains.filter(
        (d) => !body.context?.suggestedDomains?.some((s) => s.id === d.id),
      );
      if (unseen.length > 0) {
        return {
          type: 'suggest_domains',
          message: '혹시 이런 분야를 찾으시나요?',
          domains: unseen.map((d) => ({
            id: d.id,
            name: d.name,
            similarity: 0.8,
            isNew: false,
          })),
        };
      }
    }

    // LLM fallback — 새 도메인 제안
    const llmTags = await this.gemini.extractTags(body.message);
    const suggestions: IOnboardingDomainSuggestion[] = llmTags
      .slice(0, 5)
      .map((tag) => ({ name: tag, isNew: true }));

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
   * 태그 단계.
   * - 5개씩 페이지네이션 (context.suggestedTags로 offset 관리)
   * - "이 중에 없어요" → 다음 5개
   * - 전부 다 보면 → 직접 입력으로 LLM 태그 생성
   */
  private async handleTagStep(
    body: IOnboardingChatBody,
  ): Promise<IOnboardingChatResult> {
    const { context } = body;
    const domainId = context?.selectedDomainId;
    const domainName = context?.selectedDomainName ?? '';
    const seenTagIds = new Set(
      (context?.suggestedTags ?? []).map((t) => t.id),
    );

    // 도메인이 DB에 없으면 먼저 생성
    const resolvedDomainId = domainId
      ?? (await this.domainService.findOrCreate(domainName)).id;

    // 유저가 직접 텍스트 입력 (태그 생성 요청)
    const userMsg = body.message.trim();
    const isNoneOfThese = userMsg === '이 중에 없어요';
    const isTextInput = !isNoneOfThese
      && userMsg.length > 1
      && !userMsg.includes('선택')
      && !userMsg.includes('확정');

    if (isTextInput) {
      // LLM으로 유저 의도에서 태그 추출 + 생성
      const suggestedNames = await this.gemini.suggestDomainTags(
        domainName,
        userMsg,
      );

      const newTags = [];
      for (const name of suggestedNames) {
        const tag = await this.domainService.findOrCreateTag(resolvedDomainId, name, 'llm');
        newTags.push(tag);
      }

      return {
        type: 'suggest_tags',
        message: `"${userMsg}" 관련 태그를 만들었어요! 원하는 태그를 선택해주세요.`,
        tags: newTags.map((t) => ({ id: t.id, name: t.name })),
      };
    }

    // 기존 태그 전체 조회
    const allTags = await this.domainService.getTagsByDomainId(resolvedDomainId);

    if (allTags.length > 0) {
      // 아직 안 보여준 태그 필터링
      const unseen = allTags.filter((t) => !seenTagIds.has(t.id));

      if (unseen.length > 0) {
        // 다음 5개 반환
        const batch = unseen.slice(0, 5);
        const hasMore = unseen.length > 5;

        return {
          type: 'suggest_tags',
          message: seenTagIds.size === 0
            ? `${domainName}의 세부 주제예요. 관심 있는 태그를 선택해주세요!`
            : '더 찾아봤어요!',
          tags: batch.map((t) => ({ id: t.id, name: t.name })),
        };
      }

      // 모든 태그를 다 보여줬는데 "이 중에 없어요"
      return {
        type: 'suggest_tags',
        message: '모든 기존 태그를 다 보여드렸어요. 원하는 주제를 직접 입력해주세요!',
        tags: [],
      };
    }

    // 태그가 아예 없으면 LLM으로 초기 태그 생성
    const suggestedNames = await this.gemini.suggestDomainTags(domainName);
    const createdTags = [];
    for (const name of suggestedNames) {
      const tag = await this.domainService.findOrCreateTag(resolvedDomainId, name, 'llm');
      createdTags.push(tag);
    }

    const batch = createdTags.slice(0, 5);

    return {
      type: 'suggest_tags',
      message: `${domainName}에 맞는 학습 주제를 만들었어요. 선택해주세요!`,
      tags: batch.map((t) => ({ id: t.id, name: t.name })),
    };
  }
}
