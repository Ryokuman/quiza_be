import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class RoadmapsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 로드맵을 생성한다.
   *
   * 1. 같은 domain + target의 is_template=true 로드맵이 있으면 → 체크포인트 구조 복사
   * 2. 없으면 → 기본 체크포인트로 생성 (추후 Gemini 연동 시 AI 생성)
   *
   * 첫 번째로 생성된 로드맵은 is_template=true로 저장하여
   * 동일 목적의 다른 유저가 재활용할 수 있게 한다.
   */
  async create(userId: string, goalId: string) {
    // Goal 존재 확인 + 소유자 검증
    const goal = await this.prisma.userGoal.findUnique({
      where: { id: goalId },
      include: { domain: true },
    });
    if (!goal) {
      throw new NotFoundException('Goal not found');
    }
    if (goal.user_id !== userId) {
      throw new NotFoundException('Goal not found');
    }

    // 이미 로드맵이 있는지 확인
    const existing = await this.prisma.roadmap.findUnique({
      where: { goal_id: goalId },
    });
    if (existing) {
      throw new ConflictException('Roadmap already exists for this goal');
    }

    // 같은 domain + target의 템플릿 검색
    const template = await this.findTemplate(goal.domain_id, goal.target);

    const roadmap = template
      ? await this.copyTemplate(goalId, goal.target, template)
      : await this.createNew(goalId, goal.target, goal.domain.name);

    return this.toDto(roadmap);
  }

  /** 로드맵을 체크포인트 포함하여 조회한다. */
  async findOne(roadmapId: string) {
    const roadmap = await this.prisma.roadmap.findUnique({
      where: { id: roadmapId },
      include: {
        checkpoints: { orderBy: { order: 'asc' } },
      },
    });
    if (!roadmap) {
      throw new NotFoundException('Roadmap not found');
    }
    return this.toDto(roadmap);
  }

  /** 같은 domain + target의 is_template=true 로드맵을 찾는다. */
  private async findTemplate(domainId: string, target: string) {
    return this.prisma.roadmap.findFirst({
      where: {
        is_template: true,
        goal: {
          domain_id: domainId,
          target,
        },
      },
      include: {
        checkpoints: { orderBy: { order: 'asc' } },
      },
    });
  }

  /** 기존 템플릿의 체크포인트 구조를 복사하여 새 로드맵을 생성한다. */
  private async copyTemplate(
    goalId: string,
    target: string,
    template: Awaited<ReturnType<typeof this.findTemplate>> & {},
  ) {
    return this.prisma.roadmap.create({
      data: {
        goal_id: goalId,
        title: template.title,
        is_template: false, // 복사본은 템플릿이 아님
        checkpoints: {
          create: template.checkpoints.map((cp) => ({
            title: cp.title,
            description: cp.description,
            tag: cp.tag,
            difficulty: cp.difficulty,
            order: cp.order,
          })),
        },
      },
      include: {
        checkpoints: { orderBy: { order: 'asc' } },
      },
    });
  }

  /**
   * 새 로드맵을 생성한다.
   * 추후 Gemini API 연동 시 AI가 체크포인트를 생성하도록 교체.
   * 현재는 도메인별 기본 체크포인트를 하드코딩.
   */
  private async createNew(goalId: string, target: string, domainName: string) {
    // TODO: Gemini API로 체크포인트 자동 생성 (Phase 1-3)
    const defaultCheckpoints = this.getDefaultCheckpoints(domainName);

    return this.prisma.roadmap.create({
      data: {
        goal_id: goalId,
        title: `${target} 로드맵`,
        is_template: true, // 첫 생성은 템플릿으로 저장
        checkpoints: {
          create: defaultCheckpoints,
        },
      },
      include: {
        checkpoints: { orderBy: { order: 'asc' } },
      },
    });
  }

  /**
   * 체크포인트 점수를 평가하여 상태를 갱신한다.
   *
   * - score >= 80 → status = "passed"
   * - score < 80 → status = "in_progress"
   * - best_score는 기존보다 높을 때만 갱신
   * - attempts는 항상 +1
   */
  async evaluateCheckpoint(checkpointId: string, score: number) {
    const checkpoint = await this.prisma.checkpoint.findUnique({
      where: { id: checkpointId },
    });
    if (!checkpoint) {
      throw new NotFoundException('Checkpoint not found');
    }

    const status = score >= 80 ? 'passed' : 'in_progress';
    const bestScore =
      checkpoint.best_score === null || score > checkpoint.best_score
        ? score
        : checkpoint.best_score;

    return this.prisma.checkpoint.update({
      where: { id: checkpointId },
      data: {
        status,
        best_score: bestScore,
        attempts: { increment: 1 },
      },
    });
  }

  /**
   * 로드맵의 진행률을 계산한다.
   *
   * passed 상태인 체크포인트 수 / 전체 체크포인트 수로 계산한다.
   */
  async getProgress(roadmapId: string) {
    const roadmap = await this.prisma.roadmap.findUnique({
      where: { id: roadmapId },
    });
    if (!roadmap) {
      throw new NotFoundException('Roadmap not found');
    }

    const total = await this.prisma.checkpoint.count({
      where: { roadmap_id: roadmapId },
    });
    const passed = await this.prisma.checkpoint.count({
      where: { roadmap_id: roadmapId, status: 'passed' },
    });

    return {
      passed,
      total,
      percentage: total === 0 ? 0 : Math.round((passed / total) * 100),
    };
  }

  /** Prisma 결과를 DTO로 변환한다 (Date → ISO string). */
  private toDto(roadmap: { created_at: Date; checkpoints: any[]; [k: string]: any }) {
    return {
      ...roadmap,
      created_at: roadmap.created_at.toISOString(),
    };
  }

  /** 도메인별 기본 체크포인트. Gemini 연동 전 폴백. */
  private getDefaultCheckpoints(domainName: string) {
    if (domainName === '영어') {
      return [
        { title: '기본 시제', tag: 'grammar', difficulty: 1, order: 1, description: '현재/과거/미래 시제의 기본 구조' },
        { title: '기본 어휘', tag: 'vocabulary', difficulty: 1, order: 2, description: '일상생활 필수 어휘 200선' },
        { title: '문장 구조', tag: 'grammar', difficulty: 2, order: 3, description: '주어-동사-목적어 어순과 수식 구조' },
        { title: '독해 입문', tag: 'reading', difficulty: 2, order: 4, description: '짧은 지문 읽고 핵심 파악하기' },
        { title: '완료 시제', tag: 'grammar', difficulty: 3, order: 5, description: '현재완료/과거완료 용법과 구분' },
        { title: '중급 어휘', tag: 'vocabulary', difficulty: 3, order: 6, description: '학술/비즈니스 필수 어휘' },
        { title: '관계대명사', tag: 'grammar', difficulty: 3, order: 7, description: 'who/which/that 관계절 구성' },
        { title: '독해 심화', tag: 'reading', difficulty: 4, order: 8, description: '긴 지문에서 논리 흐름 파악' },
        { title: '가정법', tag: 'grammar', difficulty: 4, order: 9, description: '가정법 과거/과거완료 구문' },
        { title: '고급 어휘', tag: 'vocabulary', difficulty: 5, order: 10, description: '고급 동의어/반의어 및 뉘앙스 구분' },
      ];
    }

    // 범용 기본 체크포인트
    return [
      { title: '입문', tag: 'basics', difficulty: 1, order: 1, description: '기초 개념 학습' },
      { title: '기본기', tag: 'basics', difficulty: 2, order: 2, description: '핵심 개념 이해' },
      { title: '응용', tag: 'application', difficulty: 3, order: 3, description: '배운 내용 응용' },
      { title: '심화', tag: 'advanced', difficulty: 4, order: 4, description: '심화 학습' },
      { title: '마스터', tag: 'advanced', difficulty: 5, order: 5, description: '종합 평가' },
    ];
  }
}
