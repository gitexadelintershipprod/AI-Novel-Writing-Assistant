# Character Conversation Subject Adapters

These adapters project character material from different sources into a shared `CharacterSubjectProjection` and compact Prompt context. They are pure functions: the upper layer owns auth, reads, and session persistence. Adapters do not import Prisma and do not access or write the database directly.

## Boundary

- `BaseCharacterSubjectAdapter` uses only stable settings from the basic character library. Policy is fixed at `read_only`; it does not invent a current situation inside the novel.
- `BookAnalysisCharacterSubjectAdapter` must receive `analysisId`, `characterId`, and a positive-integer `chapterAnchor`. Only evidence that has a chapter number and is not later than the anchor may enter the projection or Prompt. Profiles, scenes, and arcs that cannot be fully proven to precede the anchor are always excluded.
- When book-analysis material is insufficient, keep the boundary text “cannot be confirmed from the source”. Do not fill character secrets, motives, or later plot from chapter-less summaries in a character dossier.

Later sources should implement `CharacterSubjectAdapter<TInput>` and keep the rule “unify the interaction protocol, do not unify the fact source”.
