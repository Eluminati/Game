import { NullableListOptions } from "type-graphql/dist/decorators/types";
import { Modification } from "~bdo/lib/Modification";
import { getMetadata, defineMetadata } from "~bdo/utils/metadata";
import { isBrowser } from "~bdo/utils/environment";

/**
 * This parameters should only be used in models and components other objects
 * should not be effected with this behavior.
 *
 * @interface IPropertyParams
 */
export interface IPropertyParams {
    /**
     * If set > 0 the value will expire after x milliseconds.
     * NOTE: On attributes this will turn on "doNotePersist" implicitly.
     *
     * @default 0 Means will stored permanently
     * @type {number}
     */
    storeTemporary?: number;

    /**
     * If true the value will be saved in localStorage until its deletion
     * in localStorage or in redis until its deletion in redis.
     * This is useful to relieve heavy databases.
     *
     * @default false Values will NOT be saved in cache
     * @type {boolean}
     */
    saveInLocalStorage?: boolean;

    /**
     * Decides wether to be able to set values null or undefined on a property.
     * It is also used to generate a graphQL schema when used in an attribute.
     * It also has effects to storeTemporary option. If this is true the value
     * will be set to undefined and defaultSetting else.
     *
     * @default false
     * @type {boolean}
     * @memberof IPropertyParams
     */
    nullable?: boolean | NullableListOptions;
}

/**
 * Holds all the logic for the parameters of property() decorator and manages
 * getting/setting the right value.
 *
 * @export
 * @class Property
 */
export class Property<T extends object = any, K extends DefNonFuncPropNames<T> = any> implements IPropertyParams {

    /**
     * A reference to the object where this property/attribute is defined on
     *
     * @type {*}
     * @memberof Property
     */
    public object: T;

    /**
     * the name of the property/attribute on the object
     *
     * @type {string}
     * @memberof Property
     */
    public property: K | Modification<any>;

    /**
     * @inheritdoc
     *
     * @type {number}
     * @memberof Property
     */
    public storeTemporary?: number;

    /**
     * @inheritdoc
     *
     * @type {boolean}
     * @memberof Property
     */
    public saveInLocalStorage?: boolean;

    /**
     * @inheritdoc
     *
     * @type {(boolean | NullableListOptions)}
     * @memberof Property
     */
    public nullable?: boolean | NullableListOptions;

    /**
     * The value of the property / attribute
     *
     * @protected
     * @type {T[K]}
     * @memberof Property
     */
    protected value?: T[K];

    /**
     * Holds the unix timestamp for expiration
     *
     * @protected
     * @type {number}
     * @memberof Property
     */
    protected expires?: number;

    /**
     * Holds the timeout handler in case the property / attribute has an expiration
     *
     * @protected
     * @type {NodeJS.Timeout}
     * @memberof Property
     */
    protected expirationTimeout?: NodeJS.Timeout;

    constructor(object: T, property: K, params?: IPropertyParams) {
        this.object = object;
        this.property = property;
        Object.assign(this, params);
    }

    /**
     * Sets the value depending on the parameters which are passed into the
     * decorator and stops early if the value is not changed.
     *
     * @param {T[K]} value
     * @memberof Property
     */
    public setValue(value: T[K]) {
        this.doSetValue(value, true);
    }

    /**
     * Follows the convention of the valueOf() method of most native objects.
     * This method will be called by some other objects and will get a managed
     * value depending on the parameters which are passed into the decorator.
     *
     * @returns
     * @memberof Property
     */
    public valueOf() {
        const stringKey = this.property.toString();
        // Get from Reflect storage
        let value = this.value;
        // Get from localStorage if saveInLocalStorage in params
        if (this.saveInLocalStorage && "getNamespacedStorage" in this.object) {
            value = (<IndexStructure>this.object).getNamespacedStorage(stringKey);
        }
        // Execute expiration
        if (value && this.storeTemporary) {
            if (this.expires && this.expires < Date.now()) {
                const defaultSettings = getMetadata(this.object, "defaultSettings");
                value = defaultSettings && !this.nullable ? (<IndexStructure>defaultSettings)[stringKey] : undefined;
            } else value = this.value;
        }
        return value;
    }

    /**
     * Executes value setting depending on modifyValue parameter and initialization
     * properties.
     *
     * @protected
     * @param {T[K]} value
     * @param {boolean} modifyValue
     * @returns
     * @memberof Property
     */
    protected doSetValue(value: T[K], modifyValue: boolean) {
        if (this.valueOf() === value) return;
        let valueToPass = value;
        if (value instanceof Modification) valueToPass = value.valueOf();
        if (modifyValue) this.value = valueToPass;
        this.addExpiration(valueToPass);
        if (this.shouldUpdateNsStorage() && "setUpdateNamespacedStorage" in this.object) {
            (<IndexStructure>this.object).setUpdateNamespacedStorage(this.property.toString(), valueToPass);
        }
    }

    /**
     * If the value should be stored temporary in the property descriptor,
     * then here the expiration date in unix timestamp will be added.
     *
     * @protected
     * @param {T[K]} newVal
     * @returns
     * @memberof Property
     */
    protected addExpiration(value: T[K]) {
        if (value === undefined || !this.storeTemporary) return;
        const stringKey = this.property.toString();

        this.expires = Date.now() + this.storeTemporary;

        if (this.expirationTimeout) clearTimeout(this.expirationTimeout);
        this.expirationTimeout = setTimeout(() => {
            const defaultSettings = getMetadata(this.object, "defaultSettings") as IndexStructure;
            const delValue = defaultSettings && !this.nullable ? defaultSettings[stringKey] : undefined;
            (<IndexStructure>this.object)[stringKey] = new Modification(delValue);
        }, this.storeTemporary);
    }

    /**
     * Decides wether to update the namespaced storage or not
     *
     * @protected
     * @returns {boolean}
     * @memberof Property
     */
    protected shouldUpdateNsStorage(): boolean {
        if (!this.saveInLocalStorage || !isBrowser()) return false;
        const stringKey = this.property.toString();
        const keyShouldBeUpdated = getMetadata(this.object, "keyShouldBeUpdated") || {};
        if (keyShouldBeUpdated[stringKey]) return true;
        if ("getNamespacedStorage" in this.object &&
            (<IndexStructure>this.object).getNamespacedStorage(stringKey) === undefined) {
            defineMetadata(this.object, "keyShouldBeUpdated", Object.assign(keyShouldBeUpdated, { [stringKey]: true }));
            return true;
        }
        return Boolean(getMetadata(this.object, "constructionComplete"));
    }
}