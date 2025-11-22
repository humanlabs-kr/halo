export const getPrivateKeyIdentifier = (privateKey: `0x${string}`) => {
  return privateKey.slice(0, 6) + "..." + privateKey.slice(-4);
};

export const getRedactedPublicAddress = (publicAddress: string) => {
  return publicAddress.slice(0, 6) + "..." + publicAddress.slice(-4);
};
