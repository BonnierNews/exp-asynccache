"use strict";

const LRU = require("lru-cache-plus");
const EventEmitter = require("events");

class AsyncCache extends EventEmitter {
  constructor(cache) {
    super();

    this.cache = cache || new LRU();
    this.pending = {};

    if (typeof this.cache.on === "function") {
      this.cache.on("error", (err) => {
        this.emit("error", err);
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
    const resolvedCallback = async (...args) => {
      const [error, hit, ...rest] = args;
      if (error) {
        if (this.pending[key]) {
          this.pending[key].forEach((callback) => {
            setImmediate(callback, error);
          });
          delete this.pending[key];
        }
        return;
      }

      let value;
      try {
        value = await this.cache.set(key, hit, ...rest);
      } catch (err) {
        this.emit("error", err);
      }

      if (this.pending[key]) {
        this.pending[key].forEach((callback) => {
          setImmediate(callback, null, hit);
        });
        delete this.pending[key];
      }

      return value;
    };

    const inner = async (innerHitFn) => {
      let value;
      try {
        value = await this.cache.get(key);
      } catch (err) {
        this.emit("error", err);
      }

      const exists = value !== undefined;
      if (exists) {
        return setImmediate(innerHitFn, null, value);
      }

      if (this.pending[key]) {
        this.pending[key].push(innerHitFn);
      } else {
        this.pending[key] = [innerHitFn];
        resolveFn(resolvedCallback);
      }
    };

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
