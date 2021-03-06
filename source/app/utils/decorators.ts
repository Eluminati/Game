import 'reflect-metadata';
import { pascalCase2kebabCase } from "~bdo/utils/util";
import { IPropertyParams } from "~bdo/lib/Property";
import { IAttributeParams } from "~bdo/lib/Attribute";
import { IWatchedParams } from "~bdo/lib/Watched";
import { baseConstructorFactory, IBaseConstructorOpts } from "~bdo/lib/BaseConstructor";
import { defineMetadata, getMetadata } from "~bdo/utils/metadata";
import { beforeDescriptor, createDecoratorDescriptor, isBaseConstructor, isComponent, isBDOModel } from "~bdo/utils/framework";

type AttributeParams = IAttributeParams;
type nameOptsIdx = string | IBaseConstructorOpts | number;
type optsIdx = IBaseConstructorOpts | number;

/**
 * reacts on several types of changes of the property / attribute.
 * If no function name is given, it will look for on<PropertyName><Action>.
 *
 * Example: The property is named test and is of type string, then the
 * reactionFunction is called onTestChange.
 *
 * @param params The parameters which effects the behavior of the watcher. Default: {}
 * @returns A property descriptor to watch the property
 */
export function watched(params: IWatchedParams = {}): PropertyDecorator {
    return (target: Record<string, any>, key: string | symbol) => {
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
 * @param params used to modify the behavior of the decorator
 * @returns A property descriptor to mark a field as a property and give more functionality
 */
export function property(params: IPropertyParams = {}): PropertyDecorator {
    return (target: Record<string, any>, key: string | symbol) => {
        const stringKey = key.toString();
        // Do general decorator stuff
        const decoratorSettings = beforeDescriptor(target, stringKey, "definedProperties", { params });
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
 * @param params used to modify the behavior of the decorator
 * @returns A property descriptor to mark a field as an attribute which adds
 *          functionality to components and models
 */
export function attribute(params: AttributeParams = {}): PropertyDecorator {
    return (target: Record<string, any>, key: string | symbol) => {
        const stringKey = key.toString();
        // Do general decorator stuff
        const decoratorSettings = beforeDescriptor(target, stringKey, "definedAttributes", { params });
        createDecoratorDescriptor(target, stringKey, "Attribute", decoratorSettings);
    };
}

/**
 * Constructs an object with its constParams with position index.
 * It also defines an graphQL object type if it is a BDOModel with a name which
 * is used on the server (in case of name correction) and some options which allow
 * to define name of database or collection and many more.
 *
 * @param name The name which effects models in the way to query them
 * @param params The params which mainly effects models in their behavior and
 *               prevents abstract components to be registered
 * @param index The index of the position of the constructor parameters. Default: 0
 * @returns A class decorator which changes the prototype chain to achieve better
 *          OOP behavior and implements a life cycle
 */
export function baseConstructor(name?: nameOptsIdx, params?: optsIdx, index = 0): ClassDecorator {

    return (ctor: any) => {
        let prototype = Object.getPrototypeOf(ctor);
        if (isBaseConstructor(prototype)) prototype = Object.setPrototypeOf(ctor, Object.getPrototypeOf(prototype));

        // Determine param types
        if (name && (typeof name === "number")) index = name;
        if (name && (typeof name === "object")) params = name;
        if (name && ((typeof name === "object") || (typeof name === "number"))) name = undefined;
        if (params && (typeof params === "number")) index = params;
        if (params && (typeof params === "number")) params = undefined;

        const isAbstract = (params && (typeof params === "object" && params.isAbstract));

        if (isBDOModel(ctor)) {
            // set collection and database name
            if (params && (typeof params === "object")) {
                const prevCollectionName = getMetadata(ctor, "collectionName");
                const prevDatabaseName = getMetadata(ctor, "databaseName");
                defineMetadata(ctor, "collectionName", params.collectionName || prevCollectionName || "default");
                defineMetadata(ctor, "databaseName", params.databaseName || prevDatabaseName || "default");
                beforeDescriptor(ctor, ctor.name, "definedBaseConstructors", { params });
            }
        }
        if (isAbstract) return ctor;

        const BaseConstructor = baseConstructorFactory(ctor, index);
        // Register custom Element
        if (isComponent(ctor)) {
            customElements.define(pascalCase2kebabCase(ctor.name), BaseConstructor, {
                extends: BaseConstructor.extends
            });
        }
        return BaseConstructor;
    };
}
