import { getMetadata, defineMetadata } from "~bdo/utils/metadata";
/**
 * Stores a value with its key in a separate namespace depending on a property
 * name of the instance (nsProp)
 *
 * @export
 * @param {*} instance
 * @param {string} key
 * @param {*} newVal
 */
export function setUpdateNamespacedStorage(instance: any, key: string, newVal: any, nsProp: string = "id") {
    // Get basic information
    const nsPrefix = Object.getPrototypeOf(instance.constructor).name;
    let nsSuffix = getMetadata(instance, "oldStorageNsSuffix");
    let storageValue: any;

    // Create namespace if not available
    if (!nsSuffix) nsSuffix = instance[nsProp];
    let ns = `${nsPrefix}_${nsSuffix}`;
    if (key === nsProp || nsSuffix !== instance[nsProp]) {
        // Update namespace if changed
        nsSuffix = key === nsProp ? newVal : instance[nsProp];
        const newNs = `${nsPrefix}_${nsSuffix}`;
        storageValue = localStorage.getItem(ns);
        if (storageValue) {
            localStorage.removeItem(ns);
            localStorage.setItem(newNs, storageValue);
        }
        ns = newNs;
    } else {
        // get current value
        storageValue = localStorage.getItem(ns);
        if (storageValue) {
            storageValue = JSON.parse(storageValue);
        } else storageValue = {};
        // Delete value if undefined else update
        if (newVal === undefined) {
            delete storageValue[key];
            if (!Object.keys(storageValue).length) {
                localStorage.removeItem(ns);
            } else localStorage.setItem(ns, JSON.stringify(storageValue));
        } else localStorage.setItem(ns, JSON.stringify(Object.assign(storageValue, { [key]: newVal })));
    }
    // Trace namespace suffix
    defineMetadata(instance, "oldStorageNsSuffix", nsSuffix);
}

/**
 * Gets a value of the key depending on the namespace suffix which was used
 * before in a store action or depending on the nsProp.
 *
 * You also can force a namespace which will be used instead of all previous
 * detected namespaces.
 *
 * if key is a *, all keys in this namespace will be returned in an object.
 *
 * @export
 * @param {*} instance
 * @param {string} key
 * @param {string} [nsProp="id"]
 * @param {string} [forceNS]
 * @returns
 */
export function getNamespacedStorage(instance: any, key: string, nsProp: string = "id", forceNS?: string) {
    const nsPrefix = Object.getPrototypeOf(instance.constructor).name;
    let nsSuffix = getMetadata(instance, "oldStorageNsSuffix");
    if (nsSuffix !== instance[nsProp]) nsSuffix = instance[nsProp];
    if (forceNS) nsSuffix = forceNS;
    let storageValue: any = localStorage.getItem(`${nsPrefix}_${nsSuffix}`);
    if (storageValue) storageValue = JSON.parse(storageValue);
    if (storageValue && key === "*") return storageValue;
    if (storageValue && key in storageValue) return storageValue[key];
    return undefined;
}