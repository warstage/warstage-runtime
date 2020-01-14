// Copyright Felix Ungman. All rights reserved.
// Licensed under GNU General Public License version 3 or later.

import {Compressor} from './compressor';
import {Decompressor} from './decompressor';
import {Payload} from './messages';
import {RuntimeConnection} from './runtime-connection';
import Timeout = NodeJS.Timeout;

export class WebSocketConnection implements RuntimeConnection {
    private onOpenCallback: () => void;
    private onCloseCallback: () => void;
    private onPacketCallback: (Payload) => void;
    private webSocket: WebSocket = null;
    private isOpen = false;
    private compressor: Compressor = null;
    private decompressor: Decompressor = null;
    private reopener: Timeout;
    private queueOut: Payload[] = [];
    private queueIn: Blob[] = [];
    private reader: FileReader = null;

    static toHexString(byteArray) {
        return Array.from(byteArray, (byte: number) => {
            // tslint:disable-next-line:no-bitwise
            return ('0' + (byte & 0xff).toString(16)).slice(-2);
        }).join('');
    }

    constructor(private url) {
    }

    private reset() {
        this.webSocket = null;
        this.isOpen = false;
        this.compressor = null;
        this.decompressor = null;
        this.queueOut = [];
        this.queueIn = [];
        this.reader = null;
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
        if (!this.reopener) {
            this.reopener = global.setInterval(() => {
                if (!this.webSocket) {
                    // console.log('WebSocketSession reopen');
                    this.open();
                }
            }, 500);
        }

        if (!this.onPacket) {
            // console.error('WebSocketSession.open: missing onMessage callback');
            return;
        }
        this.webSocket = new WebSocket(this.url, 'warstage');
        this.webSocket.addEventListener('open', () => {
            // console.log("WebSocketSession open", event);
            this.isOpen = true;
            this.compressor = new Compressor();
            this.decompressor = new Decompressor();
            if (this.onOpenCallback) {
                this.onOpenCallback();
            }
            for (const payload of this.queueOut) {
                const data = this.compressor.encode({p: payload});
                this.webSocket.send(data.buffer);
            }
            this.queueOut = [];
        });
        this.webSocket.addEventListener('close', () => {
            // console.log("WebSocketSession close", event);
            this.reset();
            if (this.onCloseCallback) {
                this.onCloseCallback();
            }
        });
        this.webSocket.addEventListener('error', () => {
            // console.error('WebSocketSession error', event);
            this.reset();
        });

        this.webSocket.addEventListener('message', event => {
            this.queueIn.push(event.data);
            this.tryProcessQueueIn();

        });
    }

    tryProcessQueueIn() {
        if (!this.reader && this.queueIn.length) {
            const reader = new FileReader();
            reader.onload = () => {
                if (reader === this.reader) {
                    this.reader = null;
                    const arrayBuffer = reader.result as ArrayBuffer;
                    try {
                        const packet: any = this.decompressor.decode(Buffer.from(arrayBuffer, 0, arrayBuffer.byteLength));
                        this.onPacketCallback(packet.p);
                        this.tryProcessQueueIn();
                    } catch (error) {
                        // console.error('WebSocketSession', error);
                        this.isOpen = false;
                        this.webSocket.close();
                    }
                }
            };
            this.reader = reader;
            reader.readAsArrayBuffer(this.queueIn.shift());
        }
    }

    close() {
        this.isOpen = false;
        this.webSocket.close();
        if (this.reopener) {
            clearInterval(this.reopener);
            this.reopener = null;
        }
        this.reset();
    }

    sendPacket(payload: Payload) {
        if (this.isOpen) {
            const data = this.compressor.encode({p: payload});
            this.webSocket.send(data.buffer);
        } else {
            this.queueOut.push(payload);
        }
    }
}
