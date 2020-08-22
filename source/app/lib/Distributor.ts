import { Field } from '~bdo/lib//Field';
import { Watched } from "~bdo/lib/Watched";
import { Attribute } from "~bdo/lib/Attribute";
import { Property } from "~bdo/lib/Property";
import { Modification } from '~bdo/lib/Modification';
import { removeElementFromArray, getProxyTarget } from "~bdo/utils/util";
import { isBDOModel } from "~bdo/utils/framework";
import { defineWildcardMetadata, getMetadata } from "~bdo/utils/metadata";

type watchedAttrProp<T extends Record<string, any>, K extends DefNonFuncPropNames<T>> =
    Attribute<T, K> |
    Property<T, K> |
    Watched<T, K>;

/**
 * This is used to bundle the values which are bound and to handle all
 * mechanisms of watched, property and attribute in an organized way.
 *
 * @template T
 * @template K
 */
export class Distributor<T extends Record<string, any> = any, K extends DefNonFuncPropNames<T> = any> extends Field {

    /**
     * All fields which are bound to the model
     *
     * @memberof Distributor
     */
    private fields: watchedAttrProp<T, K>[] = [];

    /**
     * Adds a field (watched, attribute, property) to this global field and
     * uses the value of the model field.
     *
     * @param field The field which should be added
     * @memberof Distributor
     */
    public addField(field: watchedAttrProp<T, K>) {
        if (this.fields.includes(field)) return;
        // Take value of the model
        if (isBDOModel(field.object)) this.value = this.proxyfyValue(field.valueOf());
        if (field instanceof Watched) {
            if (field.subObject) {
                this.redefineValue(field.subObject);
                if (isBDOModel(field.subObject.object)) {
                    this.disableTypeGuard = field.subObject.disableTypeGuard;
                    this.typeFunc = field.subObject.typeFunc;
                    field.subObject.disableTypeGuard = true;
                }
            } else this.disableTypeGuard = true;
        } else if (isBDOModel(field.object)) {
            this.disableTypeGuard = field.disableTypeGuard;
            this.typeFunc = field.typeFunc;
            field.disableTypeGuard = true;
        }
        this.redefineValue(field);
        this.fields.push(field);
    }

    /**
     * Removes a field from this global field and sets the value of the removed
     * field to the current value.
     *
     * @param field The field to remove
     * @memberof Distributor
     */
    public removeField(field: watchedAttrProp<T, K>) {
        if (!this.fields.includes(field)) return;
        if (field instanceof Watched) {
            if (field.subObject) {
                this.restoreValue(field.subObject);
                if (field.subObject instanceof Attribute) {
                    field.subObject.disableTypeGuard = getMetadata(field.subObject.object, "definedAttributes")?.get(field.subObject.property)?.params?.disableTypeGuard;
                } else if (field.subObject instanceof Property) {
                    field.subObject.disableTypeGuard = getMetadata(field.subObject.object, "definedProperties")?.get(field.subObject.property)?.params?.disableTypeGuard;
                }
            }
        }
        this.restoreValue(field);
        removeElementFromArray(this.fields, field);
    }

    /**
     * @inheritdoc
     *
     * @param value The value which should be set
     * @memberof Distributor
     */
    public setValue(value?: T[K] | Modification<any>) {
        const error = this.typeGuard(value);
        for (const field of this.fields) {
            if (field.typeGuard(value, error)) continue;
            field.setValue(value);
        }
    }

    /**
     * @inheritdoc
     *
     * @param path The path where thy proxy action was triggered on
     * @param changedValue The value which was assigned or unassigned
     * @param previousValue The old value
     * @param name The name of the operation which triggered the handler and undefined if it was an assignment
     * @memberof Distributor
     */
    public proxyHandler(path: string, changedValue: T[K], previousValue: T[K], name?: string) {
        for (const field of this.fields) {
            field.proxyHandler(path, <T[K]>changedValue, <T[K]>previousValue, name);
        }
    }

    /**
     * Overwrites the property "value" of the added field to produce a global
     * proxy handler to ensure only one identity of observed objects.
     *
     * @private
     * @param field The field where the value should be redefined
     * @memberof Distributor
     */
    private redefineValue(field: watchedAttrProp<T, K>) {
        defineWildcardMetadata(field, "value", field.valueOf());
        const that = this;
        Reflect.deleteProperty(field, "value");
        Reflect.defineProperty(field, "value", {
            get() {
                return that.value;
            },
            set(value: T[K]) {
                value = getProxyTarget(value);
                const thatValue = getProxyTarget(that.value);
                if (value === thatValue) return;
                that.value = that.proxyfyValue(value);
            },
            configurable: true,
            enumerable: true
        });
    }

    /**
     * Restores the original property "value" of the field
     *
     * @private
     * @param field The field where the value should be restored on
     * @memberof Distributor
     */
    private restoreValue(field: watchedAttrProp<T, K>) {
        Reflect.deleteProperty(field, "value");
        field.setValue(getProxyTarget(this.value));
    }
}
