
var TileTool = function(layer, tile) {
  this.layer = layer
  this.tile = tile
  this.editor = null
  this.onInputTap = _.bind(this.onInputTap, this)
  this.onDragStart = _.bind(this.onDragStart, this)
  this.onDrag = _.bind(this.onDrag, this)
}

TileTool.prototype = {
  activate: function(editor) {
    this.editor = editor
    this.editor.input.cursor('pointer')
    this.editor.input.on('tap', this.onInputTap)
    this.editor.input.on('dragstart', this.onDragStart)
    this.editor.input.on('drag', this.onDrag)
  },
  deactivate: function() {
    this.editor.input.cursor('default')
    this.editor.input.off('tap', this.onInputTap)
    this.editor.input.off('dragstart', this.onDragStart)
    this.editor.input.off('drag', this.onDrag)
  },
  onInputTap: function(ev) {
    this.editor.executeAction(
      new SetTileAction(ev.worldx, ev.worldy, this.layer, this.tile))
  },
  onDragStart: function(ev) {
    this.editor.executeAction(
      new SetTileAction(ev.worldx, ev.worldy, this.layer, this.tile))
  },
  onDrag: function(ev) {
    this.editor.executeAction(
      new SetTileAction(ev.worldx, ev.worldy, this.layer, this.tile))
  }
}

var SetTileAction = function(worldx, worldy, layer, tile) {
  this.worldx = worldx
  this.worldy = worldy
  this.layer = layer
  this.tile = tile
  this.oldtile = null
}

SetTileAction.prototype = {
  invoke: function() {
    this.oldtile = this.layer.getTileAt(this.worldx, this.worldy)
    this.layer.setTileAt(this.worldx, this.worldy, this.tile)
  },
  undo: function() {
    this.layer.setTileAt(this.worldx, this.worldy, this.oldtile)
  }
}

module.exports = TileTool
