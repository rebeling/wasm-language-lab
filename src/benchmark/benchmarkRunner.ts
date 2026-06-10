// src/benchmark/benchmarkRunner.ts
import type { BenchmarkEngine, VectorDocument, BenchmarkResult } from "../engines/Engine";

export async function runBenchmark(
  engine: BenchmarkEngine,
  documents: VectorDocument[],
  queryVector: number[],
  topK: number
): Promise<BenchmarkResult> {
  try {
    const startupStart = performance.now();
    await engine.init();
    const startupEnd = performance.now();

    const searchStart = performance.now();
    const results = await engine.search(documents, queryVector, topK);
    const searchEnd = performance.now();

    const startupMs = startupEnd - startupStart;
    const searchMs = searchEnd - searchStart;

    return {
      engine: engine.name,
      startupMs,
      searchMs,
      totalMs: startupMs + searchMs,
      resultCount: results.length,
      topResultId: results.length > 0 ? results[0].id : null,
    };
  } catch (error) {
    console.error(`Error running benchmark for ${engine.name}:`, error);
    return {
      engine: engine.name,
      startupMs: 0,
      searchMs: 0,
      totalMs: 0,
      resultCount: 0,
      topResultId: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
