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
    if (text.data !== data)
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
        throw new Error(`Function called outside component initialization`);
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
let flushing = false;
const seen_callbacks = new Set();
function flush() {
    if (flushing)
        return;
    flushing = true;
    do {
        // first, call beforeUpdate functions
        // and update components
        for (let i = 0; i < dirty_components.length; i += 1) {
            const component = dirty_components[i];
            set_current_component(component);
            update(component.$$);
        }
        dirty_components.length = 0;
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
    flushing = false;
    seen_callbacks.clear();
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

const globals = (typeof window !== 'undefined'
    ? window
    : typeof globalThis !== 'undefined'
        ? globalThis
        : global);
function mount_component(component, target, anchor) {
    const { fragment, on_mount, on_destroy, after_update } = component.$$;
    fragment && fragment.m(target, anchor);
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
function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
    const parent_component = current_component;
    set_current_component(component);
    const prop_values = options.props || {};
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
        before_update: [],
        after_update: [],
        context: new Map(parent_component ? parent_component.$$.context : []),
        // everything else
        callbacks: blank_object(),
        dirty
    };
    let ready = false;
    $$.ctx = instance
        ? instance(component, prop_values, (i, ret, ...rest) => {
            const value = rest.length ? rest[0] : ret;
            if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                if ($$.bound[i])
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
        mount_component(component, options.target, options.anchor);
        flush();
    }
    set_current_component(parent_component);
}
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
    $set() {
        // overridden by instance, if it has props
    }
}

/* src/typeahead.svelte generated by Svelte v3.23.2 */

const { window: window_1 } = globals;

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[81] = list[i];
	child_ctx[83] = i;
	return child_ctx;
}

// (840:4) {#if showToggle}
function create_if_block_8(ctx) {
	let div;
	let button;
	let span;
	let t1;
	let i;
	let mounted;
	let dispose;

	return {
		c() {
			div = element("div");
			button = element("button");
			span = element("span");
			span.textContent = `${/*translate*/ ctx[24]("toggle")}`;
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
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, button);
			append(button, span);
			append(button, t1);
			append(button, i);
			/*button_binding*/ ctx[44](button);

			if (!mounted) {
				dispose = [
					listen(button, "blur", /*handleBlur*/ ctx[25]),
					listen(button, "keydown", /*handleToggleKeydown*/ ctx[29]),
					listen(button, "click", /*handleToggleClick*/ ctx[30])
				];

				mounted = true;
			}
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(div);
			/*button_binding*/ ctx[44](null);
			mounted = false;
			run_all(dispose);
		}
	};
}

// (904:10) {:else}
function create_else_block_1(ctx) {
	let li;
	let div;
	let t0_value = (/*item*/ ctx[81].display_text || /*item*/ ctx[81].text) + "";
	let t0;
	let t1;
	let t2;
	let li_data_index_value;
	let mounted;
	let dispose;
	let if_block = /*item*/ ctx[81].desc && create_if_block_7(ctx);

	return {
		c() {
			li = element("li");
			div = element("div");
			t0 = text(t0_value);
			t1 = space();
			if (if_block) if_block.c();
			t2 = space();
			attr(div, "class", "ts-item-text");
			attr(li, "tabindex", "1");
			attr(li, "class", "dropdown-item ts-item ts-js-item");
			attr(li, "data-index", li_data_index_value = /*index*/ ctx[83]);
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
					listen(li, "blur", /*handleBlur*/ ctx[25]),
					listen(li, "click", /*handleItemClick*/ ctx[33]),
					listen(li, "keydown", /*handleItemKeydown*/ ctx[31]),
					listen(li, "keyup", /*handleItemKeyup*/ ctx[32])
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty[0] & /*items*/ 32768 && t0_value !== (t0_value = (/*item*/ ctx[81].display_text || /*item*/ ctx[81].text) + "")) set_data(t0, t0_value);

			if (/*item*/ ctx[81].desc) {
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
		},
		d(detaching) {
			if (detaching) detach(li);
			if (if_block) if_block.d();
			mounted = false;
			run_all(dispose);
		}
	};
}

// (892:54) 
function create_if_block_5(ctx) {
	let li;
	let div;
	let t0_value = (/*item*/ ctx[81].display_text || /*item*/ ctx[81].text) + "";
	let t0;
	let t1;
	let t2;
	let mounted;
	let dispose;
	let if_block = /*item*/ ctx[81].desc && create_if_block_6(ctx);

	return {
		c() {
			li = element("li");
			div = element("div");
			t0 = text(t0_value);
			t1 = space();
			if (if_block) if_block.c();
			t2 = space();
			attr(div, "class", "ts-item-text");
			attr(li, "tabindex", "-1");
			attr(li, "class", "dropdown-item ts-item-disabled ts-js-dead");
		},
		m(target, anchor) {
			insert(target, li, anchor);
			append(li, div);
			append(div, t0);
			append(li, t1);
			if (if_block) if_block.m(li, null);
			append(li, t2);

			if (!mounted) {
				dispose = listen(li, "keydown", /*handleItemKeydown*/ ctx[31]);
				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty[0] & /*items*/ 32768 && t0_value !== (t0_value = (/*item*/ ctx[81].display_text || /*item*/ ctx[81].text) + "")) set_data(t0, t0_value);

			if (/*item*/ ctx[81].desc) {
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
			mounted = false;
			dispose();
		}
	};
}

// (886:10) {#if item.separator}
function create_if_block_4(ctx) {
	let li;
	let li_data_index_value;
	let mounted;
	let dispose;

	return {
		c() {
			li = element("li");
			attr(li, "tabindex", "-1");
			attr(li, "class", "dropdown-divider ts-js-dead");
			attr(li, "data-index", li_data_index_value = /*index*/ ctx[83]);
		},
		m(target, anchor) {
			insert(target, li, anchor);

			if (!mounted) {
				dispose = listen(li, "keydown", /*handleItemKeydown*/ ctx[31]);
				mounted = true;
			}
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(li);
			mounted = false;
			dispose();
		}
	};
}

// (914:14) {#if item.desc}
function create_if_block_7(ctx) {
	let div;
	let t_value = /*item*/ ctx[81].desc + "";
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
			if (dirty[0] & /*items*/ 32768 && t_value !== (t_value = /*item*/ ctx[81].desc + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (898:14) {#if item.desc}
function create_if_block_6(ctx) {
	let div;
	let t_value = /*item*/ ctx[81].desc + "";
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
			if (dirty[0] & /*items*/ 32768 && t_value !== (t_value = /*item*/ ctx[81].desc + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (885:8) {#each items as item, index}
function create_each_block(ctx) {
	let if_block_anchor;

	function select_block_type(ctx, dirty) {
		if (/*item*/ ctx[81].separator) return create_if_block_4;
		if (/*item*/ ctx[81].disabled || /*item*/ ctx[81].placeholder) return create_if_block_5;
		return create_else_block_1;
	}

	let current_block_type = select_block_type(ctx);
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
		d(detaching) {
			if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

// (933:32) 
function create_if_block_2(ctx) {
	let div;

	function select_block_type_2(ctx, dirty) {
		if (/*tooShort*/ ctx[17]) return create_if_block_3;
		return create_else_block;
	}

	let current_block_type = select_block_type_2(ctx);
	let if_block = current_block_type(ctx);

	return {
		c() {
			div = element("div");
			if_block.c();
			attr(div, "tabindex", "-1");
			attr(div, "class", "dropdown-item ts-item-muted ts-message-item");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			if_block.m(div, null);
		},
		p(ctx, dirty) {
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
		d(detaching) {
			if (detaching) detach(div);
			if_block.d();
		}
	};
}

// (929:43) 
function create_if_block_1(ctx) {
	let div;

	return {
		c() {
			div = element("div");
			div.textContent = `${/*translate*/ ctx[24]("fetching")}`;
			attr(div, "tabindex", "-1");
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

// (925:4) {#if fetchError}
function create_if_block(ctx) {
	let div;
	let t;

	return {
		c() {
			div = element("div");
			t = text(/*fetchError*/ ctx[19]);
			attr(div, "tabindex", "-1");
			attr(div, "class", "dropdown-item text-danger ts-message-item");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, t);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*fetchError*/ 524288) set_data(t, /*fetchError*/ ctx[19]);
		},
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (937:8) {:else}
function create_else_block(ctx) {
	let t_value = /*translate*/ ctx[24]("no_results") + "";
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

// (935:8) {#if tooShort }
function create_if_block_3(ctx) {
	let t_value = /*translate*/ ctx[24]("too_short") + "";
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
	let input_aria_controls_value;
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

	function select_block_type_1(ctx, dirty) {
		if (/*fetchError*/ ctx[19]) return create_if_block;
		if (/*activeFetch*/ ctx[23] && !/*fetchingMore*/ ctx[18]) return create_if_block_1;
		if (/*actualCount*/ ctx[16] === 0) return create_if_block_2;
	}

	let current_block_type = select_block_type_1(ctx);
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
			attr(input, "type", "search");
			attr(input, "role", "searchbox");
			attr(input, "aria-labelledby", /*labelId*/ ctx[13]);
			attr(input, "aria-label", /*labelText*/ ctx[14]);
			attr(input, "aria-expanded", /*popupVisible*/ ctx[20]);
			attr(input, "aria-haspopup", "listbox");
			attr(input, "aria-controls", input_aria_controls_value = "" + (/*containerId*/ ctx[11] + "_items"));
			attr(input, "data-target", input_data_target_value = /*real*/ ctx[0].id);
			attr(input, "placeholder", input_placeholder_value = /*real*/ ctx[0].placeholder);
			attr(div0, "class", "input-group");
			attr(ul, "class", "ts-item-list");
			attr(ul, "id", ul_id_value = "" + (/*containerId*/ ctx[11] + "_items"));
			attr(ul, "role", "listbox");
			attr(ul, "aria-expanded", /*popupVisible*/ ctx[20]);
			attr(ul, "aria-hidden", "false");
			attr(div1, "class", "ts-result");
			attr(div2, "class", "dropdown-menu ts-popup");
			attr(div2, "aria-hidden", div2_aria_hidden_value = !/*popupVisible*/ ctx[20]);
			attr(div2, "id", div2_id_value = "" + (/*containerId*/ ctx[11] + "_popup"));
			attr(div2, "tabindex", "-1");
			toggle_class(div2, "show", /*popupVisible*/ ctx[20]);
			toggle_class(div2, "ss-popup-fixed", /*popupFixed*/ ctx[4]);
			toggle_class(div2, "ss-popup-top", /*popupTop*/ ctx[21] && !/*popupFixed*/ ctx[4]);
			toggle_class(div2, "ss-popup-left", /*popupLeft*/ ctx[22] && !/*popupFixed*/ ctx[4]);
			toggle_class(div2, "ss-popup-fixed-top", /*popupTop*/ ctx[21] && /*popupFixed*/ ctx[4]);
			toggle_class(div2, "ss-popup-fixed-left", /*popupLeft*/ ctx[22] && /*popupFixed*/ ctx[4]);
			attr(div3, "class", div3_class_value = "form-control ts-container " + /*styles*/ ctx[2].container_class);
			attr(div3, "id", /*containerId*/ ctx[11]);
			attr(div3, "name", /*containerName*/ ctx[12]);
		},
		m(target, anchor) {
			insert(target, div3, anchor);
			append(div3, div0);
			append(div0, input);
			/*input_binding*/ ctx[42](input);
			set_input_value(input, /*query*/ ctx[1]);
			append(div0, t0);
			if (if_block0) if_block0.m(div0, null);
			append(div3, t1);
			append(div3, div2);
			append(div2, div1);
			append(div1, ul);

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(ul, null);
			}

			/*ul_binding*/ ctx[45](ul);
			/*div1_binding*/ ctx[46](div1);
			append(div2, t2);
			if (if_block1) if_block1.m(div2, null);
			/*div2_binding*/ ctx[47](div2);
			/*div3_binding*/ ctx[48](div3);

			if (!mounted) {
				dispose = [
					listen(window_1, "scroll", /*handleWindowScroll*/ ctx[35]),
					listen(input, "input", /*input_input_handler*/ ctx[43]),
					listen(input, "blur", /*handleBlur*/ ctx[25]),
					listen(input, "keypress", /*handleInputKeypress*/ ctx[26]),
					listen(input, "keydown", /*handleInputKeydown*/ ctx[27]),
					listen(input, "keyup", /*handleInputKeyup*/ ctx[28]),
					listen(div1, "scroll", /*handleResultScroll*/ ctx[34])
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty[0] & /*labelId*/ 8192) {
				attr(input, "aria-labelledby", /*labelId*/ ctx[13]);
			}

			if (dirty[0] & /*labelText*/ 16384) {
				attr(input, "aria-label", /*labelText*/ ctx[14]);
			}

			if (dirty[0] & /*popupVisible*/ 1048576) {
				attr(input, "aria-expanded", /*popupVisible*/ ctx[20]);
			}

			if (dirty[0] & /*containerId*/ 2048 && input_aria_controls_value !== (input_aria_controls_value = "" + (/*containerId*/ ctx[11] + "_items"))) {
				attr(input, "aria-controls", input_aria_controls_value);
			}

			if (dirty[0] & /*real*/ 1 && input_data_target_value !== (input_data_target_value = /*real*/ ctx[0].id)) {
				attr(input, "data-target", input_data_target_value);
			}

			if (dirty[0] & /*real*/ 1 && input_placeholder_value !== (input_placeholder_value = /*real*/ ctx[0].placeholder)) {
				attr(input, "placeholder", input_placeholder_value);
			}

			if (dirty[0] & /*query*/ 2) {
				set_input_value(input, /*query*/ ctx[1]);
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

			if (dirty[0] & /*items, handleBlur*/ 33587200 | dirty[1] & /*handleItemKeydown, handleItemClick, handleItemKeyup*/ 7) {
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

			if (dirty[0] & /*popupVisible*/ 1048576) {
				attr(ul, "aria-expanded", /*popupVisible*/ ctx[20]);
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

			if (dirty[0] & /*popupVisible*/ 1048576 && div2_aria_hidden_value !== (div2_aria_hidden_value = !/*popupVisible*/ ctx[20])) {
				attr(div2, "aria-hidden", div2_aria_hidden_value);
			}

			if (dirty[0] & /*containerId*/ 2048 && div2_id_value !== (div2_id_value = "" + (/*containerId*/ ctx[11] + "_popup"))) {
				attr(div2, "id", div2_id_value);
			}

			if (dirty[0] & /*popupVisible*/ 1048576) {
				toggle_class(div2, "show", /*popupVisible*/ ctx[20]);
			}

			if (dirty[0] & /*popupFixed*/ 16) {
				toggle_class(div2, "ss-popup-fixed", /*popupFixed*/ ctx[4]);
			}

			if (dirty[0] & /*popupTop, popupFixed*/ 2097168) {
				toggle_class(div2, "ss-popup-top", /*popupTop*/ ctx[21] && !/*popupFixed*/ ctx[4]);
			}

			if (dirty[0] & /*popupLeft, popupFixed*/ 4194320) {
				toggle_class(div2, "ss-popup-left", /*popupLeft*/ ctx[22] && !/*popupFixed*/ ctx[4]);
			}

			if (dirty[0] & /*popupTop, popupFixed*/ 2097168) {
				toggle_class(div2, "ss-popup-fixed-top", /*popupTop*/ ctx[21] && /*popupFixed*/ ctx[4]);
			}

			if (dirty[0] & /*popupLeft, popupFixed*/ 4194320) {
				toggle_class(div2, "ss-popup-fixed-left", /*popupLeft*/ ctx[22] && /*popupFixed*/ ctx[4]);
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
			/*input_binding*/ ctx[42](null);
			if (if_block0) if_block0.d();
			destroy_each(each_blocks, detaching);
			/*ul_binding*/ ctx[45](null);
			/*div1_binding*/ ctx[46](null);

			if (if_block1) {
				if_block1.d();
			}

			/*div2_binding*/ ctx[47](null);
			/*div3_binding*/ ctx[48](null);
			mounted = false;
			run_all(dispose);
		}
	};
}

const I18N_DEFAULTS = {
	fetching: "Searching..",
	no_results: "No results",
	too_short: "Too short",
	toggle: "Toggle popup",
	fetching_more: "Searching more..."
};

const STYLE_DEFAULTS = { container_class: "" };

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
	let itemsEl;
	let containerId = null;
	let containerName = null;
	let labelId = null;
	let labelText = null;
	let resizeObserver = null;
	let setupDone = false;
	let items = [];
	let offsetCount = 0;
	let actualCount = 0;
	let hasMore = false;
	let tooShort = false;
	let fetchingMore = false;
	let fetchError = null;
	let popupVisible = false;
	let popupTop = false;
	let popupLeft = false;
	let activeFetch = null;
	let previousQuery = null;
	let selectedItem = null;
	let wasDown = false;
	let isSyncToReal = false;

	////////////////////////////////////////////////////////////
	// Utils
	function translate(key) {
		return translations[key];
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
			$$invalidate(18, fetchingMore = true);
		} else {
			$$invalidate(15, items = []);
			offsetCount = 0;
			$$invalidate(16, actualCount = 0);
			hasMore = false;
			$$invalidate(18, fetchingMore = false);
		}

		$$invalidate(19, fetchError = null);
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
				$$invalidate(23, activeFetch = null);
				$$invalidate(18, fetchingMore = false);
			} //         } else {
			//             console.debug("ABORT fetch: " + currentQuery);
		}).catch(function (err) {
			if (currentFetch === activeFetch) {
				console.error(err);
				$$invalidate(19, fetchError = err);
				$$invalidate(15, items = []);
				offsetCount = 0;
				$$invalidate(16, actualCount = 0);
				hasMore = false;
				$$invalidate(17, tooShort = false);
				previousQuery = null;
				$$invalidate(23, activeFetch = null);
				$$invalidate(18, fetchingMore = false);
				inputEl.focus();
				openPopup();
			}
		});

		$$invalidate(23, activeFetch = currentFetch);
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
			$$invalidate(23, activeFetch = null);

			previousQuery = null;
		}
	}

	function fetchMoreIfneeded() {
		if (hasMore && !fetchingMore && popupVisible) {
			let lastItem = itemsEl.querySelector(".ts-item:last-child");

			if (resultEl.scrollTop + resultEl.clientHeight >= resultEl.scrollHeight - lastItem.clientHeight * 2 - 2) {
				fetchItems(true);
			}
		}
	}

	function closePopup(focusInput) {
		$$invalidate(20, popupVisible = false);

		if (focusInput) {
			inputEl.focus();
		}
	}

	function openPopup() {
		if (!popupVisible) {
			$$invalidate(20, popupVisible = true);
			let w = containerEl.offsetWidth;
			$$invalidate(8, popupEl.style.minWidth = w + "px", popupEl);
			updatePopupPosition();
		}
	}

	function selectItem(el) {
		let item = items[el.dataset.index];

		if (item) {
			$$invalidate(55, selectedItem = item);
			let changed = item.text !== query;
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
			real.dispatchEvent(new CustomEvent("typeahead-select", { detail: item }));
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

		let realValue = real.value;

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
		let ds = real.dataset;
		let baseId = real.id || nextUID();
		$$invalidate(11, containerId = `ts_container_${baseId}`);
		$$invalidate(12, containerName = real.name ? `ts_container_${real.name}` : null);
		bindLabel();

		$$invalidate(36, queryMinLen = ds.tsQueryMinLen !== undefined
		? parseInt(ds.tsQueryMinLen, 10)
		: queryMinLen);

		$$invalidate(1, query = ds.tsQuery !== undefined ? ds.tsQuery : query);

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
			$$invalidate(14, labelText = real.getAttribute("aria-label") || null);
		}
	}

	function handleResize(resizeList, observer) {
		updatePopupPosition();
	}

	function updatePopupPosition() {
		if (!popupVisible) {
			return;
		}

		let bounds = containerEl.getBoundingClientRect();
		let middleY = window.innerHeight / 2;
		let middleX = window.innerWidth / 2;
		$$invalidate(21, popupTop = bounds.y > middleY);
		$$invalidate(22, popupLeft = bounds.x + bounds.width > middleX);

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
		"focus"(event) {
			inputEl.focus();
		}
	};

	////////////////////////////////////////////////////////////
	//
	let inputKeypressHandlers = {
		base(event) {
			$$invalidate(55, selectedItem = null);
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
				closePopup(false);

				if (!passEnter) {
					event.preventDefault();
				}
			}
		},
		ArrowDown(event) {
			let item = popupVisible
			? itemsEl.querySelectorAll(".ts-js-item")[0]
			: null;

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
		ArrowUp(event) {
			// NOTE KI closing popup here is *irritating* i.e. if one is trying to select
			// first item in dropdown
			event.preventDefault();
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

			inputEl.focus();
		},
		ArrowDown: inputKeydownHandlers.ArrowDown,
		ArrowUp: inputKeydownHandlers.ArrowDown,
		Escape(event) {
			cancelFetch();
			closePopup(false);
			inputEl.focus();
		},
		Tab(event) {
			inputEl.focus();
		}
	};

	function blockScrollUpIfNeeded(event) {
		if (resultEl.scrollTop === 0) {
			event.preventDefault();
		}
	}

	function blockScrollDownIfNeeded(event) {
		if (fetchingMore) {
			event.preventDefault();
			return;
		}

		let resultRect = resultEl.getBoundingClientRect();

		if (Math.ceil(resultEl.scrollTop + resultRect.height) >= resultEl.scrollHeight) {
			event.preventDefault();
		}
	}

	let itemKeydownHandlers = {
		base(event) {
			if (isMetaKey(event)) {
				return;
			}

			wasDown = true;
			inputEl.focus();
		},
		ArrowDown(event) {
			let next = event.target.nextElementSibling;

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
		ArrowUp(event) {
			let next = event.target.previousElementSibling;

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
		Enter(event) {
			selectItem(event.target);

			if (!passEnter) {
				event.preventDefault();
			}
		},
		Escape(event) {
			cancelFetch();
			closePopup(true);
		},
		Tab(event) {
			inputEl.focus();
			event.preventDefault();
		},
		// allow "meta" keys to navigate in items
		PageUp(event) {
			blockScrollUpIfNeeded(event);
		},
		PageDown(event) {
			blockScrollDownIfNeeded(event);
		},
		Home(event) {
			blockScrollUpIfNeeded(event);
		},
		End(event) {
			blockScrollDownIfNeeded(event);
		},
		// disallow modifier keys to trigger search
		Control: nop,
		Shift: nop,
		AltGraph: nop,
		Meta: nop,
		ContextMenu: nop
	};

	let itemKeyupHandlers = {
		base: nop,
		// allow "meta" keys to navigate in items
		PageUp(event) {
			let scrollLeft = document.body.scrollLeft;
			let scrollTop = document.body.scrollTop;
			let rect = resultEl.getBoundingClientRect();
			let item = document.elementFromPoint(scrollLeft + rect.x + 10, scrollTop + rect.top + 1);

			if (!item) {
				item = itemsEl.querySelector(".ts-js-item:first-child");
			} else {
				if (!item.classList.contains("ts-js-item")) {
					item = itemsEl.querySelector(".ts-js-item:first-child");
				}
			}

			if (item) {
				item.focus();
			}

			event.preventDefault();
		},
		PageDown(event) {
			let scrollLeft = document.body.scrollLeft;
			let scrollTop = document.body.scrollTop;
			let h = resultEl.offsetHeight;
			let rect = resultEl.getBoundingClientRect();
			let item = document.elementFromPoint(scrollLeft + rect.x + 10, scrollTop + rect.top + h - 10);

			if (!item) {
				item = itemsEl.querySelector(".ts-js-item:last-child");
			} else {
				if (!item.classList.contains("ts-js-item")) {
					item = itemsEl.querySelector(".ts-js-item:last-child");
				}
			}

			if (item) {
				item.focus();
			}

			event.preventDefault();
		},
		Home(event) {
			let item = itemsEl.querySelector(".ts-js-item:first-child");

			if (item) {
				item.focus();
			}

			event.preventDefault();
		},
		End(event) {
			let item = itemsEl.querySelector(".ts-js-item:last-child");

			if (item) {
				item.focus();
			}

			event.preventDefault();
		}
	};

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

	function handleResultScroll(event) {
		fetchMoreIfneeded();
	}

	function handleWindowScroll(event) {
		updatePopupPosition();
	}

	function input_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			inputEl = $$value;
			$$invalidate(6, inputEl);
		});
	}

	function input_input_handler() {
		query = this.value;
		$$invalidate(1, query);
	}

	function button_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			toggleEl = $$value;
			$$invalidate(7, toggleEl);
		});
	}

	function ul_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			itemsEl = $$value;
			$$invalidate(10, itemsEl);
		});
	}

	function div1_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			resultEl = $$value;
			$$invalidate(9, resultEl);
		});
	}

	function div2_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			popupEl = $$value;
			$$invalidate(8, popupEl);
		});
	}

	function div3_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			containerEl = $$value;
			$$invalidate(5, containerEl);
		});
	}

	$$self.$set = $$props => {
		if ("real" in $$props) $$invalidate(0, real = $$props.real);
		if ("debugMode" in $$props) $$invalidate(40, debugMode = $$props.debugMode);
		if ("fetcher" in $$props) $$invalidate(41, fetcher = $$props.fetcher);
		if ("queryMinLen" in $$props) $$invalidate(36, queryMinLen = $$props.queryMinLen);
		if ("query" in $$props) $$invalidate(1, query = $$props.query);
		if ("delay" in $$props) $$invalidate(37, delay = $$props.delay);
		if ("translations" in $$props) $$invalidate(38, translations = $$props.translations);
		if ("styles" in $$props) $$invalidate(2, styles = $$props.styles);
		if ("showToggle" in $$props) $$invalidate(3, showToggle = $$props.showToggle);
		if ("passEnter" in $$props) $$invalidate(39, passEnter = $$props.passEnter);
		if ("popupFixed" in $$props) $$invalidate(4, popupFixed = $$props.popupFixed);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty[0] & /*query*/ 2 | $$self.$$.dirty[1] & /*selectedItem*/ 16777216) {
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
		real,
		query,
		styles,
		showToggle,
		popupFixed,
		containerEl,
		inputEl,
		toggleEl,
		popupEl,
		resultEl,
		itemsEl,
		containerId,
		containerName,
		labelId,
		labelText,
		items,
		actualCount,
		tooShort,
		fetchingMore,
		fetchError,
		popupVisible,
		popupTop,
		popupLeft,
		activeFetch,
		translate,
		handleBlur,
		handleInputKeypress,
		handleInputKeydown,
		handleInputKeyup,
		handleToggleKeydown,
		handleToggleClick,
		handleItemKeydown,
		handleItemKeyup,
		handleItemClick,
		handleResultScroll,
		handleWindowScroll,
		queryMinLen,
		delay,
		translations,
		passEnter,
		debugMode,
		fetcher,
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
				real: 0,
				debugMode: 40,
				fetcher: 41,
				queryMinLen: 36,
				query: 1,
				delay: 37,
				translations: 38,
				styles: 2,
				showToggle: 3,
				passEnter: 39,
				popupFixed: 4
			},
			[-1, -1, -1]
		);
	}
}

export default Typeahead;
