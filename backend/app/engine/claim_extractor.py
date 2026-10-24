"""Claim extraction module for GroundCheck.
Extracts atomic factual claims while preserving numbers, units, dates, qualifiers, negation, and scope.
"""
import re
from typing import List, Dict, Any, Optional
from ..schemas import ClaimVerificationResult, ClaimStatus


ABBREVIATIONS = ["e.g.", "i.e.", "Corp.", "Inc.", "vs.", "Dr.", "Mr.", "Ms.", "No.", "v.", "Dept."]


class ClaimExtractor:
    """Extracts atomic factual claims from an answer text conservatively.
    """

    def __init__(self):
        pass

    def extract_claims(self, text: str) -> List[Dict[str, Any]]:
        """Extracts atomic claims from input text.
        Returns a list of dictionaries with claim_id, claim_text, start_char, end_char.
        """
        if not text or not text.strip():
            return []

        cleaned = text.strip()
        raw_sentences = self._segment_sentences(cleaned)
        claims = []
        claim_counter = 1

        for sentence in raw_sentences:
            atomic_parts = self._split_atomic_propositions(sentence)
            for part in atomic_parts:
                part_clean = part.strip()
                if not part_clean:
                    continue
                # Make sure it ends with a period if it's a complete assertion
                if not part_clean.endswith((".", "!", "?")):
                    part_clean += "."

                claim_id = f"CLM-{claim_counter:03d}"
                claims.append({
                    "claim_id": claim_id,
                    "claim_text": part_clean,
                    "original_sentence": sentence,
                })
                claim_counter += 1

        return claims

    def _segment_sentences(self, text: str) -> List[str]:
        temp = text
        for idx, abbr in enumerate(ABBREVIATIONS):
            temp = temp.replace(abbr, f"__ABBR_{idx}__")

        # Split on sentence ending punctuation followed by space or newline
        parts = re.split(r'(?<=[.!?])\s+|[\r\n]+', temp)
        sentences = []
        for p in parts:
            for idx, abbr in enumerate(ABBREVIATIONS):
                p = p.replace(f"__ABBR_{idx}__", abbr)
            p = p.strip()
            if p:
                sentences.append(p)
        return sentences

    def _split_atomic_propositions(self, sentence: str) -> List[str]:
        """Splits compound sentences into atomic propositions while carrying forward contextual prefixes.
        Example:
        'According to Acme Policy, employees get 20 paid leave days and unlimited remote work.'
        ->
        ['According to Acme Policy, employees get 20 paid leave days',
         'According to Acme Policy, employees get unlimited remote work']
        """
        prefix_match = re.match(
            r'^(According to [^,]+,\s*|As per [^,]+,\s*|Under [^,]+,\s*)',
            sentence,
            re.IGNORECASE
        )
        prefix = prefix_match.group(0) if prefix_match else ""
        body = sentence[len(prefix):] if prefix else sentence

        # Check for conjunction patterns
        # Specifically handle "X get/receive Y and Z" or "X and Y"
        conjunction_match = re.search(
            r'^(.*?\b(?:get|gets|receive|receives|have|has|require|requires|must|may)\b\s+[^,]+?)\s+and\s+([^,]+.*)$',
            body,
            re.IGNORECASE
        )

        if conjunction_match:
            part1 = conjunction_match.group(1).strip()
            part2 = conjunction_match.group(2).strip()

            # If part2 doesn't have a subject/verb, inherit subject & verb from part1
            subj_verb_match = re.match(
                r'^(.*?)\b(get|gets|receive|receives|have|has)\b\s+',
                part1,
                re.IGNORECASE
            )
            if subj_verb_match and not re.match(r'^(?:employees|they|all|staff|requests)\b', part2, re.IGNORECASE):
                subj_verb = subj_verb_match.group(0)
                part2_reconstructed = f"{prefix}{subj_verb}{part2}".strip()
            else:
                part2_reconstructed = f"{prefix}{part2}".strip()

            part1_reconstructed = f"{prefix}{part1}".strip()
            return [part1_reconstructed, part2_reconstructed]

        # Check for semicolon splits
        if ";" in sentence:
            parts = [p.strip() for p in sentence.split(";") if p.strip()]
            if len(parts) > 1:
                return [f"{prefix}{p}" if not p.startswith(prefix) else p for p in parts]

        return [sentence]


claim_extractor = ClaimExtractor()
