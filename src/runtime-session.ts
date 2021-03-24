// Copyright Felix Ungman. All rights reserved.
// Licensed under GNU General Public License version 3 or later.

import {Value} from 'warstage-entities';

export abstract class RuntimeSession {
    abstract sendObjectChangesToRuntime(
        federationId: string,
        objectId: {$id: string},
        className: string,
        change: number,
        propertyName: string,
        value: Value);

    abstract sendEventNotificationToRuntime(
        federationId: string,
        eventName: string,
        value: Value);

    abstract sendServiceRequestToRuntime(
        federationId: string,
        service: string,
        value: Value): Promise<any>;
}

