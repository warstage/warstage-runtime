// Copyright Felix Ungman. All rights reserved.
// Licensed under GNU General Public License version 3 or later.

require('setimmediate');

import {Federation} from './federation';
import {
    EventDispatchMessage,
    Message,
    MessageType,
    ObjectChangesMessage,
    PacketType,
    Payload,
    ServiceFulfillMessage,
    ServiceRejectMessage,
    ServiceRequestMessage
} from './messages';
import {Value} from './object';
import {RuntimeConnection} from './runtime-connection';
import {RuntimeSession} from './runtime-session';
import {RuntimeConfiguration} from './runtime-configuration';

class Authentication {
    accessToken: string;
    subjectId: string;
    nickname: string;
    imageUrl: string;
}

export class Runtime extends RuntimeSession {
    public configuration: RuntimeConfiguration = null;
    public federations: { [name: string]: Federation } = {};
    public onError: (message: Error) => void = null;

    public connection: RuntimeConnection;
    private connectionIsOpen  = false;
    private serviceRequests: {
        [requestId: number]: { federationId: string, resolve: (x: Value) => void, reject: (x: Value | Error) => void }
    } = {};
    private lastServiceRequestId = 0;
    private authentication: Authentication = null;

    outgoingMessages: Message[] = [];
    outgoingImmediate: any = null;

    public static toError(value: any) {
        if (value == null) {
            return null;
        }
        if (Object.prototype.toString.call(value) === '[object Error]') {
            return value;
        }
        if (value.message) {
            const stack: string = value.stackX ? value.stackX
                : value.stack ? value.stack
                : value.file ? `${value.name}: ${value.message}\n  at ${value.file}:${value.line} (${value.file}:${value.line}:1)`
                : null;
            const error = new Error(value.message);
            error.name = value.name;
            error.stack = stack || '';
            if (stack) {
                (error as any).stackX = stack;
            }
            return error;
        }
        try {
            const error = new Error(JSON.stringify(value));
            error.stack = '';
            return error;
        } catch {
        }
        return value;
    }

    public static toReason(error: Error) {
        return {
            name: Object.prototype.toString.call(error),
            message: error.message,
            stack: error.stack
        };
    }

    constructor() {
        super();
    }

    startup(configuration: RuntimeConfiguration) {
        this.configuration = configuration;
        this.connection = this.configuration.newConnection();
        this.connection.onOpen(() => {
            this.connectionIsOpen = true;
            this.enqueueOrSendOutgoingPayload({
                m: PacketType.Handshake,
                id: this.configuration.processId,
                pt: this.configuration.processType
            });
            if (this.configuration.subjectId) {
                this.enqueueOrSendOutgoingPayload({
                    m: PacketType.Authenticate,
                    a: '',
                    s: this.configuration.subjectId,
                    n: '',
                    i: ''
                });
            }
            for (const federationId in this.federations) {
                if (this.federations.hasOwnProperty(federationId)) {
                    this.enqueueOrSendOutgoingPayload({
                        m: PacketType.FederationAdded,
                        x: federationId,
                        id: this.configuration.processId
                    });
                }
            }
            this.trySendAuthenticateMessage();
        });
        this.connection.onClose(() => {
            this.connectionIsOpen = false;
        });
        this.connection.onPacket(payload => {
            try {
                this.dispatchPacket(payload);
            } catch (e) {
                if (this.onError) {
                    this.onError(e);
                }
            }
        });
        this.connection.open();
    }

    /*isConnected() {
        return this.session != null;
    }*/

    authenticate(accessToken: string, subjectId: string, nickname: string, imageUrl: string) {
        this.authentication = {
            accessToken,
            subjectId,
            nickname,
            imageUrl
        };
        this.trySendAuthenticateMessage();
    }

    trySendAuthenticateMessage() {
        if (this.connectionIsOpen && this.authentication) {
            this.enqueueOrSendOutgoingPayload({
                m: PacketType.Authenticate,
                a: this.authentication.accessToken,
                s: this.authentication.subjectId,
                n: this.authentication.nickname,
                i: this.authentication.imageUrl
            });
        }
    }

    joinFederation(federationId: string): Federation {
        const result = new Federation(this, federationId);
        this.federations[federationId] = result;
        if (this.connection) {
            this.enqueueOrSendOutgoingPayload({
                m: PacketType.FederationAdded,
                x: federationId,
                id: this.configuration.processId
            });
        }
        return result;
    }

    leaveFederation(federationId: string) {
        if (this.federations.hasOwnProperty(federationId)) {
            this.enqueueOrSendOutgoingPayload({
                m: PacketType.FederationRemoved,
                x: federationId,
                id: this.configuration.processId
            });
            delete this.federations[federationId];
        }
    }

    dispatchPacket(packet: Payload) {
        if (packet.m === PacketType.Messages) {
            for (const message of packet.mm) {
                switch (message.m) {
                    case MessageType.ObjectChanges:
                        this._dispatchObjectChangesFromRemote(message);
                        break;
                    case MessageType.EventDispatch:
                        this._dispatchEventFromRemote(message);
                        break;
                    case MessageType.ServiceRequest:
                        this._dispatchServiceRequestFromRemote(message).then(() => {}, () => {});
                        break;
                    case MessageType.ServiceFulfill:
                        this._dispatchServiceFulfillFromRemote(message);
                        break;
                    case MessageType.ServiceReject:
                        this._dispatchServiceRejectFromRemote(message);
                        break;
                }
            }
        }
    }

    sendObjectChangesToRuntime(federationId: string, objectId: {$id: string}, className: string, change: number,
                               propertyName: string, value: Value) {
        if (this.connection) {
            const p: {[name: string]: { v: Value, t: number} } = {};
            if (propertyName != null) {
                p[propertyName] = { v: value, t: 0 };
            }
            this.enqueueOrSendOutgoingPayload({
                m: PacketType.Messages,
                mm: [{
                    m: MessageType.ObjectChanges,
                    x: federationId,
                    i: objectId,
                    c: className,
                    t: change,
                    p
                }]
            });
        } else if (this.onError) {
            this.onError(new Error(`sendObjectChangesToRemote(${className}): no connection`));
        }
    }

    sendEventNotificationToRuntime(federationId: string, eventName: string, value: Value) {
        if (this.connection) {
            this.enqueueOrSendOutgoingPayload({
                m: PacketType.Messages,
                mm: [{
                    m: MessageType.EventDispatch,
                    x: federationId,
                    e: eventName,
                    v: value
                }]
            });
        } else if (this.onError) {
            this.onError(new Error(`sendEventToRemote(${eventName}): no connection`));
        }
    }

    sendServiceRequestToRuntime(federationId: string, service: string, value: Value): Promise<any> {
        const requestId = ++this.lastServiceRequestId;
        return new Promise((resolve, reject) => {
            if (this.connection) {
                this.serviceRequests[requestId] = {
                    federationId,
                    resolve,
                    reject
                };
                try {
                    this.enqueueOrSendOutgoingPayload({
                        m: PacketType.Messages,
                        mm: [{
                            m: MessageType.ServiceRequest,
                            x: federationId,
                            s: service,
                            r: requestId,
                            v: value
                        }]
                    });
                } catch (error) {
                    delete this.serviceRequests[requestId];
                    reject(error);
                }
            } else {
                const message = `sendServiceRequestToRemote(${service}): no connection`;
                if (this.onError) {
                    this.onError(new Error(message));
                }
                reject(message);
            }
        });
    }

    private enqueueOrSendOutgoingPayload(payload: Payload) {
        if (this.connection) {
            if (payload.m === PacketType.Messages) {
                this.enqueueOutgoingMessages(payload.mm);
            } else {
                this.flushOutgoingMessages();
                this.connection.sendPacket(payload);
            }
        } else if (this.onError) {
            this.onError(new Error('sendPacket: no connection'));
        } else {
            console.error('sendPacket: no connection');
        }
    }

    private enqueueOutgoingMessages(messages: Message[]) {
        for (const message of messages) {
            this.outgoingMessages.push(message);
        }
        if (!this.outgoingImmediate) {
            this.outgoingImmediate = setImmediate(() => {
                this.outgoingImmediate = null;
                this.flushOutgoingMessages();
            });
        }
    }

    private flushOutgoingMessages() {
        if (this.outgoingMessages.length) {
            this.connection.sendPacket({ m: PacketType.Messages, mm: this.outgoingMessages });
            this.outgoingMessages = [];
        }
        if (this.outgoingImmediate) {
            clearImmediate(this.outgoingImmediate);
            this.outgoingImmediate = null;
        }
    }

    private _dispatchObjectChangesFromRemote(message: ObjectChangesMessage) {
        const federation = this.federations[message.x];
        if (federation) {
            federation.processNativeChanges(message);
        }
    }

    private _dispatchEventFromRemote(message: EventDispatchMessage) {
        const federation = this.federations[message.x];
        if (federation) {
            const value = federation.decodeObjectIds(message.v);
            federation.dispatchEventScript(message.e, value);
        }
    }

    private _dispatchServiceRequestFromRemote(message: ServiceRequestMessage) {
        const federation = this.federations[message.x];
        if (federation) {
            const value = federation.decodeObjectIds(message.v);
            const promise = federation.requestLocalService(message.s, value);
            if (promise) {
                return promise.then(result => {
                    this.enqueueOrSendOutgoingPayload({
                        m: PacketType.Messages,
                        mm: [{
                            m: MessageType.ServiceFulfill,
                            r: message.r,
                            v: result
                        }]
                    });
                }).catch(error => {
                    this.enqueueOrSendOutgoingPayload({
                        m: PacketType.Messages,
                        mm: [{
                            m: MessageType.ServiceReject,
                            r: message.r,
                            v: Runtime.toReason(error)
                        }]
                    });
                });
            }
            return Promise.reject('unknown script service: ' + message.s);
        }
    }

    private _dispatchServiceFulfillFromRemote(message: ServiceFulfillMessage) {
        const serviceRequest = this.serviceRequests[message.r];
        if (serviceRequest) {
            delete this.serviceRequests[message.r];
            const federation = this.federations[serviceRequest.federationId];
            if (federation) {
                const value = federation.decodeObjectIds(message.v);
                serviceRequest.resolve(value);
            } else {
                serviceRequest.reject(new Error('federation not found'));
            }
        } else {
            console.error(`_dispatchServiceFulfillFromRemote: request ${message.r} not found`);
        }
    }

    private _dispatchServiceRejectFromRemote(message: ServiceRejectMessage) {
        const serviceRequest = this.serviceRequests[message.r];
        if (serviceRequest) {
            delete this.serviceRequests[message.r];
            const federation = this.federations[serviceRequest.federationId];
            if (federation) {
                const value = federation.decodeObjectIds(message.v);
                serviceRequest.reject(Runtime.toError(value));
            } else {
                serviceRequest.reject(new Error('federation not found'));
            }
        } else {
            console.error(`_dispatchServiceRejectFromRemote: request ${message.r} not found`);
        }
    }
}
