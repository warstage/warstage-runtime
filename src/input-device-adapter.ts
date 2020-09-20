// Copyright Felix Ungman. All rights reserved.
// Licensed under GNU General Public License version 3 or later.

export interface InputDeviceObserver {
    mouseUpdate(x: number, y: number, buttons: number, count: number, timestamp: number): void;
    mouseWheel(x: number, y: number, dx: number, dy: number): void;
    keyDown(keyCode: number): void;
    keyUp(keyCode: number): void;
}

export class InputDeviceAdapter {
    protected canvas = null;
    protected activeTextInput = false;
    protected trackMouse = false;
    protected keysDown = {};
    protected mouseX = 0;
    protected mouseY = 0;
    protected buttons = 0;
    protected mousedownTimestamp: number | null = null;
    protected mouseupX = 0;
    protected mouseupY = 0;
    protected clickCount = 0;

    /***/

    protected static isWithinDistance(x1: number, y1: number, x2: number, y2: number, d: number): boolean {
        const dx = x1 - x2;
        const dy = y1 - y2;
        return dx * dx + dy * dy <= d * d;
    }

    public static shouldTrackGesture(x: number, y: number) {
        for (let element: any = document.elementFromPoint(x, y); element; element = element.parentNode) {
            if (InputDeviceAdapter.isClickable(element) && InputDeviceAdapter.hasOpacity(element)) {
                return false;
            }
        }
        return true;
    }

    protected static shouldTrackWheel(event: MouseWheelEvent) {
        for (let element: any = document.elementFromPoint(event.clientX, event.clientY); element; element = element.parentNode) {
            if (InputDeviceAdapter.isScrollable(element)) {
                return false;
            }
        }
        return true;
    }

    protected static hasOpacity(element) {
        while (element) {
            if (element.style && element.style.opacity === '0') {
                return false;
            }
            element = element.parentNode;
        }
        return true;
    }

    protected static isClickable(element) {
        if (element.tagName === 'INPUT' || element.tagName === 'BUTTON') {
            return true;
        }
        if (element.className) {
            const className = ' ' + element.className + ' ';
            return className.indexOf(' clickable ') !== -1
                || className.indexOf(' panel ') !== -1;
        }
        return false;
    }

    protected static isScrollable(element) {
        if (element.overflowY === 'scroll') {
            return true;
        }
        if (element.className) {
            const className = ' ' + element.className + ' ';
            if (className.indexOf(' scrollable ') !== -1) {
                return true;
            }
        }
        return false;
    }

    protected static normalizeMouseWheelDelta(event) {
        const delta = event.deltaY;
        if (delta && event.wheelDelta) {
            return delta / 4;
        } else if (Math.abs(delta) < 52.95000076293945) {
            return delta * 10;
        } else {
            return delta / 52.95000076293945;
        }
        /*if (event.wheelDelta) {
             normalized = (event.wheelDelta % 120) === 0 ? event.wheelDelta / 120.0 : event.wheelDelta / 12.0;
         } else {
             let amount = event.deltaY ? event.deltaY : event.detail;
             normalized = -(amount % 3 ? amount * 10.0 : amount / 3.0);
         }*/
    }

    /***/

    constructor(protected observer: InputDeviceObserver) {
        window.addEventListener('focus', event => this.handleFocusEvent(event), true);
        window.addEventListener('blur', () => this.handleBlurEvent(), true);
        window.addEventListener('keydown', event => this.handleKeyDownEvent(event));
        window.addEventListener('keyup', event => this.handleKeyUpEvent(event));
        window.addEventListener('mousedown', event => this.handleMouseDownEvent(event), true);
        window.addEventListener('mouseup', event => this.handleMouseUpEvent(event), true);
        window.addEventListener('mousemove', event => this.handleMouseMoveEvent(event), true);
        // window.addEventListener('mouseout', event => this.mouseout(), true);
        window.addEventListener('DOMMouseScroll', event => this.handleMouseWheelEvent(event));
        window.addEventListener('mousewheel', event => this.handleMouseWheelEvent(event));
        window.addEventListener('wheel', event => this.handleMouseWheelEvent(event));
        document.addEventListener('contextmenu', event => this.handleContextMenuEvent(event), false);
        setInterval(() => {
            if (this.buttons) {
                try {
                    const event = new Event('timestamp');
                    this.mouseUpdate(event.timeStamp);
                } catch (e) {
                    // doesn't work on IE
                }
            }
        }, 33);
    }

    protected getCanvas() {
        if (!this.canvas) {
            this.canvas = document.getElementById('canvas');
        }
        return this.canvas;
    }

    protected mouseUpdate(timestamp: number) {
        this.observer.mouseUpdate(this.mouseX, this.mouseY, this.buttons, this.clickCount, timestamp);
    }

    protected mouseWheel(x, y, dx, dy) {
        this.observer.mouseWheel(x, y, dx, dy);
    }

    /* event handlers */

    protected handleFocusEvent(event: FocusEvent) {
        this.activeTextInput = (event.target as any).tagName === 'INPUT';
    }

    protected handleBlurEvent() {
        this.activeTextInput = false;
    }

    protected handleKeyDownEvent(event: KeyboardEvent) {
        if (!this.activeTextInput) {
            const modifier = event.ctrlKey || event.shiftKey || event.altKey || event.metaKey;
            if (!modifier) {
                const keyCode = event.keyCode;
                this.keysDown[keyCode] = true;
                this.observer.keyDown(event.keyCode);
                event.preventDefault();
            }
        }
    }

    protected handleKeyUpEvent(event: KeyboardEvent) {
        const keyCode = event.keyCode;
        if (this.keysDown[keyCode]) {
            this.keysDown[keyCode] = false;
            this.observer.keyUp(event.keyCode);
        }
    }

    protected handleMouseDownEvent(event: MouseEvent) {
        if (!this.trackMouse && this.shouldTrackMouse(event)) {
            this.trackMouse = true;
        }

        if (this.trackMouse) {
            this.mouseX = event.pageX;
            this.mouseY = window.innerHeight - event.pageY;

            if (this.mousedownTimestamp != null
                && event.timeStamp - this.mousedownTimestamp < 500
                && InputDeviceAdapter.isWithinDistance(this.mouseX, this.mouseY, this.mouseupX, this.mouseupY, 12)) {
                this.clickCount += 1;
            } else {
                this.clickCount = 1;
            }
            this.mousedownTimestamp = event.timeStamp;

            if (typeof (event.buttons) !== 'undefined') {
                this.buttons = event.buttons;
            } else {
                switch (event.button) {
                    case 0:
                        // tslint:disable-next-line:no-bitwise
                        this.buttons |= 1;
                        break;
                    case 1:
                        // tslint:disable-next-line:no-bitwise
                        this.buttons |= 4;
                        break;
                    case 2:
                        // tslint:disable-next-line:no-bitwise
                        this.buttons |= 2;
                        break;
                }
            }

            this.mouseUpdate(event.timeStamp);
            event.stopPropagation();
            event.preventDefault();

            const canvas = this.getCanvas();
            if (canvas && canvas.setCapture) {
                canvas.setCapture();
            }
        }
    }

    protected handleMouseUpEvent(event: MouseEvent) {
        if (!this.trackMouse) {
            return;
        }

        this.mouseX = event.pageX;
        this.mouseY = window.innerHeight - event.pageY;
        this.mouseupX = this.mouseX;
        this.mouseupY = this.mouseY;
        if (typeof (event.buttons) !== 'undefined') {
            this.buttons = event.buttons;
        } else {
            switch (event.button) {
                case 0:
                    // tslint:disable-next-line:no-bitwise
                    this.buttons &= 6;
                    break;
                case 1:
                    // tslint:disable-next-line:no-bitwise
                    this.buttons &= 3;
                    break;
                case 2:
                    // tslint:disable-next-line:no-bitwise
                    this.buttons &= 5;
                    break;
            }
        }

        this.mouseUpdate(event.timeStamp);
        event.stopPropagation();
        event.preventDefault();
        if (!event.buttons) {
            this.trackMouse = false;
        }
    }

    protected handleMouseMoveEvent(event: MouseEvent) {
        if (!this.trackMouse) {
            return;
        }

        this.mouseX = event.pageX;
        this.mouseY = window.innerHeight - event.pageY;

        this.mouseUpdate(event.timeStamp);
        event.stopPropagation();
        event.preventDefault();
    }

    protected handleMouseWheelEvent(event) {
        if (InputDeviceAdapter.shouldTrackWheel(event)) {
            const delta = -2 * InputDeviceAdapter.normalizeMouseWheelDelta(event);
            this.mouseWheel(event.pageX, window.innerHeight - event.pageY, 0, delta);
            event.stopPropagation();
        }
    }

    protected handleContextMenuEvent(event: MouseEvent) {
        if (this.shouldTrackMouse(event)) {
            event.preventDefault();
        }
    }

    /***/

    protected shouldTrackMouse(event: MouseEvent) {
        if (event.target === this.canvas) {
            return true;
        }
        return InputDeviceAdapter.shouldTrackGesture(event.clientX, event.clientY);
    }
}
