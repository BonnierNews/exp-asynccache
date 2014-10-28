require("chai").should();
var AsyncCache = require("../"),
    assert = require("assert");

describe("AsyncCache", function () {
  it("looks up value", function (done) {
    var target = new AsyncCache({
      get: function (key) {
        key.should.eql("foo");
        return "123";
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
      }
    });

    target.lookup("foo", function (resolvedCallback) {
      resolvedCallback(null, "456");
    }, function () {
      storedValue.should.eql("456");
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
});
