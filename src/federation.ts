// Copyright Felix Ungman. All rights reserved.
// Licensed under GNU General Public License version 3 or later.

import {ObjectChange, ObjectChangesMessage} from './messages';
import {Buffer} from 'buffer';
import {RuntimeSession} from './runtime-session';
import {generateObjectId} from './object-id';
import {defineObjectProperty, ObjectRef, Value} from './object';
import {ObjectClass} from './object-class';


export class Federation {
    private objectInstances: { [id: string]: ObjectRef } = {};
    private objectClasses: {[name: string]: ObjectClass<ObjectRef>} = {};
    private eventsObservers: { [name: string]: (params: Value) => void } = {};
    private serviceProviders: { [name: string]: (params: Value) => Promise<any> | void } = {};

    private static _isObject(value) {
        return value && typeof value === 'object';
    }

    constructor(private runtime: RuntimeSession, public federationId: string) {
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
