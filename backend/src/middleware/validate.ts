import { Request, Response, NextFunction } from "express";
import { ZodError, ZodSchema } from "zod";
import { AppError } from "./errorHandler";

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      // Schemas commonly validate only one request section (for example,
      // params before a later body validator). Do not erase sections that
      // this particular schema did not validate.
      if ("body" in parsed) req.body = parsed.body;
      if ("query" in parsed) Object.assign(req.query, parsed.query);
      if ("params" in parsed) Object.assign(req.params, parsed.params);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const message = err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
        next(new AppError(400, message));
        return;
      }
      next(err);
    }
  };
}
