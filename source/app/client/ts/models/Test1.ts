
import { BDOTest1Factory } from "~bdo/models/BDOTest1";
import { Test } from "~client/models/Test";
import { baseConstructor } from "~bdo/utils/decorators";

/**
 * Test
 *
 * @export
 * @class Test1
 * @extends {BDOTest1Factory()}
 */
@baseConstructor({ collectionName: "Test1" })
export class Test1 extends BDOTest1Factory(Test) {

    constructor(params?: ConstParams<Test1>) {
        super(params);
    }

    /**
     * Test
     *
     * @memberof Test1
     */
    public wadde() {
        this.bindings.get("title");
    }
}
