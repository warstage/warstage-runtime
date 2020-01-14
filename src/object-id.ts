// Copyright Felix Ungman. All rights reserved.
// Licensed under GNU General Public License version 3 or later.

import {Buffer} from 'buffer';

let ObjectIdIndex = 0;

function getInc() {
    return (ObjectIdIndex = (ObjectIdIndex + 1) % 0xffffff);
}

function insecureRandomBytes(size) {
    const result = new Uint8Array(size);
    for (let i = 0; i < size; ++i) {
        result[i] = Math.floor(Math.random() * 256);
    }
    return result;
}

const PROCESS_UNIQUE = insecureRandomBytes(5);

export function generateObjectId(): string {
    // tslint:disable-next-line:no-bitwise
    const time = ~~(Date.now() / 1000);

    const inc = getInc();
    const buffer = Buffer.alloc(12);

    // 4-byte timestamp
    // tslint:disable-next-line:no-bitwise
    buffer[3] = time & 0xff;
    // tslint:disable-next-line:no-bitwise
    buffer[2] = (time >> 8) & 0xff;
    // tslint:disable-next-line:no-bitwise
    buffer[1] = (time >> 16) & 0xff;
    // tslint:disable-next-line:no-bitwise
    buffer[0] = (time >> 24) & 0xff;

    // 5-byte process unique
    buffer[4] = PROCESS_UNIQUE[0];
    buffer[5] = PROCESS_UNIQUE[1];
    buffer[6] = PROCESS_UNIQUE[2];
    buffer[7] = PROCESS_UNIQUE[3];
    buffer[8] = PROCESS_UNIQUE[4];

    // 3-byte counter
    // tslint:disable-next-line:no-bitwise
    buffer[11] = inc & 0xff;
    // tslint:disable-next-line:no-bitwise
    buffer[10] = (inc >> 8) & 0xff;
    // tslint:disable-next-line:no-bitwise
    buffer[9] = (inc >> 16) & 0xff;

    return buffer.toString('hex');
}

