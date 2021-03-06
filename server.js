var http = require('http')
  , send = require('send')
  , url = require('url')
  , path = require('path')
  , fs = require('fs')
  , app = require('express')()
  , _ = require('underscore')
  , argv = require('optimist').argv
  , dir = argv.dir

var server = http.createServer(app).listen(8080)
app.use(require('express').bodyParser())

app.put('/levels/:file', function(req, res) {
   fs.writeFile(dir + '/levels/' + req.params.file, JSON.stringify(req.body), 'utf8', function(err) {
     if(err) {
       res.statusCode = 500
       res.end('' + err)
     } else {
       res.end('success')
     }
   })
})

app.get('/levels', function(req, res) {
  fs.readdir(dir + '/levels', function(err, files) {
    var levels = _(files).map(function(file) {
        return { name: file, link: '../levels/' + file }
    })
    res.send(levels)
  })
})

app.get('/tilesets', function(req, res) {
  fs.readdir(dir + '/tilesets', function(err, files) {
    var tilesets = _(files).map(function(file) {
        return { name: file, link: '../tilesets/' + file }
    })
    res.send(tilesets)
  })
})

app.get('/entities', function(req, res) {
  fs.readdir('site/entities', function(err, files) {
    var levels = _(files).map(function(file) {
        return { name: file, link: '../entities/' + file.split('.')[0] }
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

  var filepath = ''
  if(req.url.indexOf('/editor') === 0) {
    req.url = req.url.substr(8)
    filepath = path.join(__dirname, 'site')
  }
  else {
    filepath = dir
  }

  send(req, url.parse(req.url).pathname)
    .root(filepath)
    .on('error', error)
    .on('directory', redirect)
    .pipe(res);
})

server.listen(8080);
