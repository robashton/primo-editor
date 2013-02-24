var CurrentSelection = function(editor) {
  this.editor = editor
  this.editor.on('entity-selection-changed', _.bind(this.onEntitySelectionChanged,this))
  this.editor.on('rendered', _.bind(this.onRender, this))
  this.$selection = $('#selection-indicator')
  this.$selection.css({
      "position": "absolute",
      "border": "1px solid #0F0",
      "pointer-events": "none"
  })

  this.engine = this.editor.engine
}
CurrentSelection.prototype = {
  onEntitySelectionChanged: function(entity) {
    this.selectedEntity = entity
  },
  onRender: function() {
    if(this.selectedEntity) {
      var topleft = this.engine.camera.worldToScreen(
        this.selectedEntity.x, this.selectedEntity.y)
      var bottomright = this.engine.camera.worldToScreen(
        this.selectedEntity.x + this.selectedEntity.width,
        this.selectedEntity.y + this.selectedEntity.height)

      this.$selection.css({
        "top": topleft.screeny + "px",
        "left": topleft.screenx + "px",
        "height": (bottomright.screeny - topleft.screeny) + "px",
        "width": (bottomright.screenx - topleft.screenx )+ "px"
      })

      this.$selection.show()
    }
    else {
      this.$selection.hide()
    }
  }
}
module.exports = CurrentSelection
