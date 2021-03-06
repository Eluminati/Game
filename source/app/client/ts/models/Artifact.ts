import { BDOArtifactFactory } from "~bdo/models/BDOArtifact";
import { ClientModel } from '~client/lib/ClientModel';
import { User } from "~client/models/User";
import { attribute, baseConstructor } from "~bdo/utils/decorators";

/**
 * The most general abstraction of most client models. Define here all attributes
 * which require a specific model type but are general enough to use here.
 *
 * @extends ReturnType<BDOTestFactory<BDOModel>>
 */
@baseConstructor()
export class Artifact extends BDOArtifactFactory(ClientModel) {

    @attribute() public creator!: User;

    constructor(params?: ConstParams<Artifact>) {
        super(params);
    }

}
