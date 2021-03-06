import { Request, Response, NextFunction, Router } from 'express';
import { BaseEnvironment } from "~bdo/lib/BaseEnvironment";
import template from "~bdo/views/BDODefaultTemplate.njk";

import type { Template } from 'nunjucks';

export type minimumAccessRights = "loggedout" | "public" | "loggedin" | "admin";

/**
 * Provides basic functionality for ALL routes on server and client and
 * especially provides a template for client and server route.
 *
 * @class BDORoute
 */
export abstract class BDORoute {

    /**
     * This is for better identification of BDO routes and instance check
     *
     * @memberof BDORoute
     */
    public static readonly isBDORoute: boolean = true;

    /**
     * Defines which servers have to use this route.
     * "*" means that all servers should use this route.
     * If only a specific number of server should use this route, define their
     * names in the array.
     *
     * @static
     * @memberof BaseRoute
     */
    public static attachToServers: string[] = ['*'];

    /**
     * @see BDORoute.isBDORoute
     *
     * @memberof BDORoute
     */
    public readonly isBDORoute: boolean = true;

    /**
     * Namespace for the express router as entry point
     *
     * @public
     * @memberof BaseRoute
     */
    public routerNameSpace: string = `/${this.constructor.name.toLowerCase()}`;

    /**
     * Defines sub routes on which the routerNameSpace is reachable
     *
     * @memberof BDORoute
     */
    public routes: string[] = ['/'];

    /**
     * The routes combined with the routerNameSpace and the corresponding route function
     *
     * @abstract
     * @memberof BDORoute
     */
    public abstract get router(): IndexStructure<(params: IndexStructure) => void> | Router;

    /**
     * The name of the template file in views or a string which is already template.
     * If this is null, the pure JSON from templateParams will be sent to the client.
     *
     * @protected
     * @memberof BaseRoute
     */
    protected templateString: Template = template;

    /**
     * If true there will no template be rendered and only the template params
     * will be returned.
     *
     * @protected
     * @memberof BDORoute
     */
    protected jsonOnly: boolean = false;

    /**
     * Defines the minimum access rights for the corresponding route
     *
     * @protected
     * @memberof BDORoute
     */
    protected access: minimumAccessRights = "loggedin";

    /**
     * Holds a reference to the current environment instance
     *
     * @protected
     * @memberof ServerRoute
     */
    protected environmentInstance: BaseEnvironment;

    constructor(environment: BaseEnvironment) {
        this.environmentInstance = environment;
    }

    /**
     * Renders the template depending on its format (Template or string) and
     * passes the templateParams to it.
     *
     * @protected
     * @param templateParams The processed template parameters
     * @returns A rendered template if available
     * @memberof BDORoute
     */
    protected renderTemplate(templateParams: IndexStructure): string | null {
        return this.templateString.render(templateParams);
    }

    /**
     * Returns an object which keys matches the interpolations of the template.
     *
     * @protected
     * @abstract
     * @param _request The request given by the http server or a response from the http server
     * @returns the processed template parameters
     * @memberof BDORoute
     */

    /**
     * Returns an object which keys matches the interpolations of the template.
     *
     * @protected
     * @param _request The request given by the http server or a response from the http server
     * @param _response The response used by the http server to transmit data to the client or redirect on client side
     * @param _next The function which will trigger the next middleware function
     * @returns the processed template parameters
     * @memberof BDORoute
     */
    protected async templateParams(_request: Request, _response: Response, _next: NextFunction): Promise<IndexStructure> {
        return {};
    }

    /**
     * Checks the data given by a request and prevents saving data in case of
     * an error.
     *
     * @protected
     * @param _request The request given by http server or a fake request in Frontend
     * @param _response The response used by the http server to transmit data to the client or redirect on client side
     * @param _next The function which will trigger the next middleware function
     * @returns true if the access rights have passed all conditions
     * @memberof BDORoute
     */
    protected async checkData(_request: Request, _response: Response, _next: NextFunction): Promise<Error | undefined> {
        return;
    }

    /**
     * Checks if the corresponding access rights are defined on request participant
     *
     * @protected
     * @abstract
     * @param request
     * @param response
     * @param next
     * @returns true if the access rights have passed all conditions
     * @memberof BDORoute
     */
    protected abstract accessGranted(request: Request, response: Response, next: NextFunction): Promise<boolean>;

    /**
     * Handles the get requests with access checking, template params and response type determination
     *
     * @protected
     * @abstract
     * @param request The request given by http server or a fake request in Frontend
     * @param response The response used by the http server to transmit data to the client or redirect on client side
     * @param next The function which will trigger the next middleware function
     * @returns A Promise indicating finished request
     * @memberof BDORoute
     */
    protected abstract handleGet(request: Request, response: Response, next: NextFunction): Promise<void>;

    /**
     * Handles the post requests with access checking, type checking, template
     * params and response type determination.
     *
     * @protected
     * @abstract
     * @param request The request given by http server or a fake request in Frontend
     * @param response The response used by the http server to transmit data to the client or redirect on client side
     * @param next The function which will trigger the next middleware function
     * @returns A Promise indicating finished request
     * @memberof BDORoute
     */
    protected abstract handlePost(request: Request, response: Response, next: NextFunction): Promise<void>;
}
