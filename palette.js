define(function(require) {
  var $ = require('jquery')
  var _ = require('underscore')

  var TileTool = function(layer, tile) {
    this.layer = layer
    this.tile = tile
  }

  TileTool.prototype = {
    render: function(context, x, y) {

    },
    apply: function(x, y) {

    }
  }

  var Palette = function(editor) {
    this.editor = editor
    this.editor.layers.on('layer-selected', _.bind(this.onLayerSelected, this))
    this.$selection = $('#palette-selection')
    this.$selection.on('click div', _.bind(this.onItemSelected, this))
  }
  Palette.prototype = {
    onLayerSelected: function(layer) {
      var items = [] 
      var tileset = layer.tileset
      var image = new Image()
      image.src = tileset.path
      image.onload = _.bind(function() {
        for(var i in tileset.tiles) {
          var tile = tileset.tiles[i]
          var delta = tileset.tilesize * tile  
          var sx = delta % image.width
          var sy = parseInt(delta / image.width, 10) * tileset.tilesize

          var tool = new TileTool(layer, tile)

          items.push( 
            $('<div/>')
             .css({
               'background-image': [ 'url(', layer.tileset.path, ')'].join(''),
               'background-position': [
                 -sx, 'px ', -sy, 'px'
               ].join(''),
                width: layer.tileset.tilesize + 'px',
                height: layer.tileset.tilesize + 'px'
            })
            .data('tool', tool)
          )
        }
        this.$selection.html(items)
      }, this)
    },
    onItemSelected: function(e) {
      var $item = $(e.target)
      this.$selection.find('div').removeClass('selected')
      $item.addClass('selected')
      var tool = $item.data('tool')
      this.editor.setActiveTool(tool)
    }
  }

  return Palette
})
