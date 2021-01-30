// Copyright Felix Ungman. All rights reserved.
// Licensed under GNU General Public License version 3 or later.

export type ObjectLoader = (path: string) => Promise<object>;

export class ConfigLoader {
    private objectCache: {[path: string]: Promise<object>} = {};
    public errors: {[path: string]: any} = {};

    constructor(private objectLoader: ObjectLoader) {
    }

    load(path: string): Promise<object> {
        if (this.errors.hasOwnProperty(path)) {
            return null;
        }
        if (this.objectCache.hasOwnProperty(path)) {
            return this.objectCache[path];
        }
        const promise = this.loadAndResolve(path);
        this.objectCache[path] = promise;
        return promise;
    }

    private async loadAndResolve(path: string): Promise<object> {
        try {
            const result = await this.objectLoader(path);
            return await this.resolve(result);
        } catch (e) {
            this.errors[path] = e;
            return null;
        }
    }

    private async resolve(value: any): Promise<any> {
        if (value == null) {
            return value;
        }
        if (typeof value === 'string' || value instanceof String) {
            if (value.startsWith('<') && value.endsWith('>')) {
                const result = await this.load(value.substring(1, value.length - 1));
                return result || value;
            }
        }
        if (value instanceof Array) {
            const result = [];
            for (const v of value) {
                result.push(await this.resolve(v));
            }
            return result;
        }
        if (typeof value === 'object') {
            const result = {};
            for (const p in value) {
                if (value.hasOwnProperty(p)) {
                    result[p] = await this.resolve(value[p]);
                }
            }
            return result;
        }
        return value;
    }
}