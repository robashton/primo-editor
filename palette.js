define(function(require) {
  var $ = require('jquery')
  var _ = require('underscore')

  var Palette = function(editor) {
    this.editor = editor
    this.editor.layers.on('layer-selected', _.bind(this.onLayerSelected, this))
    this.$selection = $('#palette-selection')
  }
  Palette.prototype = {
    onLayerSelected: function(layer) {
      var items = [] 
      for(var i in layer.tileset.tiles) {
        var tile = layer.tileset.tiles[i]
        items.push( 
          $('<li/>')
            .append(
              $('<a/>')
              .css({
                'background-image': tile.path,
                width: tile.tilesize + 'px',
                height: tile.tilesize + 'px'
              })
            )
        )
      }
      this.$selection.html(items)
    }
  }

  return Palette
})
