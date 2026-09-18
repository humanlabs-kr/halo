import { createDb } from '@halo/database';
import { HaloRaffleService } from '../lib/halo-raffle';
import { RaffleService } from '../lib/raffle';

/**
 * Cron jobs, keyed by the exact expression in `wrangler.jsonc`.
 *
 * Cloudflare passes the expression through verbatim, so the keys here have to
 * match character for character — a reformatted expression silently registers
 * nothing. Keep this in sync with `triggers.crons`, which currently holds one
 * entry.
 *
 * `env` is a parameter rather than a `cloudflare:workers` import so the same
 * tasks can be run on demand from `/v1/admin/run-scheduled-task`, which has the
 * request's env, and so a missing binding is a type error rather than a
 * midnight surprise.
 */
export interface ScheduledTask {
  title: string;
  action: (env: Env, scheduledTime: number) => Promise<void>;
}

export const ScheduledActions: Record<string, ScheduledTask[]> = {
  // Midnight UTC: settle yesterday's raffle pools and open today's. Closing
  // first matters — creating first would leave two open pools for the same day
  // and the close pass would settle the brand new one.
  '0 0 * * *': [
    {
      title: 'Roll over World raffle pools',
      action: async (env) => {
        const db = createDb(env.HYPERDRIVE.connectionString);
        await RaffleService.closeRafflePools(db, env);
        await RaffleService.createNewRafflePools(db, env.PROJECT_ENV);
      },
    },
    {
      title: 'Roll over Halo raffle pools (Celo)',
      action: async (env) => {
        const db = createDb(env.HYPERDRIVE.connectionString);
        await HaloRaffleService.closeRafflePools(db, 'celo');
        await HaloRaffleService.createNewRafflePools(db, 'celo', env.PROJECT_ENV);
      },
    },
  ],
};
