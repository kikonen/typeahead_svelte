var Typeahead = (function () {
  'use strict';

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }

  function _typeof(obj) {
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

  function _assertThisInitialized(self) {
    if (self === void 0) {
      throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
    }

    return self;
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

  function _isNativeFunction(fn) {
    return Function.toString.call(fn).indexOf("[native code]") !== -1;
  }

  function isNativeReflectConstruct() {
    if (typeof Reflect === "undefined" || !Reflect.construct) return false;
    if (Reflect.construct.sham) return false;
    if (typeof Proxy === "function") return true;

    try {
      Date.prototype.toString.call(Reflect.construct(Date, [], function () {}));
      return true;
    } catch (e) {
      return false;
    }
  }

  function _construct(Parent, args, Class) {
    if (isNativeReflectConstruct()) {
      _construct = Reflect.construct;
    } else {
      _construct = function _construct(Parent, args, Class) {
        var a = [null];
        a.push.apply(a, args);
        var Constructor = Function.bind.apply(Parent, a);
        var instance = new Constructor();
        if (Class) _setPrototypeOf(instance, Class.prototype);
        return instance;
      };
    }

    return _construct.apply(null, arguments);
  }

  function _wrapNativeSuper(Class) {
    var _cache = typeof Map === "function" ? new Map() : undefined;

    _wrapNativeSuper = function _wrapNativeSuper(Class) {
      if (Class === null || !_isNativeFunction(Class)) return Class;

      if (typeof Class !== "function") {
        throw new TypeError("Super expression must either be null or a function");
      }

      if (typeof _cache !== "undefined") {
        if (_cache.has(Class)) return _cache.get(Class);

        _cache.set(Class, Wrapper);
      }

      function Wrapper() {
        return _construct(Class, arguments, _getPrototypeOf(this).constructor);
      }

      Wrapper.prototype = Object.create(Class.prototype, {
        constructor: {
          value: Wrapper,
          enumerable: false,
          writable: true,
          configurable: true
        }
      });
      return _setPrototypeOf(Wrapper, Class);
    };

    return _wrapNativeSuper(Class);
  }

  function _arrayWithoutHoles(arr) {
    if (Array.isArray(arr)) {
      for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) {
        arr2[i] = arr[i];
      }

      return arr2;
    }
  }

  function _iterableToArray(iter) {
    if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter);
  }

  function _nonIterableSpread() {
    throw new TypeError("Invalid attempt to spread non-iterable instance");
  }

  function _toConsumableArray(arr) {
    return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread();
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
    if (text.data !== data) text.data = data;
  }

  function set_input_value(input, value) {
    if (value != null || input.value) {
      input.value = value;
    }
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

  function flush() {
    var seen_callbacks = new Set();

    do {
      // first, call beforeUpdate functions
      // and update components
      while (dirty_components.length) {
        var component = dirty_components.shift();
        set_current_component(component);
        update(component.$$);
      }

      while (binding_callbacks.length) {
        binding_callbacks.pop()();
      } // then, once components are updated, call
      // afterUpdate functions. This may cause
      // subsequent updates...


      for (var i = 0; i < render_callbacks.length; i += 1) {
        var callback = render_callbacks[i];

        if (!seen_callbacks.has(callback)) {
          callback(); // ...so guard against infinite loops

          seen_callbacks.add(callback);
        }
      }

      render_callbacks.length = 0;
    } while (dirty_components.length);

    while (flush_callbacks.length) {
      flush_callbacks.pop()();
    }

    update_scheduled = false;
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
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        $$.fragment && $$.fragment.l(children(options.target));
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

  var SvelteElement;

  if (typeof HTMLElement === 'function') {
    SvelteElement =
    /*#__PURE__*/
    function (_HTMLElement) {
      _inherits(SvelteElement, _HTMLElement);

      function SvelteElement() {
        var _this;

        _classCallCheck(this, SvelteElement);

        _this = _possibleConstructorReturn(this, _getPrototypeOf(SvelteElement).call(this));

        _this.attachShadow({
          mode: 'open'
        });

        return _this;
      }

      _createClass(SvelteElement, [{
        key: "connectedCallback",
        value: function connectedCallback() {
          // @ts-ignore todo: improve typings
          for (var key in this.$$.slotted) {
            // @ts-ignore todo: improve typings
            this.appendChild(this.$$.slotted[key]);
          }
        }
      }, {
        key: "attributeChangedCallback",
        value: function attributeChangedCallback(attr, _oldValue, newValue) {
          this[attr] = newValue;
        }
      }, {
        key: "$destroy",
        value: function $destroy() {
          destroy_component(this, 1);
          this.$destroy = noop;
        }
      }, {
        key: "$on",
        value: function $on(type, callback) {
          // TODO should this delegate to addEventListener?
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

      return SvelteElement;
    }(_wrapNativeSuper(HTMLElement));
  }

  var SvelteComponent =
  /*#__PURE__*/
  function () {
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

  function get_each_context(ctx, list, i) {
    var child_ctx = ctx.slice();
    child_ctx[61] = list[i];
    child_ctx[63] = i;
    return child_ctx;
  } // (654:4) {:else}


  function create_else_block_1(ctx) {
    var each_1_anchor;
    var each_value =
    /*items*/
    ctx[7];
    var each_blocks = [];

    for (var i = 0; i < each_value.length; i += 1) {
      each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    }

    return {
      c: function c() {
        for (var _i = 0; _i < each_blocks.length; _i += 1) {
          each_blocks[_i].c();
        }

        each_1_anchor = empty();
      },
      m: function m(target, anchor) {
        for (var _i2 = 0; _i2 < each_blocks.length; _i2 += 1) {
          each_blocks[_i2].m(target, anchor);
        }

        insert(target, each_1_anchor, anchor);
      },
      p: function p(ctx, dirty) {
        if (dirty[0] &
        /*items, handleItemKeydown, handleBlur, handleItemClick, handleItemKeyup*/
        58851456) {
          each_value =
          /*items*/
          ctx[7];

          var _i3;

          for (_i3 = 0; _i3 < each_value.length; _i3 += 1) {
            var child_ctx = get_each_context(ctx, each_value, _i3);

            if (each_blocks[_i3]) {
              each_blocks[_i3].p(child_ctx, dirty);
            } else {
              each_blocks[_i3] = create_each_block(child_ctx);

              each_blocks[_i3].c();

              each_blocks[_i3].m(each_1_anchor.parentNode, each_1_anchor);
            }
          }

          for (; _i3 < each_blocks.length; _i3 += 1) {
            each_blocks[_i3].d(1);
          }

          each_blocks.length = each_value.length;
        }
      },
      d: function d(detaching) {
        destroy_each(each_blocks, detaching);
        if (detaching) detach(each_1_anchor);
      }
    };
  } // (646:32) 


  function create_if_block_2(ctx) {
    var div;

    function select_block_type_1(ctx, dirty) {
      if (
      /*tooShort*/
      ctx[9]) return create_if_block_3;
      return create_else_block;
    }

    var current_block_type = select_block_type_1(ctx);
    var if_block = current_block_type(ctx);
    return {
      c: function c() {
        div = element("div");
        if_block.c();
        attr(div, "tabindex", "-1");
        attr(div, "class", "dropdown-item ts-item-info");
      },
      m: function m(target, anchor) {
        insert(target, div, anchor);
        if_block.m(div, null);
      },
      p: function p(ctx, dirty) {
        if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
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
  } // (642:43) 


  function create_if_block_1(ctx) {
    var div;
    return {
      c: function c() {
        div = element("div");
        div.textContent = "".concat(
        /*translate*/
        ctx[16]("fetching"));
        attr(div, "tabindex", "-1");
        attr(div, "class", "dropdown-item ts-item-info");
      },
      m: function m(target, anchor) {
        insert(target, div, anchor);
      },
      p: noop,
      d: function d(detaching) {
        if (detaching) detach(div);
      }
    };
  } // (638:4) {#if fetchError}


  function create_if_block(ctx) {
    var div;
    var t;
    return {
      c: function c() {
        div = element("div");
        t = text(
        /*fetchError*/
        ctx[11]);
        attr(div, "tabindex", "-1");
        attr(div, "class", "dropdown-item text-danger");
      },
      m: function m(target, anchor) {
        insert(target, div, anchor);
        append(div, t);
      },
      p: function p(ctx, dirty) {
        if (dirty[0] &
        /*fetchError*/
        2048) set_data(t,
        /*fetchError*/
        ctx[11]);
      },
      d: function d(detaching) {
        if (detaching) detach(div);
      }
    };
  } // (674:8) {:else}


  function create_else_block_2(ctx) {
    var div1;
    var div0;
    var t0_value = (
    /*item*/
    ctx[61].display_text ||
    /*item*/
    ctx[61].text) + "";
    var t0;
    var t1;
    var t2;
    var div1_data_index_value;
    var dispose;
    var if_block =
    /*item*/
    ctx[61].desc && create_if_block_7(ctx);
    return {
      c: function c() {
        div1 = element("div");
        div0 = element("div");
        t0 = text(t0_value);
        t1 = space();
        if (if_block) if_block.c();
        t2 = space();
        attr(div0, "class", "ts-item-text");
        attr(div1, "tabindex", "1");
        attr(div1, "class", "dropdown-item ts-item ts-js-item");
        attr(div1, "data-index", div1_data_index_value =
        /*index*/
        ctx[63]);
      },
      m: function m(target, anchor) {
        insert(target, div1, anchor);
        append(div1, div0);
        append(div0, t0);
        append(div1, t1);
        if (if_block) if_block.m(div1, null);
        append(div1, t2);
        dispose = [listen(div1, "blur",
        /*handleBlur*/
        ctx[17]), listen(div1, "click",
        /*handleItemClick*/
        ctx[25]), listen(div1, "keydown",
        /*handleItemKeydown*/
        ctx[23]), listen(div1, "keyup",
        /*handleItemKeyup*/
        ctx[24])];
      },
      p: function p(ctx, dirty) {
        if (dirty[0] &
        /*items*/
        128 && t0_value !== (t0_value = (
        /*item*/
        ctx[61].display_text ||
        /*item*/
        ctx[61].text) + "")) set_data(t0, t0_value);

        if (
        /*item*/
        ctx[61].desc) {
          if (if_block) {
            if_block.p(ctx, dirty);
          } else {
            if_block = create_if_block_7(ctx);
            if_block.c();
            if_block.m(div1, t2);
          }
        } else if (if_block) {
          if_block.d(1);
          if_block = null;
        }
      },
      d: function d(detaching) {
        if (detaching) detach(div1);
        if (if_block) if_block.d();
        run_all(dispose);
      }
    };
  } // (662:52) 


  function create_if_block_5(ctx) {
    var div1;
    var div0;
    var t0_value = (
    /*item*/
    ctx[61].display_text ||
    /*item*/
    ctx[61].text) + "";
    var t0;
    var t1;
    var t2;
    var dispose;
    var if_block =
    /*item*/
    ctx[61].desc && create_if_block_6(ctx);
    return {
      c: function c() {
        div1 = element("div");
        div0 = element("div");
        t0 = text(t0_value);
        t1 = space();
        if (if_block) if_block.c();
        t2 = space();
        attr(div0, "class", "ts-item-text");
        attr(div1, "tabindex", "-1");
        attr(div1, "class", "dropdown-item ts-item-disabled ts-js-dead");
      },
      m: function m(target, anchor) {
        insert(target, div1, anchor);
        append(div1, div0);
        append(div0, t0);
        append(div1, t1);
        if (if_block) if_block.m(div1, null);
        append(div1, t2);
        dispose = listen(div1, "keydown",
        /*handleItemKeydown*/
        ctx[23]);
      },
      p: function p(ctx, dirty) {
        if (dirty[0] &
        /*items*/
        128 && t0_value !== (t0_value = (
        /*item*/
        ctx[61].display_text ||
        /*item*/
        ctx[61].text) + "")) set_data(t0, t0_value);

        if (
        /*item*/
        ctx[61].desc) {
          if (if_block) {
            if_block.p(ctx, dirty);
          } else {
            if_block = create_if_block_6(ctx);
            if_block.c();
            if_block.m(div1, t2);
          }
        } else if (if_block) {
          if_block.d(1);
          if_block = null;
        }
      },
      d: function d(detaching) {
        if (detaching) detach(div1);
        if (if_block) if_block.d();
        dispose();
      }
    };
  } // (656:8) {#if item.separator}


  function create_if_block_4(ctx) {
    var div;
    var div_data_index_value;
    var dispose;
    return {
      c: function c() {
        div = element("div");
        attr(div, "tabindex", "-1");
        attr(div, "class", "dropdown-divider ts-js-dead");
        attr(div, "data-index", div_data_index_value =
        /*index*/
        ctx[63]);
      },
      m: function m(target, anchor) {
        insert(target, div, anchor);
        dispose = listen(div, "keydown",
        /*handleItemKeydown*/
        ctx[23]);
      },
      p: noop,
      d: function d(detaching) {
        if (detaching) detach(div);
        dispose();
      }
    };
  } // (684:12) {#if item.desc}


  function create_if_block_7(ctx) {
    var div;
    var t_value =
    /*item*/
    ctx[61].desc + "";
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
        128 && t_value !== (t_value =
        /*item*/
        ctx[61].desc + "")) set_data(t, t_value);
      },
      d: function d(detaching) {
        if (detaching) detach(div);
      }
    };
  } // (668:12) {#if item.desc}


  function create_if_block_6(ctx) {
    var div;
    var t_value =
    /*item*/
    ctx[61].desc + "";
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
        128 && t_value !== (t_value =
        /*item*/
        ctx[61].desc + "")) set_data(t, t_value);
      },
      d: function d(detaching) {
        if (detaching) detach(div);
      }
    };
  } // (655:6) {#each items as item, index}


  function create_each_block(ctx) {
    var if_block_anchor;

    function select_block_type_2(ctx, dirty) {
      if (
      /*item*/
      ctx[61].separator) return create_if_block_4;
      if (
      /*item*/
      ctx[61].disabled ||
      /*item*/
      ctx[61].placeholder) return create_if_block_5;
      return create_else_block_2;
    }

    var current_block_type = select_block_type_2(ctx);
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
        if (current_block_type === (current_block_type = select_block_type_2(ctx)) && if_block) {
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
  } // (650:8) {:else}


  function create_else_block(ctx) {
    var t_value =
    /*translate*/
    ctx[16]("no_results") + "";
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
  } // (648:8) {#if tooShort }


  function create_if_block_3(ctx) {
    var t_value =
    /*translate*/
    ctx[16]("too_short") + "";
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
    var div1;
    var input;
    var input_data_target_value;
    var input_placeholder_value;
    var t0;
    var div0;
    var button;
    var t1;
    var div2;
    var div3_class_value;
    var div3_id_value;
    var div3_name_value;
    var dispose;

    function select_block_type(ctx, dirty) {
      if (
      /*fetchError*/
      ctx[11]) return create_if_block;
      if (
      /*activeFetch*/
      ctx[15] && !
      /*fetchingMore*/
      ctx[10]) return create_if_block_1;
      if (
      /*actualCount*/
      ctx[8] === 0) return create_if_block_2;
      return create_else_block_1;
    }

    var current_block_type = select_block_type(ctx);
    var if_block = current_block_type(ctx);
    return {
      c: function c() {
        div3 = element("div");
        div1 = element("div");
        input = element("input");
        t0 = space();
        div0 = element("div");
        button = element("button");
        button.innerHTML = "<i class=\"text-dark fas fa-caret-down\"></i>";
        t1 = space();
        div2 = element("div");
        if_block.c();
        attr(input, "class", "form-control ts-input");
        attr(input, "autocomplete", "new-password");
        attr(input, "autocorrect", "off");
        attr(input, "autocapitalize", "off");
        attr(input, "spellcheck", "off");
        attr(input, "data-target", input_data_target_value =
        /*real*/
        ctx[2].id);
        attr(input, "placeholder", input_placeholder_value =
        /*real*/
        ctx[2].placeholder);
        attr(button, "class", "btn btn-outline-secondary");
        attr(button, "type", "button");
        attr(button, "tabindex", "-1");
        attr(div0, "class", "input-group-append");
        attr(div1, "class", "input-group");
        attr(div2, "class", "dropdown-menu ts-popup");
        toggle_class(div2, "show",
        /*popupVisible*/
        ctx[12]);
        toggle_class(div2, "ss-popup-top",
        /*popupTop*/
        ctx[13]);
        toggle_class(div2, "ss-popup-left",
        /*popupLeft*/
        ctx[14]);
        attr(div3, "class", div3_class_value = "form-control ts-container " +
        /*styles*/
        ctx[1].container_class);
        attr(div3, "id", div3_id_value = "ts_container_" +
        /*real*/
        ctx[2].id);
        attr(div3, "name", div3_name_value = "ts_container_" +
        /*real*/
        ctx[2].name);
      },
      m: function m(target, anchor) {
        insert(target, div3, anchor);
        append(div3, div1);
        append(div1, input);
        /*input_binding*/

        ctx[56](input);
        set_input_value(input,
        /*query*/
        ctx[0]);
        append(div1, t0);
        append(div1, div0);
        append(div0, button);
        /*button_binding*/

        ctx[58](button);
        append(div3, t1);
        append(div3, div2);
        if_block.m(div2, null);
        /*div2_binding*/

        ctx[59](div2);
        /*div3_binding*/

        ctx[60](div3);
        dispose = [listen(input, "input",
        /*input_input_handler*/
        ctx[57]), listen(input, "blur",
        /*handleBlur*/
        ctx[17]), listen(input, "keypress",
        /*handleInputKeypress*/
        ctx[18]), listen(input, "keydown",
        /*handleInputKeydown*/
        ctx[19]), listen(input, "keyup",
        /*handleInputKeyup*/
        ctx[20]), listen(button, "blur",
        /*handleBlur*/
        ctx[17]), listen(button, "keydown",
        /*handleToggleKeydown*/
        ctx[21]), listen(button, "click",
        /*handleToggleClick*/
        ctx[22]), listen(div2, "scroll",
        /*handlePopupScroll*/
        ctx[26])];
      },
      p: function p(ctx, dirty) {
        if (dirty[0] &
        /*real*/
        4 && input_data_target_value !== (input_data_target_value =
        /*real*/
        ctx[2].id)) {
          attr(input, "data-target", input_data_target_value);
        }

        if (dirty[0] &
        /*real*/
        4 && input_placeholder_value !== (input_placeholder_value =
        /*real*/
        ctx[2].placeholder)) {
          attr(input, "placeholder", input_placeholder_value);
        }

        if (dirty[0] &
        /*query*/
        1 && input.value !==
        /*query*/
        ctx[0]) {
          set_input_value(input,
          /*query*/
          ctx[0]);
        }

        if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
          if_block.p(ctx, dirty);
        } else {
          if_block.d(1);
          if_block = current_block_type(ctx);

          if (if_block) {
            if_block.c();
            if_block.m(div2, null);
          }
        }

        if (dirty[0] &
        /*popupVisible*/
        4096) {
          toggle_class(div2, "show",
          /*popupVisible*/
          ctx[12]);
        }

        if (dirty[0] &
        /*popupTop*/
        8192) {
          toggle_class(div2, "ss-popup-top",
          /*popupTop*/
          ctx[13]);
        }

        if (dirty[0] &
        /*popupLeft*/
        16384) {
          toggle_class(div2, "ss-popup-left",
          /*popupLeft*/
          ctx[14]);
        }

        if (dirty[0] &
        /*styles*/
        2 && div3_class_value !== (div3_class_value = "form-control ts-container " +
        /*styles*/
        ctx[1].container_class)) {
          attr(div3, "class", div3_class_value);
        }

        if (dirty[0] &
        /*real*/
        4 && div3_id_value !== (div3_id_value = "ts_container_" +
        /*real*/
        ctx[2].id)) {
          attr(div3, "id", div3_id_value);
        }

        if (dirty[0] &
        /*real*/
        4 && div3_name_value !== (div3_name_value = "ts_container_" +
        /*real*/
        ctx[2].name)) {
          attr(div3, "name", div3_name_value);
        }
      },
      i: noop,
      o: noop,
      d: function d(detaching) {
        if (detaching) detach(div3);
        /*input_binding*/

        ctx[56](null);
        /*button_binding*/

        ctx[58](null);
        if_block.d();
        /*div2_binding*/

        ctx[59](null);
        /*div3_binding*/

        ctx[60](null);
        run_all(dispose);
      }
    };
  }
  var I18N_DEFAULTS = {
    fetching: "Searching..",
    no_results: "No results",
    too_short: "Too short",
    fetching_more: "Searching more..."
  };
  var STYLE_DEFAULTS = {
    container_class: ""
  };

  function hasModifier(event) {
    return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
  }

  function nop() {} ////////////////////////////////////////////////////////////
  //


  function handleEvent(code, handlers, event) {
    (handlers[code] || handlers.base)(event);
  }

  function instance($$self, $$props, $$invalidate) {
    var real = $$props.real;
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
    var containerEl;
    var inputEl;
    var toggleEl;
    var popupEl;
    var setupDone = false;
    var items = [];
    var offsetCount = 0;
    var actualCount = 0;
    var hasMore = false;
    var tooShort = false;
    var fetchingMore = false;
    var fetchError = null;
    var popupVisible = false;
    var popupTop = false;
    var popupLeft = false;
    var activeFetch = null;
    var previousQuery = null;
    var fetched = false;
    var selectedItem = null;
    var wasDown = false;
    var isSyncToReal = false; ////////////////////////////////////////////////////////////
    // Utils

    function translate(key) {
      return translations[key];
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
        $$invalidate(10, fetchingMore = true);
      } else {
        $$invalidate(7, items = []);
        offsetCount = 0;
        $$invalidate(8, actualCount = 0);
        hasMore = false;
        fetched = false;
        $$invalidate(10, fetchingMore = false);
      }

      $$invalidate(11, fetchError = null);
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

          $$invalidate(7, items = newItems);
          resolveItems(items);
          hasMore = info.more && offsetCount > 0;
          $$invalidate(9, tooShort = info.too_short === true);
          previousQuery = currentQuery;
          $$invalidate(15, activeFetch = null);
          fetched = true;
          $$invalidate(10, fetchingMore = false);
        } //         } else { //             console.debug("ABORT fetch: " + currentQuery);

      })["catch"](function (err) {
        if (currentFetch === activeFetch) {
          console.error(err);
          $$invalidate(11, fetchError = err);
          $$invalidate(7, items = []);
          offsetCount = 0;
          $$invalidate(8, actualCount = 0);
          hasMore = false;
          $$invalidate(9, tooShort = false);
          previousQuery = null;
          $$invalidate(15, activeFetch = null);
          fetched = false;
          $$invalidate(10, fetchingMore = false);
          inputEl.focus();
          openPopup();
        }
      });
      $$invalidate(15, activeFetch = currentFetch);
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
      $$invalidate(8, actualCount = act);
    }

    function cancelFetch() {
      if (activeFetch !== null) {
        $$invalidate(15, activeFetch = null); // no result fetched; since it doesn't match input any longer

        fetched = false;
        previousQuery = null;
      }
    }

    function fetchMoreIfneeded() {
      if (hasMore && !fetchingMore && popupVisible) {
        if (popupEl.scrollTop + popupEl.clientHeight >= popupEl.scrollHeight - popupEl.lastElementChild.clientHeight * 2 - 2) {
          fetchItems(true);
        }
      }
    }

    function closePopup(focusInput) {
      $$invalidate(12, popupVisible = false);

      if (focusInput) {
        inputEl.focus();
      }
    }

    function openPopup() {
      if (!popupVisible) {
        $$invalidate(12, popupVisible = true);
        var w = containerEl.offsetWidth;
        $$invalidate(6, popupEl.style.minWidth = w + "px", popupEl);
        var bounds = containerEl.getBoundingClientRect();
        var middleY = window.innerHeight / 2;
        var middleX = window.innerWidth / 2;
        $$invalidate(13, popupTop = bounds.y > middleY);
        $$invalidate(14, popupLeft = bounds.x + bounds.width > middleX);
      }
    }

    function selectItem(el) {
      var item = items[el.dataset.index];

      if (item) {
        $$invalidate(36, selectedItem = item);
        var changed = item.text !== query;
        $$invalidate(0, query = item.text);
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
      } //     } else { //         console.debug("MISSING item", el);

    }

    function containsElement(el) {
      return el === inputEl || el === toggleEl || popupEl.contains(el);
    }

    function syncFromReal() {
      if (isSyncToReal) {
        return;
      }

      var realValue = real.value;

      if (realValue !== query) {
        $$invalidate(0, query = realValue);
      }
    }

    function syncToReal(query, selectedItem) {
      if (real.value !== query) {
        try {
          isSyncToReal = true;
          real.setAttribute("value", query);
          real.dispatchEvent(new Event("change"));
        } finally {
          isSyncToReal = false;
        }
      }
    }

    onMount(function () {
      $$invalidate(0, query = real.value || "");
      real.addEventListener("change", function () {
        syncFromReal();
      });
    });
    beforeUpdate(function () {
      if (!setupDone) {
        setupComponent();
        setupDone = true;
      }
    });

    function setupComponent() {
      real.classList.add("d-none");
      $$invalidate(27, translations = Object.assign({}, I18N_DEFAULTS, translations || {}));
      $$invalidate(1, styles = Object.assign({}, STYLE_DEFAULTS, styles || {}));
    } ////////////////////////////////////////////////////////////
    //


    var inputKeypressHandlers = {
      base: function base(event) {
        $$invalidate(36, selectedItem = null);
      }
    };
    var inputKeydownHandlers = {
      base: function base(event) {
        wasDown = true;
      },
      ArrowDown: function ArrowDown(event) {
        var item = popupVisible ? popupEl.querySelectorAll(".ts-js-item")[0] : null;

        if (item) {
          while (item && item.classList.contains("ts-js-dead")) {
            item = item.nextElementSibling;
          }

          item.focus();
        } else {
          openPopup();
          fetchItems();
        }

        event.preventDefault();
      },
      ArrowUp: function ArrowUp(event) {
        // NOTE KI closing popup here is *irritating* i.e. if one is trying to select
        // first item in dropdown
        event.preventDefault();
      },
      Escape: function Escape(event) {
        cancelFetch();
        closePopup(false);
      },
      Tab: nop
    };
    var inputKeyupHandlers = {
      base: function base(event) {
        if (wasDown) {
          openPopup();
          fetchItems();
        }
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
        inputEl.focus();
      },
      ArrowDown: inputKeydownHandlers.ArrowDown,
      ArrowUp: inputKeydownHandlers.ArrowDown,
      Escape: function Escape(event) {
        cancelFetch();
        closePopup(false);
        inputEl.focus();
      },
      Tab: function Tab(event) {
        inputEl.focus();
      }
    };
    var itemKeydownHandlers = {
      base: function base(event) {
        inputEl.focus();
      },
      ArrowDown: function ArrowDown(event) {
        var next = event.target.nextElementSibling;

        if (next) {
          while (next && next.classList.contains("ts-js-dead")) {
            next = next.nextElementSibling;
          }

          if (next && !next.classList.contains("ts-js-item")) {
            next = null;
          }
        }

        if (next) {
          next.focus();
        }

        event.preventDefault();
      },
      ArrowUp: function ArrowUp(event) {
        var next = event.target.previousElementSibling;

        if (next) {
          while (next && next.classList.contains("ts-js-dead")) {
            next = next.previousElementSibling;
          }

          if (next && !next.classList.contains("ts-js-item")) {
            next = null;
          }
        }

        if (next) {
          next.focus();
        } else {
          inputEl.focus();
        }

        event.preventDefault();
      },
      Enter: function Enter(event) {
        selectItem(event.target);
        event.preventDefault();
      },
      Escape: function Escape(event) {
        cancelFetch();
        closePopup(true);
      },
      // allow "meta" keys to navigate in items
      PageUp: nop,
      PageDown: nop,
      Home: nop,
      End: nop,
      // disallow modifier keys to trigger search
      Control: nop,
      Shift: nop,
      AltGraph: nop,
      Meta: nop,
      ContextMenu: nop
    };
    var itemKeyupHandlers = {
      base: nop,
      // allow "meta" keys to navigate in items
      PageUp: function PageUp(event) {
        var scrollLeft = document.body.scrollLeft;
        var scrollTop = document.body.scrollTop;
        var rect = popupEl.getBoundingClientRect();
        var item = document.elementFromPoint(scrollLeft + rect.x + 10, scrollTop + rect.top + 1);

        if (!item) {
          item = popupEl.querySelector(".ts-js-item:first-child");
        } else {
          if (!item.classList.contains("ts-js-item")) {
            item = popupEl.querySelector(".ts-js-item:first-child");
          }
        }

        if (item) {
          item.focus();
        }

        event.preventDefault();
      },
      PageDown: function PageDown(event) {
        var scrollLeft = document.body.scrollLeft;
        var scrollTop = document.body.scrollTop;
        var h = popupEl.offsetHeight;
        var rect = popupEl.getBoundingClientRect();
        var item = document.elementFromPoint(scrollLeft + rect.x + 10, scrollTop + rect.top + h - 10);

        if (!item) {
          item = popupEl.querySelector(".ts-js-item:last-child");
        } else {
          if (!item.classList.contains("ts-js-item")) {
            item = popupEl.querySelector(".ts-js-item:last-child");
          }
        }

        if (item) {
          item.focus();
        }

        event.preventDefault();
      },
      Home: function Home(event) {
        var item = popupEl.querySelector(".ts-js-item:first-child");

        if (item) {
          item.focus();
        }

        event.preventDefault();
      },
      End: function End(event) {
        var item = popupEl.querySelector(".ts-js-item:last-child");

        if (item) {
          item.focus();
        }

        event.preventDefault();
      }
    };

    function handleBlur(event) {
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
      if (event.button === 0 && !hasModifier(event)) {
        if (popupVisible) {
          closePopup(false);
        } else {
          openPopup();
          fetchItems();
        }
      }
    }

    function handleItemKeydown(event) {
      handleEvent(event.key, itemKeydownHandlers, event);
    }

    function handleItemKeyup(event) {
      handleEvent(event.key, itemKeyupHandlers, event);
    }

    function handleItemClick(event) {
      if (event.button === 0 && !hasModifier(event)) {
        selectItem(event.target);
      }
    }

    function handlePopupScroll(event) {
      fetchMoreIfneeded();
    }

    function input_binding($$value) {
      binding_callbacks[$$value ? "unshift" : "push"](function () {
        $$invalidate(4, inputEl = $$value);
      });
    }

    function input_input_handler() {
      query = this.value;
      $$invalidate(0, query);
    }

    function button_binding($$value) {
      binding_callbacks[$$value ? "unshift" : "push"](function () {
        $$invalidate(5, toggleEl = $$value);
      });
    }

    function div2_binding($$value) {
      binding_callbacks[$$value ? "unshift" : "push"](function () {
        $$invalidate(6, popupEl = $$value);
      });
    }

    function div3_binding($$value) {
      binding_callbacks[$$value ? "unshift" : "push"](function () {
        $$invalidate(3, containerEl = $$value);
      });
    }

    $$self.$set = function ($$props) {
      if ("real" in $$props) $$invalidate(2, real = $$props.real);
      if ("fetcher" in $$props) $$invalidate(28, fetcher = $$props.fetcher);
      if ("queryMinLen" in $$props) $$invalidate(29, queryMinLen = $$props.queryMinLen);
      if ("query" in $$props) $$invalidate(0, query = $$props.query);
      if ("delay" in $$props) $$invalidate(30, delay = $$props.delay);
      if ("translations" in $$props) $$invalidate(27, translations = $$props.translations);
      if ("styles" in $$props) $$invalidate(1, styles = $$props.styles);
    };

    $$self.$$.update = function () {
      if ($$self.$$.dirty[0] &
      /*query*/
      1 | $$self.$$.dirty[1] &
      /*selectedItem*/
      32) {
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

    return [query, styles, real, containerEl, inputEl, toggleEl, popupEl, items, actualCount, tooShort, fetchingMore, fetchError, popupVisible, popupTop, popupLeft, activeFetch, translate, handleBlur, handleInputKeypress, handleInputKeydown, handleInputKeyup, handleToggleKeydown, handleToggleClick, handleItemKeydown, handleItemKeyup, handleItemClick, handlePopupScroll, translations, fetcher, queryMinLen, delay, setupDone, offsetCount, hasMore, previousQuery, fetched, selectedItem, wasDown, isSyncToReal, fetchItems, resolveItems, cancelFetch, fetchMoreIfneeded, closePopup, openPopup, selectItem, containsElement, syncFromReal, syncToReal, setupComponent, inputKeypressHandlers, inputKeydownHandlers, inputKeyupHandlers, toggleKeydownHandlers, itemKeydownHandlers, itemKeyupHandlers, input_binding, input_input_handler, button_binding, div2_binding, div3_binding];
  }

  var Typeahead =
  /*#__PURE__*/
  function (_SvelteComponent) {
    _inherits(Typeahead, _SvelteComponent);

    function Typeahead(options) {
      var _this;

      _classCallCheck(this, Typeahead);

      _this = _possibleConstructorReturn(this, _getPrototypeOf(Typeahead).call(this));
      init(_assertThisInitialized(_this), options, instance, create_fragment, safe_not_equal, {
        real: 2,
        fetcher: 28,
        queryMinLen: 29,
        query: 0,
        delay: 30,
        translations: 27,
        styles: 1
      }, [-1, -1, -1]);
      return _this;
    }

    return Typeahead;
  }(SvelteComponent);

  return Typeahead;

}());
