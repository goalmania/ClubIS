// Numero massimo di club che un account può possedere (come titolare:
// presidente o segretario) in base al piano di abbonamento.
// starter = Base (1 club) · pro = Multi-club (fino a 5 club) · elite = Multi-club Max (illimitato)
export const CLUB_CAP_BY_TIER: Record<string, number> = {
  starter: 1,
  pro: 5,
  elite: Infinity,
}

export function clubCapFor(tier: string | null | undefined): number {
  return CLUB_CAP_BY_TIER[tier ?? 'pro'] ?? CLUB_CAP_BY_TIER.pro
}
