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
    else if (obj.models)
        this.patchCollectionFromObject(obj, patch);
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

// Apply an object patch to a collection.
SymmetryBB.patchCollectionFromObject = function(obj, patch) {
    var i, key, val, prev;

    var r = patch.r;
    if (r)
        obj.remove(r);

    var s = patch.s;
    if (s) {
        var idAttribute = obj.model.prototype.idAttribute;
        var toAdd = [];
        for (key in s) {
            val = s[key];
            val[idAttribute] = key;

            var existing = obj.get(key);
            if (existing)
                this.resetModel(existing, val);
            else
                toAdd.push(val);
        }
        obj.add(toAdd);
    }

    var p = patch.p;
    if (p) {
        for (key in p) {
            this.patchValue(obj.get(key), p[key]);
        }
    }
};

// Alias what we're going to override.
SymmetryBB.patchPlainArray = SymmetryBB.patchArray;

// Apply an array patch. (`t:'a'`)
SymmetryBB.patchArray = function(arr, patch) {
    if (arr.models)
        this.patchCollectionFromArray(arr, patch);
    else
        this.patchPlainArray(arr, patch);
};

// Apply an array patch to a collection.
SymmetryBB.patchCollectionFromArray = function(arr, patch) {
    var num, idx;
    var num2, idx2;
    var model;
    var models = arr.models;

    var p = patch.p;
    if (p) {
        for (idx in p)
            this.patchValue(models[idx], p[idx]);
    }

    var s = patch.s;
    if (s) {
        // Create a new models array with splices applied.
        var added = [];
        models = models.slice(0);
        for (idx = 0, num = s.length; idx < num; idx++) {
            var splice = s[idx];

            // Prepare models in the splice.
            for (idx2 = 2, num2 = splice.length; idx2 < num2; idx2++) {
                if (!(splice[idx2] = arr._prepareModel(splice[idx2])))
                    throw new Error("Patch failed: invalid model");
            }

            // Apply splice.
            var removed = models.splice.apply(models, splice);

            // Collect adds, simulate removes now.
            added = added.concat(splice.slice(2));
            arr.remove(removed);
        }

        // Swap the models array.
        arr.models = models;
        arr.length = models.length;

        // Simulate adds.
        var dummy = {};
        for (idx = 0, num = added.length; idx < num; idx++) {
            model = added[idx];

            // Listen to added models' events, and index
            // models for lookup by `id` and by `cid`.
            model.on('all', arr._onModelEvent, arr);
            arr._byId[model.cid] = model;
            if (model.id != null) arr._byId[model.id] = model;

            // Trigger `add` event.
            model.trigger('add', model, arr, dummy);
        }
    }
};

// Try to reset an existing model or collection, instead of replacing it.
SymmetryBB.resetExisting = function(prev, val) {
    if (!val || !prev) return false;
    if (_.isArray(val)) {
        if (prev.models) {
            prev.reset(val);
            return true;
        }
        return false;
    }
    else if (typeof(val) === 'object') {
        if (prev.attributes) {
            this.resetModel(prev, val);
            return true;
        }
        else if (prev.models) {
            this.resetCollectionFromObject(prev, val);
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

// Reset a collection from an object.
SymmetryBB.resetCollectionFromObject = function(collection, obj) {
    var idAttribute = collection.model.prototype.idAttribute;
    var models = [];
    for (var key in obj) {
        var val = obj[key];
        val[idAttribute] = key;
        models.push(val);
    }
    collection.reset(models);
};

})();
