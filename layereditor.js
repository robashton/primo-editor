define(function(require) {
  var LayerEditor = function(level, index) {
    this.level = level
    this.index = index
  }
  LayerEditor.prototype = {
    name: function() {
      return this.level.data.layers[this.index].name
    },
    tileset: function() {
      return this.level.level.layers[this.index].tileset
    },
    setTileAt: function(x, y, tile) {
      this.level.setTileAt(this.index, x, y, tile)
    },
    getTileAt: function(x, y, tile) {
      return this.level.getTileAt(this.index, x, y, tile)
    }
  }
  return LayerEditor
})
