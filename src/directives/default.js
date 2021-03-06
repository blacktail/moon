/* ======= Default Directives ======= */

const emptyVNode = `m("#text", {}, "")`;

let ifDynamic = 0;
let ifStack = [];
let forStack = [];

const setIfState = function(state) {
  if(state.dynamic === false) {
    state.dynamic = true;
  } else {
    ifDynamic++;
  }
}

const addEventListenerCodeToVNode = function(name, handler, vnode) {
  const meta = vnode.meta;
  let eventListeners = meta.eventListeners;
  if(eventListeners === undefined) {
    eventListeners = meta.eventListeners = {};
  }
  let eventHandlers = eventListeners[name];
  if(eventHandlers === undefined) {
    eventListeners[name] = [handler];
  } else {
    eventHandlers.push(handler);
  }
}

const addDomPropertyCodeToVNode = function(name, code, vnode) {
  let dom = vnode.props.dom;
  if(dom === undefined) {
    vnode.props.dom = dom = {};
  }
  dom[name] = code;
}

specialDirectives["m-if"] = {
  beforeGenerate: function(prop, vnode, parentVNode, state) {
    const children = parentVNode.children;
    const index = state.index;

    for(let i = index + 1; i < children.length; i++) {
      let child = children[i];
      if(typeof child !== "string") {
        let attrs = child.props;
        if(attrs["m-else"] !== undefined) {
          ifStack.push([i, child]);
          children.splice(i, 1);
          setIfState(state);
        } else if(attrs["m-if"] !== undefined) {
          setIfState(state);
        }
        break;
      }
    }
  },
  afterGenerate: function(prop, code, vnode, parentVNode, state) {
    const value = prop.value;
    const children = parentVNode.children;
    let elseValue = emptyVNode;
    let elseNode = ifStack.pop();

    if(elseNode !== undefined) {
      elseValue = generateNode(elseNode[1], parentVNode, elseNode[0], state);
    }

    if((--ifDynamic) === 0) {
      state.dynamic = false;
    }

    compileTemplateExpression(value, state.exclude, state.dependencies);

    return `${value} ? ${code} : ${elseValue}`;
  }
};

specialDirectives["m-else"] = {

};

specialDirectives["m-for"] = {
  beforeGenerate: function(prop, vnode, parentVNode, state) {
    // Setup Deep Flag to Flatten Array
    parentVNode.deep = true;

    // Parts
    const parts = prop.value.split(" in ");

    // Aliases
    const aliases = parts[0];

    // Iteratable
    const iteratable = parts[1];
    const exclude = state.exclude;
    forStack.push([iteratable, aliases, exclude]);
    state.exclude = exclude.concat(aliases.split(","));
    compileTemplateExpression(iteratable, exclude, state.dependencies);
  },
  afterGenerate: function(prop, code, vnode, parentVNode, state) {
    // Get node with information about parameters
    const node = forStack.pop();

    // Restore globals to exclude
    state.exclude = node[2];

    // Use the renderLoop runtime helper
    return `m.renderLoop(${node[0]}, function(${node[1]}) { return ${code}; })`;
  }
};

specialDirectives["m-on"] = {
  beforeGenerate: function(prop, vnode, parentVNode, state) {
    // Get list of modifiers
    let modifiers = prop.meta.arg.split(".");
    const eventType = modifiers.shift();

    // Get method to call
    let methodToCall = prop.value;

    // Default parameters
    let params = "event";

    // Compile given parameters
    const paramStart = methodToCall.indexOf("(");
    if(paramStart !== -1) {
      const paramEnd = methodToCall.lastIndexOf(")");
      params = methodToCall.substring(paramStart + 1, paramEnd);
      methodToCall = methodToCall.substring(0, paramStart);
      compileTemplateExpression(params, state.exclude, state.dependencies);
    }

    // Generate any modifiers
    let modifiersCode = "";
    for(let i = 0; i < modifiers.length; i++) {
      const modifier = modifiers[i];
      const eventModifierCode = eventModifiersCode[modifier];
      if(eventModifierCode === undefined) {
        modifiersCode += `if(m.renderEventModifier(event.keyCode, "${modifier}") === false) {return null;};`
      } else {
        modifiersCode += eventModifierCode;
      }
    }

    // Generate event listener code and install handler
    const code = `function(event) {${modifiersCode}instance.callMethod("${methodToCall}", [${params}])}`;
    addEventListenerCodeToVNode(eventType, code, vnode);
  }
};

specialDirectives["m-model"] = {
  beforeGenerate: function(prop, vnode, parentVNode, state) {
    // Get attributes
    const value = prop.value;
    const attrs = vnode.props.attrs;

    // Get exclusions
    const exclude = state.exclude;

    // Get dependencies
    let dependencies = state.dependencies;

    // Add dependencies
    compileTemplateExpression(value, exclude, dependencies);

    // Setup default event type, keypath to set, value of setter, DOM property to change, and value of DOM property
    let eventType = "input";
    let domGetter = "value";
    let domSetter = value;
    let keypathGetter = value;
    let keypathSetter = `event.target.${domGetter}`;

    // If input type is checkbox, listen on 'change' and change the 'checked' DOM property
    let type = attrs.type;
    if(type !== undefined) {
      type = type.value;
      let radio = false;
      if(type === "checkbox" || (type === "radio" && (radio = true))) {
        eventType = "change";
        domGetter = "checked";

        if(radio === true) {
          let valueAttr = attrs.value;
          let literalValueAttr;
          let valueAttrValue = "null";
          if(valueAttr !== undefined) {
            valueAttrValue = `"${compileTemplate(valueAttr.value, exclude, dependencies)}"`;
          } else if((literalValueAttr = attrs["m-literal:value"])) {
            valueAttrValue = `${compileTemplate(literalValueAttr.value, exclude, dependencies)}`;
          }
          domSetter += `=== ${valueAttrValue}`;
          keypathSetter = valueAttrValue;
        } else {
          keypathSetter = `event.target.${domGetter}`;
        }
      }
    }

    // Generate the listener
    const code = `function(event) {instance.set("${keypathGetter}", ${keypathSetter})}`;

    // Push the listener to it's event listeners
    addEventListenerCodeToVNode(eventType, code, vnode);

    // Setup a query used to get the value, and set the corresponding dom property
    addDomPropertyCodeToVNode(domGetter, domSetter, vnode);
  }
};

specialDirectives["m-literal"] = {
  duringPropGenerate: function(prop, vnode, parent, state) {
    let modifiers = prop.meta.arg.split(".");

    const propName = modifiers.shift();
    const propValue = prop.value;

    compileTemplateExpression(propValue, state.exclude, state.dependencies);

    if(modifiers[0] === "dom") {
      addDomPropertyCodeToVNode(propName, propValue, vnode);
      return "";
    } else if(propName === "class") {
      // Detected class, use runtime class render helper
      return `"class": m.renderClass(${propValue}), `;
    } else {
      // Default literal attribute
      return `"${propName}": ${propValue}, `;
    }
  }
};

specialDirectives["m-mask"] = {

};

directives["m-show"] = function(el, val, vnode) {
  el.style.display = (val ? '' : 'none');
};
