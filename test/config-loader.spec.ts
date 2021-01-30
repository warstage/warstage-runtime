// Copyright Felix Ungman. All rights reserved.
// Licensed under GNU General Public License version 3 or later.

import {ConfigLoader} from '../src/config-loader';

describe('ConfigLoader', () => {
    it('should load existing objects', async () => {
        const loader = new ConfigLoader(new MockObjectLoader({
            foo: { x: 1, y: 2 },
            bar: { z: 0.123 }
        }).getObjectLoader());
        expect(await loader.load('foo')).toEqual({ x: 1, y: 2 });
        expect(await loader.load('bar')).toEqual({ z: 0.123 });
    });

    it('should return null for missing objects', async () => {
        const loader = new ConfigLoader(new MockObjectLoader({
            foo: { x: 1, y: 2 }
        }).getObjectLoader());
        expect(await loader.load('bar')).toEqual(null);
    });

    it('should save error for missing objects', async () => {
        const loader = new ConfigLoader(new MockObjectLoader({
            foo: { x: 1, y: 2 }
        }).getObjectLoader());
        await loader.load('bar');
        expect(loader.errors.bar).toBeInstanceOf(Error);
        expect(loader.errors.bar.toString()).toEqual('Error: bar not found');
    });

    it('should cache existing objects', async () => {
        const mock = new MockObjectLoader({
            foo: { x: 1, y: 2 }
        });
        const loader = new ConfigLoader(mock.getObjectLoader());
        expect(mock.counter.foo).toBeUndefined();
        await loader.load('foo');
        expect(mock.counter.foo).toEqual(1);
        await loader.load('foo');
        expect(mock.counter.foo).toEqual(1);
    });

    it('should cache missing objects', async () => {
        const mock = new MockObjectLoader({
            foo: { x: 1, y: 2 }
        });
        const loader = new ConfigLoader(mock.getObjectLoader());
        expect(mock.counter.bar).toBeUndefined();
        await loader.load('bar');
        expect(mock.counter.bar).toEqual(1);
        await loader.load('bar');
        expect(mock.counter.bar).toEqual(1);
    });

    it('should load referenced objects', async () => {
        const mock = new MockObjectLoader({
            foo: { x: 1 },
            bar: { z: 0.123, f: '<foo>' },
            baz: { b: ['<foo>', '<bar>'] }
        });
        const loader = new ConfigLoader(mock.getObjectLoader());
        expect(await loader.load('bar')).toEqual({ z: 0.123, f: { x: 1 } } );
        expect(await loader.load('baz')).toEqual({ b: [{ x: 1 }, { z: 0.123, f: { x: 1 } }] } );
    });
});

class MockObjectLoader {
    counter: {[path: string]: number} = {};
    constructor(public objects: {[path: string]: object} = {}) {
    }
    getObjectLoader() {
        return async (path: string) => {
            this.counter[path] = 1 + (this.counter[path] || 0);
            if (this.objects.hasOwnProperty(path)) {
                return this.objects[path];
            } else {
                throw new Error(`${path} not found`);
            }
        }
    }
};
