import { pad } from "viem";

export function uuidToBytes32(uuid: string): `0x${string}` {
  const hex = `0x${uuid.replace(/-/g, "")}`;
  return pad(hex as `0x${string}`, { size: 32 }) as `0x${string}`;
}

export function bytes32ToUuid(bytes32: `0x${string}`): string {
  return bytes32.slice(2).toLowerCase();
}
