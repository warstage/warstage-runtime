// Copyright Felix Ungman. All rights reserved.
// Licensed under GNU General Public License version 3 or later.

export enum ProcessType {
    Agent = 1,
    Headup = 2,
    Player = 3,
    Server = 4,
    Master = 5,
    Launcher = 6
}

export enum PacketType {
    Heartbeat = 0,
    Handshake = 1,
    Authenticate = 2,
    Messages = 3,
    FederationAdded = 4,
    FederationRemoved = 5
}

export enum MessageType {
    Null = 0,
    ObjectChanges = 1,
    EventDispatch = 2,
    ServiceRequest = 3,
    ServiceFulfill = 4,
    ServiceReject = 5
}

export enum ObjectChange {
    CREATE = 1,
    UPDATE = 2,
    DELETE = 3
}

export interface HeartbeatPayload {
    m: PacketType.Heartbeat;
}

export interface HandshakePayload {
    m: PacketType.Handshake;
    pt: ProcessType;
    id: string; // process id
}

export interface AuthenticatePayload {
    m: PacketType.Authenticate;
    a: string; // access token
    s: string; // subject id
    n: string; // nickname
    i: string; // image url
}

export interface MessagesPayloads {
    m: PacketType.Messages;
    mm: Message[];
}

export interface FederationAddedPayload {
    m: PacketType.FederationAdded;
    x: string; // federation name
    id: string; // process id
}

export interface FederationRemovedPayload {
    m: PacketType.FederationRemoved;
    x: string; // federation name
    id: string; // process id
}

export type Payload = HeartbeatPayload
    | HandshakePayload
    | AuthenticatePayload
    | MessagesPayloads
    | FederationAddedPayload
    | FederationRemovedPayload;

export interface Packet {
    p: Payload;
}

/***/

export interface NullMessage {
    m: MessageType.Null;
}

export interface ObjectChangesMessage {
    m: MessageType.ObjectChanges;
    x: string; // federation name
    i: {$id: string};
    c: string;
    t: number;
    p: {[name: string]: { v: any, t: number} };
}

export interface EventDispatchMessage {
    m: MessageType.EventDispatch;
    x: string; // federation name
    e: string; // event name
    v: any; // value
}

export interface ServiceRequestMessage {
    m: MessageType.ServiceRequest;
    x: string; // federation name
    s: string; // service name
    r: number; // request id
    v: any; // value
}

export interface ServiceFulfillMessage {
    m: MessageType.ServiceFulfill;
    r: number; // request id
    v: any; // value
}

export interface ServiceRejectMessage {
    m: MessageType.ServiceReject;
    r: number; // request id
    v: any; // value
}

export type Message = NullMessage
    | ObjectChangesMessage
    | EventDispatchMessage
    | ServiceRequestMessage
    | ServiceFulfillMessage
    | ServiceRejectMessage;
