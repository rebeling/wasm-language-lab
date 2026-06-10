// src/components/WasmLanguageLab.ts
import { componentStyles } from "../styles/componentStyles";
import { JsEngine } from "../engines/JsEngine";
import { RustEngine } from "../engines/RustEngine";
import { PythonEngine } from "../engines/PythonEngine";
import { GoEngine } from "../engines/GoEngine";
import { runBenchmark } from "../benchmark/benchmarkRunner";
import type { VectorDocument, BenchmarkResult } from "../engines/Engine";

export interface BenchmarkRun {
  timestamp: string;
  params: {
    count: number;
    dim: number;
    iterations: number;
  };
  results: BenchmarkResult[];
}

export class WasmLanguageLab extends HTMLElement {
  private shadow: ShadowRoot;
  private history: BenchmarkRun[] = [];
  private status: string = "Idle";
  private isRunning: boolean = false;
  private dataset: VectorDocument[] = [];
  private currentCount: number = 1000;
  private currentDim: number = 384;
  private iterations: number = 10;
  private queryVector: number[] = [];
  private selectedEngines: Set<string> = new Set(["JavaScript", "Rust (Wasm)", "Go (TinyGo)", "Python (Pyodide)"]);

  constructor() {
    super();
    this.shadow = this.attachShadow({ mode: "open" });
    this.resetQueryVector(this.currentDim);
  }

  private resetQueryVector(dims: number) {
    this.queryVector = Array.from({ length: dims }, () => parseFloat(Math.random().toFixed(4)));
  }

  connectedCallback() {
    this.render();
  }

  private async loadDataset(count: number, dim: number) {
    this.status = `Loading dataset (${count} docs, ${dim}d)...`;
    this.render();
    try {
      const response = await fetch(`/datasets/vectors-${count}-${dim}.json`);
      if (!response.ok) throw new Error(`Dataset vectors-${count}-${dim}.json not found. Run "npm run generate-data" first.`);
      this.dataset = await response.json();
      this.currentCount = count;
      this.currentDim = dim;
      this.resetQueryVector(dim);
    } catch (error) {
      this.status = "Error: " + (error instanceof Error ? error.message : String(error));
      this.render();
      throw error;
    }
  }

  private toggleEngine(engineName: string) {
    if (this.selectedEngines.has(engineName)) {
      this.selectedEngines.delete(engineName);
    } else {
      this.selectedEngines.add(engineName);
    }
    this.render();
  }

  private async handleRunBenchmark() {
    if (this.isRunning) return;
    this.isRunning = true;
    const currentRunResults: BenchmarkResult[] = [];
    
    try {
      const selectedCount = parseInt((this.shadow.querySelector("#docCount") as HTMLSelectElement).value);
      const selectedDim = parseInt((this.shadow.querySelector("#dimensions") as HTMLSelectElement).value);
      const iterCount = parseInt((this.shadow.querySelector("#iterations") as HTMLInputElement).value) || 1;
      
      this.iterations = iterCount;

      if (this.currentCount !== selectedCount || this.currentDim !== selectedDim || this.dataset.length === 0) {
        await this.loadDataset(selectedCount, selectedDim);
      }

      this.status = `Running benchmarks (${iterCount} iterations)...`;
      this.render();

      const enginesToRun = [];
      if (this.selectedEngines.has("JavaScript")) enginesToRun.push(new JsEngine());
      if (this.selectedEngines.has("Rust (Wasm)")) enginesToRun.push(new RustEngine());
      if (this.selectedEngines.has("Go (TinyGo)")) enginesToRun.push(new GoEngine());
      if (this.selectedEngines.has("Python (Pyodide)")) enginesToRun.push(new PythonEngine());

      for (const engine of enginesToRun) {
        this.status = `Initializing ${engine.name}...`;
        this.render();
        
        const startupStart = performance.now();
        if (engine instanceof JsEngine || engine instanceof RustEngine || engine instanceof PythonEngine || engine instanceof GoEngine) {
           (engine as any).pendingDocs = this.dataset;
        }
        await engine.init();
        const startupMs = performance.now() - startupStart;

        let totalSearchMs = 0;
        let lastResult: any = null;

        for (let i = 0; i < iterCount; i++) {
          this.status = `Running ${engine.name} (Iter ${i + 1}/${iterCount})...`;
          this.render();
          
          const searchStart = performance.now();
          const results = await engine.search(this.dataset, this.queryVector, 5);
          const searchEnd = performance.now();
          
          totalSearchMs += (searchEnd - searchStart);
          lastResult = {
            engine: engine.name,
            startupMs: 0,
            searchMs: 0,
            totalMs: 0,
            resultCount: results.length,
            topResultId: results.length > 0 ? results[0].id : null,
          };
        }

        currentRunResults.push({
          ...lastResult,
          startupMs: startupMs,
          searchMs: totalSearchMs / iterCount,
          totalMs: startupMs + (totalSearchMs / iterCount)
        });
      }

      // Add to history (newest first)
      this.history.unshift({
        timestamp: new Date().toLocaleTimeString(),
        params: { count: selectedCount, dim: selectedDim, iterations: iterCount },
        results: currentRunResults
      });

      this.status = "Complete";
    } catch (error) {
      this.status = "Benchmark failed";
      console.error(error);
    } finally {
      this.isRunning = false;
      this.render();
    }
  }

  private render() {
    this.shadow.innerHTML = `
      <style>${componentStyles}
        .run-card {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 1rem;
          margin-top: 1.5rem;
          background: #fff;
        }
        .run-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.5rem;
          border-bottom: 1px solid #eee;
          padding-bottom: 0.5rem;
        }
        .run-params {
          font-weight: bold;
          color: #2c3e50;
        }
        .run-time {
          font-size: 0.8rem;
          color: #888;
        }
      </style>
      <div>
        <h1>Wasm Language Lab</h1>
        <p>Compare vector search performance across different language runtimes.</p>

        <div class="controls">
          <div class="control-group">
            <label>Engines</label>
            <div class="engines-list">
              <label class="engine-option">
                <input type="checkbox" id="check-js" ${this.selectedEngines.has("JavaScript") ? "checked" : ""}>
                JS
              </label>
              <label class="engine-option">
                <input type="checkbox" id="check-rust" ${this.selectedEngines.has("Rust (Wasm)") ? "checked" : ""}>
                Rust
              </label>
              <label class="engine-option">
                <input type="checkbox" id="check-go" ${this.selectedEngines.has("Go (TinyGo)") ? "checked" : ""}>
                Go
              </label>
              <label class="engine-option">
                <input type="checkbox" id="check-python" ${this.selectedEngines.has("Python (Pyodide)") ? "checked" : ""}>
                Python
              </label>
            </div>
          </div>

          <div class="control-group">
            <label for="docCount">Docs</label>
            <select id="docCount">
              <option value="1000" ${this.currentCount === 1000 ? 'selected' : ''}>1,000</option>
              <option value="5000" ${this.currentCount === 5000 ? 'selected' : ''}>5,000</option>
              <option value="10000" ${this.currentCount === 10000 ? 'selected' : ''}>10,000</option>
            </select>
          </div>

          <div class="control-group">
            <label for="dimensions">Dims</label>
            <select id="dimensions">
              <option value="384" ${this.currentDim === 384 ? 'selected' : ''}>384d (MiniLM)</option>
              <option value="768" ${this.currentDim === 768 ? 'selected' : ''}>768d (BERT)</option>
              <option value="1536" ${this.currentDim === 1536 ? 'selected' : ''}>1536d (OpenAI S)</option>
              <option value="3072" ${this.currentDim === 3072 ? 'selected' : ''}>3072d (OpenAI L)</option>
              <option value="4096" ${this.currentDim === 4096 ? 'selected' : ''}>4096d (Llama 3)</option>
            </select>
          </div>

          <div class="control-group">
            <label for="iterations">Iterations (Avg)</label>
            <input type="number" id="iterations" value="${this.iterations}" min="1" max="100" style="width: 50px;">
          </div>

          <button ${this.isRunning ? "disabled" : ""} id="runBtn">
            ${this.isRunning ? "Running..." : "Run Benchmark"}
          </button>
        </div>

        <div class="status">Status: ${this.status}</div>

        <div class="history-section">
          ${this.history.map(run => {
            const validResults = run.results.filter(r => !r.error);
            const topResultIds = validResults.map(r => r.topResultId);
            const hasMismatch = validResults.length > 1 && new Set(topResultIds).size > 1;

            return `
              <div class="run-card">
                <div class="run-header">
                  <div class="run-params">
                    ${run.params.count.toLocaleString()} docs, ${run.params.dim}d, ${run.params.iterations} iterations
                  </div>
                  <div class="run-time">${run.timestamp}</div>
                </div>
                <table>
                  <thead>
                    <tr>
                      <th>Engine</th>
                      <th>Startup</th>
                      <th>Search (Avg)</th>
                      <th>Total</th>
                      <th>Top Result</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${run.results.map(r => `
                      <tr style="${hasMismatch && r.topResultId !== topResultIds[0] ? 'background: #fff5f5;' : ''}">
                        <td>${r.engine}</td>
                        <td>${r.startupMs.toFixed(2)} ms</td>
                        <td>${r.searchMs.toFixed(2)} ms</td>
                        <td>${r.totalMs.toFixed(2)} ms</td>
                        <td><code>${r.topResultId || "-"}</code></td>
                        <td>${r.error ? `<span class="error" title="${r.error}">Error</span>` : "OK"}</td>
                      </tr>
                    `).join("")}
                  </tbody>
                </table>
                ${hasMismatch ? `
                  <div class="warning" style="background: #fff5f5; padding: 0.5rem; border-radius: 4px; border-left: 4px solid #e74c3c; margin-top: 0.5rem;">
                    ⚠️ <strong>Result Mismatch:</strong> Engines returned different top results. This could be due to float precision differences or implementation bugs.
                  </div>
                ` : `
                  <div style="font-size: 0.8rem; color: #276749; margin-top: 0.5rem;">
                    ✅ <strong>Verified:</strong> All engines returned consistent results.
                  </div>
                `}
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;

    // Manual event binding since we're using raw innerHTML
    this.shadow.querySelector("#runBtn")?.addEventListener("click", () => this.handleRunBenchmark());
    this.shadow.querySelector("#check-js")?.addEventListener("change", () => this.toggleEngine("JavaScript"));
    this.shadow.querySelector("#check-rust")?.addEventListener("change", () => this.toggleEngine("Rust (Wasm)"));
    this.shadow.querySelector("#check-python")?.addEventListener("change", () => this.toggleEngine("Python (Pyodide)"));
    this.shadow.querySelector("#check-go")?.addEventListener("change", () => this.toggleEngine("Go (TinyGo)"));
  }
}

customElements.define("wasm-language-lab", WasmLanguageLab);
