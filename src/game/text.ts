import type { LineTone, TermLine } from './types';

/** ターミナル行を作る小さなヘルパー */
export const line = (text: string, tone: LineTone = 'out'): TermLine => ({ text, tone });

export const lines = (tone: LineTone, ...texts: string[]): TermLine[] =>
  texts.map((t) => line(t, tone));
