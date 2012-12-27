define(function(require) {
  var Eventable = require('eventable')
  var Hammer = require('hammer')
  var _ = require('underscore')

  var Input = function(elementid, camera) {
    Eventable.call(this)
    this.element = document.getElementById(elementid)
    this.camera = camera
    this.hammer = new Hammer(this.element)
    this.hammer.ontap = _.bind(this.onTap, this)
    this.hammer.ondragstart = _.bind(this.onDragStart, this)
    this.hammer.ondrag = _.bind(this.onDrag, this)
    this.hammer.ondragend = _.bind(this.onDragEnd, this)
    this.ev = {}
    this.lastdistance = { x: 0, y: 0 }
  }

  Input.prototype = {
    cursor: function(cursor) {
      this.element.style.cursor = cursor
    },
    onTap: function(ev) {
      this.camera.screenToWorld(
        ev.position[0].x,
        ev.position[0].y,
        this.ev
      )
      this.ev.screenx = ev.position[0].x
      this.ev.screeny = ev.position[0].y
      this.raise('tap', this.ev)
    },
    onDragStart: function(ev) {
      this.camera.screenToWorld(
        ev.position.x + this.element.offsetLeft,
        ev.position.y + this.element.offsetTop,
        this.ev
      )
      this.ev.screenx = ev.position.x + this.element.offsetLeft
      this.ev.screeny = ev.position.y + this.element.offsetTop
      this.ev.distancex = ev.distanceX 
      this.ev.distancey = ev.distanceY
      this.lastdistance.x = ev.distanceX
      this.lastdistance.y = ev.distanceY
      this.raise('dragstart', this.ev)
    },
    onDrag: function(ev) {
      this.camera.screenToWorld(
        ev.position.x + this.element.offsetLeft,
        ev.position.y + this.element.offsetTop,
        this.ev
      )
      this.ev.screenx = ev.position.x + this.element.offsetLeft
      this.ev.screeny = ev.position.y + this.element.offsetTop
      this.ev.distancex = ev.distanceX - this.lastdistance.x 
      this.ev.distancey = ev.distanceY - this.lastdistance.y
      this.lastdistance.x = ev.distanceX
      this.lastdistance.y = ev.distanceY
      this.raise('drag', this.ev)
    },
    onDragEnd: function(ev) {
      this.raise('dragend')
    }
  }
  _(Input.prototype).extend(Eventable.prototype)

  return Input
})
