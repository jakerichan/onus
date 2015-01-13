/**
 * Module dependencies
 */

var React = require('react');
var dom = React.createElement;
var Router = require('react-router');
var RouteHandler = Router.RouteHandler;
var Link = Router.Link;
var LoadingStatusMixin = require('react-loading-status-mixin');
var merge = require('utils-merge');

/**
 * Load the function initializers
 */

var createRenderFn = require('./lib/render-fn');
var createDomFn = require('./lib/dom-fn');

/**
 * noop
 */

function noop(a) { return a; }

/**
 * save React types
 */

var PropTypes = React.PropTypes;
var ReactObj = PropTypes.object;
var ReactFunc = PropTypes.func

/**
 * expose component creation
 */

exports['default'] = exports = module.exports = createComponent;

/**
 * Lifecylce methods
 */

var lifecycle = [
  'componentWillMount',
  'componentDidMount',
  'componentWillReceiveProps',
  'shouldComponentUpdate',
  'componentWillUpdate',
  'componentDidUpdate',
  'componentWillUnmount'
];

/**
 * Create an Onus component
 */

function createComponent(conf) {

  // create a mixin with the defined lifecycle events
  var events = {};
  for (var i = 0, event; i < lifecycle.length; i++) {
    if (conf[events]) events[event] = module.hot ? hotReload(conf, event) : conf[event];
  }

  // load the standard mixins
  var mixins = [
    Router.State,
    Router.Navigation,
    LoadingStatusMixin,
    events
  ].concat(conf.mixins || []);

  var component = {
    displayName: conf.displayName,

    mixins: mixins,

    contextTypes: merge({
      store: ReactObj.isRequired,
      forms: ReactObj,
      translate: ReactFunc,
      errorHandler: ReactFunc,
      encodeParams: ReactFunc,
      decodeParams: ReactFunc
    }, conf.contextTypes),

    __onus_onStoreChange: function() {
      this.forceUpdate();
    },

    componentWillMount: function() {
      var self = this;
      var context = self.context;

      var store = self._store = context.store;

      var id = self._nodeID;

      store.on(id, self.__onus_onStoreChange);
      self._t = self._t || context.translate ? context.translate(id) : noop;

      self._error_handler = self._error_handler || context.errorHandler || noop;

      if (module.hot) {
        (conf.__subs = conf.__subs || {})[id] = function() {
          self.forceUpdate();
        };
      }
    },

    componentWillUnmount: function() {
      var self = this;
      if (module.hot) delete conf.__subs[self._nodeID];
      self.store.off(self._nodeID, self.__onus_onStoreChange);
    },

    statics: conf.statics,

    _DOM: conf._DOM || (module.hot ?
      createDomFn(conf, dom, noop, Link, hotReload) :
      createDomFn(conf, dom, noop, Link)),

    _yield: conf._yield || _yield,

    _render: conf._render || (module.hot ?
      createRenderFn(conf, dom, noop, hotReload) :
      createRenderFn(conf, dom, noop)),

    loadedClassName: conf.loadedClassName || 'loaded',

    loadingClassName: conf.loadingClassName || 'loading',

    componentClassName: conf.componentClassName || conf.displayName + '-component',

    render: function() {
      // TODO see if we can cache this
      // TODO detect any recursive re-renders
      return this._render();
    }
  };

  for (var k in conf) {
    if (component[k] || !conf.hasOwnProperty(k) || events[k]) continue;

    if (module.hot) {
      component[k] = typeof conf[k] === 'function' ?
        hotReload(conf, k) :
        conf[k];
    } else {
      component[k] = conf[k];
    }
  }

  return React.createClass(component);
}

/**
 * Wrap the yield function
 */

function _yield(name) {
  var props = this.props;

  if (!name) return props.children ? props.children : dom(RouteHandler);

  var prop = props[name];
  return typeof prop === 'function' ?
    prop.apply(this, Array.prototype.slice.call(arguments, 1)) :
    prop;
}

/**
 * Wrap a function for hot reload goodness
 */

function hotReload(conf, name) {
  return function() {
    var fn = conf[name];
    return fn && fn.apply(this, arguments);
  };
}
