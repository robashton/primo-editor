var Eventable = require('primo-events')
var _ = require('underscore')

// Should this be a standalone module?
var Level = {}; //require('../engine/level')

var LevelEditor = function(path) {
  Eventable.call(this)
  this.path = path
  this.layers = []
  this.level = new Level(path)
  this.level.on('loaded', this.onLevelReceived, this)
}

LevelEditor.prototype = {
  onLevelReceived: function() {
    this.raise('loaded')
  },
  save: function() {
    $.ajax({
      type: "PUT",
      url: this.path,
      data: JSON.stringify(this.data),
      contentType: "application/json"
    })
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
}
_.extend(LevelEditor.prototype, Eventable.prototype)

module.exports = LevelEditor
