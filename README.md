# README

Simple typeahead widget implemented using Svelte

## Styling

- Uses bootstrap 4

## Fetures

- fetching of data from local or REST API
- Support infinite scrolling fetch more logic
- support keyboard, mouse, touch scrolling and selection
- extends existing "input" widget in form, thus integrates with existing web forms

## Example

### Rails webpacker version
- https://github.com/kikonen/host/blob/master/app/javascript/packs/typeahead_svelte.js
- https://github.com/kikonen/host/blob/master/app/views/svelte_test/typeahead.haml

### Rails sprockets4 version
- https://github.com/kikonen/host/blob/master/app/assets/javascripts/module_test.js
- https://github.com/kikonen/host/blob/master/app/assets/javascripts/test/typeahead_svelte_init.es6
- https://github.com/kikonen/host/blob/master/app/assets/stylesheets/module_test.css
- https://github.com/kikonen/host/blob/master/app/views/test/_typeahead_svelte_pane.haml

## DEMO

### webpacker version
https://host.ikari.fi/svelte_test/typeahead

### sprockets4 version
https://host.ikari.fi/test

## Development

##¤ BUILD

``bash
yarn run build
``

### RELEASE

``bash
yarn publish
``
