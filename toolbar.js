define(function(require) {
  var $ = require('jquery')
  var Eventable = require('eventable')
  var _ = require('underscore')
  var LevelEditor = require('./leveleditor')

  require('bootstrap')

  var Toolbar = function(editor) {
    Eventable.call(this)
    $('.dropdown-toggle').dropdown()
    this.$listoflevels = $('#list-of-levels')
    this.$listoflevels.on('click a.level', _.bind(this.onLevelSelected,this))
    this.$listoflevels.on('click #btn-save-level', _.bind(this.onLevelSave, this))
    this.$listoflevels.on('click #btn-create-level', _.bind(this.onLevelCreate, this))
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
              .addClass('level')
              .text(level.name)
              .data('level', level)
          )
        )
      }
    },
    onLevelSelected: function(e) {
      var level = $(e.target).data('level')
      var editor = new LevelEditor(level.link)
      editor.on('ready', function() {
        this.raise('level-loaded', editor)
      }, this)
    },
    onLevelSave: function() {
      // this.editor.saveLevel()
    },
    onLevelCreate: function() {
      // Show dialog asking for name and all that
    }
  }
  _.extend(Toolbar.prototype, Eventable.prototype)
  return Toolbar
})
