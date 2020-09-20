// Copyright Felix Ungman. All rights reserved.
// Licensed under GNU General Public License version 3 or later.

import {InputDeviceAdapter, InputDeviceObserver} from './input-device-adapter';

export class InputDevicePoster implements InputDeviceObserver {
    inputDeviceAdapter: InputDeviceAdapter = null;

    constructor() {
        this.inputDeviceAdapter = new InputDeviceAdapter(this);
    }

    keyDown(keyCode: number): void {
        window.parent.postMessage({keyDown: { keyCode }}, '*');
    }

    keyUp(keyCode: number): void {
        window.parent.postMessage({keyUp: { keyCode }}, '*');
    }

    mouseUpdate(x: number, y: number, buttons: number, count: number, timestamp: number): void {
        window.parent.postMessage({mouseUpdate: { x, y, buttons, count, timestamp }}, '*');
    }

    mouseWheel(x: number, y: number, dx: number, dy: number): void {
        window.parent.postMessage({mouseWheel: { x, y, dx, dy }}, '*');
    }
}
