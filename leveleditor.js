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
    },
    save: function() {
      var sb = []
      var paths = []
      var names = []
      for(var k in this.requires) {
        paths.push("'" + this.requires[k] + "'")
        names.push(k)
      }

      sb.push('define([')
      sb.push(paths.join(',\n'))
      sb.push('], function(')
      sb.push(names.join(',\n'))
      sb.push('){')

      // So much for code as data
      sb.push("var level = {")
       
      sb.push("width: " + this.level.width + ',')
      sb.push("height: " + this.level.height + ',')
      sb.push("tilesize: " + this.level.tilesize + ",")
      sb.push("layers: [")

      for(var i = 0 ; i < this.level.layers.length; i++) {
        var layer = this.level.layers[i]
        sb.push("{")
        sb.push("name: " + layer.name + ",")
        sb.push("tileset: " + typeof layer.tileset + ",")
        sb.push("data: " + JSON.stringify(layer.data))
        sb.push("}")
        sb.push(",")
      }

      sb.push("],")

      // Entities


      sb.push("}")
      sb.push('return level')
      sb.push('})')

      var rawdata = sb.join('\n')
      console.log(rawdata)
    }
  }
  _.extend(LevelEditor.prototype, Eventable.prototype)

  return LevelEditor
})
