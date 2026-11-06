import os
import numpy as np
from typing import List

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

class EmbeddingService:
    EMBEDDING_DIM = 768

    @classmethod
    def get_embedding(cls, text: str) -> List[float]:
        """
        Generates a 768-dimensional normalized vector embedding for text input.
        Uses Gemini API if API Key is available, otherwise uses semantic feature vectorizer.
        """
        if GEMINI_API_KEY:
            try:
                from google import genai
                client = genai.Client(api_key=GEMINI_API_KEY)
                response = client.models.embed_content(
                    model="text-embedding-004",
                    contents=text
                )
                if response and hasattr(response, "embedding"):
                    vec = response.embedding.values
                    return cls._normalize(vec)
            except Exception as e:
                print("Gemini API Embedding Warning, using fallback:", e)

        return cls._deterministic_vectorizer(text)

    @classmethod
    def cosine_similarity(cls, vec_a: List[float], vec_b: List[float]) -> float:
        """
        Calculates Cosine Similarity between two normalized vectors
        """
        a = np.array(vec_a, dtype=np.float32)
        b = np.array(vec_b, dtype=np.float32)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return float(np.dot(a, b) / (norm_a * norm_b))

    @classmethod
    def _deterministic_vectorizer(cls, text: str) -> List[float]:
        """
        Creates a 768-dim normalized embedding based on semantic word and n-gram features.
        """
        vec = np.zeros(cls.EMBEDDING_DIM, dtype=np.float32)
        clean_text = text.lower().replace("?", "").replace(",", "").replace(".", "").replace("-", " ")
        words = clean_text.split()
        
        for word in words:
            if len(word) <= 2 and word not in ["cgpa", "noc"]:
                continue
            hash_val = abs(hash(word)) % cls.EMBEDDING_DIM
            vec[hash_val] += 3.0
            for i in range(len(word) - 2):
                tri_hash = abs(hash(word[i:i+3])) % cls.EMBEDDING_DIM
                vec[tri_hash] += 0.5

        return cls._normalize(vec.tolist())

    @classmethod
    def _normalize(cls, vec: List[float]) -> List[float]:
        arr = np.array(vec, dtype=np.float32)
        norm = np.linalg.norm(arr)
        if norm > 0:
            arr = arr / norm
        return arr.tolist()
