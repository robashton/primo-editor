define(function(require) {
  var $ = require('jquery')
  var _ = require('underscore')
  var Eventable = require('eventable')
  var LayerEditor = require('./layereditor')


  var Layers = function(editor) {
    Eventable.call(this)
    this.$layerselection = $('#layer-selection')
    this.$addlayer = $('#btn-add-layer')
    this.$newlayerdialog = $('#new-layer-dialog')
    this.$newlayerdialog.on('click', '.save', _.bind(this.onLayerCreated, this))
    this.$selectedlayer = null
    this.editor = editor
    this.level = null
    this.editor.on('level-changed', _.bind(this.onLevelChanged, this))
    this.$layerselection.on('click .layer', _.bind(this.onLayerSelected, this))
    this.$addlayer.on('click', _.bind(this.onNewLayerClicked, this))
  }

  Layers.prototype = {
    onLevelChanged: function(level) {
      var layers = []
      for(var i = 0 ; i < level.layers.length; i++) {
        var layer = level.layers[i]
        layers.push(
          $('<li/>')
            .addClass('layer')
            .data('layer', layer)
            .append(
              $('<input type="checkbox" name="layervisible"/>')
                .attr('checked', 'checked')
            )
            .append(
              $('<span/>')
              .text(layer.name())
            )
          )
      }
      this.$layerselection.html(layers)
    },
    onNewLayerClicked: function() {
      this.$newlayerdialog.modal()
    },
    onLayerCreated: function() {
      this.editor.createLayer(
        this.$newlayerdialog.find('[name=name]').val(),
        this.$newlayerdialog.find('[name=tileset]').val()
      )
    },
    onLayerSelected: function(e) {
      var $layer = $(e.target)
      var layerData = $layer.data('layer')
      this.$layerselection.find('li').removeClass('selected')
      this.selectedlayer = layerData
      this.$selectedlayer = $layer
      this.$selectedlayer.addClass('selected')
      this.raise('layer-selected', layerData)
    }
  }
  _.extend(Layers.prototype, Eventable.prototype)

  return Layers
})
