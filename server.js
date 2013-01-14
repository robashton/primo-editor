var http = require('http');
var send = require('send');
var url = require('url');
var path = require('path')
var fs = require('fs')
var app = require('express')()
var _ = require('underscore')

var server = http.createServer(app).listen(8080)
app.use(require('express').bodyParser())

app.put('/game/levels/:file', function(req, res) {
   fs.writeFile('site/game/levels/' + req.params.file, JSON.stringify(req.body), 'utf8', function(err) {
     if(err) {
       res.statusCode = 500
       res.end('' + err)
     } else {
       res.end('success')
     }
   })
})

app.get('/levels', function(req, res) {
  fs.readdir('site/game/levels', function(err, files) {
    var levels = _(files).map(function(file) {
        return { name: file, link: '../game/levels/' + file }
    })
    res.send(levels)
  })
})

app.get('/tilesets', function(req, res) {
  fs.readdir('site/game/tilesets', function(err, files) {
    var tilesets = _(files).map(function(file) {
        return { name: file, link: '../game/tilesets/' + file }
    })
    res.send(tilesets)
  })
})

app.get('/entities', function(req, res) {
  fs.readdir('site/game/entities', function(err, files) {
    var levels = _(files).map(function(file) {
        return { name: file, link: '../game/entities/' + file.split('.')[0] }
    })
    res.send(levels)
  })
})

app.use(function(req, res) {
  function error(err) {
    res.statusCode = err.status || 500;
    res.end(err.message);
  }
  function redirect() {
    res.statusCode = 301;
    res.setHeader('Location', req.url + '/');
    res.end('Redirecting to ' + req.url + '/');
  }
  send(req, url.parse(req.url).pathname)
    .root(path.join(__dirname, 'site'))
    .on('error', error)
    .on('directory', redirect)
    .pipe(res);
})

server.listen(8080);
