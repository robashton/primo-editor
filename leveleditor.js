define(function(require) {
  var Eventable = require('eventable')
  var $ = require('jquery')
  var _ = require('underscore')

  var LevelEditor = function(path) {
    Eventable.call(this)
    this.path = path
    this.level = null
    this.requires = {}
    this.loadData()
  }

  LevelEditor.prototype = {
    loadData: function() {
      this.requireLevel()
      this.parseLevel()
    },
    requireLevel: function() {
      require([this.path],  _.bind(this.onLevelReceived, this))
    },
    parseLevel: function() {
      $.get(this.path + '.js', _.bind(this.onRawFileReceived, this))
    },
    onLevelReceived: function(level) {
      this.level = level
    },
    onRawFileReceived: function(raw) {
      var paths = this.extractPaths(raw)
      var names = this.extractNames(raw)
      for(var i =0 ; i < paths.length; i++) {
        this.requires[names[i].trim()] = paths[i].trim()
                                          .replace(/(\'|\")/gm, '')
      }
      this.raise('ready')
    },
    extractPaths: function(raw) {
      var beginDeps = raw.indexOf('[')
      var endDeps = raw.indexOf(']')
      var deps = raw.substr(beginDeps + 1, endDeps - beginDeps - 1)
                  .split(',')
      return deps
    },
    extractNames: function(raw) {
      var beginNames = raw.indexOf('(', raw.indexOf(']'))
      var endNames = raw.indexOf(')', raw.indexOf(']'))
      var names = raw.substr(beginNames + 1, endNames-beginNames-1)
                     .split(',')
      return names
    }
  }
  _.extend(LevelEditor.prototype, Eventable.prototype)

  return LevelEditor
})
