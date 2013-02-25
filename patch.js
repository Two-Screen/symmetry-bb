(function() {
"use strict";
/*global require, module, window */

// Get the exports object.
var _, Symmetry, SymmetryBB;
if (typeof(module) !== 'undefined') {
    _ = require('underscore');
    Symmetry = require('symmetry');
    SymmetryBB = module.exports = _.clone(Symmetry);
}
else {
    _ = window._;
    Symmetry = window.Symmetry;
    SymmetryBB = window.SymmetryBB = _.clone(window.Symmetry);
}

// Apply an object patch. (`t:'o'`)
SymmetryBB.patchObject = function(obj, patch) {
    if (obj.attributes)
        this.patchModel(obj, patch);
    else
        this.patchPlainObject(obj, patch);
};

// Apply an object patch to a plain object.
// Tries to preserve existing models and collections.
SymmetryBB.patchPlainObject = function(obj, patch) {
    var i, key, val, prev;

    var r = patch.r;
    if (r) {
        var numRemoved = r.length;
        for (i = 0; i < numRemoved; i++) {
            key = r[i];
            delete obj[key];
        }
    }

    var s = patch.s;
    if (s) {
        for (key in s) {
            val = s[key];
            prev = obj[key];
            if (!this.resetExisting(prev, val))
                obj[key] = val;
        }
    }

    var p = patch.p;
    if (p) {
        for (key in p) {
            this.patchValue(obj[key], p[key]);
        }
    }
};

// Apply an object patch to a model.
SymmetryBB.patchModel = function(obj, patch) {
    var idAttribute = obj.idAttribute;
    var current = obj.attributes;
    var changing = obj._changing;
    obj._changing = true;

    // Call super on attributes.
    this.patchPlainObject(obj.attributes, patch);

    // Check for changes of `id`.
    obj.id = current[idAttribute];

    // Trigger all relevant attribute changes.
    var changes = patch.r || [];
    if (patch.s) changes = changes.concat(_.keys(patch.s));
    if (patch.p) changes = changes.concat(_.keys(patch.p));
    if (changes.length) obj._pending = true;
    for (var i = 0, l = changes.length; i < l; i++) {
        obj.trigger('change:' + changes[i], obj, current[changes[i]], {});
    }

    if (changing) return;
    while (obj._pending) {
        obj._pending = false;
        obj.trigger('change', obj, {});
    }
    obj._changing = false;
};

// Alias what we're going to override.
SymmetryBB.patchPlainArray = SymmetryBB.patchArray;

// Apply an array patch. (`t:'a'`)
SymmetryBB.patchArray = function(arr, patch) {
    if (arr.models)
        SymmetryBB.patchCollection(arr, patch);
    else
        SymmetryBB.patchPlainArray(arr, patch);
};

// Apply an array patch to a collection.
SymmetryBB.patchCollection = function(arr, patch) {
    var i, idx, splice;
    var models = arr.models;

    var p = patch.p;
    if (p) {
        for (idx in p) {
            this.patchValue(models[idx], p[idx]);
        }
    }

    var s = patch.s;
    if (s) {
        // Remove old models first, to prevent ID conflicts.
        var numSplices = s.length;
        for (i = 0; i < numSplices; i++) {
            splice = s[i];
            idx = splice[0];

            var toRemove = models.slice(idx, idx + splice[1]);
            arr.remove(toRemove);
        }

        // Then add the new models.
        var offset = 0;
        for (i--; i >= 0; i--) {
            splice = s[i];
            idx = splice[0] + offset;

            var toAdd = splice.slice(2);
            arr.add(toAdd, { at: idx });
            offset += toAdd.length - splice[1];
        }
    }
};

// Try to reset an existing model or collection, instead of replacing it.
SymmetryBB.resetExisting = function(prev, val) {
    if (Array.isArray(val)) {
        if (prev && prev.models) {
            prev.reset(val);
            return true;
        }
    }
    else if (val && typeof(val) === 'object') {
        if (prev && prev.attributes) {
            this.resetModel(prev, val);
            return true;
        }
    }
    return false;
};

// Reset attributes of a model.
SymmetryBB.resetModel = function(model, attrs) {
    var oldKeys = _.keys(model.attributes);
    var newKeys = _.keys(attrs);
    this.patchModel(model, {
        r: _.without(oldKeys, newKeys),
        s: attrs
    });
};

})();
