// Copyright Felix Ungman. All rights reserved.
// Licensed under GNU General Public License version 3 or later.

import getOwnPropertyDescriptor = Reflect.getOwnPropertyDescriptor;
import {Federation} from './federation';
import {PartialObserver, Subject, Subscription} from 'rxjs';
import {Entity, EntityClass, Value} from 'warstage-entities';



export function defineObjectProperty(federation: Federation, object: Entity<any>, propertyName: string) {
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


export class ObjectClass<T> implements EntityClass<T> {
    readonly subject = new Subject<Entity<T>>();
    readonly propertyNames: string[] = [];

    constructor(public readonly federation: Federation, public readonly name: string) {
    }

    define(propertyNames: string[]) {
        for (const propertyName of propertyNames) {
            this.propertyNames.push(propertyName);
        }
    }

    create(properties?: {[key: string]: Value}): Entity<T> {
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
        return result as Entity<T>;
    }

    subscribe(observer?: PartialObserver<Entity<T>> | null | undefined | ((value: Entity<T>) => void),
              error?: null | undefined | ((error: any) => void),
              complete?: () => void): Subscription {
        // @ts-ignore
        return this.subject.subscribe(observer, error, complete);
    }

    *[Symbol.iterator](): Iterator<Entity<T>> {
        const objectInstances = (this.federation as any).objectInstances as { [id: string]: Entity<T> };
        for (const id in objectInstances) {
            if (objectInstances.hasOwnProperty(id)) {
                const objectInstance = objectInstances[id];
                if ((objectInstance as any)._defined && objectInstance.$class === this) {
                    yield objectInstance as Entity<T>;
                }
            }
        }
    }

    find(predicate: (objectInstance: Entity<T>) => boolean) {
        for (const objectInstance of this) {
            if (predicate(objectInstance)) {
                return objectInstance;
            }
        }
        return null;
    }
}
