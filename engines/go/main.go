package main

import (
	"encoding/json"
	"math"
	"sort"
	"syscall/js"
)

type VectorDocument struct {
	ID     string    `json:"id"`
	Title  string    `json:"title"`
	Vector []float32 `json:"vector"`
}

type SearchResult struct {
	ID    string  `json:"id"`
	Title string  `json:"title"`
	Score float32 `json:"score"`
}

type FlatEngine struct {
	IDs     []string
	Titles  []string
	Vectors []float32
	Norms   []float32
	Dim     int
}

var engine *FlatEngine

func setDocuments(this js.Value, args []js.Value) interface{} {
	if len(args) < 4 {
		return "Missing arguments"
	}

	// Read flat vectors (TypedArray)
	jsVectors := args[0]
	vectorLen := jsVectors.Length()
	flatVectors := make([]float32, vectorLen)
	// For TinyGo, we might need to copy manually if js.CopyBytesToGo is not ideal for float32
	for i := 0; i < vectorLen; i++ {
		flatVectors[i] = float32(jsVectors.Index(i).Float())
	}

	// Read IDs and Titles (JSON strings for simplicity in this bridge)
	var ids []string
	json.Unmarshal([]byte(args[1].String()), &ids)

	var titles []string
	json.Unmarshal([]byte(args[2].String()), &titles)

	dim := args[3].Int()
	numDocs := len(ids)

	norms := make([]float32, numDocs)
	for i := 0; i < numDocs; i++ {
		var normSq float32
		for j := 0; j < dim; j++ {
			val := flatVectors[i*dim+j]
			normSq += val * val
		}
		norms[i] = float32(math.Sqrt(float64(normSq)))
	}

	engine = &FlatEngine{
		IDs:     ids,
		Titles:  titles,
		Vectors: flatVectors,
		Norms:   norms,
		Dim:     dim,
	}

	return nil
}

func searchVectors(this js.Value, args []js.Value) interface{} {
	if engine == nil {
		return "Engine not initialized"
	}

	jsQuery := args[0]
	topK := args[1].Int()

	query := make([]float32, engine.Dim)
	var qNormSq float32
	for i := 0; i < engine.Dim; i++ {
		val := float32(jsQuery.Index(i).Float())
		query[i] = val
		qNormSq += val * val
	}
	qNorm := float32(math.Sqrt(float64(qNormSq)))

	type scoreIndex struct {
		score float32
		index int
	}

	numDocs := len(engine.IDs)
	scores := make([]scoreIndex, numDocs)

	for i := 0; i < numDocs; i++ {
		var dotProduct float32
		offset := i * engine.Dim
		for j := 0; j < engine.Dim; j++ {
			dotProduct += engine.Vectors[offset+j] * query[j]
		}

		var score float32
		if qNorm > 0 && engine.Norms[i] > 0 {
			score = dotProduct / (qNorm * engine.Norms[i])
		}
		scores[i] = scoreIndex{score: score, index: i}
	}

	// Sort (Simple sort for MVP, heap would be better but let's see Go's speed first)
	sort.Slice(scores, func(i, j int) bool {
		return scores[i].score > scores[j].score
	})

	limit := topK
	if limit > numDocs {
		limit = numDocs
	}

	results := make([]map[string]interface{}, limit)
	for i := 0; i < limit; i++ {
		idx := scores[i].index
		results[i] = map[string]interface{}{
			"id":    engine.IDs[idx],
			"title": engine.Titles[idx],
			"score": scores[i].score,
		}
	}

	// Convert to JSON string to pass back easily
	resJSON, _ := json.Marshal(results)
	return string(resJSON)
}

func main() {
	c := make(chan struct{}, 0)
	js.Global().Set("goSetDocuments", js.FuncOf(setDocuments))
	js.Global().Set("goSearchVectors", js.FuncOf(searchVectors))
	<-c
}
