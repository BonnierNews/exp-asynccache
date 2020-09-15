"use strict";
var LRU = require("lru-cache-plus");
var EventEmitter = require("events");
var util = require("util");

function AsyncCache(cache) {
  this.cache = cache || new LRU();
  this.pending = {};

  if (typeof this.cache.on === "function") {
    var self = this;
    this.cache.on("error", function (err) {
      self.emit("error", err);
    });
  }
  EventEmitter.call(this);
}

util.inherits(AsyncCache, EventEmitter);

AsyncCache.prototype.get = function (key, callback) {
  return Promise.resolve(this.cache.get(key)).then(function (data) {
    if (typeof callback === "function") {
      callback(null, data);
    }
    return data;
  }, function (err) {
    if (typeof callback === "function") {
      callback(err);
    } else {
      throw err;
    }
  });
};

AsyncCache.prototype.has = function (key, callback) {
  return Promise.resolve(this.cache.has(key)).then(function (exists) {
    if (typeof callback === "function") {
      callback(null, exists);
    }
    return exists;
  }, function (err) {
    if (typeof callback === "function") {
      callback(err);
    } else {
      throw err;
    }
  });
};

AsyncCache.prototype.set = function (key, value, maxAge, callback) {
  if (typeof maxAge === "function") {
    callback = maxAge;
    maxAge = null;
  }
  return Promise.resolve(this.cache.set(key, value, maxAge)).then(function () {
    if (typeof callback === "function") {
      callback();
    }
  }, function (err) {
    if (typeof callback === "function") {
      callback(err);
    } else {
      throw err;
    }
  });
};

AsyncCache.prototype.del = function (key, callback) {
  return Promise.resolve(this.cache.del(key)).then(function () {
    if (typeof callback === "function") {
      callback();
    }
  }, function (err) {
    if (typeof callback === "function") {
      callback(err);
    } else {
      throw err;
    }
  });
};

AsyncCache.prototype.reset = function (callback) {
  return Promise.resolve(this.cache.reset()).then(function () {
    if (typeof callback === "function") {
      callback();
    }
  }, function (err) {
    if (typeof callback === "function") {
      callback(err);
    } else {
      throw err;
    }
  });
};

AsyncCache.prototype.lookup = function (key, resolveFn, hitFn) {
  var self = this;

  function get(key) {
    return Promise.resolve(self.cache.get(key));
  }

  function set(key, value, maxAge) {
    return Promise.resolve(self.cache.set(key, value, maxAge));
  }

  function inner(hitFn) {

    function resolvedCallback(err, hit) {
      if (err) {
        if (self.pending[key]) {
          self.pending[key].forEach(function (callback) {
            setImmediate(callback, err);
          });
          delete self.pending[key];
        }
        return;
      }

      // See https://github.com/petkaantonov/bluebird/wiki/Optimization-killers#3-managing-arguments
      var args = new Array(arguments.length);
      args[0] = key;
      for (var i = 1; i < args.length; ++i) {
        args[i] = arguments[i];
      }

      return set.apply(self.cache, args).catch(function (err) {
        self.emit("error", err);
      }).then(function () {
        if (self.pending[key]) {
          self.pending[key].forEach(function (callback) {
            setImmediate(callback, null, hit);
          });
          delete self.pending[key];
        }
      });
    }

    return get(key).catch(function (err) {
      self.emit("error", err);
      return undefined;
    }).then(function (value) {
      if (value === undefined) {
        return [false, value];
      }
      return [true, value];
    }).catch(function (err) {
      self.emit("error", err);
      return [false, null];
    }).then(function (arr) {

      var exists = arr[0];
      var value = arr[1];

      if (exists) {
        return setImmediate(hitFn, null, value);
      }

      if (self.pending[key]) {
        self.pending[key].push(hitFn);
      } else {
        self.pending[key] = [hitFn];
        resolveFn(resolvedCallback);
      }
    });
  }

  if (hitFn) {
    inner(hitFn);
  } else {
    return new Promise(function (resolve, reject) {
      inner(function (err, hit) {
        if (err) return reject(err);
        return resolve(hit);
      });
    });
  }
};

module.exports = AsyncCache;
