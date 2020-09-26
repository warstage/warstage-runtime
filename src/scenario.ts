// Copyright Felix Ungman. All rights reserved.
// Licensed under GNU General Public License version 3 or later.

import {ObjectRef, Value} from './object';
import {Federation} from './federation';

export interface Scenario {
    getParams(): Value;

    startup(playerId: string, match: ObjectRef, lobbyFederation: Federation, battleFederation: Federation);

    shutdown();
}
