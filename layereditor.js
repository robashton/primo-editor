define(function(require) {
  var LayerEditor = function(level, layer, editor) {
    this.level = level
    this.layer = layer
    this.editor = editor
  }
  LayerEditor.prototype = {
    indexForWorldCoords: function(x, y) {
      var tilex = Math.floor(x / this.level.tilesize)
      var tiley = Math.floor(y / this.level.tilesize)
      var index = tilex + tiley * this.level.width
      return index
    },
    setTileAt: function(x, y, tile) {
      var index = this.indexForWorldCoords(x, y)
      this.layer.data[index] = tile
    },
    getTileAt: function(x, y, tile) {
      var index = this.indexForWorldCoords(x, y)
      return this.layer.data[index] 
    }
  }
  return LayerEditor
})
