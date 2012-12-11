define(function(require) {
  var Eventable = require('eventable')
  var $ = require('jquery')
  var _ = require('underscore')
  var LevelLoader = require('../engine/levelloader')

  var LevelEditor = function(path) {
    Eventable.call(this)
    this.path = path
    this.level = null
    this.data = null
    this.requires = {}
    this.loadData()
  }

  LevelEditor.prototype = {
    loadData: function() {
      $.get(this.path + '.json', _.bind(this.onRawFileReceived, this))
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
      // Serialize teh fucker
    },
    tryFinished: function() {
      if(this.level && this.data)
        this.raise('loaded')
    },
    indexForWorldCoords: function(x, y) {
      var tilex = Math.floor(x / this.data.tilesize)
      var tiley = Math.floor(y / this.data.tilesize)
      var index = tilex + tiley * this.data.width
      return index
    },
    setTileAt: function(layer, x, y, tile) {
      var index = this.indexForWorldCoords(x, y)
      this.data[layer].data[index] = tile
      this.level[layer].data[index] = tile
    },
    getTileAt: function(layer, x, y, tile) {
      var index = this.indexForWorldCoords(x, y)
      return this.data[layer].data[index] 
    }
  }
  _.extend(LevelEditor.prototype, Eventable.prototype)

  return LevelEditor
})
