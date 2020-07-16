<script context="module">
 const DEBUG = false;

 const I18N_DEFAULTS = {
     fetching: 'Searching..',
     no_results: 'No results',
     too_short: 'Too short',
     toggle: 'Toggle popup',
     fetching_more: 'Searching more...',
 };

 const STYLE_DEFAULTS = {
     container_class: '',
 };

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
     F12: true,
 }

 const MUTATIONS = { attributes: true };

 let uidBase = 0;

 function nop() {};

 function nextUID() {
     uidBase++;
     return uidBase;
 };

 function hasModifier(event) {
     return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
 }

 function isMetaKey(event) {
     return META_KEYS[event.key] || META_KEYS[event.code]
 }

</script>
<script>
 import {onMount} from 'svelte';
 import {beforeUpdate} from 'svelte';
 import {afterUpdate} from 'svelte';

 export let real;

 export let debugMode = false;
 export let fetcher;
 export let queryMinLen = 1;
 export let query;
 export let delay = 200;
 export let translations = {};
 export let styles = {};
 export let showToggle = false;
 export let passEnter = false;
 export let popupFixed = false;

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

 let setupDone = false;

 let items = [];
 let offsetCount = 0;
 let actualCount = 0;

 let message = null;
 let messageClass = null;

 let hasMore = false;
 let tooShort = false;

 let activeId = null;

 let fetchingMore = false;
 let fetchError = null;

 let popupVisible = false;
 let popupTop = false;
 let popupLeft = false;

 let activeFetch = null;

 let previousQuery = null;
 let fetched = false;
 let selectedItem = null;
 let downQuery = null;
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
         if (DEBUG) console.log("FOCUS_INPUT. was", document.activeElement);
         inputEl.focus();
     }
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
         fetchingMore = true;
     } else {
         items = [];
         offsetCount = 0;
         actualCount = 0;
         hasMore = false;
         fetched = false;
         fetchingMore = false;
     }
     fetchError = null;

     let currentFetchOffset = fetchOffset;
     let currentFetchingMore = fetchingMore;

     let currentFetch = new Promise(function(resolve, reject) {
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
                         too_short: true,
                     }
                 });
             } else {
//                 console.debug("TIMER start: " + currentQuery);
                 setTimeout(function() {
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
     }).then(function(response) {
         if (currentFetch === activeFetch) {
             let fetchedtems = response.items || [];
             let info = response.info || {};

//             console.debug("APPLY fetch: " + currentQuery + ", isMore: " + currentFetchingMore + ", offset: " + currentFetchOffset + ", resultSize: " + fetchedtems.length + ", oldSize: " + items.length);
//             console.debug(info);

             let newItems;
             if (currentFetchingMore) {
                 newItems = items;
                 fetchedtems.forEach(function(item) {
                     newItems.push(item);
                 });
             } else {
                 newItems = fetchedtems;
             }
             items = newItems;
             resolveItems(items);

             hasMore = info.more && offsetCount > 0;
             tooShort = info.too_short === true;

             previousQuery = currentQuery;
             activeFetch = null;
             fetched = true;
             fetchingMore = false;
//         } else {
//             console.debug("ABORT fetch: " + currentQuery);
         }
     }).catch(function(err) {
         if (currentFetch === activeFetch) {
             console.error(err);

             fetchError = err;
             items = [];
             offsetCount = 0;
             actualCount = 0;
             hasMore = false;
             tooShort = false;
             previousQuery = null;
             activeFetch = null;
             fetched = false;
             fetchingMore = false;

             focusInput();
             openPopup();
         }
     });

     activeFetch = currentFetch;
 }

 function resolveItems(items) {
     let off = 0;
     let act = 0;

     items.forEach(function(item) {
         if (item.id) {
             item.id = item.id.toString();
         }

         if (item.separator) {
             // NOTE KI separator is ignored always
         } else if (item.placeholder) {
             // NOTE KI does not affect pagination
             act += 1;
         } else {
             // NOTE KI normal or disabled affects pagination
             off += 1;
             act += 1;
         }
     });

     offsetCount = off;
     actualCount = act;
 }

 function cancelFetch() {
     if (activeFetch !== null) {
         activeFetch = null;
         // no result fetched; since it doesn't match input any longer
         fetched = false;
         previousQuery = null;
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

 function closePopup(focus) {
     popupVisible = false;
     if (focus) {
         focusInput();
     }
 }

 function openPopup() {
     if (popupVisible) {
         return false;
     }

     popupVisible = true;
     let w = containerEl.offsetWidth;
     popupEl.style.minWidth = w + "px";

     updatePopupPosition();
     return true;
 }

 function selectOption(el) {
     if (!el || disabled) {
         return;
     }

     let item = items[el.dataset.index];
     if (item) {
         selectedItem = item;
         let changed = item.text !== query
         query = item.text;

         previousQuery = query.trim();
         if (previousQuery.length > 0) {
             previousQuery = query;
         }

         closePopup(true);
         if (changed) {
             previousQuery = null;
         }

         syncToReal(query, selectedItem);
         real.dispatchEvent(new CustomEvent('typeahead-select', { detail: item }));
//     } else {
//         console.debug("MISSING item", el);
     }
 }

 function containsElement(el) {
     return el === inputEl || el === toggleEl || popupEl.contains(el);
 }

 ////////////////////////////////////////////////////////////
 // HANDLERS
 //
 $: {
     if (DEBUG) console.debug("change: " + query);
     if (syncToReal) {
         syncToReal(query, selectedItem);
     }
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

     let realValue = real.value;
     if (realValue !== query) {
         query = realValue;
     }
 }

 function syncToReal(query, selectedItem) {
     if (DEBUG) console.debug("TO_REAL query=[" + query + "]" + "real.value=[" + real.value + "]");

     if (real.value !== query) {
         try {
             isSyncToReal = true;
             real.value = query;
             real.dispatchEvent(new Event('change'));
         } finally {
             isSyncToReal = false;
         }
         if (DEBUG) console.debug("UPDATED_REAL query=[" + query + "]" + "real.value=[" + real.value + "]");
     }
 }

 onMount(function() {
     query = real.value || '';

     syncFromRealDisabled();

     Object.keys(eventListeners).forEach(function(ev) {
         real.addEventListener(ev, eventListeners[ev]);
     });
 });

 beforeUpdate(function() {
     if (!setupDone) {
         setupComponent();
         setupDone = true;
     }
 });

 afterUpdate(function() {
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
     containerId = `ts_container_${baseId}`;
     containerName = real.name ? `ts_container_${real.name}` : null;

     mutationObserver.observe(real, MUTATIONS);

     bindLabel();

     queryMinLen = ds.tsQueryMinLen !== undefined ? parseInt(ds.tsQueryMinLen, 10) : queryMinLen;
     query = ds.tsQuery !== undefined ? ds.tsQuery : query;
     delay = ds.tsDelay !== undefined ? parseInt(ds.tsDelay, 10) : delay;
     showToggle = ds.tsShowToggle !== undefined ? true : showToggle;
     passEnter = ds.tsPassEnter !== undefined ? true : passEnter;
     popupFixed = ds.tsPopupFixed !== undefined ? true : popupFixed;

     translations = Object.assign({}, I18N_DEFAULTS, translations || {});
     styles = Object.assign({}, STYLE_DEFAULTS, styles || {});
 }

 function bindLabel() {
     if (real.id) {
         let label = document.querySelector(`[for="${real.id}"]`);
         if (label) {
             label.id = label.id || `ts_label_${real.id}`;
             labelId = label.id;
         }
     }
     if (!labelId) {
         labelText = real.getAttribute('aria-label') || null;
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

 function findInitialOption() {
     return optionsEl.querySelectorAll('.ts-js-item')[0];
 }

 function updatePopupPosition() {
     if (!popupVisible) {
         return;
     }

     let bounds = containerEl.getBoundingClientRect();

     let middleY = window.innerHeight / 2;
     let middleX = window.innerWidth / 2;

     popupTop = bounds.y > middleY;
     popupLeft = bounds.x + bounds.width > middleX;

     if (popupFixed) {
         let popupBounds = popupEl.getBoundingClientRect();

         if (popupTop) {
             popupEl.style.top = `${bounds.y - popupBounds.height}px`;
         } else {
             popupEl.style.top = `${bounds.y + bounds.height}px`;
         }
         if (popupLeft) {
             popupEl.style.left = `${bounds.x + bounds.width - popupBounds.width}px`;
         } else {
             popupEl.style.left = `${bounds.x}px`;
         }
     }
 }

 let eventListeners = {
     change: function() {
         syncFromReal();
     },
     'focus': function(event) {
         focusInput();
     },
 }

 ////////////////////////////////////////////////////////////
 //
 let inputKeypressHandlers = {
     base: function(event) {
         selectedItem = null;
     },
 };

 let inputKeydownHandlers = {
     base: function(event) {
         if (isMetaKey(event)) {
             return;
         }
         wasDown = true;
     },
     Enter: function(event) {
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
     ArrowDown: function(event) {
         if (openPopup()) {
             fetchItems();
         } else {
             if (!fetchingMore) {
                 activateArrowDown(event);
             }
         }
         event.preventDefault();
     },
     ArrowUp: function(event) {
         activateArrowUp(event);
     },
     PageUp: function(event) {
         activatePageUp(event);
     },
     PageDown: function(event) {
         activatePageDown(event);
     },
     Home: function(event) {
         activateHome(event);
     },
     End: function(event) {
         activateEnd(event);
     },
     Escape: function(event) {
         cancelFetch();
         closePopup(false);
     },
     Tab: nop,
 };

 let inputKeyupHandlers = {
     base: function(event) {
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
     ContextMenu: nop,
 }

 let toggleKeydownHandlers = {
     base: function(event) {
         if (isMetaKey(event)) {
             return;
         }
         focusInput();
     },
     Enter: inputKeydownHandlers.Enter,
     ArrowDown: inputKeydownHandlers.ArrowDown,
     ArrowUp: inputKeydownHandlers.ArrowDown,
     PageUp: inputKeydownHandlers.PageUp,
     PageDown: inputKeydownHandlers.PageDown,
     Home: inputKeydownHandlers.Home,
     End: inputKeydownHandlers.End,
     Escape: function(event) {
         cancelFetch();
         closePopup(false);
         focusInput();
     },
     Tab: function(event) {
         focusInput();
     },
 };

 function activateOption(el, old) {
     old = old || findActiveOption();
     if (old && old !== el) {
         old.classList.remove('ts-item-active');
     }
     activeId = null;

     if (!el) {
         return;
     }

     el.classList.add('ts-item-active');

     activeId = `${containerId}_item_${el.dataset.index}`

     let clientHeight = resultEl.clientHeight;

     if (resultEl.scrollHeight > clientHeight) {
         let y = el.offsetTop;
         let elementBottom = y + el.offsetHeight;

         let scrollTop = resultEl.scrollTop;

         if (elementBottom > scrollTop + clientHeight) {
             resultEl.scrollTop = elementBottom - clientHeight;
         } else if (y < scrollTop) {
             resultEl.scrollTop = y;
         }
     }
 }

 function activateArrowUp(event) {
     if (disabled || !popupVisible) {
         return;
     }

     let el = findActiveOption();
     let next = el && el.previousElementSibling;

     if (next) {
         while (next && next.classList.contains('ts-js-dead')) {
             next = next.previousElementSibling;
         }
         if (next && !next.classList.contains('ts-js-item')) {
             next = null;
         }
     }

     activateOption(next, el);
     event.preventDefault();
 }

 function activateArrowDown(event) {
     if (disabled || !popupVisible) {
         return;
     }

     let el = findActiveOption();
     let next = el ? el.nextElementSibling : findFirstOption();

     if (next) {
         while (next && next.classList.contains('ts-js-dead')) {
             next = next.nextElementSibling;
         }

         if (next && !next.classList.contains('ts-js-item')) {
             next = null;
         }
     }

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

 ////////////////////////////////////////////////////////////
 //
 function handleEvent(code, handlers, event) {
     (handlers[code] || handlers.base)(event);
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

 function handleItemClick(event) {
     if (event.button === 0 && !hasModifier(event)) {
         selectOption(event.target)
     }
 }

 function handleResultScroll(event) {
     fetchMoreIfneeded();
 }

 function handleWindowScroll(event) {
     updatePopupPosition();
 }
</script>

<!-- ------------------------------------------------------------ -->
<!-- ------------------------------------------------------------ -->
<style>
</style>

<!-- ------------------------------------------------------------ -->
<!-- ------------------------------------------------------------ -->
<svelte:window on:scroll={handleWindowScroll}/>
<div class="form-control ts-container {styles.container_class}"
     id={containerId}
     name={containerName}
     bind:this={containerEl}>

  <div class="input-group">
    <input class="form-control ts-input"
           autocomplete=new-password
           autocorrect=off
           autocapitalize=off
           spellcheck=off

           role=combobox

           aria-labelledby={labelId}
           aria-label={labelText}

           aria-expanded="{popupVisible}"
           aria-haspopup=listbox
           aria-controls="{containerId}_items"

           aria-activedescendant="{activeId || null}"

           data-target="{real.id}"
           placeholder="{real.placeholder}"
           bind:this={inputEl}
           bind:value={query}
           on:blur={handleBlur}
           on:keypress={handleInputKeypress}
           on:keydown={handleInputKeydown}
           on:keyup={handleInputKeyup}>

    {#if showToggle}
      <div class="input-group-append">
        <button class="btn btn-outline-secondary" type="button" tabindex="-1"
                bind:this={toggleEl}
                on:blur={handleBlur}
                on:keydown={handleToggleKeydown}
                on:click={handleToggleClick}>
          <span class="sr-only">{translate('toggle')}</span>
          <i class="text-dark fas fa-caret-down" aria-hidden=true></i>
        </button>
      </div>
    {/if}
  </div>

  <div class="dropdown-menu ts-popup"
       class:show={popupVisible}

       class:ts-popup-fixed={popupFixed}
       class:ts-popup-top={popupTop && !popupFixed}
       class:ts-popup-left={popupLeft && !popupFixed}
       class:ts-popup-fixed-top={popupTop && popupFixed}
       class:ts-popup-fixed-left={popupLeft && popupFixed}

       aria-hidden={!popupVisible}

       id="{containerId}_popup"

       bind:this={popupEl}
    >

    <div class="ts-result"
         bind:this={resultEl}
         on:scroll={handleResultScroll}
    >
      <ul
        class="ts-item-list"
        id="{containerId}_items"
        role=listbox
        aria-expanded={popupVisible}
        aria-hidden=false

        bind:this={optionsEl}
        >
        {#each items as item, index}
          {#if item.separator}
            <li class="dropdown-divider ts-js-dead"
              data-index="{index}">
            </li>
          {:else if item.disabled || item.placeholder}
            <li class="dropdown-item ts-item-disabled ts-js-dead">
              <div class="ts-item-text">
                {item.display_text || item.text}
              </div>
              {#if item.desc}
                <div class="ts-item-desc">
                  {item.desc}
                </div>
              {/if}
            </li>
          {:else}
            <li class="dropdown-item ts-item ts-js-item"
               data-index="{index}"
               id="{containerId}_item_{index}"

               on:click={handleItemClick}
            >

              <div class="ts-item-text">
                {item.display_text || item.text}
              </div>
              {#if item.desc}
                <div class="ts-item-desc">
                  {item.desc}
                </div>
              {/if}
            </li>
          {/if}
        {/each}
      </ul>
    </div>

    {#if fetchError}
      <div class="dropdown-item text-danger ts-message-item">
        {fetchError}
      </div>
    {:else if activeFetch && !fetchingMore}
      <div class="dropdown-item ts-item-muted ts-message-item">
        {translate('fetching')}
      </div>
    {:else if actualCount === 0}
      <div class="dropdown-item ts-item-muted ts-message-item">
        {#if tooShort }
          {translate('too_short')}
        {:else}
          {translate('no_results')}
        {/if}
      </div>
    {/if}
  </div>
</div>
