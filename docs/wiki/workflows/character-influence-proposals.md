# Character influence proposals: replaced by the character dialogue layer

## Background

The scheme recorded on this page — AI generates several candidate directions and the author picks one — is no longer the product direction. It reduces the character to configurable plot options and cannot express resistance, misunderstanding, concealment, or independent judgment in conversation.

## Current Rule

New work uses [Character dialogue layer](./character-dialogue-layer.md). The author talks with the character in natural language. The character replies from mind-line, hard facts, relationships, resources, and information boundary. A single soft influence formed by the dialogue is carried into later writing only if the author chooses that, not by selecting among multiple plot suggestions.

The old `CharacterInfluenceProposal` table remains in migration history so already-deployed databases stay compatible. New workspaces, runtime context, and chapter uptake no longer consume it. Do not add product behavior on that table.
