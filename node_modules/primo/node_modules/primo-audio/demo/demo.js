var Sound = require('../primo-audio')
var sound = new Sound("media/pickup")

var buttons = document.getElementsByTagName("input")
for(var i = 0; i < buttons.length; i++) {
  var button = buttons[i]
  button.onclick = playSound
}

function playSound(e) {
  var times = parseInt(this.getAttribute('value'), 10)
  for(var i = 0 ; i < times; i++)
    sound.play()
}


sound.on('loaded', function() {
  var info = document.getElementById('info')
  info.innerText = [
    'URI', sound.rawdata.src
  ].join('\n')
})


sound.on('error', function(err) {
  info.innerText += '\n' + err
})
