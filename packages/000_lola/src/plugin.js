import { copyFileSync, mkdirSync, readdirSync, statSync, watch } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function copyLocalesPlugin(options) {
  let watcher = null;

  return {
    name: "copy-locales",
    buildStart() {
      const sourcePath = path.resolve(__dirname, "../locales");
      const targetPath = options.targetPath;

      // Copy all files recursively
      function copyRecursive(src, dest) {
        const stats = statSync(src);

        if (stats.isDirectory()) {
          mkdirSync(dest, { recursive: true });
          const files = readdirSync(src);
          for (const file of files) {
            copyRecursive(path.join(src, file), path.join(dest, file));
          }
        } else {
          copyFileSync(src, dest);
        }
      }

      function syncFiles() {
        try {
          // Ensure target directory exists
          mkdirSync(targetPath, { recursive: true });
          copyRecursive(sourcePath, targetPath);
        } catch (error) {
          console.error(`❌ Failed to sync locales:`, error);
        }
      }

      // Initial sync
      syncFiles();

      // Set up file watcher
      try {
        watcher = watch(
          sourcePath,
          { recursive: true },
          (eventType, filename) => {
            if (filename) {
              syncFiles();
            }
          }
        );
        console.log(`👀 Watching for changes in ${sourcePath}`);
      } catch (error) {
        console.error(`❌ Failed to set up file watcher:`, error);
      }
    },

    buildEnd() {
      // Clean up watcher when build ends
      if (watcher) {
        watcher.close();
        watcher = null;
        console.log(`🛑 Stopped watching locale files`);
      }
    },
  };
}
