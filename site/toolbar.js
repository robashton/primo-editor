var Eventable = require('primo-events')
var _ = require('underscore')
var LevelEditor = require('./leveleditor')

var Toolbar = function(editor) {
  Eventable.call(this)
  $('.dropdown-toggle').dropdown()
  this.$newleveldialog = $('#new-level-dialog')
  this.$listoflevels = $('#list-of-levels')
  this.$listoflevels.on('click', 'a.level', _.bind(this.onLevelSelected,this))
  this.$listoflevels.on('click', '#btn-save-level', _.bind(this.onLevelSave, this))
  this.$listoflevels.on('click', '#btn-create-level', _.bind(this.onLevelCreate, this))
  this.$newleveldialog.on('click', '.save', _.bind(this.onLevelCreateConfirmation, this))
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
    this.raise('level-selected', level.link)
  },

  onLevelSave: function() {
    this.editor.save()
  },
  onLevelCreate: function() {
    $('#new-level-dialog').modal()
  },
  onLevelCreateConfirmation: function() {
    var self = this
    var data = {
      width: this.$newleveldialog.find("[name=width]").val(),
      height: this.$newleveldialog.find("[name=height]").val(),
      name: this.$newleveldialog.find("[name=name]").val(),
      tilesize: this.$newleveldialog.find("[name=tilesize]").val(),
    }
    var url = "/game/levels/" + data.name + '.json'

    $.ajax({
        url: url,
        type: "PUT",
        contentType: "application/json",
        data: JSON.stringify({
          entityTypes: {},
          entities: [],
          layers: [],
          width: data.width,
          height: data.height,
          tilesize: data.tilesize
      }),
      success: function() {
        self.$newleveldialog.modal('hide')
        self.raise('level-selected', url)
      }
    })
  }
}
_.extend(Toolbar.prototype, Eventable.prototype)

module.exports = Toolbar
