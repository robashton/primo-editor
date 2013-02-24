var _ = require('underscore');

var EventContainer = function(defaultContext) {
  this.handlers = [];
  this.defaultContext = defaultContext;
}; 

EventContainer.prototype = {
  raise: function(source, data) {
   var handlerLength = this.handlers.length;
   var handlers = this.handlers
   for(var i = 0; i < handlerLength; i++) {
      var handler = handlers[i];
      handler.method.call(handler.context || this.defaultContext, data, source);   
   }
  },
  add: function(method, context) {
    this.handlers.push({
      method: method,
      context: context      
    });
  },
  remove: function(method, context) {
    this.handlers = _(this.handlers).filter(function(item) {
      return item.method !== method || item.context !== context;
    });
  }
};
  
module.exports = EventContainer;
