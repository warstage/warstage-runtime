// Copyright Felix Ungman. All rights reserved.
// Licensed under GNU General Public License version 3 or later.

import {Payload} from './messages';

export interface RuntimeConnection {
    onOpen(callback: () => void): void;
    onClose(callback: () => void): void;
    onPacket(callback: (Payload) => void): void;
    open();
    close();
    shutdown(); // for debugging only
    sendPacket(payload: Payload);
}
