(function(){var require = function (file, cwd) {
    var resolved = require.resolve(file, cwd || '/');
    var mod = require.modules[resolved];
    if (!mod) throw new Error(
        'Failed to resolve module ' + file + ', tried ' + resolved
    );
    var cached = require.cache[resolved];
    var res = cached? cached.exports : mod();
    return res;
};

require.paths = [];
require.modules = {};
require.cache = {};
require.extensions = [".js",".coffee",".json"];

require._core = {
    'assert': true,
    'events': true,
    'fs': true,
    'path': true,
    'vm': true
};

require.resolve = (function () {
    return function (x, cwd) {
        if (!cwd) cwd = '/';
        
        if (require._core[x]) return x;
        var path = require.modules.path();
        cwd = path.resolve('/', cwd);
        var y = cwd || '/';
        
        if (x.match(/^(?:\.\.?\/|\/)/)) {
            var m = loadAsFileSync(path.resolve(y, x))
                || loadAsDirectorySync(path.resolve(y, x));
            if (m) return m;
        }
        
        var n = loadNodeModulesSync(x, y);
        if (n) return n;
        
        throw new Error("Cannot find module '" + x + "'");
        
        function loadAsFileSync (x) {
            x = path.normalize(x);
            if (require.modules[x]) {
                return x;
            }
            
            for (var i = 0; i < require.extensions.length; i++) {
                var ext = require.extensions[i];
                if (require.modules[x + ext]) return x + ext;
            }
        }
        
        function loadAsDirectorySync (x) {
            x = x.replace(/\/+$/, '');
            var pkgfile = path.normalize(x + '/package.json');
            if (require.modules[pkgfile]) {
                var pkg = require.modules[pkgfile]();
                var b = pkg.browserify;
                if (typeof b === 'object' && b.main) {
                    var m = loadAsFileSync(path.resolve(x, b.main));
                    if (m) return m;
                }
                else if (typeof b === 'string') {
                    var m = loadAsFileSync(path.resolve(x, b));
                    if (m) return m;
                }
                else if (pkg.main) {
                    var m = loadAsFileSync(path.resolve(x, pkg.main));
                    if (m) return m;
                }
            }
            
            return loadAsFileSync(x + '/index');
        }
        
        function loadNodeModulesSync (x, start) {
            var dirs = nodeModulesPathsSync(start);
            for (var i = 0; i < dirs.length; i++) {
                var dir = dirs[i];
                var m = loadAsFileSync(dir + '/' + x);
                if (m) return m;
                var n = loadAsDirectorySync(dir + '/' + x);
                if (n) return n;
            }
            
            var m = loadAsFileSync(x);
            if (m) return m;
        }
        
        function nodeModulesPathsSync (start) {
            var parts;
            if (start === '/') parts = [ '' ];
            else parts = path.normalize(start).split('/');
            
            var dirs = [];
            for (var i = parts.length - 1; i >= 0; i--) {
                if (parts[i] === 'node_modules') continue;
                var dir = parts.slice(0, i + 1).join('/') + '/node_modules';
                dirs.push(dir);
            }
            
            return dirs;
        }
    };
})();

require.alias = function (from, to) {
    var path = require.modules.path();
    var res = null;
    try {
        res = require.resolve(from + '/package.json', '/');
    }
    catch (err) {
        res = require.resolve(from, '/');
    }
    var basedir = path.dirname(res);
    
    var keys = (Object.keys || function (obj) {
        var res = [];
        for (var key in obj) res.push(key);
        return res;
    })(require.modules);
    
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key.slice(0, basedir.length + 1) === basedir + '/') {
            var f = key.slice(basedir.length);
            require.modules[to + f] = require.modules[basedir + f];
        }
        else if (key === basedir) {
            require.modules[to] = require.modules[basedir];
        }
    }
};

(function () {
    var process = {};
    var global = typeof window !== 'undefined' ? window : {};
    var definedProcess = false;
    
    require.define = function (filename, fn) {
        if (!definedProcess && require.modules.__browserify_process) {
            process = require.modules.__browserify_process();
            definedProcess = true;
        }
        
        var dirname = require._core[filename]
            ? ''
            : require.modules.path().dirname(filename)
        ;
        
        var require_ = function (file) {
            var requiredModule = require(file, dirname);
            var cached = require.cache[require.resolve(file, dirname)];

            if (cached && cached.parent === null) {
                cached.parent = module_;
            }

            return requiredModule;
        };
        require_.resolve = function (name) {
            return require.resolve(name, dirname);
        };
        require_.modules = require.modules;
        require_.define = require.define;
        require_.cache = require.cache;
        var module_ = {
            id : filename,
            filename: filename,
            exports : {},
            loaded : false,
            parent: null
        };
        
        require.modules[filename] = function () {
            require.cache[filename] = module_;
            fn.call(
                module_.exports,
                require_,
                module_,
                module_.exports,
                dirname,
                filename,
                process,
                global
            );
            module_.loaded = true;
            return module_.exports;
        };
    };
})();


require.define("path",function(require,module,exports,__dirname,__filename,process,global){function filter (xs, fn) {
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (fn(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

// resolves . and .. elements in a path array with directory names there
// must be no slashes, empty elements, or device names (c:\) in the array
// (so also no leading and trailing slashes - it does not distinguish
// relative and absolute paths)
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length; i >= 0; i--) {
    var last = parts[i];
    if (last == '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// Regex to split a filename into [*, dir, basename, ext]
// posix version
var splitPathRe = /^(.+\/(?!$)|\/)?((?:.+?)?(\.[^.]*)?)$/;

// path.resolve([from ...], to)
// posix version
exports.resolve = function() {
var resolvedPath = '',
    resolvedAbsolute = false;

for (var i = arguments.length; i >= -1 && !resolvedAbsolute; i--) {
  var path = (i >= 0)
      ? arguments[i]
      : process.cwd();

  // Skip empty and invalid entries
  if (typeof path !== 'string' || !path) {
    continue;
  }

  resolvedPath = path + '/' + resolvedPath;
  resolvedAbsolute = path.charAt(0) === '/';
}

// At this point the path should be resolved to a full absolute path, but
// handle relative paths to be safe (might happen when process.cwd() fails)

// Normalize the path
resolvedPath = normalizeArray(filter(resolvedPath.split('/'), function(p) {
    return !!p;
  }), !resolvedAbsolute).join('/');

  return ((resolvedAbsolute ? '/' : '') + resolvedPath) || '.';
};

// path.normalize(path)
// posix version
exports.normalize = function(path) {
var isAbsolute = path.charAt(0) === '/',
    trailingSlash = path.slice(-1) === '/';

// Normalize the path
path = normalizeArray(filter(path.split('/'), function(p) {
    return !!p;
  }), !isAbsolute).join('/');

  if (!path && !isAbsolute) {
    path = '.';
  }
  if (path && trailingSlash) {
    path += '/';
  }
  
  return (isAbsolute ? '/' : '') + path;
};


// posix version
exports.join = function() {
  var paths = Array.prototype.slice.call(arguments, 0);
  return exports.normalize(filter(paths, function(p, index) {
    return p && typeof p === 'string';
  }).join('/'));
};


exports.dirname = function(path) {
  var dir = splitPathRe.exec(path)[1] || '';
  var isWindows = false;
  if (!dir) {
    // No dirname
    return '.';
  } else if (dir.length === 1 ||
      (isWindows && dir.length <= 3 && dir.charAt(1) === ':')) {
    // It is just a slash or a drive letter with a slash
    return dir;
  } else {
    // It is a full dirname, strip trailing slash
    return dir.substring(0, dir.length - 1);
  }
};


exports.basename = function(path, ext) {
  var f = splitPathRe.exec(path)[2] || '';
  // TODO: make this comparison case-insensitive on windows?
  if (ext && f.substr(-1 * ext.length) === ext) {
    f = f.substr(0, f.length - ext.length);
  }
  return f;
};


exports.extname = function(path) {
  return splitPathRe.exec(path)[3] || '';
};

exports.relative = function(from, to) {
  from = exports.resolve(from).substr(1);
  to = exports.resolve(to).substr(1);

  function trim(arr) {
    var start = 0;
    for (; start < arr.length; start++) {
      if (arr[start] !== '') break;
    }

    var end = arr.length - 1;
    for (; end >= 0; end--) {
      if (arr[end] !== '') break;
    }

    if (start > end) return [];
    return arr.slice(start, end - start + 1);
  }

  var fromParts = trim(from.split('/'));
  var toParts = trim(to.split('/'));

  var length = Math.min(fromParts.length, toParts.length);
  var samePartsLength = length;
  for (var i = 0; i < length; i++) {
    if (fromParts[i] !== toParts[i]) {
      samePartsLength = i;
      break;
    }
  }

  var outputParts = [];
  for (var i = samePartsLength; i < fromParts.length; i++) {
    outputParts.push('..');
  }

  outputParts = outputParts.concat(toParts.slice(samePartsLength));

  return outputParts.join('/');
};

});

require.define("__browserify_process",function(require,module,exports,__dirname,__filename,process,global){var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
        && window.setImmediate;
    var canPost = typeof window !== 'undefined'
        && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            if (ev.source === window && ev.data === 'browserify-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('browserify-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

process.binding = function (name) {
    if (name === 'evals') return (require)('vm')
    else throw new Error('No such module. (Possibly not yet loaded)')
};

(function () {
    var cwd = '/';
    var path;
    process.cwd = function () { return cwd };
    process.chdir = function (dir) {
        if (!path) path = require('path');
        cwd = path.resolve(dir, cwd);
    };
})();

});

require.define("/node_modules/primo-events/package.json",function(require,module,exports,__dirname,__filename,process,global){module.exports = {"main":"eventable.js"}
});

require.define("/node_modules/primo-events/eventable.js",function(require,module,exports,__dirname,__filename,process,global){var _ = require('underscore')
var EventContainer = require('./eventcontainer');
  
var Eventable = function() {
  this.eventListeners = {};
  this.eventDepth = 0;
  this.proxies = []
};

Eventable.prototype = {
  autoHook: function(container) {
    for(var key in container) { 
      if(key.indexOf('on') === 0) {
        this.on(key.substr(2), container[key], container);
      }   
    }
  },
  autoUnhook: function(container) {
    for(var key in container) { 
      if(key.indexOf('on') === 0) {
        this.off(key.substr(2), container[key], container);
      }   
    }
  },
  clearListeners: function() {
    this.eventListeners = {};
    this.eventDepth = 0;
    this.proxies = []
  },
  once: function(eventName, callback, context) {
    var self = this;
    var wrappedCallback = function(data, sender) {
      callback.call(this, data, sender);
      self.off(eventName, wrappedCallback, context);
    };
    this.on(eventName, wrappedCallback, context);
  },
  
  on: function(eventName, callback, context) {
    this.eventContainerFor(eventName).add(callback, context);
  },
  
  off: function(eventName, callback, context) {
    this.eventContainerFor(eventName).remove(callback, context);
  },
  raise: function(eventName, data, sender) {
    var container = this.eventListeners[eventName];

    if(container)
      container.raise(sender || this, data);

    var proxies = this.proxies
    for(var i = 0 ; i < proxies.length ; i++)
      proxies[i].raise(eventName, data, sender || this)
  },
  addProxy: function(proxy) {
    this.proxies.push(proxy)
  },
  removeProxy: function(proxy) {
    this.proxies = _.without(this.proxies, proxy)
  },
  eventContainerFor: function(eventName) {
    var container = this.eventListeners[eventName];
    if(!container) {
      container =  new EventContainer(this);
      this.eventListeners[eventName] = container;
    }
    return container;
  }
};

module.exports = Eventable;


});

require.define("/node_modules/underscore/package.json",function(require,module,exports,__dirname,__filename,process,global){module.exports = {"main":"underscore.js"}
});

require.define("/node_modules/underscore/underscore.js",function(require,module,exports,__dirname,__filename,process,global){//     Underscore.js 1.4.4
//     http://underscorejs.org
//     (c) 2009-2013 Jeremy Ashkenas, DocumentCloud Inc.
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var push             = ArrayProto.push,
      slice            = ArrayProto.slice,
      concat           = ArrayProto.concat,
      toString         = ObjProto.toString,
      hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root._ = _;
  }

  // Current version.
  _.VERSION = '1.4.4';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      for (var key in obj) {
        if (_.has(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) return;
        }
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results[results.length] = iterator.call(context, value, index, list);
    });
    return results;
  };

  var reduceError = 'Reduce of empty array with no initial value';

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError(reduceError);
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    return _.filter(obj, function(value, index, list) {
      return !iterator.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    var isFunc = _.isFunction(method);
    return _.map(obj, function(value) {
      return (isFunc ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // containing specific `key:value` pairs.
  _.where = function(obj, attrs, first) {
    if (_.isEmpty(attrs)) return first ? null : [];
    return _[first ? 'find' : 'filter'](obj, function(value) {
      for (var key in attrs) {
        if (attrs[key] !== value[key]) return false;
      }
      return true;
    });
  };

  // Convenience version of a common use case of `find`: getting the first object
  // containing specific `key:value` pairs.
  _.findWhere = function(obj, attrs) {
    return _.where(obj, attrs, true);
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See: https://bugs.webkit.org/show_bug.cgi?id=80797
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity, value: -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed >= result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity, value: Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array.
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    return _.isFunction(value) ? value : function(obj){ return obj[value]; };
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, value, context) {
    var iterator = lookupIterator(value);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value : value,
        index : index,
        criteria : iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index < right.index ? -1 : 1;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(obj, value, context, behavior) {
    var result = {};
    var iterator = lookupIterator(value || _.identity);
    each(obj, function(value, index) {
      var key = iterator.call(context, value, index, obj);
      behavior(result, key, value);
    });
    return result;
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key, value) {
      (_.has(result, key) ? result[key] : (result[key] = [])).push(value);
    });
  };

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key) {
      if (!_.has(result, key)) result[key] = 0;
      result[key]++;
    });
  };

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = iterator == null ? _.identity : lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely convert anything iterable into a real, live array.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (_.isArray(obj)) return slice.call(obj);
    if (obj.length === +obj.length) return _.map(obj, _.identity);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n != null) && !guard) {
      return slice.call(array, Math.max(array.length - n, 0));
    } else {
      return array[array.length - 1];
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    each(input, function(value) {
      if (_.isArray(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Return a completely flattened version of an array.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(concat.apply(ArrayProto, arguments));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var args = slice.call(arguments);
    var length = _.max(_.pluck(args, 'length'));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(args, "" + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, l = list.length; i < l; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, l = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, l + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < l; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var len = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(len);

    while(idx < len) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
  // available.
  _.bind = function(func, context) {
    if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    var args = slice.call(arguments, 2);
    return function() {
      return func.apply(context, args.concat(slice.call(arguments)));
    };
  };

  // Partially apply a function by creating a version that has had some of its
  // arguments pre-filled, without changing its dynamic `this` context.
  _.partial = function(func) {
    var args = slice.call(arguments, 1);
    return function() {
      return func.apply(this, args.concat(slice.call(arguments)));
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length === 0) funcs = _.functions(obj);
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time.
  _.throttle = function(func, wait) {
    var context, args, timeout, result;
    var previous = 0;
    var later = function() {
      previous = new Date;
      timeout = null;
      result = func.apply(context, args);
    };
    return function() {
      var now = new Date;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        timeout = null;
        previous = now;
        result = func.apply(context, args);
      } else if (!timeout) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, result;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) result = func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func];
      push.apply(args, arguments);
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    if (times <= 0) return func();
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys[keys.length] = key;
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var values = [];
    for (var key in obj) if (_.has(obj, key)) values.push(obj[key]);
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var pairs = [];
    for (var key in obj) if (_.has(obj, key)) pairs.push([key, obj[key]]);
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    for (var key in obj) if (_.has(obj, key)) result[obj[key]] = key;
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      if (source) {
        for (var prop in source) {
          if (obj[prop] == null) obj[prop] = source[prop];
        }
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Objects with different constructors are not equivalent, but `Object`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                               _.isFunction(bCtor) && (bCtor instanceof bCtor))) {
        return false;
      }
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    var accum = Array(n);
    for (var i = 0; i < n; i++) accum[i] = iterator.call(context, i);
    return accum;
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + Math.floor(Math.random() * (max - min + 1));
  };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named property is a function then invoke it;
  // otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return null;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name){
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = ++idCounter + '';
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    var render;
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });

      if (escape) {
        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
      }
      if (interpolate) {
        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
      }
      if (evaluate) {
        source += "';\n" + evaluate + "\n__p+='";
      }
      index = offset + match.length;
      return match;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

}).call(this);

});

require.define("/node_modules/primo-events/eventcontainer.js",function(require,module,exports,__dirname,__filename,process,global){var _ = require('underscore');

var EventContainer = function(defaultContext) {
  this.handlers = [];
  this.defaultContext = defaultContext;
}; 

EventContainer.prototype = {
  raise: function(source, data) {
   var handlerLength = this.handlers.length;
   var handlers = this.handlers
   for(var i = 0; i < handlerLength; i++) {
      var handler = handlers[i];
      handler.method.call(handler.context || this.defaultContext, data, source);   
   }
  },
  add: function(method, context) {
    this.handlers.push({
      method: method,
      context: context      
    });
  },
  remove: function(method, context) {
    this.handlers = _(this.handlers).filter(function(item) {
      return item.method !== method || item.context !== context;
    });
  }
};
  
module.exports = EventContainer;

});

require.define("/node_modules/primo/package.json",function(require,module,exports,__dirname,__filename,process,global){module.exports = {"main":"index.js"}
});

require.define("/node_modules/primo/index.js",function(require,module,exports,__dirname,__filename,process,global){var Entity = require('./lib/entity')
var Game = require('./lib/game')

module.exports = {
  DefineEntity: Entity.Define,
  Create: function(targetId) {
    return new Game(targetId)
  }

}

});

require.define("/node_modules/primo/lib/entity.js",function(require,module,exports,__dirname,__filename,process,global){var _ = require('underscore') 
var util = require('primo-utils')
var Eventable = require('primo-events')

var Entity = function(id,data, scene) {
  Eventable.call(this)
  this.id = id
  data = data || {}
  this.x = util.valueOrDefault(data.x, 0)
  this.y = util.valueOrDefault(data.y, 0)
  this.rotation = 0
  this.lastx = this.x
  this.lasty = this.y
  this.velx = util.valueOrDefault(data.velx, 0)
  this.vely = util.valueOrDefault(data.vely, 0)
  this.rotvel = util.valueOrDefault(data.rotvel, 0)
  this.width = util.valueOrDefault(data.width, 0)
  this.height = util.valueOrDefault(data.height, 0)
  this.gravible = false
  this.scene = scene
  this.game = scene.game
  this.components = []
  this.commandHandlers = {}
  this.dispatch = _.bind(this.dispatch, this)
}

Entity.prototype = {
  attach: function(component) {
    this.components.push(component)
    return component
  },
  tick: function(frameTime) {
    this.raise('tick', frameTime)
    _(this.components).each(function(c) { if(c.tick) c.tick(frameTime) })
    this.checkAgainstLevel()
  },
  render: function(context) {
    _(this.components).each(function(c) { if(c.render) c.render(context) })
  },
  handle: function(command, cb) {
    this.commandHandlers[command] = cb
  },
  dispatch: function(command, data) {
    var handler = this.commandHandlers[command]
    if(!handler)
      console.warn('No handler registered for command', command)
    else
      handler(data)
  },
  applyPhysics: function(frameTime) {
    this.scene.applyGravityTo(this)
    this.lastx = this.x
    this.lasty = this.y
    this.x += this.velx * frameTime
    this.y += this.vely * frameTime
    this.rotation += this.rotvel * frameTime
    this.scene.applyGravityTo(this)
  },
  checkAgainstLevel: function() {
    if(!this.scene.level) return
    var level = this.scene.level

    var res = level.checkQuadMovement(
      this.x, this.y, this.width, this.height, 
      this.velx * this.frameTime, this.vely * this.frameTime)

    if(res.horizontal && res.vertical) {
      this.x = res.x
      this.y = res.y
      this.velx = 0
      this.vely = 0
    }
    else if(res.horizontal) {
      this.vely = 0
      this.y = res.y
    } 
    else if(res.vertical) {
      this.velx = 0
      this.x = res.x
    }
    else if(res.collision) {
      this.x = res.x
      this.y = res.y
      this.velx = 0
      this.vely = 0
    }
  },
  kill: function() {
    this.raise('killed')
    this.scene.removeEntity(this)
  }
}

Entity.Define = function(init, methods) {
  var Ctor = function(id, data, game) {
    Entity.call(this, id, data, game)
    init.call(this, id, data)
  }
  _.extend(Ctor.prototype, Entity.prototype)
  if(methods)
    _.extend(Ctor.prototype, methods)
  return Ctor
}
_.extend(Entity.prototype, Eventable.prototype)

module.exports = Entity

});

require.define("/node_modules/primo/node_modules/primo-utils/package.json",function(require,module,exports,__dirname,__filename,process,global){module.exports = {"main":"commons.js"}
});

require.define("/node_modules/primo/node_modules/primo-utils/commons.js",function(require,module,exports,__dirname,__filename,process,global){module.exports = {
  valueOrDefault: function(value, def) {
    return typeof value !== 'undefined' ? 
         value : 
         def
  }
}

});

require.define("/node_modules/primo/lib/game.js",function(require,module,exports,__dirname,__filename,process,global){var Eventable = require('primo-events')
var Timer = require('primo-timer')

var _ = require('underscore')

var Scene = require('./scene')
var Resources = require('./resources')
var Input = require('./input')

var Game = function(targetId) {
  Eventable.call(this)
  this.targetid = targetId
  this.desiredFps = 30
  this.cellsize = 32
  this.gravity = function() {}
  this.frameTime = 1 / this.desiredFps
  this.tickTimer = new Timer(this.desiredFps)
  this.tick = _.bind(this.tick, this)
  this.canvas = document.getElementById(this.targetid)
  this.context = this.canvas.getContext('2d')
  this.scene = new Scene(this)
  this.resources = new Resources()
  this.input = new Input(this.canvas)
}

Game.prototype = {
  reset: function() {
    this.scene.reset()
    this.tickTimer.clearSchedule()
  },
  start: function() {
    this.raise('init')
    setInterval(_.bind(this.doTick, this), this.frameTime * 1000)
  },
  doTick: function() {
    this.tickTimer.tick(this.tick)
    this.render()
  },
  tick: function() {
    this.raise('PreTick', this.frameTime) 
    this.scene.tick(this.frameTime)
    this.raise('PostTick', this.frameTime) 
  },
  render: function() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.scene.render(this.context)
    this.raise('render', this.context)
  },
  scheduleEvent: function(ev, ms) {
    this.tickTimer.schedule(ev, ms)
  }
}

_.extend(Game.prototype, Eventable.prototype)

module.exports = Game

});

require.define("/node_modules/primo/node_modules/primo-timer/package.json",function(require,module,exports,__dirname,__filename,process,global){module.exports = {"main":"timer.js"}
});

require.define("/node_modules/primo/node_modules/primo-timer/timer.js",function(require,module,exports,__dirname,__filename,process,global){var _ = require('underscore')

var Timer = function(desiredFps) {
  this.timeAtLastFrame = new Date().getTime()
  this.idealTimePerFrame = 1000 / desiredFps
  this.leftover = 0
  this.scheduled = []
  this.ticks = 0
}

Timer.prototype = {
  tick: function(cb) {
    var timeAtThisFrame = new Date().getTime()
      , timeSinceLastTick = timeAtThisFrame - this.timeAtLastFrame + this.leftover
      , catchUpFrameCount = Math.floor(timeSinceLastTick / this.idealTimePerFrame)

    for(var i = 0; i < catchUpFrameCount; i++) {
      cb()
      this.ticks++
      this.fireAnyScheduledEvents()
    }

    this.leftover = timeSinceLastTick - (catchUpFrameCount * this.idealTimePerFrame)
    this.timeAtLastFrame = timeAtThisFrame
  },
  schedule: function(cb, ms) {
    this.scheduled.push({
      cb: cb,
      ticks: this.ticks + Math.floor((ms / this.idealTimePerFrame))
    })
  },
  clearSchedule: function() {
    this.scheduled.length = 0
  },
  fireAnyScheduledEvents: function() {
    var remaining = []
    for(var i =0 ; i < this.scheduled.length; i++) {
      var item = this.scheduled[i]
      if(item.ticks <= this.ticks)
        item.cb()
      else
        remaining.push(item)
    }
    this.scheduled = remaining
  }
}

module.exports = Timer


});

require.define("/node_modules/primo/lib/scene.js",function(require,module,exports,__dirname,__filename,process,global){var _ = require('underscore')
var Eventable = require('primo-events')
var Camera = require('primo-camera')
var Level = require('./level')

var Scene = function(game) {
  Eventable.call(this)
  this.level = null
  this.entities = []
  this.layers = []
  this.game = game
  this.context = this.game.context
  this.camera = new Camera(this.context)
  this.camera.makeTopLeftWorldCoords(0,0)
  this.gravityObject = {x: 0, y: 0}
}

Scene.prototype = {
  tick: function(frameTime) {
    for(var i = 0; i < this.entities.length; i++) { 
      var entity = this.entities[i] 
      entity.tick(frameTime)
      entity.applyPhysics(frameTime)
    }
  },
  applyGravityTo: function(entity) {
    if(!entity.gravible) return
    this.gravityObject.x = 0
    this.gravityObject.y = 0
    this.game.gravity(entity, this.gravityObject)
    entity.velx += this.gravityObject.x
    entity.vely += this.gravityObject.y
  },
  render: function(context) {
    this.camera.begin()
    try {
      if(this.level)
        this.level.forEachLayer(_.bind(this.renderLayer, this))
      this.forEachVisibleEntity(function(entity) {
        entity.render(context)
      })
    }
    catch(ex) {
      console.log("problem rendering scene", ex)
    }
    finally {
      this.camera.end()
    }
  },
  loadLevel: function(path) {
    this.level = new Level(this, path)
    this.level.on('loaded', this.onLevelLoaded, this)
  },
  setLevel: function(level) {
    this.level = level
    this.level.loadIntoScene(this)
  },
  onLevelLoaded: function() {
    this.level.loadIntoScene(this)
  },
  reset: function() {
    this.entities = []
    this.clearListeners()
    this.layers = []
  },
  findEntityById: function(id) {
    return _.find(this.entities, function(entity) { return entity.id === id })
  },
  spawnEntity: function(Type, data)  {
    var entity = new Type('entity-' + this.entities.length, data, this)
    this.entities.push(entity)
    entity.addProxy(this)
    return entity
  },
  forEachEntity: function(cb) {
    for(var i = 0; i < this.entities.length; i++) {
      cb(this.entities[i])
    }
  },
  forEachVisibleEntity: function(cb) {
    var camera = this.camera
    this.forEachEntity(function(entity) {
      if(camera.isVisible(entity.x, entity.y, entity.width, entity.height)) cb(entity)
    })
  },
  removeEntity: function(entity) {
    entity.removeProxy(this)
    this.entities = _.without(this.entities, entity)
  },
  addLayer: function(layer) {
    this.layers.push(layer)
  },
  entityAt: function(worldx, worldy) {
    for(var i = 0; i < this.entities.length; i++) {
      var entity = this.entities[i]
      if(entity.x > worldx) continue
      if(entity.y > worldy) continue
      if(entity.x + entity.width < worldx) continue
      if(entity.y + entity.height < worldy) continue
      return entity
    }
    return null
  },
  renderLayer: function(layer) {
    layer.render(this.context)
  },
}
_.extend(Scene.prototype, Eventable.prototype)

module.exports = Scene


});

require.define("/node_modules/primo/node_modules/primo-camera/package.json",function(require,module,exports,__dirname,__filename,process,global){module.exports = {"main":"camera.js"}
});

require.define("/node_modules/primo/node_modules/primo-camera/camera.js",function(require,module,exports,__dirname,__filename,process,global){var Camera = function(context, settings) {
  settings = settings || {}
  this.distance = 1000.0
  this.lookat = [0,0]
  this.context = context
  this.fieldOfView = settings.fieldOfView || Math.PI / 4.0
  this.viewport = {
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    width: 0,
    height: 0,
    scale: [1.0, 1.0]
  }
  this.updateViewport()
}

Camera.prototype = {
  isVisible: function(x, y, width, height) {
    if(x > this.viewport.right) return false
    if(y > this.viewport.bottom) return false
    if(x + width < this.viewport.left) return false
    if(y + height < this.viewport.top) return false
    return true
  },
  begin: function() {
    this.context.save()
    this.applyScale()
    this.applyTranslation()
  },
  end: function() {
    this.context.restore()
  },
  applyScale: function() {
    this.context.scale(this.viewport.scale[0], this.viewport.scale[1])
  },
  applyTranslation: function() {
    this.context.translate(-this.viewport.left, -this.viewport.top)
  },
  updateViewport: function() {
    this.aspectRatio = this.context.canvas.width / this.context.canvas.height
    this.viewport.width = this.distance * Math.tan(this.fieldOfView)
    this.viewport.height = this.viewport.width / this.aspectRatio
    this.viewport.left = this.lookat[0] - (this.viewport.width / 2.0)
    this.viewport.top = this.lookat[1] - (this.viewport.height / 2.0)
    this.viewport.right = this.viewport.left + this.viewport.width
    this.viewport.bottom = this.viewport.top + this.viewport.height
    this.viewport.scale[0] = this.context.canvas.width / this.viewport.width
    this.viewport.scale[1] = this.context.canvas.height / this.viewport.height
  },
  zoomTo: function(z) {
    this.distance = z
    this.updateViewport()
  },
  move: function(x, y) {
    this.lookat[0] += x 
    this.lookat[1] += y
    this.updateViewport()
  },
  moveTo: function(x, y) {
    this.lookat[0] = x
    this.lookat[1] = y
    this.updateViewport()
  },
  canvasToWorld: function(x, y, obj) {
    obj = obj || {}
    x -= this.context.canvas.offsetLeft
    y -= this.context.canvas.offsetTop
    obj.worldx = (x / this.viewport.scale[0]) + this.viewport.left
    obj.worldy = (y / this.viewport.scale[1]) + this.viewport.top
    return obj
  },
  worldToCanvas: function(x, y, obj) {
    obj = obj || {}
    obj.screenx = (x - this.viewport.left) * (this.viewport.scale[0])
    obj.screeny = (y - this.viewport.top) * (this.viewport.scale[1])
    obj.screenx += this.context.canvas.offsetLeft
    obj.screeny += this.context.canvas.offsetTop
    return obj      
  },
  makeTopLeftWorldCoords: function(x,y) {
    this.lookat[0] = x + (this.viewport.width/2.0)
    this.lookat[1] = x + (this.viewport.height/2.0)
    this.updateViewport()
  },
  setViewport: function(x, y, width, height) {
    this.distance = width / Math.tan(this.fieldOfView)
    this.aspectRatio = width / height
    this.updateViewport()
    this.makeTopLeftWorldCoords(x, y)
  },
  scalex: function() {
    return this.viewport.scale[0]
  },
  scaley: function() {
    return this.viewport.scale[1]
  }
}

module.exports = Camera
  

});

require.define("/node_modules/primo/lib/level.js",function(require,module,exports,__dirname,__filename,process,global){var Eventable = require('primo-events')
var _ = require('underscore')
var SpriteMap = require('primo-spritemap')

var Layer = require('./layer')

var Level = function(engine, path) {
  Eventable.call(this)
  this.path = path
  this.rawdata = null
  this.tilesets = {}
  this.spritemaps = {}
  this.entityTypes = {}
  this.pendingResults = 0
  this.finished = false
  this.engine = engine
  this.load()
}

Level.prototype = {
  width: function() {
    return this.rawdata.width
  },
  height: function() {
    return this.rawdata.height
  },
  tilesize: function() {
    return this.rawdata.tilesize
  },
  layerdata: function(index) {
    return this.rawdata.layers[index]
  },
  tileset: function(name) {
    return this.tilesets[name]
  },
  spritemap: function(name) {
    return this.spritemaps[name]
  },
  load: function() {
    $.getJSON(this.path, _.bind(this.onLevelReceived, this))
  },
  worldToTile: function(world) {
    return Math.floor(world / this.rawdata.tilesize)
  },
  checkQuadMovement: function(x, y, width, height, velx, vely, res) {
    var steps = Math.ceil(Math.max(Math.abs(velx), Math.abs(vely)))
    var stepx = velx / steps
    var stepy = vely / steps
    res = res || {}

    var topleft = false, 
        topright = false, 
        bottomleft = false, 
        bottomright = false 

    for(var i = 0 ; i < steps ; i++) {
      var offsetx = stepx * i
      var offsety = stepy * i

      if(this.solidAt(x + offsetx, y + offsety))
        topleft = true

      if(this.solidAt(x + offsetx + width, y + offsety))
        topright = true

      if(this.solidAt(x + offsetx, y + offsety + height))
        bottomleft = true

      if(this.solidAt(x + offsetx + width, y + offsety + height))
        bottomright = true

      if(topleft || topright || bottomleft || bottomright) {
        res.x = x + offsetx - stepx
        res.y = y + offsety - stepy

        if(bottomleft && bottomright)
          res.horizontal = true
        if(topleft && topright)
          res.horizontal = true
        if(topright && bottomright)
          res.vertical = true
        if(topleft && bottomleft)
          res.vertical = true

        res.collision = true

        break
      }
    }
    return res
  },
  solidAt: function(worldx, worldy) {
    var x = parseInt(worldx, 10)
    var y = parseInt(worldy, 10)
    if(x < 0) return false
    if(y < 0) return false
    if(x >= this.width() * this.rawdata.tilesize) return false
    if(y >= this.height() * this.rawdata.tilesize) return false

    for(var i = 0 ; i < this.layers.length; i++) {
      var layer = this.layers[i]
      if(layer.iscollision() && layer.solidAt(x, y)) return true
    }
    return false
  },
  layerCount: function() {
    return this.data.layers.length
  },
  onLevelReceived: function(rawdata) {
    this.rawdata = rawdata
    this.tilesets = {}
    this.entityTypes = {}
    this.layers = []
    this.loadLayers()
    this.loadEntities()
    this.finished = true
    this.tryFinish()
  },
  loadLayers: function() {
    for(var i = 0 ; i < this.rawdata.layers.length; i++) 
      this.loadLayer(i)
  },
  addLayer: function(data) {
    var i = this.rawdata.layers.length
    this.rawdata.layers.push(data)
    this.layers.push(new Layer(this, i))
    this.loadLayer(i)
  },
  loadLayer: function(i) {
    var layer = this.rawdata.layers[i]
    var tilesets = this.tilesets
    var spritemaps = this.spritemaps
    var collisionmaps = this.collisionmaps
    var tilesize = this.tilesize()
    var engine = this.engine

    this.require(layer.tileset, function(tileset) {
      tilesets[layer.tileset] = tileset
      spritemaps[layer.tileset] = 
        engine.resources.spritemap(tileset.path, tileset.tilesize, tileset.tilesize)
      spritemaps[layer.tileset].generateCollisionMaps(tilesize, tilesize)
    })
  },
  loadEntities: function() {
    for(var key in this.rawdata.entityTypes)  {
      this.loadEntity(key)
    }
  },
  loadEntity: function(key) {
    var path = this.rawdata.entityTypes[key]
    var entities = this.entityTypes
    this.require(path, function(type) {
      entities[key] = type
    })
  },
  require: function(dep, callback) {
    var self = this
    this.pendingResults++
    require([dep], function(res) {
       callback(res)
       self.pendingResults--
       self.tryFinish()
    })
  },
  tryFinish: function() {
    if(this.pendingResults === 0 && this.finished) {
      this.createLayers()
      this.raise('loaded')
    }
  },
  createLayers: function() {
    for(var i = 0 ; i < this.rawdata.layers.length; i++) {
      this.layers[i] = new Layer(this, i)
    }
  },
  forEachLayer: function(cb) {
    for(var i = 0 ; i < this.layers.length; i++) {
      cb(this.layers[i])
    }
  },
  loadIntoScene: function(scene) {
    scene.reset()
    var i = 0
    for(i = 0; i < this.rawdata.entities.length; i++) {
      var config = this.rawdata.entities[i]
      var type = this.entityTypes[config.type]
      scene.spawnEntity(type, config.data)
    }
  },
  indexForWorldCoords: function(x, y) {
    var tilex = Math.floor(x / this.rawdata.tilesize)
    var tiley = Math.floor(y / this.rawdata.tilesize)
    var index = tilex + tiley * this.rawdata.width
    return index
  },
  setTileAt: function(layer, x, y, tile) {
    var index = this.indexForWorldCoords(x, y)
    this.rawdata.layers[layer].data[index] = tile
  },
  getTileAt: function(layer, x, y, tile) {
    var index = this.indexForWorldCoords(x, y)
    return this.rawdata.layers[layer].data[index] 
  }
}

_.extend(Level.prototype, Eventable.prototype)

module.exports = Level


});

require.define("/node_modules/primo/node_modules/primo-spritemap/package.json",function(require,module,exports,__dirname,__filename,process,global){module.exports = {"main":"spritemap.js"}
});

require.define("/node_modules/primo/node_modules/primo-spritemap/spritemap.js",function(require,module,exports,__dirname,__filename,process,global){var _ = require('underscore')
var MemoryCanvas = require('primo-canvas')
var Eventable = require('primo-events')

var SpriteMap = function(texture, tilecountwidth, tilecountheight) {
  Eventable.call(this)
  this.tilewidth = 0
  this.tileheight = 0
  this.tilecountwidth = tilecountwidth || 1
  this.tilecountheight = tilecountheight || 1
  this.tilecount = tilecountwidth * tilecountheight 
  this.collisionmapsize = 0
  this.collisionMaps = []
  this.texture = texture
  this.loaded = false
  this.texture.waitForLoaded(_.bind(this.onLoaded, this))
}

SpriteMap.prototype = {
  drawTo: function(context, index,  x, y, width, height, flipx, flipy, rotation) {
    if(!this.loaded) return

    var img = this.texture.get()

    var rownumber = Math.floor(index / this.tilecountwidth)
    var columnnumber = index % this.tilecountwidth

    var sx = columnnumber * this.tilewidth
    var sy = rownumber * this.tileheight

    var scalex = flipx ? -1 : 1
    var scaley = flipy ? -1 : 1
    var contextSaved = false

    if(rotation) {
      if(!contextSaved) {
        contextSaved = true
        context.save()
      }
      context.translate(x + width/2.0, y + height/2.0)
      context.rotate(rotation)
      context.translate(-(x + width/2.0),-(y + height/2.0))
    }

    if(flipx || flipy) {
      if(!contextSaved) {
        contextSaved = true
        context.save()
      }
      context.scale(scalex, scaley)
      x *= scalex
      y *= scaley
      if(flipx)
        x -= width
      if(flipy)
        y -= height
      contextSaved = true
    } 


    context.drawImage(img, 
      sx, sy, this.tilewidth, this.tileheight,
      x, y , width || this.tilewidth, height || this.tileheight)

    if(contextSaved) 
      context.restore()
  },
  generateCollisionMaps: function(width, height) {
    if(!this.loaded) 
      return this.once('loaded', 
        function() { 
          this.generateCollisionMaps(width, height) }, this)

    // TODO: This doesn't really belong here, it needs storing elsewhere or returning
    this.collisionmapsize = width
    var canvas = new MemoryCanvas(width, height)

    try {
      for(var i = 0; i < this.tilecount ; i++) {
        canvas.reset()
        this.drawTo(canvas.context, i, 0, 0, width, height)
        this.collisionMaps[i] = canvas.createMap()
      }
    }
    catch(ex) {
      throw ex
    }
    finally {
      canvas.dispose()
    }
  },
  hasPixelAt: function(index, x, y) {
    if(!this.loaded) return false
    var map = this.collisionMaps[index]
    return map[x + y * this.collisionmapsize]
  },
  onLoaded: function() {
    this.loaded = true
    var img = this.texture.get()
    this.tilewidth = img.width / this.tilecountwidth
    this.tileheight = img.height / this.tilecountheight
    this.raise('loaded')
  }
}
_.extend(SpriteMap.prototype, Eventable.prototype)

module.exports = SpriteMap

});

require.define("/node_modules/primo/node_modules/primo-spritemap/node_modules/primo-canvas/package.json",function(require,module,exports,__dirname,__filename,process,global){module.exports = {"main":"memorycanvas.js"}
});

require.define("/node_modules/primo/node_modules/primo-spritemap/node_modules/primo-canvas/memorycanvas.js",function(require,module,exports,__dirname,__filename,process,global){var MemoryCanvas = function(width, height) {
  this.width = width
  this.height = height
  this.canvas = document.createElement('canvas')
  this.canvas.width = width 
  this.canvas.height = height 
  this.context = this.canvas.getContext('2d')
}
MemoryCanvas.prototype = {
  reset: function() {
    this.context.setTransform(1, 0, 0, 1, 0, 0)
    this.context.clearRect(0,0, this.width, this.height)
  },
  setup: function(width, height) {
    this.reset()

    var scalex = this.width / width
      , scaley = this.height / height

    this.context.scale(scalex, scaley)
  },
  getImage: function() {
    return this.canvas.toDataURL()
  },
  createMap: function() {
    var data = this.context.getImageData(0,0, this.width, this.height).data
    var map = new Array(this.width * this.height)
    for(var y = 0; y < this.height; y++) {
      for(var x = 0; x < this.width; x++) {
        var index = x + y*this.width
        var pixelindex = index * 4
        var total = data[pixelindex] + data[pixelindex+1] + data[pixelindex+2]
        if(total)
          map[index] = 1
        else
          map[index] = 0
      }
    }
    return map
  },
  dispose: function() {
    document.removeElement(this.canvas)
  }
}
module.exports = MemoryCanvas

});

require.define("/node_modules/primo/lib/layer.js",function(require,module,exports,__dirname,__filename,process,global){var SpriteMap = require('primo-spritemap')

var Layer = function(level, index) {
  this.level = level
  this.config = this.level.layerdata(index)
  this.index = index
  this.hidden = false
}
Layer.prototype = {
  name: function() {
    return this.config.name
  },
  tileset: function() {
    return this.level.tileset(this.config.tileset)
  },
  setTileAt: function(x, y, tile) {
    this.level.setTileAt(this.index, x, y, tile)
  },
  getTileAt: function(x, y, tile) {
    return this.level.getTileAt(this.index, x, y, tile)
  },
  iscollision: function(value) {
    if(typeof value !== 'undefined') {
      this.config.collision = value
    }
    return !!this.config.collision
  },
  solidAt: function(x, y) {
    var tilex = parseInt( x / this.level.tilesize(), 10)
    var tiley = parseInt( y / this.level.tilesize(), 10)
    var remainderx = x % this.level.tilesize()
    var remaindery = y % this.level.tilesize()

    var index = this.config.data[tilex + tiley * this.level.width()]
    if(index === null) return false
    return this.spritemap().hasPixelAt(index, remainderx, remaindery)
  },
  hide: function() {
    this.hidden = true
  },
  show: function() {
    this.hidden = false
  },
  spritemap: function() {
    return this.level.spritemap(this.config.tileset)
  },
  render: function(context) {
    if(this.hidden) return
    for(var x = 0; x < this.level.width() ; x++) {
      for(var y = 0; y < this.level.height() ; y++) {
        var index = x + (y * this.level.width())
        var left = x * this.level.tilesize()
        var top = y * this.level.tilesize()

        if(this.config.data[index] === null)
          continue

        this.spritemap().drawTo(context, 
          this.config.data[index], 
          left, top, this.level.tilesize(), this.level.tilesize());
      }
    }
  }
}
module.exports = Layer

});

require.define("/node_modules/primo/lib/resources.js",function(require,module,exports,__dirname,__filename,process,global){var SpriteMap = require('primo-spritemap')
var SoundResource = require('primo-audio')
var TextureResource = require('./textureresource')

var Resources = function() {
  this.cache = {}
  this.waitingForCount = 0
}

Resources.prototype = {
  spritemap: function(path, spritewidth, spriteheight) {
    var image = this.image(path)
    return new SpriteMap(image, spritewidth, spriteheight)
  },
  image: function(path) {
    var resource = this.cache[path]
    if(!resource) {
      resource = new TextureResource(path)
      this.cache[path] = resource
      this.registerLoadingResource(resource)
    }
    return resource
  },
  sound: function(path) {
    var resource = this.cache[path]
    if(!resource) {
      resource = new SoundResource(path)
      this.cache[path] = resource
      this.registerLoadingResource(resource)
    }
    return resource
  },
  registerLoadingResource: function(resource) {
    this.waitingForCount++
    resource.once('loaded', function() {
      this.waitingForCount--
    }, this)
  }
}

module.exports = Resources


});

require.define("/node_modules/primo/node_modules/primo-audio/package.json",function(require,module,exports,__dirname,__filename,process,global){module.exports = {"main":"primo-audio.js"}
});

require.define("/node_modules/primo/node_modules/primo-audio/primo-audio.js",function(require,module,exports,__dirname,__filename,process,global){var _ = require('underscore')
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

});

require.define("/node_modules/primo/lib/textureresource.js",function(require,module,exports,__dirname,__filename,process,global){var _ = require('underscore')
  , Eventable = require('primo-events')

var TextureResource = function(path) {
  Eventable.call(this)
  this.path = path
  this.loaded = false
  this.image = new Image()
  this.image.src = path
  this.image.onload = _.bind(this.onLoaded, this)
}

TextureResource.prototype = {
  get: function() {
    return this.image
  },
  onLoaded: function() {
    this.loaded = true
    this.raise('loaded')
  },
  waitForLoaded: function(cb) {
    if(this.loaded) cb()
    else this.once('loaded', cb)
  }
}

_.extend(TextureResource.prototype, Eventable.prototype)

module.exports = TextureResource

});

require.define("/node_modules/primo/lib/input.js",function(require,module,exports,__dirname,__filename,process,global){var _ = require('underscore')
var Eventable = require('primo-events')

var Input = function(ele) {
  Eventable.call(this)
  document.addEventListener('keydown', _.bind(this.onKeyDown, this))
  document.addEventListener('keyup', _.bind(this.onKeyUp, this))
  this.aliases = {}
  this.states = {}
}

Input.prototype = {
  bind: function(keycode, alias) {
    this.aliases[keycode] = alias
  },
  onKeyDown: function(e) {
    var alias = this.aliases[e.keyCode]
    if(alias) {
      this.states[alias] = true
    }
    this.raise('keydown', e.keyCode)
    return false
  },
  onKeyUp: function(e) {
    var alias = this.aliases[e.keyCode]
    if(alias) {
      this.states[alias] = false
    }
    this.raise('keyup', e.keyCode)
    return false
  },
  active: function(alias) {
    return !!this.states[alias]
  },
  LEFT_ARROW: 37,
  UP_ARROW: 38,
  RIGHT_ARROW: 39,
  DOWN_ARROW: 40,
  LEFT_CTRL: 17,
  RETURN: 13
}

_.extend(Input.prototype, Eventable.prototype)

module.exports = Input


});

require.define("/site/toolbar.js",function(require,module,exports,__dirname,__filename,process,global){var Eventable = require('primo-events')
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

});

require.define("/site/leveleditor.js",function(require,module,exports,__dirname,__filename,process,global){var Eventable = require('primo-events')
var _ = require('underscore')

// Should this be a standalone module?
var Level = {}; //require('../engine/level')

var LevelEditor = function(path) {
  Eventable.call(this)
  this.path = path
  this.layers = []
  this.level = new Level(path)
  this.level.on('loaded', this.onLevelReceived, this)
}

LevelEditor.prototype = {
  onLevelReceived: function() {
    this.raise('loaded')
  },
  save: function() {
    $.ajax({
      type: "PUT",
      url: this.path,
      data: JSON.stringify(this.data),
      contentType: "application/json"
    })
  },
  createLayer: function(name, tileset) {
    var tileData = this.createDataForNewLayer()
    this.data.layers.push({
      name: name,
      tileset: tileset,
      data: tileData
    })
    var self = this
    require([tileset], function(data) {
      self.level.layers.push({
        name: name,
        tileset: data,
        data: tileData
      })
    })
    this.raise('layer-added', this.layers[this.layers.length-1])
  },
  createDataForNewLayer: function() {
    var data = []
    for(var i =0 ; i < this.data.width; i++) {
      for(var j = 0; j < this.data.height; j++) {
        data.push(null)
      }
    }
    return data
  },
}
_.extend(LevelEditor.prototype, Eventable.prototype)

module.exports = LevelEditor

});

require.define("/site/layers.js",function(require,module,exports,__dirname,__filename,process,global){var _ = require('underscore')
var Eventable = require('primo-events')
var EntityLayer = require('./entitylayer')

var Layers = function(editor) {
  Eventable.call(this)
  this.$layerselection = $('#layer-selection')
  this.$addlayer = $('#btn-add-layer')
  this.$newlayerdialog = $('#new-layer-dialog')
  this.$newlayerdialog.on('click', '.save', _.bind(this.onLayerCreateRequest, this))
  this.$selectedlayer = null
  this.editor = editor
  this.level = null
  this.editor.on('level-changed', _.bind(this.onLevelChanged, this))
  this.$layerselection.on('click', '.layer', _.bind(this.onLayerSelected, this))
  this.$layerselection.on('click', '[name=layervisible]', _.bind(this.onLayerChecked, this))
  this.$layerselection.on('click', '[name=collision]', _.bind(this.onCollisionChanged, this))
  this.$addlayer.on('click', _.bind(this.onNewLayerClicked, this))
}

Layers.prototype = {
  onLevelChanged: function(level) {
    this.$layerselection.html('')
    this.level = level

    var self = this
    this.level.forEachLayer(function(layer) {
      self.addLayerUi(layer)
    })
    this.level.on('layer-added', _.bind(this.onLayerAdded, this))
    this.selectLayerFromUi(this.$layerselection.find('li').eq(0))
  },
  onLayerAdded: function(layer) {
    this.addLayerUi(layer)
  },
  addLayerUi: function(layer) {
    this.$layerselection.append(
      $('<li/>')
        .addClass('layer')
        .data('layer', layer)
        .append(
          $('<input type="checkbox" name="layervisible"/>')
            .attr('checked', 'checked')
        )
        .append(
          $('<span/>')
          .text(layer.name())
        )
        .append(
          $('<div/>').addClass('controls')
          .append([
            $('<label/>').attr('for', 'collision')
                         .text('Collision'),

            $('<input type="checkbox" name="collision"/>')
                         .attr('checked', layer.iscollision() ? "checked" : false),
          ])
        )
      )
  },
  onNewLayerClicked: function() {
    this.updateTilesetList()
    this.$newlayerdialog.modal()
  },
  updateTilesetList: function() {
    $.getJSON('/tilesets', _.bind(this.onTilesetsReceived, this))
  },
  onTilesetsReceived: function(data) {
    var $select = this.$newlayerdialog.find('[name=tileset]')
    var $tilesets = []
    for(var i = 0 ; i < data.length; i++) {
      var tileset = data[i]
      $tilesets.push(
        $('<option/>')
          .attr('value', tileset.link)
          .text(tileset.name)
        )
    }
    $select.html($tilesets)
  },
  onLayerCreateRequest: function() {
    this.editor.createLayer(
      this.$newlayerdialog.find('[name=name]').val(),
      this.$newlayerdialog.find('[name=tileset]').val()
    )
    this.$newlayerdialog.modal('hide')
  },
  onLayerSelected: function(e) {
    var $layer = $(e.target)
    this.selectLayerFromUi($layer)
  },
  selectLayerFromUi: function($layer) {
    var layerData = $layer.data('layer')
    this.$layerselection.find('li').removeClass('selected')
    this.selectedlayer = layerData
    this.$selectedlayer = $layer
    this.$selectedlayer.addClass('selected')
    this.raise('layer-selected', layerData)
  },
  onCollisionChanged: function(e) {
    e.stopImmediatePropagation()
    var $checkbox = $(e.target)
      , $layer = $checkbox.parents('.layer')
      , layer = $layer.data('layer')
    
    layer.iscollision(!!$checkbox.attr('checked'))
  },
  onLayerChecked: function(e) {
    e.stopImmediatePropagation()
    var $checkbox = $(e.target)
      , $layer = $checkbox.parent('.layer')
      , layer = $layer.data('layer')
    
    if($checkbox.attr('checked'))
      layer.show()
    else
      layer.hide()


  }
}
_.extend(Layers.prototype, Eventable.prototype)

module.exports = Layers

});

require.define("/site/entitylayer.js",function(require,module,exports,__dirname,__filename,process,global){  var EntityLayer = function() {

  }
  EntityLayer.prototype = {
    name: function() {
      return "Entities"
    }
  }
  module.exports = EntityLayer

});

require.define("/site/palette.js",function(require,module,exports,__dirname,__filename,process,global){var _ = require('underscore')
var TileTool = require('./tiletool')
var SelectTool = require('./selecttool')

var Palette = function(editor) {
  this.editor = editor
  this.editor.layers.on('layer-selected', _.bind(this.onLayerSelected, this))
  this.$selection = $('#palette-selection')
  this.$selection.on('click', 'div', _.bind(this.onItemSelected, this))
}

Palette.prototype = {
  onLayerSelected: function(layer) {
    var items = [] 
    var tileset = layer.tileset()
    var image = new Image()

    var $selectTool = this.createItem(new SelectTool(), '/media/selecttool.png')
    items.push($selectTool)

    image.src = tileset.path
    image.onload = _.bind(function() {
      for(var i in tileset.tiles) {
        var tileOffset = tileset.tiles[i]
        var delta = tileset.tilesize * tileOffset  
        var sx = delta % image.width
        var sy = parseInt(delta / image.width, 10) * tileset.tilesize

        var tool = new TileTool(layer, tileOffset)
        var $item = this.createItem(tool, layer.tileset().path)
                        .css({ 'background-position': [
                           -sx, 'px ', -sy, 'px'
                     ].join('')})

        items.push($item)
      }
      this.$selection.html(items)
    }, this)
    this.select($selectTool)
  },
  createItem: function(tool, image) {
   return $('<div/>')
        .css({
          'background-image': ['url(', image, ')'].join(''),
          width: '16px',
          height: '16px'
        })
        .data('tool', tool)
  },
  select: function($item) {
    this.$selection.find('div').removeClass('selected')
    $item.addClass('selected')
    var tool = $item.data('tool')
    this.editor.setActiveTool(tool)
  },
  onItemSelected: function(e) {
    var $item = $(e.target)
    this.select($item)
  }
}

module.exports = Palette

});

require.define("/site/tiletool.js",function(require,module,exports,__dirname,__filename,process,global){
var TileTool = function(layer, tile) {
  this.layer = layer
  this.tile = tile
  this.editor = null
  this.onInputTap = _.bind(this.onInputTap, this)
  this.onDragStart = _.bind(this.onDragStart, this)
  this.onDrag = _.bind(this.onDrag, this)
}

TileTool.prototype = {
  activate: function(editor) {
    this.editor = editor
    this.editor.input.cursor('pointer')
    this.editor.input.on('tap', this.onInputTap)
    this.editor.input.on('dragstart', this.onDragStart)
    this.editor.input.on('drag', this.onDrag)
  },
  deactivate: function() {
    this.editor.input.cursor('default')
    this.editor.input.off('tap', this.onInputTap)
    this.editor.input.off('dragstart', this.onDragStart)
    this.editor.input.off('drag', this.onDrag)
  },
  onInputTap: function(ev) {
    this.editor.executeAction(
      new SetTileAction(ev.worldx, ev.worldy, this.layer, this.tile))
  },
  onDragStart: function(ev) {
    this.editor.executeAction(
      new SetTileAction(ev.worldx, ev.worldy, this.layer, this.tile))
  },
  onDrag: function(ev) {
    this.editor.executeAction(
      new SetTileAction(ev.worldx, ev.worldy, this.layer, this.tile))
  }
}

var SetTileAction = function(worldx, worldy, layer, tile) {
  this.worldx = worldx
  this.worldy = worldy
  this.layer = layer
  this.tile = tile
  this.oldtile = null
}

SetTileAction.prototype = {
  invoke: function() {
    this.oldtile = this.layer.getTileAt(this.worldx, this.worldy)
    this.layer.setTileAt(this.worldx, this.worldy, this.tile)
  },
  undo: function() {
    this.layer.setTileAt(this.worldx, this.worldy, this.oldtile)
  }
}

module.exports = TileTool

});

require.define("/site/selecttool.js",function(require,module,exports,__dirname,__filename,process,global){var SelectTool = function() {
  this.onInputTap = _.bind(this.onInputTap, this)
  this.onDragStart = _.bind(this.onDragStart, this)
  this.onDrag = _.bind(this.onDrag, this)
  this.onDragEnd = _.bind(this.onDragEnd, this)
}

SelectTool.prototype = {
  activate: function(editor) {
    this.editor = editor
    this.camera = this.editor.engine.camera
    this.editor.input.cursor('pointer')
    this.editor.input.on('tap', this.onInputTap)
    this.editor.input.on('dragstart', this.onDragStart)
    this.editor.input.on('drag', this.onDrag)
    this.editor.input.on('dragend', this.onDragEnd)
  },
  deactivate: function() {
    this.editor.input.cursor('default')
    this.editor.input.off('tap', this.onInputTap)
    this.editor.input.off('dragstart', this.onDragStart)
    this.editor.input.off('drag', this.onDrag)
    this.editor.input.off('dragend', this.onDragEnd)
  },
  onInputTap: function(ev) {
    console.log(this.editor.level.solidAt(ev.worldx, ev.worldy))
    var entity = this.editor.engine.entityAt(ev.worldx, ev.worldy)
    this.editor.selectEntity(entity)
  },
  onDragStart: function(ev) {
    console.log(ev.screenx, ev.screeny)
    var start = this.camera.screenToWorld(
      ev.screenx - ev.distancex,
      ev.screeny - ev.distancey)
    var entity = this.editor.engine.entityAt(start.worldx, start.worldy)
    this.editor.selectEntity(entity)
    if(entity)
      this.startMovingEntity(ev, entity)
    else
      this.moveCamera(ev)
  },
  onDrag: function(ev) {
    if(this.movingEntity)  
      this.moveEntity(ev)
    else
      this.moveCamera(ev)
  },
  onDragEnd: function() {
    this.movingEntity = null
  },
  moveEntity: function(ev) {
    this.movingEntity.configuration({
      x: this.movingEntity.x + ev.distancex / this.camera.scalex(),
      y: this.movingEntity.y + ev.distancey / this.camera.scaley(),
    })
    this.editor.render()
  },
  moveCamera: function(ev) {
    this.camera.move(-ev.distancex / this.camera.scalex(),
                     -ev.distancey / this.camera.scaley())
    this.editor.render()
  },
  startMovingEntity: function(ev, entity) {
    this.movingEntity = entity
    this.moveEntity(ev)
  }
}
module.exports = SelectTool

});

require.define("/site/input.js",function(require,module,exports,__dirname,__filename,process,global){var Eventable = require('primo-events')

// TODO: Probably not an NPM module yet
var Hammer = {} //= require('hammer')
var _ = require('underscore')

var Input = function(elementid, camera) {
  Eventable.call(this)
  this.element = document.getElementById(elementid)
  this.camera = camera
  this.hammer = new Hammer(this.element)
  this.hammer.ontap = _.bind(this.onTap, this)
  this.hammer.ondragstart = _.bind(this.onDragStart, this)
  this.hammer.ondrag = _.bind(this.onDrag, this)
  this.hammer.ondragend = _.bind(this.onDragEnd, this)
  this.ev = {}
  this.lastdistance = { x: 0, y: 0 }
}

Input.prototype = {
  cursor: function(cursor) {
    this.element.style.cursor = cursor
  },
  onTap: function(ev) {
    this.camera.screenToWorld(
      ev.position[0].x,
      ev.position[0].y,
      this.ev
    )
    this.ev.screenx = ev.position[0].x
    this.ev.screeny = ev.position[0].y
    this.raise('tap', this.ev)
  },
  onDragStart: function(ev) {
    this.camera.screenToWorld(
      ev.position.x + this.element.offsetLeft,
      ev.position.y + this.element.offsetTop,
      this.ev
    )
    this.ev.screenx = ev.position.x + this.element.offsetLeft
    this.ev.screeny = ev.position.y + this.element.offsetTop
    this.ev.distancex = ev.distanceX 
    this.ev.distancey = ev.distanceY
    this.lastdistance.x = ev.distanceX
    this.lastdistance.y = ev.distanceY
    this.raise('dragstart', this.ev)
  },
  onDrag: function(ev) {
    this.camera.screenToWorld(
      ev.position.x + this.element.offsetLeft,
      ev.position.y + this.element.offsetTop,
      this.ev
    )
    this.ev.screenx = ev.position.x + this.element.offsetLeft
    this.ev.screeny = ev.position.y + this.element.offsetTop
    this.ev.distancex = ev.distanceX - this.lastdistance.x 
    this.ev.distancey = ev.distanceY - this.lastdistance.y
    this.lastdistance.x = ev.distanceX
    this.lastdistance.y = ev.distanceY
    this.raise('drag', this.ev)
  },
  onDragEnd: function(ev) {
    this.raise('dragend')
  }
}
_(Input.prototype).extend(Eventable.prototype)

module.exports = Input

});

require.define("/site/entities.js",function(require,module,exports,__dirname,__filename,process,global){  var _ = require('underscore')
    , Eventable = require('primo-events')
    , MemoryCanvas = require('primo-canvas')
    , EntityPlaceTool = require('./entityplacetool')

  var Entities = function(editor) {
    Eventable.call(this)
    this.editor = editor
    this.canvas = new MemoryCanvas(50,50)
    this.$entities = $('#entity-selection')
    this.populateEntities()
    this.$entities.on('click', '.entity', _.bind(this.onEntitySelected, this))
  }
  Entities.prototype = {
    populateEntities: function() {
      $.getJSON('/entities', _.bind(this.onEntitiesReceived, this))
    },
    onEntitiesReceived: function(entities) {
      for(var i =0 ; i < entities.length; i++) {
        this.loadEntity(entities[i].link)
      }
    },
    loadEntity: function(path) {
      var self = this
      require([path], function(Type) {
        self.onEntityReceived(path, Type)
      })
    },
    onEntityReceived: function(path, EntityType) {
      var blah = new EntityType('editor', {x: 0, y: 0}, this.editor.engine)
      this.canvas.setup(blah.width, blah.height)
      blah.render(this.canvas.context)
      var imageData = this.canvas.getImage()
      this.$entities.append(
        $('<img/>').attr('src', imageData)
                   .attr('width', 25)
                   .attr('height', 25)
                   .addClass('entity')
                   .data('tool', new EntityPlaceTool(
                     path,
                     EntityType
                   ))
      )
    },
    onEntitySelected: function(ev) {
      var $entity = $(ev.target)
      var tool = $entity.data('tool')
      this.$entities.find('img').removeClass('selected')
      this.$selectedentity = $entity
      this.$selectedentity.addClass('selected')
      this.editor.setActiveTool(tool)
    }
  }
  _.extend(Entities.prototype, Eventable.prototype)

  module.exports = Entities

});

require.define("/node_modules/primo-canvas/package.json",function(require,module,exports,__dirname,__filename,process,global){module.exports = {"main":"memorycanvas.js"}
});

require.define("/node_modules/primo-canvas/memorycanvas.js",function(require,module,exports,__dirname,__filename,process,global){var MemoryCanvas = function(width, height) {
  this.width = width
  this.height = height
  this.canvas = document.createElement('canvas')
  this.canvas.width = width 
  this.canvas.height = height 
  this.context = this.canvas.getContext('2d')
}
MemoryCanvas.prototype = {
  reset: function() {
    this.context.setTransform(1, 0, 0, 1, 0, 0)
    this.context.clearRect(0,0, this.width, this.height)
  },
  setup: function(width, height) {
    this.reset()

    var scalex = this.width / width
      , scaley = this.height / height

    this.context.scale(scalex, scaley)
  },
  getImage: function() {
    return this.canvas.toDataURL()
  },
  createMap: function() {
    var data = this.context.getImageData(0,0, this.width, this.height).data
    var map = new Array(this.width * this.height)
    for(var y = 0; y < this.height; y++) {
      for(var x = 0; x < this.width; x++) {
        var index = x + y*this.width
        var pixelindex = index * 4
        var total = data[pixelindex] + data[pixelindex+1] + data[pixelindex+2]
        if(total)
          map[index] = 1
        else
          map[index] = 0
      }
    }
    return map
  },
  dispose: function() {
    document.removeElement(this.canvas)
  }
}
module.exports = MemoryCanvas

});

require.define("/site/entityplacetool.js",function(require,module,exports,__dirname,__filename,process,global){var EntityPlaceTool = function(path, Type) {
  this.path = path
  this.Type = Type
  this.editor = null
  this.trackedEntity = null
  this.onInputTap = _.bind(this.onInputTap, this)
  this.onDragStart = _.bind(this.onDragStart, this)
  this.onDrag = _.bind(this.onDrag, this)
}
EntityPlaceTool.prototype = {
  activate: function(editor) {
    this.editor = editor
    this.editor.input.cursor('pointer')
    this.editor.input.on('tap', this.onInputTap)
    this.editor.input.on('dragstart', this.onDragStart)
    this.editor.input.on('drag', this.onDrag)
  },
  deactivate: function() {
    this.editor.input.cursor('default')
    this.editor.input.off('tap', this.onInputTap)
    this.editor.input.off('dragstart', this.onDragStart)
    this.editor.input.off('drag', this.onDrag)
  },
  onInputTap: function(ev) {
    this.editor.addEntity(ev.worldx, ev.worldy, this.path, this.Type)
  },
  onDragStart: function(ev) {
    this.trackedEntity = this.editor.addEntity(ev.worldx, ev.worldy, this.path, this.Type)
  },
  onDrag: function(ev) {
    this.trackedEntity.configuration({
      x: ev.worldx,
      y: ev.worldy
    })
    this.editor.render()
  }
}
module.exports = EntityPlaceTool

});

require.define("/site/currentselection.js",function(require,module,exports,__dirname,__filename,process,global){var CurrentSelection = function(editor) {
  this.editor = editor
  this.editor.on('entity-selection-changed', _.bind(this.onEntitySelectionChanged,this))
  this.editor.on('rendered', _.bind(this.onRender, this))
  this.$selection = $('#selection-indicator')
  this.$selection.css({
      "position": "absolute",
      "border": "1px solid #0F0",
      "pointer-events": "none"
  })

  this.engine = this.editor.engine
}
CurrentSelection.prototype = {
  onEntitySelectionChanged: function(entity) {
    this.selectedEntity = entity
  },
  onRender: function() {
    if(this.selectedEntity) {
      var topleft = this.engine.camera.worldToScreen(
        this.selectedEntity.x, this.selectedEntity.y)
      var bottomright = this.engine.camera.worldToScreen(
        this.selectedEntity.x + this.selectedEntity.width,
        this.selectedEntity.y + this.selectedEntity.height)

      this.$selection.css({
        "top": topleft.screeny + "px",
        "left": topleft.screenx + "px",
        "height": (bottomright.screeny - topleft.screeny) + "px",
        "width": (bottomright.screenx - topleft.screenx )+ "px"
      })

      this.$selection.show()
    }
    else {
      this.$selection.hide()
    }
  }
}
module.exports = CurrentSelection

});

require.define("/site/main.js",function(require,module,exports,__dirname,__filename,process,global){var Eventable = require('primo-events')
var Runner = require('primo')

var Toolbar = require('./toolbar')
var Layers = require('./layers')
var Palette = require('./palette')
var Input = require('./input')
var Entities = require('./entities')
var CurrentSelection = require('./currentselection')

// TODO Needs to be its own module
var Level = {} // require('../engine/level')

var Editor = function(targetid) {
  Eventable.call(this)
  this.targetid = targetid
  this.level = null
  this.selectedEntity = null
  this.engine = new Runner(targetid)
  this.toolbar = new Toolbar(this)
  this.layers = new Layers(this)
  this.palette = new Palette(this)
  this.entities = new Entities(this)
  this.selection = new CurrentSelection(this)
  this.input = new Input(targetid, this.engine.camera)
  this.toolbar.on('level-selected', _.bind(this.onLevelSelected, this))
  this.activeTool = null
  this.$leveltitle = $('.level-title')
  setInterval(_.bind(this.render, this), 500)
}

Editor.prototype = {
  render: function() {
    this.engine.render()
    this.raise('rendered')
  },
  selectEntity: function(entity) {
    this.selectedEntity = entity
    this.raise('entity-selection-changed', entity)
  },
  onLevelSelected: function(path) {
    this.level = new Level(this.engine, path)
    this.level.on('loaded', this.onLevelLoaded, this)
  },
  onLevelLoaded: function() {
    this.engine.setLevel(this)
    this.$leveltitle.text(this.level.path)
    this.raise('level-changed', this.level)
  },
  setActiveTool: function(tool) {
    if(this.activeTool)
      this.activeTool.deactivate()
    this.activeTool = tool
    if(this.activeTool)
      this.activeTool.activate(this)
  },
  executeAction: function(action) {
    action.invoke()
    this.render()
  },
  /*
   * Yes, this is a leaky bit of cover up around 'level'
   * I'll sleep on it
   */
  loadIntoGame: function(game) {
    game.reset()
    for(var i = 0; i < this.level.rawdata.entities.length; i++) {
      var config = this.level.rawdata.entities[i]
      var type = this.level.entityTypes[config.type]
      var entity = game.spawnEntity(type, config.data)
      this.hookEntity(entity, config)
    }
  },
  forEachLayer: function(cb) {
    this.level.forEachLayer(cb)
  },
  createEntityData: function(x, y, path, Type) {
    var type = this.registerEntityType(path, Type)
    var entityData =  {
      type: type,
      data: {
        x: x,
        y: y
      }
    }
    this.level.rawdata.entities.push(entityData)
    return entityData
  },
  registerEntityType: function(path, Type) {
    var lastSlash = path.lastIndexOf('/')
    var type = path.substr(lastSlash+1, path.length - (lastSlash+1))
    this.level.entityTypes[type] = Type
    this.level.rawdata.entityTypes[type] = path
    return type
  },
  hookEntity: function(entity, config) {
    entity.configuration = function(data) {
      if(data)
        config.data = data
      if(data.x) entity.x = data.x
      if(data.y) entity.y = data.y
      return config.data
    }
  },
  addEntity: function(x, y, path, Type) {
    var rawdata = this.createEntityData(x,y,path,Type)
    var entity = this.engine.spawnEntity(Type, {
      x: x,
      y: y
    })
    this.hookEntity(entity, rawdata)
    return entity
  },
  createLayer: function(name, tileset) {
    this.level.addLayer({
      data: this.createDataForNewLayer(),
      tileset: tileset,
      name: name
    })
    this.raise('layer-added')
  },
  createDataForNewLayer: function() {
    var data = []
    for(var i =0 ; i < this.level.width(); i++) {
      for(var j = 0; j < this.level.height() ; j++) {
        data.push(null)
      }
    }
    return data
  },
  /* * * * * * * * * * *  * */

  getTileAt: function(layer, x, y) {
    return this.levelEditor.getTileAt(layer, x, y)
  },
  setTileAt: function(layer, x, y, tile) {
    this.levelEditor.setTileAt(layer, x, y, tile)
  },
  save: function()  {
    $.ajax({
      type: "PUT",
      url: this.level.path,
      data: JSON.stringify(this.level.rawdata),
      contentType: "application/json"
    })
  }
}
_.extend(Editor.prototype, Eventable.prototype)

var editor = new Editor('target')

});
require("/site/main.js");
})();

