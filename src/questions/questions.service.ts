import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { GeminiService } from '../gemini/gemini.service.js';
import type { IGenerateQuestions, IQuestion } from './dto/question.dto.js';

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

    // multi / single — 기존 플레이스홀더 로직
    const questions = Array.from({ length: input.count }, (_, i) =>
      this.buildPlaceholder(tag.id, tag.name, input.difficulty, i + 1),
    );

    const created = await Promise.all(
      questions.map((q) =>
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

    const created = await Promise.all(
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

    return created.map((row) => ({
      id: row.id as IQuestion['id'],
      tag: { id: tagId, name: tagName },
      type: 'essay' as const,
      difficulty: row.difficulty,
      content: row.content,
      options: [],
      answer: row.answer,
      explanation: row.explanation,
      rubric: row.rubric,
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
      answer: answers[i],
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
      answer: w.def,
      explanation: `"${w.word}" means "${w.def}".`,
    };
  }

  private buildGenericQuestion(tagName: string, difficulty: number, index: number) {
    return {
      type: 'multi' as const,
      difficulty,
      content: `[${tagName} Lv.${difficulty} #${index}] Placeholder question for "${tagName}" topic.`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      answer: 'Option A',
      explanation: `This is a placeholder question for the "${tagName}" category.`,
    };
  }
}
