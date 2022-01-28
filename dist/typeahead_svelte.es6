function noop() { }
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
    return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
}
function is_empty(obj) {
    return Object.keys(obj).length === 0;
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
    for (let i = 0; i < iterations.length; i += 1) {
        if (iterations[i])
            iterations[i].d(detaching);
    }
}
function element(name) {
    return document.createElement(name);
}
function svg_element(name) {
    return document.createElementNS('http://www.w3.org/2000/svg', name);
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
    return () => node.removeEventListener(event, handler, options);
}
function attr(node, attribute, value) {
    if (value == null)
        node.removeAttribute(attribute);
    else if (node.getAttribute(attribute) !== value)
        node.setAttribute(attribute, value);
}
function children(element) {
    return Array.from(element.childNodes);
}
function set_data(text, data) {
    data = '' + data;
    if (text.wholeText !== data)
        text.data = data;
}
function set_input_value(input, value) {
    input.value = value == null ? '' : value;
}
function toggle_class(element, name, toggle) {
    element.classList[toggle ? 'add' : 'remove'](name);
}

let current_component;
function set_current_component(component) {
    current_component = component;
}
function get_current_component() {
    if (!current_component)
        throw new Error('Function called outside component initialization');
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

const dirty_components = [];
const binding_callbacks = [];
const render_callbacks = [];
const flush_callbacks = [];
const resolved_promise = Promise.resolve();
let update_scheduled = false;
function schedule_update() {
    if (!update_scheduled) {
        update_scheduled = true;
        resolved_promise.then(flush);
    }
}
function add_render_callback(fn) {
    render_callbacks.push(fn);
}
// flush() calls callbacks in this order:
// 1. All beforeUpdate callbacks, in order: parents before children
// 2. All bind:this callbacks, in reverse order: children before parents.
// 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
//    for afterUpdates called during the initial onMount, which are called in
//    reverse order: children before parents.
// Since callbacks might update component values, which could trigger another
// call to flush(), the following steps guard against this:
// 1. During beforeUpdate, any updated components will be added to the
//    dirty_components array and will cause a reentrant call to flush(). Because
//    the flush index is kept outside the function, the reentrant call will pick
//    up where the earlier call left off and go through all dirty components. The
//    current_component value is saved and restored so that the reentrant call will
//    not interfere with the "parent" flush() call.
// 2. bind:this callbacks cannot trigger new flush() calls.
// 3. During afterUpdate, any updated components will NOT have their afterUpdate
//    callback called a second time; the seen_callbacks set, outside the flush()
//    function, guarantees this behavior.
const seen_callbacks = new Set();
let flushidx = 0; // Do *not* move this inside the flush() function
function flush() {
    const saved_component = current_component;
    do {
        // first, call beforeUpdate functions
        // and update components
        while (flushidx < dirty_components.length) {
            const component = dirty_components[flushidx];
            flushidx++;
            set_current_component(component);
            update(component.$$);
        }
        set_current_component(null);
        dirty_components.length = 0;
        flushidx = 0;
        while (binding_callbacks.length)
            binding_callbacks.pop()();
        // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...
        for (let i = 0; i < render_callbacks.length; i += 1) {
            const callback = render_callbacks[i];
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
    seen_callbacks.clear();
    set_current_component(saved_component);
}
function update($$) {
    if ($$.fragment !== null) {
        $$.update();
        run_all($$.before_update);
        const dirty = $$.dirty;
        $$.dirty = [-1];
        $$.fragment && $$.fragment.p($$.ctx, dirty);
        $$.after_update.forEach(add_render_callback);
    }
}
const outroing = new Set();
function transition_in(block, local) {
    if (block && block.i) {
        outroing.delete(block);
        block.i(local);
    }
}
function mount_component(component, target, anchor, customElement) {
    const { fragment, on_mount, on_destroy, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
    if (!customElement) {
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
    }
    after_update.forEach(add_render_callback);
}
function destroy_component(component, detaching) {
    const $$ = component.$$;
    if ($$.fragment !== null) {
        run_all($$.on_destroy);
        $$.fragment && $$.fragment.d(detaching);
        // TODO null out other refs, including component.$$ (but need to
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
    component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
}
function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
    const parent_component = current_component;
    set_current_component(component);
    const $$ = component.$$ = {
        fragment: null,
        ctx: null,
        // state
        props,
        update: noop,
        not_equal,
        bound: blank_object(),
        // lifecycle
        on_mount: [],
        on_destroy: [],
        on_disconnect: [],
        before_update: [],
        after_update: [],
        context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
        // everything else
        callbacks: blank_object(),
        dirty,
        skip_bound: false,
        root: options.target || parent_component.$$.root
    };
    append_styles && append_styles($$.root);
    let ready = false;
    $$.ctx = instance
        ? instance(component, options.props || {}, (i, ret, ...rest) => {
            const value = rest.length ? rest[0] : ret;
            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                if (!$$.skip_bound && $$.bound[i])
                    $$.bound[i](value);
                if (ready)
                    make_dirty(component, i);
            }
            return ret;
        })
        : [];
    $$.update();
    ready = true;
    run_all($$.before_update);
    // `false` as a special case of no DOM component
    $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
    if (options.target) {
        if (options.hydrate) {
            const nodes = children(options.target);
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.l(nodes);
            nodes.forEach(detach);
        }
        else {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.c();
        }
        if (options.intro)
            transition_in(component.$$.fragment);
        mount_component(component, options.target, options.anchor, options.customElement);
        flush();
    }
    set_current_component(parent_component);
}
/**
 * Base class for Svelte components. Used when dev=false.
 */
class SvelteComponent {
    $destroy() {
        destroy_component(this, 1);
        this.$destroy = noop;
    }
    $on(type, callback) {
        const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
        callbacks.push(callback);
        return () => {
            const index = callbacks.indexOf(callback);
            if (index !== -1)
                callbacks.splice(index, 1);
        };
    }
    $set($$props) {
        if (this.$$set && !is_empty($$props)) {
            this.$$.skip_bound = true;
            this.$$set($$props);
            this.$$.skip_bound = false;
        }
    }
}

/* src/typeahead.svelte generated by Svelte v3.46.3 */

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[95] = list[i];
	child_ctx[97] = i;
	return child_ctx;
}

// (964:4) {#if showToggle}
function create_if_block_8(ctx) {
	let div1;
	let button;
	let span;
	let t1;
	let div0;
	let button_disabled_value;
	let mounted;
	let dispose;

	function select_block_type(ctx, dirty) {
		if (/*showFetching*/ ctx[19]) return create_if_block_9;
		return create_else_block_2;
	}

	let current_block_type = select_block_type(ctx);
	let if_block = current_block_type(ctx);

	return {
		c() {
			div1 = element("div");
			button = element("button");
			span = element("span");
			span.textContent = `${/*translate*/ ctx[27]('toggle')}`;
			t1 = space();
			div0 = element("div");
			if_block.c();
			attr(span, "class", "sr-only");
			attr(div0, "class", "ts-caret");
			attr(button, "class", "btn btn-outline-secondary");
			button.disabled = button_disabled_value = /*disabled*/ ctx[26] ? 'disabled' : null;
			attr(button, "type", "button");
			attr(button, "tabindex", "-1");
			attr(div1, "class", "input-group-append");
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			append(div1, button);
			append(button, span);
			append(button, t1);
			append(button, div0);
			if_block.m(div0, null);
			/*button_binding*/ ctx[45](button);

			if (!mounted) {
				dispose = [
					listen(button, "blur", /*handleBlur*/ ctx[28]),
					listen(button, "keydown", /*handleToggleKeydown*/ ctx[32]),
					listen(button, "click", /*handleToggleClick*/ ctx[33])
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
				if_block.p(ctx, dirty);
			} else {
				if_block.d(1);
				if_block = current_block_type(ctx);

				if (if_block) {
					if_block.c();
					if_block.m(div0, null);
				}
			}

			if (dirty[0] & /*disabled*/ 67108864 && button_disabled_value !== (button_disabled_value = /*disabled*/ ctx[26] ? 'disabled' : null)) {
				button.disabled = button_disabled_value;
			}
		},
		d(detaching) {
			if (detaching) detach(div1);
			if_block.d();
			/*button_binding*/ ctx[45](null);
			mounted = false;
			run_all(dispose);
		}
	};
}

// (980:12) {:else}
function create_else_block_2(ctx) {
	let svg;
	let polygon;
	let svg_class_value;

	return {
		c() {
			svg = svg_element("svg");
			polygon = svg_element("polygon");
			attr(polygon, "points", "2,2 14,2 8,8");
			attr(svg, "viewBox", "0 0 16 16");

			attr(svg, "class", svg_class_value = /*disabled*/ ctx[26]
			? 'ts-svg-caret-diasbled'
			: 'ts-svg-caret');
		},
		m(target, anchor) {
			insert(target, svg, anchor);
			append(svg, polygon);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*disabled*/ 67108864 && svg_class_value !== (svg_class_value = /*disabled*/ ctx[26]
			? 'ts-svg-caret-diasbled'
			: 'ts-svg-caret')) {
				attr(svg, "class", svg_class_value);
			}
		},
		d(detaching) {
			if (detaching) detach(svg);
		}
	};
}

// (976:12) {#if showFetching}
function create_if_block_9(ctx) {
	let svg;
	let polygon;
	let svg_class_value;

	return {
		c() {
			svg = svg_element("svg");
			polygon = svg_element("polygon");
			attr(polygon, "points", "4,2 12,2 12,10 4,10");
			attr(svg, "viewBox", "0 0 16 16");

			attr(svg, "class", svg_class_value = /*disabled*/ ctx[26]
			? 'ts-svg-caret-diasbled'
			: 'ts-svg-caret');
		},
		m(target, anchor) {
			insert(target, svg, anchor);
			append(svg, polygon);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*disabled*/ 67108864 && svg_class_value !== (svg_class_value = /*disabled*/ ctx[26]
			? 'ts-svg-caret-diasbled'
			: 'ts-svg-caret')) {
				attr(svg, "class", svg_class_value);
			}
		},
		d(detaching) {
			if (detaching) detach(svg);
		}
	};
}

// (1037:10) {:else}
function create_else_block_1(ctx) {
	let li;
	let div;
	let t0_value = (/*item*/ ctx[95].display_text || /*item*/ ctx[95].text) + "";
	let t0;
	let t1;
	let t2;
	let li_id_value;
	let mounted;
	let dispose;
	let if_block = /*item*/ ctx[95].desc && create_if_block_7(ctx);

	return {
		c() {
			li = element("li");
			div = element("div");
			t0 = text(t0_value);
			t1 = space();
			if (if_block) if_block.c();
			t2 = space();
			attr(div, "class", "ts-item-text");
			attr(li, "class", "dropdown-item ts-item ts-js-item");
			attr(li, "data-index", /*index*/ ctx[97]);
			attr(li, "id", li_id_value = "" + (/*containerId*/ ctx[11] + "_item_" + /*index*/ ctx[97]));
		},
		m(target, anchor) {
			insert(target, li, anchor);
			append(li, div);
			append(div, t0);
			append(li, t1);
			if (if_block) if_block.m(li, null);
			append(li, t2);

			if (!mounted) {
				dispose = [
					listen(li, "mousedown", handleOptionMouseDown),
					listen(li, "click", /*handleOptionClick*/ ctx[34])
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty[0] & /*items*/ 32768 && t0_value !== (t0_value = (/*item*/ ctx[95].display_text || /*item*/ ctx[95].text) + "")) set_data(t0, t0_value);

			if (/*item*/ ctx[95].desc) {
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

			if (dirty[0] & /*containerId*/ 2048 && li_id_value !== (li_id_value = "" + (/*containerId*/ ctx[11] + "_item_" + /*index*/ ctx[97]))) {
				attr(li, "id", li_id_value);
			}
		},
		d(detaching) {
			if (detaching) detach(li);
			if (if_block) if_block.d();
			mounted = false;
			run_all(dispose);
		}
	};
}

// (1026:54) 
function create_if_block_5(ctx) {
	let li;
	let div;
	let t0_value = (/*item*/ ctx[95].display_text || /*item*/ ctx[95].text) + "";
	let t0;
	let t1;
	let t2;
	let if_block = /*item*/ ctx[95].desc && create_if_block_6(ctx);

	return {
		c() {
			li = element("li");
			div = element("div");
			t0 = text(t0_value);
			t1 = space();
			if (if_block) if_block.c();
			t2 = space();
			attr(div, "class", "ts-item-text");
			attr(li, "class", "dropdown-item ts-item-disabled ts-js-dead");
		},
		m(target, anchor) {
			insert(target, li, anchor);
			append(li, div);
			append(div, t0);
			append(li, t1);
			if (if_block) if_block.m(li, null);
			append(li, t2);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*items*/ 32768 && t0_value !== (t0_value = (/*item*/ ctx[95].display_text || /*item*/ ctx[95].text) + "")) set_data(t0, t0_value);

			if (/*item*/ ctx[95].desc) {
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
		d(detaching) {
			if (detaching) detach(li);
			if (if_block) if_block.d();
		}
	};
}

// (1022:10) {#if item.separator}
function create_if_block_4(ctx) {
	let li;

	return {
		c() {
			li = element("li");
			attr(li, "class", "dropdown-divider ts-js-dead");
			attr(li, "data-index", /*index*/ ctx[97]);
		},
		m(target, anchor) {
			insert(target, li, anchor);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(li);
		}
	};
}

// (1048:14) {#if item.desc}
function create_if_block_7(ctx) {
	let div;
	let t_value = /*item*/ ctx[95].desc + "";
	let t;

	return {
		c() {
			div = element("div");
			t = text(t_value);
			attr(div, "class", "ts-item-desc");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, t);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*items*/ 32768 && t_value !== (t_value = /*item*/ ctx[95].desc + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (1031:14) {#if item.desc}
function create_if_block_6(ctx) {
	let div;
	let t_value = /*item*/ ctx[95].desc + "";
	let t;

	return {
		c() {
			div = element("div");
			t = text(t_value);
			attr(div, "class", "ts-item-desc");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, t);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*items*/ 32768 && t_value !== (t_value = /*item*/ ctx[95].desc + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (1021:8) {#each items as item, index}
function create_each_block(ctx) {
	let if_block_anchor;

	function select_block_type_1(ctx, dirty) {
		if (/*item*/ ctx[95].separator) return create_if_block_4;
		if (/*item*/ ctx[95].disabled || /*item*/ ctx[95].placeholder) return create_if_block_5;
		return create_else_block_1;
	}

	let current_block_type = select_block_type_1(ctx);
	let if_block = current_block_type(ctx);

	return {
		c() {
			if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
		},
		p(ctx, dirty) {
			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
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
		d(detaching) {
			if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

// (1067:32) 
function create_if_block_2(ctx) {
	let div;

	function select_block_type_3(ctx, dirty) {
		if (/*tooShort*/ ctx[17]) return create_if_block_3;
		return create_else_block;
	}

	let current_block_type = select_block_type_3(ctx);
	let if_block = current_block_type(ctx);

	return {
		c() {
			div = element("div");
			if_block.c();
			attr(div, "class", "dropdown-item ts-item-muted ts-message-item");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			if_block.m(div, null);
		},
		p(ctx, dirty) {
			if (current_block_type === (current_block_type = select_block_type_3(ctx)) && if_block) {
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
		d(detaching) {
			if (detaching) detach(div);
			if_block.d();
		}
	};
}

// (1063:43) 
function create_if_block_1(ctx) {
	let div;

	return {
		c() {
			div = element("div");
			div.textContent = `${/*translate*/ ctx[27]('fetching')}`;
			attr(div, "class", "dropdown-item ts-item-muted ts-message-item");
		},
		m(target, anchor) {
			insert(target, div, anchor);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (1059:4) {#if fetchError}
function create_if_block(ctx) {
	let div;
	let t;

	return {
		c() {
			div = element("div");
			t = text(/*fetchError*/ ctx[21]);
			attr(div, "class", "dropdown-item text-danger ts-message-item");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, t);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*fetchError*/ 2097152) set_data(t, /*fetchError*/ ctx[21]);
		},
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (1071:8) {:else}
function create_else_block(ctx) {
	let t_value = /*translate*/ ctx[27]('no_results') + "";
	let t;

	return {
		c() {
			t = text(t_value);
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

// (1069:8) {#if tooShort }
function create_if_block_3(ctx) {
	let t_value = /*translate*/ ctx[27]('too_short') + "";
	let t;

	return {
		c() {
			t = text(t_value);
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(t);
		}
	};
}

function create_fragment(ctx) {
	let div3;
	let div0;
	let input;
	let input_disabled_value;
	let input_aria_controls_value;
	let input_aria_activedescendant_value;
	let input_data_target_value;
	let input_placeholder_value;
	let t0;
	let t1;
	let div2;
	let div1;
	let ul;
	let ul_id_value;
	let t2;
	let div2_aria_hidden_value;
	let div2_id_value;
	let div3_class_value;
	let mounted;
	let dispose;
	let if_block0 = /*showToggle*/ ctx[3] && create_if_block_8(ctx);
	let each_value = /*items*/ ctx[15];
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	function select_block_type_2(ctx, dirty) {
		if (/*fetchError*/ ctx[21]) return create_if_block;
		if (/*activeFetch*/ ctx[25] && !/*fetchingMore*/ ctx[20]) return create_if_block_1;
		if (/*actualCount*/ ctx[16] === 0) return create_if_block_2;
	}

	let current_block_type = select_block_type_2(ctx);
	let if_block1 = current_block_type && current_block_type(ctx);

	return {
		c() {
			div3 = element("div");
			div0 = element("div");
			input = element("input");
			t0 = space();
			if (if_block0) if_block0.c();
			t1 = space();
			div2 = element("div");
			div1 = element("div");
			ul = element("ul");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t2 = space();
			if (if_block1) if_block1.c();
			attr(input, "class", "form-control ts-input");
			attr(input, "autocomplete", "new-password");
			attr(input, "autocorrect", "off");
			attr(input, "autocapitalize", "off");
			attr(input, "spellcheck", "off");
			input.disabled = input_disabled_value = /*disabled*/ ctx[26] ? 'disabled' : null;
			attr(input, "role", "combobox");
			attr(input, "aria-labelledby", /*labelId*/ ctx[13]);
			attr(input, "aria-label", /*labelText*/ ctx[14]);
			attr(input, "aria-expanded", /*popupVisible*/ ctx[22]);
			attr(input, "aria-haspopup", "listbox");
			attr(input, "aria-controls", input_aria_controls_value = "" + (/*containerId*/ ctx[11] + "_items"));
			attr(input, "aria-activedescendant", input_aria_activedescendant_value = /*activeId*/ ctx[18] || null);
			attr(input, "data-target", input_data_target_value = /*real*/ ctx[1].id);
			attr(input, "placeholder", input_placeholder_value = /*real*/ ctx[1].placeholder);
			attr(div0, "class", "input-group");
			attr(ul, "class", "ts-item-list");
			attr(ul, "id", ul_id_value = "" + (/*containerId*/ ctx[11] + "_items"));
			attr(ul, "role", "listbox");
			attr(ul, "aria-expanded", /*popupVisible*/ ctx[22]);
			attr(ul, "aria-hidden", "false");
			attr(div1, "class", "ts-result");
			attr(div2, "class", "dropdown-menu ts-popup");
			attr(div2, "aria-hidden", div2_aria_hidden_value = !/*popupVisible*/ ctx[22]);
			attr(div2, "id", div2_id_value = "" + (/*containerId*/ ctx[11] + "_popup"));
			toggle_class(div2, "show", /*popupVisible*/ ctx[22]);
			toggle_class(div2, "ts-popup-fixed", /*popupFixed*/ ctx[4]);
			toggle_class(div2, "ts-popup-top", /*popupTop*/ ctx[23] && !/*popupFixed*/ ctx[4]);
			toggle_class(div2, "ts-popup-left", /*popupLeft*/ ctx[24] && !/*popupFixed*/ ctx[4]);
			toggle_class(div2, "ts-popup-fixed-top", /*popupTop*/ ctx[23] && /*popupFixed*/ ctx[4]);
			toggle_class(div2, "ts-popup-fixed-left", /*popupLeft*/ ctx[24] && /*popupFixed*/ ctx[4]);
			attr(div3, "class", div3_class_value = "form-control ts-container " + /*styles*/ ctx[2].container_class);
			attr(div3, "id", /*containerId*/ ctx[11]);
			attr(div3, "name", /*containerName*/ ctx[12]);
		},
		m(target, anchor) {
			insert(target, div3, anchor);
			append(div3, div0);
			append(div0, input);
			/*input_binding*/ ctx[43](input);
			set_input_value(input, /*query*/ ctx[0]);
			append(div0, t0);
			if (if_block0) if_block0.m(div0, null);
			append(div3, t1);
			append(div3, div2);
			append(div2, div1);
			append(div1, ul);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(ul, null);
			}

			/*ul_binding*/ ctx[46](ul);
			/*div1_binding*/ ctx[47](div1);
			append(div2, t2);
			if (if_block1) if_block1.m(div2, null);
			/*div2_binding*/ ctx[48](div2);
			/*div3_binding*/ ctx[49](div3);

			if (!mounted) {
				dispose = [
					listen(input, "input", /*input_input_handler*/ ctx[44]),
					listen(input, "blur", /*handleBlur*/ ctx[28]),
					listen(input, "keypress", /*handleInputKeypress*/ ctx[29]),
					listen(input, "keydown", /*handleInputKeydown*/ ctx[30]),
					listen(input, "keyup", /*handleInputKeyup*/ ctx[31]),
					listen(div1, "scroll", /*handleResultScroll*/ ctx[35])
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty[0] & /*disabled*/ 67108864 && input_disabled_value !== (input_disabled_value = /*disabled*/ ctx[26] ? 'disabled' : null)) {
				input.disabled = input_disabled_value;
			}

			if (dirty[0] & /*labelId*/ 8192) {
				attr(input, "aria-labelledby", /*labelId*/ ctx[13]);
			}

			if (dirty[0] & /*labelText*/ 16384) {
				attr(input, "aria-label", /*labelText*/ ctx[14]);
			}

			if (dirty[0] & /*popupVisible*/ 4194304) {
				attr(input, "aria-expanded", /*popupVisible*/ ctx[22]);
			}

			if (dirty[0] & /*containerId*/ 2048 && input_aria_controls_value !== (input_aria_controls_value = "" + (/*containerId*/ ctx[11] + "_items"))) {
				attr(input, "aria-controls", input_aria_controls_value);
			}

			if (dirty[0] & /*activeId*/ 262144 && input_aria_activedescendant_value !== (input_aria_activedescendant_value = /*activeId*/ ctx[18] || null)) {
				attr(input, "aria-activedescendant", input_aria_activedescendant_value);
			}

			if (dirty[0] & /*real*/ 2 && input_data_target_value !== (input_data_target_value = /*real*/ ctx[1].id)) {
				attr(input, "data-target", input_data_target_value);
			}

			if (dirty[0] & /*real*/ 2 && input_placeholder_value !== (input_placeholder_value = /*real*/ ctx[1].placeholder)) {
				attr(input, "placeholder", input_placeholder_value);
			}

			if (dirty[0] & /*query*/ 1 && input.value !== /*query*/ ctx[0]) {
				set_input_value(input, /*query*/ ctx[0]);
			}

			if (/*showToggle*/ ctx[3]) {
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

			if (dirty[0] & /*items, containerId*/ 34816 | dirty[1] & /*handleOptionClick*/ 8) {
				each_value = /*items*/ ctx[15];
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(ul, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}

			if (dirty[0] & /*containerId*/ 2048 && ul_id_value !== (ul_id_value = "" + (/*containerId*/ ctx[11] + "_items"))) {
				attr(ul, "id", ul_id_value);
			}

			if (dirty[0] & /*popupVisible*/ 4194304) {
				attr(ul, "aria-expanded", /*popupVisible*/ ctx[22]);
			}

			if (current_block_type === (current_block_type = select_block_type_2(ctx)) && if_block1) {
				if_block1.p(ctx, dirty);
			} else {
				if (if_block1) if_block1.d(1);
				if_block1 = current_block_type && current_block_type(ctx);

				if (if_block1) {
					if_block1.c();
					if_block1.m(div2, null);
				}
			}

			if (dirty[0] & /*popupVisible*/ 4194304 && div2_aria_hidden_value !== (div2_aria_hidden_value = !/*popupVisible*/ ctx[22])) {
				attr(div2, "aria-hidden", div2_aria_hidden_value);
			}

			if (dirty[0] & /*containerId*/ 2048 && div2_id_value !== (div2_id_value = "" + (/*containerId*/ ctx[11] + "_popup"))) {
				attr(div2, "id", div2_id_value);
			}

			if (dirty[0] & /*popupVisible*/ 4194304) {
				toggle_class(div2, "show", /*popupVisible*/ ctx[22]);
			}

			if (dirty[0] & /*popupFixed*/ 16) {
				toggle_class(div2, "ts-popup-fixed", /*popupFixed*/ ctx[4]);
			}

			if (dirty[0] & /*popupTop, popupFixed*/ 8388624) {
				toggle_class(div2, "ts-popup-top", /*popupTop*/ ctx[23] && !/*popupFixed*/ ctx[4]);
			}

			if (dirty[0] & /*popupLeft, popupFixed*/ 16777232) {
				toggle_class(div2, "ts-popup-left", /*popupLeft*/ ctx[24] && !/*popupFixed*/ ctx[4]);
			}

			if (dirty[0] & /*popupTop, popupFixed*/ 8388624) {
				toggle_class(div2, "ts-popup-fixed-top", /*popupTop*/ ctx[23] && /*popupFixed*/ ctx[4]);
			}

			if (dirty[0] & /*popupLeft, popupFixed*/ 16777232) {
				toggle_class(div2, "ts-popup-fixed-left", /*popupLeft*/ ctx[24] && /*popupFixed*/ ctx[4]);
			}

			if (dirty[0] & /*styles*/ 4 && div3_class_value !== (div3_class_value = "form-control ts-container " + /*styles*/ ctx[2].container_class)) {
				attr(div3, "class", div3_class_value);
			}

			if (dirty[0] & /*containerId*/ 2048) {
				attr(div3, "id", /*containerId*/ ctx[11]);
			}

			if (dirty[0] & /*containerName*/ 4096) {
				attr(div3, "name", /*containerName*/ ctx[12]);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div3);
			/*input_binding*/ ctx[43](null);
			if (if_block0) if_block0.d();
			destroy_each(each_blocks, detaching);
			/*ul_binding*/ ctx[46](null);
			/*div1_binding*/ ctx[47](null);

			if (if_block1) {
				if_block1.d();
			}

			/*div2_binding*/ ctx[48](null);
			/*div3_binding*/ ctx[49](null);
			mounted = false;
			run_all(dispose);
		}
	};
}

const I18N_DEFAULTS = {
	fetching: 'Searching..',
	no_results: 'No results',
	too_short: 'Too short',
	toggle: 'Toggle popup',
	fetching_more: 'Searching more...'
};

const STYLE_DEFAULTS = { container_class: '' };
const FETCH_INDICATOR_DELAY = 250;

const META_KEYS = {
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

const MUTATIONS = { attributes: true };
let uidBase = 0;

function nop() {
	
}

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

////////////////////////////////////////////////////////////
//
function handleEvent(code, handlers, event) {
	(handlers[code] || handlers.base)(event);
}

/**
 * NOTE KI blocks undesired blur in option select
 */
function handleOptionMouseDown(event) {
	event.preventDefault();
}

function instance($$self, $$props, $$invalidate) {
	let { real } = $$props;
	let { debugMode = false } = $$props;
	let { fetcher } = $$props;
	let { queryMinLen = 1 } = $$props;
	let { query } = $$props;
	let { delay = 200 } = $$props;
	let { translations = {} } = $$props;
	let { styles = {} } = $$props;
	let { showToggle = false } = $$props;
	let { passEnter = false } = $$props;
	let { popupFixed = false } = $$props;
	let containerEl;
	let inputEl;
	let toggleEl;
	let popupEl;
	let resultEl;
	let optionsEl;
	let containerId = null;
	let containerName = null;
	let labelId = null;
	let labelText = null;
	const mutationObserver = new MutationObserver(handleMutation);
	let resizeObserver = null;
	let windowScrollListener = null;
	let setupDone = false;
	let items = [];
	let offsetCount = 0;
	let actualCount = 0;
	let hasMore = false;
	let tooShort = false;
	let activeId = null;
	let showFetching = false;
	let fetchingMore = false;
	let fetchError = null;
	let popupVisible = false;
	let popupTop = false;
	let popupLeft = false;
	let activeFetch = null;
	let previousQuery = null;
	let selectedItem = null;
	let wasDown = false;
	let disabled = false;
	let isSyncToReal = false;

	////////////////////////////////////////////////////////////
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
	}

	function hasInputSelection() {
		if (disabled) {
			return;
		}

		return inputEl.selectionStart !== inputEl.selectionEnd;
	}

	////////////////////////////////////////////////////////////
	//
	function fetchItems(fetchMore) {
		let currentQuery = query.trim();

		if (currentQuery.length > 0) {
			currentQuery = query;
		}

		if (!fetchMore && !fetchingMore && currentQuery === previousQuery) {
			return;
		}

		//     console.debug("START fetch: " + currentQuery);
		cancelFetch();

		let fetchOffset = 0;

		if (fetchMore) {
			fetchOffset = offsetCount;
			$$invalidate(20, fetchingMore = true);
		} else {
			$$invalidate(15, items = []);
			offsetCount = 0;
			$$invalidate(16, actualCount = 0);
			hasMore = false;
			$$invalidate(20, fetchingMore = false);
		}

		$$invalidate(21, fetchError = null);
		$$invalidate(19, showFetching = false);
		let currentFetchOffset = fetchOffset;
		let currentFetchingMore = fetchingMore;

		let currentFetch = new Promise(function (resolve, reject) {
				if (currentFetchingMore) {
					//             console.debug("MOR hit: " + currentQuery);
					resolve(fetcher(currentFetchOffset, currentQuery));
				} else {
					if (currentQuery.length < queryMinLen) {
						//                 console.debug("TOO_SHORT fetch: " + currentQuery + ", limit: " + queryMinLen);
						resolve({
							items: [],
							info: { more: false, too_short: true }
						});
					} else {
						//                 console.debug("TIMER start: " + currentQuery);
						setTimeout(
							function () {
								if (currentFetch === activeFetch) {
									//                         console.debug("TIMER hit: " + currentQuery);
									resolve(fetcher(currentFetchOffset, currentQuery));
								} else {
									//                         console.debug("TIMER reject: " + currentQuery);
									reject("cancel");
								}
							},
							delay
						);
					}
				}
			}).then(function (response) {
			if (currentFetch === activeFetch) {
				let fetchedtems = response.items || [];
				let info = response.info || {};

				//             console.debug("APPLY fetch: " + currentQuery + ", isMore: " + currentFetchingMore + ", offset: " + currentFetchOffset + ", resultSize: " + fetchedtems.length + ", oldSize: " + items.length);
				//             console.debug(info);
				let newItems;

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
				$$invalidate(25, activeFetch = null);
				$$invalidate(20, fetchingMore = false);
				$$invalidate(19, showFetching = false);
			} //         } else {
			//             console.debug("ABORT fetch: " + currentQuery);
		}).catch(function (err) {
			if (currentFetch === activeFetch) {
				console.error(err);
				$$invalidate(21, fetchError = err);
				$$invalidate(15, items = []);
				offsetCount = 0;
				$$invalidate(16, actualCount = 0);
				hasMore = false;
				$$invalidate(17, tooShort = false);
				previousQuery = null;
				$$invalidate(25, activeFetch = null);
				$$invalidate(20, fetchingMore = false);
				$$invalidate(19, showFetching = false);
				focusInput();
				openPopup();
			}
		});

		setTimeout(
			function () {
				if (activeFetch === currentFetch) {
					$$invalidate(19, showFetching = true);
				}
			},
			FETCH_INDICATOR_DELAY
		);

		$$invalidate(25, activeFetch = currentFetch);
	}

	function resolveItems(items) {
		let off = 0;
		let act = 0;

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
			$$invalidate(25, activeFetch = null);

			previousQuery = null;
			$$invalidate(19, showFetching = false);
		}
	}

	function fetchMoreIfneeded() {
		if (hasMore && !fetchingMore && popupVisible) {
			let lastItem = optionsEl.querySelector('.ts-item:last-child');

			if (resultEl.scrollTop + resultEl.clientHeight >= resultEl.scrollHeight - lastItem.clientHeight * 2 - 2) {
				fetchItems(true);
			}
		}
	}

	function openPopup() {
		if (popupVisible) {
			return false;
		}

		$$invalidate(22, popupVisible = true);
		let w = containerEl.offsetWidth;
		$$invalidate(8, popupEl.style.minWidth = w + "px", popupEl);
		updatePopupPosition();

		if (!windowScrollListener) {
			windowScrollListener = handleWindowScroll;
			window.addEventListener('scroll', windowScrollListener);
		}

		return true;
	}

	function closePopup(focus) {
		$$invalidate(22, popupVisible = false);

		if (windowScrollListener) {
			window.removeEventListener('scroll', windowScrollListener);
			windowScrollListener = null;
		}

		if (focus) {
			focusInput();
		}
	}

	function selectOption(el) {
		if (!el || disabled) {
			return;
		}

		let item = items[el.dataset.index];

		if (item) {
			$$invalidate(42, selectedItem = item);
			let changed = item.text !== query;
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
			real.dispatchEvent(new CustomEvent('typeahead-select', { detail: item }));
		} //     } else {
		//         console.debug("MISSING item", el);
	}

	function containsElement(el) {
		return el === inputEl || el === toggleEl || popupEl.contains(el);
	}

	function syncFromRealDisabled() {
		$$invalidate(26, disabled = real.disabled);

		if (disabled) {
			closePopup();
		}
	}

	function syncFromReal() {
		if (isSyncToReal) {
			return;
		}

		let realValue = real.value;

		if (realValue !== query) {
			$$invalidate(0, query = realValue);
		}
	}

	function syncToReal(query, selectedItem) {

		if (real.value !== query) {
			try {
				isSyncToReal = true;
				$$invalidate(1, real.value = query, real);
				real.dispatchEvent(new Event('change'));
			} finally {
				isSyncToReal = false;
			}
		}
	}

	onMount(function () {
		$$invalidate(0, query = real.value || '');
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
		real.classList.add('ts-real-hidden');
		real.setAttribute('tabindex', '-1');
		real.setAttribute('aria-hidden', 'true');
		let ds = real.dataset;
		let baseId = real.id || nextUID();
		$$invalidate(11, containerId = `ts_container_${baseId}`);
		$$invalidate(12, containerName = real.name ? `ts_container_${real.name}` : null);
		mutationObserver.observe(real, MUTATIONS);
		bindLabel();

		$$invalidate(36, queryMinLen = ds.tsQueryMinLen !== undefined
		? parseInt(ds.tsQueryMinLen, 10)
		: queryMinLen);

		$$invalidate(0, query = ds.tsQuery !== undefined ? ds.tsQuery : query);

		$$invalidate(37, delay = ds.tsDelay !== undefined
		? parseInt(ds.tsDelay, 10)
		: delay);

		$$invalidate(3, showToggle = ds.tsShowToggle !== undefined ? true : showToggle);
		$$invalidate(39, passEnter = ds.tsPassEnter !== undefined ? true : passEnter);
		$$invalidate(4, popupFixed = ds.tsPopupFixed !== undefined ? true : popupFixed);
		$$invalidate(38, translations = Object.assign({}, I18N_DEFAULTS, translations || {}));
		$$invalidate(2, styles = Object.assign({}, STYLE_DEFAULTS, styles || {}));
	}

	function bindLabel() {
		if (real.id) {
			let label = document.querySelector(`[for="${real.id}"]`);

			if (label) {
				label.id = label.id || `ts_label_${real.id}`;
				$$invalidate(13, labelId = label.id);
			}
		}

		if (!labelId) {
			$$invalidate(14, labelText = real.getAttribute('aria-label') || null);
		}
	}

	function handleMutation(mutationsList, observer) {
		for (let mutation of mutationsList) {
			if (mutation.type === 'attributes') {
				if (mutation.attributeName === 'disabled') {
					syncFromRealDisabled();
				}
			}
		}
	}

	function handleResize(resizeList, observer) {
		updatePopupPosition();
	}

	function findActiveOption() {
		return optionsEl.querySelector('.ts-item-active');
	}

	function findFirstOption() {
		let children = optionsEl.children;
		return children[0];
	}

	function findLastOption() {
		let children = optionsEl.children;
		return children[children.length - 1];
	}

	function updatePopupPosition() {
		if (!popupVisible) {
			return;
		}

		let bounds = containerEl.getBoundingClientRect();
		let middleY = window.innerHeight / 2;
		let middleX = window.innerWidth / 2;
		$$invalidate(23, popupTop = bounds.y > middleY);
		$$invalidate(24, popupLeft = bounds.x + bounds.width > middleX);

		if (popupFixed) {
			let popupBounds = popupEl.getBoundingClientRect();

			if (popupTop) {
				$$invalidate(8, popupEl.style.top = `${bounds.y - popupBounds.height}px`, popupEl);
			} else {
				$$invalidate(8, popupEl.style.top = `${bounds.y + bounds.height}px`, popupEl);
			}

			if (popupLeft) {
				$$invalidate(8, popupEl.style.left = `${bounds.x + bounds.width - popupBounds.width}px`, popupEl);
			} else {
				$$invalidate(8, popupEl.style.left = `${bounds.x}px`, popupEl);
			}
		}
	}

	let eventListeners = {
		change() {
			syncFromReal();
		},
		'focus'(event) {
			focusInput();
		}
	};

	////////////////////////////////////////////////////////////
	//
	let inputKeypressHandlers = {
		base(event) {
			$$invalidate(42, selectedItem = null);
		}
	};

	let inputKeydownHandlers = {
		base(event) {
			if (isMetaKey(event)) {
				return;
			}

			wasDown = true;
		},
		Enter(event) {
			if (popupVisible) {
				let el = findActiveOption();

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
		ArrowDown(event) {
			if (openPopup()) {
				fetchItems();
			} else {
				if (!fetchingMore) {
					activateArrowDown(event);
				}
			}

			event.preventDefault();
		},
		ArrowUp(event) {
			activateArrowUp(event);
		},
		PageUp(event) {
			activatePageUp(event);
		},
		PageDown(event) {
			activatePageDown(event);
		},
		Home(event) {
			activateHome(event);
		},
		End(event) {
			activateEnd(event);
		},
		Escape(event) {
			cancelFetch();
			closePopup(false);
		},
		Tab: nop
	};

	let inputKeyupHandlers = {
		base(event) {
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

	let toggleKeydownHandlers = {
		base(event) {
			if (isMetaKey(event)) {
				return;
			}

			if (hasInputSelection()) {
				$$invalidate(6, inputEl.selectionStart = inputEl.selectionEnd, inputEl);
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
		Escape(event) {
			cancelFetch();
			closePopup(false);
			focusInput();
		},
		Tab(event) {
			focusInput();
			event.preventDefault();
		}
	};

	function activateOption(el, old) {
		old = old || findActiveOption();

		if (old && old !== el) {
			old.classList.remove('ts-item-active');
		}

		$$invalidate(18, activeId = null);

		if (!el) {
			return;
		}

		el.classList.add('ts-item-active');
		$$invalidate(18, activeId = `${containerId}_item_${el.dataset.index}`);
		let clientHeight = resultEl.clientHeight;

		if (resultEl.scrollHeight > clientHeight) {
			let y = el.offsetTop;
			let elementBottom = y + el.offsetHeight;
			let scrollTop = resultEl.scrollTop;

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

		let el = findActiveOption();
		let next = el && el.previousElementSibling;

		while (next && next.classList.contains('ts-js-dead')) {
			next = next.previousElementSibling;
		}

		if (next && !next.classList.contains('ts-js-item')) {
			next = null;
		}

		activateOption(next, el);

		// NOTE KI in *UP* case, focus needs to be moved into input, to avoid enforced selection
		if (!next) {
			focusInput();
		}

		event.preventDefault();
	}

	function activateArrowDown(event) {
		if (disabled || !popupVisible) {
			return;
		}

		let el = findActiveOption();
		let next = el ? el.nextElementSibling : findFirstOption();

		while (next && next.classList.contains('ts-js-dead')) {
			next = next.nextElementSibling;
		}

		if (next && !next.classList.contains('ts-js-item')) {
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

		let newY = resultEl.scrollTop - resultEl.clientHeight;
		let nodes = optionsEl.querySelectorAll('.ts-js-item');
		let next = null;

		for (let i = 0; !next && i < nodes.length; i++) {
			let node = nodes[i];

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

		let curr = findActiveOption() || findFirstOption();
		let newY = curr.offsetTop + resultEl.clientHeight;
		let nodes = optionsEl.querySelectorAll('.ts-js-item');
		let next = null;

		for (let i = 0; !next && i < nodes.length; i++) {
			let node = nodes[i];

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

		let nodes = optionsEl.querySelectorAll('.ts-js-item');
		let next = nodes.length ? nodes[0] : null;
		activateOption(next);
		event.preventDefault();
	}

	function activateEnd(event) {
		if (disabled || !popupVisible) {
			return;
		}

		let nodes = optionsEl.querySelectorAll('.ts-js-item');
		let next = nodes.length ? nodes[nodes.length - 1] : null;
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
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			inputEl = $$value;
			$$invalidate(6, inputEl);
		});
	}

	function input_input_handler() {
		query = this.value;
		$$invalidate(0, query);
	}

	function button_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			toggleEl = $$value;
			$$invalidate(7, toggleEl);
		});
	}

	function ul_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			optionsEl = $$value;
			$$invalidate(10, optionsEl);
		});
	}

	function div1_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			resultEl = $$value;
			$$invalidate(9, resultEl);
		});
	}

	function div2_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			popupEl = $$value;
			$$invalidate(8, popupEl);
		});
	}

	function div3_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			containerEl = $$value;
			$$invalidate(5, containerEl);
		});
	}

	$$self.$$set = $$props => {
		if ('real' in $$props) $$invalidate(1, real = $$props.real);
		if ('debugMode' in $$props) $$invalidate(40, debugMode = $$props.debugMode);
		if ('fetcher' in $$props) $$invalidate(41, fetcher = $$props.fetcher);
		if ('queryMinLen' in $$props) $$invalidate(36, queryMinLen = $$props.queryMinLen);
		if ('query' in $$props) $$invalidate(0, query = $$props.query);
		if ('delay' in $$props) $$invalidate(37, delay = $$props.delay);
		if ('translations' in $$props) $$invalidate(38, translations = $$props.translations);
		if ('styles' in $$props) $$invalidate(2, styles = $$props.styles);
		if ('showToggle' in $$props) $$invalidate(3, showToggle = $$props.showToggle);
		if ('passEnter' in $$props) $$invalidate(39, passEnter = $$props.passEnter);
		if ('popupFixed' in $$props) $$invalidate(4, popupFixed = $$props.popupFixed);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty[0] & /*query*/ 1 | $$self.$$.dirty[1] & /*selectedItem*/ 2048) {
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

	return [
		query,
		real,
		styles,
		showToggle,
		popupFixed,
		containerEl,
		inputEl,
		toggleEl,
		popupEl,
		resultEl,
		optionsEl,
		containerId,
		containerName,
		labelId,
		labelText,
		items,
		actualCount,
		tooShort,
		activeId,
		showFetching,
		fetchingMore,
		fetchError,
		popupVisible,
		popupTop,
		popupLeft,
		activeFetch,
		disabled,
		translate,
		handleBlur,
		handleInputKeypress,
		handleInputKeydown,
		handleInputKeyup,
		handleToggleKeydown,
		handleToggleClick,
		handleOptionClick,
		handleResultScroll,
		queryMinLen,
		delay,
		translations,
		passEnter,
		debugMode,
		fetcher,
		selectedItem,
		input_binding,
		input_input_handler,
		button_binding,
		ul_binding,
		div1_binding,
		div2_binding,
		div3_binding
	];
}

class Typeahead extends SvelteComponent {
	constructor(options) {
		super();

		init(
			this,
			options,
			instance,
			create_fragment,
			safe_not_equal,
			{
				real: 1,
				debugMode: 40,
				fetcher: 41,
				queryMinLen: 36,
				query: 0,
				delay: 37,
				translations: 38,
				styles: 2,
				showToggle: 3,
				passEnter: 39,
				popupFixed: 4
			},
			null,
			[-1, -1, -1, -1]
		);
	}
}

export { Typeahead as default };
