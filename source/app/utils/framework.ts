import { Binding } from "~bdo/lib/Binding";
import { Attribute, IAttributeParams } from "~bdo/lib/Attribute";
import { Property, IPropertyParams } from "~bdo/lib/Property";
import { Watched, IWatchedParams } from "~bdo/lib/Watched";
import { Modification } from "~bdo/lib/Modification";
import { merge, isFunction } from "~bdo/utils/util";
import { isBrowser } from "~bdo/utils/environment";
import { getMetadata, defineMetadata, getWildcardMetadata, defineWildcardMetadata } from "~bdo/utils/metadata";
import { baseConstructorFactory, IBaseConstructorOpts } from "~bdo/lib/BaseConstructor";
import getValue from "get-value";

import type { BDOModel } from "~bdo/lib/BDOModel";
import type { ClientModel } from "~client/lib/ClientModel";
import type { ServerModel } from "~server/lib/ServerModel";

import type { BDORoute } from "~bdo/lib/BDORoute";
import type { ServerRoute } from "~server/lib/ServerRoute";
import type { ClientRoute } from "~client/lib/ClientRoute";

import type { BaseComponentFactory } from "~client/lib/BaseComponent";
import type { BaseControllerFactory } from "~client/lib/BaseController";
import type { getNamespacedStorage } from "~client/utils/util";

type defPropAttrWatchConst = "definedProperties" | "definedAttributes" | "definedWatchers" | "definedBaseConstructors";
type AttrPropWatchConst = "Attribute" | "Property" | "Watched" | "BaseConstructor";
type DecoratorTypeParams<T> = T extends "BaseConstructor" ?
    IBaseConstructorOpts : T extends "Watched" ?
    IWatchedParams : T extends "Attribute" ?
    IAttributeParams : IPropertyParams;
type NewVal<T extends Record<string, any>, K extends DefNonFuncPropNames<T>> = T[K] | Binding<T, K> | Modification<any>;
type WatchAttrPropConstParams<T> = T extends "definedBaseConstructors" ?
    IBaseConstructorOpts : T extends "definedProperties" ?
    IPropertyParams : T extends "definedAttributes" ?
    IAttributeParams : T extends "definedWatchers" ? IWatchedParams : T;

export interface IGetNamespaceStorageAddition<T> {

    /**
     * @see getNamespacedStorage
     *
     * @memberof IGetNamespaceStorageAddition
     */
    getNamespacedStorage: <K extends DefNonFuncPropNames<T>, P extends DefNonFuncPropNames<T>>(key: K, nsProp?: P, forceNS?: string) => ReturnType<typeof getNamespacedStorage>;
}

export interface IWatchAttrPropSettings<T extends defPropAttrWatchConst | IAttributeParams | IPropertyParams | IWatchedParams | IBaseConstructorOpts> {
    /**
     * Parameters for the corresponding decorator
     *
     * @memberof IWatchAttrPropSettings
     */
    params?: WatchAttrPropConstParams<T>;
}

export type BaseConstructor = ReturnType<typeof baseConstructorFactory>;
export type BaseComponent = ReturnType<typeof BaseComponentFactory>;
export type BaseController = ReturnType<typeof BaseControllerFactory>;

export type BaseConstructorInstance = InstanceType<BaseConstructor>;
export type BaseComponentInstance = InstanceType<BaseComponent>;
export type BaseControllerInstance = InstanceType<BaseController>;

/**
 * Gets the previous property descriptor and sets metadata for later access and
 * identification of properties and attributes.
 *
 * @param target The class which is processed before a property descriptor will be processed
 * @param key The name of the field
 * @param mDataName The name of the meta data
 * @param params The parameters of the new upcoming property descriptor
 * @returns The new settings of the upcoming new property descriptor
 */
export function beforeDescriptor<
    T extends Record<string, any>,
    M extends defPropAttrWatchConst,
    P extends IWatchAttrPropSettings<M>,
    K extends M extends "definedBaseConstructors" ? T["name"] : DefNonFuncPropNames<T>
>(target: T, key: K, mDataName: M, params: P): P {
    // Define metadata for access to attributes for later checks
    if (!Reflect.hasMetadata(mDataName, target)) defineMetadata(target, mDataName, new Map());
    const map = getMetadata(target, mDataName) as Map<K, P>;
    const oldDecoratorSettings = map.get(key) || {};
    const settings = merge(oldDecoratorSettings, params);
    map.set(key, settings);
    return settings;
}

/**
 * Implements the getter of properties and attributes
 *
 * @template T
 * @template K
 * @param instance The instance of a class where the getter should be executed on
 * @param key The name of the field which should be processed
 * @param ns A special namespace of the field to get additional metadata e.g. "field". Default: ""
 * @returns The value of the field if available
 */
export function getter<T extends Record<string, any>, K extends DefNonFuncPropNames<T>>(instance: T, key: K, ns = ""): any | undefined {
    let stringKey = key.toString();
    if (ns) stringKey = `${ns}:${key}`;
    if (!getMetadata(instance, "normalFunctionality")) {
        const defaultSettings = getMetadata(instance, "defaultSettings") || {};
        return Reflect.get(defaultSettings, stringKey);
    }
    const mData = getWildcardMetadata(instance, stringKey);
    if (mData) return mData.valueOf();
    return undefined;
}

/**
 * Implements the setter of attribute, property and watched and does the second
 * part of the binding mechanism. First part is to initialize the Binding object.
 * Second part is to bind the components/models to each other
 *
 * @template T
 * @template K
 * @param instance The instance of a class where the key should be modified
 * @param key The name of the field which should be modified
 * @param newVal The value which should be set
 * @param ns A special namespace of the field to set additional metadata e.g. "field". Default: ""
 */
export function setter<
    T extends Record<string, any>,
    K extends DefNonFuncPropNames<T>>(instance: T, key: K, newVal?: NewVal<T, K>, ns = ""): void {

    // Modify key with namespace
    let stringKey = key.toString();
    if (ns) stringKey = `${ns}:${key}`;

    // Execute only when it is a real change
    if (!ns && instance[<K>stringKey] === newVal) return;

    // Set default setting while construction is running
    if (!getMetadata(instance, "normalFunctionality")) {
        const defaultSettings = getMetadata(instance, "defaultSettings") || {};
        Object.assign(defaultSettings, { [stringKey]: newVal });
        defineMetadata(instance, "defaultSettings", defaultSettings);
        return;
    }

    // Get Metadata of the property / attribute
    const mData = getWildcardMetadata(instance, stringKey);

    if (newVal instanceof Binding) {
        newVal.install(instance, key); // install binding
    } else mData.setValue(newVal); // Set new value to the attribute or property
}

/**
 * Creates a property descriptor which is executed by a decorator to achieve an
 * easy to understand interface which is also easy to write and guarantees a
 * standardized procedure on every change of a field.
 *
 * @param target The class (instance) where the descriptor should be set on
 * @param key The name of the field which should be replaced
 * @param type The type of the decorator which calls this function to achieve different behavior
 * @param params The parameters of the decorator type
 */
export function createDecoratorDescriptor<
    T extends Record<string, any>,
    K extends DefNonFuncPropNames<T>,
    P = DecoratorTypeParams<T>>(target: T, key: K, type: AttrPropWatchConst, params: P): void {

    const propDesc = Reflect.getOwnPropertyDescriptor(target, key);
    const stringKey = key.toString();

    Reflect.deleteProperty(target, key);
    Reflect.defineProperty(target, key, {
        get: function decoratorGetter() {
            const that: any = this;
            return getter(that, stringKey);
        },
        set: function decoratorSetter(newVal: any) {
            const that: any = this;
            const mData = getWildcardMetadata(this, key);

            // Initialize type
            let field;
            if (type === "Attribute") {
                field = new Attribute(that, stringKey, params);
            } else if (type === "Property") {
                field = new Property(that, stringKey, params);
            } else field = new Watched(that, stringKey, params);

            // Set type as metadata
            if (mData) {
                if ((mData instanceof Attribute || mData instanceof Property) && field instanceof Watched) {
                    field.setSubObject(mData);
                    defineWildcardMetadata(this, stringKey, field);
                } else if ((field instanceof Property || field instanceof Attribute) && mData instanceof Watched) {
                    if (!mData.subObject) mData.setSubObject(field);
                }
            } else defineWildcardMetadata(this, stringKey, field);
            if (((type === "Attribute" || type === "Property") && !(mData instanceof Watched)) || type === "Watched") {
                setter(that, stringKey, newVal);
            }
            if (propDesc && propDesc.set && propDesc.set.name === "decoratorSetter") propDesc.set.call(this, newVal);
        },
        enumerable: true,
        configurable: true
    });
}

/**
 * Determines if a given constructor is a BaseConstructor
 *
 * @param value The thing (what ever it is) to check if it is a BaseConstructor
 * @returns true if it is a BaseConstructor and false else
 */
export function isBaseConstructor(value: any): value is BaseConstructor {
    if (typeof value === "function" && value.name === "BaseConstructor") return true;
    if (value instanceof Object && value.constructor.name === "BaseConstructor") return true;
    return false;
}

/**
 * Checks if the given constructor (not an instance!) is a BDOModel. This is useful
 * to get type security in BDO section when an any type variable must be checked.
 *
 * @param value The thing to check if it is a model in general
 * @returns true if it is a model in general and false else
 */
export function isBDOModel(value: any): value is typeof BDOModel {
    if ("isBDOModel" in value) return true;
    return false;
}

/**
 * Checks if the given constructor (not an instance!) is a ClientModel. This is useful
 * to get type security in BDO section when an any type variable must be checked.
 *
 * @param value The thing to check if it is a ClientModel
 * @returns true if the value is a ClientModel and false else
 */
export function isClientModel(value: any): value is typeof ClientModel {
    if (isBDOModel(value) && "isClientModel" in value) return true;
    return false;
}

/**
 * Checks if the given constructor (not an instance!) is a ServerModel. This is useful
 * to get type security in BDO section when an any type variable must be checked.
 *
 * @param value The thing to check if it is a ServerModel
 * @returns true if the value is a ServerModel and false else
 */
export function isServerModel(value: any): value is typeof ServerModel {
    if (isBDOModel(value) && "isServerModel" in value) return true;
    return false;
}

/**
 * Checks if the constructor (not an instance!) is a controller for the frontend.
 * This is useful to get type security in BDO section when an any type variable
 * must be checked.
 *
 * @param value The thing to check if it is a controller or not
 * @returns true if the value is a controller and false else
 */
export function isController(value: any): value is BaseController {
    if (isBrowser() && "isBaseController" in value && !("isBaseComponent" in value)) return true;
    return false;
}

/**
 * Checks if the constructor (not an instance!) is a Component for the frontend.
 * This is useful to get type security in BDO section when an any type variable
 * must be checked.
 *
 * @param value The thing to check if it is any component
 * @returns true if the value is any component and false else
 */
export function isComponent<T = BaseComponent>(value: any): value is T {
    if (isBrowser() && "isBaseComponent" in value && "isBaseController" in value) return true;
    return false;
}

/**
 * Checks if the given value is any route
 *
 * @param value The value to check if is any route
 * @returns true if is any route and false else
 */
export function isBDORoute(value: any): value is BDORoute {
    if (value.isBDORoute) return true;
    return false;
}

/**
 * Checks if the given value is server route
 *
 * @param value The value to check if is server route
 * @returns true if is server route and false else
 */
export function isServerRoute(value: any): value is ServerRoute {
    if (isBDORoute(value) && "isServerRoute" in value) return true;
    return false;
}

/**
 * Checks if the given value is client route
 *
 * @param value The value to check if is client route
 * @returns true if is client route and false else
 */
export function isClientRoute(value: any): value is ClientRoute {
    if (isBDORoute(value) && "isClientRoute" in value) return true;
    return false;
}

/**
 * Checks if the value has a function named "getNamespacedStorage"
 *
 * @template T
 * @param value Something which should be check if it is able to provide a namespaced storage
 * @returns true if the value is able to provide a namespaced storage and false else
 */
export function canGetNamespacedStorage<T extends Record<string, any>>(value: Record<string, any>): value is T & IGetNamespaceStorageAddition<T> {
    if ("getNamespacedStorage" in value && isFunction(value.getNamespacedStorage)) return true;
    return false;
}

/**
 * Diffs an object or array depending on the previous value and new value with
 * respect to the used method and the path if given. if method and path are not
 * given, a generic version will be used.
 *
 * @param previousValue the unmodified object or a reference object
 * @param newValue the result of a modification or an object which should be compared with the reference object
 * @param path The path to the property which is modified
 * @param usedMethod The name of the method which was used to modify the object e.g. splice
 * @returns An array with added and removed elements of the object
 */
export function diffChangedObject(previousValue: Record<string, any>, newValue: Record<string, any>, path: string = "", usedMethod: string = ""): [Record<string, any>, Record<string, any>] {
    const addedElements: Record<string, any> = {};
    const removedElements: Record<string, any> = {};

    // Case added
    if (usedMethod === "push") Object.assign(addedElements, new Array(previousValue.length).concat(newValue.slice(previousValue.length, newValue.length)));
    if (usedMethod === "unshift") Object.assign(addedElements, newValue.slice(0, newValue.length - previousValue.length));

    // case removed
    if (usedMethod === "pop") Object.assign(removedElements, { [previousValue.length - 1]: previousValue[previousValue.length - 1] });
    if (usedMethod === "shift") Object.assign(removedElements, { 0: previousValue[0] });

    // case mixed
    if (usedMethod && ["splice", "fill", "copyWithin"].includes(usedMethod)) {
        const calcPrevVal = [];
        const calcChangedVal = [];

        let startIndex = 0;
        let endIndex = 0;

        let startFound = false;
        let endFound = false;

        for (let index = 0; index < Math.max(newValue.length, previousValue.length); index++) {
            const indexToUseFromBehind = previousValue.length >= newValue.length ? previousValue.length - (1 + index) : newValue.length - (1 + index);
            const lastPrevVal = previousValue.length - (1 + index) >= 0 ? previousValue[previousValue.length - (1 + index)] : undefined;
            const lastChangedVal = newValue.length - (1 + index) >= 0 ? newValue[newValue.length - (1 + index)] : undefined;

            if (!endFound) {
                if (lastChangedVal !== lastPrevVal) {
                    endIndex = indexToUseFromBehind;
                    endFound = true;
                } else {
                    calcChangedVal[indexToUseFromBehind] = lastChangedVal;
                    calcPrevVal[indexToUseFromBehind] = lastPrevVal;
                }
            }

            if (!startFound) {
                if (previousValue[index] !== newValue[index]) {
                    startIndex = index;
                    startFound = true;
                } else {
                    calcChangedVal[index] = newValue[index];
                    calcPrevVal[index] = previousValue[index];
                }
            }

            if (startFound && endFound) {
                for (let index = startIndex; index <= endIndex + (newValue.length - previousValue.length); index++) {
                    calcChangedVal[index] = newValue[index];
                }
                for (let index = startIndex; index <= endIndex + (previousValue.length - newValue.length) + (previousValue.length >= newValue.length ? 1 : 0); index++) {
                    calcPrevVal[index] = previousValue[index];
                }
                for (let index = startIndex; index < endIndex + 1; index++) {
                    const prevElement = calcPrevVal[index];
                    const changedElement = calcChangedVal[index];
                    if (prevElement) {
                        Object.assign(removedElements, { [index]: prevElement });
                        if (changedElement) Object.assign(addedElements, { [index]: changedElement });
                    } else Object.assign(addedElements, { [index]: changedElement });
                }
                break;
            }
        }
    }

    if (!usedMethod) {
        const prevElement = getValue(previousValue, path);
        const changedElement = getValue(newValue, path);
        if (prevElement) {
            Object.assign(removedElements, { [path]: prevElement });
            if (changedElement) Object.assign(addedElements, { [path]: changedElement });
        } else Object.assign(addedElements, { [path]: changedElement });
    }

    return [addedElements, removedElements];
}
