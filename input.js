define(function(require) {
  var Eventable = require('eventable')
  var Hammer = require('hammer')
  var _ = require('underscore')

  var Input = function(elementid) {
    Eventable.call(this)
    this.element = document.getElementById(elementid)
    this.hammer = new Hammer(this.element)
    this.hammer.ontap = _.bind(this.onTap, this)
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
      this.ev.worldx = ev.position[0].x
      this.ev.worldy = ev.position[0].y
      this.raise('action', this.ev)
    }
  }
  _(Input.prototype).extend(Eventable.prototype)

  return Input
})
