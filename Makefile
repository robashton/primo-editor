all: concat
	 
concat:
	browserify site/main.js > site/main-built.js

watch:
	browserify site/main.js -o site/main-built.js --watch --debug


