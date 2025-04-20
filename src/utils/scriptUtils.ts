import { ScriptMetadataType } from "../types";

/**
 * Ensures there's a default script in the collection
 * If a script is marked as default, it removes default from others
 * If no script is marked as default, it sets the first one as default
 */
export async function ensureDefaultScript(
  kv: KVNamespace,
  videoUrl: string,
  scripts: Record<string, ScriptMetadataType>,
  defaultScriptUrl?: string
): Promise<Record<string, ScriptMetadataType>> {
  let modified = false;

  // If a specific script is set as default, ensure only it is marked as default
  if (defaultScriptUrl && scripts[defaultScriptUrl]) {
    Object.keys(scripts).forEach((url) => {
      if (url === defaultScriptUrl && !scripts[url].isDefault) {
        scripts[url].isDefault = true;
        modified = true;
      } else if (url !== defaultScriptUrl && scripts[url].isDefault) {
        scripts[url].isDefault = false;
        modified = true;
      }
    });
  }

  // If no script is marked as default, set the first one
  const hasDefault = Object.values(scripts).some((script) => script.isDefault);
  if (!hasDefault && Object.keys(scripts).length > 0) {
    const firstScriptUrl = Object.keys(scripts)[0];
    scripts[firstScriptUrl].isDefault = true;
    modified = true;
  }

  // Save changes if needed
  if (modified) {
    await kv.put(videoUrl, JSON.stringify(scripts));
  }

  return scripts;
}

/**
 * Gets scripts for a video URL, returns null if none found
 */
export async function getScriptsForVideo(
  kv: KVNamespace,
  videoUrl: string
): Promise<Record<string, ScriptMetadataType> | null> {
  const existingData = await kv.get(videoUrl);
  if (!existingData) {
    return null;
  }

  try {
    return JSON.parse(existingData);
  } catch (error) {
    console.error(`Error parsing scripts for ${videoUrl}:`, error);
    return null;
  }
}

/**
 * Validates the script URL format
 */
export function isValidScriptUrl(url: string): boolean {
  try {
    new URL(url);
    return url.endsWith(".funscript") || url.endsWith(".csv");
  } catch {
    return false;
  }
}

/**
 * Validates the video URL format
 */
export function isValidVideoUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
