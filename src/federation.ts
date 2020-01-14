// Copyright Felix Ungman. All rights reserved.
// Licensed under GNU General Public License version 3 or later.

import {ObjectChange, ObjectChangesMessage} from './messages';
import {PartialObserver, Subject, Subscribable, Subscription} from 'rxjs';
import getOwnPropertyDescriptor = Reflect.getOwnPropertyDescriptor;
import {Buffer} from 'buffer';

export interface RuntimeInterface {
    sendObjectChangesToRuntime(federationId: string, objectId: {$id: string}, className: string, change: number,
                               propertyName: string, value: Value);
    sendEventNotificationToRuntime(federationId: string, eventName: string, value: Value);
    sendServiceRequestToRuntime(federationId: string, service: string, value: Value): Promise<any>;
}

export interface ValueArray extends Array<Value> {}
export interface ValueStruct { [key: string]: Value; }
export type Value = undefined | null | boolean | number | string
    | Uint8Array | ObjectRef | ValueArray | ValueStruct
    |  { x: number; y: number }
    |  { x: number; y: number; z: number };


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

function defineObjectProperty(federation: Federation, object: ObjectRef, propertyName: string) {
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

function generateObjectId(): string {
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

export class Federation {
    private objectInstances: { [id: string]: ObjectRef } = {};
    private objectClasses: {[name: string]: ObjectClass<ObjectRef>} = {};
    private eventsObservers: { [name: string]: (params: Value) => void } = {};
    private serviceProviders: { [name: string]: (params: Value) => Promise<any> | void } = {};

    private static _isObject(value) {
        return value && typeof value === 'object';
    }

    constructor(private runtime: RuntimeInterface, public federationId: string) {
    }

    /*leaveExecution() {
        this.federationId = null;
    }*/

    public objects<T extends ObjectRef>(className): ObjectClass<T> {
        let objectClass = this.objectClasses[className] as ObjectClass<T>;
        if (!objectClass) {
            objectClass = new ObjectClass<T>(this, className);
            this.objectClasses[className] = objectClass;
        }
        return objectClass;
    }

    findObject(predicate: (x: any) => boolean): ObjectRef {
        for (const id in this.objectInstances) {
            if (this.objectInstances.hasOwnProperty(id)) {
                if (predicate(this.objectInstances[id])) {
                    return this.objectInstances[id];
                }
            }
        }
        return null;
    }

    getObjectOrNull(id: string): ObjectRef {
        return this.objectInstances.hasOwnProperty(id) ? this.objectInstances[id] : null;
    }

    /*getObjectOrUndefined(id: string): ObjectRef {
        return this.objectInstances.hasOwnProperty(id)
            ? this.objectInstances[id]
            : this.getOrCreateObjectRef(id);
    }*/

    public processNativeChanges(message: ObjectChangesMessage) {
        const objectInstance = this.getOrCreateObjectRef(message.i.$id);
        if (!objectInstance._class) {
            (objectInstance as any)._class = message.c;
        }
        const objectClass = this.objects(objectInstance._class);
        if (!objectInstance.$class) {
            (objectInstance as any).$class = objectClass;
            for (const propertyName of objectClass.propertyNames) {
                defineObjectProperty(this, objectInstance, propertyName);
            }
        }

        switch (message.t) {
            case ObjectChange.CREATE:
                if (objectInstance.$defined) {
                    // console.warn('object instance already created');
                } else {
                    (objectInstance as any)._defined = true;
                    (objectInstance as any)._defined$changed = true;
                }
                break;
            case ObjectChange.DELETE:
                (objectInstance as any)._defined = false;
                (objectInstance as any)._defined$changed = true;
                break;
        }

        const properties = message.p;
        if (properties) {
            for (const propertyName in properties) {
                if (properties.hasOwnProperty(propertyName)) {
                    defineObjectProperty(this, objectInstance, propertyName);
                    const privateName = '-' + propertyName;
                    objectInstance[privateName] = this.decodeObjectIds(properties[propertyName].v);
                    objectInstance[propertyName + '$changed'] = true;
                }
            }
        }

        objectClass.subject.next(objectInstance);

        if (message.t === ObjectChange.DELETE) {
            delete this.objectInstances[message.i.$id];
        }

        (objectInstance as any)._defined$changed = false;

        if (properties) {
            for (const propertyName in properties) {
                if (properties.hasOwnProperty(propertyName)) {
                    objectInstance[propertyName + '$changed'] = false;
                }
            }
        }
    }

    createObjectInstance(className: string): ObjectRef {
        const result = this.getOrCreateObjectRef(generateObjectId());
        (result as any)._class = className;
        (result as any).$class = this.objects(className);
        (result as any)._defined = true;
        this.runtime.sendObjectChangesToRuntime(this.federationId, result, className,
            ObjectChange.CREATE, null, null);
        return result;
    }

    objectPropertyChanged(object: ObjectRef, propertyName: string, value: Value) {
        this.runtime.sendObjectChangesToRuntime(this.federationId, object, object._class,
            ObjectChange.UPDATE, propertyName, value);
    }

    private getOrCreateObjectRef(id: string): ObjectRef {
        let objectInstance = this.objectInstances[id];
        if (!objectInstance) {
            const object = {
                _defined: false,
                _defined$changed: false
            } as any;
            Object.defineProperty(object, '$id', {
                get: (): string => id
            });
            Object.defineProperty(object, '$defined', {
                get: (): boolean => object._defined
            });
            Object.defineProperty(object, '$defined$changed', {
                get: (): boolean => object._defined$changed
            });
            Object.defineProperty(object, '$deletable', {
                get: (): boolean => false
            });
            Object.defineProperty(object, '$deletable$wanted', {
                get: (): boolean => false,
                // set: (value: boolean) => {}
            });
            Object.defineProperty(object, '$delete', {
                value: () => {
                    this.runtime.sendObjectChangesToRuntime(this.federationId, {$id: id}, object._class, ObjectChange.DELETE, null, null);
                    object._defined = false;
                }
            });
            objectInstance = object;
            this.objectInstances[id] = objectInstance;
        }
        return objectInstance;
    }

    public decodeObjectIds(value: Value) {
        if (value != null) {
            const id = (value as any).$id;
            if (id != null) {
                return this.getOrCreateObjectRef(id);
            }
            if (value instanceof Buffer) {
                return value;
            }
            if (value instanceof Array) {
                const result = [];
                value.forEach(x => result.push(this.decodeObjectIds(x)));
                return result;
            }
            if (Federation._isObject(value)) {
                const result = {};
                for (const property in value as any) {
                    if (value.hasOwnProperty(property)) {
                        result[property] = this.decodeObjectIds(value[property]);
                    }
                }
                return result;
            }
        }
        return value;
    }

    // Events

    observeEvents(event: string, observer: (params: any) => void) {
        this.eventsObservers[event] = observer;
    }

    dispatchEvent(event: string, params: Value) {
        this.dispatchEventScript(event, params);
        this.runtime.sendEventNotificationToRuntime(this.federationId, event, params);
    }

    public dispatchEventScript(event: string, params: Value) {
        const eventObserver = this.eventsObservers[event];
        if (eventObserver) {
            eventObserver(params);
        }
    }

    // Services

    provideService(service: string, serviceProvider: (params: any) => Promise<any> | void) {
        this.serviceProviders[service] = serviceProvider;
    }

    requestService(service: string, value: Value): Promise<any> {
        return this.requestLocalService(service, value)
            || this.runtime.sendServiceRequestToRuntime(this.federationId, service, value);
    }

    requestLocalService(service: string, value: Value): Promise<any> | void {
        const serviceProvider = this.serviceProviders[service];
        return serviceProvider ? serviceProvider(value) : null;
    }
}
