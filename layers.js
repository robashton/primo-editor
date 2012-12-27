define(function(require) {
  var $ = require('jquery')
  var _ = require('underscore')
  var Eventable = require('eventable')
  var EntityLayer = require('./entitylayer')

  var Layers = function(editor) {
    Eventable.call(this)
    this.$layerselection = $('#layer-selection')
    this.$addlayer = $('#btn-add-layer')
    this.$newlayerdialog = $('#new-layer-dialog')
    this.$newlayerdialog.on('click', '.save', _.bind(this.onLayerCreateRequest, this))
    this.$selectedlayer = null
    this.editor = editor
    this.level = null
    this.editor.on('level-changed', _.bind(this.onLevelChanged, this))
    this.$layerselection.on('click', '.layer', _.bind(this.onLayerSelected, this))
    this.$layerselection.on('click', '[type=checkbox]', _.bind(this.onLayerChecked, this))
    this.$addlayer.on('click', _.bind(this.onNewLayerClicked, this))
  }

  Layers.prototype = {
    onLevelChanged: function(level) {
      this.$layerselection.html('')
      this.level = level

      var self = this
      this.level.forEachLayer(function(layer) {
        self.addLayerUi(layer)
      })
      this.level.on('layer-added', _.bind(this.onLayerAdded, this))
      this.selectLayerFromUi(this.$layerselection.find('li').eq(0))
    },
    onLayerAdded: function(layer) {
      this.addLayerUi(layer)
    },
    addLayerUi: function(layer) {
      this.$layerselection.append(
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
    },
    onNewLayerClicked: function() {
      this.updateTilesetList()
      this.$newlayerdialog.modal()
    },
    updateTilesetList: function() {
      $.getJSON('/tilesets', _.bind(this.onTilesetsReceived, this))
    },
    onTilesetsReceived: function(data) {
      var $select = this.$newlayerdialog.find('[name=tileset]')
      var $tilesets = []
      for(var i = 0 ; i < data.length; i++) {
        var tileset = data[i]
        $tilesets.push(
          $('<option/>')
            .attr('value', tileset.link)
            .text(tileset.name)
          )
      }
      $select.html($tilesets)
    },
    onLayerCreateRequest: function() {
      this.editor.createLayer(
        this.$newlayerdialog.find('[name=name]').val(),
        this.$newlayerdialog.find('[name=tileset]').val()
      )
      this.$newlayerdialog.modal('hide')
    },
    onLayerSelected: function(e) {
      var $layer = $(e.target)
      this.selectLayerFromUi($layer)
    },
    selectLayerFromUi: function($layer) {
      var layerData = $layer.data('layer')
      this.$layerselection.find('li').removeClass('selected')
      this.selectedlayer = layerData
      this.$selectedlayer = $layer
      this.$selectedlayer.addClass('selected')
      this.raise('layer-selected', layerData)
    },
    onLayerChecked: function(e) {
      e.stopImmediatePropagation()
      var $checkbox = $(e.target)
        , $layer = $checkbox.parent('.layer')
        , layer = $layer.data('layer')
      
      if($checkbox.attr('checked'))
        layer.show()
      else
        layer.hide()


    }
  }
  _.extend(Layers.prototype, Eventable.prototype)

  return Layers
})
