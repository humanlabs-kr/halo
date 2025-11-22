/**
 * Type definitions for the copyLocalesPlugin Vite plugin.
 */

export interface CopyLocalesPluginOptions {
  /**
   * Optional: Path to the target locales directory.
   * Defaults to "./public/locales" relative to the plugin file.
   */
  targetPath: string;
}

/**
 * Returns a Vite-compatible plugin that copies and watches the locales directory.
 */
export function copyLocalesPlugin(options: CopyLocalesPluginOptions): {
  name: string;
  buildStart(): void;
  buildEnd(): void;
};
