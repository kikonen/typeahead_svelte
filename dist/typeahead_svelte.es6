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
    if (value != null || input.value) {
        input.value = value;
    }
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

/* src/typeahead.svelte generated by Svelte v3.22.2 */

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[65] = list[i];
	child_ctx[67] = i;
	return child_ctx;
}

// (653:4) {#if showToggle}
function create_if_block_8(ctx) {
	let div;
	let button;
	let dispose;

	return {
		c() {
			div = element("div");
			button = element("button");
			button.innerHTML = `<i class="text-dark fas fa-caret-down"></i>`;
			attr(button, "class", "btn btn-outline-secondary");
			attr(button, "type", "button");
			attr(button, "tabindex", "-1");
			attr(div, "class", "input-group-append");
		},
		m(target, anchor, remount) {
			insert(target, div, anchor);
			append(div, button);
			/*button_binding*/ ctx[62](button);
			if (remount) run_all(dispose);

			dispose = [
				listen(button, "blur", /*handleBlur*/ ctx[20]),
				listen(button, "keydown", /*handleToggleKeydown*/ ctx[24]),
				listen(button, "click", /*handleToggleClick*/ ctx[25])
			];
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(div);
			/*button_binding*/ ctx[62](null);
			run_all(dispose);
		}
	};
}

// (689:4) {:else}
function create_else_block_1(ctx) {
	let each_1_anchor;
	let each_value = /*items*/ ctx[10];
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	return {
		c() {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			each_1_anchor = empty();
		},
		m(target, anchor) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].m(target, anchor);
			}

			insert(target, each_1_anchor, anchor);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*handleItemKeydown, items, handleBlur, handleItemClick, handleItemKeyup*/ 470811648) {
				each_value = /*items*/ ctx[10];
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}
		},
		d(detaching) {
			destroy_each(each_blocks, detaching);
			if (detaching) detach(each_1_anchor);
		}
	};
}

// (681:32) 
function create_if_block_2(ctx) {
	let div;

	function select_block_type_1(ctx, dirty) {
		if (/*tooShort*/ ctx[12]) return create_if_block_3;
		return create_else_block;
	}

	let current_block_type = select_block_type_1(ctx);
	let if_block = current_block_type(ctx);

	return {
		c() {
			div = element("div");
			if_block.c();
			attr(div, "tabindex", "-1");
			attr(div, "class", "dropdown-item ts-item-info");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			if_block.m(div, null);
		},
		p(ctx, dirty) {
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
		d(detaching) {
			if (detaching) detach(div);
			if_block.d();
		}
	};
}

// (677:43) 
function create_if_block_1(ctx) {
	let div;

	return {
		c() {
			div = element("div");
			div.textContent = `${/*translate*/ ctx[19]("fetching")}`;
			attr(div, "tabindex", "-1");
			attr(div, "class", "dropdown-item ts-item-info");
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

// (673:4) {#if fetchError}
function create_if_block(ctx) {
	let div;
	let t;

	return {
		c() {
			div = element("div");
			t = text(/*fetchError*/ ctx[14]);
			attr(div, "tabindex", "-1");
			attr(div, "class", "dropdown-item text-danger");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, t);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*fetchError*/ 16384) set_data(t, /*fetchError*/ ctx[14]);
		},
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (709:8) {:else}
function create_else_block_2(ctx) {
	let div1;
	let div0;
	let t0_value = (/*item*/ ctx[65].display_text || /*item*/ ctx[65].text) + "";
	let t0;
	let t1;
	let t2;
	let div1_data_index_value;
	let dispose;
	let if_block = /*item*/ ctx[65].desc && create_if_block_7(ctx);

	return {
		c() {
			div1 = element("div");
			div0 = element("div");
			t0 = text(t0_value);
			t1 = space();
			if (if_block) if_block.c();
			t2 = space();
			attr(div0, "class", "ts-item-text");
			attr(div1, "tabindex", "1");
			attr(div1, "class", "dropdown-item ts-item ts-js-item");
			attr(div1, "data-index", div1_data_index_value = /*index*/ ctx[67]);
		},
		m(target, anchor, remount) {
			insert(target, div1, anchor);
			append(div1, div0);
			append(div0, t0);
			append(div1, t1);
			if (if_block) if_block.m(div1, null);
			append(div1, t2);
			if (remount) run_all(dispose);

			dispose = [
				listen(div1, "blur", /*handleBlur*/ ctx[20]),
				listen(div1, "click", /*handleItemClick*/ ctx[28]),
				listen(div1, "keydown", /*handleItemKeydown*/ ctx[26]),
				listen(div1, "keyup", /*handleItemKeyup*/ ctx[27])
			];
		},
		p(ctx, dirty) {
			if (dirty[0] & /*items*/ 1024 && t0_value !== (t0_value = (/*item*/ ctx[65].display_text || /*item*/ ctx[65].text) + "")) set_data(t0, t0_value);

			if (/*item*/ ctx[65].desc) {
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
		d(detaching) {
			if (detaching) detach(div1);
			if (if_block) if_block.d();
			run_all(dispose);
		}
	};
}

// (697:52) 
function create_if_block_5(ctx) {
	let div1;
	let div0;
	let t0_value = (/*item*/ ctx[65].display_text || /*item*/ ctx[65].text) + "";
	let t0;
	let t1;
	let t2;
	let dispose;
	let if_block = /*item*/ ctx[65].desc && create_if_block_6(ctx);

	return {
		c() {
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
		m(target, anchor, remount) {
			insert(target, div1, anchor);
			append(div1, div0);
			append(div0, t0);
			append(div1, t1);
			if (if_block) if_block.m(div1, null);
			append(div1, t2);
			if (remount) dispose();
			dispose = listen(div1, "keydown", /*handleItemKeydown*/ ctx[26]);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*items*/ 1024 && t0_value !== (t0_value = (/*item*/ ctx[65].display_text || /*item*/ ctx[65].text) + "")) set_data(t0, t0_value);

			if (/*item*/ ctx[65].desc) {
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
		d(detaching) {
			if (detaching) detach(div1);
			if (if_block) if_block.d();
			dispose();
		}
	};
}

// (691:8) {#if item.separator}
function create_if_block_4(ctx) {
	let div;
	let div_data_index_value;
	let dispose;

	return {
		c() {
			div = element("div");
			attr(div, "tabindex", "-1");
			attr(div, "class", "dropdown-divider ts-js-dead");
			attr(div, "data-index", div_data_index_value = /*index*/ ctx[67]);
		},
		m(target, anchor, remount) {
			insert(target, div, anchor);
			if (remount) dispose();
			dispose = listen(div, "keydown", /*handleItemKeydown*/ ctx[26]);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(div);
			dispose();
		}
	};
}

// (719:12) {#if item.desc}
function create_if_block_7(ctx) {
	let div;
	let t_value = /*item*/ ctx[65].desc + "";
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
			if (dirty[0] & /*items*/ 1024 && t_value !== (t_value = /*item*/ ctx[65].desc + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (703:12) {#if item.desc}
function create_if_block_6(ctx) {
	let div;
	let t_value = /*item*/ ctx[65].desc + "";
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
			if (dirty[0] & /*items*/ 1024 && t_value !== (t_value = /*item*/ ctx[65].desc + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (690:6) {#each items as item, index}
function create_each_block(ctx) {
	let if_block_anchor;

	function select_block_type_2(ctx, dirty) {
		if (/*item*/ ctx[65].separator) return create_if_block_4;
		if (/*item*/ ctx[65].disabled || /*item*/ ctx[65].placeholder) return create_if_block_5;
		return create_else_block_2;
	}

	let current_block_type = select_block_type_2(ctx);
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
		d(detaching) {
			if_block.d(detaching);
			if (detaching) detach(if_block_anchor);
		}
	};
}

// (685:8) {:else}
function create_else_block(ctx) {
	let t_value = /*translate*/ ctx[19]("no_results") + "";
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

// (683:8) {#if tooShort }
function create_if_block_3(ctx) {
	let t_value = /*translate*/ ctx[19]("too_short") + "";
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
	let div2;
	let div0;
	let input;
	let input_data_target_value;
	let input_placeholder_value;
	let t0;
	let t1;
	let div1;
	let div2_class_value;
	let dispose;
	let if_block0 = /*showToggle*/ ctx[3] && create_if_block_8(ctx);

	function select_block_type(ctx, dirty) {
		if (/*fetchError*/ ctx[14]) return create_if_block;
		if (/*activeFetch*/ ctx[18] && !/*fetchingMore*/ ctx[13]) return create_if_block_1;
		if (/*actualCount*/ ctx[11] === 0) return create_if_block_2;
		return create_else_block_1;
	}

	let current_block_type = select_block_type(ctx);
	let if_block1 = current_block_type(ctx);

	return {
		c() {
			div2 = element("div");
			div0 = element("div");
			input = element("input");
			t0 = space();
			if (if_block0) if_block0.c();
			t1 = space();
			div1 = element("div");
			if_block1.c();
			attr(input, "class", "form-control ts-input");
			attr(input, "autocomplete", "new-password");
			attr(input, "autocorrect", "off");
			attr(input, "autocapitalize", "off");
			attr(input, "spellcheck", "off");
			attr(input, "data-target", input_data_target_value = /*real*/ ctx[0].id);
			attr(input, "placeholder", input_placeholder_value = /*real*/ ctx[0].placeholder);
			attr(div0, "class", "input-group");
			attr(div1, "class", "dropdown-menu ts-popup");
			attr(div1, "tabindex", "-1");
			toggle_class(div1, "show", /*popupVisible*/ ctx[15]);
			toggle_class(div1, "ss-popup-top", /*popupTop*/ ctx[16]);
			toggle_class(div1, "ss-popup-left", /*popupLeft*/ ctx[17]);
			attr(div2, "class", div2_class_value = "form-control ts-container " + /*styles*/ ctx[2].container_class);
			attr(div2, "id", /*containerId*/ ctx[8]);
			attr(div2, "name", /*containerName*/ ctx[9]);
		},
		m(target, anchor, remount) {
			insert(target, div2, anchor);
			append(div2, div0);
			append(div0, input);
			/*input_binding*/ ctx[60](input);
			set_input_value(input, /*query*/ ctx[1]);
			append(div0, t0);
			if (if_block0) if_block0.m(div0, null);
			append(div2, t1);
			append(div2, div1);
			if_block1.m(div1, null);
			/*div1_binding*/ ctx[63](div1);
			/*div2_binding*/ ctx[64](div2);
			if (remount) run_all(dispose);

			dispose = [
				listen(input, "input", /*input_input_handler*/ ctx[61]),
				listen(input, "blur", /*handleBlur*/ ctx[20]),
				listen(input, "keypress", /*handleInputKeypress*/ ctx[21]),
				listen(input, "keydown", /*handleInputKeydown*/ ctx[22]),
				listen(input, "keyup", /*handleInputKeyup*/ ctx[23]),
				listen(div1, "scroll", /*handlePopupScroll*/ ctx[29])
			];
		},
		p(ctx, dirty) {
			if (dirty[0] & /*real*/ 1 && input_data_target_value !== (input_data_target_value = /*real*/ ctx[0].id)) {
				attr(input, "data-target", input_data_target_value);
			}

			if (dirty[0] & /*real*/ 1 && input_placeholder_value !== (input_placeholder_value = /*real*/ ctx[0].placeholder)) {
				attr(input, "placeholder", input_placeholder_value);
			}

			if (dirty[0] & /*query*/ 2 && input.value !== /*query*/ ctx[1]) {
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

			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block1) {
				if_block1.p(ctx, dirty);
			} else {
				if_block1.d(1);
				if_block1 = current_block_type(ctx);

				if (if_block1) {
					if_block1.c();
					if_block1.m(div1, null);
				}
			}

			if (dirty[0] & /*popupVisible*/ 32768) {
				toggle_class(div1, "show", /*popupVisible*/ ctx[15]);
			}

			if (dirty[0] & /*popupTop*/ 65536) {
				toggle_class(div1, "ss-popup-top", /*popupTop*/ ctx[16]);
			}

			if (dirty[0] & /*popupLeft*/ 131072) {
				toggle_class(div1, "ss-popup-left", /*popupLeft*/ ctx[17]);
			}

			if (dirty[0] & /*styles*/ 4 && div2_class_value !== (div2_class_value = "form-control ts-container " + /*styles*/ ctx[2].container_class)) {
				attr(div2, "class", div2_class_value);
			}

			if (dirty[0] & /*containerId*/ 256) {
				attr(div2, "id", /*containerId*/ ctx[8]);
			}

			if (dirty[0] & /*containerName*/ 512) {
				attr(div2, "name", /*containerName*/ ctx[9]);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div2);
			/*input_binding*/ ctx[60](null);
			if (if_block0) if_block0.d();
			if_block1.d();
			/*div1_binding*/ ctx[63](null);
			/*div2_binding*/ ctx[64](null);
			run_all(dispose);
		}
	};
}

const I18N_DEFAULTS = {
	fetching: "Searching..",
	no_results: "No results",
	too_short: "Too short",
	fetching_more: "Searching more..."
};

const STYLE_DEFAULTS = { container_class: "" };

function hasModifier(event) {
	return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
}

function nop() {
	
}

////////////////////////////////////////////////////////////
//
function handleEvent(code, handlers, event) {
	(handlers[code] || handlers.base)(event);
}

function instance($$self, $$props, $$invalidate) {
	let { real } = $$props;
	let { fetcher } = $$props;
	let { queryMinLen = 1 } = $$props;
	let { query } = $$props;
	let { delay = 200 } = $$props;
	let { translations = {} } = $$props;
	let { styles = {} } = $$props;
	let { showToggle = true } = $$props;
	let containerEl;
	let inputEl;
	let toggleEl;
	let popupEl;
	let containerId = null;
	let containerName = null;
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
	let fetched = false;
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
			$$invalidate(13, fetchingMore = true);
		} else {
			$$invalidate(10, items = []);
			offsetCount = 0;
			$$invalidate(11, actualCount = 0);
			hasMore = false;
			fetched = false;
			$$invalidate(13, fetchingMore = false);
		}

		$$invalidate(14, fetchError = null);
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

				$$invalidate(10, items = newItems);
				resolveItems(items);
				hasMore = info.more && offsetCount > 0;
				$$invalidate(12, tooShort = info.too_short === true);
				previousQuery = currentQuery;
				$$invalidate(18, activeFetch = null);
				fetched = true;
				$$invalidate(13, fetchingMore = false);
			} //         } else {
			//             console.debug("ABORT fetch: " + currentQuery);
		}).catch(function (err) {
			if (currentFetch === activeFetch) {
				console.error(err);
				$$invalidate(14, fetchError = err);
				$$invalidate(10, items = []);
				offsetCount = 0;
				$$invalidate(11, actualCount = 0);
				hasMore = false;
				$$invalidate(12, tooShort = false);
				previousQuery = null;
				$$invalidate(18, activeFetch = null);
				fetched = false;
				$$invalidate(13, fetchingMore = false);
				inputEl.focus();
				openPopup();
			}
		});

		$$invalidate(18, activeFetch = currentFetch);
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
		$$invalidate(11, actualCount = act);
	}

	function cancelFetch() {
		if (activeFetch !== null) {
			$$invalidate(18, activeFetch = null);

			// no result fetched; since it doesn't match input any longer
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
		$$invalidate(15, popupVisible = false);

		if (focusInput) {
			inputEl.focus();
		}
	}

	function openPopup() {
		if (!popupVisible) {
			$$invalidate(15, popupVisible = true);
			let w = containerEl.offsetWidth;
			$$invalidate(7, popupEl.style.minWidth = w + "px", popupEl);
			let bounds = containerEl.getBoundingClientRect();
			let middleY = window.innerHeight / 2;
			let middleX = window.innerWidth / 2;
			$$invalidate(16, popupTop = bounds.y > middleY);
			$$invalidate(17, popupLeft = bounds.x + bounds.width > middleX);
		}
	}

	function selectItem(el) {
		let item = items[el.dataset.index];

		if (item) {
			$$invalidate(39, selectedItem = item);
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

	function setupComponent() {
		real.classList.add("ts-real-hidden");
		real.setAttribute("tabindex", "-1");
		let ds = real.dataset;
		$$invalidate(8, containerId = real.id ? `ts_container_${real.id}` : null);
		$$invalidate(9, containerName = real.name ? `ts_container_${real.name}` : null);

		$$invalidate(30, queryMinLen = ds.tsQueryMinLen != undefined
		? parseInt(ds.tsQueryMinLen, 10)
		: queryMinLen);

		$$invalidate(1, query = ds.tsQuery != undefined ? ds.tsQuery : query);

		$$invalidate(31, delay = ds.tsDelay != undefined
		? parseInt(ds.tsDelay, 10)
		: delay);

		$$invalidate(3, showToggle = ds.tsShowToggle != undefined
		? ds.tsShowToggle !== "false"
		: showToggle);

		$$invalidate(32, translations = Object.assign({}, I18N_DEFAULTS, translations || {}));
		$$invalidate(2, styles = Object.assign({}, STYLE_DEFAULTS, styles || {}));
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
			$$invalidate(39, selectedItem = null);
		}
	};

	let inputKeydownHandlers = {
		base(event) {
			wasDown = true;
		},
		ArrowDown(event) {
			let item = popupVisible
			? popupEl.querySelectorAll(".ts-js-item")[0]
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

	let toggleKeydownHandlers = {
		base(event) {
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

	let itemKeydownHandlers = {
		base(event) {
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
			event.preventDefault();
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

	let itemKeyupHandlers = {
		base: nop,
		// allow "meta" keys to navigate in items
		PageUp(event) {
			let scrollLeft = document.body.scrollLeft;
			let scrollTop = document.body.scrollTop;
			let rect = popupEl.getBoundingClientRect();
			let item = document.elementFromPoint(scrollLeft + rect.x + 10, scrollTop + rect.top + 1);

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
		PageDown(event) {
			let scrollLeft = document.body.scrollLeft;
			let scrollTop = document.body.scrollTop;
			let h = popupEl.offsetHeight;
			let rect = popupEl.getBoundingClientRect();
			let item = document.elementFromPoint(scrollLeft + rect.x + 10, scrollTop + rect.top + h - 10);

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
		Home(event) {
			let item = popupEl.querySelector(".ts-js-item:first-child");

			if (item) {
				item.focus();
			}

			event.preventDefault();
		},
		End(event) {
			let item = popupEl.querySelector(".ts-js-item:last-child");

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
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			$$invalidate(5, inputEl = $$value);
		});
	}

	function input_input_handler() {
		query = this.value;
		$$invalidate(1, query);
	}

	function button_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			$$invalidate(6, toggleEl = $$value);
		});
	}

	function div1_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			$$invalidate(7, popupEl = $$value);
		});
	}

	function div2_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			$$invalidate(4, containerEl = $$value);
		});
	}

	$$self.$set = $$props => {
		if ("real" in $$props) $$invalidate(0, real = $$props.real);
		if ("fetcher" in $$props) $$invalidate(33, fetcher = $$props.fetcher);
		if ("queryMinLen" in $$props) $$invalidate(30, queryMinLen = $$props.queryMinLen);
		if ("query" in $$props) $$invalidate(1, query = $$props.query);
		if ("delay" in $$props) $$invalidate(31, delay = $$props.delay);
		if ("translations" in $$props) $$invalidate(32, translations = $$props.translations);
		if ("styles" in $$props) $$invalidate(2, styles = $$props.styles);
		if ("showToggle" in $$props) $$invalidate(3, showToggle = $$props.showToggle);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty[0] & /*query*/ 2 | $$self.$$.dirty[1] & /*selectedItem*/ 256) {
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
		containerEl,
		inputEl,
		toggleEl,
		popupEl,
		containerId,
		containerName,
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
		handlePopupScroll,
		queryMinLen,
		delay,
		translations,
		fetcher,
		setupDone,
		offsetCount,
		hasMore,
		previousQuery,
		fetched,
		selectedItem,
		wasDown,
		isSyncToReal,
		fetchItems,
		resolveItems,
		cancelFetch,
		fetchMoreIfneeded,
		closePopup,
		openPopup,
		selectItem,
		containsElement,
		syncFromReal,
		syncToReal,
		setupComponent,
		eventListeners,
		inputKeypressHandlers,
		inputKeydownHandlers,
		inputKeyupHandlers,
		toggleKeydownHandlers,
		itemKeydownHandlers,
		itemKeyupHandlers,
		input_binding,
		input_input_handler,
		button_binding,
		div1_binding,
		div2_binding
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
				fetcher: 33,
				queryMinLen: 30,
				query: 1,
				delay: 31,
				translations: 32,
				styles: 2,
				showToggle: 3
			},
			[-1, -1, -1]
		);
	}
}

export default Typeahead;
