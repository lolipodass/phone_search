export type Engine = 'ddg' | 'google' | 'url';

export interface HistoryItem {
  id: number;
  query: string;
  engine: Engine;
  created_at: string;
}

export interface Bookmark {
  id: number;
  label: string;
  url: string;
  created_at: string;
}

export const ENGINES: Engine[] = ['ddg', 'google', 'url'];

export const ENGINE_LABEL: Record<Engine, string> = {
  ddg: 'DDG',
  google: 'G',
  url: 'URL',
};
