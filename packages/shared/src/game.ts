import { Players, Team } from "./players"

export type Game = {
    teams: [Team, Team],
    playerOrder: Players
}
