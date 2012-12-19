define(function(require) {
  var Eventable = require('eventable')
  var $ = require('jquery')
  var _ = require('underscore')
  var LevelLoader = require('../engine/levelloader')
  var LayerEditor = require('./layereditor')

  var LevelEditor = function(path) {
    Eventable.call(this)
    this.path = path
    this.layers = []
    this.level = null
    this.data = null
    this.requires = {}
    this.loadData()
  }

  LevelEditor.prototype = {
    loadData: function() {
      $.get(this.path, _.bind(this.onRawFileReceived, this))
      var loader = new LevelLoader(this.path)
      loader.on('finished', this.onLevelReceived, this)
    },
    onLevelReceived: function(level) {
      this.level = level
      this.tryFinished()
    },
    onRawFileReceived: function(raw) {
      this.data = raw
      this.tryFinished()
    },
    save: function() {
      $.ajax({
        type: "PUT",
        url: this.path,
        data: JSON.stringify(this.data),
        contentType: "application/json"
      })
    },
    tryFinished: function() {
      if(this.level && this.data) {
        this.createEditors()
        this.raise('loaded')
      }
    },
    createLayer: function(name, tileset) {
      var tileData = this.createDataForNewLayer()
      this.data.layers.push({
        name: name,
        tileset: tileset,
        data: tileData
      })
      var self = this
      require([tileset], function(data) {
        self.level.layers.push({
          name: name,
          tileset: data,
          data: tileData
        })
      })
      this.layers.push(new LayerEditor(this, this.layers.length))
      this.raise('layer-added', this.layers[this.layers.length-1])
    },
    createDataForNewLayer: function() {
      var data = []
      for(var i =0 ; i < this.data.width; i++) {
        for(var j = 0; j < this.data.height; j++) {
          data.push(null)
        }
      }
      return data
    },
    createEditors: function() {
      for(var i = 0 ; i < this.data.layers.length; i++) {
        this.layers[i] = new LayerEditor(this, i)
      }
    },
    indexForWorldCoords: function(x, y) {
      var tilex = Math.floor(x / this.data.tilesize)
      var tiley = Math.floor(y / this.data.tilesize)
      var index = tilex + tiley * this.data.width
      return index
    },
    setTileAt: function(layer, x, y, tile) {
      var index = this.indexForWorldCoords(x, y)
      this.data.layers[layer].data[index] = tile
      this.level.layers[layer].data[index] = tile
    },
    getTileAt: function(layer, x, y, tile) {
      var index = this.indexForWorldCoords(x, y)
      return this.data.layers[layer].data[index] 
    }
  }
  _.extend(LevelEditor.prototype, Eventable.prototype)

  return LevelEditor
})
