define(function(require) {
  var Eventable = require('eventable')
  var Runner = require('../engine/core')
  var Toolbar = require('./toolbar')
  
  var Editor = function(targetid) {
    Eventable.call(this)
    this.targetid = targetid
    this.level = null
    this.engine = new Runner(targetid)
    this.toolbar = new Toolbar()
    this.toolbar.on('level-loaded', _.bind(this.onLevelLoaded, this))
    setInterval(_.bind(this.render, this), 500)
  }
  Editor.prototype = {
    render: function() {
      this.engine.render()
    },
    onLevelLoaded: function(level) {
      this.engine.loadLevel(level)
    }
  }
  _.extend(Editor.prototype, Eventable.prototype)

  var editor = new Editor('target')
})
