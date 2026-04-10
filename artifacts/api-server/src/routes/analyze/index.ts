import { Router, type IRouter } from "express";
import multer from "multer";
import { extractTextFromPdf } from "../../lib/pdf-parser";
import {
  getProvider,
  getAllProviders,
  getCurrentProviderId,
} from "../../lib/ai-providers";

const router: IRouter = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are accepted"));
    }
  },
});

router.post("/analyze-report", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  req.log.info(
    { fileName: req.file.originalname, size: req.file.size },
    "Received PDF for analysis",
  );

  const pdfText = await extractTextFromPdf(req.file.buffer);

  if (!pdfText || pdfText.trim().length === 0) {
    res
      .status(400)
      .json({ error: "Could not extract text from PDF", details: "The PDF appears to be empty or image-based" });
    return;
  }

  req.log.info({ textLength: pdfText.length }, "Text extracted, sending to AI");

  const provider = getProvider();
  const result = await provider.analyzeReport(pdfText);

  req.log.info(
    { biomarkerCount: result.biomarkers.length, provider: result.aiProvider },
    "Analysis complete",
  );

  res.json(result);
});

router.get("/ai-providers", (_req, res) => {
  res.json({
    providers: getAllProviders(),
    currentProvider: getCurrentProviderId(),
  });
});

export default router;
