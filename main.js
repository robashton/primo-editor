define(function(require) {
  var Eventable = require('eventable')
  var Runner = require('../engine/core')
  var Toolbar = require('./toolbar')
  var Layers = require('./layers')
  var Palette = require('./palette')
  var Input = require('./input')
  var Level = require('../engine/level')
  
  var Editor = function(targetid) {
    Eventable.call(this)
    this.targetid = targetid
    this.levelEditor = null
    this.engine = new Runner(targetid)
    this.toolbar = new Toolbar(this)
    this.layers = new Layers(this)
    this.palette = new Palette(this)
    this.input = new Input(targetid, this.engine.camera)
    this.toolbar.on('level-selected', _.bind(this.onLevelSelected, this))
    this.activeTool = null
    this.$leveltitle = $('.level-title')
    setInterval(_.bind(this.render, this), 500)
  }
  Editor.prototype = {
    render: function() {
      this.engine.render()
    },
    onLevelSelected: function(path) {
      this.level = new Level(path)
      this.level.on('loaded', this.onLevelLoaded, this)
    },
    onLevelLoaded: function() {
      this.engine.setLevel(this.level)
      this.$leveltitle.text(this.level.path)
      this.raise('level-changed', this.level)
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
    },
    createLayer: function(name, tileset) {
      this.levelEditor.createLayer(name, tileset)
    },
    getTileAt: function(layer, x, y) {
      return this.levelEditor.getTileAt(layer, x, y)
    },
    setTileAt: function(layer, x, y, tile) {
      this.levelEditor.setTileAt(layer, x, y, tile)
    },
    save: function()  {
      this.levelEditor.save()
    }
  }
  _.extend(Editor.prototype, Eventable.prototype)

  var editor = new Editor('target')
})
