// Copyright Felix Ungman. All rights reserved.
// Licensed under GNU General Public License version 3 or later.

import {defineObjectProperty, ObjectRef, Value} from './object';
import {PartialObserver, Subject, Subscribable, Subscription} from 'rxjs';
import {Federation} from './federation';

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
        for (const key in objectInstances) {
            if (objectInstances.hasOwnProperty(key)) {
                const objectInstance = objectInstances[key];
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
