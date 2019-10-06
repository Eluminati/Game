import 'reflect-metadata';
import { pascalCase2kebabCase } from "~bdo/utils/util";
import { isBrowser } from "~bdo/utils/environment";
import { IPropertyParams } from "~bdo/lib/Property";
import { IAttributeParams } from "~bdo/lib/Attribute";
import { IWatchedParams } from "~bdo/lib/Watched";
import { baseConstructorFactory, IBaseConstructorOpts } from "~bdo/lib/BaseConstructor";
import { defineMetadata, getMetadata } from "~bdo/utils/metadata";
import { beforeDescriptor, createDecoratorDescriptor, isBaseConstructor } from "~bdo/utils/framework";
import { ReturnTypeFunc } from "type-graphql/dist/decorators/types";
import {
    Field,
    ObjectType,
    Query,
    Arg,
    Args,
    Resolver,
    Root,
    Subscription,
    Mutation,
    PubSub,
    InputType
} from "type-graphql";

type FuncOrAttrParams = ReturnTypeFunc | IAttributeParams;
type FuncOrPropParams = ReturnTypeFunc | IPropertyParams;
type nameOptsIdx = string | IBaseConstructorOpts | number;
type optsIdx = IBaseConstructorOpts | number;

/**
 * reacts on several types of changes of the property / attribute.
 * If no function name is given, it will look for on<PropertyName><Action>.
 *
 * Example: The property is named test and is of type string, then the
 * reactionFunction is called onTestChange.
 *
 * @export
 * @param {IndexStructure} params
 * @returns {PropertyDecorator}
 */
export function watched(params: IWatchedParams = {}): PropertyDecorator {
    return (target: any, key: string | symbol) => {
        const stringKey = key.toString();
        const decoratorSettings = beforeDescriptor(target, stringKey, "definedWatchers", { params });
        createDecoratorDescriptor(target, stringKey, "Watched", decoratorSettings);
    };
}

/**
 * Marks a component property as a real property and avoids setting the
 * corresponding attribute. Also it maintains the "properties" values of a
 * component.
 * Furthermore it handles type checking, caching and more. Read comments of
 * IPropertyParams for more information.
 *
 * @export
 * @param {FuncOrPropParams} [typeFunc] Used in type guard if the type is not
 *                                    determinable automatically for example
 *                                    the types inside an array or union types
 * @param {IPropertyParams} [params] used to modify the behavior of the decorator
 * @returns {PropertyDecorator}
 */
export function property(typeFunc?: FuncOrPropParams, params?: IPropertyParams): PropertyDecorator {
    return (target: any, key: string | symbol) => {
        const stringKey = key.toString();

        // sort parameters
        if (typeFunc && !(typeFunc instanceof Function) && !params) params = typeFunc;
        if (typeFunc && !(typeFunc instanceof Function)) typeFunc = undefined;
        if (!params || !(params instanceof Object)) params = {};

        // Do general decorator stuff
        const decoratorSettings = beforeDescriptor(target, stringKey, "definedProperties", { typeFunc, params });
        createDecoratorDescriptor(target, stringKey, "Property", decoratorSettings);
    };
}

/**
 * Marks a component property as a real attribute and reflects the set values
 * to the attribute dom even it is not a native attribute.
 *
 * If it is a BDOModel it marks the property as an attribute which should be
 * send to server or saved in database.
 *
 * It also do some other logic like data flow, caching and so on. For more
 * information read the property comments.
 *
 * Read IAttributeParams for more Information.
 *
 * @export
 * @param {FuncOrAttrParams} [typeFunc] Used in type guard if the type is not
 *                                      determinable automatically for example
 *                                      the types inside an array or union types
 * @param {IAttributeParams} [params] used to modify the behavior of the decorator
 * @returns {PropertyDecorator}
 */
export function attribute(typeFunc?: FuncOrAttrParams, params?: IAttributeParams): PropertyDecorator {
    return (target: any, key: string | symbol) => {
        const stringKey = key.toString();

        // sort parameters
        if (typeFunc && !(typeFunc instanceof Function) && !params) params = typeFunc;
        if (typeFunc && !(typeFunc instanceof Function)) typeFunc = undefined;
        if (!params || !(params instanceof Object)) params = {};

        // Decide which Field should be used
        if (typeFunc instanceof Function && params) Field(typeFunc, params)(target, key);
        else if (typeFunc instanceof Function) Field(typeFunc)(target, key);
        else if (params) Field(params)(target, key);
        else Field()(target, key);

        // Do general decorator stuff
        const decoratorSettings = beforeDescriptor(target, stringKey, "definedAttributes", { typeFunc, params });
        createDecoratorDescriptor(target, stringKey, "Attribute", decoratorSettings);
    };
}

/**
 * Constructs an object with its constParams with position index.
 * It also defines an graphQL object type if it is a BDOModel with a name which
 * is used on the server (in case of name correction) and some options which allow
 * to define name of database or collection and many more.
 *
 * @export
 * @param {nameOptsIdx} [name]
 * @param {optsIdx} [params]
 * @param {number} [index=0]
 * @returns {ClassDecorator}
 */
export function baseConstructor(name?: nameOptsIdx, params?: optsIdx, index: number = 0): ClassDecorator {

    return (ctor: any) => {
        const prototype = Object.getPrototypeOf(ctor);
        if (isBaseConstructor(prototype)) Object.setPrototypeOf(ctor, Object.getPrototypeOf(prototype));

        // Determine param types
        if (name && (typeof name === "number")) index = name;
        if (name && (typeof name === "object")) params = name;
        if (name && ((typeof name === "object") || (typeof name === "number"))) name = undefined;
        if (params && (typeof params === "number")) index = params;
        if (params && (typeof params === "number")) params = undefined;

        if ("isBDOModel" in ctor) {
            // Decide which ObjectType to use
            if (name && (typeof name === "string") && params && (typeof params === "object")) {
                ObjectType(name, params)(ctor);
            } else if (name && (typeof name === "string")) {
                ObjectType(name)(ctor);
            } else if (params && (typeof params === "object")) {
                ObjectType(params)(ctor);
            } else ObjectType()(ctor);

            // set collection and database name
            if (params && (typeof params === "object")) {
                const prevCollectionName = getMetadata(ctor, "collectionName");
                const prevDatabaseName = getMetadata(ctor, "databaseName");
                defineMetadata(ctor, "collectionName", params.collectionName || prevCollectionName || "default");
                defineMetadata(ctor, "databaseName", params.databaseName || prevDatabaseName || "default");
            }
        }
        if (params && (typeof params === "object" && params.isAbstract)) return ctor;

        const BaseConstructor = baseConstructorFactory(ctor, index);
        // Register custom Element
        if (isBrowser() && ctor.isBaseComponent) {
            customElements.define(pascalCase2kebabCase(ctor.name), BaseConstructor, {
                extends: BaseConstructor.extends
            });
        }
        return BaseConstructor;
    };
}

export let query = Query;
export let arg = Arg;
export let args = Args;
export let resolver = Resolver;
export let root = Root;
export let mutation = Mutation;
export let subscription = Subscription;
export let pubSub = PubSub;
export let inputType = InputType;
