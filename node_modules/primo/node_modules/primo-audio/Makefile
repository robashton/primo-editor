all: concat
	 
concat:
	browserify demo/demo.js > demo/demo-built.js
	lumber -d demo/media -p *.mp3
	lumber -d demo/media -p *.wav
	lumber -d demo/media -p *.ogg

watch:
	browserify demo/demo.js -o demo/demo-built.js --watch --debug


