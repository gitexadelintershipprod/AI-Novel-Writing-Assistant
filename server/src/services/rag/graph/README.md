# Knowledge graph layer

This folder owns the Neo4j book graph that sits beside Qdrant.

- Qdrant still stores passage vectors for English knowledge documents.
- Neo4j stores people, places, themes, techniques, and one-hop links, each tied to a `KnowledgeChunk` id.
- Only `knowledge_document` owners that look English are written. Georgian novel memory stays out of the graph.
- Graph sync is a separate `graph_sync` job after vector upsert. A Neo4j or extraction failure must not mark the document index as failed.
- Retrieval fail-opens: an empty graph list is fused with vector and keyword results.

Settings live on the knowledge-base RAG card (`rag.graphEnabled`, `rag.neo4jUri`, credentials). Compose starts a `neo4j` container next to `qdrant`.
