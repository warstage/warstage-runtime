// Copyright Felix Ungman. All rights reserved.
// Licensed under GNU General Public License version 3 or later.

import {ObjectRef} from './object';

export interface Player extends ObjectRef {
    playerId: string;
    playerName: string;
    playerIcon: string;
}

export interface LauncherState  {
    lobbyId: string;
    matchId: string;
    allowCreateMatch: boolean;
    allowHostMatch: boolean;
}

export interface Launcher extends LauncherState, ObjectRef {
}
