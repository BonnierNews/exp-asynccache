asynccache
==========

An async cache with a lookup function per key for Node.js with a different interface than async-cache.

**Requirements:** Node.js 20+

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

By default an lru-cache v11 cache with default settings (max: 500 items) is used to store cached objects but you can provide your own.

```javascript
var AsyncCache = require("exp-asynccache");
var { LRUCache } = require("lru-cache"); // any lru-cache compatible cache will do

var cache = new AsyncCache(new LRUCache({
  max: 500,
  ttl: 1000 * 60 * 60 // Note: lru-cache v11 uses 'ttl' instead of 'maxAge'
}));
```

You can also pass options directly to the AsyncCache constructor:

```javascript
var AsyncCache = require("exp-asynccache");
var cache = new AsyncCache(null, { max: 1000, ttl: 30000 });
```

The resolve function can take more arguments than error and key. It will pass these to the underlying cache's set
method. So when using lru-cache you can provide a TTL (time-to-live) per key:

```javascript
var AsyncCache = require("exp-asynccache");
var cache = new AsyncCache();

cache.lookup("foo", function (resolve) {
  resolve(null, "baz", 1000); // Let foo live for one second (TTL in milliseconds)
});
```

## Cache interface

The underlying cache should adhere to the same interface as LRUCache v11:

```
get(key)                           -> lookup value. undefined return value indicates cache miss.
set(key, value, options?)          -> set value (options can include {ttl: milliseconds})
has(key)                           -> return true if key exists
del(key)                           -> delete key
reset()                            -> clear all entries
```

If the cache implementation is asynchronous, promises can be returned. The AsyncCache class handles both the new lru-cache v11 API (which uses options objects) and legacy cache implementations for backward compatibility.

## Version History

### Version ?.?.?
- **BREAKING**: Upgraded to lru-cache v11 (from v6)
- **BREAKING**: Requires Node.js 20+ (upgraded from Node.js 16)
- Updated development dependencies (chai v6.2.0, mocha v11.7.4, eslint v9.38.0)
- Updated GitHub Actions to use latest versions (checkout@v4, setup-node@v4, cache@v4)
- Improved constructor interface to better handle options parameter
- Fixed Node.js version requirements documentation to match package.json (Node.js 20+)
- Updated to use modern ESLint configuration with @bonniernews/eslint-config
- Improved error handling with proper error throwing in async methods
- Added constructor options parameter for easier cache configuration
- Maintained backward compatibility for existing cache implementations

### Migration Notes from v3.1.x

If you're upgrading from a previous version that used lru-cache v6, note these changes:

- The `maxAge` option is now `ttl` in lru-cache v11
- When creating custom LRUCache instances, use `{ LRUCache }` destructured import
- The AsyncCache constructor now accepts an options parameter as the second argument

```javascript
// Old (v6)
var LRU = require("lru-cache");
var cache = new LRU({ maxAge: 60000 });

// New (v11)
var { LRUCache } = require("lru-cache");
var cache = new LRUCache({ ttl: 60000 });
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
