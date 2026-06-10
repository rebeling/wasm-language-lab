// src/engines/Engine.ts

export interface VectorDocument {
  id: string;
  title: string;
  vector: number[];
}

export interface SearchResult {
  id: string;
  title: string;
  score: number;
}

export interface BenchmarkResult {
  engine: string;
  startupMs: number;
  searchMs: number;
  totalMs: number;
  resultCount: number;
  topResultId: string | null;
  error?: string;
}

export interface BenchmarkEngine {
  name: string;

  init(): Promise<void>;

  search(
    documents: VectorDocument[],
    queryVector: number[],
    topK: number
  ): Promise<SearchResult[]>;
}
