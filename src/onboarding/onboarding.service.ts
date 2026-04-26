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
   * - 기존 태그 표시 + 유저 메시지로 새 태그 생성 가능
   * - "토익 하고 싶어요" 같은 입력 → LLM으로 태그 추출 → 기존 태그에 추가
   */
  private async handleTagStep(
    body: IOnboardingChatBody,
  ): Promise<IOnboardingChatResult> {
    const { context } = body;
    const domainId = context?.selectedDomainId;
    const domainName = context?.selectedDomainName ?? '';

    // 도메인이 DB에 없으면 먼저 생성
    const resolvedDomainId = domainId
      ?? (await this.domainService.findOrCreate(domainName)).id;

    // 기존 태그 조회
    const existingTags = await this.domainService.getTagsByDomainId(resolvedDomainId);

    // 유저 메시지가 단순 선택이 아닌 텍스트 입력이면 → 새 태그 생성 시도
    const userMsg = body.message.trim();
    const isTextInput = userMsg.length > 1
      && !userMsg.includes('선택')
      && !userMsg.includes('확정');

    if (isTextInput) {
      // LLM으로 유저 의도에서 태그 추출
      const suggestedNames = await this.gemini.suggestDomainTags(
        domainName,
        userMsg,
      );

      // 새 태그 생성 (이미 있으면 findOrCreate가 기존 것 반환)
      const newTags = [];
      for (const name of suggestedNames) {
        const tag = await this.domainService.findOrCreateTag(resolvedDomainId, name, 'llm');
        newTags.push(tag);
      }

      // 기존 + 새 태그 합쳐서 반환 (중복 제거)
      const allTagMap = new Map<string, { id: string; name: string }>();
      for (const t of existingTags) allTagMap.set(t.id, { id: t.id, name: t.name });
      for (const t of newTags) allTagMap.set(t.id, { id: t.id, name: t.name });

      return {
        type: 'suggest_tags',
        message: `"${userMsg}" 관련 태그를 추가했어요! 원하는 태그를 선택해주세요.`,
        tags: [...allTagMap.values()],
      };
    }

    // 기존 태그가 있으면 보여주기
    if (existingTags.length > 0) {
      return {
        type: 'suggest_tags',
        message: `${domainName}의 세부 주제예요. 관심 있는 태그를 선택해주세요! 원하는 태그가 없으면 직접 입력해보세요.`,
        tags: existingTags.map((t) => ({ id: t.id, name: t.name })),
      };
    }

    // 태그가 아예 없으면 LLM으로 초기 태그 생성
    const suggestedNames = await this.gemini.suggestDomainTags(domainName);
    const createdTags = [];
    for (const name of suggestedNames) {
      const tag = await this.domainService.findOrCreateTag(resolvedDomainId, name, 'llm');
      createdTags.push(tag);
    }

    return {
      type: 'suggest_tags',
      message: `${domainName}에 맞는 학습 주제를 만들었어요. 선택해주세요! 원하는 태그가 없으면 직접 입력해보세요.`,
      tags: createdTags.map((t) => ({ id: t.id, name: t.name })),
    };
  }
}
