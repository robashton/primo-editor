define(function(require) {

  var SelectTool = function() {
    this.onInputTap = _.bind(this.onInputTap, this)
    this.onDragStart = _.bind(this.onDragStart, this)
    this.onDrag = _.bind(this.onDrag, this)
    this.onDragEnd = _.bind(this.onDragEnd, this)
  }

  SelectTool.prototype = {
    activate: function(editor) {
      this.editor = editor
      this.camera = this.editor.engine.camera
      this.editor.input.cursor('pointer')
      this.editor.input.on('tap', this.onInputTap)
      this.editor.input.on('dragstart', this.onDragStart)
      this.editor.input.on('drag', this.onDrag)
      this.editor.input.on('dragend', this.onDragEnd)
    },
    deactivate: function() {
      this.editor.input.cursor('default')
      this.editor.input.off('tap', this.onInputTap)
      this.editor.input.off('dragstart', this.onDragStart)
      this.editor.input.off('drag', this.onDrag)
      this.editor.input.off('dragend', this.onDragEnd)
    },
    onInputTap: function(ev) {
      console.log(ev.screenx, ev.screeny)
      var entity = this.editor.engine.entityAt(ev.worldx, ev.worldy)
      this.editor.selectEntity(entity)
    },
    onDragStart: function(ev) {
      console.log(ev.screenx, ev.screeny)
      var start = this.camera.screenToWorld(
        ev.screenx - ev.distancex,
        ev.screeny - ev.distancey)
      var entity = this.editor.engine.entityAt(start.worldx, start.worldy)
      this.editor.selectEntity(entity)
      if(entity)
        this.startMovingEntity(ev, entity)
      else
        this.moveCamera(ev)
    },
    onDrag: function(ev) {
      if(this.movingEntity)  
        this.moveEntity(ev)
      else
        this.moveCamera(ev)
    },
    onDragEnd: function() {
      this.movingEntity = null
    },
    moveEntity: function(ev) {
      this.movingEntity.configuration({
        x: this.movingEntity.x + ev.distancex / this.camera.scalex(),
        y: this.movingEntity.y + ev.distancey / this.camera.scaley(),
      })
      this.editor.render()
    },
    moveCamera: function(ev) {
      this.camera.move(-ev.distancex / this.camera.scalex(),
                       -ev.distancey / this.camera.scaley())
      this.editor.render()
    },
    startMovingEntity: function(ev, entity) {
      this.movingEntity = entity
      this.moveEntity(ev)
    }
  }
  return SelectTool
})
