import {Value} from './federation';

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

