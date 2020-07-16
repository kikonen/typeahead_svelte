var Typeahead = (function () {
  'use strict';

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _assertThisInitialized(self) {
    if (self === void 0) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return self;
  }

  function _setPrototypeOf(o, p) {
    _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
      o.__proto__ = p;
      return o;
    };

    return _setPrototypeOf(o, p);
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== "function" && superClass !== null) {
      throw new TypeError("Super expression must either be null or a function");
    }

    subClass.prototype = Object.create(superClass && superClass.prototype, {
      constructor: {
        value: subClass,
        writable: true,
        configurable: true
      }
    });
    if (superClass) _setPrototypeOf(subClass, superClass);
  }

  function _typeof(obj) {
    "@babel/helpers - typeof";

    if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
      _typeof = function _typeof(obj) {
        return typeof obj;
      };
    } else {
      _typeof = function _typeof(obj) {
        return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj;
      };
    }

    return _typeof(obj);
  }

  function _possibleConstructorReturn(self, call) {
    if (call && (_typeof(call) === "object" || typeof call === "function")) {
      return call;
    }

    return _assertThisInitialized(self);
  }

  function _getPrototypeOf(o) {
    _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) {
      return o.__proto__ || Object.getPrototypeOf(o);
    };
    return _getPrototypeOf(o);
  }

  function _arrayLikeToArray(arr, len) {
    if (len == null || len > arr.length) len = arr.length;

    for (var i = 0, arr2 = new Array(len); i < len; i++) {
      arr2[i] = arr[i];
    }

    return arr2;
  }

  function _arrayWithoutHoles(arr) {
    if (Array.isArray(arr)) return _arrayLikeToArray(arr);
  }

  function _iterableToArray(iter) {
    if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter);
  }

  function _unsupportedIterableToArray(o, minLen) {
    if (!o) return;
    if (typeof o === "string") return _arrayLikeToArray(o, minLen);
    var n = Object.prototype.toString.call(o).slice(8, -1);
    if (n === "Object" && o.constructor) n = o.constructor.name;
    if (n === "Map" || n === "Set") return Array.from(o);
    if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
  }

  function _nonIterableSpread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
  }

  function _toConsumableArray(arr) {
    return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();
  }

  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    return Constructor;
  }

  function noop() {}

  function run(fn) {
    return fn();
  }

  function blank_object() {
    return Object.create(null);
  }

  function run_all(fns) {
    fns.forEach(run);
  }

  function is_function(thing) {
    return typeof thing === 'function';
  }

  function safe_not_equal(a, b) {
    return a != a ? b == b : a !== b || a && _typeof(a) === 'object' || typeof a === 'function';
  }

  function append(target, node) {
    target.appendChild(node);
  }

  function insert(target, node, anchor) {
    target.insertBefore(node, anchor || null);
  }

  function detach(node) {
    node.parentNode.removeChild(node);
  }

  function destroy_each(iterations, detaching) {
    for (var i = 0; i < iterations.length; i += 1) {
      if (iterations[i]) iterations[i].d(detaching);
    }
  }

  function element(name) {
    return document.createElement(name);
  }

  function text(data) {
    return document.createTextNode(data);
  }

  function space() {
    return text(' ');
  }

  function empty() {
    return text('');
  }

  function listen(node, event, handler, options) {
    node.addEventListener(event, handler, options);
    return function () {
      return node.removeEventListener(event, handler, options);
    };
  }

  function attr(node, attribute, value) {
    if (value == null) node.removeAttribute(attribute);else if (node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
  }

  function children(element) {
    return Array.from(element.childNodes);
  }

  function set_data(text, data) {
    data = '' + data;
    if (text.wholeText !== data) text.data = data;
  }

  function set_input_value(input, value) {
    input.value = value == null ? '' : value;
  }

  function toggle_class(element, name, toggle) {
    element.classList[toggle ? 'add' : 'remove'](name);
  }

  var current_component;

  function set_current_component(component) {
    current_component = component;
  }

  function get_current_component() {
    if (!current_component) throw new Error("Function called outside component initialization");
    return current_component;
  }

  function beforeUpdate(fn) {
    get_current_component().$$.before_update.push(fn);
  }

  function onMount(fn) {
    get_current_component().$$.on_mount.push(fn);
  }

  function afterUpdate(fn) {
    get_current_component().$$.after_update.push(fn);
  }

  var dirty_components = [];
  var binding_callbacks = [];
  var render_callbacks = [];
  var flush_callbacks = [];
  var resolved_promise = Promise.resolve();
  var update_scheduled = false;

  function schedule_update() {
    if (!update_scheduled) {
      update_scheduled = true;
      resolved_promise.then(flush);
    }
  }

  function add_render_callback(fn) {
    render_callbacks.push(fn);
  }

  var flushing = false;
  var seen_callbacks = new Set();

  function flush() {
    if (flushing) return;
    flushing = true;

    do {
      // first, call beforeUpdate functions
      // and update components
      for (var i = 0; i < dirty_components.length; i += 1) {
        var component = dirty_components[i];
        set_current_component(component);
        update(component.$$);
      }

      dirty_components.length = 0;

      while (binding_callbacks.length) {
        binding_callbacks.pop()();
      } // then, once components are updated, call
      // afterUpdate functions. This may cause
      // subsequent updates...


      for (var _i = 0; _i < render_callbacks.length; _i += 1) {
        var callback = render_callbacks[_i];

        if (!seen_callbacks.has(callback)) {
          // ...so guard against infinite loops
          seen_callbacks.add(callback);
          callback();
        }
      }

      render_callbacks.length = 0;
    } while (dirty_components.length);

    while (flush_callbacks.length) {
      flush_callbacks.pop()();
    }

    update_scheduled = false;
    flushing = false;
    seen_callbacks.clear();
  }

  function update($$) {
    if ($$.fragment !== null) {
      $$.update();
      run_all($$.before_update);
      var dirty = $$.dirty;
      $$.dirty = [-1];
      $$.fragment && $$.fragment.p($$.ctx, dirty);
      $$.after_update.forEach(add_render_callback);
    }
  }

  var outroing = new Set();

  function transition_in(block, local) {
    if (block && block.i) {
      outroing["delete"](block);
      block.i(local);
    }
  }

  var globals = typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : global;

  function mount_component(component, target, anchor) {
    var _component$$$ = component.$$,
        fragment = _component$$$.fragment,
        on_mount = _component$$$.on_mount,
        on_destroy = _component$$$.on_destroy,
        after_update = _component$$$.after_update;
    fragment && fragment.m(target, anchor); // onMount happens before the initial afterUpdate

    add_render_callback(function () {
      var new_on_destroy = on_mount.map(run).filter(is_function);

      if (on_destroy) {
        on_destroy.push.apply(on_destroy, _toConsumableArray(new_on_destroy));
      } else {
        // Edge case - component was destroyed immediately,
        // most likely as a result of a binding initialising
        run_all(new_on_destroy);
      }

      component.$$.on_mount = [];
    });
    after_update.forEach(add_render_callback);
  }

  function destroy_component(component, detaching) {
    var $$ = component.$$;

    if ($$.fragment !== null) {
      run_all($$.on_destroy);
      $$.fragment && $$.fragment.d(detaching); // TODO null out other refs, including component.$$ (but need to
      // preserve final state?)

      $$.on_destroy = $$.fragment = null;
      $$.ctx = [];
    }
  }

  function make_dirty(component, i) {
    if (component.$$.dirty[0] === -1) {
      dirty_components.push(component);
      schedule_update();
      component.$$.dirty.fill(0);
    }

    component.$$.dirty[i / 31 | 0] |= 1 << i % 31;
  }

  function init(component, options, instance, create_fragment, not_equal, props) {
    var dirty = arguments.length > 6 && arguments[6] !== undefined ? arguments[6] : [-1];
    var parent_component = current_component;
    set_current_component(component);
    var prop_values = options.props || {};
    var $$ = component.$$ = {
      fragment: null,
      ctx: null,
      // state
      props: props,
      update: noop,
      not_equal: not_equal,
      bound: blank_object(),
      // lifecycle
      on_mount: [],
      on_destroy: [],
      before_update: [],
      after_update: [],
      context: new Map(parent_component ? parent_component.$$.context : []),
      // everything else
      callbacks: blank_object(),
      dirty: dirty
    };
    var ready = false;
    $$.ctx = instance ? instance(component, prop_values, function (i, ret) {
      var value = (arguments.length <= 2 ? 0 : arguments.length - 2) ? arguments.length <= 2 ? undefined : arguments[2] : ret;

      if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
        if ($$.bound[i]) $$.bound[i](value);
        if (ready) make_dirty(component, i);
      }

      return ret;
    }) : [];
    $$.update();
    ready = true;
    run_all($$.before_update); // `false` as a special case of no DOM component

    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;

    if (options.target) {
      if (options.hydrate) {
        var nodes = children(options.target); // eslint-disable-next-line @typescript-eslint/no-non-null-assertion

        $$.fragment && $$.fragment.l(nodes);
        nodes.forEach(detach);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        $$.fragment && $$.fragment.c();
      }

      if (options.intro) transition_in(component.$$.fragment);
      mount_component(component, options.target, options.anchor);
      flush();
    }

    set_current_component(parent_component);
  }

  var SvelteComponent = /*#__PURE__*/function () {
    function SvelteComponent() {
      _classCallCheck(this, SvelteComponent);
    }

    _createClass(SvelteComponent, [{
      key: "$destroy",
      value: function $destroy() {
        destroy_component(this, 1);
        this.$destroy = noop;
      }
    }, {
      key: "$on",
      value: function $on(type, callback) {
        var callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
        callbacks.push(callback);
        return function () {
          var index = callbacks.indexOf(callback);
          if (index !== -1) callbacks.splice(index, 1);
        };
      }
    }, {
      key: "$set",
      value: function $set() {// overridden by instance, if it has props
      }
    }]);

    return SvelteComponent;
  }();

  function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

  function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }

  function _createForOfIteratorHelper(o, allowArrayLike) { var it; if (typeof Symbol === "undefined" || o[Symbol.iterator] == null) { if (Array.isArray(o) || (it = _unsupportedIterableToArray$1(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; var F = function F() {}; return { s: F, n: function n() { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }, e: function e(_e) { throw _e; }, f: F }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); } var normalCompletion = true, didErr = false, err; return { s: function s() { it = o[Symbol.iterator](); }, n: function n() { var step = it.next(); normalCompletion = step.done; return step; }, e: function e(_e2) { didErr = true; err = _e2; }, f: function f() { try { if (!normalCompletion && it["return"] != null) it["return"](); } finally { if (didErr) throw err; } } }; }

  function _unsupportedIterableToArray$1(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray$1(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$1(o, minLen); }

  function _arrayLikeToArray$1(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }
  var window_1 = globals.window;

  function get_each_context(ctx, list, i) {
    var child_ctx = ctx.slice();
    child_ctx[92] = list[i];
    child_ctx[94] = i;
    return child_ctx;
  } // (909:4) {#if showToggle}


  function create_if_block_8(ctx) {
    var div;
    var button;
    var span;
    var t1;
    var i;
    var mounted;
    var dispose;
    return {
      c: function c() {
        div = element("div");
        button = element("button");
        span = element("span");
        span.textContent = "".concat(
        /*translate*/
        ctx[25]("toggle"));
        t1 = space();
        i = element("i");
        attr(span, "class", "sr-only");
        attr(i, "class", "text-dark fas fa-caret-down");
        attr(i, "aria-hidden", "true");
        attr(button, "class", "btn btn-outline-secondary");
        attr(button, "type", "button");
        attr(button, "tabindex", "-1");
        attr(div, "class", "input-group-append");
      },
      m: function m(target, anchor) {
        insert(target, div, anchor);
        append(div, button);
        append(button, span);
        append(button, t1);
        append(button, i);
        /*button_binding*/

        ctx[43](button);

        if (!mounted) {
          dispose = [listen(button, "blur",
          /*handleBlur*/
          ctx[26]), listen(button, "keydown",
          /*handleToggleKeydown*/
          ctx[30]), listen(button, "click",
          /*handleToggleClick*/
          ctx[31])];
          mounted = true;
        }
      },
      p: noop,
      d: function d(detaching) {
        if (detaching) detach(div);
        /*button_binding*/

        ctx[43](null);
        mounted = false;
        run_all(dispose);
      }
    };
  } // (968:10) {:else}


  function create_else_block_1(ctx) {
    var li;
    var div;
    var t0_value = (
    /*item*/
    ctx[92].display_text ||
    /*item*/
    ctx[92].text) + "";
    var t0;
    var t1;
    var t2;
    var li_data_index_value;
    var li_id_value;
    var mounted;
    var dispose;
    var if_block =
    /*item*/
    ctx[92].desc && create_if_block_7(ctx);
    return {
      c: function c() {
        li = element("li");
        div = element("div");
        t0 = text(t0_value);
        t1 = space();
        if (if_block) if_block.c();
        t2 = space();
        attr(div, "class", "ts-item-text");
        attr(li, "class", "dropdown-item ts-item ts-js-item");
        attr(li, "data-index", li_data_index_value =
        /*index*/
        ctx[94]);
        attr(li, "id", li_id_value = "" + (
        /*containerId*/
        ctx[11] + "_item_" +
        /*index*/
        ctx[94]));
      },
      m: function m(target, anchor) {
        insert(target, li, anchor);
        append(li, div);
        append(div, t0);
        append(li, t1);
        if (if_block) if_block.m(li, null);
        append(li, t2);

        if (!mounted) {
          dispose = listen(li, "click",
          /*handleOptionClick*/
          ctx[32]);
          mounted = true;
        }
      },
      p: function p(ctx, dirty) {
        if (dirty[0] &
        /*items*/
        32768 && t0_value !== (t0_value = (
        /*item*/
        ctx[92].display_text ||
        /*item*/
        ctx[92].text) + "")) set_data(t0, t0_value);

        if (
        /*item*/
        ctx[92].desc) {
          if (if_block) {
            if_block.p(ctx, dirty);
          } else {
            if_block = create_if_block_7(ctx);
            if_block.c();
            if_block.m(li, t2);
          }
        } else if (if_block) {
          if_block.d(1);
          if_block = null;
        }

        if (dirty[0] &
        /*containerId*/
        2048 && li_id_value !== (li_id_value = "" + (
        /*containerId*/
        ctx[11] + "_item_" +
        /*index*/
        ctx[94]))) {
          attr(li, "id", li_id_value);
        }
      },
      d: function d(detaching) {
        if (detaching) detach(li);
        if (if_block) if_block.d();
        mounted = false;
        dispose();
      }
    };
  } // (957:54) 


  function create_if_block_5(ctx) {
    var li;
    var div;
    var t0_value = (
    /*item*/
    ctx[92].display_text ||
    /*item*/
    ctx[92].text) + "";
    var t0;
    var t1;
    var t2;
    var if_block =
    /*item*/
    ctx[92].desc && create_if_block_6(ctx);
    return {
      c: function c() {
        li = element("li");
        div = element("div");
        t0 = text(t0_value);
        t1 = space();
        if (if_block) if_block.c();
        t2 = space();
        attr(div, "class", "ts-item-text");
        attr(li, "class", "dropdown-item ts-item-disabled ts-js-dead");
      },
      m: function m(target, anchor) {
        insert(target, li, anchor);
        append(li, div);
        append(div, t0);
        append(li, t1);
        if (if_block) if_block.m(li, null);
        append(li, t2);
      },
      p: function p(ctx, dirty) {
        if (dirty[0] &
        /*items*/
        32768 && t0_value !== (t0_value = (
        /*item*/
        ctx[92].display_text ||
        /*item*/
        ctx[92].text) + "")) set_data(t0, t0_value);

        if (
        /*item*/
        ctx[92].desc) {
          if (if_block) {
            if_block.p(ctx, dirty);
          } else {
            if_block = create_if_block_6(ctx);
            if_block.c();
            if_block.m(li, t2);
          }
        } else if (if_block) {
          if_block.d(1);
          if_block = null;
        }
      },
      d: function d(detaching) {
        if (detaching) detach(li);
        if (if_block) if_block.d();
      }
    };
  } // (953:10) {#if item.separator}


  function create_if_block_4(ctx) {
    var li;
    var li_data_index_value;
    return {
      c: function c() {
        li = element("li");
        attr(li, "class", "dropdown-divider ts-js-dead");
        attr(li, "data-index", li_data_index_value =
        /*index*/
        ctx[94]);
      },
      m: function m(target, anchor) {
        insert(target, li, anchor);
      },
      p: noop,
      d: function d(detaching) {
        if (detaching) detach(li);
      }
    };
  } // (979:14) {#if item.desc}


  function create_if_block_7(ctx) {
    var div;
    var t_value =
    /*item*/
    ctx[92].desc + "";
    var t;
    return {
      c: function c() {
        div = element("div");
        t = text(t_value);
        attr(div, "class", "ts-item-desc");
      },
      m: function m(target, anchor) {
        insert(target, div, anchor);
        append(div, t);
      },
      p: function p(ctx, dirty) {
        if (dirty[0] &
        /*items*/
        32768 && t_value !== (t_value =
        /*item*/
        ctx[92].desc + "")) set_data(t, t_value);
      },
      d: function d(detaching) {
        if (detaching) detach(div);
      }
    };
  } // (962:14) {#if item.desc}


  function create_if_block_6(ctx) {
    var div;
    var t_value =
    /*item*/
    ctx[92].desc + "";
    var t;
    return {
      c: function c() {
        div = element("div");
        t = text(t_value);
        attr(div, "class", "ts-item-desc");
      },
      m: function m(target, anchor) {
        insert(target, div, anchor);
        append(div, t);
      },
      p: function p(ctx, dirty) {
        if (dirty[0] &
        /*items*/
        32768 && t_value !== (t_value =
        /*item*/
        ctx[92].desc + "")) set_data(t, t_value);
      },
      d: function d(detaching) {
        if (detaching) detach(div);
      }
    };
  } // (952:8) {#each items as item, index}


  function create_each_block(ctx) {
    var if_block_anchor;

    function select_block_type(ctx, dirty) {
      if (
      /*item*/
      ctx[92].separator) return create_if_block_4;
      if (
      /*item*/
      ctx[92].disabled ||
      /*item*/
      ctx[92].placeholder) return create_if_block_5;
      return create_else_block_1;
    }

    var current_block_type = select_block_type(ctx);
    var if_block = current_block_type(ctx);
    return {
      c: function c() {
        if_block.c();
        if_block_anchor = empty();
      },
      m: function m(target, anchor) {
        if_block.m(target, anchor);
        insert(target, if_block_anchor, anchor);
      },
      p: function p(ctx, dirty) {
        if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
          if_block.p(ctx, dirty);
        } else {
          if_block.d(1);
          if_block = current_block_type(ctx);

          if (if_block) {
            if_block.c();
            if_block.m(if_block_anchor.parentNode, if_block_anchor);
          }
        }
      },
      d: function d(detaching) {
        if_block.d(detaching);
        if (detaching) detach(if_block_anchor);
      }
    };
  } // (998:32) 


  function create_if_block_2(ctx) {
    var div;

    function select_block_type_2(ctx, dirty) {
      if (
      /*tooShort*/
      ctx[17]) return create_if_block_3;
      return create_else_block;
    }

    var current_block_type = select_block_type_2(ctx);
    var if_block = current_block_type(ctx);
    return {
      c: function c() {
        div = element("div");
        if_block.c();
        attr(div, "class", "dropdown-item ts-item-muted ts-message-item");
      },
      m: function m(target, anchor) {
        insert(target, div, anchor);
        if_block.m(div, null);
      },
      p: function p(ctx, dirty) {
        if (current_block_type === (current_block_type = select_block_type_2(ctx)) && if_block) {
          if_block.p(ctx, dirty);
        } else {
          if_block.d(1);
          if_block = current_block_type(ctx);

          if (if_block) {
            if_block.c();
            if_block.m(div, null);
          }
        }
      },
      d: function d(detaching) {
        if (detaching) detach(div);
        if_block.d();
      }
    };
  } // (994:43) 


  function create_if_block_1(ctx) {
    var div;
    return {
      c: function c() {
        div = element("div");
        div.textContent = "".concat(
        /*translate*/
        ctx[25]("fetching"));
        attr(div, "class", "dropdown-item ts-item-muted ts-message-item");
      },
      m: function m(target, anchor) {
        insert(target, div, anchor);
      },
      p: noop,
      d: function d(detaching) {
        if (detaching) detach(div);
      }
    };
  } // (990:4) {#if fetchError}


  function create_if_block(ctx) {
    var div;
    var t;
    return {
      c: function c() {
        div = element("div");
        t = text(
        /*fetchError*/
        ctx[20]);
        attr(div, "class", "dropdown-item text-danger ts-message-item");
      },
      m: function m(target, anchor) {
        insert(target, div, anchor);
        append(div, t);
      },
      p: function p(ctx, dirty) {
        if (dirty[0] &
        /*fetchError*/
        1048576) set_data(t,
        /*fetchError*/
        ctx[20]);
      },
      d: function d(detaching) {
        if (detaching) detach(div);
      }
    };
  } // (1002:8) {:else}


  function create_else_block(ctx) {
    var t_value =
    /*translate*/
    ctx[25]("no_results") + "";
    var t;
    return {
      c: function c() {
        t = text(t_value);
      },
      m: function m(target, anchor) {
        insert(target, t, anchor);
      },
      p: noop,
      d: function d(detaching) {
        if (detaching) detach(t);
      }
    };
  } // (1000:8) {#if tooShort }


  function create_if_block_3(ctx) {
    var t_value =
    /*translate*/
    ctx[25]("too_short") + "";
    var t;
    return {
      c: function c() {
        t = text(t_value);
      },
      m: function m(target, anchor) {
        insert(target, t, anchor);
      },
      p: noop,
      d: function d(detaching) {
        if (detaching) detach(t);
      }
    };
  }

  function create_fragment(ctx) {
    var div3;
    var div0;
    var input;
    var input_aria_controls_value;
    var input_aria_activedescendant_value;
    var input_data_target_value;
    var input_placeholder_value;
    var t0;
    var t1;
    var div2;
    var div1;
    var ul;
    var ul_id_value;
    var t2;
    var div2_aria_hidden_value;
    var div2_id_value;
    var div3_class_value;
    var mounted;
    var dispose;
    var if_block0 =
    /*showToggle*/
    ctx[3] && create_if_block_8(ctx);
    var each_value =
    /*items*/
    ctx[15];
    var each_blocks = [];

    for (var i = 0; i < each_value.length; i += 1) {
      each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    }

    function select_block_type_1(ctx, dirty) {
      if (
      /*fetchError*/
      ctx[20]) return create_if_block;
      if (
      /*activeFetch*/
      ctx[24] && !
      /*fetchingMore*/
      ctx[19]) return create_if_block_1;
      if (
      /*actualCount*/
      ctx[16] === 0) return create_if_block_2;
    }

    var current_block_type = select_block_type_1(ctx);
    var if_block1 = current_block_type && current_block_type(ctx);
    return {
      c: function c() {
        div3 = element("div");
        div0 = element("div");
        input = element("input");
        t0 = space();
        if (if_block0) if_block0.c();
        t1 = space();
        div2 = element("div");
        div1 = element("div");
        ul = element("ul");

        for (var _i = 0; _i < each_blocks.length; _i += 1) {
          each_blocks[_i].c();
        }

        t2 = space();
        if (if_block1) if_block1.c();
        attr(input, "class", "form-control ts-input");
        attr(input, "autocomplete", "new-password");
        attr(input, "autocorrect", "off");
        attr(input, "autocapitalize", "off");
        attr(input, "spellcheck", "off");
        attr(input, "role", "combobox");
        attr(input, "aria-labelledby",
        /*labelId*/
        ctx[13]);
        attr(input, "aria-label",
        /*labelText*/
        ctx[14]);
        attr(input, "aria-expanded",
        /*popupVisible*/
        ctx[21]);
        attr(input, "aria-haspopup", "listbox");
        attr(input, "aria-controls", input_aria_controls_value = "" + (
        /*containerId*/
        ctx[11] + "_items"));
        attr(input, "aria-activedescendant", input_aria_activedescendant_value =
        /*activeId*/
        ctx[18] || null);
        attr(input, "data-target", input_data_target_value =
        /*real*/
        ctx[0].id);
        attr(input, "placeholder", input_placeholder_value =
        /*real*/
        ctx[0].placeholder);
        attr(div0, "class", "input-group");
        attr(ul, "class", "ts-item-list");
        attr(ul, "id", ul_id_value = "" + (
        /*containerId*/
        ctx[11] + "_items"));
        attr(ul, "role", "listbox");
        attr(ul, "aria-expanded",
        /*popupVisible*/
        ctx[21]);
        attr(ul, "aria-hidden", "false");
        attr(div1, "class", "ts-result");
        attr(div2, "class", "dropdown-menu ts-popup");
        attr(div2, "aria-hidden", div2_aria_hidden_value = !
        /*popupVisible*/
        ctx[21]);
        attr(div2, "id", div2_id_value = "" + (
        /*containerId*/
        ctx[11] + "_popup"));
        toggle_class(div2, "show",
        /*popupVisible*/
        ctx[21]);
        toggle_class(div2, "ts-popup-fixed",
        /*popupFixed*/
        ctx[4]);
        toggle_class(div2, "ts-popup-top",
        /*popupTop*/
        ctx[22] && !
        /*popupFixed*/
        ctx[4]);
        toggle_class(div2, "ts-popup-left",
        /*popupLeft*/
        ctx[23] && !
        /*popupFixed*/
        ctx[4]);
        toggle_class(div2, "ts-popup-fixed-top",
        /*popupTop*/
        ctx[22] &&
        /*popupFixed*/
        ctx[4]);
        toggle_class(div2, "ts-popup-fixed-left",
        /*popupLeft*/
        ctx[23] &&
        /*popupFixed*/
        ctx[4]);
        attr(div3, "class", div3_class_value = "form-control ts-container " +
        /*styles*/
        ctx[2].container_class);
        attr(div3, "id",
        /*containerId*/
        ctx[11]);
        attr(div3, "name",
        /*containerName*/
        ctx[12]);
      },
      m: function m(target, anchor) {
        insert(target, div3, anchor);
        append(div3, div0);
        append(div0, input);
        /*input_binding*/

        ctx[41](input);
        set_input_value(input,
        /*query*/
        ctx[1]);
        append(div0, t0);
        if (if_block0) if_block0.m(div0, null);
        append(div3, t1);
        append(div3, div2);
        append(div2, div1);
        append(div1, ul);

        for (var _i2 = 0; _i2 < each_blocks.length; _i2 += 1) {
          each_blocks[_i2].m(ul, null);
        }
        /*ul_binding*/


        ctx[44](ul);
        /*div1_binding*/

        ctx[45](div1);
        append(div2, t2);
        if (if_block1) if_block1.m(div2, null);
        /*div2_binding*/

        ctx[46](div2);
        /*div3_binding*/

        ctx[47](div3);

        if (!mounted) {
          dispose = [listen(window_1, "scroll",
          /*handleWindowScroll*/
          ctx[34]), listen(input, "input",
          /*input_input_handler*/
          ctx[42]), listen(input, "blur",
          /*handleBlur*/
          ctx[26]), listen(input, "keypress",
          /*handleInputKeypress*/
          ctx[27]), listen(input, "keydown",
          /*handleInputKeydown*/
          ctx[28]), listen(input, "keyup",
          /*handleInputKeyup*/
          ctx[29]), listen(div1, "scroll",
          /*handleResultScroll*/
          ctx[33])];
          mounted = true;
        }
      },
      p: function p(ctx, dirty) {
        if (dirty[0] &
        /*labelId*/
        8192) {
          attr(input, "aria-labelledby",
          /*labelId*/
          ctx[13]);
        }

        if (dirty[0] &
        /*labelText*/
        16384) {
          attr(input, "aria-label",
          /*labelText*/
          ctx[14]);
        }

        if (dirty[0] &
        /*popupVisible*/
        2097152) {
          attr(input, "aria-expanded",
          /*popupVisible*/
          ctx[21]);
        }

        if (dirty[0] &
        /*containerId*/
        2048 && input_aria_controls_value !== (input_aria_controls_value = "" + (
        /*containerId*/
        ctx[11] + "_items"))) {
          attr(input, "aria-controls", input_aria_controls_value);
        }

        if (dirty[0] &
        /*activeId*/
        262144 && input_aria_activedescendant_value !== (input_aria_activedescendant_value =
        /*activeId*/
        ctx[18] || null)) {
          attr(input, "aria-activedescendant", input_aria_activedescendant_value);
        }

        if (dirty[0] &
        /*real*/
        1 && input_data_target_value !== (input_data_target_value =
        /*real*/
        ctx[0].id)) {
          attr(input, "data-target", input_data_target_value);
        }

        if (dirty[0] &
        /*real*/
        1 && input_placeholder_value !== (input_placeholder_value =
        /*real*/
        ctx[0].placeholder)) {
          attr(input, "placeholder", input_placeholder_value);
        }

        if (dirty[0] &
        /*query*/
        2 && input.value !==
        /*query*/
        ctx[1]) {
          set_input_value(input,
          /*query*/
          ctx[1]);
        }

        if (
        /*showToggle*/
        ctx[3]) {
          if (if_block0) {
            if_block0.p(ctx, dirty);
          } else {
            if_block0 = create_if_block_8(ctx);
            if_block0.c();
            if_block0.m(div0, null);
          }
        } else if (if_block0) {
          if_block0.d(1);
          if_block0 = null;
        }

        if (dirty[0] &
        /*items, containerId*/
        34816 | dirty[1] &
        /*handleOptionClick*/
        2) {
          each_value =
          /*items*/
          ctx[15];

          var _i3;

          for (_i3 = 0; _i3 < each_value.length; _i3 += 1) {
            var child_ctx = get_each_context(ctx, each_value, _i3);

            if (each_blocks[_i3]) {
              each_blocks[_i3].p(child_ctx, dirty);
            } else {
              each_blocks[_i3] = create_each_block(child_ctx);

              each_blocks[_i3].c();

              each_blocks[_i3].m(ul, null);
            }
          }

          for (; _i3 < each_blocks.length; _i3 += 1) {
            each_blocks[_i3].d(1);
          }

          each_blocks.length = each_value.length;
        }

        if (dirty[0] &
        /*containerId*/
        2048 && ul_id_value !== (ul_id_value = "" + (
        /*containerId*/
        ctx[11] + "_items"))) {
          attr(ul, "id", ul_id_value);
        }

        if (dirty[0] &
        /*popupVisible*/
        2097152) {
          attr(ul, "aria-expanded",
          /*popupVisible*/
          ctx[21]);
        }

        if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block1) {
          if_block1.p(ctx, dirty);
        } else {
          if (if_block1) if_block1.d(1);
          if_block1 = current_block_type && current_block_type(ctx);

          if (if_block1) {
            if_block1.c();
            if_block1.m(div2, null);
          }
        }

        if (dirty[0] &
        /*popupVisible*/
        2097152 && div2_aria_hidden_value !== (div2_aria_hidden_value = !
        /*popupVisible*/
        ctx[21])) {
          attr(div2, "aria-hidden", div2_aria_hidden_value);
        }

        if (dirty[0] &
        /*containerId*/
        2048 && div2_id_value !== (div2_id_value = "" + (
        /*containerId*/
        ctx[11] + "_popup"))) {
          attr(div2, "id", div2_id_value);
        }

        if (dirty[0] &
        /*popupVisible*/
        2097152) {
          toggle_class(div2, "show",
          /*popupVisible*/
          ctx[21]);
        }

        if (dirty[0] &
        /*popupFixed*/
        16) {
          toggle_class(div2, "ts-popup-fixed",
          /*popupFixed*/
          ctx[4]);
        }

        if (dirty[0] &
        /*popupTop, popupFixed*/
        4194320) {
          toggle_class(div2, "ts-popup-top",
          /*popupTop*/
          ctx[22] && !
          /*popupFixed*/
          ctx[4]);
        }

        if (dirty[0] &
        /*popupLeft, popupFixed*/
        8388624) {
          toggle_class(div2, "ts-popup-left",
          /*popupLeft*/
          ctx[23] && !
          /*popupFixed*/
          ctx[4]);
        }

        if (dirty[0] &
        /*popupTop, popupFixed*/
        4194320) {
          toggle_class(div2, "ts-popup-fixed-top",
          /*popupTop*/
          ctx[22] &&
          /*popupFixed*/
          ctx[4]);
        }

        if (dirty[0] &
        /*popupLeft, popupFixed*/
        8388624) {
          toggle_class(div2, "ts-popup-fixed-left",
          /*popupLeft*/
          ctx[23] &&
          /*popupFixed*/
          ctx[4]);
        }

        if (dirty[0] &
        /*styles*/
        4 && div3_class_value !== (div3_class_value = "form-control ts-container " +
        /*styles*/
        ctx[2].container_class)) {
          attr(div3, "class", div3_class_value);
        }

        if (dirty[0] &
        /*containerId*/
        2048) {
          attr(div3, "id",
          /*containerId*/
          ctx[11]);
        }

        if (dirty[0] &
        /*containerName*/
        4096) {
          attr(div3, "name",
          /*containerName*/
          ctx[12]);
        }
      },
      i: noop,
      o: noop,
      d: function d(detaching) {
        if (detaching) detach(div3);
        /*input_binding*/

        ctx[41](null);
        if (if_block0) if_block0.d();
        destroy_each(each_blocks, detaching);
        /*ul_binding*/

        ctx[44](null);
        /*div1_binding*/

        ctx[45](null);

        if (if_block1) {
          if_block1.d();
        }
        /*div2_binding*/


        ctx[46](null);
        /*div3_binding*/

        ctx[47](null);
        mounted = false;
        run_all(dispose);
      }
    };
  }
  var I18N_DEFAULTS = {
    fetching: "Searching..",
    no_results: "No results",
    too_short: "Too short",
    toggle: "Toggle popup",
    fetching_more: "Searching more..."
  };
  var STYLE_DEFAULTS = {
    container_class: ""
  };
  var META_KEYS = {
    // Modifiers
    Control: true,
    Shift: true,
    Alt: true,
    AltGraph: true,
    Meta: true,
    // Special keys
    ContextMenu: true,
    PrintScreen: true,
    ScrollLock: true,
    Pause: true,
    CapsLock: true,
    Numlock: true,
    // Nav keys
    Escape: true,
    Tab: true,
    ArrowDown: true,
    ArrowUp: true,
    ArrowLeft: true,
    ArrowRight: true,
    PageDown: true,
    PageUp: true,
    Home: true,
    End: true,
    // Ignore function keys
    F1: true,
    F2: true,
    F3: true,
    F4: true,
    F5: true,
    F6: true,
    F7: true,
    F8: true,
    F9: true,
    F10: true,
    F11: true,
    F12: true
  };
  var MUTATIONS = {
    attributes: true
  };
  var uidBase = 0;

  function nop() {}

  function nextUID() {
    uidBase++;
    return uidBase;
  }

  function hasModifier(event) {
    return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
  }

  function isMetaKey(event) {
    return META_KEYS[event.key] || META_KEYS[event.code];
  }
  //

  function handleEvent(code, handlers, event) {
    (handlers[code] || handlers.base)(event);
  }

  function instance($$self, $$props, $$invalidate) {
    var real = $$props.real;
    var _$$props$debugMode = $$props.debugMode,
        debugMode = _$$props$debugMode === void 0 ? false : _$$props$debugMode;
    var fetcher = $$props.fetcher;
    var _$$props$queryMinLen = $$props.queryMinLen,
        queryMinLen = _$$props$queryMinLen === void 0 ? 1 : _$$props$queryMinLen;
    var query = $$props.query;
    var _$$props$delay = $$props.delay,
        delay = _$$props$delay === void 0 ? 200 : _$$props$delay;
    var _$$props$translations = $$props.translations,
        translations = _$$props$translations === void 0 ? {} : _$$props$translations;
    var _$$props$styles = $$props.styles,
        styles = _$$props$styles === void 0 ? {} : _$$props$styles;
    var _$$props$showToggle = $$props.showToggle,
        showToggle = _$$props$showToggle === void 0 ? false : _$$props$showToggle;
    var _$$props$passEnter = $$props.passEnter,
        passEnter = _$$props$passEnter === void 0 ? false : _$$props$passEnter;
    var _$$props$popupFixed = $$props.popupFixed,
        popupFixed = _$$props$popupFixed === void 0 ? false : _$$props$popupFixed;
    var containerEl;
    var inputEl;
    var toggleEl;
    var popupEl;
    var resultEl;
    var optionsEl;
    var containerId = null;
    var containerName = null;
    var labelId = null;
    var labelText = null;
    var mutationObserver = new MutationObserver(handleMutation);
    var resizeObserver = null;
    var setupDone = false;
    var items = [];
    var offsetCount = 0;
    var actualCount = 0;
    var hasMore = false;
    var tooShort = false;
    var activeId = null;
    var fetchingMore = false;
    var fetchError = null;
    var popupVisible = false;
    var popupTop = false;
    var popupLeft = false;
    var activeFetch = null;
    var previousQuery = null;
    var selectedItem = null;
    var wasDown = false;
    var disabled = false;
    var isSyncToReal = false; ////////////////////////////////////////////////////////////
    // Utils

    function translate(key) {
      return translations[key];
    }

    function focusInput() {
      if (disabled) {
        return;
      }

      if (document.activeElement !== inputEl) {
        inputEl.focus();
      }
    } ////////////////////////////////////////////////////////////
    //


    function fetchItems(fetchMore) {
      var currentQuery = query.trim();

      if (currentQuery.length > 0) {
        currentQuery = query;
      }

      if (!fetchMore && !fetchingMore && currentQuery === previousQuery) {
        return;
      } //     console.debug("START fetch: " + currentQuery);


      cancelFetch();
      var fetchOffset = 0;

      if (fetchMore) {
        fetchOffset = offsetCount;
        $$invalidate(19, fetchingMore = true);
      } else {
        $$invalidate(15, items = []);
        offsetCount = 0;
        $$invalidate(16, actualCount = 0);
        hasMore = false;
        $$invalidate(19, fetchingMore = false);
      }

      $$invalidate(20, fetchError = null);
      var currentFetchOffset = fetchOffset;
      var currentFetchingMore = fetchingMore;
      var currentFetch = new Promise(function (resolve, reject) {
        if (currentFetchingMore) {
          //             console.debug("MOR hit: " + currentQuery);
          resolve(fetcher(currentFetchOffset, currentQuery));
        } else {
          if (currentQuery.length < queryMinLen) {
            //                 console.debug("TOO_SHORT fetch: " + currentQuery + ", limit: " + queryMinLen);
            resolve({
              items: [],
              info: {
                more: false,
                too_short: true
              }
            });
          } else {
            //                 console.debug("TIMER start: " + currentQuery);
            setTimeout(function () {
              if (currentFetch === activeFetch) {
                //                         console.debug("TIMER hit: " + currentQuery);
                resolve(fetcher(currentFetchOffset, currentQuery));
              } else {
                //                         console.debug("TIMER reject: " + currentQuery);
                reject("cancel");
              }
            }, delay);
          }
        }
      }).then(function (response) {
        if (currentFetch === activeFetch) {
          var fetchedtems = response.items || [];
          var info = response.info || {}; //             console.debug("APPLY fetch: " + currentQuery + ", isMore: " + currentFetchingMore + ", offset: " + currentFetchOffset + ", resultSize: " + fetchedtems.length + ", oldSize: " + items.length);
          //             console.debug(info);

          var newItems;

          if (currentFetchingMore) {
            newItems = items;
            fetchedtems.forEach(function (item) {
              newItems.push(item);
            });
          } else {
            newItems = fetchedtems;
          }

          $$invalidate(15, items = newItems);
          resolveItems(items);
          hasMore = info.more && offsetCount > 0;
          $$invalidate(17, tooShort = info.too_short === true);
          previousQuery = currentQuery;
          $$invalidate(24, activeFetch = null);
          $$invalidate(19, fetchingMore = false);
        } //         } else {
        //             console.debug("ABORT fetch: " + currentQuery);

      })["catch"](function (err) {
        if (currentFetch === activeFetch) {
          console.error(err);
          $$invalidate(20, fetchError = err);
          $$invalidate(15, items = []);
          offsetCount = 0;
          $$invalidate(16, actualCount = 0);
          hasMore = false;
          $$invalidate(17, tooShort = false);
          previousQuery = null;
          $$invalidate(24, activeFetch = null);
          $$invalidate(19, fetchingMore = false);
          focusInput();
          openPopup();
        }
      });
      $$invalidate(24, activeFetch = currentFetch);
    }

    function resolveItems(items) {
      var off = 0;
      var act = 0;
      items.forEach(function (item) {
        if (item.id) {
          item.id = item.id.toString();
        }

        if (item.separator) ; else if (item.placeholder) {
          // NOTE KI does not affect pagination
          act += 1; // NOTE KI separator is ignored always
        } else {
          // NOTE KI normal or disabled affects pagination
          off += 1;
          act += 1;
        }
      });
      offsetCount = off;
      $$invalidate(16, actualCount = act);
    }

    function cancelFetch() {
      if (activeFetch !== null) {
        $$invalidate(24, activeFetch = null); // no result fetched; since it doesn't match input any longer
        previousQuery = null;
      }
    }

    function fetchMoreIfneeded() {
      if (hasMore && !fetchingMore && popupVisible) {
        var lastItem = optionsEl.querySelector(".ts-item:last-child");

        if (resultEl.scrollTop + resultEl.clientHeight >= resultEl.scrollHeight - lastItem.clientHeight * 2 - 2) {
          fetchItems(true);
        }
      }
    }

    function closePopup(focus) {
      $$invalidate(21, popupVisible = false);

      if (focus) {
        focusInput();
      }
    }

    function openPopup() {
      if (popupVisible) {
        return false;
      }

      $$invalidate(21, popupVisible = true);
      var w = containerEl.offsetWidth;
      $$invalidate(8, popupEl.style.minWidth = w + "px", popupEl);
      updatePopupPosition();
      return true;
    }

    function selectOption(el) {
      if (!el || disabled) {
        return;
      }

      var item = items[el.dataset.index];

      if (item) {
        $$invalidate(54, selectedItem = item);
        var changed = item.text !== query;
        $$invalidate(1, query = item.text);
        previousQuery = query.trim();

        if (previousQuery.length > 0) {
          previousQuery = query;
        }

        closePopup(true);

        if (changed) {
          previousQuery = null;
        }

        syncToReal(query);
        real.dispatchEvent(new CustomEvent("typeahead-select", {
          detail: item
        }));
      } //     } else {
      //         console.debug("MISSING item", el);

    }

    function containsElement(el) {
      return el === inputEl || el === toggleEl || popupEl.contains(el);
    }

    function syncFromRealDisabled() {
      disabled = real.disabled;

      if (disabled) {
        closePopup();
      }
    }

    function syncFromReal() {
      if (isSyncToReal) {
        return;
      }

      var realValue = real.value;

      if (realValue !== query) {
        $$invalidate(1, query = realValue);
      }
    }

    function syncToReal(query, selectedItem) {

      if (real.value !== query) {
        try {
          isSyncToReal = true;
          $$invalidate(0, real.value = query, real);
          real.dispatchEvent(new Event("change"));
        } finally {
          isSyncToReal = false;
        }
      }
    }

    onMount(function () {
      $$invalidate(1, query = real.value || "");
      syncFromRealDisabled();
      Object.keys(eventListeners).forEach(function (ev) {
        real.addEventListener(ev, eventListeners[ev]);
      });
    });
    beforeUpdate(function () {
      if (!setupDone) {
        setupComponent();
        setupDone = true;
      }
    });
    afterUpdate(function () {
      if (popupFixed && !resizeObserver) {
        resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(containerEl, {});
      }

      updatePopupPosition();
    });

    function setupComponent() {
      real.classList.add("ts-real-hidden");
      real.setAttribute("tabindex", "-1");
      real.setAttribute("aria-hidden", "true");
      var ds = real.dataset;
      var baseId = real.id || nextUID();
      $$invalidate(11, containerId = "ts_container_".concat(baseId));
      $$invalidate(12, containerName = real.name ? "ts_container_".concat(real.name) : null);
      mutationObserver.observe(real, MUTATIONS);
      bindLabel();
      $$invalidate(35, queryMinLen = ds.tsQueryMinLen !== undefined ? parseInt(ds.tsQueryMinLen, 10) : queryMinLen);
      $$invalidate(1, query = ds.tsQuery !== undefined ? ds.tsQuery : query);
      $$invalidate(36, delay = ds.tsDelay !== undefined ? parseInt(ds.tsDelay, 10) : delay);
      $$invalidate(3, showToggle = ds.tsShowToggle !== undefined ? true : showToggle);
      $$invalidate(38, passEnter = ds.tsPassEnter !== undefined ? true : passEnter);
      $$invalidate(4, popupFixed = ds.tsPopupFixed !== undefined ? true : popupFixed);
      $$invalidate(37, translations = Object.assign({}, I18N_DEFAULTS, translations || {}));
      $$invalidate(2, styles = Object.assign({}, STYLE_DEFAULTS, styles || {}));
    }

    function bindLabel() {
      if (real.id) {
        var label = document.querySelector("[for=\"".concat(real.id, "\"]"));

        if (label) {
          label.id = label.id || "ts_label_".concat(real.id);
          $$invalidate(13, labelId = label.id);
        }
      }

      if (!labelId) {
        $$invalidate(14, labelText = real.getAttribute("aria-label") || null);
      }
    }

    function handleMutation(mutationsList, observer) {
      var _iterator = _createForOfIteratorHelper(mutationsList),
          _step;

      try {
        for (_iterator.s(); !(_step = _iterator.n()).done;) {
          var mutation = _step.value;

          if (mutation.type === "attributes") {
            if (mutation.attributeName === "disabled") {
              syncFromRealDisabled();
            }
          }
        }
      } catch (err) {
        _iterator.e(err);
      } finally {
        _iterator.f();
      }
    }

    function handleResize(resizeList, observer) {
      updatePopupPosition();
    }

    function findActiveOption() {
      return optionsEl.querySelector(".ts-item-active");
    }

    function findFirstOption() {
      var children = optionsEl.children;
      return children[0];
    }

    function findLastOption() {
      var children = optionsEl.children;
      return children[children.length - 1];
    }

    function updatePopupPosition() {
      if (!popupVisible) {
        return;
      }

      var bounds = containerEl.getBoundingClientRect();
      var middleY = window.innerHeight / 2;
      var middleX = window.innerWidth / 2;
      $$invalidate(22, popupTop = bounds.y > middleY);
      $$invalidate(23, popupLeft = bounds.x + bounds.width > middleX);

      if (popupFixed) {
        var popupBounds = popupEl.getBoundingClientRect();

        if (popupTop) {
          $$invalidate(8, popupEl.style.top = "".concat(bounds.y - popupBounds.height, "px"), popupEl);
        } else {
          $$invalidate(8, popupEl.style.top = "".concat(bounds.y + bounds.height, "px"), popupEl);
        }

        if (popupLeft) {
          $$invalidate(8, popupEl.style.left = "".concat(bounds.x + bounds.width - popupBounds.width, "px"), popupEl);
        } else {
          $$invalidate(8, popupEl.style.left = "".concat(bounds.x, "px"), popupEl);
        }
      }
    }

    var eventListeners = {
      change: function change() {
        syncFromReal();
      },
      "focus": function focus(event) {
        focusInput();
      }
    }; ////////////////////////////////////////////////////////////
    //

    var inputKeypressHandlers = {
      base: function base(event) {
        $$invalidate(54, selectedItem = null);
      }
    };
    var inputKeydownHandlers = {
      base: function base(event) {
        if (isMetaKey(event)) {
          return;
        }

        wasDown = true;
      },
      Enter: function Enter(event) {
        if (popupVisible) {
          var el = findActiveOption();

          if (el) {
            selectOption(el);
          } else {
            closePopup(true);
          }

          if (!passEnter) {
            event.preventDefault();
          }
        }
      },
      ArrowDown: function ArrowDown(event) {
        if (openPopup()) {
          fetchItems();
        } else {
          if (!fetchingMore) {
            activateArrowDown(event);
          }
        }

        event.preventDefault();
      },
      ArrowUp: function ArrowUp(event) {
        activateArrowUp(event);
      },
      PageUp: function PageUp(event) {
        activatePageUp(event);
      },
      PageDown: function PageDown(event) {
        activatePageDown(event);
      },
      Home: function Home(event) {
        activateHome(event);
      },
      End: function End(event) {
        activateEnd(event);
      },
      Escape: function Escape(event) {
        cancelFetch();
        closePopup(false);
      },
      Tab: nop
    };
    var inputKeyupHandlers = {
      base: function base(event) {
        if (wasDown && !isMetaKey(event)) {
          openPopup();
          fetchItems();
        }

        wasDown = false;
      },
      Enter: nop,
      Escape: nop,
      Tab: nop,
      // skip "meta" keys from triggering search
      ArrowDown: nop,
      ArrowUp: nop,
      ArrowLeft: nop,
      ArrowRight: nop,
      PageDown: nop,
      PageUp: nop,
      Home: nop,
      End: nop,
      // disallow modifier keys to trigger search
      Control: nop,
      Shift: nop,
      AltGraph: nop,
      Meta: nop,
      ContextMenu: nop
    };
    var toggleKeydownHandlers = {
      base: function base(event) {
        if (isMetaKey(event)) {
          return;
        }

        focusInput();
      },
      Enter: inputKeydownHandlers.Enter,
      ArrowUp: inputKeydownHandlers.ArrowUp,
      ArrowDown: inputKeydownHandlers.ArrowDown,
      PageUp: inputKeydownHandlers.PageUp,
      PageDown: inputKeydownHandlers.PageDown,
      Home: inputKeydownHandlers.Home,
      End: inputKeydownHandlers.End,
      Escape: function Escape(event) {
        cancelFetch();
        closePopup(false);
        focusInput();
      },
      Tab: function Tab(event) {
        focusInput();
      }
    };

    function activateOption(el, old) {
      old = old || findActiveOption();

      if (old && old !== el) {
        old.classList.remove("ts-item-active");
      }

      $$invalidate(18, activeId = null);

      if (!el) {
        return;
      }

      el.classList.add("ts-item-active");
      $$invalidate(18, activeId = "".concat(containerId, "_item_").concat(el.dataset.index));
      var clientHeight = resultEl.clientHeight;

      if (resultEl.scrollHeight > clientHeight) {
        var y = el.offsetTop;
        var elementBottom = y + el.offsetHeight;
        var scrollTop = resultEl.scrollTop;

        if (elementBottom > scrollTop + clientHeight) {
          $$invalidate(9, resultEl.scrollTop = elementBottom - clientHeight, resultEl);
        } else if (y < scrollTop) {
          $$invalidate(9, resultEl.scrollTop = y, resultEl);
        }
      }
    }

    function activateArrowUp(event) {
      if (disabled || !popupVisible) {
        return;
      }

      var el = findActiveOption();
      var next = el && el.previousElementSibling;

      while (next && next.classList.contains("ts-js-dead")) {
        next = next.previousElementSibling;
      }

      if (next && !next.classList.contains("ts-js-item")) {
        next = null;
      }

      activateOption(next, el);
      event.preventDefault();
    }

    function activateArrowDown(event) {
      if (disabled || !popupVisible) {
        return;
      }

      var el = findActiveOption();
      var next = el ? el.nextElementSibling : findFirstOption();

      while (next && next.classList.contains("ts-js-dead")) {
        next = next.nextElementSibling;
      }

      if (next && !next.classList.contains("ts-js-item")) {
        next = null;
      }

      next = next || findLastOption();
      activateOption(next, el);
      event.preventDefault();
    }

    function activatePageUp(event) {
      if (disabled || !popupVisible) {
        return;
      }

      var newY = resultEl.scrollTop - resultEl.clientHeight;
      var nodes = optionsEl.querySelectorAll(".ts-js-item");
      var next = null;

      for (var i = 0; !next && i < nodes.length; i++) {
        var node = nodes[i];

        if (newY <= node.offsetTop) {
          next = node;
        }
      }

      if (!next) {
        next = nodes[0];
      }

      activateOption(next);
      event.preventDefault();
    }

    function activatePageDown(event) {
      if (disabled || !popupVisible) {
        return;
      }

      var curr = findActiveOption() || findFirstOption();
      var newY = curr.offsetTop + resultEl.clientHeight;
      var nodes = optionsEl.querySelectorAll(".ts-js-item");
      var next = null;

      for (var i = 0; !next && i < nodes.length; i++) {
        var node = nodes[i];

        if (node.offsetTop + node.clientHeight >= newY) {
          next = node;
        }
      }

      if (!next) {
        next = nodes[nodes.length - 1];
      }

      activateOption(next);
      event.preventDefault();
    }

    function activateHome(event) {
      if (disabled || !popupVisible) {
        return;
      }

      var nodes = optionsEl.querySelectorAll(".ts-js-item");
      var next = nodes.length ? nodes[0] : null;
      activateOption(next);
      event.preventDefault();
    }

    function activateEnd(event) {
      if (disabled || !popupVisible) {
        return;
      }

      var nodes = optionsEl.querySelectorAll(".ts-js-item");
      var next = nodes.length ? nodes[nodes.length - 1] : null;
      activateOption(next);
      event.preventDefault();
    }

    function handleBlur(event) {
      if (debugMode) {
        return;
      }

      if (!containsElement(event.relatedTarget)) {
        cancelFetch();
        closePopup(false);
      }
    }

    function handleInputKeypress(event) {
      handleEvent(event.key, inputKeypressHandlers, event);
    }

    function handleInputKeydown(event) {
      handleEvent(event.key, inputKeydownHandlers, event);
    }

    function handleInputKeyup(event) {
      handleEvent(event.key, inputKeyupHandlers, event);
    }

    function handleToggleKeydown(event) {
      handleEvent(event.key, toggleKeydownHandlers, event);
    }

    function handleToggleClick(event) {
      if (disabled) {
        return;
      }

      if (event.button === 0 && !hasModifier(event)) {
        if (popupVisible) {
          closePopup(false);
        } else {
          if (openPopup()) {
            fetchItems();
          }
        }
      }
    }

    function handleOptionClick(event) {
      if (event.button === 0 && !hasModifier(event)) {
        selectOption(event.target);
      }
    }

    function handleResultScroll(event) {
      fetchMoreIfneeded();
    }

    function handleWindowScroll(event) {
      updatePopupPosition();
    }

    function input_binding($$value) {
      binding_callbacks[$$value ? "unshift" : "push"](function () {
        inputEl = $$value;
        $$invalidate(6, inputEl);
      });
    }

    function input_input_handler() {
      query = this.value;
      $$invalidate(1, query);
    }

    function button_binding($$value) {
      binding_callbacks[$$value ? "unshift" : "push"](function () {
        toggleEl = $$value;
        $$invalidate(7, toggleEl);
      });
    }

    function ul_binding($$value) {
      binding_callbacks[$$value ? "unshift" : "push"](function () {
        optionsEl = $$value;
        $$invalidate(10, optionsEl);
      });
    }

    function div1_binding($$value) {
      binding_callbacks[$$value ? "unshift" : "push"](function () {
        resultEl = $$value;
        $$invalidate(9, resultEl);
      });
    }

    function div2_binding($$value) {
      binding_callbacks[$$value ? "unshift" : "push"](function () {
        popupEl = $$value;
        $$invalidate(8, popupEl);
      });
    }

    function div3_binding($$value) {
      binding_callbacks[$$value ? "unshift" : "push"](function () {
        containerEl = $$value;
        $$invalidate(5, containerEl);
      });
    }

    $$self.$set = function ($$props) {
      if ("real" in $$props) $$invalidate(0, real = $$props.real);
      if ("debugMode" in $$props) $$invalidate(39, debugMode = $$props.debugMode);
      if ("fetcher" in $$props) $$invalidate(40, fetcher = $$props.fetcher);
      if ("queryMinLen" in $$props) $$invalidate(35, queryMinLen = $$props.queryMinLen);
      if ("query" in $$props) $$invalidate(1, query = $$props.query);
      if ("delay" in $$props) $$invalidate(36, delay = $$props.delay);
      if ("translations" in $$props) $$invalidate(37, translations = $$props.translations);
      if ("styles" in $$props) $$invalidate(2, styles = $$props.styles);
      if ("showToggle" in $$props) $$invalidate(3, showToggle = $$props.showToggle);
      if ("passEnter" in $$props) $$invalidate(38, passEnter = $$props.passEnter);
      if ("popupFixed" in $$props) $$invalidate(4, popupFixed = $$props.popupFixed);
    };

    $$self.$$.update = function () {
      if ($$self.$$.dirty[0] &
      /*query*/
      2 | $$self.$$.dirty[1] &
      /*selectedItem*/
      8388608) {
        ////////////////////////////////////////////////////////////
        // HANDLERS
        //
         {

          if (syncToReal) {
            syncToReal(query);
          }
        }
      }
    };

    return [real, query, styles, showToggle, popupFixed, containerEl, inputEl, toggleEl, popupEl, resultEl, optionsEl, containerId, containerName, labelId, labelText, items, actualCount, tooShort, activeId, fetchingMore, fetchError, popupVisible, popupTop, popupLeft, activeFetch, translate, handleBlur, handleInputKeypress, handleInputKeydown, handleInputKeyup, handleToggleKeydown, handleToggleClick, handleOptionClick, handleResultScroll, handleWindowScroll, queryMinLen, delay, translations, passEnter, debugMode, fetcher, input_binding, input_input_handler, button_binding, ul_binding, div1_binding, div2_binding, div3_binding];
  }

  var Typeahead = /*#__PURE__*/function (_SvelteComponent) {
    _inherits(Typeahead, _SvelteComponent);

    var _super = _createSuper(Typeahead);

    function Typeahead(options) {
      var _this;

      _classCallCheck(this, Typeahead);

      _this = _super.call(this);
      init(_assertThisInitialized(_this), options, instance, create_fragment, safe_not_equal, {
        real: 0,
        debugMode: 39,
        fetcher: 40,
        queryMinLen: 35,
        query: 1,
        delay: 36,
        translations: 37,
        styles: 2,
        showToggle: 3,
        passEnter: 38,
        popupFixed: 4
      }, [-1, -1, -1, -1]);
      return _this;
    }

    return Typeahead;
  }(SvelteComponent);

  return Typeahead;

}());
