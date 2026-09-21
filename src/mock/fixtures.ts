export type Scenario = 'normal' | 'risk';
export type QuestionId = 'wellbeing' | 'concerns' | 'impact';

export const questionOrder: readonly QuestionId[] = ['wellbeing', 'concerns', 'impact'];

export const questions: Record<QuestionId, { title: string; prompt: string; placeholder: string }> = {
  wellbeing: {
    title: 'Current wellbeing',
    prompt: 'How have things felt for you recently?',
    placeholder: 'Describe how things have felt for you…',
  },
  concerns: {
    title: 'What brings you here',
    prompt: 'What would you like your counsellor to know before your appointment?',
    placeholder: 'Share only what you feel comfortable sharing…',
  },
  impact: {
    title: 'Day-to-day life',
    prompt: 'How has this been affecting your day-to-day life?',
    placeholder: 'Describe any effect on your day-to-day life…',
  },
};

export const wellbeingOptions = [
  { id: 'manageable', label: 'Mostly manageable', description: 'Things feel manageable most of the time.' },
  { id: 'difficult', label: 'Difficult at times', description: 'Some things have been hard to manage.' },
  { id: 'very-difficult', label: 'Very difficult', description: 'Things have felt very hard to manage.' },
] as const;

export const welcomeMessage = "Hello, I'm Lumen. Before your counselling appointment, I'll ask three short questions to help prepare for it. You choose what to share and can skip any question. This is a teaching prototype; no information is sent to UHC.";

