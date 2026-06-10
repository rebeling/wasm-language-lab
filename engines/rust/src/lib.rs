use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use once_cell::sync::Lazy;
use std::collections::BinaryHeap;
use std::cmp::Ordering;

#[derive(Serialize, Deserialize)]
pub struct SearchResult {
    pub id: String,
    pub title: String,
    pub score: f32,
}

struct FlatEngine {
    ids: Vec<String>,
    titles: Vec<String>,
    vectors: Vec<f32>,
    norms: Vec<f32>,
    dim: usize,
}

static ENGINE: Lazy<Mutex<Option<FlatEngine>>> = Lazy::new(|| Mutex::new(None));

#[wasm_bindgen]
pub fn set_data(
    vectors: &[f32], 
    ids_val: JsValue, 
    titles_val: JsValue, 
    dim: usize
) -> Result<(), JsValue> {
    let ids: Vec<String> = serde_wasm_bindgen::from_value(ids_val)?;
    let titles: Vec<String> = serde_wasm_bindgen::from_value(titles_val)?;
    
    let num_docs = ids.len();
    let mut norms = Vec::with_capacity(num_docs);

    // Pre-calculate norms for the flat vectors
    for i in 0..num_docs {
        let offset = i * dim;
        let mut norm_sq = 0.0;
        for j in 0..dim {
            let val = vectors[offset + j];
            norm_sq += val * val;
        }
        norms.push(norm_sq.sqrt());
    }

    let mut engine = ENGINE.lock().map_err(|_| JsValue::from_str("Lock failed"))?;
    *engine = Some(FlatEngine { 
        ids, 
        titles, 
        vectors: vectors.to_vec(), 
        norms, 
        dim 
    });
    
    Ok(())
}

struct ScoreIndex(f32, usize);
impl PartialEq for ScoreIndex {
    fn eq(&self, other: &Self) -> bool { self.0 == other.0 }
}
impl Eq for ScoreIndex {}
impl PartialOrd for ScoreIndex {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        other.0.partial_cmp(&self.0)
    }
}
impl Ord for ScoreIndex {
    fn cmp(&self, other: &Self) -> Ordering {
        self.partial_cmp(other).unwrap_or(Ordering::Equal)
    }
}

#[wasm_bindgen]
pub fn search_vectors(
    query_vector: &[f32],
    top_k: usize,
) -> Result<JsValue, JsValue> {
    let engine_lock = ENGINE.lock().map_err(|_| JsValue::from_str("Lock failed"))?;
    let engine = engine_lock.as_ref().ok_or_else(|| JsValue::from_str("Engine not initialized"))?;

    let mut q_norm_sq = 0.0;
    for &val in query_vector {
        q_norm_sq += val * val;
    }
    let q_norm = q_norm_sq.sqrt();
    
    let dim = engine.dim;
    let num_docs = engine.ids.len();
    let mut heap = BinaryHeap::with_capacity(top_k + 1);

    for i in 0..num_docs {
        let offset = i * dim;
        let mut dot_product = 0.0;
        
        // Manual unrolling/hinting for the compiler
        let doc_vec = &engine.vectors[offset..offset + dim];
        for j in 0..dim {
            dot_product += unsafe { doc_vec.get_unchecked(j) * query_vector.get_unchecked(j) };
        }

        let score = if q_norm > 0.0 && engine.norms[i] > 0.0 {
            dot_product / (engine.norms[i] * q_norm)
        } else {
            0.0
        };

        heap.push(ScoreIndex(score, i));
        if heap.len() > top_k {
            heap.pop();
        }
    }

    let mut final_results = Vec::with_capacity(top_k);
    let mut sorted_indices: Vec<ScoreIndex> = heap.into_iter().collect();
    sorted_indices.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap());

    for ScoreIndex(score, index) in sorted_indices {
        final_results.push(SearchResult {
            id: engine.ids[index].clone(),
            title: engine.titles[index].clone(),
            score,
        });
    }

    Ok(serde_wasm_bindgen::to_value(&final_results)?)
}
