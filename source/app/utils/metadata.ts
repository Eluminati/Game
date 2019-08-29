import { Binding } from "~bdo/lib/Binding";
interface IMDKeys<T extends object = any> {
    /**
     * Used to go back to normal functionality on object creation.
     * Used in every object, which is decorated with baseConstructor and in
     * the decorators property, attribute and watched.
     *
     * @type {boolean}
     * @memberof IMetadataKeys
     */
    normalFunctionality?: boolean;

    /**
     * Used to store settings which are definitely assigned by default.
     * This metadata will be used in every Object which is decorated with
     * baseConstructor and makes use of decorators attribute, property or watched.
     * This decorators will do heavy processing and this metadata will prevent
     * unnecessary processing while construction is running.
     *
     * @type {ConstParams<T>}
     * @memberof IMetadataKeys
     */
    defaultSettings?: ConstParams<T>;

    /**
     * Used to indicate completed construction of an object decorated with baseConstructor.
     * This metadata will be read for example in reading localStorage while
     * construction is running to avoid cache overwriting.
     *
     * @type {boolean}
     * @memberof IMetadataKeys
     */
    constructionComplete?: boolean;

    /**
     * Stores the bindings of the binding initiator for each property in a map
     *
     * @type {Map<string, Binding<T, DefNonFuncPropNames<T>>>}
     * @memberof IMDKeys
     */
    initiatorBinding?: Map<string, Binding<T, DefNonFuncPropNames<T>>>;

    /**
     * Stores all bindings of a property of any object
     *
     * @type {Map<string, Array<Binding<T, DefNonFuncPropNames<T>>>>}
     * @memberof IMDKeys
     */
    bindings?: Map<DefNonFuncPropNames<T>, Array<Binding<T, DefNonFuncPropNames<T>>>>;

    /**
     * Stores the property descriptor created by the Binding class
     *
     * @type {PropertyDescriptor}
     * @memberof IMDKeys
     */
    bindingDescriptor?: PropertyDescriptor;

    /**
     * Stores the previous suffix of the namespace of a namespaced local storage
     *
     * @type {string}
     * @memberof IMDKeys
     */
    oldStorageNsSuffix?: string;

    /**
     * Stores if an attribute of a DOM element has been initialized.
     * This is used in decorators util.
     *
     * @type {IndexStructure<DefNonFuncPropNames<T>, boolean>}
     * @memberof IMDKeys
     */
    attrInitialized?: IndexStructure<DefNonFuncPropNames<T>, boolean>;

    /**
     * stores all defined properties of an object which is decorated with the
     * baseConstructor decorator and makes use of property decorator.
     *
     * @type {Array<DefNonFuncPropNames<T>>}
     * @memberof IMDKeys
     */
    definedProperties?: Array<DefNonFuncPropNames<T>>;

    /**
     * stores all defined attributes of an object which is decorated with the
     * baseConstructor decorator and makes use of attribute decorator.
     *
     * @type {Array<DefNonFuncPropNames<T>>}
     * @memberof IMDKeys
     */
    definedAttributes?: Array<DefNonFuncPropNames<T>>;

    /**
     * Indicates in a property which is NOT cached in localStorage but marked
     * as saveInLocalStorage on construction time of the corresponding object.
     *
     * @type {boolean}
     * @memberof IMDKeys
     */
    keyShouldBeUpdated?: IndexStructure<DefNonFuncPropNames<T>, boolean>;

    /**
     * Holds all timeouts of properties and attributes which are marked as "storeTemporary"
     *
     * @type {IndexStructure<DefNonFuncPropNames<T>, boolean>}
     * @memberof IMDKeys
     */
    expirationTimeout?: IndexStructure<DefNonFuncPropNames<T>, boolean>;

    /**
     * Holds information about changes in a model (or maybe other objects) in a dictionary.
     * Should be clears on save or discard
     *
     * @type {IndexStructure<DefNonFuncPropNames<T>, any>}
     * @memberof IMDKeys
     */
    unsavedChanges?: IndexStructure<DefNonFuncPropNames<T>, any>;
}

/**
 * Type save version of Reflect.defineMetadata
 *
 * @export
 * @template T
 * @param {Object} target
 * @param {T} key
 * @param {*} val
 */
export function defineMetadata<T extends object, K extends keyof IMDKeys>(target: T, key: K, val: IMDKeys<T>[K]) {
    Reflect.defineMetadata(key, val, target); // tslint:disable-line
}

/**
 * Type save version of Reflect.getMetadata
 *
 * @export
 * @template T
 * @param {Object} target
 * @param {T} key
 * @returns {IMDKeys[T]}
 */
export function getMetadata<T extends object, K extends keyof IMDKeys>(target: T, key: K): IMDKeys<T>[K] {
    return Reflect.getMetadata(key, target); // tslint:disable-line
}

/**
 * Just a wrapper of Reflect.defineMetadata to avoid massive use of  // tslint:disable-line
 *
 * @export
 * @param {Object} target
 * @param {string} key
 * @param {*} value
 */
export function defineWildcardMetadata(target: Object, key: strNumSym, value: any) {
    Reflect.defineMetadata(key, value, target); // tslint:disable-line
}

/**
 * Just a wrapper of Reflect.getMetadata to avoid massive use of  // tslint:disable-line
 *
 * @export
 * @param {Object} target
 * @param {string} key
 * @returns
 */
export function getWildcardMetadata(target: Object, key: strNumSym) {
    return Reflect.getMetadata(key, target); // tslint:disable-line
}
