# Knowledge and RAG recall

The knowledge library, book analysis, style engine, world samples, and character notes are not isolated modules. They enter Auto-Director and chapter-execution context at different stages, helping the system keep setting, style, and long-book continuity.

## Which assets are used

| Asset | Main use | Common entry stages |
|---|---|---|
| Knowledge-library documents | Fact notes, setting, reference text, uploaded notes | chapter execution, book-analysis reuse, Creative Hub Q&A |
| Book-analysis results | Work structure, characters, selling points, pacing, writing experience | book-opening direction, style reference, chapter context |
| Style engine | Narrative style, language rules, anti-template expression | chapter writing, review, repair |
| World samples | World rules, factions, places, boundaries | world setup, chapter context |
| Character library | Character basics, visual assets, relationships | character setup, chapter context, Comic studio |
| Foreshadowing / fact ledger | Facts that happened, reader promises, unpaid foreshadowing | chapter execution, review, state write-back |

## Note-source layers

RAG is not one pool of notes. Different notes have different trust and uses:

| Layer | Examples | Use principle |
|---|---|---|
| This book’s facts | written chapters, fact ledger, character state, world state | Highest priority. External notes cannot override them. |
| This book’s planning | book contract, story macro, volume strategy, chapter tasks | Guide the next writing goal. |
| User notes | uploaded knowledge library, world samples, dedicated setting documents | Supplement facts and setting. |
| Book-analysis conclusions | reference-work structure, selling points, character and style analysis | Transfer method. Do not copy plot. |
| Style assets | style rules, Anti-AI rules, sample-text traits | Control how it is said. |
| Temporary conversation | current Creative Hub turn | Can affect only the current task. Long-term effect needs to be saved. |

:::checkpoint This book’s facts win
If external knowledge-library notes fight facts that already happened in this book, chapter execution should obey this book’s facts. Reference notes supplement. They do not overturn content already written into novel state.
:::

## Where RAG is used

| Stage | Uses RAG? | Note |
|---|---|---|
| Candidate directions | May use book-analysis / note summaries | Helps understand genre, reader expectation, and reference direction. |
| Book contract | Mainly uses candidates and story macro | Key goals come from your choice and should not be overridden by external notes. |
| World setup | May consult world samples and the knowledge library | Helps generate rules, factions, and places. |
| Character setup | May consult world, genre, and character assets | Characters must obey this book’s direction. |
| Volume strategy | Uses book contract, story macro, character cast | RAG is support only. It does not replace main-line planning. |
| Beat sheet / chapter list | Uses volume strategy and chapter-task notes | Focus is structural consistency. |
| Chapter execution | Clearly uses task-driven RAG | `GenerationContextAssembler` builds queries from chapter goals and recalls notes. |
| Review / repair | Uses the chapter runtime package | The repairer reads writing context, review issues, and RAG fragments. |

## What each stage should recall

| Stage | Recall more of this | Do not let this dominate |
|---|---|---|
| Candidate directions | genre trends, reader expectation, book-analysis selling points, your explicit references | A reference work should not directly decide the new book’s main line. |
| World setup | world samples, setting documents, place / faction notes | Do not copy a world sample unchanged into the new book. |
| Character setup | this book’s direction, world boundaries, character-library experience | Do not only shell a reference-work character template. |
| Volume planning | book contract, story macro, settled character relationships | RAG can only support. It should not override volume-level promises. |
| Chapter detail | volume window, pacing beats, chapter range | External notes should not skip the beat sheet. |
| Chapter writing | current chapter task, this book’s facts, needed external notes, style rules | Do not recall a pile of unrelated notes and fill the context. |
| Review repair | prose, task sheet, review issues, this book’s constraints | Do not change this book’s facts because a reference note differs. |

## How a chapter RAG query is built

Chapter execution does not search notes with the chapter title alone. The system builds a query from the chapter task:

- novel title;
- chapter title;
- chapter goal;
- chapter expectation;
- what this chapter must advance;
- target conflict;
- appearing characters;
- structured outline.

These come from the chapter task sheet and context pack. The closer the query is to this chapter’s goal, the more likely recall hits useful notes.

## Vector search and text search

| Search method | Good for | Common problems |
|---|---|---|
| Vector search | Notes that are close in meaning but use different words, long documents, book-analysis conclusions | Cannot hit if the document is not indexed or the vector store is unavailable. |
| Text search | Person names, place names, proper nouns, fixed terms | May miss if you did not write the keywords clearly. |
| Hybrid recall | Need both meaning and keywords | Needs reasonable titles, chunking, and metadata. |

## Why chunking and metadata matter

Uploading a file to the knowledge library does not guarantee recall. Chunking, titles, summaries, and metadata affect hits:

| Information | Effect |
|---|---|
| Document title | Helps identify topic and source. |
| Chunk text | Decides vector meaning and text-search hits. |
| Facets | Makes filters for genre, selling points, character names, and chapter anchors more precise. |
| Source type | Distinguishes uploaded documents, published book analysis, world samples, and similar. |
| Document version | Avoids mixing notes with the same name. |

The longer the note, the more it needs a clear title and stable chunks. A million-word source without a reliable index will only show limited fragments to chapter execution.

## What to check when the knowledge library misses

1. Confirm the document uploaded successfully.
2. Confirm the index task finished.
3. Confirm Qdrant can connect.
4. Try a single-document recall test.
5. Check whether the title, summary, and key paragraphs contain character names, place names, and setting names.
6. Check whether the current chapter task actually needs this document.

:::warn More recall is not always better
Stuffing unrelated notes into context increases model noise. For a long novel, hitting the current chapter task accurately matters more than recalling a large pile of notes at once.
:::

## What to do when recall is too much

| What you see | Likely cause | Recommended handling |
|---|---|---|
| The chapter drifts into the reference work | Reference notes are weighted too high, or the task sheet is too weak | Strengthen the chapter task and this book’s facts; reduce reference recall. |
| The model retells a note summary | Recalled fragments are too long, or the writing goal is missing | Narrow the query; keep fragments related to this chapter’s conflict. |
| Character behavior feels like a reference character | Book-analysis character information was not turned into transferable rules | Use style / structure conclusions. Avoid recalling character details directly. |
| Proper names leak into the prose | Text search hit source-work names | Review and Anti-AI rules should catch name leaks. |
| Current setting is overridden by external notes | This book’s fact priority is unclear | Check whether this book’s state in the context pack is complete. |

## How style assets enter prose

The style engine enters chapter context through style binding. Chapter execution puts the bound style profile, transferable style rules, and Anti-AI constraints into the context package. After generation it also checks for leaked source-work names, places, titles, or signature beats.

Style assets are a good fit when:

- narrative voice is unstable;
- the AI flavor is too strong;
- chapter language does not match the target type;
- writing experience from a reference work needs to transfer.

Style assets are a poor fit for copying a reference work. They should extract transferable rules, not recreate proper names and signature beats.

## How book-analysis results are reused

After a book-analysis result is published to the knowledge library, later writing can recall it. Good reuse includes:

- genre selling points;
- character arcs;
- chapter pacing;
- reader expectation;
- world rules;
- writing traits.

When book-analysis conclusions enter later chapters, they should serve the current novel. They should not force a reference work’s plot into the new book.

## Debugging path

When someone says “the knowledge library did nothing,” check in this order:

| Step | Look at | Judgment |
|---|---|---|
| 1 | Does the document exist? | If not, it was not uploaded or was archived. |
| 2 | Index status | Do not expect vector recall before indexing finishes. |
| 3 | Single-document recall test | Can a clear keyword hit it? |
| 4 | Current chapter task | Does the task actually need this document? |
| 5 | Context pack | Did RAG fragments enter generation context? |
| 6 | Review report | Did a later review / repair suppress them because of a conflict? |

If single-document recall hits but chapter execution did not use it, the problem is usually the chapter-task query or context assembly. If single-document recall also misses, the problem is usually index, chunking, title, or keywords.

## Priority against chapter execution

| Conflict | Priority |
|---|---|
| RAG notes fight written chapters | Written chapters and the fact ledger win. |
| Style rules fight the chapter task | The chapter task wins. Style rules adjust expression. |
| Book-analysis conclusions fight this book’s characters | This book’s character state wins. |
| A world sample fights this book’s world | This book’s world wins. |
| Your current explicit instruction fights old notes | The current instruction can trigger a revision, but it needs to be saved before it lasts. |

RAG’s goal is to let the system know more. It is not to give external notes the highest decision power.

## Maintenance rule

When you add a note source that will enter chapter context, say whether it belongs to this book’s facts, planning assets, user notes, book-analysis conclusions, style assets, or temporary conversation. A source without a priority note can override this book’s facts during generation.

If a note source affects review or repair, also say its weight in quality judgment.
Then later recall diagnosis can tell whether notes are missing, excessive, or in the wrong priority.

## Asset loop

After chapter execution finishes, the system writes back new facts, character changes, foreshadowing state, and quality issues. When later chapters assemble context, they read that state.

The loop is:

1. Auto-Director prepares book-level, world, character, and chapter tasks.
2. Chapter execution reads those assets and RAG notes.
3. After prose generation, extract facts, character resources, and foreshadowing changes.
4. State commit and ledger sync write them back to the project.
5. The next chapter reads the new state and continues.

That is the core difference between a long-form production chain and one-off text generation.
