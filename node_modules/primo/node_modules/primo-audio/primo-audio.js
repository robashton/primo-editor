var _ = require('underscore')
  , Eventable = require('primo-events')

var Sound = function(path) {
  Eventable.call(this)

  Sound.initSystem()
  this.path = path
  this.loadedPath = ''
  this.rawdata = null
  if(!Sound.Enabled) return
  this.detectAudio()
}
Sound.prototype = {
  detectAudio: function() {
    var attempts = [ loadmp3, loadogg, loadaac, loadwav ]
    var self = this
    var success = function(rawdata) {
      self.rawdata = rawdata
      self.raise('loaded')
    }
    var tryNext = function() {
      if(attempts.length === 0) {
        console.warn('Unable to load audio for ', self.path)
        return
      }
      var fn = attempts.shift()
      fn(self.path, success, tryNext)
    }
    tryNext()
  },
  play: function() {
    if(!Sound.Enabled) return
    var audio = this.getAudio()
    audio.pause()
    audio.currentTime = 0
    try {
      audio.play()
    } catch (ex) {
      this.raise('error', ex)
    }
  },
  getAudio: function() {
    return this.rawdata
  }
}
_.extend(Sound.prototype, Eventable.prototype)

Sound.allowBase64 = false // Shouldn't be needed if I get everthing else right
Sound.initSystem = function() {
  if(this.initialized) return
  var a = document.createElement('audio')
  this.Enabled = !!a.canPlayType
  this.mp3 = !!(a.canPlayType && a.canPlayType('audio/mpeg;').replace(/no/, ''))
  this.ogg = !!(a.canPlayType && a.canPlayType('audio/ogg; codecs="vorbis"').replace(/no/, ''))
  this.wav = !!(a.canPlayType && a.canPlayType('audio/wav; codecs="1"').replace(/no/, ''))
  this.aac = !!(a.canPlayType && a.canPlayType('audio/mp4; codecs="mp4a.40.2"').replace(/no/, ''))
}

function downloadFile(path, cb) {
  var xmlHttp = new XMLHttpRequest()
  xmlHttp.onreadystatechange = function() {
    if(xmlHttp.readyState === 4) {
      cb(xmlHttp.responseText)
    }
  }
  xmlHttp.open( "GET", path, true )
  xmlHttp.send( null )
}



function handleAudioLoading(audio, cb) {

  var force = function () {
    audio.pause();
    audio.removeEventListener('play', force, false);
    if(cb) { cb(); cb = null; }
  };

  var progress = function () {
    audio.removeEventListener('play', force, false);
    audio.removeEventListener('progress', progress, false);
    if(cb) { cb(); cb = null; }
  };

  audio.addEventListener('play', force, false);
  audio.addEventListener('progress', progress, false);

  var click = document.ontouchstart === undefined ? 'click' : 'touchstart';
  var kickoff = function () {
    audio.play();
    document.documentElement.removeEventListener(click, kickoff, true);
  };

  document.documentElement.addEventListener(click, kickoff, true);
}

function tryBase64(mime, path, success, failure) {
  if(!Sound.allowBase64) return failure()
  downloadFile(path, function(data) {
    if(!data) return failure
    var audio = new Audio()
    audio.src = mime + ';base64,' + data
    handleAudioLoading(audio, function() {
      success(audio)
    })
  })
}

function tryAudio(path, success, failure) {
  var audio = new Audio()
  try { 
    audio.src = path
  } catch(ex) {
    return failure()
  }
  handleAudioLoading(audio, function() {
    success(audio)
  })
}

function loadmp3(path, success, failure) {
  if(!Sound.mp3) return failure()
  tryBase64('data:audio/mp3', path + '.mp3.base64', success, function() {
     tryAudio(path + '.mp3', success, failure)
   })
}

function loadogg(path, success, failure) {
  if(!Sound.ogg) return false
  tryBase64('data:audio/ogg', path + '.ogg.base64', success, function() {
    tryAudio(path + '.ogg', success, failure)
  })
}
function loadaac(path, success, failure) {
  if(!Sound.aac) return false
  tryBase64('data:audio/mp4', path + '.mp4.base64', success, function() {
     tryAudio(path + '.mp4', success, failure)
  })
}

function loadwav(path, success, failure) {
  if(!Sound.wav) return false
  tryBase64('data:audio/wav', path + '.wav.base64', success, function() {
   tryAudio(path + '.wav', success, failure)
  })
}

module.exports = Sound
