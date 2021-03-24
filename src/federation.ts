// Copyright Felix Ungman. All rights reserved.
// Licensed under GNU General Public License version 3 or later.

import {Buffer} from 'buffer';
import {Entity, Value} from 'warstage-entities';
import {ObjectChange, ObjectChangesMessage} from './messages';
import {RuntimeSession} from './runtime-session';
import {generateObjectId} from './object-id';
import {defineObjectProperty, ObjectClass } from './object';


export class Federation {
    private objectInstances: { [id: string]: Entity<any> } = {};
    private undefinedInstances: Entity<any>[] = [];
    private objectClasses: {[name: string]: ObjectClass<any>} = {};
    private eventsObservers: { [name: string]: (params: Value) => void } = {};
    private serviceProviders: { [name: string]: (params: Value) => Promise<any | void> } = {};

    private static _isObject(value) {
        return value && typeof value === 'object';
    }

    constructor(private runtime: RuntimeSession, public federationId: string) {
    }

    /*leaveExecution() {
        this.federationId = null;
    }*/

    public objects<T>(className): ObjectClass<T> {
        let objectClass = this.objectClasses[className] as ObjectClass<T>;
        if (!objectClass) {
            objectClass = new ObjectClass<T>(this, className);
            this.objectClasses[className] = objectClass;
        }
        return objectClass;
    }

    findObject(predicate: (x: any) => boolean): Entity<any> {
        for (const id in this.objectInstances) {
            if (this.objectInstances.hasOwnProperty(id)) {
                if (predicate(this.objectInstances[id])) {
                    return this.objectInstances[id];
                }
            }
        }
        return null;
    }

    getObjectOrNull(id: string): Entity<any> {
        return this.objectInstances.hasOwnProperty(id) ? this.objectInstances[id] : null;
    }

    /*getObjectOrUndefined(id: string): ObjectRef {
        return this.objectInstances.hasOwnProperty(id)
            ? this.objectInstances[id]
            : this.getOrCreateObjectRef(id);
    }*/

    public processNativeChanges(message: ObjectChangesMessage) {
        const objectInstance = this.getOrCreateObjectRef(message.i.$id) as any;
        if (!objectInstance._class) {
            objectInstance._class = message.c;
        }
        if (!objectInstance.$class) {
            const objectClass = this.objects(objectInstance._class);
            objectInstance.$class = objectClass;
            for (const propertyName of objectClass.propertyNames) {
                defineObjectProperty(this, objectInstance, propertyName);
                objectInstance[propertyName + '$changed'] = false;
            }
        }

        const created = message.t === ObjectChange.CREATE;
        const deleted = message.t === ObjectChange.DELETE;

        if (created) {
            if (objectInstance.$defined) {
                // console.warn('object instance already created');
            } else {
                this.undefinedInstances.push(objectInstance);
            }
        } else if (deleted) {
            objectInstance._defined = false;
            objectInstance._defined$changed = true;
        }

        const properties = message.p;
        if (properties) {
            for (const key in properties) {
                if (properties.hasOwnProperty(key)) {
                    defineObjectProperty(this, objectInstance, key);
                    const privateName = '-' + key;
                    objectInstance[privateName] = this.decodeObjectIds(properties[key].v);
                    if (!created) {
                        objectInstance[key + '$changed'] = true;
                    }
                }
            }
        }

        if (deleted || objectInstance.$defined) {
            objectInstance.$class.subject.next(objectInstance);
            objectInstance._defined$changed = false;
        }

        if (deleted) {
            delete this.objectInstances[message.i.$id];
            const index = this.undefinedInstances.findIndex(x => x === objectInstance);
            if (index !== -1) {
                delete this.undefinedInstances[index];
            }
        }

        if (properties) {
            for (const key in properties) {
                if (properties.hasOwnProperty(key)) {
                    objectInstance[key + '$changed'] = false;
                }
            }
        }

        this.defineUndefinedInstances();
    }

    defineUndefinedInstances() {
        while (true) {
            const index = this.undefinedInstances.findIndex(x => !this.objectHasUndefinedRefs(x));
            if (index === -1) {
                return;
            }
            const objectInstance = this.undefinedInstances[index] as any;
            this.undefinedInstances.splice(index, 1);

            for (const key in objectInstance) {
                if (objectInstance.hasOwnProperty(key) && !key.startsWith('$') && key.endsWith('$changed')) {
                    objectInstance[key] = true;
                }
            }

            objectInstance._defined = true;
            objectInstance.$class.subject.next(objectInstance);

            for (const key in objectInstance) {
                if (objectInstance.hasOwnProperty(key) && !key.startsWith('$') && key.endsWith('$changed')) {
                    objectInstance[key] = false;
                }
            }
        }
    }

    createObjectInstance(className: string): Entity<any> {
        const result = this.getOrCreateObjectRef(generateObjectId()) as any;
        result._class = className;
        result.$class = this.objects(className);
        result._defined = true;
        this.runtime.sendObjectChangesToRuntime(this.federationId, result, className,
            ObjectChange.CREATE, null, null);
        return result;
    }

    objectPropertyChanged(object: Entity<any>, propertyName: string, value: Value) {
        this.runtime.sendObjectChangesToRuntime(this.federationId, object, object._class,
            ObjectChange.UPDATE, propertyName, value);
    }

    private getOrCreateObjectRef(id: string): Entity<any> {
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
                for (const key in value as any) {
                    if (value.hasOwnProperty(key)) {
                        result[key] = this.decodeObjectIds(value[key]);
                    }
                }
                return result;
            }
        }
        return value;
    }

    private objectHasUndefinedRefs(objectInstance: Entity<any>): boolean {
        for (const property in objectInstance as any) {
            if (objectInstance.hasOwnProperty(property)
                && property.startsWith('-')
                && objectInstance.hasOwnProperty(property.substr(1) + '$changed')
                && this.valueHasUndefinedRefs(objectInstance[property] as Value)) {
                return true;
            }
        }
        return false;
    }

    private valueHasUndefinedRefs(value: Value): boolean {
        if (value == null) {
            return false;
        }
        const id = (value as any).$id;
        if (id != null) {
            return !this.objectInstances.hasOwnProperty(id) || !this.objectInstances[id]._defined;
        }
        if (value instanceof Buffer) {
            return false;
        }
        if (value instanceof Array) {
            return value.some(x => this.valueHasUndefinedRefs(x));
        }
        if (Federation._isObject(value)) {
            for (const property in value as any) {
                if (value.hasOwnProperty(property) && this.valueHasUndefinedRefs(value[property])) {
                    return true;
                }
            }
            return false;
        }
        return false;
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

    provideService(service: string, serviceProvider: (params: any) => Promise<any | void>) {
        this.serviceProviders[service] = serviceProvider;
    }

    requestService(service: string, value: Value): Promise<any | void> {
        return this.requestLocalService(service, value)
            || this.runtime.sendServiceRequestToRuntime(this.federationId, service, value);
    }

    requestLocalService(service: string, value: Value): Promise<any | void> | null {
        const serviceProvider = this.serviceProviders[service];
        return serviceProvider ? serviceProvider(value) : null;
    }
}
