define(function(require) {

  var SelectTool = function() {
    this.onInputTap = _.bind(this.onInputTap, this)
    this.onDragStart = _.bind(this.onDragStart, this)
    this.onDrag = _.bind(this.onDrag, this)
  }

  SelectTool.prototype = {
    activate: function(editor) {
      this.editor = editor
      this.camera = this.editor.engine.camera
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
      var entity = this.editor.engine.entityAt(ev.worldx, ev.worldy)
      this.editor.selectEntity(entity)
    },
    onDragStart: function(ev) {
      this.camera.move(-ev.distancex, -ev.distancey)
      this.editor.render()
    },
    onDrag: function(ev) {
      this.camera.move(-ev.distancex, -ev.distancey)
      this.editor.render()
    }
  }
  return SelectTool
})
