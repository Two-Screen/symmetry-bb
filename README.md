## Symmetry for Backbone.js

Creating diffs for Backbone.js models with Symmetry is easy. Applying them,
however, is not. This module implements a best effort patch function.

Simply apply a patch to a model or collection, and events are fired:

    model = new Backbone.Model();
    SymmetryBB.patch(model, patch);

For nested objects, either set your models and collections in advance:

    scope = {
        people: new Backbone.Collection()
    };
    SymmetryBB.patch(scope, patch);

Or replace objects and arrays with similar models and collections:

    scope = {
        people: []
    };
    scope.people = new Backbone.Collection(scope.people);
    SymmetryBB.patch(scope, patch);

While traversing, `patch` will try to preserve existing models and
collections, firing events on them as they change.

[MIT-licensed](http://en.wikipedia.org/wiki/MIT_license)

### Installing

In node.js, install using NPM:

    npm install symmetry-bb

In the browser, simply include `patch.js`.

### Hacking the code

    git clone https://github.com/Two-Screen/symmetry-bb.git
    cd symmetry-bb
    npm install
    npm test
