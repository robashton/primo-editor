var EntityPlaceTool = function(path, Type) {
  this.path = path
  this.Type = Type
  this.editor = null
  this.trackedEntity = null
  this.onInputTap = _.bind(this.onInputTap, this)
  this.onDragStart = _.bind(this.onDragStart, this)
  this.onDrag = _.bind(this.onDrag, this)
}
EntityPlaceTool.prototype = {
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
    this.editor.addEntity(ev.worldx, ev.worldy, this.path, this.Type)
  },
  onDragStart: function(ev) {
    this.trackedEntity = this.editor.addEntity(ev.worldx, ev.worldy, this.path, this.Type)
  },
  onDrag: function(ev) {
    this.trackedEntity.configuration({
      x: ev.worldx,
      y: ev.worldy
    })
    this.editor.render()
  }
}
module.exports = EntityPlaceTool
