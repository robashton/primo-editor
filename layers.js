define(function(require) {
  var $ = require('jquery')
  var _ = require('underscore')

  var Layers = function(editor) {
    this.$layerselection = $('#layer-selection')
    this.editor = editor
    this.level = null
    this.editor.on('level-changed', _.bind(this.onLevelChanged, this))
  }
  Layers.prototype = {
    onLevelChanged: function(level) {
      var layers = []
      for(var i = 0 ; i < level.layers.length; i++) {
        var layer = level.layers[i]
        layers.push(
          $('<li/>')
            .append(
              $('<input type="checkbox" name="layervisible"/>')
                .attr('checked', 'checked')
            )
            .append(
              $('<input type="text" name="layername"/>')
                .val(layer.name)
            )
          )
      }
      this.$layerselection.html(layers)
    }
  }

  return Layers
})
