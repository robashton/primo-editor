define(function(require) {
  var Eventable = require('eventable')
  var Hammer = require('hammer')
  var _ = require('underscore')

  var Input = function(elementid) {
    Eventable.call(this)
    this.element = document.getElementById(elementid)
    this.hammer = new Hammer(this.element)
    this.hammer.ontap = _.bind(this.onTap, this)
    this.hammer.ondragstart = _.bind(this.onDragStart, this)
    this.hammer.ondrag = _.bind(this.onDrag, this)
    this.hammer.ondragend = _.bind(this.onDragEnd, this)
    this.ev = {}
  }

  Input.prototype = {
    cursor: function(cursor) {
      this.element.style.cursor = cursor
    },
    onTap: function(ev) {
      // Currently don't have a camera
      // 1 pixel = 1 unit
      // Also the layer is currently being rendered
      // as 1 pixel = 1 unit, although this is not necessarily
      // the way it should be
      this.ev.worldx = ev.position[0].x - this.element.offsetLeft
      this.ev.worldy = ev.position[0].y - this.element.offsetTop
      this.raise('tap', this.ev)
    },
    onDragStart: function(ev) {
      this.ev.worldx = ev.position.x
      this.ev.worldy = ev.position.y
      this.raise('dragstart', this.ev)
    },
    onDrag: function(ev) {
      this.ev.worldx = ev.position.x
      this.ev.worldy = ev.position.y
      this.raise('drag', this.ev)
    },
    onDragEnd: function(ev) {
      this.raise('dragend')
    }
  }
  _(Input.prototype).extend(Eventable.prototype)

  return Input
})
