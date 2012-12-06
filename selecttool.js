define(function(require) {

  var SelectTool = function(camera) {
    this.camera = camera
  }

  SelectTool.prototype = {
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
      // TODO: Select
    },
    onDragStart: function(ev) {
      // Drag the camera
    },
    onDrag: function(ev) {
      // Drag the camera
    }
  }
  return SelectTool
})
