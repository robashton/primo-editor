define(function(require) {
  var Eventable = require('eventable')
  var Runner = require('../engine/core')
  var Toolbar = require('./toolbar')
  var Layers = require('./layers')
  var Palette = require('./palette')
  var Input = require('./input')
  var Level = require('../engine/level')
  var Entities = require('./entities')
  
  var Editor = function(targetid) {
    Eventable.call(this)
    this.targetid = targetid
    this.level = null
    this.engine = new Runner(targetid)
    this.toolbar = new Toolbar(this)
    this.layers = new Layers(this)
    this.palette = new Palette(this)
    this.entities = new Entities(this)
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
    createEntityData: function(x, y, path, Type) {
      var type = this.registerEntityType(path, Type)
      var entityData =  {
        type: type,
        data: {
          x: x,
          y: y
        }
      }
      this.level.rawdata.entities.push(entityData)
      return entityData
    },
    registerEntityType: function(path, Type) {
      var lastSlash = path.lastIndexOf('/')
      var type = path.substr(lastSlash+1, path.length - (lastSlash+1))
      this.level.entityTypes[type] = Type
      this.level.rawdata.entityTypes[type] = path
      return type
    },
    addEntity: function(x, y, path, Type) {
      var rawdata = this.createEntityData(x,y,path,Type)
      var entity = this.engine.spawnEntity(Type, {
        x: x,
        y: y
      })
      entity.configuration = function(data) {
        if(data)
          rawdata.data = data
        if(data.x) entity.x = data.x
        if(data.y) entity.y = data.y
        return rawdata.data
      }
      return entity
    },
    createLayer: function(name, tileset) {
      this.level.addLayer({
        data: this.createDataForNewLayer(),
        tileset: tileset,
        name: name
      })
      this.raise('layer-added')
    },
    createDataForNewLayer: function() {
      var data = []
      for(var i =0 ; i < this.level.width(); i++) {
        for(var j = 0; j < this.level.height() ; j++) {
          data.push(null)
        }
      }
      return data
    },
    getTileAt: function(layer, x, y) {
      return this.levelEditor.getTileAt(layer, x, y)
    },
    setTileAt: function(layer, x, y, tile) {
      this.levelEditor.setTileAt(layer, x, y, tile)
    },
    save: function()  {
      $.ajax({
        type: "PUT",
        url: this.level.path,
        data: JSON.stringify(this.level.rawdata),
        contentType: "application/json"
      })
    }
  }
  _.extend(Editor.prototype, Eventable.prototype)

  var editor = new Editor('target')
})

