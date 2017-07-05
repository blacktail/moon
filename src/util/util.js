/* ======= Global Utilities ======= */

const hashRE = /\[(\w+)\]/g;
const newLineRE = /\n/g;
const doubleQuoteRE = /"/g;
const backslashRE = /\\/g;

/**
 * Logs a Message
 * @param {String} msg
 */
const log = function(msg) {
  if(Moon.config.silent === false) {
    console.log(msg);
  }
}

/**
 * Throws an Error
 * @param {String} msg
 */
const error = function(msg) {
  if(Moon.config.silent === false) {
    console.error("[Moon] ERROR: " + msg);
  }
}

/**
 * Adds DOM Updates to Queue
 * @param {Object} instance
 */
const queueBuild = function(instance) {
  if(instance.$queued === false && instance.$destroyed === false) {
    instance.$queued = true;
    setTimeout(function() {
      instance.build();
      callHook(instance, 'updated');
      instance.$queued = false;
    }, 0);
  }
}

/**
 * Resolves an Object Keypath and Sets it
 * @param {Object} instance
 * @param {Object} obj
 * @param {String} keypath
 * @param {String} val
 * @return {Object} resolved object
 */
const resolveKeyPath = function(instance, obj, keypath, val) {
  keypath = keypath.replace(hashRE, '.$1');
  const path = keypath.split(".");
  let i = 0;
  for(; i < path.length - 1; i++) {
    const propName = path[i];
    obj = obj[propName];
  }
  obj[path[i]] = val;
  return path[0];
}

/**
 * Calls a Hook
 * @param {Object} instance
 * @param {String} name
 */
const callHook = function(instance, name) {
  const hook = instance.$hooks[name];
  if(hook !== undefined) {
    hook.call(instance);
  }
}

/**
 * Extracts the Slots From Component Children
 * @param {Array} children
 * @return {Object} extracted slots
 */
const getSlots = function(children) {
  let slots = {};

  // Setup default slots
  let defaultSlotName = "default";
  slots[defaultSlotName] = [];

  // No Children Means No Slots
  if(children.length === 0) {
    return slots;
  }

  // Get rest of the slots
  for(let i = 0; i < children.length; i++) {
    const child = children[i];
    const childProps = child.props.attrs;
    let slotName = "";
    let slotValue = null;

    if((slotName = childProps.slot) !== undefined) {
      slotValue = slots[slotName];
      if(slotValue === undefined) {
        slots[slotName] = [child];
      } else {
        slotValue.push(child);
      }
      delete childProps.slot;
    } else {
      slots[defaultSlotName].push(child);
    }
  }

  return slots;
}

/**
 * Extends an Object with another Object's properties
 * @param {Object} parent
 * @param {Object} child
 * @return {Object} Extended Parent
 */
const extend = function(parent, child) {
  for(let key in child) {
    parent[key] = child[key];
  }

  return parent;
}

/**
 * Merges Two Objects Together
 * @param {Object} parent
 * @param {Object} child
 * @return {Object} Merged Object
 */
const merge = function(parent, child) {
  let merged = {};
  let key = null;

  for(key in parent) {
    merged[key] = parent[key];
  }

  for(key in child) {
    merged[key] = child[key];
  }

  return merged;
}

/**
 * Defines a Property on an Object or a Default Value
 * @param {Object} obj
 * @param {String} prop
 * @param {Any} value
 * @param {Any} def
 */
const defineProperty = function(obj, prop, value, def) {
  if(value === undefined) {
    obj[prop] = def;
  } else {
    obj[prop] = value;
  }
}

/**
 * Escapes a String
 * @param {String} str
 */
const escapeString = function(str) {
  return str.replace(backslashRE, "\\\\").replace(doubleQuoteRE, "\\\"").replace(newLineRE, "\\n");
}

/**
 * Does No Operation
 */
const noop = function() {

}
