asynccache
==========

An async cache with a lookup function per key for node js with a different interface than async-cache.

Errors are not cached and the callback function is always called asynchronously even if the value is resolved
synchronously.

### Installation
`npm install --save exp-asynccache`

### Usage

Callback usage:

```javascript
var AsyncCache = require("exp-asynccache");
var cache = new AsyncCache();

cache.lookup("foo", function (resolve) {
  // Find foo asynchronously (or synchronously) then call resolve with the value
  resolve(null, "baz");
}, function (err, value) {
  console.log(value); // value will be "baz"
});
```

Promise usage:

```javascript
var AsyncCache = require("exp-asynccache");
var cache = new AsyncCache();

var hit = cache.lookup("foo", function (resolve) {
  resolve(null, "baz");
});

hit.then(function (value) {
  console.log(value); // value will be "baz"
});
```

By default a lru-cache-plus cache with default settings is used to store cached objects but you can provide your own.

```javascript
var AsyncCache = require("exp-asynccache");
var LRU = require("lru-cache-plus"); // any lru-cache compatible cache will do

var cache = new AsyncCache(new LRU({
  max: 500,
  maxAge: 1000 * 60 * 60
});
```

The resolve function can take more arguments than error and key. It will pass these to the underlying cache's set
method. So when using lru-cache-plus you can provide a max age per key:

```javascript
var AsyncCache = require("exp-asynccache");
var cache = new AsyncCache();

cache.lookup("foo", function (resolve) {
  resolve(null, "baz", 1000); // Let foo live for one second
});
```

## Warning

Don't use more data from the closure than what is used to construct the cache key:

```javascript
var AsyncCache = require("exp-asynccache");
var cache = new AsyncCache();

function getPerson(name, location, callback) {

  cache.lookup(name, function (resolve) { // <-- Only name is used

    personRepo.get(name, location, resolve); // <-- Both name and location is used

  }, callback);

}
```

In the above example there might be several different objects returned by personRepo for the same name but with
different locations but they are all cached only by the name. The correct code would be to construct the cache key
from both name and location.
