// Copyright Felix Ungman. All rights reserved.
// Licensed under GNU General Public License version 3 or later.

import { Compressor, Decompressor } from '../index';

describe('Compression', () => {
    const check = (value: object, expected1: string, expected2: string) => {
        const c1 = new Compressor();
        const buffer = c1.encode(value);
        expect(buffer.toString('hex')).toBe(expected1);

        const d = new Decompressor();
        const c2 = new Compressor();
        expect(c2.encode(d.decode(buffer)).toString('hex')).toBe(expected1);

        expect(c1.encode(value).toString('hex')).toBe(expected2);
    };

    it('should compress empty document', () => {
        check({}, '00', '00');
    });

    it('should compress primitive values', () => {
        check({ x: null, y: false, z: true, w: 3.14 },
            '010078000200790003007a0006007700c3f5484000',
            '0101020203030604c3f5484000');
    });

    it('should compress integers', () => {
        check({ a: 0, b: 10, c: 100, d: 1000, e: 100000 },
            '200061002a00620038006300643900640003e83a006500000186a000',
            '20012a02380364390403e83a05000186a000');
    });

    it('should compress negative integers', () => {
        check({ a: -1, b: -100, c: -1000, d: -1000000 },
            '3c006100003c006200633d00630003e73e006400000f423f00',
            '3c01003c02633d0303e73e04000f423f00');
    });

    /*it('should compress ObjectId', () => {
        check({
                x: bson.ObjectId.createFromHexString('111122223333444455556666'),
                y: bson.ObjectId.createFromHexString('777788889999aaaabbbbcccc')
            },
            '08007800001111222233334444555566660800790000777788889999aaaabbbbcccc00',
            '08010108020200');
    });*/

    it('should compress string values', () => {
        check({
                x: 'A',
                y: 'foobar',
                z: '0123456789abcdef0123456789abcdef'
            },
            '610078004166007900666f6f62617260007a0030313233343536373839616263646566303132333435363738396162636465660000',
            '6101416602666f6f626172600330313233343536373839616263646566303132333435363738396162636465660000');
    });

    it('should compress binary values', () => {
        check({ x: new Uint8Array([65, 66, 67]) },
            '4300780041424300',
            '430141424300');
    });

    it('should compress document with array', () => {
        check({ x: [47, 62, 'ABC'] },
            '05007800382f383e634142430000',
            '0501382f383e634142430000');
    });

    it('should compress array with document', () => {
        check({ x: [{ y: 47 }] },
            '0500780004380079002f000000',
            '05010438022f000000');
    });

    it('should compress array with two documents', () => {
        check({ x: [{ y: 47 }, { z: 62 }] },
            '0500780004380079002f000438007a003e000000',
            '05010438022f000438033e000000');
    });

    it('should compress document with document', () => {
        check({ x: { y: 47 } },
            '04007800380079002f0000',
            '040138022f0000');
    });

    it('should compress document with document with document', () => {
        check({ x: { y: {z : 47 } } },
            '040078000400790038007a002f000000',
            '0401040238032f000000');
    });
});
