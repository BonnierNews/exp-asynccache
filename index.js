"use strict";

const LRU = require("lru-cache-plus");
const EventEmitter = require("events");

class AsyncCache extends EventEmitter {
  constructor(cache) {
    super();

    this.cache = cache || new LRU();
    this.pending = {};

    if (typeof this.cache.on === "function") {
      const self = this;
      this.cache.on("error", (err) => {
        self.emit("error", err);
      });
    }
  }


  async get(key, callback) {
    try {
      const data = await this.cache.get(key);
      if (typeof callback === "function") {
        return callback(null, data);
      }
      return data;
    } catch (err) {
      if (typeof callback === "function") {
        return callback(err);
      }
    }
  }

  async has(key, callback) {
    try {
      const exists = await this.cache.has(key);
      if (typeof callback === "function") {
        return callback(null, exists);
      }
      return exists;
    } catch (err) {
      if (typeof callback === "function") {
        return callback(err);
      }
    }
  }

  async set(key, value, maxAge, callback) {
    if (typeof maxAge === "function") {
      callback = maxAge;
      maxAge = null;
    }

    try {
      await this.cache.set(key, value, maxAge);
      if (typeof callback === "function") {
        return callback();
      }
    } catch (err) {
      if (typeof callback === "function") {
        return callback(err);
      }
    }
  }

  async del(key, callback) {
    try {
      await this.cache.del(key);
      if (typeof callback === "function") {
        return callback();
      }
    } catch (err) {
      if (typeof callback === "function") {
        return callback(err);
      }
    }
  }

  async reset(callback) {
    try {
      await this.cache.reset();
      if (typeof callback === "function") {
        return callback();
      }
    } catch (err) {
      if (typeof callback === "function") {
        return callback(err);
      }
    }
  }

  lookup(key, resolveFn, hitFn) {
    const self = this;

    function get(innerKey) {
      return Promise.resolve(self.cache.get(innerKey));
    }

    function set(innerKey, value, maxAge) {
      return Promise.resolve(self.cache.set(innerKey, value, maxAge));
    }

    function inner(innerHitFn) {
      function resolvedCallback(err, hit) {
        if (err) {
          if (self.pending[key]) {
            self.pending[key].forEach((callback) => {
              setImmediate(callback, err);
            });
            delete self.pending[key];
          }
          return;
        }

        // See https://github.com/petkaantonov/bluebird/wiki/Optimization-killers#3-managing-arguments
        const args = new Array(arguments.length);
        args[0] = key;
        for (let i = 1; i < args.length; ++i) {
          args[i] = arguments[i];
        }

        return set.apply(self.cache, args).catch((innerErr) => {
          self.emit("error", innerErr);
        }).then(() => {
          if (self.pending[key]) {
            self.pending[key].forEach((callback) => {
              setImmediate(callback, null, hit);
            });
            delete self.pending[key];
          }
        });
      }

      return get(key).catch((err) => {
        self.emit("error", err);
        return undefined;
      }).then((value) => {
        if (value === undefined) {
          return [false, value];
        }
        return [true, value];
      }).catch((err) => {
        self.emit("error", err);
        return [false, null];
      }).then((arr) => {

        const exists = arr[0];
        const value = arr[1];

        if (exists) {
          return setImmediate(innerHitFn, null, value);
        }

        if (self.pending[key]) {
          self.pending[key].push(innerHitFn);
        } else {
          self.pending[key] = [innerHitFn];
          resolveFn(resolvedCallback);
        }
      });
    }

    if (hitFn) {
      inner(hitFn);
    } else {
      return new Promise((resolve, reject) => {
        inner((err, hit) => {
          if (err) return reject(err);
          return resolve(hit);
        });
      });
    }
  }
}

module.exports = AsyncCache;
