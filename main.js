define(function(require) {
  var $ = require('jquery')
  var Eventable = require('eventable')
  var Runner = require('../engine/core')
  var _ = require('underscore')
  require('bootstrap')

  
  var Editor = function(targetid) {
    $('.dropdown-toggle').dropdown()
    Eventable.call(this)
    this.targetid = targetid
    this.level = null
    this.levels = null
    this.entities = null
    this.$controls = $('#controls')
    this.$listoflevels = $('#list-of-levels')
    this.engine = new Runner(targetid)
    $.getJSON('/levels', _.bind(this.onLevelsReceived, this))
    $.getJSON('/entities', _.bind(this.onEntitiesReceived, this))
    this.$listoflevels.on('click a', _.bind(this.onLevelSelected,this))
    setInterval(_.bind(this.render, this), 500)
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
        self.engine.loadLevel(level)
      })
    },
    render: function() {
      this.engine.render()
    }
  }
  _.extend(Editor.prototype, Eventable.prototype)

  var editor = new Editor('target')
})
