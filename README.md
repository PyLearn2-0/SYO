# CompTIA Security+ SY0-701 Practice Quiz

A localhost study site that randomly draws **60–90 questions** from a parsed
SY0-701 question bank (604 questions extracted from the PDF you provided),
gives you instant feedback on every answer, and explains *why* the correct
answer is correct.

No external dependencies are needed at runtime — only Python 3 (which you
already have). `pypdf` is only required if you want to re-parse the source
PDF.

## Quick start

```bash
cd /Users/stevanbillingsley/Cursor/secplus_quiz
python3 run.py
```

Your browser will open to `http://localhost:8000/` automatically. Pick how
many questions you want (60–90), hit **Start Quiz**, and go.

Want a different port?

```bash
python3 run.py --port 9000
```

Want to launch without auto-opening the browser?

```bash
python3 run.py --no-browser
```

Stop the server with `Ctrl+C`.

## How it works

| Piece | Purpose |
| --- | --- |
| `build_questions.py` | One-time parser that reads the SY0-701 PDF and writes `data/questions.json` (already done — re-run only if you swap PDFs). |
| `classify_domains.py` | Tags every question in `data/questions.json` with its official SY0-701 exam section (1.0–5.0) using weighted keyword rules plus hand-reviewed overrides. Re-run after re-parsing the PDF. |
| `data/questions.json` | The parsed question bank: stem, options, correct letter(s), exam section, and the best community explanation. |
| `static/ports-data.js` | The 17 essential SY0-701 ports & protocols that power the Ports & Protocols flashcards and quiz. |
| `index.html` + `static/styles.css` + `static/quiz.js` | The single-page quiz UI. All randomization, scoring, and feedback runs in the browser. |
| `run.py` | A 30-line wrapper around Python's built-in `http.server` that serves the site and opens your browser. |

### Quiz behavior

- **Randomized every run** — questions are sampled fresh each time you click
  *Start Quiz*. Answer choices within each question are also shuffled by
  default (uncheck the box on the setup screen if you want them fixed in
  A/B/C/D order).
- **Instant feedback** — clicking an option immediately marks it green or red,
  reveals the correct answer, and shows a "Why?" explanation taken from the
  highest-rated community comment for that question.
- **Live score** — the top bar tracks `answered / total`, `correct`, and your
  running percentage as you go.
- **Section badges** — every question shows which official SY0-701 exam
  section it pertains to (e.g. *2.0 Threats, Vulnerabilities, and
  Mitigations*) in the top-right corner of the question card.
- **Review at the end** — the results screen lists every question you missed
  with both your answer and the correct one, plus the explanation.
- **Section breakdown** — the results screen also shows how many questions
  you got right and wrong in each exam section, plus a study-priority hint
  pointing at your weakest section.

## Re-parsing the PDF (optional)

You only need to do this if you replace the source PDF or want to re-tune the
parser:

```bash
pip3 install --user pypdf   # one-time
python3 build_questions.py
```

This regenerates `data/questions.json`. The script expects the original PDF at
`/Users/stevanbillingsley/Desktop/SY0-701_Answers.pdf_…pdf` — edit `PDF_PATH`
at the top of `build_questions.py` if you move it.
