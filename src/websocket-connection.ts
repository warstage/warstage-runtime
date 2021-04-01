// Copyright Felix Ungman. All rights reserved.
// Licensed under GNU General Public License version 3 or later.

import {Buffer} from 'buffer';
import {Compressor} from './compressor';
import {Decompressor} from './decompressor';
import {Payload} from './messages';
import {RuntimeConnection} from './runtime-connection';
import Timeout = NodeJS.Timeout;

enum ConnectionState {
    None,
    Opening,
    Open,
    Closed
}

export class WebSocketConnection implements RuntimeConnection {
    private onOpenCallback: () => void;
    private onCloseCallback: () => void;
    private onPacketCallback: (Payload) => void;
    private webSocket: WebSocket = null;
    private compressor: Compressor = null;
    private decompressor: Decompressor = null;
    private openerInterval: Timeout;
    private queueOut: Payload[] = [];
    private queueIn: Blob[] = [];
    private reader: FileReader = null;
    private state = ConnectionState.None;

    static toHexString(byteArray) {
        return Array.from(byteArray, (byte: number) => {
            // tslint:disable-next-line:no-bitwise
            return ('0' + (byte & 0xff).toString(16)).slice(-2);
        }).join('');
    }

    constructor(private url) {
    }

    onOpen(callback: () => void): void {
        this.onOpenCallback = callback;
    }

    onClose(callback: () => void): void {
        this.onCloseCallback = callback;
    }

    onPacket(callback: (Payload) => void): void {
        this.onPacketCallback = callback;
    }

    open() {
        if (!this.onPacket) {
            console.error('WebSocketSession.open: missing onMessage callback');
            return;
        }
        if (this.state === ConnectionState.None) {
            this.state = ConnectionState.Opening;
            this.startOpenerInterval_();
            this.tryOpenWebSocket_();
        }
    }

    close() {
        this.shutdown_();
    }

    shutdown() {
        this.shutdown_();
    }

    sendPacket(payload: Payload) {
        switch (this.state) {
            case ConnectionState.None:
            case ConnectionState.Opening:
                this.queueOut.push(payload);
                break;
            case ConnectionState.Open:
                const data = this.compressor.encode({p: payload});
                this.webSocket.send(data.buffer);
                break;
        }
    }

    private startOpenerInterval_() {
        this.openerInterval = global.setInterval(() => {
            this.tryOpenWebSocket_();
        }, 500);
    }

    private stopOpenerInterval_() {
        if (this.openerInterval) {
            clearInterval(this.openerInterval);
            this.openerInterval = null;
        }
    }

    private tryOpenWebSocket_() {
        if (this.webSocket) {
            return;
        }
        if (this.state !== ConnectionState.Opening) {
            return console.error(`WebSocketSession.tryOpenWebSocket_: invalid state ${this.state}`);
        }
        this.webSocket = new WebSocket(this.url, 'warstage');
        this.webSocket.addEventListener('open', () => {
            this.stopOpenerInterval_();
            this.state = ConnectionState.Open;
            this.compressor = new Compressor();
            this.decompressor = new Decompressor();
            if (this.onOpenCallback) {
                this.onOpenCallback();
            }
            const queueOut = this.queueOut;
            this.queueOut = [];
            for (const payload of queueOut) {
                this.sendPacket(payload);
            }
        });
        this.webSocket.addEventListener('close', () => {
            if (this.state === ConnectionState.Opening) {
                this.reset_();
            } else {
                this.shutdown_();
            }
        });
        this.webSocket.addEventListener('error', () => {
            if (this.state === ConnectionState.Opening) {
                this.reset_();
            } else {
                this.shutdown_();
            }
        });

        this.webSocket.addEventListener('message', event => {
            this.queueIn.push(event.data);
            this.tryProcessQueueIn_();
        });
    }

    private tryProcessQueueIn_() {
        if (!this.reader && this.queueIn.length) {
            const reader = new FileReader();
            reader.onload = () => {
                if (reader === this.reader) {
                    this.reader = null;
                    if (this.state === ConnectionState.Open) {
                        this.processIncoming_(reader.result as ArrayBuffer);
                    }
                }
            };
            this.reader = reader;
            reader.readAsArrayBuffer(this.queueIn.shift());
        }
    }

    private processIncoming_(arrayBuffer: ArrayBuffer) {
        try {
            const packet: any = this.decompressor.decode(Buffer.from(arrayBuffer, 0, arrayBuffer.byteLength));
            this.onPacketCallback(packet.p);
            this.tryProcessQueueIn_();
        } catch (error) {
            this.webSocket.close();
        }
    }

    private shutdown_() {
        this.stopOpenerInterval_();
        if (this.state === ConnectionState.Open && this.onCloseCallback) {
            this.onCloseCallback();
        }
        this.state = ConnectionState.Closed;
        if (this.webSocket) {
            if (this.webSocket.readyState === WebSocket.OPEN) {
                this.webSocket.close();
            }
        }
        this.reset_();
    }

    private reset_() {
        this.webSocket = null;
        this.compressor = null;
        this.decompressor = null;
        this.reader = null;
    }
}
