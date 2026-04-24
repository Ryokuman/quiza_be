import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { IGenerateQuestions, IQuestion } from './dto/question.dto.js';

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 플레이스홀더 문제를 생성하고 DB에 저장한다.
   * TODO: Gemini API 연동으로 교체 예정
   */
  async generate(input: IGenerateQuestions): Promise<IQuestion[]> {
    const questions = Array.from({ length: input.count }, (_, i) =>
      this.buildPlaceholder(input.tag, input.difficulty, i + 1),
    );

    const created = await Promise.all(
      questions.map((q) =>
        this.prisma.question.create({
          data: {
            tag: q.tag,
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
      tag: row.tag,
      type: row.type as IQuestion['type'],
      difficulty: row.difficulty,
      content: row.content,
      options: row.options,
      answer: row.answer,
      explanation: row.explanation,
      created_at: row.created_at.toISOString() as IQuestion['created_at'],
    }));
  }

  /** 태그별 플레이스홀더 문제를 만든다. */
  private buildPlaceholder(
    tag: string,
    difficulty: number,
    index: number,
  ): {
    tag: string;
    type: 'multi' | 'single';
    difficulty: number;
    content: string;
    options: string[];
    answer: string;
    explanation: string | null;
  } {
    switch (tag) {
      case 'grammar':
        return this.buildGrammarQuestion(difficulty, index);
      case 'vocabulary':
        return this.buildVocabularyQuestion(difficulty, index);
      default:
        return this.buildGenericQuestion(tag, difficulty, index);
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
      tag: 'grammar',
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
      tag: 'vocabulary',
      type: 'multi' as const,
      difficulty,
      content: `[Vocabulary Lv.${difficulty} #${index}] What does "${w.word}" mean?`,
      options,
      answer: w.def,
      explanation: `"${w.word}" means "${w.def}".`,
    };
  }

  private buildGenericQuestion(tag: string, difficulty: number, index: number) {
    return {
      tag,
      type: 'multi' as const,
      difficulty,
      content: `[${tag} Lv.${difficulty} #${index}] Placeholder question for "${tag}" topic.`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      answer: 'Option A',
      explanation: `This is a placeholder question for the "${tag}" category.`,
    };
  }
}
