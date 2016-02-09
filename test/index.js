var Promise = require("bluebird");
var should = require("chai").should();
var AsyncCache = require("../");
var assert = require("assert");

describe("AsyncCache", function () {
  it("has value as callback", function (done) {
    var target = new AsyncCache({
      has: function (key) {
        key.should.eql("foo");
        return true;
      }
    });

    target.has("foo", function (err, exists) {
      exists.should.eql(true);
      done();
    });
  });

  it("has value as promise", function (done) {
    var target = new AsyncCache({
      has: function (key) {
        key.should.eql("foo");
        return true;
      }
    });

    target.has("foo").then(function (exists) {
      exists.should.eql(true);
      done();
    });
  });

  it("handles has error", function (done) {
    var target = new AsyncCache({
      has: function () {
        return Promise.reject(new Error("error"));
      }
    });

    target.has("foo", function (err) {
      err.message.should.equal("error");
      done();
    });
  });

  it("gets value as callback", function (done) {
    var target = new AsyncCache({
      get: function (key) {
        key.should.eql("foo");
        return "123";
      }
    });

    target.get("foo", function (err, hit) {
      hit.should.eql("123");
      done();
    });
  });

  it("gets value as promise", function (done) {
    var target = new AsyncCache({
      get: function (key) {
        key.should.eql("foo");
        return "123";
      }
    });

    target.get("foo").then(function (hit) {
      hit.should.eql("123");
      done();
    });
  });

  it("handles get error", function (done) {
    var target = new AsyncCache({
      get: function () {
        return Promise.reject(new Error("error"));
      }
    });

    target.get("foo", function (err) {
      err.message.should.equal("error");
      done();
    });
  });

  it("sets value with callback", function (done) {
    var setValue;
    var target = new AsyncCache({
      set: function (key, value, maxAge) {
        setValue = {
          key: key,
          value: value,
          maxAge: maxAge
        };
      }
    });

    target.set("foo", "123", 1000, function () {
      setValue.key.should.eql("foo");
      setValue.value.should.eql("123");
      setValue.maxAge.should.eql(1000);
      done();
    });
  });

  it("sets value with maxAge as callback", function (done) {
    var setValue;
    var target = new AsyncCache({
      set: function (key, value, maxAge) {
        setValue = {
          key: key,
          value: value,
          maxAge: maxAge
        };
      }
    });

    target.set("foo", "123", function () {
      setValue.key.should.eql("foo");
      setValue.value.should.eql("123");
      assert(setValue.maxAge === null);
      done();
    });
  });

  it("sets value with promise", function (done) {
    var setValue;
    var target = new AsyncCache({
      set: function (key, value, maxAge) {
        setValue = {
          key: key,
          value: value,
          maxAge: maxAge
        };
      }
    });

    target.set("foo", "123", 1000).then(function () {
      setValue.key.should.eql("foo");
      setValue.value.should.eql("123");
      setValue.maxAge.should.eql(1000);
      done();
    });
  });

  it("handles set error", function (done) {
    var target = new AsyncCache({
      set: function () {
        return Promise.reject(new Error("error"));
      }
    });

    target.set("foo", "123", 1000, function (err) {
      err.message.should.equal("error");
      done();
    });
  });

  it("deletes with callback", function (done) {
    var delKey;
    var target = new AsyncCache({
      del: function (key) {
        delKey = key;
      }
    });

    target.del("foo", function () {
      delKey.should.eql("foo");
      done();
    });
  });

  it("deletes with promise", function (done) {
    var delKey;
    var target = new AsyncCache({
      del: function (key) {
        delKey = key;
      }
    });

    target.del("foo").then(function () {
      delKey.should.eql("foo");
      done();
    });
  });

  it("resets with callback", function (done) {
    var wereReset = false;
    var target = new AsyncCache({
      reset: function () {
        wereReset = true;
      }
    });

    target.reset(function () {
      wereReset.should.eql(true);
      done();
    });
  });

  it("resets with promise", function (done) {
    var wereReset = false;
    var target = new AsyncCache({
      reset: function () {
        wereReset = true;
      }
    });

    target.reset().then(function () {
      wereReset.should.eql(true);
      done();
    });
  });

  it("handles delete error", function (done) {
    var target = new AsyncCache({
      del: function () {
        return Promise.reject(new Error("error"));
      }
    });

    target.del("foo", function (err) {
      err.message.should.equal("error");
      done();
    });
  });

  it("looks up value", function (done) {
    var target = new AsyncCache({
      get: function (key) {
        key.should.eql("foo");
        return "123";
      },
      has: function(key) {
        return key === "foo";
      }
    });

    target.lookup("foo", function () {
      done(new Error("Shouldn't get here"));
    }, function (err, hit) {
      hit.should.eql("123");
      done();
    });
  });

  it("looks up value from promise", function (done) {
    var target = new AsyncCache({
      get: function (key) {
        key.should.eql("foo");
        return Promise.resolve("123");
      }
    });

    target.lookup("foo", function () {
      done(new Error("Shouldn't get here"));
    }, function (err, hit) {
      hit.should.eql("123");
      done();
    });
  });

  it("caches nothing when maxAge is -1", function (done) {
    var LRU = require("lru-cache-plus");
    var cache = new LRU({
      maxAge: -1,
      max: 10
    });
    var target = new AsyncCache(cache);

    target.lookup("foo", function (resolvedCallback) {
      resolvedCallback(null, "123");
    }, function (err, hit) {
      hit.should.eql("123");
      setImmediate(function () {
        target.lookup("foo", function (resolvedCallback) {
          resolvedCallback(null, "234");
        }, function (err, hit) {
          hit.should.eql("234");
          done();
        });
      });
    });
  });

  it("resolves value and sets to cache if no hit", function (done) {
    var storedValue;
    var target = new AsyncCache({
      get: function (key) {
        key.should.eql("foo");
        return undefined;
      },
      set: function (key, value) {
        key.should.eql("foo");
        storedValue = value;
      },
      has: function(key) {
        return key !== "foo";
      }
    });

    target.lookup("foo", function (resolvedCallback) {
      resolvedCallback(null, "456");
    }, function () {
      storedValue.should.eql("456");
      done();
    });
  });

  it("passes maxAge to cache", function (done) {
    var setMaxAge;
    var target = new AsyncCache({
      get: function (key) {
        key.should.eql("foo");
        return undefined;
      },
      set: function (key, value, maxAge) {
        key.should.eql("foo");
        setMaxAge = maxAge;
      },
      has: function(key) {
        return key !== "foo";
      }
    });

    target.lookup("foo", function (resolvedCallback) {
      resolvedCallback(null, "456", 1800);
    }, function () {
      setMaxAge.should.equal(1800);
      done();
    });
  });

  it("should emit cache errors", function (done) {
    var onCallbacks = {};
    var target = new AsyncCache({
      on: function (event, callback) {
        if (!onCallbacks[event]) {
          onCallbacks[event] = [callback];
        } else {
          onCallbacks[event].push(callback);
        }
      },
      emit: function (event, err) {
        if (onCallbacks[event]) {
          for (var i = 0; i < onCallbacks[event].length; i++) {
            onCallbacks[event][i](err);
          }
        }
      }
    });
    target.on("error", function (err) {
      assert(err);
      err.message.should.equal("error");
      done();
    });
    target.cache.emit("error", new Error("error"));
  });

  it("resolves value and sets to cache returning promise if no hit", function (done) {
    var storedValue;
    var target = new AsyncCache({
      get: function (key) {
        key.should.eql("foo");
        return Promise.resolve(undefined);
      },
      set: function (key, value) {
        key.should.eql("foo");
        return new Promise(function (resolve) {
          storedValue = value;
          resolve();
        });
      },
      has: function(key) {
        return key !== "foo";
      }
    });

    target.lookup("foo", function (resolvedCallback) {
      resolvedCallback(null, "456");
    }, function () {
      storedValue.should.eql("456");
      done();
    });
  });

  it("resolves value and sets to cache if get-promise is rejected", function (done) {
    var storedValue;
    var err;
    var target = new AsyncCache({
      get: function (key) {
        key.should.eql("foo");
        return Promise.reject(new Error("error"));
      },
      set: function (key, value) {
        key.should.eql("foo");
        return new Promise(function (resolve) {
          storedValue = value;
          resolve();
        });
      },
      has: function(key) {
        return key !== "foo";
      }
    });

    target.on("error", function (e) {
      err = e;
    });

    target.lookup("foo", function (resolvedCallback) {
      resolvedCallback(null, "456");
    }, function () {
      storedValue.should.eql("456");
      err.message.should.equal("error");
      done();
    });
  });

  it("resolves value and sets to cache if has-promise is rejected", function (done) {
    var storedValue;
    var err;
    var target = new AsyncCache({
      get: function (key) {
        key.should.eql("foo");
        return Promise.resolve(undefined);
      },
      set: function (key, value) {
        key.should.eql("foo");
        return new Promise(function (resolve) {
          storedValue = value;
          resolve();
        });
      },
      has: function () {
        return Promise.reject(new Error("error"));
      }
    });

    target.on("error", function (e) {
      err = e;
    });

    target.lookup("foo", function (resolvedCallback) {
      resolvedCallback(null, "456");
    }, function () {
      storedValue.should.eql("456");
      err.message.should.equal("error");
      done();
    });
  });

  it("resolves value even if set-promise is rejected", function (done) {
    var storedValue;
    var err;
    var target = new AsyncCache({
      get: function (key) {
        key.should.eql("foo");
        return Promise.resolve(undefined);
      },
      set: function (key, value) {
        key.should.eql("foo");
        return new Promise(function (resolve, reject) {
          storedValue = value;
          reject(new Error("error"));
        });
      }
    });

    target.on("error", function (e) {
      err = e;
    });

    target.lookup("foo", function (resolvedCallback) {
      resolvedCallback(null, "456");
    }, function () {
      storedValue.should.eql("456");
      err.message.should.equal("error");
      done();
    });
  });

  it("deals with errors", function (done) {
    var target = new AsyncCache({
      get: function (key) {
        key.should.eql("foo");
        return undefined;
      },
      set: function () {
        assert(false);
      },
      has: function(key) {
        return key !== "foo";
      }
    });

    target.lookup("foo", function (resolvedCallback) {
      resolvedCallback("ERROR", null);
    }, function (err, hit) {
      assert(err);
      assert(!hit);
      done();
    });
  });

  it("handles pending requests when error happens", function (done) {
    var target = new AsyncCache();
    var error = new Error("Could not find foo");
    var errors = 0;

    function hitFn(err, hit) {
      assert.equal(err, error);
      assert(!hit);
      if (++errors === 2) {
        done();
      }
    }

    target.lookup("foo", function (resolvedCallback) {

      // This request should be queued
      target.lookup("foo", function () {
        throw new Error("This resolveFn should not be called!");
      }, hitFn);

      setImmediate(resolvedCallback, error);
    }, hitFn);
  });

  it("can give promises instead", function (done) {
    var target = new AsyncCache({
      get: function (key) {
        assert.equal(key, "foo");
        return "123";
      }
    });

    var result = target.lookup("foo", function () {
      done(new Error("Shouldn't get here"));
    });

    result.then(function (value) {
      assert.equal(value, "123");
      done();
    });
  });

  it("rejects promise on resolve error", function (done) {
    var target = new AsyncCache();

    target.lookup("foo", function (resolve) {
      setImmediate(resolve, new Error("failure to resolve"));
    }).then(function () {
      done(new Error("Shouldn't get here"));
    }, function (error) {
      assert(error);
      done();
    });
  });

  it("constructs a default cache if none is given", function (done) {
    var cache = new AsyncCache();
    var hit = cache.lookup("foo", function (resolve) {
      resolve(null, "baz");
    });

    hit.then(function (value) {
      value.should.eql("baz");
      done();
    });
  });

  it("calls hitFn asynchronously even when resolved synchronously", function (done) {
    var cache = new AsyncCache();
    var wasCalledAsync = false;

    cache.lookup("foo", function (resolve) {
      resolve(null, "sync");
    }, function () {
      assert(wasCalledAsync);
      done();
    });

    wasCalledAsync = true;
  });

  it("calls hitFn asynchronously even for cache hits", function (done) {
    var cache = new AsyncCache();

    cache.lookup("foo", function (resolve) {
      resolve(null, "baz");
    }, function () {
      // foo is now in cache
      var wasCalledAsync = false;

      cache.lookup("foo", function (resolve) {
        resolve(null, "baz");
      }, function () {
        assert(wasCalledAsync);
        done();
      });

      wasCalledAsync = true;
    });
  });

  it("calls hitFn asynchronously for error", function (done) {
    var cache = new AsyncCache();
    var wasCalledAsync = false;

    cache.lookup("foo", function (resolve) {
      resolve(new Error());
    }, function () {
      // foo is now in cache
      assert(wasCalledAsync);
      done();
    });

    wasCalledAsync = true;
  });

  it("does not cache errors", function (done) {
    var cache = new AsyncCache();

    cache.lookup("foo", function (resolve) {
      resolve(new Error());
    }, function () {

      cache.lookup("foo", function (resolve) {
        resolve();
      }, function (err) {
        done(err);
      });

    });
  });

  describe("Handling of falsy values", function () {
    function setAndGet(key, value, done) {
      var cache = new AsyncCache();
      cache.lookup(key, function (resolve) {
        resolve(null, value);
      }).then(function (cachedValue) {
        should.equal(value, cachedValue);
        done();
      });
    }

    it("should cache false", function (done) {
      setAndGet("foo", false, done);
    });
    it("should cache undefined", function (done) {
      setAndGet("foo", undefined, done);
    });
    it("should cache null", function (done) {
      setAndGet("foo", null, done);
    });
    it("should cache 0", function (done) {
      setAndGet("foo",  0, done);
    });
    it("should cache '0' ", function (done) {
      setAndGet("foo", "0", done);
    });
  });
  it("should handle pending with falsy values", function (done) {
    var cache = new AsyncCache();
    var one = cache.lookup("foo", function (resolve) {
      setTimeout(function () {
        resolve(null, null);
      }, 0);
    });
    var two = cache.lookup("foo", function () { done("Should not go here"); });
    Promise.all([one, two]).then(function (values) {
       values.should.eql([null, null]);
       done();
    }).catch(done);
  });

  it("should not get cache if timed out", function (done) {
    var cache = new AsyncCache();
    cache.lookup("foo", function (resolve) {
      resolve(null, "baz", 1);
    }).then(function (val) {
      val.should.eql("baz");
      setTimeout(function () {
        cache.lookup("foo", function (resolve) {
          resolve(null, "bass");
        }).then(function (val) {
          val.should.eql("bass");
          done();
        });
      }, 2);
    }).catch(done);
  });

  it("should not get cache if maxAge is -1", function (done) {
    var cache = new AsyncCache();
    cache.lookup("foo", function (resolve) {
      resolve(null, undefined, -1);
    }).then(function (val) {
      should.equal(val, undefined);
      cache.lookup("foo", function (resolve) {
        resolve(null, null);
      }).then(function (val) {
        should.equal(val, null);
        done();
      });
    }).catch(done);
  });

  it("should handle being called recursively without setImmediate", function (done) {
    var cache = new AsyncCache();

    cache.lookup("foo", function (resolve) {
      resolve(null, "value", -1);
    }, function () {
      cache.lookup("foo", function (resolve) {
        resolve(null, "value", -1);
      }, done);
    });
  });
});
