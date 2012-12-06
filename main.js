define(function(require) {
  var Eventable = require('eventable')
  var Runner = require('../engine/core')
  var Toolbar = require('./toolbar')
  var Layers = require('./layers')
  var Palette = require('./palette')
  var Input = require('./input')
  
  var Editor = function(targetid) {
    Eventable.call(this)
    this.targetid = targetid
    this.level = null
    this.engine = new Runner(targetid)
    this.toolbar = new Toolbar(this)
    this.layers = new Layers(this)
    this.palette = new Palette(this)
    this.input = new Input(targetid)
    this.toolbar.on('level-loaded', _.bind(this.onLevelLoaded, this))
    this.activeTool = null
    setInterval(_.bind(this.render, this), 500)
  }
  Editor.prototype = {
    render: function() {
      this.engine.render()
    },
    onLevelLoaded: function(level) {
      this.level = level
      this.engine.loadLevel(level)
      this.raise('level-changed', level)
    },
    setActiveTool: function(tool) {
      if(this.activeTool)
        this.activeTool.deactivate()
      this.activeTool = tool
      if(this.activeTool)
        this.activeTool.activate(this)
    },
    executeAction: function(action) {
      action.invoke()
      this.render()
    }
  }
  _.extend(Editor.prototype, Eventable.prototype)

  var editor = new Editor('target')
})
