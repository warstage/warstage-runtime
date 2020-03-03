// Copyright Felix Ungman. All rights reserved.
// Licensed under GNU General Public License version 3 or later.

import {ObjectRef} from './object';

export interface Player extends ObjectRef {
    playerId: string;
    playerName: string;
    playerIcon: string;
}

export interface Launcher extends ObjectRef {
    lobbyId: string;
}
