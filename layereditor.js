define(function(require) {
  var LayerEditor = function(layer, editor) {
    this.layer = layer
    this.editor = editor
  }
  LayerEditor.prototype = {
    indexForWorldCoords: function(x, y) {
      var tilex = Math.floor(x / this.layer.tilesize)
      var tiley = Math.floor(y / this.layer.tilesize)
      var index = tilex + tiley * this.layer.width
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
