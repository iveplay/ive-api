import { DateTime, Str } from "chanfana";
import { z } from "zod";

export const ScriptMetadata = z.object({
  name: Str({ example: "Script Name" }),
  creator: Str({ example: "Creator Name" }),
  supportUrl: Str({ example: "https://creator.com/support" }),
  isDefault: z.boolean().default(false),
  lastUpdated: DateTime({ required: false }),
});

export type ScriptMetadataType = z.infer<typeof ScriptMetadata>;
