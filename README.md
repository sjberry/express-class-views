# express-class-views

A simple library to add class-based view support for ExpressJS.

If you're familiar with ExpressJS views/routing you're probably accustomed to a pattern like:

```javascript
let router = express.Router();

router.route('/')
    .get(function(req, res, next) {
        // Same handler code.
    })
    .post(function(req, res, next) {
        // Same handler code.
    });
```

There are a couple subjective issues here:

  1. Individual verbs are somewhat awkward to document.
  2. ExpressJS feels that verbs that aren't explicitly handled should return 404 errors (as opposed to 405 errors).
  3. Variables pertinent to multiple verb handlers are more difficult to organize.
  4. OPTIONS handlers need to be manually specified.

All this library does is rectify these behaviors while piggybacking on the otherwise straightforward ExpressJS pattern.

So re-tooling the example above:

```javascript
const View = require('express-class-views');

class MyView extends View {
    get(req, res, next) {
        // Same handler code.
    }

    post(req, res, next) {
        // Sample handler code.
    }
}

let router = express.Router();

// Generate middleware function for class and map it to "all" HTTP verbs.

router.route('/')
    .all(MyView.handler());
```

Any verbs (besides OPTIONS which is automatic) which are not specifically defined as a class method will generate a 405
error.

If you'd like to specify the error library that will be used to create the 405 error (which may affect `instanceof`
checks elsewhere in your application code) you can pass in the option `errors` to the `.handler()` static method.

```javascript
    MyView.handler({
        errors: require('http-errors')
    });
```

The only requirements for this option:

  1. Needs to be a function.
  2. Should accept an integer as the first argument to specify which error gets created.


### Overriding OPTIONS

The OPTIONS verb will be handled by default and will send a simple Accepts header including all the verbs specified on
your view class. You can easily override this behavior by specifying a class method for the OPTIONS verb.

```javascript
const View = require('express-class-views');

class MyView extends View {
    options(req, res, next) {
        // Overriding behavior.
    }

    get(req, res, next) {
        // Same handler code.
    }

    post(req, res, next) {
        // Sample handler code.
    }
}
```

### Scoping Variables

You can easily tie variables to a particular class inside of a constructor.

```javascript
const View = require('express-class-views');

class MyView extends View {
    constructor() {
        this.someVariable = 'foo';
    }

    get(req, res, next) {
        // Same handler code.

        this.someVariable === 'foo'; // true
    }
}
```

Whenever you call the class method `.handler()` an instance of your view class is created. For every method handler the
context `this` will be the instance of your view. So any variables you add in the constructor will be available there.


## What's Left

There are still some pain points that may be addressed in future versions.

For instance it's still cumbersome to prepend your class views with middleware to handle behaviors. Let's say you wanted
to check that a request is logged in with some middleware function `loginRequred` on all verbs and validate CSRF tokens
with another middleware function `csrfValidate` on POST and PUT.

You'd need to do something irritating like:

```javascript
    let router = express.Router();

    // Generate middleware function for class and map it to "all" HTTP verbs.
    router.route('/')
        .all(loginRequired)
        .post(csrfValidate)
        .put(csrfValidate)
        .all(MyView.handler());
```

There are proposals to future ES specifications that might make this more straightforward with annotations.

```javascript
@loginRequired
class MyView extends View {
    get(req, res, next) {
        // Some handler code.
    }

    @csrfValidate
    post(req, res, next) {
        // Same handler code.
    }

    @csrfValidate
    put(req, res, next) {
        // Same handler code.
    }
}
```

But for now we wait.
