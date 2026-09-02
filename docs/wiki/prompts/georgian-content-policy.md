# Georgian content policy

The product uses two separate language layers:

1. The React and Electron interface is English.
2. Creative and analytical model output is Georgian (`ka-GE`).

All active creative prompt assets declare `language: "ka"`. The central prompt runner injects one shared language policy, so an individual prompt cannot silently fall back to Chinese output. The policy is applied to planning, characters, worlds, chapters, review and repair, short stories, title and style tools, Creative Hub, Book Analysis/RAG, comics, and drama.

English control instructions are intentional. They tell the model to return Georgian prose while preserving machine contracts such as JSON keys, enum values, IDs, and schemas. Image-provider visual prompts are also intentionally English when that improves provider compatibility; textual creative results are not exempt.

Market Radar is disabled and its Chinese-source prompt family is the only source-specific exception. Technical JSON repair, connectivity checks, protocol aliases, and compatibility parsers may also retain non-Georgian values when changing them would break an interface.

The regression boundary is enforced by `pnpm check:georgian-content`. A new active prompt with Han text, a Chinese-output instruction, Chinese-character length semantics, or a non-`ka` language declaration fails the check unless it has an exact documented compatibility exception.
