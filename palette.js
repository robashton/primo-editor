define(function(require) {
  var $ = require('jquery')
  var _ = require('underscore')
  var TileTool = require('./tiletool')
  var SelectTool = require('./selecttool')

  var Palette = function(editor) {
    this.editor = editor
    this.editor.layers.on('layer-selected', _.bind(this.onLayerSelected, this))
    this.$selection = $('#palette-selection')
    this.$selection.on('click div', _.bind(this.onItemSelected, this))
  }

  Palette.prototype = {
    onLayerSelected: function(layerEditor) {
      var items = [] 
      var layer = layerEditor.layer
      var tileset = layer.tileset
      var image = new Image()

      items.push(this.createItem(new SelectTool(), '/media/selecttool.png'))

      image.src = tileset.path
      image.onload = _.bind(function() {
        for(var i in tileset.tiles) {
          var tileOffset = tileset.tiles[i]
          var delta = tileset.tilesize * tileOffset  
          var sx = delta % image.width
          var sy = parseInt(delta / image.width, 10) * tileset.tilesize

          var tool = new TileTool(layerEditor, tileOffset)
          var $item = this.createItem(tool, layer.tileset.path)
                          .css({ 'background-position': [
                             -sx, 'px ', -sy, 'px'
                       ].join('')})

          items.push($item)
        }
        this.$selection.html(items)
      }, this)
    },
    createItem: function(tool, image) {
     return $('<div/>')
          .css({
            'background-image': ['url(', image, ')'].join(''),
            width: '16px',
            height: '16px'
          })
          .data('tool', tool)
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
