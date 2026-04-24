import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env['DATABASE_URL']!,
});
const prisma = new PrismaClient({ adapter });

interface SeedQuestion {
  tag: string;
  type: string;
  difficulty: number;
  content: string;
  options: string[];
  answer: string;
  explanation: string;
}

const questions: SeedQuestion[] = [
  // ── grammar, difficulty 1 ──
  {
    tag: 'grammar',
    type: 'multi',
    difficulty: 1,
    content: 'Choose the correct form: "She ___ to school every day."',
    options: ['go', 'goes', 'going', 'gone'],
    answer: 'B',
    explanation:
      'Third-person singular subjects (he/she/it) take the verb form ending in -s/-es in the simple present tense.',
  },
  {
    tag: 'grammar',
    type: 'single',
    difficulty: 1,
    content:
      'Fill in the blank with the correct article: "___ sun rises in the east."',
    options: [],
    answer: 'The',
    explanation:
      '"The" is used before unique nouns that both speaker and listener can identify — there is only one sun.',
  },
  // ── grammar, difficulty 2 ──
  {
    tag: 'grammar',
    type: 'multi',
    difficulty: 2,
    content:
      'Which sentence is correct?',
    options: [
      'He don\'t like coffee.',
      'He doesn\'t likes coffee.',
      'He doesn\'t like coffee.',
      'He not like coffee.',
    ],
    answer: 'C',
    explanation:
      'In negative simple-present sentences with third-person singular subjects, use "doesn\'t" + base verb.',
  },
  {
    tag: 'grammar',
    type: 'single',
    difficulty: 2,
    content:
      'Rewrite using the past tense: "I eat breakfast at 7 a.m." → "I ___ breakfast at 7 a.m."',
    options: [],
    answer: 'ate',
    explanation:
      '"Ate" is the irregular past tense of "eat."',
  },
  // ── grammar, difficulty 3 ──
  {
    tag: 'grammar',
    type: 'multi',
    difficulty: 3,
    content:
      'Choose the correct relative pronoun: "The book ___ I borrowed from the library was fascinating."',
    options: ['who', 'which', 'whom', 'whose'],
    answer: 'B',
    explanation:
      '"Which" is used for things. "Who/whom" refer to people, and "whose" shows possession.',
  },
  {
    tag: 'grammar',
    type: 'single',
    difficulty: 3,
    content:
      'Correct the error: "If I was you, I would apologize." What word should replace "was"?',
    options: [],
    answer: 'were',
    explanation:
      'In subjunctive/conditional sentences expressing hypothetical situations, "were" is used for all subjects.',
  },
  // ── grammar, difficulty 4 ──
  {
    tag: 'grammar',
    type: 'multi',
    difficulty: 4,
    content:
      'Select the sentence that correctly uses the past perfect tense.',
    options: [
      'She has finished her homework before dinner.',
      'She had finished her homework before dinner started.',
      'She finished her homework before dinner had started.',
      'She was finishing her homework before dinner.',
    ],
    answer: 'B',
    explanation:
      'The past perfect ("had finished") describes an action completed before another past action ("dinner started").',
  },
  {
    tag: 'grammar',
    type: 'single',
    difficulty: 4,
    content:
      'Fill in the blank: "Not only ___ he pass the exam, but he also got the highest score." (auxiliary verb)',
    options: [],
    answer: 'did',
    explanation:
      '"Not only" at the start of a clause triggers subject-auxiliary inversion, requiring "did."',
  },
  // ── grammar, difficulty 5 ──
  {
    tag: 'grammar',
    type: 'multi',
    difficulty: 5,
    content:
      'Which sentence correctly demonstrates the third conditional?',
    options: [
      'If I studied harder, I would pass the exam.',
      'If I had studied harder, I would have passed the exam.',
      'If I have studied harder, I will pass the exam.',
      'If I would study harder, I passed the exam.',
    ],
    answer: 'B',
    explanation:
      'The third conditional uses "if + past perfect" in the condition clause and "would have + past participle" in the result clause to describe unreal past situations.',
  },
  {
    tag: 'grammar',
    type: 'single',
    difficulty: 5,
    content:
      'Identify the grammatical function of "running" in: "Running a marathon requires months of training." (noun/adjective/verb)',
    options: [],
    answer: 'noun',
    explanation:
      '"Running" functions as a gerund (verbal noun) serving as the subject of the sentence.',
  },

  // ── vocabulary, difficulty 1 ──
  {
    tag: 'vocabulary',
    type: 'multi',
    difficulty: 1,
    content: 'What is the opposite of "hot"?',
    options: ['warm', 'cold', 'cool', 'mild'],
    answer: 'B',
    explanation: '"Cold" is the direct antonym of "hot."',
  },
  {
    tag: 'vocabulary',
    type: 'single',
    difficulty: 1,
    content:
      'What word means "a place where you sleep at night," starting with "b"?',
    options: [],
    answer: 'bed',
    explanation: 'A "bed" is a piece of furniture used for sleeping.',
  },
  // ── vocabulary, difficulty 2 ──
  {
    tag: 'vocabulary',
    type: 'multi',
    difficulty: 2,
    content: 'Choose the word that best completes: "The weather forecast predicts heavy ___ tomorrow."',
    options: ['rain', 'rein', 'reign', 'rane'],
    answer: 'A',
    explanation:
      '"Rain" means water falling from clouds. "Rein" is a strap for horses; "reign" means to rule.',
  },
  {
    tag: 'vocabulary',
    type: 'single',
    difficulty: 2,
    content: 'What is a synonym for "happy"?',
    options: [],
    answer: 'glad',
    explanation:
      '"Glad," "joyful," and "pleased" are all synonyms of "happy."',
  },
  // ── vocabulary, difficulty 3 ──
  {
    tag: 'vocabulary',
    type: 'multi',
    difficulty: 3,
    content: 'What does "ambiguous" mean?',
    options: [
      'Very clear',
      'Open to more than one interpretation',
      'Extremely large',
      'Carefully planned',
    ],
    answer: 'B',
    explanation:
      '"Ambiguous" means having more than one possible meaning or interpretation.',
  },
  {
    tag: 'vocabulary',
    type: 'single',
    difficulty: 3,
    content:
      'Complete the idiom: "Break the ___" (meaning to start a conversation in an awkward situation).',
    options: [],
    answer: 'ice',
    explanation:
      '"Break the ice" means to relieve tension or initiate conversation in social situations.',
  },
  // ── vocabulary, difficulty 4 ──
  {
    tag: 'vocabulary',
    type: 'multi',
    difficulty: 4,
    content:
      'Choose the word that means "to make something less severe or intense."',
    options: ['mitigate', 'instigate', 'aggregate', 'fabricate'],
    answer: 'A',
    explanation:
      '"Mitigate" means to lessen or reduce the severity of something. "Instigate" means to provoke.',
  },
  {
    tag: 'vocabulary',
    type: 'single',
    difficulty: 4,
    content:
      'What adjective describes someone who is "unwilling to spend money"? (starts with "f")',
    options: [],
    answer: 'frugal',
    explanation:
      '"Frugal" describes someone who is economical and avoids unnecessary spending.',
  },
  // ── vocabulary, difficulty 5 ──
  {
    tag: 'vocabulary',
    type: 'multi',
    difficulty: 5,
    content: 'What does "ephemeral" mean?',
    options: [
      'Lasting for a very long time',
      'Lasting for a very short time',
      'Extremely beautiful',
      'Deeply spiritual',
    ],
    answer: 'B',
    explanation:
      '"Ephemeral" means lasting for a very short period — fleeting or transient.',
  },
  {
    tag: 'vocabulary',
    type: 'single',
    difficulty: 5,
    content:
      'What noun means "an intense and widely shared enthusiasm for something, especially one that is short-lived"? (starts with "f")',
    options: [],
    answer: 'fad',
    explanation:
      'A "fad" is an intense but short-lived trend or craze. "Frenzy" is also acceptable.',
  },

  // ── reading, difficulty 1 ──
  {
    tag: 'reading',
    type: 'multi',
    difficulty: 1,
    content:
      'Read: "Tom has a red ball. He likes to play with it in the park." What color is Tom\'s ball?',
    options: ['Blue', 'Green', 'Red', 'Yellow'],
    answer: 'C',
    explanation: 'The passage explicitly states "Tom has a red ball."',
  },
  {
    tag: 'reading',
    type: 'single',
    difficulty: 1,
    content:
      'Read: "Maria wakes up at 6 a.m. She brushes her teeth and eats cereal." What does Maria eat for breakfast?',
    options: [],
    answer: 'cereal',
    explanation: 'The passage says "She … eats cereal."',
  },
  // ── reading, difficulty 2 ──
  {
    tag: 'reading',
    type: 'multi',
    difficulty: 2,
    content:
      'Read: "Dolphins are mammals that live in the ocean. Unlike fish, they breathe air through a blowhole on top of their heads." How do dolphins breathe?',
    options: [
      'Through gills',
      'Through their mouth',
      'Through a blowhole',
      'Through their skin',
    ],
    answer: 'C',
    explanation: 'The passage states dolphins "breathe air through a blowhole."',
  },
  {
    tag: 'reading',
    type: 'single',
    difficulty: 2,
    content:
      'Read: "The library closes at 8 p.m. on weekdays and 5 p.m. on weekends." What time does the library close on Saturday?',
    options: [],
    answer: '5 p.m.',
    explanation: 'Saturday is a weekend day, and the library closes at 5 p.m. on weekends.',
  },
  // ── reading, difficulty 3 ──
  {
    tag: 'reading',
    type: 'multi',
    difficulty: 3,
    content:
      'Read: "Although renewable energy sources like solar and wind power are becoming more affordable, fossil fuels still account for over 80% of global energy consumption." What is the main idea?',
    options: [
      'Fossil fuels are no longer used.',
      'Renewable energy is too expensive.',
      'Fossil fuels still dominate despite renewable growth.',
      'Solar power is the cheapest energy source.',
    ],
    answer: 'C',
    explanation:
      'The passage contrasts growing affordability of renewables with the continued dominance of fossil fuels.',
  },
  {
    tag: 'reading',
    type: 'single',
    difficulty: 3,
    content:
      'Read: "The experiment yielded unexpected results: the control group performed better than the test group." Which group performed better?',
    options: [],
    answer: 'control group',
    explanation:
      'The passage directly states "the control group performed better than the test group."',
  },
  // ── reading, difficulty 4 ──
  {
    tag: 'reading',
    type: 'multi',
    difficulty: 4,
    content:
      'Read: "Critics argue that social media creates echo chambers, reinforcing existing beliefs rather than exposing users to diverse viewpoints. Proponents counter that it democratizes information." What do critics believe about social media?',
    options: [
      'It provides diverse viewpoints.',
      'It reinforces existing beliefs.',
      'It democratizes information.',
      'It has no effect on opinions.',
    ],
    answer: 'B',
    explanation:
      'Critics argue social media "reinforces existing beliefs" by creating echo chambers.',
  },
  {
    tag: 'reading',
    type: 'single',
    difficulty: 4,
    content:
      'Read: "The author employs an unreliable narrator to blur the line between fact and fiction, leaving readers to determine what actually occurred." What literary device is used?',
    options: [],
    answer: 'unreliable narrator',
    explanation:
      'The passage explicitly mentions the use of an "unreliable narrator" as a literary device.',
  },
  // ── reading, difficulty 5 ──
  {
    tag: 'reading',
    type: 'multi',
    difficulty: 5,
    content:
      'Read: "The paradox of thrift suggests that while individual saving is prudent, widespread saving during a recession can reduce aggregate demand, deepening the economic downturn." What is the paradox?',
    options: [
      'Saving money is always beneficial for the economy.',
      'Individual prudence can harm the collective economy.',
      'Recessions are caused by excessive spending.',
      'Thrift leads to inflation.',
    ],
    answer: 'B',
    explanation:
      'The paradox of thrift states that what is rational for individuals (saving) can be harmful to the overall economy when everyone does it simultaneously.',
  },
  {
    tag: 'reading',
    type: 'single',
    difficulty: 5,
    content:
      'Read: "Orwell\'s dystopian vision in 1984 presciently anticipated mass surveillance, propaganda, and the manipulation of truth by authoritarian regimes." What adjective means "having knowledge of events before they occur"?',
    options: [],
    answer: 'prescient',
    explanation:
      '"Presciently" (adverb form of "prescient") means having foreknowledge or foresight about future events.',
  },

  // ── listening, difficulty 1 ──
  {
    tag: 'listening',
    type: 'multi',
    difficulty: 1,
    content:
      'You hear: "Excuse me, where is the nearest bus stop?" What is the speaker looking for?',
    options: ['A taxi', 'A bus stop', 'A train station', 'An airport'],
    answer: 'B',
    explanation: 'The speaker asks for "the nearest bus stop."',
  },
  {
    tag: 'listening',
    type: 'single',
    difficulty: 1,
    content:
      'You hear: "Can I have a glass of water, please?" What drink is being requested?',
    options: [],
    answer: 'water',
    explanation: 'The speaker asks for "a glass of water."',
  },
  // ── listening, difficulty 2 ──
  {
    tag: 'listening',
    type: 'multi',
    difficulty: 2,
    content:
      'You hear: "The meeting has been postponed to next Thursday at 3 p.m." When is the new meeting time?',
    options: [
      'This Thursday at 3 p.m.',
      'Next Thursday at 3 p.m.',
      'Next Friday at 3 p.m.',
      'This Wednesday at 3 p.m.',
    ],
    answer: 'B',
    explanation: 'The meeting was rescheduled to "next Thursday at 3 p.m."',
  },
  {
    tag: 'listening',
    type: 'single',
    difficulty: 2,
    content:
      'You hear: "I\'d like to book a table for four at seven o\'clock." How many people is the reservation for?',
    options: [],
    answer: '4',
    explanation: 'The speaker says "a table for four."',
  },
  // ── listening, difficulty 3 ──
  {
    tag: 'listening',
    type: 'multi',
    difficulty: 3,
    content:
      'You hear: "I wouldn\'t mind going to the beach, but the weather forecast says it might rain. Maybe we should go to the museum instead." What does the speaker suggest?',
    options: [
      'Going to the beach regardless',
      'Staying home',
      'Going to the museum',
      'Checking the weather again',
    ],
    answer: 'C',
    explanation: 'The speaker suggests the museum as an alternative due to possible rain.',
  },
  {
    tag: 'listening',
    type: 'single',
    difficulty: 3,
    content:
      'You hear: "Could you pick up some milk and eggs on your way home? Oh, and we\'re also out of bread." How many items are requested?',
    options: [],
    answer: '3',
    explanation: 'Three items are requested: milk, eggs, and bread.',
  },
  // ── listening, difficulty 4 ──
  {
    tag: 'listening',
    type: 'multi',
    difficulty: 4,
    content:
      'You hear: "While I appreciate the offer, I\'m afraid I\'ll have to decline. My schedule is quite packed this month." What is the speaker doing?',
    options: [
      'Accepting an invitation',
      'Politely refusing an offer',
      'Asking for more time',
      'Complaining about their workload',
    ],
    answer: 'B',
    explanation:
      'Phrases like "I appreciate the offer" followed by "I\'ll have to decline" indicate a polite refusal.',
  },
  {
    tag: 'listening',
    type: 'single',
    difficulty: 4,
    content:
      'You hear: "The flight\'s been delayed by two hours, so instead of arriving at noon, we\'ll get in around 2 p.m." What was the original arrival time?',
    options: [],
    answer: 'noon',
    explanation:
      'The speaker says "instead of arriving at noon," indicating noon was the original time.',
  },
  // ── listening, difficulty 5 ──
  {
    tag: 'listening',
    type: 'multi',
    difficulty: 5,
    content:
      'You hear: "The lecturer implied that the correlation between the variables was spurious, suggesting confounding factors were at play." What did the lecturer suggest about the correlation?',
    options: [
      'It was statistically significant.',
      'It was caused by a direct relationship.',
      'It was misleading due to hidden variables.',
      'It proved the hypothesis correct.',
    ],
    answer: 'C',
    explanation:
      '"Spurious correlation" means the apparent relationship is misleading, caused by confounding (hidden) factors rather than a direct causal link.',
  },
  {
    tag: 'listening',
    type: 'single',
    difficulty: 5,
    content:
      'You hear: "He spoke with such eloquence that even his detractors were momentarily swayed." What does "detractors" mean?',
    options: [],
    answer: 'critics',
    explanation:
      '"Detractors" are people who criticize or disparage someone. Synonyms include "critics" and "opponents."',
  },

  // ── writing, difficulty 1 ──
  {
    tag: 'writing',
    type: 'multi',
    difficulty: 1,
    content: 'Which is the correct way to start a sentence?',
    options: [
      'the cat is sleeping.',
      'The cat is sleeping.',
      'the Cat is sleeping.',
      'THE cat is sleeping.',
    ],
    answer: 'B',
    explanation:
      'Sentences begin with a capital letter on the first word only (proper nouns aside).',
  },
  {
    tag: 'writing',
    type: 'single',
    difficulty: 1,
    content:
      'What punctuation mark goes at the end of a question? (type the symbol)',
    options: [],
    answer: '?',
    explanation: 'Questions end with a question mark (?).',
  },
  // ── writing, difficulty 2 ──
  {
    tag: 'writing',
    type: 'multi',
    difficulty: 2,
    content:
      'Which sentence uses a comma correctly?',
    options: [
      'I bought apples oranges and bananas.',
      'I bought apples, oranges, and bananas.',
      'I bought, apples oranges and bananas.',
      'I bought apples oranges, and bananas.',
    ],
    answer: 'B',
    explanation:
      'Commas separate items in a list. The Oxford comma before "and" is also acceptable.',
  },
  {
    tag: 'writing',
    type: 'single',
    difficulty: 2,
    content:
      'Combine these two sentences using "because": "She stayed home. She was sick." Write the combined sentence.',
    options: [],
    answer: 'She stayed home because she was sick.',
    explanation:
      '"Because" joins a cause (she was sick) to an effect (she stayed home).',
  },
  // ── writing, difficulty 3 ──
  {
    tag: 'writing',
    type: 'multi',
    difficulty: 3,
    content:
      'Which transition word best shows contrast?',
    options: ['Furthermore', 'However', 'Similarly', 'Therefore'],
    answer: 'B',
    explanation:
      '"However" introduces a contrasting idea. "Furthermore" adds information; "therefore" shows cause-effect.',
  },
  {
    tag: 'writing',
    type: 'single',
    difficulty: 3,
    content:
      'Rewrite in passive voice: "The chef prepared the meal." → "The meal ___ by the chef."',
    options: [],
    answer: 'was prepared',
    explanation:
      'Passive voice: subject + was/were + past participle. "The meal was prepared by the chef."',
  },
  // ── writing, difficulty 4 ──
  {
    tag: 'writing',
    type: 'multi',
    difficulty: 4,
    content:
      'Which sentence demonstrates correct use of a semicolon?',
    options: [
      'I like coffee; and tea.',
      'I like coffee; however, I prefer tea.',
      'I like; coffee and tea.',
      'I like coffee however; I prefer tea.',
    ],
    answer: 'B',
    explanation:
      'A semicolon joins two independent clauses. When followed by a conjunctive adverb like "however," a comma follows the adverb.',
  },
  {
    tag: 'writing',
    type: 'single',
    difficulty: 4,
    content:
      'What is the term for a deliberate exaggeration used for emphasis in writing? (e.g., "I\'ve told you a million times")',
    options: [],
    answer: 'hyperbole',
    explanation:
      'Hyperbole is a figure of speech that uses extreme exaggeration for emphasis or effect.',
  },
  // ── writing, difficulty 5 ──
  {
    tag: 'writing',
    type: 'multi',
    difficulty: 5,
    content:
      'Which of the following best describes "parallel structure" in writing?',
    options: [
      'Using the same grammatical form for items in a series.',
      'Writing sentences of exactly the same length.',
      'Repeating the same word at the start of every sentence.',
      'Using two paragraphs that mirror each other.',
    ],
    answer: 'A',
    explanation:
      'Parallel structure (parallelism) means using the same grammatical pattern for coordinated elements, e.g., "reading, writing, and speaking."',
  },
  {
    tag: 'writing',
    type: 'single',
    difficulty: 5,
    content:
      'What rhetorical device places two contrasting ideas side by side for effect? (e.g., "It was the best of times, it was the worst of times.")',
    options: [],
    answer: 'antithesis',
    explanation:
      'Antithesis juxtaposes two opposing ideas in a balanced structure to highlight their contrast.',
  },
];

async function main() {
  console.log('Seeding database...');

  // 1. Upsert the 영어 (English) domain
  const domain = await prisma.domain.upsert({
    where: { name: '영어' },
    update: {},
    create: { name: '영어' },
  });
  console.log(`Domain upserted: ${domain.name} (${domain.id})`);

  // 2. Insert 50 seed questions
  const result = await prisma.question.createMany({
    data: questions,
    skipDuplicates: true,
  });
  console.log(`Questions created: ${result.count}`);

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
