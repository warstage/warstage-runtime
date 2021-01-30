// Copyright Felix Ungman. All rights reserved.
// Licensed under GNU General Public License version 3 or later.

export class AssetLoader {
    static getBasePath(pathname: string): string {
        const i = pathname.lastIndexOf('/');
        return i === -1 ? '' : pathname.substring(0, i + 1);
    }

    static getBaseHref(location: Location) {
        return location.protocol + '//'
            + location.hostname + (location.port ? ':' + location.port : '')
            + AssetLoader.getBasePath(location.pathname);
    }

    static getDefaultBaseHref(path: string) {
        return AssetLoader.getBaseHref(window.location) + path;
    }

    static loadFromHttp(url: string): Promise<{data: Uint8Array}> {
        return new Promise((resolve, reject) => {
            const request = new XMLHttpRequest();
            request.open('GET', url, true);
            request.responseType = 'arraybuffer';
            request.onload = () => {
                const arrayBuffer = request.response;
                if (arrayBuffer) {
                    resolve({data: new Uint8Array(arrayBuffer)});
                } else {
                    reject('no response');
                }
            };
            request.onabort = (e) => {
                reject('aborted loading ' + url);
            };
            request.onerror = (e) => {
                reject('error while loading ' + url);
            };
            request.send(null);
        });
    }

    static loadJsonFromHttp(url: string): Promise<object> {
        return new Promise((resolve, reject) => {
            const request = new XMLHttpRequest();
            request.open('GET', url, true);
            request.responseType = 'json';
            request.onload = () => {
                resolve(request.response);
            };
            request.onabort = (e) => {
                reject('aborted loading ' + url);
            };
            request.onerror = (e) => {
                reject('error while loading ' + url);
            };
            request.send(null);
        });
    }

    static getServiceProvider(baseHref: string = AssetLoader.getDefaultBaseHref('assets/'))
        : (params: {name: string}) => Promise<{data: Uint8Array}> {
        return params =>AssetLoader.loadFromHttp(baseHref + params.name);
    }

    static getJsonLoader(baseHref: string = AssetLoader.getDefaultBaseHref('config/'))
        : (path: string) => Promise<object> {
        return path => AssetLoader.loadJsonFromHttp(baseHref + path);
    }
}
