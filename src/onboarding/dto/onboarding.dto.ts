import type { tags } from 'typia';

export interface IOnboardingChatBody {
  /** 유저 입력 메시지 */
  message: string & tags.MinLength<1>;
  /** 현재 턴 */
  turn: number & tags.Minimum<1> & tags.Maximum<10>;
  /** 이전 턴에서 누적된 컨텍스트 (클라이언트가 관리) */
  context?: {
    suggestedDomains?: Array<{ id: string; name: string; similarity: number }>;
    selectedDomainId?: string;
    selectedDomainName?: string;
    suggestedTags?: Array<{ id: string; name: string }>;
    selectedTagIds?: string[];
  };
}

export interface IOnboardingDomainSuggestion {
  id?: string;
  name: string;
  similarity?: number;
  isNew?: boolean;
}

export interface IOnboardingTagSuggestion {
  id: string;
  name: string;
  similarity?: number;
}

export interface IOnboardingConfirmed {
  domainId: string;
  domainName: string;
  target: string;
  tagIds: string[];
}

export interface IOnboardingChatResult {
  type: 'suggest_domains' | 'suggest_tags' | 'confirm' | 'create_goal';
  message: string;
  domains?: IOnboardingDomainSuggestion[];
  tags?: IOnboardingTagSuggestion[];
  confirmed?: IOnboardingConfirmed;
}
