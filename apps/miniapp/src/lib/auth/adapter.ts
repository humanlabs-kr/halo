import type { Platform } from '@halo/contracts';
import { celoAdapter } from './celo';
import { kaiaAdapter } from './kaia';
import { worldAdapter } from './world';
import type { AuthAdapter } from './types';

/** The one place platform choice turns into platform behaviour. */
export function getAuthAdapter(platform: Platform): AuthAdapter {
  switch (platform) {
    case 'world':
      return worldAdapter;
    case 'celo':
      return celoAdapter;
    case 'kaia':
      return kaiaAdapter;
  }
}

export { AuthError } from './types';
export type { AuthAdapter, AuthChallenge, AuthErrorKind } from './types';
