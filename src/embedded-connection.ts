// Copyright Felix Ungman. All rights reserved.
// Licensed under GNU General Public License version 3 or later.

import {Buffer} from 'buffer';
import {RuntimeConnection} from './runtime-connection';
import {Payload} from './messages';
import {Compressor} from './compressor';
import {Decompressor} from './decompressor';

export class EmbeddedConnection implements RuntimeConnection {
    private targetOrigin = '*';
    private onOpenCallback: () => void = null;
    private onCloseCallback: () => void = null;
    private onPacketCallback: (payload: Payload) => void = null;
    private messageListener: (event: MessageEvent) => void;
    private compressor: Compressor = null;
    private decompressor: Decompressor = null;
    private openerInterval: any = null;

    private sendMessage(message: any) {
        window.parent.postMessage(message, this.targetOrigin);
    }

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
            this.addMessageListener();
            this.startSendOpen();
        } else {
            console.warn('EmbeddedConnection.open(): session is already opened');
        }
    }

    close() {
        this.stopSendOpen();
        if (this.messageListener) {
            this.sendMessage({ close: true });
        } else {
            console.warn('EmbeddedConnection.close(): session is not open');
        }
    }

    shutdown() {
        this.close();
    }

    sendPacket(payload: Payload) {
       this.sendMessage({ packet: this.compressor.encode(payload) });
    }

    private addMessageListener() {
        this.messageListener = event => {
            if (event.source === window.parent) {
                if (event.data.packet) {
                    if (this.openerInterval != null) {
                        console.error('EmbeddedConnection: openerInterval not null');
                    }
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
                    this.removeMessageListener();
                    if (this.onCloseCallback) {
                        this.onCloseCallback();
                    }
                }
            }
        };
        window.addEventListener('message', this.messageListener);
    }

    private removeMessageListener() {
        window.removeEventListener('message', this.messageListener);
        this.messageListener = null;
    }

    private startSendOpen() {
        this.sendMessage({ open: true });
        this.openerInterval = setInterval(() => {
            if (this.openerInterval) {
               this.sendMessage({ open: true });
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
