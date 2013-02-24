var _ = require('underscore')
var MemoryCanvas = require('primo-canvas')
var Eventable = require('primo-events')

var SpriteMap = function(texture, tilecountwidth, tilecountheight) {
  Eventable.call(this)
  this.tilewidth = 0
  this.tileheight = 0
  this.tilecountwidth = tilecountwidth || 1
  this.tilecountheight = tilecountheight || 1
  this.tilecount = tilecountwidth * tilecountheight 
  this.collisionmapsize = 0
  this.collisionMaps = []
  this.texture = texture
  this.loaded = false
  this.texture.waitForLoaded(_.bind(this.onLoaded, this))
}

SpriteMap.prototype = {
  drawTo: function(context, index,  x, y, width, height, flipx, flipy, rotation) {
    if(!this.loaded) return

    var img = this.texture.get()

    var rownumber = Math.floor(index / this.tilecountwidth)
    var columnnumber = index % this.tilecountwidth

    var sx = columnnumber * this.tilewidth
    var sy = rownumber * this.tileheight

    var scalex = flipx ? -1 : 1
    var scaley = flipy ? -1 : 1
    var contextSaved = false

    if(rotation) {
      if(!contextSaved) {
        contextSaved = true
        context.save()
      }
      context.translate(x + width/2.0, y + height/2.0)
      context.rotate(rotation)
      context.translate(-(x + width/2.0),-(y + height/2.0))
    }

    if(flipx || flipy) {
      if(!contextSaved) {
        contextSaved = true
        context.save()
      }
      context.scale(scalex, scaley)
      x *= scalex
      y *= scaley
      if(flipx)
        x -= width
      if(flipy)
        y -= height
      contextSaved = true
    } 


    context.drawImage(img, 
      sx, sy, this.tilewidth, this.tileheight,
      x, y , width || this.tilewidth, height || this.tileheight)

    if(contextSaved) 
      context.restore()
  },
  generateCollisionMaps: function(width, height) {
    if(!this.loaded) 
      return this.once('loaded', 
        function() { 
          this.generateCollisionMaps(width, height) }, this)

    // TODO: This doesn't really belong here, it needs storing elsewhere or returning
    this.collisionmapsize = width
    var canvas = new MemoryCanvas(width, height)

    try {
      for(var i = 0; i < this.tilecount ; i++) {
        canvas.reset()
        this.drawTo(canvas.context, i, 0, 0, width, height)
        this.collisionMaps[i] = canvas.createMap()
      }
    }
    catch(ex) {
      throw ex
    }
    finally {
      canvas.dispose()
    }
  },
  hasPixelAt: function(index, x, y) {
    if(!this.loaded) return false
    var map = this.collisionMaps[index]
    return map[x + y * this.collisionmapsize]
  },
  onLoaded: function() {
    this.loaded = true
    var img = this.texture.get()
    this.tilewidth = img.width / this.tilecountwidth
    this.tileheight = img.height / this.tilecountheight
    this.raise('loaded')
  }
}
_.extend(SpriteMap.prototype, Eventable.prototype)

module.exports = SpriteMap
