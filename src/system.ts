// Copyright Felix Ungman. All rights reserved.
// Licensed under GNU General Public License version 3 or later.

export interface Player {
    playerId: string;
    playerName: string;
    playerIcon: string;
}

export interface Launcher  {
    snapshotId: string;
    lobbyId: string;
    matchId: string;
    allowCreateMatch: boolean;
    allowHostMatch: boolean;
}
