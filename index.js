"use strict";

const { LRUCache } = require("lru-cache");
const EventEmitter = require("events");

// eslint-disable-next-line
class AsyncCache extends EventEmitter {
  constructor(options = { }) {
    super();

    this.cache = options.cache || new LRUCache(options);
    this.pending = {};

    if (typeof this.cache.on === "function") {
      this.cache.on("error", (err) => {
        this.emit("error", err);
      });

      this.cache.on("connect", () => {
        this.emit("connect");
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
      throw err;
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
      throw err;
    }
  }

  async set(key, value, maxAge, callback) {
    if (typeof maxAge === "function") {
      callback = maxAge;
      maxAge = null;
    }

    try {
      // Check if this is a real LRUCache or a mock
      if (this.cache.constructor.name === "LRUCache") {
        // Real LRUCache - use options object
        const setOptions = maxAge !== null && maxAge !== undefined ? { ttl: maxAge } : {};
        await this.cache.set(key, value, setOptions);
      } else {
        // Mock cache - use traditional API
        await this.cache.set(key, value, maxAge);
      }
      if (typeof callback === "function") {
        return callback();
      }
    } catch (err) {
      if (typeof callback === "function") {
        return callback(err);
      }
      throw err;
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
      throw err;
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
      throw err;
    }
  }

  lookup(key, resolveFn, hitFn) {
    const resolvedCallback = async (...args) => {
      const [ error, hit, maxAge ] = args;
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
        // Handle the maxAge parameter properly
        if (this.cache.constructor.name === "LRUCache") {
          // Real LRUCache - use options object
          const setOptions = maxAge !== undefined && maxAge !== null && maxAge >= 0 ? { ttl: maxAge } : {};
          value = await this.cache.set(key, hit, setOptions);
        } else {
          // Mock cache - use traditional API
          value = await this.cache.set(key, hit, maxAge);
        }
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
        this.pending[key] = [ innerHitFn ];
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
