define(function(require) {
  var MemoryCanvas = function(width, height) {
    this.width = width
    this.height = height
    this.canvas = document.createElement('canvas')
    this.canvas.width = width 
    this.canvas.height = height 
    this.context = this.canvas.getContext('2d')
  }
  MemoryCanvas.prototype = {
    setup: function(width, height) {
      this.context.clearRect(0,0, this.width, this.height)

      var scalex = this.width / width
        , scaley = this.height / height

      this.context.setTransform(1, 0, 0, 1, 0, 0)
      this.context.scale(scalex, scaley)
    },
    getImage: function() {
      return this.canvas.toDataURL()
    }
  }
  return MemoryCanvas
})
