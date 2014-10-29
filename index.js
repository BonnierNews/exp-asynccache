"use strict";
var Promise = require("bluebird");
var LRU = require("lru-cache-plus");

function AsyncCache(cache) {
  this.cache = cache || new LRU();
  this.pending = {};
}

AsyncCache.prototype.lookup = function (key, resolveFn, hitFn) {
  var self = this;
  function inner(hitFn) {
    var resolvedCallback = function (err, hit, cacheHeader) {
      if (err) return hitFn(err);
      self.cache.set(key, hit, cacheHeader);
      if (self.pending[key]) {
        self.pending[key].forEach(function (callback) {
          setImmediate(callback, null, hit);
        });
        delete self.pending[key];
      }
    };
    if (self.cache.has(key)) {
      hitFn(null, self.cache.get(key));
    } else {
      if (self.pending[key]) {
        self.pending[key].push(hitFn);
      } else {
        self.pending[key] = [hitFn];
        resolveFn(resolvedCallback);
      }
    }
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
