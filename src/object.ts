// Copyright Felix Ungman. All rights reserved.
// Licensed under GNU General Public License version 3 or later.

import getOwnPropertyDescriptor = Reflect.getOwnPropertyDescriptor;
import {Federation} from './federation';

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

declare class ObjectClass<T extends ObjectRef> {
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
