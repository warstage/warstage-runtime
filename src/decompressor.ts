// Copyright Felix Ungman. All rights reserved.
// Licensed under GNU General Public License version 3 or later.

import {Buffer} from 'buffer';

export class Decompressor {
    // tslint:disable:no-bitwise

    buffer: Buffer;
    index: number;
    propertyStrings: string[] = [];
    objectIds: {$id: string}[] = [];

    public decode(buffer: Buffer): object {
        this.buffer = buffer;
        this.index = 0;

        const result = {};
        while (this.decodeElement(result, null)) {
        }
        return result;
    }

    private decodeElement(parentObject: object, parentArray: any[]): boolean {
        const header = this.readByte();
        if (header === 0) {
            return false;
        }

        const type = header & 0x7f;
        const propertyName = parentObject ? this.readProperty(header) : null;

        switch (type) {
            case 0x01: /* null */ {
                if (parentObject) {
                    parentObject[propertyName] = null;
                } else {
                    parentArray.push(null);
                }
                return true;
            }
            case 0x02: /* false */ {
                if (parentObject) {
                    parentObject[propertyName] = false;
                } else {
                    parentArray.push(false);
                }
                return true;
            }
            case 0x03: /* true */ {
                if (parentObject) {
                    parentObject[propertyName] = true;
                } else {
                    parentArray.push(true);
                }
                return true;
            }
            case 0x04: /* document */ {
                const value = {};
                while (this.decodeElement(value, null)) {
                }
                if (parentObject) {
                    parentObject[propertyName] = value;
                } else {
                    parentArray.push(value);
                }
                return true;
            }
            case 0x05: /* array */ {
                const value = [];
                while (this.decodeElement(null, value)) {
                }
                if (parentObject) {
                    parentObject[propertyName] = value;
                } else {
                    parentArray.push(value);
                }
                return true;
            }
            case 0x06: /* float */ {
                const value = this.readFloat();
                if (parentObject) {
                    parentObject[propertyName] = value;
                } else {
                    parentArray.push(value);
                }
                return true;
            }
        }

        if ((type & 0x78) === 0x08) {
            let obj = this.readByte();
            obj |= (type & 0x07) << 8;
            if (obj === 0x7ff) {
                this.objectIds = [];
                obj = 0;
            }
            let value: {$id: string};
            if (obj === 0) {
                value = this.readObjectId();
                this.objectIds.push(value);
            } else if (obj <= this.objectIds.length) {
                value = this.objectIds[obj - 1];
            } else {
                throw new Error(`decompressor: invalid object ${obj - 1} (should be < ${this.objectIds.length})`);
            }
            if (parentObject) {
                parentObject[propertyName] = value;
            } else {
                parentArray.push(value);
            }
            return true;
        }

        switch (type & 0x60) {
            case 0x20: /* int */ {
                const n = type & 0x1f;
                if (n < 24) {
                    if (parentObject) {
                        parentObject[propertyName] = n;
                    } else {
                        parentArray.push(n);
                    }
                    return true;
                }
                let value = 0;
                switch (type & 0x03) {
                    case 0:
                        value = this.readByte();
                        break;
                    case 1:
                        value = this.readUInt16();
                        break;
                    case 2:
                        value = this.readUInt32();
                        break;
                }
                if ((type & 0x04) !== 0) {
                    value ^= 0xffffffff;
                    value -= 0x100000000;
                }
                if (parentObject) {
                    parentObject[propertyName] = value;
                } else {
                    parentArray.push(value);
                }
                return true;
            }
            case 0x40: /* binary */ {
                let size = type & 0x1f;
                if (size === 0) {
                    size = this.readUInt16();
                } else if (size === 0x1f) {
                    size = this.readUInt32();
                }
                const value = Buffer.from(this.buffer.buffer, this.index, size);
                this.index += size;
                if (parentObject) {
                    parentObject[propertyName] = value;
                } else {
                    parentArray.push(value);
                }
                return true;
            }
            case 0x60: /* string */ {
                let value: string;
                const size = type & 0x1f;
                if (size === 0) {
                    value = this.readString();
                } else {
                    value = this.readStringWithSize(size);
                }
                if (parentObject) {
                    parentObject[propertyName] = value;
                } else {
                    parentArray.push(value);
                }
                return true;
            }
        }

        return false;
    }

    private readProperty(header: number): string {
        let index = this.readByte();
        if ((header & 0x80) !== 0) {
            index |= 0x100;
        }
        if (index === 0x1ff) {
            this.propertyStrings = [];
            index = 0;
        }
        if (index === 0) {
            const result = this.readString();
            this.propertyStrings.push(result);
            return result;
        }
        --index;
        if (index >= this.propertyStrings.length) {
            throw new Error(`decompressor: invalid property ${index} (should be < ${this.propertyStrings.length})`);
        }
        return this.propertyStrings[index];
    }

    private readByte(): number {
        return this.buffer.readUInt8(this.index++);
    }

    private readUInt16(): number {
        const result = this.buffer.readUInt16BE(this.index);
        this.index += 2;
        return result;
    }

    private readUInt32(): number {
        const result = this.buffer.readUInt32BE(this.index);
        this.index += 4;
        return result;
    }

    private readFloat(): number {
        const result = this.buffer.readFloatLE(this.index);
        this.index += 4;
        return result;
    }

    private readObjectId(): {$id: string} {
        const result = { $id: Buffer.from(this.buffer.buffer, this.index, 12).toString('hex') };
        this.index += 12;
        return result;
    }

    private readString(): string {
        let index = this.index;
        while (this.buffer.readUInt8(index) !== 0) {
            ++index;
        }
        const array = this.buffer.subarray(this.index, index);
        const result = new TextDecoder('utf-8').decode(array);
        this.index = index + 1;
        return result;
    }

    private readStringWithSize(size: number): string {
        const array = this.buffer.subarray(this.index, this.index + size);
        const result = new TextDecoder('utf-8').decode(array);
        this.index += size;
        return result;
    }
}
