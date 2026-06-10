// src/engines/GoEngine.ts
import type { BenchmarkEngine, VectorDocument, SearchResult } from "./Engine";

declare global {
  interface Window {
    Go: any;
    goSetDocuments: (vectors: Float32Array, ids: string, titles: string, dim: number) => any;
    goSearchVectors: (query: Float32Array, topK: number) => string;
  }
}

export class GoEngine implements BenchmarkEngine {
  name = "Go (TinyGo)";
  private initialized = false;
  private currentDatasetId: string | null = null;
  public pendingDocs: VectorDocument[] | null = null;

  async init(): Promise<void> {
    if (!this.initialized) {
      // 1. Load wasm_exec.js
      await this.loadScript("/wasm/wasm_exec.js");
      
      // 2. Load Wasm
      const go = new window.Go();
      const response = await fetch("/wasm/go_engine.wasm");
      const buffer = await response.arrayBuffer();
      const result = await WebAssembly.instantiate(buffer, go.importObject);
      
      // Go runs in the background to expose global functions
      go.run(result.instance);
      this.initialized = true;
    }

    if (this.pendingDocs && this.pendingDocs.length > 0) {
      const docs = this.pendingDocs;
      const dim = docs[0].vector.length;
      const numDocs = docs.length;

      const flatVectors = new Float32Array(numDocs * dim);
      const ids: string[] = [];
      const titles: string[] = [];

      for (let i = 0; i < numDocs; i++) {
        const doc = docs[i];
        ids.push(doc.id);
        titles.push(doc.title);
        flatVectors.set(doc.vector, i * dim);
      }

      window.goSetDocuments(flatVectors, JSON.stringify(ids), JSON.stringify(titles), dim);
      
      this.currentDatasetId = `${docs[0].id}-${numDocs}`;
      this.pendingDocs = null;
    }
  }

  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = () => resolve();
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async search(
    documents: VectorDocument[],
    queryVector: number[],
    topK: number
  ): Promise<SearchResult[]> {
    const datasetId = documents.length > 0 ? `${documents[0].id}-${documents.length}` : "empty";
    
    if (!this.initialized || this.currentDatasetId !== datasetId) {
      this.pendingDocs = documents;
      await this.init();
    }

    const qVec = new Float32Array(queryVector);
    const resultJson = window.goSearchVectors(qVec, topK);
    return JSON.parse(resultJson) as SearchResult[];
  }
}
