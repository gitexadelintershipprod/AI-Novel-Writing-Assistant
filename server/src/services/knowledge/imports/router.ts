import { Router } from "express";
import { z } from "zod";
import { AppError } from "../../../middleware/errorHandler";
import { KnowledgeImportService } from "./KnowledgeImportService";

const router = Router();
const service = new KnowledgeImportService();
const fileSchema = z.object({
  key: z.string().min(1).max(200),
  fileName: z.string().min(1).max(255),
  relativePath: z.string().min(1).max(2048),
  byteSize: z.number().int().positive().max(10 * 1024 * 1024),
  contentHash: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new AppError("Invalid import request. Check file format, size, and selected IDs.", 400);
  return result.data;
}
const selection = z.object({ itemIds: z.array(z.string().min(1)).max(1000) }).strict();
const pagination = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(50) });
router.get("/", async (req, res, next) => {
  try { const p = parse(pagination, req.query); res.json({ success: true, data: await service.listBatches(p.page, p.pageSize) }); } catch (e) { next(e); }
});
router.post("/", async (req, res, next) => {
  try { const body = parse(z.object({ name: z.string().trim().min(1).max(200) }).strict(), req.body); res.status(201).json({ success: true, data: await service.createBatch(body.name) }); } catch (e) { next(e); }
});
router.get("/:batchId", async (req, res, next) => {
  try { const p = parse(pagination, req.query); res.json({ success: true, data: await service.detail(req.params.batchId, p.page, p.pageSize) }); } catch (e) { next(e); }
});
router.post("/:batchId/prepare", async (req, res, next) => {
  try { const body = parse(z.object({ files: z.array(fileSchema).min(1).max(1000) }).strict(), req.body); res.json({ success: true, data: await service.prepare(req.params.batchId, body.files) }); } catch (e) { next(e); }
});
router.post("/:batchId/items/:itemId/upload", async (req, res, next) => {
  try { const body = parse(z.object({ content: z.string().min(1) }).strict(), req.body); res.json({ success: true, data: await service.upload(req.params.batchId, req.params.itemId, body.content) }); } catch (e) { next(e); }
});
router.post("/:batchId/queue", async (req, res, next) => {
  try { const body = parse(selection, req.body); res.json({ success: true, data: await service.enqueue(req.params.batchId, body.itemIds) }); } catch (e) { next(e); }
});
router.post("/:batchId/pause", async (req, res, next) => {
  try { const body = parse(z.object({ paused: z.boolean() }).strict(), req.body); res.json({ success: true, data: await service.setPaused(req.params.batchId, body.paused) }); } catch (e) { next(e); }
});
router.post("/:batchId/retry", async (req, res, next) => {
  try { const body = parse(selection.partial(), req.body); res.json({ success: true, data: await service.enqueue(req.params.batchId, body.itemIds ?? [], true) }); } catch (e) { next(e); }
});
export default router;
