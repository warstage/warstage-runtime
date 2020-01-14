// Copyright Felix Ungman. All rights reserved.
// Licensed under GNU General Public License version 3 or later.

import {RuntimeSession} from './runtime-session';
import {Payload} from './messages';
import {Compressor} from './compressor';
import {Decompressor} from './decompressor';

export class EmbeddedSession implements RuntimeSession {
    private onOpenCallback: () => void = null;
    private onCloseCallback: () => void = null;
    private onPacketCallback: (payload: Payload) => void = null;
    private messageListener: (event: MessageEvent) => void;
    private compressor: Compressor = null;
    private decompressor: Decompressor = null;

    constructor() {
        if (!window.parent) {
            throw Error('EmbeddedSession: missing window.parent');
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
                            console.error('EmbeddedSession: missing onPacket callback');
                        }
                    } else if (event.data.open) {
                        if (this.onOpenCallback) {
                            this.onOpenCallback();
                        }
                    } else if (event.data.close) {
                        window.removeEventListener('message', this.messageListener);
                        this.messageListener = null;
                        if (this.onCloseCallback) {
                            this.onCloseCallback();
                        }
                    }
                }
            };
            window.addEventListener('message', this.messageListener);
            window.parent.postMessage({ open: true }, '*');
        } else {
            console.warn('EmbeddedSession.open(): session is already opened');
        }
    }

    close() {
        if (this.messageListener) {
            window.parent.postMessage({ close: true }, '*');
        } else {
            console.warn('EmbeddedSession.close(): session is not open');
        }
    }

    fork(processId: string) {
        return null;
    }

    sendPacket(payload: Payload) {
        window.parent.postMessage({ packet: this.compressor.encode(payload) }, '*');
    }

    getProcessId(): string {
        const params = new URLSearchParams(document.location.search.substring(1));
        return params.get('pid');
    }
}
