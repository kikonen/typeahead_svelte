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
    if (n === "Map" || n === "Set") return Array.from(n);
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

  function _createSuper(Derived) { return function () { var Super = _getPrototypeOf(Derived), result; if (_isNativeReflectConstruct()) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

  function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }

  function get_each_context(ctx, list, i) {
    var child_ctx = ctx.slice();
    child_ctx[64] = list[i];
    child_ctx[66] = i;
    return child_ctx;
  } // (679:4) {:else}


  function create_else_block_1(ctx) {
    var each_1_anchor;
    var each_value =
    /*items*/
    ctx[9];
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
        /*handleItemKeydown, items, handleBlur, handleItemClick, handleItemKeyup*/
        235405824) {
          each_value =
          /*items*/
          ctx[9];

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
  } // (671:32) 


  function create_if_block_2(ctx) {
    var div;

    function select_block_type_1(ctx, dirty) {
      if (
      /*tooShort*/
      ctx[11]) return create_if_block_3;
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
  } // (667:43) 


  function create_if_block_1(ctx) {
    var div;
    return {
      c: function c() {
        div = element("div");
        div.textContent = "".concat(
        /*translate*/
        ctx[18]("fetching"));
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
  } // (663:4) {#if fetchError}


  function create_if_block(ctx) {
    var div;
    var t;
    return {
      c: function c() {
        div = element("div");
        t = text(
        /*fetchError*/
        ctx[13]);
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
        8192) set_data(t,
        /*fetchError*/
        ctx[13]);
      },
      d: function d(detaching) {
        if (detaching) detach(div);
      }
    };
  } // (699:8) {:else}


  function create_else_block_2(ctx) {
    var div1;
    var div0;
    var t0_value = (
    /*item*/
    ctx[64].display_text ||
    /*item*/
    ctx[64].text) + "";
    var t0;
    var t1;
    var t2;
    var div1_data_index_value;
    var dispose;
    var if_block =
    /*item*/
    ctx[64].desc && create_if_block_7(ctx);
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
        ctx[66]);
      },
      m: function m(target, anchor, remount) {
        insert(target, div1, anchor);
        append(div1, div0);
        append(div0, t0);
        append(div1, t1);
        if (if_block) if_block.m(div1, null);
        append(div1, t2);
        if (remount) run_all(dispose);
        dispose = [listen(div1, "blur",
        /*handleBlur*/
        ctx[19]), listen(div1, "click",
        /*handleItemClick*/
        ctx[27]), listen(div1, "keydown",
        /*handleItemKeydown*/
        ctx[25]), listen(div1, "keyup",
        /*handleItemKeyup*/
        ctx[26])];
      },
      p: function p(ctx, dirty) {
        if (dirty[0] &
        /*items*/
        512 && t0_value !== (t0_value = (
        /*item*/
        ctx[64].display_text ||
        /*item*/
        ctx[64].text) + "")) set_data(t0, t0_value);

        if (
        /*item*/
        ctx[64].desc) {
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
  } // (687:52) 


  function create_if_block_5(ctx) {
    var div1;
    var div0;
    var t0_value = (
    /*item*/
    ctx[64].display_text ||
    /*item*/
    ctx[64].text) + "";
    var t0;
    var t1;
    var t2;
    var dispose;
    var if_block =
    /*item*/
    ctx[64].desc && create_if_block_6(ctx);
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
      m: function m(target, anchor, remount) {
        insert(target, div1, anchor);
        append(div1, div0);
        append(div0, t0);
        append(div1, t1);
        if (if_block) if_block.m(div1, null);
        append(div1, t2);
        if (remount) dispose();
        dispose = listen(div1, "keydown",
        /*handleItemKeydown*/
        ctx[25]);
      },
      p: function p(ctx, dirty) {
        if (dirty[0] &
        /*items*/
        512 && t0_value !== (t0_value = (
        /*item*/
        ctx[64].display_text ||
        /*item*/
        ctx[64].text) + "")) set_data(t0, t0_value);

        if (
        /*item*/
        ctx[64].desc) {
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
  } // (681:8) {#if item.separator}


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
        ctx[66]);
      },
      m: function m(target, anchor, remount) {
        insert(target, div, anchor);
        if (remount) dispose();
        dispose = listen(div, "keydown",
        /*handleItemKeydown*/
        ctx[25]);
      },
      p: noop,
      d: function d(detaching) {
        if (detaching) detach(div);
        dispose();
      }
    };
  } // (709:12) {#if item.desc}


  function create_if_block_7(ctx) {
    var div;
    var t_value =
    /*item*/
    ctx[64].desc + "";
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
        512 && t_value !== (t_value =
        /*item*/
        ctx[64].desc + "")) set_data(t, t_value);
      },
      d: function d(detaching) {
        if (detaching) detach(div);
      }
    };
  } // (693:12) {#if item.desc}


  function create_if_block_6(ctx) {
    var div;
    var t_value =
    /*item*/
    ctx[64].desc + "";
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
        512 && t_value !== (t_value =
        /*item*/
        ctx[64].desc + "")) set_data(t, t_value);
      },
      d: function d(detaching) {
        if (detaching) detach(div);
      }
    };
  } // (680:6) {#each items as item, index}


  function create_each_block(ctx) {
    var if_block_anchor;

    function select_block_type_2(ctx, dirty) {
      if (
      /*item*/
      ctx[64].separator) return create_if_block_4;
      if (
      /*item*/
      ctx[64].disabled ||
      /*item*/
      ctx[64].placeholder) return create_if_block_5;
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
  } // (675:8) {:else}


  function create_else_block(ctx) {
    var t_value =
    /*translate*/
    ctx[18]("no_results") + "";
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
  } // (673:8) {#if tooShort }


  function create_if_block_3(ctx) {
    var t_value =
    /*translate*/
    ctx[18]("too_short") + "";
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
    var dispose;

    function select_block_type(ctx, dirty) {
      if (
      /*fetchError*/
      ctx[13]) return create_if_block;
      if (
      /*activeFetch*/
      ctx[17] && !
      /*fetchingMore*/
      ctx[12]) return create_if_block_1;
      if (
      /*actualCount*/
      ctx[10] === 0) return create_if_block_2;
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
        ctx[0].id);
        attr(input, "placeholder", input_placeholder_value =
        /*real*/
        ctx[0].placeholder);
        attr(button, "class", "btn btn-outline-secondary");
        attr(button, "type", "button");
        attr(button, "tabindex", "-1");
        attr(div0, "class", "input-group-append");
        attr(div1, "class", "input-group");
        attr(div2, "class", "dropdown-menu ts-popup");
        attr(div2, "tabindex", "-1");
        toggle_class(div2, "show",
        /*popupVisible*/
        ctx[14]);
        toggle_class(div2, "ss-popup-top",
        /*popupTop*/
        ctx[15]);
        toggle_class(div2, "ss-popup-left",
        /*popupLeft*/
        ctx[16]);
        attr(div3, "class", div3_class_value = "form-control ts-container " +
        /*styles*/
        ctx[2].container_class);
        attr(div3, "id",
        /*containerId*/
        ctx[7]);
        attr(div3, "name",
        /*containerName*/
        ctx[8]);
      },
      m: function m(target, anchor, remount) {
        insert(target, div3, anchor);
        append(div3, div1);
        append(div1, input);
        /*input_binding*/

        ctx[59](input);
        set_input_value(input,
        /*query*/
        ctx[1]);
        append(div1, t0);
        append(div1, div0);
        append(div0, button);
        /*button_binding*/

        ctx[61](button);
        append(div3, t1);
        append(div3, div2);
        if_block.m(div2, null);
        /*div2_binding*/

        ctx[62](div2);
        /*div3_binding*/

        ctx[63](div3);
        if (remount) run_all(dispose);
        dispose = [listen(input, "input",
        /*input_input_handler*/
        ctx[60]), listen(input, "blur",
        /*handleBlur*/
        ctx[19]), listen(input, "keypress",
        /*handleInputKeypress*/
        ctx[20]), listen(input, "keydown",
        /*handleInputKeydown*/
        ctx[21]), listen(input, "keyup",
        /*handleInputKeyup*/
        ctx[22]), listen(button, "blur",
        /*handleBlur*/
        ctx[19]), listen(button, "keydown",
        /*handleToggleKeydown*/
        ctx[23]), listen(button, "click",
        /*handleToggleClick*/
        ctx[24]), listen(div2, "scroll",
        /*handlePopupScroll*/
        ctx[28])];
      },
      p: function p(ctx, dirty) {
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
        16384) {
          toggle_class(div2, "show",
          /*popupVisible*/
          ctx[14]);
        }

        if (dirty[0] &
        /*popupTop*/
        32768) {
          toggle_class(div2, "ss-popup-top",
          /*popupTop*/
          ctx[15]);
        }

        if (dirty[0] &
        /*popupLeft*/
        65536) {
          toggle_class(div2, "ss-popup-left",
          /*popupLeft*/
          ctx[16]);
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
        128) {
          attr(div3, "id",
          /*containerId*/
          ctx[7]);
        }

        if (dirty[0] &
        /*containerName*/
        256) {
          attr(div3, "name",
          /*containerName*/
          ctx[8]);
        }
      },
      i: noop,
      o: noop,
      d: function d(detaching) {
        if (detaching) detach(div3);
        /*input_binding*/

        ctx[59](null);
        /*button_binding*/

        ctx[61](null);
        if_block.d();
        /*div2_binding*/

        ctx[62](null);
        /*div3_binding*/

        ctx[63](null);
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
    var containerId = null;
    var containerName = null;
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
        $$invalidate(12, fetchingMore = true);
      } else {
        $$invalidate(9, items = []);
        offsetCount = 0;
        $$invalidate(10, actualCount = 0);
        hasMore = false;
        fetched = false;
        $$invalidate(12, fetchingMore = false);
      }

      $$invalidate(13, fetchError = null);
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

          $$invalidate(9, items = newItems);
          resolveItems(items);
          hasMore = info.more && offsetCount > 0;
          $$invalidate(11, tooShort = info.too_short === true);
          previousQuery = currentQuery;
          $$invalidate(17, activeFetch = null);
          fetched = true;
          $$invalidate(12, fetchingMore = false);
        } //         } else {
        //             console.debug("ABORT fetch: " + currentQuery);

      })["catch"](function (err) {
        if (currentFetch === activeFetch) {
          console.error(err);
          $$invalidate(13, fetchError = err);
          $$invalidate(9, items = []);
          offsetCount = 0;
          $$invalidate(10, actualCount = 0);
          hasMore = false;
          $$invalidate(11, tooShort = false);
          previousQuery = null;
          $$invalidate(17, activeFetch = null);
          fetched = false;
          $$invalidate(12, fetchingMore = false);
          inputEl.focus();
          openPopup();
        }
      });
      $$invalidate(17, activeFetch = currentFetch);
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
      $$invalidate(10, actualCount = act);
    }

    function cancelFetch() {
      if (activeFetch !== null) {
        $$invalidate(17, activeFetch = null); // no result fetched; since it doesn't match input any longer

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
      $$invalidate(14, popupVisible = false);

      if (focusInput) {
        inputEl.focus();
      }
    }

    function openPopup() {
      if (!popupVisible) {
        $$invalidate(14, popupVisible = true);
        var w = containerEl.offsetWidth;
        $$invalidate(6, popupEl.style.minWidth = w + "px", popupEl);
        var bounds = containerEl.getBoundingClientRect();
        var middleY = window.innerHeight / 2;
        var middleX = window.innerWidth / 2;
        $$invalidate(15, popupTop = bounds.y > middleY);
        $$invalidate(16, popupLeft = bounds.x + bounds.width > middleX);
      }
    }

    function selectItem(el) {
      var item = items[el.dataset.index];

      if (item) {
        $$invalidate(38, selectedItem = item);
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

    function setupComponent() {
      real.classList.add("ts-real-hidden");
      real.setAttribute("tabindex", "-1");
      $$invalidate(7, containerId = real.id ? "ts_container_".concat(real.id) : null);
      $$invalidate(8, containerName = real.name ? "ts_container_".concat(real.name) : null);
      $$invalidate(29, translations = Object.assign({}, I18N_DEFAULTS, translations || {}));
      $$invalidate(2, styles = Object.assign({}, STYLE_DEFAULTS, styles || {}));
    }

    var eventListeners = {
      change: function change() {
        syncFromReal();
      },
      "focus": function focus(event) {
        inputEl.focus();
      }
    }; ////////////////////////////////////////////////////////////
    //

    var inputKeypressHandlers = {
      base: function base(event) {
        $$invalidate(38, selectedItem = null);
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
      Tab: function Tab(event) {
        inputEl.focus();
        event.preventDefault();
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
      $$invalidate(1, query);
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
      if ("real" in $$props) $$invalidate(0, real = $$props.real);
      if ("fetcher" in $$props) $$invalidate(30, fetcher = $$props.fetcher);
      if ("queryMinLen" in $$props) $$invalidate(31, queryMinLen = $$props.queryMinLen);
      if ("query" in $$props) $$invalidate(1, query = $$props.query);
      if ("delay" in $$props) $$invalidate(32, delay = $$props.delay);
      if ("translations" in $$props) $$invalidate(29, translations = $$props.translations);
      if ("styles" in $$props) $$invalidate(2, styles = $$props.styles);
    };

    $$self.$$.update = function () {
      if ($$self.$$.dirty[0] &
      /*query*/
      2 | $$self.$$.dirty[1] &
      /*selectedItem*/
      128) {
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

    return [real, query, styles, containerEl, inputEl, toggleEl, popupEl, containerId, containerName, items, actualCount, tooShort, fetchingMore, fetchError, popupVisible, popupTop, popupLeft, activeFetch, translate, handleBlur, handleInputKeypress, handleInputKeydown, handleInputKeyup, handleToggleKeydown, handleToggleClick, handleItemKeydown, handleItemKeyup, handleItemClick, handlePopupScroll, translations, fetcher, queryMinLen, delay, setupDone, offsetCount, hasMore, previousQuery, fetched, selectedItem, wasDown, isSyncToReal, fetchItems, resolveItems, cancelFetch, fetchMoreIfneeded, closePopup, openPopup, selectItem, containsElement, syncFromReal, syncToReal, setupComponent, eventListeners, inputKeypressHandlers, inputKeydownHandlers, inputKeyupHandlers, toggleKeydownHandlers, itemKeydownHandlers, itemKeyupHandlers, input_binding, input_input_handler, button_binding, div2_binding, div3_binding];
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
        fetcher: 30,
        queryMinLen: 31,
        query: 1,
        delay: 32,
        translations: 29,
        styles: 2
      }, [-1, -1, -1]);
      return _this;
    }

    return Typeahead;
  }(SvelteComponent);

  return Typeahead;

}());
