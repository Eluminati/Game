import { baseConstructor, attribute, watched } from '~bdo/utils/decorators';
import { BDOModel } from '~bdo/lib/BDOModel';

/**
 * Test
 *
 * @template TBase
 * @param ctor The type to extend with
 * @returns The mixed in class BDOTest
 */
export function BDOTestFactory<TBase extends Constructor<BDOModel>>(ctor: TBase) {

    /**
     * Test
     *
     * @extends TBase
     */
    @baseConstructor({ isAbstract: true, collectionName: "BDOTest" })
    abstract class BDOTest extends ctor {

        /**
         * Test
         *
         * @memberof Test
         */
        @attribute() public title: string = 'test';

        /**
         * Test
         *
         * @memberof BDOTest
         */
        @watched() @attribute() public tester: string[] = [];

        protected beforeDatabaseInsertCallback() {
            console.log(this.id, this.className); // eslint-disable-line
        }

        /**
         * Test
         *
         * @protected
         * @param init The value of tester on initialization
         * @memberof ViewLink
         */
        protected onTesterInit(init: this["tester"]) {
            console.log("tester init", init, this);  // eslint-disable-line
        }

        /**
         * Test
         *
         * @protected
         * @param changed The old value of tester
         * @memberof ViewLink
         */
        protected onTesterChange(changed: this["tester"]) {
            console.log("tester changed", changed, this);  // eslint-disable-line
        }

        /**
         * Test
         *
         * @protected
         * @param added The value which has been added to tester
         * @memberof ViewLink
         */
        protected onTesterAdd(added: this["tester"][0]) {
            console.log("tester added", added, this);  // eslint-disable-line
        }

        /**
         * Test
         *
         * @protected
         * @param removed The value of tester which has been removed
         * @memberof ViewLink
         */
        protected onTesterRemove(removed: this["tester"][0]) {
            console.log("tester removed", removed, this);  // eslint-disable-line
        }

    }
    return BDOTest;

}
