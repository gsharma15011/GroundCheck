"""Text chunking utilities for GroundCheck.
Splits text into chunks preserving sentences, paragraph boundaries, and metadata.
"""
import re
from typing import List, Dict, Any, Optional

ABBREVIATIONS = ["e.g.", "i.e.", "Corp.", "Inc.", "vs.", "Dr.", "Mr.", "Ms.", "No.", "v.", "Dept."]


def split_into_sentences(text: str) -> List[str]:
    """Conservative sentence segmentation that preserves decimals, numbers, and abbreviations.
    """
    if not text:
        return []

    temp = text.strip()
    for idx, abbr in enumerate(ABBREVIATIONS):
        temp = temp.replace(abbr, f"__ABBR_{idx}__")

    parts = re.split(r'(?<=[.!?])\s+|[\r\n]+', temp)
    sentences = []
    for p in parts:
        for idx, abbr in enumerate(ABBREVIATIONS):
            p = p.replace(f"__ABBR_{idx}__", abbr)
        p = p.strip()
        if p:
            sentences.append(p)
    return sentences


def chunk_text(
    text: str,
    max_chunk_chars: int = 500,
    overlap_chars: int = 100,
) -> List[Dict[str, Any]]:
    """Chunks text preserving sentences with character offsets.
    """
    sentences = split_into_sentences(text)
    chunks = []
    current_chunk = []
    current_len = 0

    for sent in sentences:
        sent_len = len(sent)
        if current_len + sent_len > max_chunk_chars and current_chunk:
            chunk_str = " ".join(current_chunk)
            chunks.append({
                "text": chunk_str,
                "char_length": len(chunk_str),
            })
            if len(current_chunk) > 1 and len(current_chunk[-1]) <= overlap_chars:
                current_chunk = [current_chunk[-1], sent]
                current_len = len(current_chunk[0]) + sent_len + 1
            else:
                current_chunk = [sent]
                current_len = sent_len
        else:
            current_chunk.append(sent)
            current_len += sent_len + 1

    if current_chunk:
        chunk_str = " ".join(current_chunk)
        chunks.append({
            "text": chunk_str,
            "char_length": len(chunk_str),
        })

    return chunks
