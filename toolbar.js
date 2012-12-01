define(function(require) {
  var $ = require('jquery')
  var Eventable = require('eventable')
  var _ = require('underscore')
  require('bootstrap')

  var Toolbar = function(editor) {
    Eventable.call(this)
    $('.dropdown-toggle').dropdown()
    this.$listoflevels = $('#list-of-levels')
    this.$listoflevels.on('click a', _.bind(this.onLevelSelected,this))
    this.levels = null
    this.entities = null
    this.editor = editor
    $.getJSON('/levels', _.bind(this.onLevelsReceived, this))
    $.getJSON('/entities', _.bind(this.onEntitiesReceived, this))
  }

  Toolbar.prototype = {
    onEntitiesReceived: function(entities) {
      this.entities = entities
      this.tryStart()
    },
    onLevelsReceived: function(levels) {
      this.levels = levels
      this.tryStart()
    },
    tryStart: function() {
      if(this.levels && this.entities)
        this.start()
    },
    start: function() {
      for(var i = 0 ; i < this.levels.length; i++) {
        var level = this.levels[i]
        this.$listoflevels.append(
          $('<li/>').html(
            $('<a/>')
              .attr('href', '#')
              .text(level.name)
              .data('level', level)
          )
        )
      }
    },
    onLevelSelected: function(e) {
      var level = $(e.target).data('level')
      var self = this
      require([level.link], function(level) {
        self.raise('level-loaded', level)
      })
    }
  }
  _.extend(Toolbar.prototype, Eventable.prototype)
  return Toolbar
})
