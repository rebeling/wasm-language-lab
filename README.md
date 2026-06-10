# 🔬 Wasm Language Lab

A high-performance benchmarking dashboard implemented as a Web Component to compare **vector search performance** across multiple language runtimes and WebAssembly implementations.

### Example Benchmark Result
**Configuration**: 10,000 docs, 4096d, 10 iterations

| Engine | Startup | Search (Avg) | Total | Top Result | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **JavaScript** | 62.40 ms | 68.40 ms | 130.80 ms | `doc-6908` | OK |
| **Rust (Wasm)** | 216.50 ms | 39.28 ms | 255.78 ms | `doc-6908` | OK |
| **Go (TinyGo)** | 9012.50 ms | 50.10 ms | 9062.60 ms | `doc-6908` | OK |
| **Python (Pyodide)** | 5831.40 ms | 4540.99 ms | 10372.39 ms | `doc-6908` | OK |

---

## 🏗 Architecture: The Portable Web Component

The entire lab is delivered as a **Vanilla Web Component** (`<wasm-language-lab>`), providing a "plug-and-play" experience for high-performance benchmarking.

### Key Architectural Wins:
-   **Shadow DOM Encapsulation**: All component styles, UI logic, and engine instances are isolated from the host page.
-   **Zero-Config Integration**: The component internally manages the complex lifecycle of loading Wasm modules (Rust/Go), external runtime scripts (Pyodide), and local datasets.
-   **Polyglot Runtime**: It serves as a bridge between high-level TypeScript and low-level system languages, abstracting away the memory-management complexity of WebAssembly.

---

## 🚀 Supported Engines

- **JavaScript (V8)**: Optimized baseline using `Float32Array` and flat memory layout. Leverages V8's highly optimized JIT for numerical loops.
- **Rust (Wasm)**: The performance leader. Uses `wasm-pack`, **zero-copy binary interop**, and `unsafe` unchecked memory access for maximum SIMD potential.
- **Go (TinyGo)**: Compact Wasm implementation utilizing TinyGo's efficient runtime. Excellent balance of readability and low-level control.
- **Python (Pyodide)**: Interpreted execution via the Pyodide runtime. Simulates a client-side scientific stack environment.

---

## 🧠 The Search Algorithm

The lab performs an exhaustive **Brute-Force Cosine Similarity Top-K Search**, the fundamental operation for evaluating vector similarity.

### Core Formula
For every document $A$ and query vector $B$, we calculate:
$$\text{similarity} = \frac{A \cdot B}{\|A\| \|B\|}$$

### Why Brute Force?
Brute force is the ultimate test of a runtime's ability to move numbers through a CPU. While large-scale systems use indexing for speed, brute force remains the gold standard for accuracy and raw mathematical throughput.

---

## ⚡ Production-Grade Optimizations

To ensure a fair comparison, all engines (even JS and Python) implement advanced optimizations used in real-world vector engines:

1.  **Flat Binary Memory**: Vectors are stored in a single, contiguous block of memory (`Float32Array`). This maximizes CPU cache hits and allows for linear memory scanning.
2.  **Pre-calculated Norms**: The magnitude ($\|A\|$) of every vector is calculated once during the **Startup** phase. During search, the engines only perform the Dot Product.
3.  **Heap Selection**: Instead of sorting the entire dataset (which is $O(N \log N)$), engines use a **Binary Min-Heap** to track only the Top-K results ($O(N \log K)$).
4.  **Zero-Copy Interop**: Data is passed between JavaScript and WebAssembly as raw binary buffers, bypassing the slow JSON/Object serialization bottleneck.

---

## 📊 Benchmark Matrix

The lab supports a matrix of realistic AI embedding configurations:
- **Scales**: 1,000 | 5,000 | 10,000 documents.
- **Industry Standards**:
  - `384d`: Hugging Face MiniLM (L6/L12)
  - `768d`: BERT-base / BGE-small
  - `1536d`: OpenAI `text-embedding-3-small` / Ada-002
  - `3072d`: OpenAI `text-embedding-3-large`
  - `4096d`: Llama 3 / Mistral / Gemma

---

## 🛠 Setup & Development

### Prerequisites
- **Node.js**: `^20.0.0`
- **Rust**: `^1.75.0` + `wasm-pack`
- **Go**: `^1.22.0` + `TinyGo`

### Installation
```bash
npm install
npm run generate-data # Generates benchmarking matrix (Git ignored)
```

### Build & Run
```bash
npm run dev           # Start Vite dev server
npm run build:wasm    # Rebuild Rust Wasm Engine
# For Go: tinygo build -o public/wasm/go_engine.wasm -target wasm engines/go/main.go
```

## 🔬 Performance Caveats
*   **The Boundary Cost**: Moving 10,000 vectors into Wasm has a one-time "Startup" cost. This represents the "Cold Start" of a client-side database.
*   **JIT Warming**: V8 (JS) and Wasm engines optimize code at runtime. Use **10+ iterations** to see "warm" performance.
*   **Precision**: Wasm uses `f32` (32-bit) while JS/Python use `f64`. This lab ensures Rank Consistency across precisions.
