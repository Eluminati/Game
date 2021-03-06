import { BDOModel } from "~bdo/lib/BDOModel";
import { isBaseConstructor } from "~bdo/utils/framework";

/**
 * Holds a Map of all instantiated models with <className><id> as key and the
 * model as value. It also provides the possibility to get a model by its ID or
 * several models by attribute names and the corresponding value.
 * This registry does not look into databases!
 */
export class ModelRegistry {

    /**
     * Holds the singleton instance of the registry
     *
     * @private
     * @static
     * @type {ModelRegistry}
     * @memberof ModelRegistry
     */
    private static instance: ModelRegistry;

    /**
     * The map of models by its class name and id
     *
     * @private
     * @type {Map<string, BDOModel>}
     * @memberof ModelRegistry
     */
    private models: Map<string, BDOModel> = new Map();

    private constructor() {
        // This is just to implement the singleton pattern
    }

    /**
     * Provides the singleton instance
     *
     * @static
     * @returns The instance of the ModelRegistry
     * @memberof ModelRegistry
     */
    public static getInstance() {
        if (!ModelRegistry.instance) ModelRegistry.instance = new ModelRegistry();
        return ModelRegistry.instance;
    }

    /**
     * Adds a model to the registry
     *
     * @param model A model to register
     * @memberof ModelRegistry
     */
    public register(model: BDOModel) {
        this.models.set(`${model.className}${model.id}`, model);
    }

    /**
     * Removes a model from the registry
     *
     * @param model The model to unregister
     * @memberof ModelRegistry
     */
    public unregister(model: BDOModel) {
        this.models.delete(`${model.className}${model.id}`);
    }

    /**
     * Returns a model by its id and class type
     *
     * @param id The id of the model
     * @param constructor Thy class of the model
     * @returns An initialized model with the given id and class type
     * @memberof ModelRegistry
     */
    public getModelById<T extends BDOModel | Constructor<BDOModel>>(id: string, constructor: T) {
        return this.models.get(`${this.getClassName(constructor)}${id}`) as DefInstanceType<T> | undefined;
    }

    /**
     * Returns a list of models where all the given attributes corresponds to
     * the models attributes and values.
     *
     * @param attributes The attributes which the model should have
     * @returns An array of models which matched the given attributes
     * @memberof ModelRegistry
     */
    public getModelsByAttributes(attributes: IndexStructure) {
        const models: BDOModel[] = [];
        this.models.forEach((model) => {
            for (const key in attributes) {
                if (key in attributes) {
                    const element = attributes[key];
                    if (!(key in model) || element !== (<IndexStructure>model)[key]) {
                        return;
                    }
                }
            }
            models.push(model);
        });
        return models;
    }

    /**
     * Updates the id of an included model depending on its old id after the
     * id of a model has been changed.
     *
     * @template T
     * @param oldID The old id which should be updated
     * @param constructor The class type which should be used
     * @memberof ModelRegistry
     */
    public updateID<T extends BDOModel>(oldID: T["id"], constructor: T) {
        const model = this.models.get(`${this.getClassName(constructor)}${oldID}`);
        if (!model) return;
        this.models.delete(`${this.getClassName(constructor)}${oldID}`);
        this.register(model);
    }

    /**
     * Returns model(s) depending on the condition of func and mode.
     *
     * modes:
     *  - all: returns all found models in an array
     *  - first: returns the first found model
     *  - last: returns the last found model
     *
     * @param func The condition function which decides wether a model should be respected or not
     * @param mode The mode which decides which of the respected model should be served. Default: "all"
     * @returns A model od an array of models depending on the mode
     * @memberof ModelRegistry
     */
    public getModelsByCondition(func: (model: BDOModel) => boolean, mode: "first" | "all" | "last" = "all") {
        const models: BDOModel[] = [];
        let lastModel: BDOModel | undefined;
        for (const model of this.models.values()) {
            if (func(model)) {
                if (mode === "first") return model;
                if (mode === "all") models.push(model);
                if (mode === "last") lastModel = model;
            }
        }
        return mode === "last" ? lastModel : models;
    }

    /**
     * Determines the class name of a model
     *
     * @private
     * @param constructor The constructor class of which the class name should be determined
     * @returns The name of the constructor
     * @memberof ModelRegistry
     */
    private getClassName(constructor: Constructor<BDOModel> | BDOModel) {
        let className: string;
        if (isBaseConstructor(constructor)) {
            className = constructor.className;
        } else if ("className" in constructor) {
            className = constructor.className;
        } else if (typeof constructor === "function") {
            className = constructor.name;
        } else className = (<any>constructor).constructor.name;
        return className;
    }
}
