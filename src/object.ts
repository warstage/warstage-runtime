// Copyright Felix Ungman. All rights reserved.
// Licensed under GNU General Public License version 3 or later.

import getOwnPropertyDescriptor = Reflect.getOwnPropertyDescriptor;
import {Federation} from './federation';
import {PartialObserver, Subject, Subscribable, Subscription} from 'rxjs';

export interface ValueArray extends Array<Value> {}
export interface ValueStruct { [key: string]: Value; }
export type Value = undefined | null | boolean | number | string
    | Uint8Array | ObjectRef | ValueArray | ValueStruct
    |  { x: number; y: number }
    |  { x: number; y: number; z: number };

export function defineObjectProperty(federation: Federation, object: ObjectRef, propertyName: string) {
    if (!getOwnPropertyDescriptor(object, propertyName)) {
        const privateName = '-' + propertyName;
        Object.defineProperty(object, propertyName, {
            enumerable: true,
            get: (): Value | undefined => {
                return object[privateName] as Value | undefined;
            },
            set: (value: Value) => {
                object[privateName] = value;
                federation.objectPropertyChanged(object, propertyName, value);
            }
        });
    }
}

export interface ObjectRef {
    // tslint:disable-next-line:variable-name
    readonly $id: string;

    // tslint:disable-next-line:variable-name
    readonly _class: string;
    readonly $class: ObjectClass<ObjectRef>;

    [key: string]: Value | string | ObjectClass<ObjectRef> | (() => any);

    readonly $defined: boolean;
    readonly $defined$changed: boolean;

    readonly $deletable: boolean;
    $deletable$wanted: boolean;

    $delete();
}

export interface Launcher extends ObjectRef {
    readonly lobbyId: string;
    playerId: string;
}

export class ObjectClass<T extends ObjectRef> implements Subscribable<T>, Iterable<T> {
    readonly subject = new Subject<T>();
    readonly propertyNames: string[] = [];

    constructor(public readonly federation: Federation, public readonly name: string) {
    }

    define(propertyNames: string[]) {
        for (const propertyName of propertyNames) {
            this.propertyNames.push(propertyName);
        }
    }

    create(properties?: {[key: string]: Value}): T {
        const result = this.federation.createObjectInstance(this.name);
        for (const propertyName of this.propertyNames) {
            defineObjectProperty(this.federation, result, propertyName);
        }
        if (properties) {
            for (const propertyName in properties) {
                if (properties.hasOwnProperty(propertyName)) {
                    defineObjectProperty(this.federation, result, propertyName);
                    result[propertyName] = properties[propertyName];
                }
            }
        }
        return result as T;
    }

    subscribe(observer?: PartialObserver<T> | null | undefined | ((value: T) => void),
              error?: null | undefined | ((error: any) => void),
              complete?: () => void): Subscription {
        // @ts-ignore
        return this.subject.subscribe(observer, error, complete);
    }

    *[Symbol.iterator](): Iterator<T> {
        const objectInstances = (this.federation as any).objectInstances as { [id: string]: ObjectRef };
        for (const id in objectInstances) {
            if (objectInstances.hasOwnProperty(id)) {
                const objectInstance = objectInstances[id];
                if ((objectInstance as any)._defined && objectInstance.$class === this) {
                    yield objectInstance as T;
                }
            }
        }
    }

    find(predicate: (objectInstance: T) => boolean) {
        for (const objectInstance of this) {
            if (predicate(objectInstance)) {
                return objectInstance;
            }
        }
        return null;
    }
}
