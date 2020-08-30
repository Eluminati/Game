import { Test1 } from "~server/models/Test1";
import { resolver, arg, query } from "~bdo/utils/decorators";
import { ServerResolver } from "~server/lib/ServerResolver";
import { BDOTestResolverFactory } from "~bdo/api/BDOTestResolver";

/**
 * Test
 */
@resolver(Test1)
export default class TestResolver extends BDOTestResolverFactory(ServerResolver) {

    /**
     * Test
     *
     * @param id The ID of the model
     * @returns A test model
     * @memberof TestResolver
     */
    @query((_returns) => Test1.graphQLType)
    public lalala(@arg("id") id: string): Test1 {
        return new Test1({
            id,
            title: "hahahahahahahahahahahahaha"
        });
    }
}
