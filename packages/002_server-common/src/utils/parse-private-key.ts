export async function parsePrivateKey(
  privateKeyArrayString: string
): Promise<`0x${string}`[]> {
  try {
    return JSON.parse(privateKeyArrayString) as `0x${string}`[];
  } catch (error) {
    // Handle case where input is a raw array string, not JSON
    // e.g. [0xabc,0xdef,...] (no quotes)
    const trimmed = privateKeyArrayString.trim();
    // Check if it looks like an array of 0x... without quotes
    if (
      trimmed.startsWith("[") &&
      trimmed.endsWith("]") &&
      trimmed.includes("0x") &&
      !trimmed.includes('"')
    ) {
      // Remove brackets and split by comma
      const arr = trimmed
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => (s.startsWith("0x") ? s : `0x${s}`)) as `0x${string}`[];
      return arr;
    }
    // If still error, throw
    throw new Error("Failed to parse private key array: " + error);
  }
}
