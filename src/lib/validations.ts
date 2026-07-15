import { z } from "zod";

export const createEndpointSchema = z.object({
  name: z.string().min(1).max(50),
});

export const updateEndpointSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  forwardUrl: z.string().url().nullable().optional(),
  autoForward: z.boolean().optional(),
  signingSecret: z.string().min(1).max(100).nullable().optional(),
});

export const replaySchema = z.object({
  targetUrl: z.string().url(),
});
