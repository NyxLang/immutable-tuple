import { UniversalWeakMap } from "./universal-weak-map.js";
import { brand, forEachArrayMethod } from "./util.js";

const root = new UniversalWeakMap;
const { concat } = Array.prototype;
const reusableTempArray = [];

export default function tuple(...items) {
  return intern(items);
}

// Make named imports work as well as default imports.
export { tuple };

function intern(array) {
  let node = root;

  array.forEach(item => {
    node = node.get(item) || node.set(item, new UniversalWeakMap);
  });

  if (node.tuple) {
    return node.tuple;
  }

  const t = Object.create(tuple.prototype);

  array.forEach((item, i) => def(t, i, item, true));
  def(t, "length", array.length, false);

  return node.tuple = t;
}

function isTuple(that) {
  return that[brand] === true;
}

Object.assign(tuple.prototype, {
  isTuple,

  // Turn this Tuple into an ordinary array, optionally reusing an
  // existing array.
  toArray(array = []) {
    const { length } = this;
    for (let i = 0; i < length; ++i) {
      const item = this[i];
      array[i] = isTuple(item) ? item.toArray() : item;
    }
    array.length = length;
    return array;
  },

  concat(...args) {
    return intern(concat.apply(
      this.toArray(reusableTempArray),
      args.map(item => isTuple(item) ? item.toArray() : item)
    ));
  }
});

function def(obj, name, value, enumerable) {
  Object.defineProperty(obj, name, {
    value: value,
    enumerable: !! enumerable,
    writable: false,
    configurable: false
  });
}

def(tuple.prototype, brand, true, false);

forEachArrayMethod((name, desc, mustConvertThisToArray) => {
  const method = desc && desc.value;
  if (typeof method === "function") {
    desc.value = function (...args) {
      const result = method.apply(
        mustConvertThisToArray
          ? this.toArray(reusableTempArray)
          : this,
        args
      );
      return Array.isArray(result) ? intern(result) : result;
    };
    Object.defineProperty(tuple.prototype, name, desc);
  }
});