import { Router } from "express";
import multer from "multer";
import JSZip from "jszip";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (
      file.mimetype === "application/zip" ||
      file.mimetype === "application/x-zip-compressed" ||
      file.originalname.endsWith(".zip")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only .zip files are accepted"));
    }
  },
});

const REPLIT_PATTERNS: RegExp[] = [
  /^\.replit$/,
  /^replit\.nix$/,
  /^\.breakpoints$/,
  /^\.cache\//,
  /^\.upm\//,
  /^\.config\/configstore\//,
  /^generated\//,
  /(?:^|\/)__pycache__\//,
  /^\.pythonlibs\//,
  /^\.local\/skills\//,
  /^\.local\/tasks\//,
  /^\.local\/session_plan\.md$/,
];

function isReplitFile(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  return REPLIT_PATTERNS.some((pattern) => pattern.test(normalized));
}

router.post("/strip", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  try {
    const inputZip = await JSZip.loadAsync(req.file.buffer);
    const outputZip = new JSZip();

    const fileEntries = Object.entries(inputZip.files);

    for (const [relativePath, zipEntry] of fileEntries) {
      if (zipEntry.dir) continue;

      let strippedPath = relativePath;
      const parts = strippedPath.split("/");
      if (parts.length > 1 && parts[0] !== "") {
        const firstDir = parts[0];
        const allPaths = fileEntries.map(([p]) => p);
        const allInSameDir = allPaths.every(
          (p) => p.startsWith(firstDir + "/") || p === firstDir + "/"
        );
        if (allInSameDir) {
          strippedPath = parts.slice(1).join("/");
        }
      }

      if (!strippedPath || isReplitFile(strippedPath)) {
        continue;
      }

      const content = await zipEntry.async("nodebuffer");
      outputZip.file(strippedPath, content);
    }

    const outputBuffer = await outputZip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    const originalName = req.file.originalname.replace(/\.zip$/i, "");
    const downloadName = `${originalName}_clean.zip`;

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${downloadName}"`
    );
    res.setHeader("Content-Length", outputBuffer.length);
    res.send(outputBuffer);
  } catch (err) {
    req.log.error({ err }, "Failed to process zip");
    res.status(500).json({ error: "Failed to process zip file" });
  }
});

export default router;
