import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const distDir = join(process.cwd(), "dist");
const jsFile = join(distDir, "nsdk.js");
const cssFile = join(distDir, "nsdk.css");

try {
  // Read CSS content
  const cssUrl = `https://${process.env.VITE_NOTIFICATION_DOMAIN}/nsdk.css`;

  // Read JS content
  let jsContent = readFileSync(jsFile, "utf8");

  // Inject CSS at the beginning of the JS file
  const cssInjection = `
// Injected CSS
(function() {
  if (document.getElementById('notification-sdk-link')) return;
  const link = document.createElement('link');
  link.id = 'notification-sdk-link';
  link.rel = 'stylesheet';
  link.href = '${cssUrl}';
  document.head.appendChild(link);
})();

`;

  // Insert CSS injection at the beginning
  jsContent = cssInjection + jsContent;

  // Write the updated JS file
  writeFileSync(jsFile, jsContent);

  console.log("✅ CSS successfully inlined into JavaScript file");
  console.log("📁 CSS file can now be deleted");
} catch (error) {
  console.error("❌ Error inlining CSS:", error.message);
  process.exit(1);
}
