"use strict";
var Promise = require("bluebird");
var LRU = require("lru-cache-plus");

function AsyncCache(cache) {
  this.cache = cache || new LRU();
  this.pending = {};
}

AsyncCache.prototype.lookup = function (key, resolveFn, hitFn) {
  var self = this;

  function get(key) {
    return Promise.resolve(self.cache.get(key));
  }

  function set() {
    return Promise.resolve(self.cache.set.apply(self.cache, arguments));
  }

  function inner(hitFn) {

    function resolvedCallback(err, hit, cacheHeader) {
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

      return set.apply(self.cache, args).then(function () {
        if (self.pending[key]) {
          self.pending[key].forEach(function (callback) {
            setImmediate(callback, null, hit);
          });
          delete self.pending[key];
        }
      });
    }

    return get(key).then(function (value) {
      if (value !== null && value !== undefined) {
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
