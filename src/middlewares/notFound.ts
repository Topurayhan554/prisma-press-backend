import { Request, Response } from "express";
import path from "node:path";

export const notFound = (req: Request, res: Response) => {
  res.status(404).json({
    message: "Route not found",
    path: req.originalUrl,
  });
};
