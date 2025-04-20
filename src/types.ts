import { DateTime, Str } from "chanfana";
import { z } from "zod";

export const ScriptMetadata = z.object({
  name: Str({ example: "Script Name" }),
  creator: Str({ example: "Creator Name" }).optional(),
  supportUrl: Str({ example: "https://creator.com/support" }).url().optional(),
  isDefault: z.boolean().default(false),
  lastUpdated: DateTime({ required: false }),
});

export type ScriptMetadataType = z.infer<typeof ScriptMetadata>;

export interface Env {
  IVE_SCRIPTS: KVNamespace;
  API_KEY: string;
}
