import jwt from "@tsndr/cloudflare-worker-jwt";

export type UserJWTPayload = {
  address: string;
  username: string;
  profilePictureUrl: string | null;
};

export async function getUserJWT(secret: string, data: UserJWTPayload) {
  return await jwt.sign({ ...data }, secret, { algorithm: "HS256" });
}
