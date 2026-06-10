// src/engines/RustEngine.ts
import type { BenchmarkEngine, VectorDocument, SearchResult } from "./Engine";
import init, { search_vectors, set_data } from "../../engines/rust/pkg/rust_wasm_engine";

export class RustEngine implements BenchmarkEngine {
  name = "Rust (Wasm)";
  private initialized = false;
  private currentDatasetId: string | null = null;
  private pendingDocs: VectorDocument[] | null = null;

  async init(): Promise<void> {
    if (!this.initialized) {
      await init();
      this.initialized = true;
    }

    if (this.pendingDocs && this.pendingDocs.length > 0) {
      const docs = this.pendingDocs;
      const dim = docs[0].vector.length;
      const numDocs = docs.length;

      // FLATTEN: Convert Array of Objects to a single Float32Array
      // This happens once during Startup and is extremely fast to send to Wasm
      const flatVectors = new Float32Array(numDocs * dim);
      const ids: string[] = [];
      const titles: string[] = [];

      for (let i = 0; i < numDocs; i++) {
        const doc = docs[i];
        ids.push(doc.id);
        titles.push(doc.title);
        flatVectors.set(doc.vector, i * dim);
      }

      set_data(flatVectors, ids, titles, dim);
      
      this.currentDatasetId = `${docs[0].id}-${numDocs}`;
      this.pendingDocs = null;
    }
  }

  async search(
    documents: VectorDocument[],
    queryVector: number[],
    topK: number
  ): Promise<SearchResult[]> {
    const datasetId = documents.length > 0 ? `${documents[0].id}-${documents.length}` : "empty";
    
    // Check if we need to load a new dataset
    if (this.currentDatasetId !== datasetId) {
      this.pendingDocs = documents;
      // We don't await init() here automatically to ensure the BENCHMARK RUNNER 
      // calls it and records it in the Startup column.
      // But for safety if someone calls search directly:
      await this.init();
    }

    // Call with raw Float32Array - no serialization!
    const qVec = new Float32Array(queryVector);
    const results = search_vectors(qVec, topK);
    return results as SearchResult[];
  }
}
