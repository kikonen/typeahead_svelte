<script context="module">
 const DEBUG = false;

 const I18N_DEFAULTS = {
     fetching: 'Searching..',
     no_results: 'No results',
     too_short: 'Too short',
     fetching_more: 'Searching more...',
 };

 const STYLE_DEFAULTS = {
     container_class: '',
 };

 function hasModifier(event) {
     return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
 }
</script>
<script>
 import {onMount} from 'svelte';
 import {beforeUpdate} from 'svelte';

 export let real;

 export let fetcher;
 export let queryMinLen = 1;
 export let query;
 export let delay = 200;
 export let translations = {};
 export let styles = {};

 let containerEl;
 let inputEl;
 let toggleEl;
 let popupEl;

 let setupDone = false;

 let items = [];
 let offsetCount = 0;
 let actualCount = 0;

 let message = null;
 let messageClass = null;

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
 let downQuery = null;
 let wasDown = false;

 let isSyncToReal = false;


 ////////////////////////////////////////////////////////////
 // Utils

 function translate(key) {
     return translations[key];
 }

 function nop() {};

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

             inputEl.focus();
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
         if (popupEl.scrollTop + popupEl.clientHeight >= popupEl.scrollHeight - popupEl.lastElementChild.clientHeight * 2 - 2) {
             fetchItems(true);
         }
     }
 }

 function closePopup(focusInput) {
     popupVisible = false;
     if (focusInput) {
         inputEl.focus();
     }
 }

 function openPopup() {
     if (!popupVisible) {
         popupVisible = true;
         let w = containerEl.offsetWidth;
         popupEl.style.minWidth = w + "px";

         let bounds = containerEl.getBoundingClientRect();
         let middleY = window.innerHeight / 2;
         let middleX = window.innerWidth / 2;

         popupTop = bounds.y > middleY;
         popupLeft = bounds.x + bounds.width > middleX;
     }
 }

 function selectItem(el) {
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
     if (syncToReal) {
         syncToReal(query, selectedItem);
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
     if (real.value !== query) {
         try {
             isSyncToReal = true;
             real.setAttribute('value', query);
             real.dispatchEvent(new Event('change'));
         } finally {
             isSyncToReal = false;
         }
     }
 }

 onMount(function() {
     query = real.value || '';

     real.addEventListener('change', function() {
         syncFromReal();
     });
 });

 beforeUpdate(function() {
     if (!setupDone) {
         setupComponent();
         setupDone = true;
     }
 });

 function setupComponent() {
     real.classList.add('d-none');

     translations = Object.assign({}, I18N_DEFAULTS, translations || {});
     styles = Object.assign({}, STYLE_DEFAULTS, styles || {});
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
         wasDown = true;
     },
     ArrowDown: function(event) {
         let item = popupVisible ? popupEl.querySelectorAll('.ki-js-item')[0] : null;
         if (item) {
             while (item && item.classList.contains('ts-js-dead')) {
                 item = item.nextElementSibling;
             }
             item.focus();
         } else {
             openPopup();
             fetchItems();
         }
         event.preventDefault();
     },
     ArrowUp: function(event) {
         // NOTE KI closing popup here is *irritating* i.e. if one is trying to select
         // first item in dropdown
         event.preventDefault();
     },
     Escape: function(event) {
         cancelFetch();
         closePopup(false);
     },
     Tab: nop,
 };

 let inputKeyupHandlers = {
     base: function(event) {
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
     ContextMenu: nop,
 }

 let toggleKeydownHandlers = {
     base: function(event) {
         inputEl.focus();
     },
     ArrowDown: inputKeydownHandlers.ArrowDown,
     ArrowUp: inputKeydownHandlers.ArrowDown,
     Escape: function(event) {
         cancelFetch();
         closePopup(false);
         inputEl.focus();
     },
     Tab: function(event) {
         inputEl.focus();
     },
 };

 let itemKeydownHandlers = {
     base: function(event) {
         inputEl.focus();
     },
     ArrowDown: function(event) {
         let next = event.target.nextElementSibling;

         if (next) {
             while (next && next.classList.contains('ts-js-dead')) {
                 next = next.nextElementSibling;
             }

             if (next && !next.classList.contains('ki-js-item')) {
                 next = null;
             }
         }

         if (next) {
             next.focus();
         }
         event.preventDefault();
     },
     ArrowUp: function(event) {
         let next = event.target.previousElementSibling;

         if (next) {
             while (next && next.classList.contains('ts-js-dead')) {
                 next = next.previousElementSibling;
             }
             if (next && !next.classList.contains('ki-js-item')) {
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
     Enter: function(event) {
         selectItem(event.target)
         event.preventDefault();
     },
     Escape: function(event) {
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
     ContextMenu: nop,
 };

 let itemKeyupHandlers = {
     base: nop,
     // allow "meta" keys to navigate in items
     PageUp: function(event) {
         let scrollLeft = document.body.scrollLeft;
         let scrollTop = document.body.scrollTop;

         let rect = popupEl.getBoundingClientRect();
         let item = document.elementFromPoint(scrollLeft + rect.x + 10, scrollTop + rect.top + 1);
         if (!item) {
             item = popupEl.querySelector('.ki-js-item:first-child');
         } else {
             if (!item.classList.contains('ki-js-item')) {
                 item = popupEl.querySelector('.ki-js-item:first-child');
             }
         }
         if (item) {
             item.focus();
         }
         event.preventDefault();
     },
     PageDown: function(event) {
         let scrollLeft = document.body.scrollLeft;
         let scrollTop = document.body.scrollTop;
         let h = popupEl.offsetHeight;

         let rect = popupEl.getBoundingClientRect();
         let item = document.elementFromPoint(scrollLeft + rect.x + 10, scrollTop + rect.top + h - 10);
         if (!item) {
             item = popupEl.querySelector('.ki-js-item:last-child');
         } else {
             if (!item.classList.contains('ki-js-item')) {
                 item = popupEl.querySelector('.ki-js-item:last-child');
             }
         }
         if (item) {
             item.focus();
         }

         event.preventDefault();
     },
     Home: function(event) {
         let item = popupEl.querySelector('.ki-js-item:first-child');
         if (item) {
             item.focus();
         }
         event.preventDefault();
     },
     End: function(event) {
         let item = popupEl.querySelector('.ki-js-item:last-child');
         if (item) {
             item.focus();
         }
         event.preventDefault();
     },
 }

 ////////////////////////////////////////////////////////////
 //
 function handleEvent(code, handlers, event) {
     (handlers[code] || handlers.base)(event);
 }

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
         selectItem(event.target)
     }
 }

 function handlePopupScroll(event) {
     fetchMoreIfneeded();
 }
</script>

<!-- ------------------------------------------------------------ -->
<!-- ------------------------------------------------------------ -->
<style>
</style>

<!-- ------------------------------------------------------------ -->
<!-- ------------------------------------------------------------ -->
<div class="form-control ts-container {styles.container_class}"
     id="ts_container_{real.id}"
     name="ts_container_{real.name}"
     bind:this={containerEl}>

  <div class="input-group">
    <input class="form-control ts-input"
           autocomplete=new-password
           autocorrect=off
           autocapitalize=off
           spellcheck=off

           data-target="{real.id}"
           placeholder="{real.placeholder}"
           bind:this={inputEl}
           bind:value={query}
           on:blur={handleBlur}
           on:keypress={handleInputKeypress}
           on:keydown={handleInputKeydown}
           on:keyup={handleInputKeyup}>

    <div class="input-group-append">
      <button class="btn btn-outline-secondary" type="button" tabindex="-1"
              bind:this={toggleEl}
              on:blur={handleBlur}
              on:keydown={handleToggleKeydown}
              on:click={handleToggleClick}>
        <i class="text-dark fas fa-caret-down"></i>
      </button>
    </div>
  </div>

  <div class="dropdown-menu ts-popup"
       class:show={popupVisible}
       class:ss-popup-top={popupTop}
       class:ss-popup-left={popupLeft}
       bind:this={popupEl}
       on:scroll={handlePopupScroll}>
    {#if fetchError}
      <div tabindex="-1" class="dropdown-item text-danger">
        {fetchError}
      </div>
    {:else if activeFetch && !fetchingMore}
      <div tabindex="-1" class="dropdown-item text-muted">
        {translate('fetching')}
      </div>
    {:else if actualCount === 0}
      <div tabindex="-1" class="dropdown-item text-muted">
        {#if tooShort }
          {translate('too_short')}
        {:else}
          {translate('no_results')}
        {/if}
      </div>
    {:else}
      {#each items as item, index}
        {#if item.separator}
          <div tabindex="-1"
            class="dropdown-divider ts-js-dead"
            data-index="{index}"
            on:keydown={handleItemKeydown}>
          </div>
        {:else if item.disabled || item.placeholder}
          <div tabindex="-1" class="dropdown-item ss-item-muted ts-js-dead"
               on:keydown={handleItemKeydown}>
            <div class="ts-item-text">
              {item.display_text || item.text}
            </div>
            {#if item.desc}
              <div class="ts-item-desc text-muted">
                {item.desc}
              </div>
            {/if}
          </div>
        {:else}
          <div tabindex=1 class="dropdown-item ts-item ki-js-item"  data-index="{index}"
             on:blur={handleBlur}
             on:click={handleItemClick}
             on:keydown={handleItemKeydown}
             on:keyup={handleItemKeyup}>

            <div class="ts-item-text">
              {item.display_text || item.text}
            </div>
            {#if item.desc}
              <div class="ts-item-desc text-muted">
                {item.desc}
              </div>
            {/if}
          </div>
        {/if}
      {/each}
    {/if}
  </div>
</div>
