import math
import json

# Global state
IDS = []
TITLES = []
VECTORS = None # This will be a memoryview/array
NORMS = []
DIM = 0

def set_data(vectors_buffer, ids_json, titles_json, dim):
    global IDS, TITLES, VECTORS, NORMS, DIM
    
    IDS = json.loads(ids_json)
    TITLES = json.loads(titles_json)
    DIM = dim
    
    # vectors_buffer is a memoryview of the Float32Array from JS
    VECTORS = vectors_buffer
    
    num_docs = len(IDS)
    NORMS = []
    
    # Pre-calculate norms from the flat buffer
    for i in range(num_docs):
        offset = i * DIM
        norm_sq = 0.0
        for j in range(DIM):
            val = VECTORS[offset + j]
            norm_sq += val * val
        NORMS.append(math.sqrt(norm_sq))
    
    return True

def search_vectors(query_vector_json, top_k):
    query_vector = json.loads(query_vector_json)
    
    q_norm_sq = sum(x * x for x in query_vector)
    q_norm = math.sqrt(q_norm_sq)
    
    num_docs = len(IDS)
    scores = []
    
    for i in range(num_docs):
        offset = i * DIM
        dot_product = 0.0
        for j in range(DIM):
            dot_product += VECTORS[offset + j] * query_vector[j]
        
        score = 0.0
        if q_norm > 0 and NORMS[i] > 0:
            score = dot_product / (q_norm * NORMS[i])
            
        scores.append((score, i))
    
    # Sort by score descending
    scores.sort(key=lambda x: x[0], reverse=True)
    
    # Only create the result dictionaries for the top_k
    results = []
    for i in range(min(top_k, num_docs)):
        score, idx = scores[i]
        results.append({
            'id': IDS[idx],
            'title': TITLES[idx],
            'score': score
        })
    
    return json.dumps(results)
