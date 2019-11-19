<script>
 import {onMount} from 'svelte';

 export let real;

 export let query = '';
 export let queryMinLen = 1;

 export let entries = [];

 export let onSelected = function() {};
 export let fetcher;
 export let hasMore = false;
 export let tooShort = false;
 export let fetchingMore = false;
 export let fetchError = null;

 export let popupVisible = false;
 export let activeFetch = null;

 let input;
 let toggle;
 let popup;
 let more;

 let previousQuery = null;
 let fetched = false;
 let selectedItem = null;
 let downQuery = null;
 let wasDown = false;

 let i18n = {
     fetching: 'Searching..',
     no_results: 'No results',
     too_short: 'Too short',
     has_more: 'More...',
     fetching_more: 'Searching more...',
 };


 ////////////////////////////////////////////////////////////
 //
 function fetchEntries(more) {
     let currentQuery = query.trim();
     if (currentQuery.length > 0) {
         currentQuery = query;
     }

     if (!more && !fetchingMore && currentQuery === previousQuery) {
         return;
     }

//     console.debug("START fetch: " + currentQuery);

     cancelFetch();

     let fetchOffset = 0;

     if (more) {
         fetchOffset = fetchOffset + entries.length
         fetchingMore = true;
     } else {
         entries = [];
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
                     entries: [],
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
                 }, 300);
             }
         }
     }).then(function(response) {
         if (currentFetch === activeFetch) {
             let newEntries = response.entries || [];
             let info = response.info || {};

             console.debug("APPLY fetch: " + currentQuery + ", isMore: " + currentFetchingMore + ", offset: " + currentFetchOffset + ", resultSize: " + newEntries.length + ", oldSize: " + entries.length);
             console.debug(info);

             let updateEntries;
             if (currentFetchingMore) {
                 updateEntries = entries;
                 newEntries.forEach(function(item) {
                     updateEntries.push(item);
                 });
             } else {
                 updateEntries = newEntries;
             }
             entries = updateEntries;

             hasMore = info.more;
             tooShort = info.too_short;

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
             entries = [];
             hasMore = false;
             tooShort = false;
             previousQuery = null;
             activeFetch = null;
             fetched = false;
             fetchingMode = false;

             input.focus();
             openPopup();
         }
     });

     activeFetch = currentFetch;
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
     if (hasMore && !fetchingMore) {
         // console.debug({scrollTop: popup.scrollTop, clientHeight: popup.clientHeight, scrollHeight: popup.scrollHeight, moreHeight: more.clientHeight});
         // console.debug(popup.scrollTop + popup.clientHeight >= popup.scrollHeight - more.height);

         if (popup.scrollTop + popup.clientHeight >= popup.scrollHeight - more.clientHeight * 2 - 2) {
             fetchEntries(true);
         }
     }
 }

 function closePopup(focusInput) {
     popupVisible = false;
     if (focusInput) {
         input.focus();
     }
 }

 function openPopup() {
     if (!popupVisible) {
         popupVisible = true;
         let w = input.parentElement.offsetWidth;
         popup.style.minWidth = w + "px";
     }
 }

 function selectItem(el) {
     let item = entries[el.dataset.index];
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

         real.setAttribute('value', query);
         onSelected(item);
//     } else {
//         console.debug("MISSING item", el);
     }
 }

 function containsElement(el) {
     return el === input || el === toggle || popup.contains(el);
 }

 function hasModifier(event) {
     return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
 }

 ////////////////////////////////////////////////////////////
 // HANDLERS
 //
 $: real.setAttribute('value', query);

 onMount(function() {
     query = real.value || '';
     real.classList.add('d-none');
     real.addEventListener('change', function() {
         var realValue = real.getAttribute('value');
         if (realValue !== query) {
             console.debug("Changed: " + realValue);
             query = realValue;
         }
     });
 });

 function nop() {};

 let inputKeypressHandlers = {
     base: function(event) {
         selectedItem = false;
     },
 };

 let inputKeydownHandlers = {
     base: function(event) {
         wasDown = true;
     },
     ArrowDown: function(event) {
         let item = popupVisible ? popup.querySelector('.js-item:first-child') : null;
         if (item) {
             item.focus();
         } else {
             openPopup();
             fetchEntries();
         }
         event.preventDefault();
     },
     ArrowUp: function(event) {
         // NOTE KI closing popup here is *irritating* i.e. if one is trying to select
         // first entry in dropdown
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
             fetchEntries();
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
         input.focus();
     },
     ArrowDown: inputKeydownHandlers.ArrowDown,
     ArrowUp: inputKeydownHandlers.ArrowDown,
     Escape: function(event) {
         cancelFetch();
         closePopup(false);
         input.focus();
     },
     Tab: function(event) {
         input.focus();
     },
 };

 let itemKeydownHandlers = {
     base: function(event) {
         input.focus();
     },
     ArrowDown: function(event) {
         let next = event.target.nextElementSibling;

         if (next) {
             if (!next.classList.contains('js-item')) {
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
             if (!next.classList.contains('js-item')) {
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

         let rect = popup.getBoundingClientRect();
         let item = document.elementFromPoint(scrollLeft + rect.x + 10, scrollTop + rect.top + 1);
         if (!item) {
             item = popup.querySelector('.js-item:first-child');
         } else {
             if (!item.classList.contains('js-item')) {
                 item = popup.querySelector('.js-item:first-child');
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
         let h = popup.offsetHeight;

         let rect = popup.getBoundingClientRect();
         let item = document.elementFromPoint(scrollLeft + rect.x + 10, scrollTop + rect.top + h - 10);
         if (!item) {
             item = popup.querySelector('.js-item:last-child');
         } else {
             if (!item.classList.contains('js-item')) {
                 item = popup.querySelector('.js-item:last-child');
             }
         }
         if (item) {
             item.focus();
         }

         event.preventDefault();
     },
     Home: function(event) {
         let item = popup.querySelector('.js-item:first-child');
         if (item) {
             item.focus();
         }
         event.preventDefault();
     },
     End: function(event) {
         let item = popup.querySelector('.js-item:last-child');
         if (item) {
             item.focus();
         }
         event.preventDefault();
     },
 }

 function handleEvent(code, handlers, event) {
     let handler = handlers[code] || handlers.base;
     handler(event);
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

 function handleInputClick(event) {
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
             fetchEntries();
         }
     }
 }

 function handleItemKeydown(event) {
     handleEvent(event.key, itemKeydownHandlers, event);
 }

 function handleItemKeyup(event) {
     handleEvent(event.key, itemKeyupHandlers, event);
 }

 function handleItemClick() {
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
 .typeahead {
     position: relative;
 }
 .typeahead-popup {
     max-height: 15rem;
     max-width: 90vw;
     overflow-y: auto;
 }
 .no-click {
     pointer-events: none;
 }
</style>

<!-- ------------------------------------------------------------ -->
<!-- ------------------------------------------------------------ -->
<div class="input-group mb-3 typeahead js-typeahead-container">
  <input class="js-input {real.getAttribute('class')}"
         data-target="{real.id}"
         placeholder="{real.placeholder}"
         bind:this={input}
         bind:value={query}
         on:blur={handleBlur}
         on:keypress={handleInputKeypress}
         on:keydown={handleInputKeydown}
         on:keyup={handleInputKeyup}
         on:click={handleInputClick}>
  <div class="input-group-append">
    <button class="btn btn-outline-secondary" type="button" tabindex="-1"
            bind:this={toggle}
            on:blur={handleBlur}
            on:keydown={handleToggleKeydown}
            on:click={handleToggleClick}>
      <i class="fas fa-caret-down"></i>
    </button>
  </div>

  <div class="js-popup dropdown-menu typeahead-popup {popupVisible ? 'show' : ''}"
       bind:this={popup}
       on:scroll|passive={handlePopupScroll}>
    {#if fetchError }
      <div tabindex=-1 class="dropdown-item text-danger">
        {fetchError}
      </div>
    {:else}
      {#if activeFetch }
        {#if !fetchingMore }
          <div tabindex=-1 class="dropdown-item text-muted">
            {i18n.fetching}
          </div>
        {/if}
      {:else}
        {#if entries.length === 0 }
          <div tabindex=-1 class="dropdown-item text-muted">
            {#if tooShort }
              {i18n.too_short}
            {:else}
              {i18n.no_results}
            {/if}
          </div>
        {/if}
      {/if}
    {/if}

    {#if (!activeFetch  || fetchingMore) && entries.length > 0 }
      {#each entries as item, index}
        <div tabindex=1 class="js-item dropdown-item"  data-index="{index}"
             on:blur={handleBlur}
             on:click={handleItemClick}
             on:keydown={handleItemKeydown}
             on:keyup={handleItemKeyup}>
          <div class="no-click">
            {item.text}
          </div>
          <div class="no-click text-muted">
            {item.desc}
          </div>
        </div>
      {/each}
    {/if}

    {#if hasMore}
      <div tabindex="-1"
           class="js-more dropdown-item text-muted"
           bind:this={more}>
        {i18n.has_more}
      </div>
    {/if}
  </div>
</div>
