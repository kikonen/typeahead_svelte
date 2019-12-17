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

let current_component;
function set_current_component(component) {
    current_component = component;
}
function get_current_component() {
    if (!current_component)
        throw new Error(`Function called outside component initialization`);
    return current_component;
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
function flush() {
    const seen_callbacks = new Set();
    do {
        // first, call beforeUpdate functions
        // and update components
        while (dirty_components.length) {
            const component = dirty_components.shift();
            set_current_component(component);
            update(component.$$);
        }
        while (binding_callbacks.length)
            binding_callbacks.pop()();
        // then, once components are updated, call
        // afterUpdate functions. This may cause
        // subsequent updates...
        for (let i = 0; i < render_callbacks.length; i += 1) {
            const callback = render_callbacks[i];
            if (!seen_callbacks.has(callback)) {
                callback();
                // ...so guard against infinite loops
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
        $$.fragment && $$.fragment.p($$.ctx, $$.dirty);
        $$.dirty = [-1];
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

const globals = (typeof window !== 'undefined' ? window : global);
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
        ? instance(component, prop_values, (i, ret, value = ret) => {
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
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            $$.fragment && $$.fragment.l(children(options.target));
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

/* src/typeahead.svelte generated by Svelte v3.16.4 */

const { document: document_1 } = globals;

function add_css() {
	var style = element("style");
	style.id = "svelte-1mymqwx-style";
	style.textContent = ".typeahead-svelte-container{position:relative}.typeahead-svelte-popup{max-height:50vh;max-width:90vw;overflow-y:auto}.ki-no-click{pointer-events:none}";
	append(document_1.head, style);
}

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[57] = list[i];
	child_ctx[59] = i;
	return child_ctx;
}

// (639:4) {:else}
function create_else_block_1(ctx) {
	let each_1_anchor;
	let each_value = /*items*/ ctx[8];
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
			if (dirty[0] & /*items, handleItemKeydown, handleBlur, handleItemClick, handleItemKeyup*/ 29425920) {
				each_value = /*items*/ ctx[8];
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

// (631:32) 
function create_if_block_3(ctx) {
	let div;

	function select_block_type_1(ctx, dirty) {
		if (/*tooShort*/ ctx[11]) return create_if_block_4;
		return create_else_block;
	}

	let current_block_type = select_block_type_1(ctx);
	let if_block = current_block_type(ctx);

	return {
		c() {
			div = element("div");
			if_block.c();
			attr(div, "tabindex", "-1");
			attr(div, "class", "dropdown-item text-muted");
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

// (627:43) 
function create_if_block_2(ctx) {
	let div;

	return {
		c() {
			div = element("div");
			div.textContent = `${translate("fetching")}`;
			attr(div, "tabindex", "-1");
			attr(div, "class", "dropdown-item text-muted");
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

// (623:4) {#if fetchError}
function create_if_block_1(ctx) {
	let div;
	let t;

	return {
		c() {
			div = element("div");
			t = text(/*fetchError*/ ctx[13]);
			attr(div, "tabindex", "-1");
			attr(div, "class", "dropdown-item text-danger");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, t);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*fetchError*/ 8192) set_data(t, /*fetchError*/ ctx[13]);
		},
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (659:8) {:else}
function create_else_block_2(ctx) {
	let div1;
	let div0;
	let t0_value = (/*item*/ ctx[57].display_text || /*item*/ ctx[57].text) + "";
	let t0;
	let t1;
	let t2;
	let div1_data_index_value;
	let dispose;
	let if_block = /*item*/ ctx[57].desc && create_if_block_8(ctx);

	return {
		c() {
			div1 = element("div");
			div0 = element("div");
			t0 = text(t0_value);
			t1 = space();
			if (if_block) if_block.c();
			t2 = space();
			attr(div0, "class", "ki-no-click");
			attr(div1, "tabindex", "1");
			attr(div1, "class", "ki-js-item dropdown-item");
			attr(div1, "data-index", div1_data_index_value = /*index*/ ctx[59]);

			dispose = [
				listen(div1, "blur", /*handleBlur*/ ctx[16]),
				listen(div1, "click", /*handleItemClick*/ ctx[24]),
				listen(div1, "keydown", /*handleItemKeydown*/ ctx[22]),
				listen(div1, "keyup", /*handleItemKeyup*/ ctx[23])
			];
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			append(div1, div0);
			append(div0, t0);
			append(div1, t1);
			if (if_block) if_block.m(div1, null);
			append(div1, t2);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*items*/ 256 && t0_value !== (t0_value = (/*item*/ ctx[57].display_text || /*item*/ ctx[57].text) + "")) set_data(t0, t0_value);

			if (/*item*/ ctx[57].desc) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block_8(ctx);
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

// (647:52) 
function create_if_block_6(ctx) {
	let div1;
	let div0;
	let t0_value = (/*item*/ ctx[57].display_text || /*item*/ ctx[57].text) + "";
	let t0;
	let t1;
	let t2;
	let dispose;
	let if_block = /*item*/ ctx[57].desc && create_if_block_7(ctx);

	return {
		c() {
			div1 = element("div");
			div0 = element("div");
			t0 = text(t0_value);
			t1 = space();
			if (if_block) if_block.c();
			t2 = space();
			attr(div0, "class", "ki-no-click");
			attr(div1, "tabindex", "-1");
			attr(div1, "class", "dropdown-item text-muted ki-js-blank");
			dispose = listen(div1, "keydown", /*handleItemKeydown*/ ctx[22]);
		},
		m(target, anchor) {
			insert(target, div1, anchor);
			append(div1, div0);
			append(div0, t0);
			append(div1, t1);
			if (if_block) if_block.m(div1, null);
			append(div1, t2);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*items*/ 256 && t0_value !== (t0_value = (/*item*/ ctx[57].display_text || /*item*/ ctx[57].text) + "")) set_data(t0, t0_value);

			if (/*item*/ ctx[57].desc) {
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
			dispose();
		}
	};
}

// (641:8) {#if item.separator}
function create_if_block_5(ctx) {
	let div;
	let div_data_index_value;
	let dispose;

	return {
		c() {
			div = element("div");
			attr(div, "tabindex", "-1");
			attr(div, "class", "dropdown-divider ki-js-blank");
			attr(div, "data-index", div_data_index_value = /*index*/ ctx[59]);
			dispose = listen(div, "keydown", /*handleItemKeydown*/ ctx[22]);
		},
		m(target, anchor) {
			insert(target, div, anchor);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(div);
			dispose();
		}
	};
}

// (669:12) {#if item.desc}
function create_if_block_8(ctx) {
	let div;
	let t_value = /*item*/ ctx[57].desc + "";
	let t;

	return {
		c() {
			div = element("div");
			t = text(t_value);
			attr(div, "class", "ki-no-click text-muted");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, t);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*items*/ 256 && t_value !== (t_value = /*item*/ ctx[57].desc + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (653:12) {#if item.desc}
function create_if_block_7(ctx) {
	let div;
	let t_value = /*item*/ ctx[57].desc + "";
	let t;

	return {
		c() {
			div = element("div");
			t = text(t_value);
			attr(div, "class", "ki-no-click text-muted");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, t);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*items*/ 256 && t_value !== (t_value = /*item*/ ctx[57].desc + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) detach(div);
		}
	};
}

// (640:6) {#each items as item, index}
function create_each_block(ctx) {
	let if_block_anchor;

	function select_block_type_2(ctx, dirty) {
		if (/*item*/ ctx[57].separator) return create_if_block_5;
		if (/*item*/ ctx[57].disabled || /*item*/ ctx[57].placeholder) return create_if_block_6;
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

// (635:8) {:else}
function create_else_block(ctx) {
	let t_value = translate("no_results") + "";
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

// (633:8) {#if tooShort }
function create_if_block_4(ctx) {
	let t_value = translate("too_short") + "";
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

// (679:4) {#if hasMore}
function create_if_block(ctx) {
	let div;

	return {
		c() {
			div = element("div");
			div.textContent = `${translate("has_more")}`;
			attr(div, "tabindex", "-1");
			attr(div, "class", "dropdown-item text-muted");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			/*div_binding*/ ctx[54](div);
		},
		p: noop,
		d(detaching) {
			if (detaching) detach(div);
			/*div_binding*/ ctx[54](null);
		}
	};
}

function create_fragment(ctx) {
	let div3;
	let div1;
	let input_1;
	let input_1_data_target_value;
	let input_1_placeholder_value;
	let t0;
	let div0;
	let button;
	let t1;
	let div2;
	let t2;
	let div2_class_value;
	let div3_class_value;
	let dispose;

	function select_block_type(ctx, dirty) {
		if (/*fetchError*/ ctx[13]) return create_if_block_1;
		if (/*activeFetch*/ ctx[15] && !/*fetchingMore*/ ctx[12]) return create_if_block_2;
		if (/*actualCount*/ ctx[9] === 0) return create_if_block_3;
		return create_else_block_1;
	}

	let current_block_type = select_block_type(ctx);
	let if_block0 = current_block_type(ctx);
	let if_block1 = /*hasMore*/ ctx[10] && create_if_block(ctx);

	return {
		c() {
			div3 = element("div");
			div1 = element("div");
			input_1 = element("input");
			t0 = space();
			div0 = element("div");
			button = element("button");
			button.innerHTML = `<i class="text-dark fas fa-caret-down"></i>`;
			t1 = space();
			div2 = element("div");
			if_block0.c();
			t2 = space();
			if (if_block1) if_block1.c();
			attr(input_1, "class", "form-control");
			attr(input_1, "autocomplete", "new-password");
			attr(input_1, "autocorrect", "off");
			attr(input_1, "autocapitalize", "off");
			attr(input_1, "spellcheck", "off");
			attr(input_1, "data-target", input_1_data_target_value = /*real*/ ctx[1].id);
			attr(input_1, "placeholder", input_1_placeholder_value = /*real*/ ctx[1].placeholder);
			attr(button, "class", "btn btn-outline-secondary");
			attr(button, "type", "button");
			attr(button, "tabindex", "-1");
			attr(div0, "class", "input-group-append");
			attr(div1, "class", "input-group");
			attr(div2, "class", div2_class_value = "dropdown-menu typeahead-svelte-popup " + (/*popupVisible*/ ctx[14] ? "show" : ""));
			attr(div3, "class", div3_class_value = "form-control p-0 border-0 " + /*extraClass*/ ctx[2]);

			dispose = [
				listen(input_1, "input", /*input_1_input_handler*/ ctx[51]),
				listen(input_1, "blur", /*handleBlur*/ ctx[16]),
				listen(input_1, "keypress", /*handleInputKeypress*/ ctx[17]),
				listen(input_1, "keydown", /*handleInputKeydown*/ ctx[18]),
				listen(input_1, "keyup", /*handleInputKeyup*/ ctx[19]),
				listen(button, "blur", /*handleBlur*/ ctx[16]),
				listen(button, "keydown", /*handleToggleKeydown*/ ctx[20]),
				listen(button, "click", /*handleToggleClick*/ ctx[21]),
				listen(div2, "scroll", /*handlePopupScroll*/ ctx[25])
			];
		},
		m(target, anchor) {
			insert(target, div3, anchor);
			append(div3, div1);
			append(div1, input_1);
			set_input_value(input_1, /*query*/ ctx[0]);
			/*input_1_binding*/ ctx[52](input_1);
			append(div1, t0);
			append(div1, div0);
			append(div0, button);
			/*button_binding*/ ctx[53](button);
			append(div3, t1);
			append(div3, div2);
			if_block0.m(div2, null);
			append(div2, t2);
			if (if_block1) if_block1.m(div2, null);
			/*div2_binding*/ ctx[55](div2);
			/*div3_binding*/ ctx[56](div3);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*real*/ 2 && input_1_data_target_value !== (input_1_data_target_value = /*real*/ ctx[1].id)) {
				attr(input_1, "data-target", input_1_data_target_value);
			}

			if (dirty[0] & /*real*/ 2 && input_1_placeholder_value !== (input_1_placeholder_value = /*real*/ ctx[1].placeholder)) {
				attr(input_1, "placeholder", input_1_placeholder_value);
			}

			if (dirty[0] & /*query*/ 1 && input_1.value !== /*query*/ ctx[0]) {
				set_input_value(input_1, /*query*/ ctx[0]);
			}

			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
				if_block0.p(ctx, dirty);
			} else {
				if_block0.d(1);
				if_block0 = current_block_type(ctx);

				if (if_block0) {
					if_block0.c();
					if_block0.m(div2, t2);
				}
			}

			if (/*hasMore*/ ctx[10]) {
				if (if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1 = create_if_block(ctx);
					if_block1.c();
					if_block1.m(div2, null);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}

			if (dirty[0] & /*popupVisible*/ 16384 && div2_class_value !== (div2_class_value = "dropdown-menu typeahead-svelte-popup " + (/*popupVisible*/ ctx[14] ? "show" : ""))) {
				attr(div2, "class", div2_class_value);
			}

			if (dirty[0] & /*extraClass*/ 4 && div3_class_value !== (div3_class_value = "form-control p-0 border-0 " + /*extraClass*/ ctx[2])) {
				attr(div3, "class", div3_class_value);
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) detach(div3);
			/*input_1_binding*/ ctx[52](null);
			/*button_binding*/ ctx[53](null);
			if_block0.d();
			if (if_block1) if_block1.d();
			/*div2_binding*/ ctx[55](null);
			/*div3_binding*/ ctx[56](null);
			run_all(dispose);
		}
	};
}

const I18N_DEFAULTS = {
	fetching: "Searching..",
	no_results: "No results",
	too_short: "Too short",
	has_more: "More...",
	fetching_more: "Searching more..."
};

const config = { translations: I18N_DEFAULTS };

function translate(key) {
	return config.translations[key] || I18N_DEFAULTS[key];
}

function hasModifier(event) {
	return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
}

function nop() {
	
}

function handleEvent(code, handlers, event) {
	(handlers[code] || handlers.base)(event);
}

function instance($$self, $$props, $$invalidate) {
	let { real } = $$props;
	let { fetcher } = $$props;
	let { queryMinLen = 1 } = $$props;
	let { query } = $$props;
	let { delay = 200 } = $$props;
	let { extraClass = "" } = $$props;
	let container;
	let input;
	let toggle;
	let popup;
	let more;
	let items = [];
	let offsetCount = 0;
	let actualCount = 0;
	let hasMore = false;
	let tooShort = false;
	let fetchingMore = false;
	let fetchError = null;
	let popupVisible = false;
	let activeFetch = null;
	let previousQuery = null;
	let fetched = false;
	let selectedItem = null;
	let wasDown = false;
	let isSyncToReal = false;
	

	function fetchItems(more) {
		let currentQuery = query.trim();

		if (currentQuery.length > 0) {
			currentQuery = query;
		}

		if (!more && !fetchingMore && currentQuery === previousQuery) {
			return;
		}

		cancelFetch();
		let fetchOffset = 0;

		if (more) {
			fetchOffset = offsetCount;
			$$invalidate(12, fetchingMore = true);
		} else {
			$$invalidate(8, items = []);
			offsetCount = 0;
			$$invalidate(9, actualCount = 0);
			$$invalidate(10, hasMore = false);
			fetched = false;
			$$invalidate(12, fetchingMore = false);
		}

		$$invalidate(13, fetchError = null);
		let currentFetchOffset = fetchOffset;
		let currentFetchingMore = fetchingMore;

		let currentFetch = new Promise(function (resolve, reject) {
				if (currentFetchingMore) {
					resolve(fetcher(currentFetchOffset, currentQuery));
				} else {
					if (currentQuery.length < queryMinLen) {
						resolve({
							items: [],
							info: { more: false, too_short: true }
						});
					} else {
						setTimeout(
							function () {
								if (currentFetch === activeFetch) {
									resolve(fetcher(currentFetchOffset, currentQuery));
								} else {
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
				let info = response.info || ({});
				let newItems;

				if (currentFetchingMore) {
					newItems = items;

					fetchedtems.forEach(function (item) {
						newItems.push(item);
					});
				} else {
					newItems = fetchedtems;
				}

				$$invalidate(8, items = newItems);
				resolveItems(items);
				$$invalidate(10, hasMore = info.more && offsetCount > 0);
				$$invalidate(11, tooShort = info.too_short === true);
				previousQuery = currentQuery;
				$$invalidate(15, activeFetch = null);
				fetched = true;
				$$invalidate(12, fetchingMore = false);
			}
		}).catch(function (err) {
			if (currentFetch === activeFetch) {
				console.error(err);
				$$invalidate(13, fetchError = err);
				$$invalidate(8, items = []);
				offsetCount = 0;
				$$invalidate(9, actualCount = 0);
				$$invalidate(10, hasMore = false);
				$$invalidate(11, tooShort = false);
				previousQuery = null;
				$$invalidate(15, activeFetch = null);
				fetched = false;
				$$invalidate(12, fetchingMore = false);
				input.focus();
				openPopup();
			}
		});

		$$invalidate(15, activeFetch = currentFetch);
	}

	function resolveItems(items) {
		let off = 0;
		let act = 0;

		items.forEach(function (item) {
			if (item.id) {
				item.id = item.id.toString();
			}

			if (item.separator) ; else if (item.placeholder) {
				act += 1;
			} else {
				off += 1;
				act += 1;
			}
		});

		offsetCount = off;
		$$invalidate(9, actualCount = act);
	}

	function cancelFetch() {
		if (activeFetch !== null) {
			$$invalidate(15, activeFetch = null);
			fetched = false;
			previousQuery = null;
		}
	}

	function fetchMoreIfneeded() {
		if (hasMore && !fetchingMore) {
			if (popup.scrollTop + popup.clientHeight >= popup.scrollHeight - more.clientHeight * 2 - 2) {
				fetchItems(true);
			}
		}
	}

	function closePopup(focusInput) {
		$$invalidate(14, popupVisible = false);

		if (focusInput) {
			input.focus();
		}
	}

	function openPopup() {
		if (!popupVisible) {
			$$invalidate(14, popupVisible = true);
			let w = container.offsetWidth;
			$$invalidate(6, popup.style.minWidth = w + "px", popup);
		}
	}

	function selectItem(el) {
		let item = items[el.dataset.index];

		if (item) {
			$$invalidate(32, selectedItem = item);
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
			real.dispatchEvent(new CustomEvent("typeahead-select", { detail: item }));
		}
	}

	function containsElement(el) {
		return el === input || el === toggle || popup.contains(el);
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
				real.setAttribute("value", query);
				real.dispatchEvent(new Event("change"));
			} finally {
				isSyncToReal = false;
			}
		}
	}

	onMount(function () {
		$$invalidate(0, query = real.value || "");
		real.classList.add("d-none");

		real.addEventListener("change", function () {
			syncFromReal();
		});
	});

	let inputKeypressHandlers = {
		base(event) {
			$$invalidate(32, selectedItem = null);
		}
	};

	let inputKeydownHandlers = {
		base(event) {
			wasDown = true;
		},
		ArrowDown(event) {
			let item = popupVisible
			? popup.querySelectorAll(".ki-js-item")[0]
			: null;

			if (item) {
				while (item && item.classList.contains("ki-js-blank")) {
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
		ArrowDown: nop,
		ArrowUp: nop,
		ArrowLeft: nop,
		ArrowRight: nop,
		PageDown: nop,
		PageUp: nop,
		Home: nop,
		End: nop,
		Control: nop,
		Shift: nop,
		AltGraph: nop,
		Meta: nop,
		ContextMenu: nop
	};

	let toggleKeydownHandlers = {
		base(event) {
			input.focus();
		},
		ArrowDown: inputKeydownHandlers.ArrowDown,
		ArrowUp: inputKeydownHandlers.ArrowDown,
		Escape(event) {
			cancelFetch();
			closePopup(false);
			input.focus();
		},
		Tab(event) {
			input.focus();
		}
	};

	let itemKeydownHandlers = {
		base(event) {
			input.focus();
		},
		ArrowDown(event) {
			let next = event.target.nextElementSibling;

			if (next) {
				while (next && next.classList.contains("ki-js-blank")) {
					next = next.nextElementSibling;
				}

				if (next && !next.classList.contains("ki-js-item")) {
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
				while (next && next.classList.contains("ki-js-blank")) {
					next = next.previousElementSibling;
				}

				if (next && !next.classList.contains("ki-js-item")) {
					next = null;
				}
			}

			if (next) {
				next.focus();
			} else {
				input.focus();
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
		PageUp: nop,
		PageDown: nop,
		Home: nop,
		End: nop,
		Control: nop,
		Shift: nop,
		AltGraph: nop,
		Meta: nop,
		ContextMenu: nop
	};

	let itemKeyupHandlers = {
		base: nop,
		PageUp(event) {
			let scrollLeft = document.body.scrollLeft;
			let scrollTop = document.body.scrollTop;
			let rect = popup.getBoundingClientRect();
			let item = document.elementFromPoint(scrollLeft + rect.x + 10, scrollTop + rect.top + 1);

			if (!item) {
				item = popup.querySelector(".ki-js-item:first-child");
			} else {
				if (!item.classList.contains("ki-js-item")) {
					item = popup.querySelector(".ki-js-item:first-child");
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
			let h = popup.offsetHeight;
			let rect = popup.getBoundingClientRect();
			let item = document.elementFromPoint(scrollLeft + rect.x + 10, scrollTop + rect.top + h - 10);

			if (!item) {
				item = popup.querySelector(".ki-js-item:last-child");
			} else {
				if (!item.classList.contains("ki-js-item")) {
					item = popup.querySelector(".ki-js-item:last-child");
				}
			}

			if (item) {
				item.focus();
			}

			event.preventDefault();
		},
		Home(event) {
			let item = popup.querySelector(".ki-js-item:first-child");

			if (item) {
				item.focus();
			}

			event.preventDefault();
		},
		End(event) {
			let item = popup.querySelector(".ki-js-item:last-child");

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

	function input_1_input_handler() {
		query = this.value;
		$$invalidate(0, query);
	}

	function input_1_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			$$invalidate(4, input = $$value);
		});
	}

	function button_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			$$invalidate(5, toggle = $$value);
		});
	}

	function div_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			$$invalidate(7, more = $$value);
		});
	}

	function div2_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			$$invalidate(6, popup = $$value);
		});
	}

	function div3_binding($$value) {
		binding_callbacks[$$value ? "unshift" : "push"](() => {
			$$invalidate(3, container = $$value);
		});
	}

	$$self.$set = $$props => {
		if ("real" in $$props) $$invalidate(1, real = $$props.real);
		if ("fetcher" in $$props) $$invalidate(26, fetcher = $$props.fetcher);
		if ("queryMinLen" in $$props) $$invalidate(27, queryMinLen = $$props.queryMinLen);
		if ("query" in $$props) $$invalidate(0, query = $$props.query);
		if ("delay" in $$props) $$invalidate(28, delay = $$props.delay);
		if ("extraClass" in $$props) $$invalidate(2, extraClass = $$props.extraClass);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty[0] & /*query*/ 1 | $$self.$$.dirty[1] & /*selectedItem*/ 2) {
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
		extraClass,
		container,
		input,
		toggle,
		popup,
		more,
		items,
		actualCount,
		hasMore,
		tooShort,
		fetchingMore,
		fetchError,
		popupVisible,
		activeFetch,
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
		fetcher,
		queryMinLen,
		delay,
		offsetCount,
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
		inputKeypressHandlers,
		inputKeydownHandlers,
		inputKeyupHandlers,
		toggleKeydownHandlers,
		itemKeydownHandlers,
		itemKeyupHandlers,
		input_1_input_handler,
		input_1_binding,
		button_binding,
		div_binding,
		div2_binding,
		div3_binding
	];
}

class Typeahead extends SvelteComponent {
	constructor(options) {
		super();
		if (!document_1.getElementById("svelte-1mymqwx-style")) add_css();

		init(
			this,
			options,
			instance,
			create_fragment,
			safe_not_equal,
			{
				real: 1,
				fetcher: 26,
				queryMinLen: 27,
				query: 0,
				delay: 28,
				extraClass: 2
			},
			[-1, -1]
		);
	}
}

export default Typeahead;
export { config };
