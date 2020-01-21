// Copyright Felix Ungman. All rights reserved.
// Licensed under GNU General Public License version 3 or later.

import {RuntimeConnection} from './runtime-connection';
import {ProcessType} from './messages';
import {generateObjectId} from './object-id';
import {WebSocketConnection} from './websocket-connection';
import {EmbeddedConnection} from './embedded-connection';


export class RuntimeConfiguration {
    newConnection: () => RuntimeConnection;
    processType: ProcessType;
    processId: string;
    subjectId: string;

    static autoDetect(): RuntimeConfiguration {
        const result = new RuntimeConfiguration();
        const params = new URLSearchParams(document.location.search.substring(1));
        const connect = params.get('connect');
        if (connect) {
            result.newConnection = () => new WebSocketConnection(connect);
            result.processType = ProcessType.Agent;
        } else {
            result.newConnection = () => new EmbeddedConnection();
            result.processType = ProcessType.Module;
        }
        const pt = params.get('pt');
        if (pt) {
            result.processType = Number(pt);
        }
        result.processId = params.get('pid') || generateObjectId();
        result.subjectId = params.get('sub');
        return result;
    }
}
