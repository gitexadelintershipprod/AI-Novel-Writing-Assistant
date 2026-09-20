/**
 * Comic export service.
 *
 * 1. Per episode, vertically stitch all lettered (preferred) or raw panel images.
 * 2. Slice to platform spec (configurable; default 800px width, no height cap for a single long image).
 * 3. Persist artifacts and a ComicExportJob record.
 *
 * Depends on sharp (already installed).
 */
import fs from "fs/promises";
import path from "path";
import sharp from "sharp";
import { prisma } from "../../db/prisma";
import { AppError } from "../../middleware/errorHandler";
import { resolveGeneratedImagesRoot } from "../../runtime/appPaths";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExportFormat = "long_image" | "sliced";

export interface ExportSpec {
  /** Slice target width (pixels, default 800). */
  sliceWidth?: number;
  /** Max height per slice (pixels; 0 = no slicing, one long image). */
  sliceMaxHeight?: number;
  /** Output format. */
  outputFormat?: "png" | "jpg" | "webp";
  /** jpg/webp quality (1-100). */
  quality?: number;
}

export interface ExportArtifact {
  index?: number;
  filePath: string;
  url: string;
  width: number;
  height: number;
}

export interface ExportJobResult {
  jobId: string;
  artifacts: ExportArtifact[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EXPORT_DIR = "comic-exports";

function exportJobDir(jobId: string): string {
  return path.join(resolveGeneratedImagesRoot(), EXPORT_DIR, jobId);
}

function exportArtifactUrl(jobId: string, filename: string): string {
  return `/api/comic/export-jobs/${jobId}/artifacts/${filename}`;
}

async function findPanelImageBuffer(panelId: string, preferLettered = true): Promise<Buffer | null> {
  const base = resolveGeneratedImagesRoot();
  if (preferLettered) {
    const letteredPath = path.join(base, "comic-panels-lettered", panelId, "lettered.png");
    try { return await fs.readFile(letteredPath); } catch { /* fall through */ }
  }
  const rawDir = path.join(base, "comic-panels", panelId);
  try {
    const entries = await fs.readdir(rawDir);
    const file = entries.find((f) => /^panel\.(png|jpg|webp)$/i.test(f));
    if (file) return fs.readFile(path.join(rawDir, file));
  } catch { /* fall through */ }
  return null;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class ComicExportService {
  /**
   * Export one episode as a long image (optionally sliced).
   * Skip panels that have no image (export the usable portion).
   */
  async exportEpisode(
    episodeId: string,
    format: ExportFormat = "long_image",
    spec: ExportSpec = {},
  ): Promise<ExportJobResult> {
    const episode = await prisma.comicEpisode.findUnique({
      where: { id: episodeId },
      include: {
        panels: { orderBy: { order: "asc" } },
        project: { select: { id: true } },
      },
    });
    if (!episode) throw new AppError(`Comic episode not found: ${episodeId}`, 404);
    if (episode.panels.length === 0) {
      throw new AppError("This episode has no panels yet. Generate the panel script and images first.", 400);
    }

    // Create the export job record.
    const job = await prisma.comicExportJob.create({
      data: {
        projectId: episode.projectId,
        episodeId,
        format,
        spec: JSON.stringify(spec),
        status: "processing",
      },
    });

    const jobDir = exportJobDir(job.id);
    await fs.mkdir(jobDir, { recursive: true });

    try {
      const outputFmt = spec.outputFormat ?? "png";
      const quality = spec.quality ?? 90;
      const targetWidth = spec.sliceWidth ?? 800;

      // Collect all panel images.
      const panelBuffers: Buffer[] = [];
      for (const panel of episode.panels) {
        const buf = await findPanelImageBuffer(panel.id);
        if (buf) panelBuffers.push(buf);
      }
      if (panelBuffers.length === 0) {
        throw new AppError("No panel image is available (generate images first).", 400);
      }

      // Normalize width and stitch vertically.
      const resizedBuffers = await Promise.all(
        panelBuffers.map((buf) =>
          sharp(buf).resize({ width: targetWidth, withoutEnlargement: false }).toBuffer(),
        ),
      );

      // Read each panel height so the canvas total height can be computed.
      const heights = await Promise.all(
        resizedBuffers.map(async (buf) => {
          const meta = await sharp(buf).metadata();
          return meta.height ?? 0;
        }),
      );
      const totalHeight = heights.reduce((s, h) => s + h, 0);

      // Vertically stitch with sharp composite (extend + composite).
      const composites: Array<{ input: Buffer; top: number; left: number }> = [];
      let yOffset = 0;
      for (let i = 0; i < resizedBuffers.length; i++) {
        composites.push({ input: resizedBuffers[i], top: yOffset, left: 0 });
        yOffset += heights[i];
      }

      let longImageBase = sharp({
        create: { width: targetWidth, height: totalHeight, channels: 3, background: { r: 255, g: 255, b: 255 } },
      }).composite(composites);

      const applyQuality = (s: sharp.Sharp): sharp.Sharp => {
        if (outputFmt === "jpg") return s.jpeg({ quality });
        if (outputFmt === "webp") return s.webp({ quality });
        return s.png();
      };

      const artifacts: ExportArtifact[] = [];

      const maxHeight = spec.sliceMaxHeight ?? 0;
      if (format === "sliced" && maxHeight > 0 && totalHeight > maxHeight) {
        // Slice: render the full long image in memory, then cut by height.
        const longBuffer = await applyQuality(longImageBase).toBuffer();
        const sliceCount = Math.ceil(totalHeight / maxHeight);
        for (let s = 0; s < sliceCount; s++) {
          const sliceTop = s * maxHeight;
          const sliceHeight = Math.min(maxHeight, totalHeight - sliceTop);
          const sliceBuf = await applyQuality(
            sharp(longBuffer).extract({ left: 0, top: sliceTop, width: targetWidth, height: sliceHeight }),
          ).toBuffer();
          const filename = `slice-${String(s + 1).padStart(3, "0")}.${outputFmt === "jpg" ? "jpg" : outputFmt}`;
          const filePath = path.join(jobDir, filename);
          await fs.writeFile(filePath, sliceBuf);
          artifacts.push({ index: s + 1, filePath, url: exportArtifactUrl(job.id, filename), width: targetWidth, height: sliceHeight });
        }
      } else {
        // Single long image.
        const ext = outputFmt === "jpg" ? "jpg" : outputFmt;
        const filename = `episode-${episode.order}.${ext}`;
        const filePath = path.join(jobDir, filename);
        await applyQuality(longImageBase).toFile(filePath);
        artifacts.push({ filePath, url: exportArtifactUrl(job.id, filename), width: targetWidth, height: totalHeight });
      }

      await prisma.comicExportJob.update({
        where: { id: job.id },
        data: { status: "done", artifacts: JSON.stringify(artifacts) },
      });

      return { jobId: job.id, artifacts };
    } catch (err) {
      await prisma.comicExportJob.update({
        where: { id: job.id },
        data: { status: "error", artifacts: JSON.stringify({ error: String(err) }) },
      });
      throw err;
    }
  }

  async getExportJob(jobId: string) {
    return prisma.comicExportJob.findUnique({ where: { id: jobId } });
  }

  async listExportJobs(projectId: string) {
    return prisma.comicExportJob.findMany({
      where: { projectId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  /** Read an export artifact for an HTTP streaming response. */
  async getArtifactFile(jobId: string, filename: string): Promise<{ buffer: Buffer; ext: string } | null> {
    const safeFilename = path.basename(filename); // Prevent directory traversal.
    const filePath = path.join(exportJobDir(jobId), safeFilename);
    try {
      const buffer = await fs.readFile(filePath);
      const ext = path.extname(safeFilename).replace(".", "").toLowerCase();
      return { buffer, ext };
    } catch {
      return null;
    }
  }
}

export const comicExportService = new ComicExportService();
