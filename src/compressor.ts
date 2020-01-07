// Copyright Felix Ungman. All rights reserved.
// Licensed under GNU General Public License version 3 or later.

import {Buffer} from 'buffer';

export class Compressor {
    // tslint:disable:no-bitwise

    properties: {[name: string]: number} = {};
    objects: {[id: string]: number} = {};
    lastPropertyId = 0;
    lastObjectId = 0;
    buffer: Buffer = null;
    index = 0;

    public encode(value: object): Buffer {
        this.buffer = Buffer.allocUnsafe(8);
        this.index = 0;
        for (const p in value) {
            if (value.hasOwnProperty(p)) {
                this.write(value[p], p);
            }
        }
        this.addByte(0);
        return Buffer.from(this.buffer.subarray(0, this.index));
    }

    private write(value: any, propertyName: string) {
        const propertyId = propertyName ? this.getOrAddProperty(propertyName) : 0x8000;
        let header = (propertyId & 0x100) ? 0x80 : 0x00;

        if (value == null) {
            header |= 0x01;
            this.addByte(header);
            this.addProperty(propertyId, propertyName);
            return;
        }

        const type = typeof value;

        if (type === 'boolean') {
            header |= value ? 0x03 : 0x02;
            this.addByte(header);
            this.addProperty(propertyId, propertyName);
            return;
        }

        if (type === 'number' || type === 'bigint') {
            if (!Number.isInteger(value)) {
                header |= 0x06;
                this.addByte(header);
                this.addProperty(propertyId, propertyName);
                this.addFloat(value);
            } else if (value >= 0 && value < 24) {
                header |= 0x20;
                header |= value;
                this.addByte(header);
                this.addProperty(propertyId, propertyName);
            } else {
                header |= 0x38;
                if (value < 0) {
                    header |= 0x04;
                    value += 0x100000000;
                    value ^= 0xffffffff;
                }
                if (value < 0x100) {
                    this.addByte(header);
                    this.addProperty(propertyId, propertyName);
                    this.addByte(value);
                } else if (value < 0x10000) {
                    header |= 0x01;
                    this.addByte(header);
                    this.addProperty(propertyId, propertyName);
                    this.addUInt16(value);
                } else {
                    header |= 0x02;
                    this.addByte(header);
                    this.addProperty(propertyId, propertyName);
                    this.addUInt32(value);
                }
            }
            return;
        }

        if (value.$id != null) {
            header |= 0x08;
            const v = this.getOrAddObjectId(value.$id);
            header |= (v >> 8) & 0x07;
            this.addByte(header);
            this.addProperty(propertyId, propertyName);
            this.addByte(v & 0xff);
            if (v === 0 || v === 0x7ff) {
                for (let i = 0; i < value.$id.length; i += 2) {
                    this.addByte(parseInt(value.$id.substr(i, 2), 16));
                }
            }
            return;
        }

        if (value instanceof Uint8Array) {
            const size = value.byteLength;
            if (size !== 0 && size < 0x1f) {
                header |= 0x40;
                header |= size;
                this.addByte(header);
                this.addProperty(propertyId, propertyName);
                this.addBinary(value);
            } else if (size < 0x10000) {
                header |= 0x40;
                this.addByte(header);
                this.addProperty(propertyId, propertyName);
                this.addUInt16(size);
                this.addBinary(value);
            } else if (size < 0x100000000) {
                header |= 0x5f;
                this.addByte(header);
                this.addProperty(propertyId, propertyName);
                this.addUInt32(size);
                this.addBinary(value);
            }
            return;
        }

        if (typeof value === 'string' || value instanceof String) {
            const index = this.index;
            this.addByte(0);
            this.addProperty(propertyId, propertyName);
            const length = this.addString(value.toString());
            if (length !== 0 && length < 0x20) {
                header |= 0x60;
                header |= length;
            } else {
                header |= 0x60;
                this.addByte(0);
            }
            this.buffer[index] = header;
            return;
        }

        if (value instanceof Array) {
            header |= 0x05;
            this.addByte(header);
            this.addProperty(propertyId, propertyName);
            for (const v of value) {
                this.write(v, null);
            }
            this.addByte(0);
            return;
        }

        if (type === 'object') {
            header |= 0x04;
            this.addByte(header);
            this.addProperty(propertyId, propertyName);
            for (const p in value) {
                if (value.hasOwnProperty(p)) {
                    this.write(value[p], p);
                }
            }
            this.addByte(0);
            return;
        }
    }

    private ensureBufferSize(size: number) {
        if (size > this.buffer.length) {
            const buffer = Buffer.allocUnsafe((size * 1.5) | 0);
            this.buffer.copy(buffer, 0, 0, this.index);
            this.buffer = buffer;
        }
    }

    private addByte(value: number) {
        this.ensureBufferSize(this.index + 1);
        this.buffer.writeUInt8(value, this.index++);
    }

    private addUInt16(value: number) {
        this.ensureBufferSize(this.index + 2);
        this.buffer.writeUInt16BE(value, this.index);
        this.index += 2;
    }

    private addUInt32(value: number) {
        this.ensureBufferSize(this.index + 4);
        this.buffer.writeUInt32BE(value, this.index);
        this.index += 4;
    }

    private addFloat(value: number) {
        this.ensureBufferSize(this.index + 4);
        this.buffer.writeFloatLE(value, this.index);
        this.index += 4;
    }

    private addProperty(value: number, propertyName: string) {
        if (propertyName) {
            this.addByte(value & 0xff);
            if (value === 0 || value === 0x1ff) {
                this.addString(propertyName);
                this.addByte(0);
            }
        }
    }

    private addString(value: string): number {
        this.ensureBufferSize(this.index + value.length);
        const length = this.buffer.write(value, this.index, value.length, 'utf-8');
        this.index += length;
        return length;
    }

    private addBinary(value: Uint8Array) {
        this.ensureBufferSize(this.index + value.length);
        const length = Buffer.from(value).copy(this.buffer, this.index);
        this.index += length;
    }

    private getOrAddProperty(propertyName: string) {
        const i = this.properties[propertyName];
        if (i != null) {
            return i;
        }
        let result = 0;
        if (++this.lastPropertyId === 0x1ff) {
            this.properties = {};
            this.lastPropertyId = 1;
            result = 0x1ff;
        }
        this.properties[propertyName] = this.lastPropertyId;
        return result;
    }

    private getOrAddObjectId(key: string) {
        const i = this.objects[key];
        if (i != null) {
            return i;
        }
        let result = 0;
        if (++this.lastObjectId === 0x7ff) {
            this.objects = {};
            this.lastObjectId = 1;
            result = 0x7ff;
        }
        this.objects[key] = this.lastObjectId;
        return result;
    }
}
