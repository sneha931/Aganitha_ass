
import type { Request,Response } from "express";
import prisma from "../config/prismaconfig.js";
import Logger from "../logger.js";
export const healthcheck=async(req:Request,res:Response)=>{


    try {
       
        await prisma.$queryRaw`SELECT 1`;
    
        Logger.info("[HEALTHCHECK] Database connection OK");
    
        return res.status(200).json({ ok: true });
      } catch (error) {
        Logger.error("[HEALTHCHECK] Database connection FAILED", error);
    
        return res.status(500).json({ ok: false });
      }
}

export const createPaste =async(req:Request,res:Response)=>{
  try{

    Logger.info("[CREATE_PASTE] Request received", req.body);
    const { content, ttl_seconds, max_views } = req.body;
    
    // Validate content (required, non-empty string)
    if (!content || typeof content !== "string" || content.trim().length === 0) {
      Logger.warn("[CREATE_PASTE] Invalid content");
      return res.status(400).json({ error: "content must be a non-empty string" });
    }

    // Validate and convert ttl_seconds (optional, integer >= 1)
    let ttlNum: number | null = null;
    if (ttl_seconds !== undefined && ttl_seconds !== null) {
      ttlNum = Number(ttl_seconds);
      if (!Number.isInteger(ttlNum) || ttlNum < 1 || isNaN(ttlNum)) {
        Logger.warn("[CREATE_PASTE] Invalid ttl_seconds");
        return res.status(400).json({ error: "ttl_seconds must be an integer >= 1" });
      }
    }

    // Validate and convert max_views (optional, integer >= 1)
    let maxViewsNum: number | null = null;
    if (max_views !== undefined && max_views !== null) {
      maxViewsNum = Number(max_views);
      if (!Number.isInteger(maxViewsNum) || maxViewsNum < 1 || isNaN(maxViewsNum)) {
        Logger.warn("[CREATE_PASTE] Invalid max_views");
        return res.status(400).json({ error: "max_views must be an integer >= 1" });
      }
    }

    // Calculate expiresAt from ttl_seconds
    let expiresAt: Date | null = null;
    if (ttlNum !== null) {
      expiresAt = new Date(Date.now() + ttlNum * 1000);
    }

    
    const paste = await prisma.paste.create({
      data: {
        content,
        expiresAt,
        maxViews: maxViewsNum,
      },
    });

    // Determine base URL based on NODE_ENV
    let baseUrl: string;
    if (process.env.NODE_ENV === "production") {
      // In production, use BASE_URL from environment or fallback to request-based URL
      baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
    } else {
      // In development, use localhost with PORT from environment
      const port = process.env.PORT || 8000;
      baseUrl = `http://localhost:${port}`;
    }

    Logger.info("[CREATE_PASTE] Paste created successfully", { id: paste.id });

    return res.status(201).json({
      id: paste.id,
      url: `${baseUrl}/p/${paste.id}`,
    });
  }
  catch(error){

    Logger.error("[CREATE_PASTE] Error creating paste", error);
    return res.status(500).json({ error: "Internal server error" });


  }
}

// Helper function to escape HTML entities for safe rendering
const escapeHtml = (text: string): string => {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char] || char);
};

export const getPaste = async (req: Request, res: Response) => {
  try {
    const pasteId = req.params.id;

    // Validate id parameter
    if (!pasteId || typeof pasteId !== "string") {
      Logger.warn("[GET_PASTE] Invalid id parameter");
      return res.status(400).json({ error: "Invalid paste ID" });
    }

    Logger.info("[GET_PASTE] Request received", { id: pasteId });

    // Fetch paste from database
    const paste = await prisma.paste.findUnique({
      where: { id: pasteId },
    });

    // Check if paste exists
    if (!paste) {
      Logger.warn("[GET_PASTE] Paste not found", { id: pasteId });
      return res.status(404).json({ error: "Paste not found" });
    }

    const now = new Date();

    // Check if paste is expired
    if (paste.expiresAt && paste.expiresAt < now) {
      Logger.warn("[GET_PASTE] Paste expired", { id: pasteId, expiresAt: paste.expiresAt });
      return res.status(404).json({ error: "Paste expired" });
    }

    // Check if view limit exceeded
    if (paste.maxViews !== null && paste.views >= paste.maxViews) {
      Logger.warn("[GET_PASTE] View limit exceeded", { 
        id: pasteId, 
        views: paste.views, 
        maxViews: paste.maxViews 
      });
      return res.status(404).json({ error: "View limit exceeded" });
    }

    // Increment view count
    const updatedPaste = await prisma.paste.update({
      where: { id: pasteId },
      data: {
        views: {
          increment: 1,
        },
      },
    });

    // Calculate remaining views (null if unlimited)
    const remainingViews = updatedPaste.maxViews !== null 
      ? Math.max(0, updatedPaste.maxViews - updatedPaste.views)
      : null;

    Logger.info("[GET_PASTE] Paste retrieved successfully", { id: pasteId });

    return res.status(200).json({
      content: updatedPaste.content,
      remaining_views: remainingViews,
      expires_at: updatedPaste.expiresAt ? updatedPaste.expiresAt.toISOString() : null,
    });
  } catch (error) {
    Logger.error("[GET_PASTE] Error retrieving paste", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

export const viewPaste = async (req: Request, res: Response) => {
  try {
    const pasteId = req.params.id;

    // Validate id parameter
    if (!pasteId || typeof pasteId !== "string") {
      Logger.warn("[VIEW_PASTE] Invalid id parameter");
      return res.status(404).send("Paste not found");
    }

    Logger.info("[VIEW_PASTE] Request received", { id: pasteId });

    // Fetch paste from database
    const paste = await prisma.paste.findUnique({
      where: { id: pasteId },
    });

    // Check if paste exists
    if (!paste) {
      Logger.warn("[VIEW_PASTE] Paste not found", { id: pasteId });
      return res.status(404).send("Paste not found");
    }

    const now = new Date();

    // Check if paste is expired
    if (paste.expiresAt && paste.expiresAt < now) {
      Logger.warn("[VIEW_PASTE] Paste expired", { id: pasteId, expiresAt: paste.expiresAt });
      return res.status(404).send("Paste not found");
    }

    // Check if view limit exceeded
    if (paste.maxViews !== null && paste.views >= paste.maxViews) {
      Logger.warn("[VIEW_PASTE] View limit exceeded", { 
        id: pasteId, 
        views: paste.views, 
        maxViews: paste.maxViews 
      });
      return res.status(404).send("Paste not found");
    }

    // Increment view count
    const updatedPaste = await prisma.paste.update({
      where: { id: pasteId },
      data: {
        views: {
          increment: 1,
        },
      },
    });

    // Escape HTML entities to prevent XSS attacks
    const safeContent = escapeHtml(updatedPaste.content);

    // Generate HTML response with safe content
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Paste ${pasteId}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background-color: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        pre {
            background-color: #f8f8f8;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            padding: 15px;
            overflow-x: auto;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
    </style>
</head>
<body>
    <div class="container">
        <pre>${safeContent}</pre>
    </div>
</body>
</html>`;

    Logger.info("[VIEW_PASTE] Paste viewed successfully", { id: pasteId });

    return res.status(200).setHeader("Content-Type", "text/html").send(html);
  } catch (error) {
    Logger.error("[VIEW_PASTE] Error viewing paste", error);
    return res.status(404).send("Paste not found");
  }
};