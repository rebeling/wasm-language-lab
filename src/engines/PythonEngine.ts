// src/engines/PythonEngine.ts
import type { BenchmarkEngine, VectorDocument, SearchResult } from "./Engine";

declare global {
  interface Window {
    loadPyodide: any;
  }
}

export class PythonEngine implements BenchmarkEngine {
  name = "Python (Pyodide)";
  private pyodide: any = null;
  private pythonCode: string = "";
  private currentDatasetId: string | null = null;
  public pendingDocs: VectorDocument[] | null = null;

  async init(): Promise<void> {
    if (!this.pyodide) {
      if (!window.loadPyodide) {
        await this.loadScript("https://cdn.jsdelivr.net/pyodide/v0.26.1/full/pyodide.js");
      }
      this.pyodide = await window.loadPyodide();
      const response = await fetch("/py/python_engine.py");
      this.pythonCode = await response.text();
      await this.pyodide.runPythonAsync(this.pythonCode);
    }

    if (this.pendingDocs && this.pendingDocs.length > 0) {
      const docs = this.pendingDocs;
      const dim = docs[0].vector.length;
      const numDocs = docs.length;

      // BINARY TRANSFER: Just like Rust/Go
      const flatVectors = new Float32Array(numDocs * dim);
      const ids: string[] = [];
      const titles: string[] = [];

      for (let i = 0; i < numDocs; i++) {
        const doc = docs[i];
        ids.push(doc.id);
        titles.push(doc.title);
        flatVectors.set(doc.vector, i * dim);
      }

      // Pyodide's set_data will receive the Float32Array as a memoryview
      const pySetData = this.pyodide.globals.get("set_data");
      pySetData(flatVectors, JSON.stringify(ids), JSON.stringify(titles), dim);
      
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
    
    if (!this.pyodide || this.currentDatasetId !== datasetId) {
      this.pendingDocs = documents;
      await this.init();
    }

    const queryJson = JSON.stringify(queryVector);
    const resultJson = await this.pyodide.runPythonAsync(`
      search_vectors(${JSON.stringify(queryJson)}, ${topK})
    `);

    return JSON.parse(resultJson) as SearchResult[];
  }
}
