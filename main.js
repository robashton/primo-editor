define(function(require) {
  var $ = require('jquery')
  var Eventable = require('eventable')
  var _ = require('underscore')
  require('bootstrap')
  
  var Editor = function(targetid) {
    $('.dropdown-toggle').dropdown()
    Eventable.call(this)
    this.targetid = targetid
    this.level = null
    this.levels = null
    this.$controls = $('#controls')
    this.$listoflevels = $('#list-of-levels')
    $.getJSON('/levels', _.bind(this.onLevelsReceived, this))
  }
  Editor.prototype = {
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
              .text(level.filename)
              .data('level', level)
          )
        )
      }
    }
  }
  _.extend(Editor.prototype, Eventable.prototype)

  var editor = new Editor('target')
})
