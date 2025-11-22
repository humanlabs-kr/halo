export async function computeHMAC(message: string, secret: string) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(message);

  // Import the key
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  // Sign the message
  const signature = await crypto.subtle.sign("HMAC", key, messageData);

  // Convert to hex
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function getUserByUsername(username: string) {
  const res = await fetch(
    `https://usernames.worldcoin.org/api/v1/${username}`,
    {
      method: "GET",
      headers: {
        "User-Agent": "Cloudflare-Worker",
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    console.error(
      `Failed to get user by username ${username}: ${await res.text()}`
    );
    return null;
  }

  const user = await res.json();

  return {
    walletAddress: user.address,
    username: user.username,
    profilePictureUrl: user.profile_picture_url,
  } as {
    walletAddress: string;
    username?: string;
    profilePictureUrl?: string;
  };
}

export async function getUserByAddress(address: string) {
  const response = await fetch("https://usernames.worldcoin.org/api/v1/query", {
    method: "POST",
    headers: {
      "User-Agent": "Cloudflare-Worker",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      addresses: [address],
    }),
  });

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`);
  }

  const data = (await response.json()) as {
    address: string;
    username?: string;
    profile_picture_url: string;
  }[];

  return data.at(0);
}
