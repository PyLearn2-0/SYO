"""
Parses the SY0-701 Sec+ exam dump PDF into a structured JSON file used by the
quiz website.

For each page in the PDF we:
  1. Locate the "Topic X Question #N" marker (always near the bottom)
  2. Pull out the question text, the answer options (A/B/C/...), and the
     "Correct Answer" line
  3. Use the comments above the marker (or from the previous page) as the
     source for an explanation, prioritising the "Highly Voted" community
     comments since those are usually the clearest write-ups.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import pypdf

PDF_PATH = Path(
    "/Users/stevanbillingsley/Desktop/"
    "SY0-701_Answers.pdf_"
    "12e1a7ac7e857472d1c31e4fd6515dbf5dc56731a21a7ab01cdc03f43377c8ca.pdf"
)
OUTPUT_PATH = Path(__file__).parent / "data" / "questions.json"

TOPIC_RE = re.compile(r"Topic\s*(\d+)\s*Question\s*#\s*(\d+)", re.IGNORECASE)
# Start of an option line, e.g. "A. Foo" or "A) Foo"
OPTION_RE = re.compile(r"^\s*([A-H])[\.\)]\s+(.*)$")
CORRECT_RE = re.compile(
    # Allow "Correct Answer:C", "Correct Answer:EF" (multi concat),
    # "Correct Answer:B,D" or "B&D". Trailing lookahead prevents bleeding
    # into the next line (e.g. the "C" in "Community vote distribution").
    r"Correct\s*Answer\s*:\s*([A-H](?:[,&]?[A-H])*)(?![A-Za-z])",
    re.IGNORECASE,
)
COMMUNITY_RE = re.compile(r"Community\s*vote\s*distribution", re.IGNORECASE)
UPVOTED_RE = re.compile(r"upvoted\s+\d+\s+times?", re.IGNORECASE)
SELECTED_ANSWER_RE = re.compile(r"Selected\s*Answer\s*:?\s*([A-H,&\s]+)", re.IGNORECASE)


def _normalize(text: str) -> str:
    text = text.replace("\r", "\n")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _extract_question_block(page_text: str) -> dict | None:
    """Pull the question/options/answer trio out of a single page's text."""

    matches = list(TOPIC_RE.finditer(page_text))
    if not matches:
        return None

    # Use the LAST topic marker on the page (questions sit near the bottom).
    marker = matches[-1]
    topic = int(marker.group(1))
    qnum = int(marker.group(2))

    after = page_text[marker.end():]
    before = page_text[: marker.start()]

    correct_match = CORRECT_RE.search(after)
    if not correct_match:
        return None

    body = after[: correct_match.start()].strip("\n :")
    correct_letters_raw = correct_match.group(1)
    # Multi-answer can be concatenated ("EF"), comma-separated ("E,F"), or
    # ampersand-separated ("E&F"). Just pull every letter character out.
    correct_letters = [
        c.upper() for c in re.findall(r"[A-Ha-h]", correct_letters_raw)
    ]

    # Split the body into the question stem and options.
    body_lines = [ln.strip() for ln in body.split("\n") if ln.strip()]
    question_lines: list[str] = []
    options: dict[str, list[str]] = {}
    current_letter: str | None = None

    for line in body_lines:
        m = OPTION_RE.match(line)
        if m:
            current_letter = m.group(1).upper()
            options[current_letter] = [m.group(2).strip()]
        elif current_letter is not None:
            options[current_letter].append(line)
        else:
            question_lines.append(line)

    # Some questions wrap the stem onto the line above the marker. If we
    # didn't find any options it is almost certainly a "performance based"
    # multi-page lab question - skip it.
    if not options or not question_lines:
        return None

    options_clean = {
        letter: " ".join(parts).strip() for letter, parts in options.items()
    }

    # Drop questions that don't include every "correct" letter as an option.
    if not all(letter in options_clean for letter in correct_letters):
        return None

    question_text = " ".join(question_lines).strip()
    # Drop pages where the "question" is really a meta blurb.
    if len(question_text) < 15:
        return None

    return {
        "topic": topic,
        "number": qnum,
        "question": question_text,
        "options": options_clean,
        "correct": correct_letters,
        "_explanation_source": before,
    }


def _significant_words(text: str) -> set[str]:
    """Pull content words out of an option string for relevance matching."""

    stop = {
        "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "with",
        "is", "are", "be", "by", "as", "at", "from", "that", "this", "it",
        "all", "any", "into", "out", "no", "not", "but", "also", "more",
    }
    words = re.findall(r"[A-Za-z][A-Za-z0-9\-]{2,}", text.lower())
    return {w for w in words if w not in stop and len(w) >= 4}


def _pick_explanation(
    comment_blob: str,
    correct_letters: list[str],
    options: dict[str, str],
    question_text: str,
) -> str:
    """Return the most useful comment text for the given correct answer.

    Strict relevance rules - we'd rather show "no explanation captured" than
    a confidently wrong one from a neighboring question's discussion.
    """

    if not comment_blob:
        return ""

    target_set = set(letter.upper() for letter in correct_letters)

    # Words that, if a comment mentions them, suggest it really IS about this
    # question rather than an adjacent one whose comments leaked into the page.
    relevance_words: set[str] = set()
    for letter, text in options.items():
        relevance_words |= _significant_words(text)
    relevance_words |= _significant_words(question_text)

    # Words that appear ONLY in the correct option (strongest signal).
    correct_only_words: set[str] = set()
    for letter in target_set:
        correct_only_words |= _significant_words(options.get(letter, ""))
    for letter, text in options.items():
        if letter not in target_set:
            correct_only_words -= _significant_words(text)

    # Split into individual comments by the "upvoted N times" footer.
    chunks = re.split(r"upvoted\s+\d+\s+times?", comment_blob, flags=re.IGNORECASE)
    chunks = [c.strip() for c in chunks if c.strip()]

    def clean(chunk: str) -> str:
        chunk = re.sub(
            r"^[^\n]*?(Highly Voted|Most Recent)?[^\n]*?\d+\s+(?:year|month|week|day|hour)s?\s+(?:,\s*\d+\s+(?:year|month|week|day|hour)s?\s+)?ago\s*",
            "",
            chunk,
            count=1,
            flags=re.IGNORECASE,
        )
        chunk = re.sub(r"^\s*Selected\s*Answer\s*:?[^\n]*\n?", "", chunk, count=1, flags=re.IGNORECASE)
        return chunk.strip()

    def is_relevant(cleaned: str) -> bool:
        """Hard relevance gate: comment must touch this question somehow."""

        cleaned_words = set(re.findall(r"[A-Za-z][A-Za-z0-9\-]{2,}", cleaned.lower()))
        return bool(relevance_words & cleaned_words)

    def support_score(chunk: str, cleaned: str) -> int:
        score = 0

        sel = SELECTED_ANSWER_RE.search(chunk)
        if sel:
            picks = set(re.findall(r"[A-H]", sel.group(1).upper()))
            if picks == target_set:
                score += 5
            elif picks and picks != target_set:
                score -= 10  # explicitly endorses the wrong answer

        head = cleaned[:200]
        head_match = re.match(r"^\s*([A-H])[\.\):,]", head)
        if head_match:
            if head_match.group(1).upper() in target_set:
                score += 3
            else:
                score -= 6

        # Bonus when the comment quotes the actual correct option text.
        cleaned_lower = cleaned.lower()
        for letter in target_set:
            opt_text = options.get(letter, "").strip().lower()
            if opt_text and len(opt_text) > 3 and opt_text in cleaned_lower:
                score += 3
                break

        # Bonus for words that uniquely belong to the correct option.
        cleaned_words = set(re.findall(r"[A-Za-z][A-Za-z0-9\-]{2,}", cleaned_lower))
        if correct_only_words & cleaned_words:
            score += 2

        # Penalty for quoting an INCORRECT option's full text.
        for letter, opt_text in options.items():
            if letter in target_set:
                continue
            opt_text = opt_text.strip().lower()
            if opt_text and len(opt_text) > 6 and opt_text in cleaned_lower:
                score -= 2
                break

        # Length sweet-spot bonus.
        if 80 <= len(cleaned) <= 1500:
            score += 1

        return score

    scored: list[tuple[int, bool, str]] = []
    for c in chunks:
        cleaned = clean(c)
        if not cleaned or not is_relevant(cleaned):
            continue
        s = support_score(c, cleaned)
        if s <= 0:
            # Require *some* positive evidence the comment is about the
            # correct answer, not just an adjacent rant.
            continue
        scored.append((s, "Highly Voted" in c, cleaned))

    if not scored:
        return ""

    scored.sort(key=lambda t: (-t[0], not t[1], -len(t[2])))
    return scored[0][2]


def main() -> None:
    print(f"Reading PDF: {PDF_PATH}")
    reader = pypdf.PdfReader(str(PDF_PATH))
    print(f"  pages: {len(reader.pages)}")

    pages_text = [_normalize(page.extract_text() or "") for page in reader.pages]

    questions: list[dict] = []
    seen: set[tuple[int, int]] = set()

    for idx, text in enumerate(pages_text):
        block = _extract_question_block(text)
        if not block:
            continue

        key = (block["topic"], block["number"])
        if key in seen:
            continue
        seen.add(key)

        # Each question's comments live entirely on the same page above the
        # "Topic X Question #N" marker. Pulling next-page text was a mistake
        # - that page actually belongs to the *following* question and would
        # cause cross-question explanation contamination.
        explanation_source = block.pop("_explanation_source")

        explanation = _pick_explanation(
            explanation_source,
            block["correct"],
            block["options"],
            block["question"],
        )
        # Letter-agnostic correct text - the client appends the live letter
        # so the message stays accurate even when answer choices are shuffled.
        correct_text_only = " / ".join(
            block["options"].get(letter, "").strip() for letter in block["correct"]
        )
        if not explanation:
            explanation = (
                f"The correct answer is: {correct_text_only}. "
                "(No community explanation was captured for this question.)"
            )
        else:
            # Strip a leading "X. " / "X) " / "X: " prefix - it would refer
            # to the original PDF letter and would lie if options got shuffled.
            explanation = re.sub(
                r"^\s*[A-H][\.\):]\s*", "", explanation.strip()
            )
            if len(explanation) < 40:
                explanation = f"Correct answer: {correct_text_only}.\n\n{explanation}"
        block["explanation"] = explanation
        block["id"] = f"T{block['topic']}-Q{block['number']}"
        questions.append(block)

    questions.sort(key=lambda q: (q["topic"], q["number"]))

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(questions, indent=2, ensure_ascii=False))

    print(f"Parsed {len(questions)} questions -> {OUTPUT_PATH}")
    if questions:
        print("\nSample:")
        sample = questions[0]
        print(f"  {sample['id']}: {sample['question'][:120]}...")
        for letter, opt in sample["options"].items():
            mark = "*" if letter in sample["correct"] else " "
            print(f"    {mark} {letter}. {opt[:90]}")
        print(f"  Explanation: {sample['explanation'][:200]}...")


if __name__ == "__main__":
    main()
