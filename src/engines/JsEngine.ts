// src/engines/JsEngine.ts
import type { BenchmarkEngine, VectorDocument, SearchResult } from "./Engine";

export class JsEngine implements BenchmarkEngine {
  name = "JavaScript";
  private currentDatasetId: string | null = null;
  private flatVectors: Float32Array = new Float32Array(0);
  private norms: Float32Array = new Float32Array(0);
  private ids: string[] = [];
  private titles: string[] = [];
  private dim: number = 0;

  public pendingDocs: VectorDocument[] | null = null;

  async init(): Promise<void> {
    if (this.pendingDocs) {
      this.prepareData(this.pendingDocs);
      this.pendingDocs = null;
    }
  }

  private prepareData(documents: VectorDocument[]) {
    const datasetId = documents.length > 0 ? `${documents[0].id}-${documents.length}` : "empty";
    if (this.currentDatasetId === datasetId) return;

    this.dim = documents[0].vector.length;
    const numDocs = documents.length;
    this.flatVectors = new Float32Array(numDocs * this.dim);
    this.norms = new Float32Array(numDocs);
    this.ids = [];
    this.titles = [];

    for (let i = 0; i < numDocs; i++) {
      const doc = documents[i];
      this.ids.push(doc.id);
      this.titles.push(doc.title);
      
      let normSq = 0;
      for (let j = 0; j < this.dim; j++) {
        const val = doc.vector[j];
        this.flatVectors[i * this.dim + j] = val;
        normSq += val * val;
      }
      this.norms[i] = Math.sqrt(normSq);
    }

    this.currentDatasetId = datasetId;
  }

  async search(
    documents: VectorDocument[],
    queryVector: number[],
    topK: number
  ): Promise<SearchResult[]> {
    if (documents.length === 0) return [];
    
    // Ensure we are using the optimized flat structure
    this.prepareData(documents);

    const qDim = queryVector.length;
    let qNormSq = 0;
    for (let j = 0; j < qDim; j++) {
      qNormSq += queryVector[j] * queryVector[j];
    }
    const qNorm = Math.sqrt(qNormSq);

    const scores: { score: number; index: number }[] = [];
    const numDocs = this.ids.length;

    // Tight loop for JS
    for (let i = 0; i < numDocs; i++) {
      let dotProduct = 0;
      const offset = i * this.dim;
      for (let j = 0; j < this.dim; j++) {
        dotProduct += this.flatVectors[offset + j] * queryVector[j];
      }

      const score = (qNorm > 0 && this.norms[i] > 0) 
        ? dotProduct / (qNorm * this.norms[i]) 
        : 0;

      scores.push({ score, index: i });
    }

    // Sort and return top K
    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map(s => ({
        id: this.ids[s.index],
        title: this.titles[s.index],
        score: s.score
      }));
  }
}
