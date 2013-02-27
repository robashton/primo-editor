var _ = require('underscore')
var TileTool = require('./tiletool')
var SelectTool = require('./selecttool')

var palettesize = 16

var Palette = function(editor) {
  this.editor = editor
  this.editor.layers.on('layer-selected', _.bind(this.onLayerSelected, this))
  this.$selection = $('#palette-selection')
  this.$selection.on('click', 'div', _.bind(this.onItemSelected, this))
}

Palette.prototype = {
  onLayerSelected: function(layer) {
    var items = [] 
    var tileset = layer.tileset()
    var image = new Image()

    var $selectTool = this.createItem(new SelectTool(), 'media/selecttool.png')
    items.push($selectTool)

    image.src = tileset.path
    image.onload = _.bind(function() {
      for(var i in tileset.tiles) {
        var tileOffset = tileset.tiles[i]
          , tilex = tileOffset % tileset.countwidth
          , tiley = Math.floor(tileOffset / tileset.countheight)
          , tilewidth = (image.width / tileset.countwidth)
          , tileheight = tilewidth

        var sx = tilex * palettesize
        var sy = tiley * palettesize
        var w = palettesize * tileset.countwidth
        var h = palettesize * tileset.countheight

        var tool = new TileTool(layer, tileOffset)
        var $item = this.createItem(tool, layer.tileset().path)
                        .css({ 'background-position': [
                             -sx, 'px ', -sy, 'px'
                           ].join(''),
                            'background-size': [
                              w, 'px ', h, 'px'
                            ].join('')
                         })

        items.push($item)
      }
      this.$selection.html(items)
    }, this)
    this.select($selectTool)
  },
  createItem: function(tool, image, dimensions) {
   return $('<div/>')
        .css({
          'background-image': ['url(', image, ')'].join(''),
          'background-size': '16px 16px',
          width: '16px',
          height: '16px'
        })
        .data('tool', tool)
  },
  select: function($item) {
    this.$selection.find('div').removeClass('selected')
    $item.addClass('selected')
    var tool = $item.data('tool')
    this.editor.setActiveTool(tool)
  },
  onItemSelected: function(e) {
    var $item = $(e.target)
    this.select($item)
  }
}

module.exports = Palette
