// Copyright Felix Ungman. All rights reserved.
// Licensed under GNU General Public License version 3 or later.

import {RuntimeConnection} from './runtime-connection';
import {Payload} from './messages';
import {Compressor} from './compressor';
import {Decompressor} from './decompressor';

export class EmbeddedConnection implements RuntimeConnection {
    private onOpenCallback: () => void = null;
    private onCloseCallback: () => void = null;
    private onPacketCallback: (payload: Payload) => void = null;
    private messageListener: (event: MessageEvent) => void;
    private compressor: Compressor = null;
    private decompressor: Decompressor = null;
    private openerInterval: any = null;

    constructor() {
        if (!window.parent) {
            throw Error('EmbeddedConnection: missing window.parent');
        }
    }

    onOpen(callback: () => void): void {
        this.onOpenCallback = callback;
    }

    onClose(callback: () => void): void {
        this.onCloseCallback = callback;
    }

    onPacket(callback: (payload: Payload) => void): void {
        this.onPacketCallback = callback;
    }

    open() {
        if (!this.messageListener) {
            this.compressor = new Compressor();
            this.decompressor = new Decompressor();
            this.messageListener = event => {
                if (event.source === window.parent) {
                    if (event.data.packet) {
                        if (this.onPacketCallback) {
                            const arrayBuffer = event.data.packet;
                            const buffer = Buffer.from(arrayBuffer, 0, arrayBuffer.byteLength)
                            const packet = this.decompressor.decode(buffer) as Payload;
                            this.onPacketCallback(packet);
                        } else {
                            console.error('EmbeddedConnection: missing onPacket callback');
                        }
                    } else if (event.data.open) {
                        this.stopSendOpen();
                        if (this.onOpenCallback) {
                            this.onOpenCallback();
                        }
                    } else if (event.data.close) {
                        this.stopSendOpen();
                        window.removeEventListener('message', this.messageListener);
                        this.messageListener = null;
                        if (this.onCloseCallback) {
                            this.onCloseCallback();
                        }
                    }
                }
            };
            window.addEventListener('message', this.messageListener);
            this.startSendOpen();
        } else {
            console.warn('EmbeddedConnection.open(): session is already opened');
        }
    }

    close() {
        this.stopSendOpen();
        if (this.messageListener) {
            window.parent.postMessage({ close: true }, '*');
        } else {
            console.warn('EmbeddedConnection.close(): session is not open');
        }
    }

    sendPacket(payload: Payload) {
        window.parent.postMessage({ packet: this.compressor.encode(payload) }, '*');
    }

    private startSendOpen() {
        window.parent.postMessage({open: true}, '*');
        this.openerInterval = setInterval(() => {
            if (this.openerInterval) {
                window.parent.postMessage({open: true}, '*');
            }
        }, 200);
    }

    private stopSendOpen() {
        if (this.openerInterval) {
            clearInterval(this.openerInterval);
            this.openerInterval = null;
        }
    }
}
