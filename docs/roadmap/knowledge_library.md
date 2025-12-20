## Knowledge Library (Languages + Domains)

### Scope
- Natural languages: Sanskrit, Hindi, Marathi, Gujarati, English, and others on demand.
- Programming languages: C#, TypeScript, JavaScript, Python, SQL, and others used in projects.
- Domains/subjects: Math, Finance, Economics, Physics, Chemistry, Biology, Medicine, Computer Science, and more as needed.

### Structure
- data/language/natural/<lang>/meta.json, examples.jsonl, notes.
- data/language/programming/<lang>/meta.json, patterns.jsonl, anti_patterns.jsonl.
- data/domains/<domain>/meta.json, concepts.jsonl, examples.jsonl.
- docs/language/ and docs/domains/ for human-readable overviews and reasoning patterns.

### Role in RocketGPT
- Behaves like a structured “knowledge network” on top of the base LLMs.
- Self-Study, Self-Research, and Self-Innovation read and update these files over time.
- Used to:
  - Standardise explanations in multiple languages.
  - Improve code generation and architecture reasoning per stack.
  - Provide deeper, more consistent domain reasoning in maths, finance, science, medicine, etc.
- Stored entirely in the Git repo to stay within free-tier limits.

### Future Enhancements
- Automatic tagging of concepts by difficulty and dependencies.
- Cross-links between domains (e.g., math <-> finance, biology <-> medicine).
- Specialised “teaching modes” that use the library to generate learning paths.
