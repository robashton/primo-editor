define(function(require) {
  var $ = require('jquery')
  var _ = require('underscore')

  var TileTool = function(layer, tile) {
    this.layer = layer
    this.tile = tile
    this.editor = null
    this.onInputTap = _.bind(this.onInputTap, this)
    this.onDragStart = _.bind(this.onDragStart, this)
    this.onDrag = _.bind(this.onDrag, this)
  }

  TileTool.prototype = {
    activate: function(editor) {
      this.editor = editor
      this.editor.input.cursor('pointer')
      this.editor.input.on('tap', this.onInputTap)
      this.editor.input.on('dragstart', this.onDragStart)
      this.editor.input.on('drag', this.onDrag)
    },
    deactivate: function() {
      this.editor.input.cursor('default')
      this.editor.input.off('tap', this.onInputTap)
      this.editor.input.off('dragstart', this.onDragStart)
      this.editor.input.off('drag', this.onDrag)
    },
    onInputTap: function(ev) {
      this.editor.executeAction(
        new SetTileAction(ev.worldx, ev.worldy, this.layer, this.tile))
    },
    onDragStart: function(ev) {
      this.editor.executeAction(
        new SetTileAction(ev.worldx, ev.worldy, this.layer, this.tile))
    },
    onDrag: function(ev) {
      this.editor.executeAction(
        new SetTileAction(ev.worldx, ev.worldy, this.layer, this.tile))
    }
  }

  var SetTileAction = function(worldx, worldy, layer, tile) {
    this.worldx = worldx
    this.worldy = worldy
    this.layer = layer
    this.tile = tile
    this.oldtile = null
  }

  SetTileAction.prototype = {
    invoke: function() {
      this.oldtile = this.layer.getTileAt(this.worldx, this.worldy)
      this.layer.setTileAt(this.worldx, this.worldy, this.tile)
    },
    undo: function() {
      this.layer.setTileAt(this.worldx, this.worldy, this.oldtile)
    }
  }

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
      image.src = tileset.path
      image.onload = _.bind(function() {
        for(var i in tileset.tiles) {
          var tileOffset = tileset.tiles[i]
          var delta = tileset.tilesize * tileOffset  
          var sx = delta % image.width
          var sy = parseInt(delta / image.width, 10) * tileset.tilesize

          var tool = new TileTool(layerEditor, tileOffset)

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
