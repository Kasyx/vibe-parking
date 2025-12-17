export interface Team {
  id: string
  name: string
}

export const TEAMS: Team[] = [
  { id: 'guacamole', name: 'Guacamole' },
  { id: 'hot-wings', name: 'Hot Wings' },
  { id: 'apitizers', name: 'Apitizers' },
  { id: 'pumpkin', name: 'Pumpkin' },
  { id: 'old-monk', name: 'Old Monk' },
  { id: 'piwo', name: 'Piwo' },
  { id: 'devops-platform', name: 'DevOps & Platform' },
]

export const TEAM_BY_ID: Record<string, Team> = Object.fromEntries(
  TEAMS.map((t) => [t.id, t]),
) as Record<string, Team>


