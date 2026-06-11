import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { GeminiService } from '../gemini/gemini.service';
import type { IGenerateQuestions, IQuestion } from './dto/question.dto';

@Injectable()
export class QuestionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
  ) {}

  async generate(input: IGenerateQuestions): Promise<IQuestion[]> {
    const tag = await this.prisma.tag.findUniqueOrThrow({
      where: { id: input.tagId },
      select: { id: true, name: true },
    });

    const type = input.type ?? 'multi';

    if (type === 'essay') {
      return this.generateEssay(tag.id, tag.name, input.difficulty, input.count);
    }

    const generated = await this.gemini.generateQuestions(
      tag.name,
      input.difficulty,
      input.count,
      type,
    );
    const questions = this.normalizeGeneratedQuestions(
      generated,
      tag.id,
      type,
      input.difficulty,
    );
    const questionsToCreate = questions.length > 0
      ? questions
      : this.buildFallbackQuestions(
          tag.id,
          tag.name,
          input.difficulty,
          input.count,
        );

    const created = await Promise.all(
      questionsToCreate.map((q) =>
        this.prisma.question.create({
          data: {
            tag_id: q.tagId,
            type: q.type,
            difficulty: q.difficulty,
            content: q.content,
            options: q.options,
            answer: q.answer,
            explanation: q.explanation,
          },
        }),
      ),
    );

    return created.map((row) => ({
      id: row.id as IQuestion['id'],
      tag: { id: tag.id, name: tag.name },
      type: row.type as IQuestion['type'],
      difficulty: row.difficulty,
      content: row.content,
      options: row.options,
      answer: row.answer,
      explanation: row.explanation,
      rubric: null,
      max_score: row.max_score,
      created_at: row.created_at.toISOString() as IQuestion['created_at'],
    }));
  }

  private buildFallbackQuestions(
    tagId: string,
    tagName: string,
    difficulty: number,
    count: number,
  ) {
    return Array.from({ length: count }, (_, i) =>
      this.buildPlaceholder(tagId, tagName, difficulty, i + 1),
    );
  }

  private normalizeGeneratedQuestions(
    generated: {
      content: string;
      options: string[];
      answer: string;
      explanation: string;
    }[],
    tagId: string,
    type: 'multi' | 'single',
    difficulty: number,
  ) {
    const normalized = generated
      .filter((q) => this.isValidGeneratedQuestion(q, type))
      .map((q) => ({
        tagId,
        type,
        difficulty,
        content: q.content.trim(),
        options: type === 'multi' ? q.options : [],
        answer: q.answer.trim(),
        explanation: q.explanation?.trim() || null,
      }));

    return normalized.length === generated.length ? normalized : [];
  }

  private isValidGeneratedQuestion(
    question: {
      content: string;
      options: string[];
      answer: string;
      explanation: string;
    },
    type: 'multi' | 'single',
  ) {
    if (!question.content?.trim() || !question.answer?.trim()) {
      return false;
    }

    if (type === 'multi') {
      return (
        Array.isArray(question.options) &&
        question.options.length === 4 &&
        question.options.every((option) => option.trim().length > 0) &&
        ['0', '1', '2', '3'].includes(question.answer)
      );
    }

    return Array.isArray(question.options) && question.options.length === 0;
  }

  /** Gemini로 서술형 문제를 생성하고 DB에 저장한다. */
  private async generateEssay(
    tagId: string,
    tagName: string,
    difficulty: number,
    count: number,
  ): Promise<IQuestion[]> {
    const generated = await this.gemini.generateEssayQuestions(tagName, difficulty, count);

    if (generated.length === 0) {
      return [];
    }

    // 트랜잭션으로 묶어서 부분 생성 방지
    const created = await this.prisma.$transaction(
      generated.map((q) =>
        this.prisma.question.create({
          data: {
            tag_id: tagId,
            type: 'essay',
            difficulty,
            content: q.content,
            options: [],
            answer: q.answer,
            explanation: q.explanation,
            rubric: q.rubric,
            max_score: q.max_score,
          },
        }),
      ),
    );

    // 서술형 문제 응답에서 answer(모범답안) 숨김 — 채점 후에만 노출
    return created.map((row) => ({
      id: row.id as IQuestion['id'],
      tag: { id: tagId, name: tagName },
      type: 'essay' as const,
      difficulty: row.difficulty,
      content: row.content,
      options: [],
      answer: '',
      explanation: null,
      rubric: null,
      max_score: row.max_score,
      created_at: row.created_at.toISOString() as IQuestion['created_at'],
    }));
  }

  /** 태그별 플레이스홀더 문제를 만든다. */
  private buildPlaceholder(
    tagId: string,
    tagName: string,
    difficulty: number,
    index: number,
  ): {
    tagId: string;
    type: 'multi' | 'single';
    difficulty: number;
    content: string;
    options: string[];
    answer: string;
    explanation: string | null;
  } {
    switch (tagName) {
      case 'grammar':
        return { tagId, ...this.buildGrammarQuestion(difficulty, index) };
      case 'vocabulary':
        return { tagId, ...this.buildVocabularyQuestion(difficulty, index) };
      default:
        return { tagId, ...this.buildGenericQuestion(tagName, difficulty, index) };
    }
  }

  private buildGrammarQuestion(difficulty: number, index: number) {
    const sentences = [
      'She ___ to the store yesterday.',
      'If I ___ you, I would apologize.',
      'The report ___ by the manager before noon.',
      'Neither the students nor the teacher ___ aware of the change.',
      'Had she ___ earlier, she would have caught the train.',
    ];
    const optionSets = [
      ['go', 'went', 'goes', 'going'],
      ['am', 'was', 'were', 'be'],
      ['reviewed', 'was reviewed', 'has reviewed', 'reviewing'],
      ['was', 'were', 'is', 'are'],
      ['left', 'leave', 'leaving', 'leaves'],
    ];
    const answers = ['went', 'were', 'was reviewed', 'was', 'left'];

    const i = (index - 1 + difficulty - 1) % sentences.length;

    return {
      type: 'multi' as const,
      difficulty,
      content: `[Grammar Lv.${difficulty} #${index}] Choose the correct word: "${sentences[i]}"`,
      options: optionSets[i],
      answer: String(optionSets[i].indexOf(answers[i])),
      explanation: `The correct answer is "${answers[i]}" based on English grammar rules.`,
    };
  }

  private buildVocabularyQuestion(difficulty: number, index: number) {
    const words = [
      { word: 'ubiquitous', def: 'present everywhere', wrong: ['rare', 'invisible', 'ancient'] },
      { word: 'ephemeral', def: 'lasting a very short time', wrong: ['eternal', 'solid', 'bright'] },
      { word: 'pragmatic', def: 'dealing with things practically', wrong: ['idealistic', 'lazy', 'emotional'] },
      { word: 'eloquent', def: 'fluent and persuasive in speech', wrong: ['silent', 'clumsy', 'boring'] },
      { word: 'meticulous', def: 'showing great attention to detail', wrong: ['careless', 'quick', 'average'] },
    ];

    const i = (index - 1 + difficulty - 1) % words.length;
    const w = words[i];
    const options = [w.def, ...w.wrong].sort(() => Math.random() - 0.5);

    return {
      type: 'multi' as const,
      difficulty,
      content: `[Vocabulary Lv.${difficulty} #${index}] What does "${w.word}" mean?`,
      options,
      answer: String(options.indexOf(w.def)),
      explanation: `"${w.word}" means "${w.def}".`,
    };
  }

  private buildGenericQuestion(tagName: string, difficulty: number, index: number) {
    return {
      type: 'multi' as const,
      difficulty,
      content: `[${tagName} Lv.${difficulty} #${index}] Placeholder question for "${tagName}" topic.`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      answer: '0',
      explanation: `This is a placeholder question for the "${tagName}" category.`,
    };
  }
}
