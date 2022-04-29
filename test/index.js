"use strict";

const AsyncCache = require("../");
const assert = require("assert");

describe("AsyncCache", () => {
  it("has value as callback", (done) => {
    const target = new AsyncCache({
      has(key) {
        expect(key).to.equal("foo");
        return true;
      }
    });

    target.has("foo", (err, exists) => {
      if (err) return done(err);

      expect(exists).to.equal(true);
      done();
    });
  });

  it("has value as promise", (done) => {
    const target = new AsyncCache({
      has(key) {
        expect(key).to.equal("foo");
        return true;
      }
    });

    target.has("foo").then((exists) => {
      expect(exists).to.equal(true);
      done();
    });
  });

  it("handles has error", (done) => {
    const target = new AsyncCache({
      has() {
        return Promise.reject(new Error("error"));
      }
    });

    target.has("foo", (err) => {
      expect(err).to.be.instanceOf(Error);
      expect(err.message).to.equal("error");
      done();
    });
  });

  it("gets value as callback", (done) => {
    const target = new AsyncCache({
      get(key) {
        expect(key).to.equal("foo");
        return "123";
      }
    });

    target.get("foo", (err, hit) => {
      if (err) return done(err);

      expect(hit).to.equal("123");
      done();
    });
  });

  it("gets value as promise", (done) => {
    const target = new AsyncCache({
      get(key) {
        expect(key).to.equal("foo");
        return "123";
      }
    });

    target.get("foo").then((hit) => {
      expect(hit).to.equal("123");
      done();
    });
  });

  it("handles get error", (done) => {
    const target = new AsyncCache({
      get() {
        return Promise.reject(new Error("error"));
      }
    });

    target.get("foo", (err) => {
      expect(err).to.be.instanceOf(Error);
      expect(err.message).to.equal("error");
      done();
    });
  });

  it("sets value with callback", (done) => {
    let setValue;
    const target = new AsyncCache({
      set(key, value, maxAge) {
        setValue = {
          key,
          value,
          maxAge
        };
      }
    });

    target.set("foo", "123", 1000, () => {
      expect(setValue.key).to.equal("foo");
      expect(setValue.value).to.equal("123");
      expect(setValue.maxAge).to.equal(1000);
      done();
    });
  });

  it("sets value with maxAge as callback", (done) => {
    let setValue;
    const target = new AsyncCache({
      set(key, value, maxAge) {
        setValue = {
          key,
          value,
          maxAge
        };
      }
    });

    target.set("foo", "123", () => {
      expect(setValue.key).to.equal("foo");
      expect(setValue.value).to.equal("123");
      expect(setValue.maxAge).to.equal(null);
      done();
    });
  });

  it("sets value with promise", (done) => {
    let setValue;
    const target = new AsyncCache({
      set(key, value, maxAge) {
        setValue = {
          key,
          value,
          maxAge
        };
      }
    });

    target.set("foo", "123", 1000).then(() => {
      expect(setValue.key).to.equal("foo");
      expect(setValue.value).to.equal("123");
      expect(setValue.maxAge).to.equal(1000);
      done();
    });
  });

  it("handles set error", (done) => {
    const target = new AsyncCache({
      set() {
        return Promise.reject(new Error("error"));
      }
    });

    target.set("foo", "123", 1000, (err) => {
      expect(err).to.be.instanceOf(Error);
      expect(err.message).to.equal("error");
      done();
    });
  });

  it("deletes with callback", (done) => {
    let delKey;
    const target = new AsyncCache({
      del(key) {
        delKey = key;
      }
    });

    target.del("foo", () => {
      expect(delKey).to.equal("foo");
      done();
    });
  });

  it("deletes with promise", (done) => {
    let delKey;
    const target = new AsyncCache({
      del(key) {
        delKey = key;
      }
    });

    target.del("foo").then(() => {
      expect(delKey).to.equal("foo");
      done();
    });
  });

  it("resets with callback", (done) => {
    let wereReset = false;
    const target = new AsyncCache({
      reset() {
        wereReset = true;
      }
    });

    target.reset(() => {
      expect(wereReset).to.equal(true);
      done();
    });
  });

  it("resets with promise", (done) => {
    let wereReset = false;
    const target = new AsyncCache({
      reset() {
        wereReset = true;
      }
    });

    target.reset().then(() => {
      expect(wereReset).to.equal(true);
      done();
    });
  });

  it("handles delete error", (done) => {
    const target = new AsyncCache({
      del() {
        return Promise.reject(new Error("error"));
      }
    });

    target.del("foo", (err) => {
      expect(err).to.be.instanceOf(Error);
      expect(err.message).to.equal("error");
      done();
    });
  });

  it("looks up value", (done) => {
    const target = new AsyncCache({
      get(key) {
        expect(key).to.equal("foo");
        return "123";
      },
      has(key) {
        return key === "foo";
      }
    });

    target.lookup("foo", () => {
      done(new Error("Shouldn't get here"));
    }, (err, hit) => {
      if (err) return done(err);

      expect(hit).to.equal("123");
      done();
    });
  });

  it("looks up value from promise", (done) => {
    const target = new AsyncCache({
      get(key) {
        expect(key).to.equal("foo");
        return Promise.resolve("123");
      }
    });

    target.lookup("foo", () => {
      done(new Error("Shouldn't get here"));
    }, (err, hit) => {
      if (err) return done(err);

      expect(hit).to.equal("123");
      done();
    });
  });

  it("caches nothing when maxAge is -1", (done) => {
    const LRU = require("lru-cache");
    const cache = new LRU({
      maxAge: -1,
      max: 10
    });
    const target = new AsyncCache(cache);

    target.lookup("foo", (resolvedCallback) => {
      resolvedCallback(null, "123");
    }, (err, hit) => {
      if (err) return done(err);

      expect(hit).to.equal("123");

      setImmediate(() => {
        target.lookup("foo", (resolvedCallback) => {
          resolvedCallback(null, "234");
        }, (innerErr, innerHit) => {
          if (innerErr) return done(innerErr);

          expect(innerHit).to.equal("234");
          done();
        });
      });
    });
  });

  it("resolves value and sets to cache if no hit", (done) => {
    let storedValue;
    const target = new AsyncCache({
      get(key) {
        expect(key).to.equal("foo");
        return undefined;
      },
      set(key, value) {
        expect(key).to.equal("foo");
        storedValue = value;
      },
      has(key) {
        return key !== "foo";
      }
    });

    target.lookup("foo", (resolvedCallback) => {
      resolvedCallback(null, "456");
    }, () => {
      expect(storedValue).to.equal("456");
      done();
    });
  });

  it("passes maxAge to cache", (done) => {
    let setMaxAge;
    const target = new AsyncCache({
      get(key) {
        expect(key).to.equal("foo");
        return undefined;
      },
      set(key, value, maxAge) {
        expect(key).to.equal("foo");
        setMaxAge = maxAge;
      },
      has(key) {
        return key !== "foo";
      }
    });

    target.lookup("foo", (resolvedCallback) => {
      resolvedCallback(null, "456", 1800);
    }, () => {
      expect(setMaxAge).to.equal(1800);
      done();
    });
  });

  it("should count undefined as a cache miss and resolve", (done) => {
    let storedValue;
    const target = new AsyncCache({
      get(key) {
        expect(key).to.equal("foo");
        return Promise.resolve(undefined);
      },
      set(key, value) {
        expect(key).to.equal("foo");
        return new Promise((resolve) => {
          storedValue = value;
          resolve();
        });
      }
    });

    target.lookup("foo", (resolvedCallback) => {
      resolvedCallback(null, "456");
    }, (err, returnedValue) => {
      assert(!err);
      expect(returnedValue).to.equal("456");
      expect(storedValue).to.equal("456");
      done();
    });
  });

  it("should count null as a hit from the cache and not resolve", (done) => {
    const target = new AsyncCache({
      get(key) {
        expect(key).to.equal("foo");
        return Promise.resolve(null);
      }
    });

    target.lookup("foo", () => {
      throw new Error("No resolve expected for cache hit");
    }, (err, value) => {
      assert(!err);
      assert(value === null);
      done();
    });
  });

  it("resolves value and sets to cache if get-promise is rejected", (done) => {
    let storedValue;
    let err;
    const target = new AsyncCache({
      get(key) {
        expect(key).to.equal("foo");
        return Promise.reject(new Error("error"));
      },
      set(key, value) {
        expect(key).to.equal("foo");
        return new Promise((resolve) => {
          storedValue = value;
          resolve();
        });
      },
      has(key) {
        return key !== "foo";
      }
    });

    target.on("error", (e) => {
      err = e;
    });

    target.lookup("foo", (resolvedCallback) => {
      resolvedCallback(null, "456");
    }, () => {
      expect(storedValue).to.equal("456");
      expect(err).to.be.instanceOf(Error);
      expect(err.message).to.equal("error");
      done();
    });
  });

  it("resolves value even if set-promise is rejected", (done) => {
    let storedValue;
    let err;
    const target = new AsyncCache({
      get(key) {
        expect(key).to.equal("foo");
        return Promise.resolve(undefined);
      },
      set(key, value) {
        expect(key).to.equal("foo");
        return new Promise((resolve, reject) => {
          storedValue = value;
          reject(new Error("error"));
        });
      }
    });

    target.on("error", (e) => {
      err = e;
    });

    target.lookup("foo", (resolvedCallback) => {
      resolvedCallback(null, "456");
    }, () => {
      expect(storedValue).to.equal("456");
      expect(err).to.be.instanceOf(Error);
      expect(err.message).to.equal("error");
      done();
    });
  });

  it("deals with errors", (done) => {
    const target = new AsyncCache({
      get(key) {
        expect(key).to.equal("foo");
        return undefined;
      },
      set() {
        assert(false);
      },
      has(key) {
        return key !== "foo";
      }
    });

    target.lookup("foo", (resolvedCallback) => {
      resolvedCallback("ERROR", null);
    }, (err, hit) => {
      assert(err);
      assert(!hit);
      done();
    });
  });

  it("handles pending requests when error happens", (done) => {
    const target = new AsyncCache();
    const error = new Error("Could not find foo");
    let errors = 0;

    function hitFn(err, hit) {
      assert.equal(err, error);
      assert(!hit);
      if (++errors === 2) {
        done();
      }
    }

    target.lookup("foo", (resolvedCallback) => {
      // This request should be queued
      target.lookup("foo", () => {
        throw new Error("This resolveFn should not be called!");
      }, hitFn);

      setImmediate(resolvedCallback, error);
    }, hitFn);
  });

  it("can give promises instead", (done) => {
    const target = new AsyncCache({
      get(key) {
        assert.equal(key, "foo");
        return "123";
      }
    });

    const result = target.lookup("foo", () => {
      done(new Error("Shouldn't get here"));
    });

    result.then((value) => {
      assert.equal(value, "123");
      done();
    });
  });

  it("rejects promise on resolve error", (done) => {
    const target = new AsyncCache();

    target.lookup("foo", (resolve) => {
      setImmediate(resolve, new Error("failure to resolve"));
    }).then(() => {
      done(new Error("Shouldn't get here"));
    }, (error) => {
      assert(error);
      done();
    });
  });

  it("constructs a default cache if none is given", (done) => {
    const cache = new AsyncCache();
    const hit = cache.lookup("foo", (resolve) => {
      resolve(null, "baz");
    });

    hit.then((value) => {
      expect(value).to.equal("baz");
      done();
    });
  });

  it("calls hitFn asynchronously even when resolved synchronously", (done) => {
    const cache = new AsyncCache();
    let wasCalledAsync = false;

    cache.lookup("foo", (resolve) => {
      resolve(null, "sync");
    }, () => {
      assert(wasCalledAsync);
      done();
    });

    wasCalledAsync = true;
  });

  it("calls hitFn asynchronously even for cache hits", (done) => {
    const cache = new AsyncCache();

    cache.lookup("foo", (resolve) => {
      resolve(null, "baz");
    }, () => {
      // foo is now in cache
      let wasCalledAsync = false;

      cache.lookup("foo", (resolve) => {
        resolve(null, "baz");
      }, () => {
        assert(wasCalledAsync);
        done();
      });

      wasCalledAsync = true;
    });
  });

  it("calls hitFn asynchronously for error", (done) => {
    const cache = new AsyncCache();
    let wasCalledAsync = false;

    cache.lookup("foo", (resolve) => {
      resolve(new Error());
    }, () => {
      // foo is now in cache
      assert(wasCalledAsync);
      done();
    });

    wasCalledAsync = true;
  });

  it("does not cache errors", (done) => {
    const cache = new AsyncCache();

    cache.lookup("foo", (resolve) => {
      resolve(new Error());
    }, () => {

      cache.lookup("foo", (resolve) => {
        resolve();
      }, (err) => {
        done(err);
      });

    });
  });

  describe("events", () => {
    let target;
    beforeEach(() => {
      const onCallbacks = {};
      target = new AsyncCache({
        on(event, callback) {
          if (!onCallbacks[event]) {
            onCallbacks[event] = [callback];
          } else {
            onCallbacks[event].push(callback);
          }
        },
        emit(event, err) {
          if (onCallbacks[event]) {
            for (let i = 0; i < onCallbacks[event].length; i++) {
              onCallbacks[event][i](err);
            }
          }
        }
      });
    });

    it("should emit cache errors", (done) => {
      target.on("error", (err) => {
        expect(err).to.be.instanceOf(Error);
        expect(err.message).to.equal("error");
        done();
      });
      target.cache.emit("error", new Error("error"));
    });

    it("should emit cache connection", (done) => {
      target.on("connect", done);
      target.cache.emit("connect");
    });
  });

  describe("Handling of falsy values", () => {
    function setAndGet(key, value, done) {
      const cache = new AsyncCache();
      cache.lookup(key, (resolve) => {
        resolve(null, value);
      }).then((cachedValue) => {
        expect(cachedValue).to.equal(value);
        done();
      });
    }

    it("should cache false", (done) => {
      setAndGet("foo", false, done);
    });

    it("should cache null", (done) => {
      setAndGet("foo", null, done);
    });
    it("should cache 0", (done) => {
      setAndGet("foo", 0, done);
    });
    it("should cache '0' ", (done) => {
      setAndGet("foo", "0", done);
    });
  });
  it("should handle pending with falsy values", (done) => {
    const cache = new AsyncCache();
    const one = cache.lookup("foo", (resolve) => {
      setTimeout(() => {
        resolve(null, null);
      }, 0);
    });
    const two = cache.lookup("foo", () => {
      done("Should not go here");
    });
    Promise.all([one, two]).then((values) => {
      expect(values).to.eql([null, null]);
      done();
    }).catch(done);
  });

  it("should not get cache if timed out", (done) => {
    const cache = new AsyncCache();
    cache.lookup("foo", (resolve) => {
      resolve(null, "baz", 1);
    }).then((val) => {
      expect(val).to.equal("baz");
      setTimeout(() => {
        cache.lookup("foo", (resolve) => {
          resolve(null, "bass");
        }).then((innerVal) => {
          expect(innerVal).to.equal("bass");
          done();
        });
      }, 2);
    }).catch(done);
  });

  it("should not get cache if maxAge is -1", (done) => {
    const cache = new AsyncCache();
    cache.lookup("foo", (resolve) => {
      resolve(null, undefined, -1);
    }).then((val) => {
      expect(val).to.equal(undefined);
      cache.lookup("foo", (resolve) => {
        resolve(null, null);
      }).then((innerVal) => {
        expect(innerVal).to.equal(null);
        done();
      });
    }).catch(done);
  });

  it("should handle being called recursively without setImmediate", (done) => {
    const cache = new AsyncCache();

    cache.lookup("foo", (resolve) => {
      resolve(null, "value", -1);
    }, () => {
      cache.lookup("foo", (resolve) => {
        resolve(null, "value", -1);
      }, done);
    });
  });
});
