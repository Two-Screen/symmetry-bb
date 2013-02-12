var test = require('tape');
var _ = require('underscore');
var Backbone = require('backbone');
var symbb = require('./');

// Check if the given object fires the given events during a block of code.
function checkEvents(t, obj, fn, names) {
    var expect = {};
    _.each(names, function(name) {
        expect[name] = true;
    });

    var seen = {};
    function onEvent(name) {
        seen[name] = true;
    }

    obj.on('all', onEvent);
    fn();
    obj.off('all', onEvent);

    t.deepEqual(seen, expect, 'check events');
}

test('model change', function(t) {
    var model = new Backbone.Model({foo:5});

    checkEvents(t, model, function() {
        symbb.patch(model, {t:'o', s:{foo:8}});
    }, ['change:foo', 'change']);
    t.equal(model.get('foo'), 8, 'foo changed');

    t.end();
});

test('model reset', function(t) {
    var model = new Backbone.Model({foo:5});

    checkEvents(t, model, function() {
        symbb.resetModel(model, {bar:8});
    }, ['change:foo', 'change:bar', 'change']);
    t.ok(model.has('bar'), 'has bar after reset');
    t.notOk(model.has('foo'), 'no foo after reset');

    t.end();
});

test('deep model reset', function(t) {
    var model = new Backbone.Model({foo:5});
    var obj = {model:model};

    checkEvents(t, model, function() {
        symbb.patch(obj, {t:'o', s:{model:{bar:8}}});
    }, ['change:foo', 'change:bar', 'change']);
    t.ok(model.has('bar'), 'has bar after reset');
    t.notOk(model.has('foo'), 'no foo after reset');

    t.end();
});

test('collection change', function(t) {
    var collection = new Backbone.Collection([{foo:5}]);

    checkEvents(t, collection, function() {
        symbb.patch(collection, {t:'a', p:{0:{t:'o', s:{foo:8}}}});
    }, ['change:foo', 'change']);
    t.equal(collection.at(0).get('foo'), 8, 'foo changed');

    checkEvents(t, collection, function() {
        symbb.patch(collection, {t:'a', s:[[1, 0, {bar:5}]]});
    }, ['add']);
    t.equal(collection.length, 2, 'has two models after add');
    t.equal(collection.at(1).get('bar'), 5, 'second model has attribute bar');

    checkEvents(t, collection, function() {
        symbb.patch(collection, {t:'a', s:[[0, 1]]});
    }, ['remove']);
    t.equal(collection.length, 1, 'has one model after remove');
    t.equal(collection.at(0).get('bar'), 5, 'first model has attribute bar');

    t.end();
});

test('collection move', function(t) {
    var collection = new Backbone.Collection([{id:1}, {id:2}, {id:3}]);

    checkEvents(t, collection, function() {
        symbb.patch(collection, {t:'a', s:[[2, 1, {id:1}], [0, 1, {id:3}]]});
    }, ['add', 'remove']);
    t.equal(collection.length, 3, 'still has three models after move');
    t.equal(collection.at(0).id, 3, 'third model is now first');
    t.equal(collection.at(2).id, 1, 'first model is now third');

    t.end();
});

test('deep collection reset', function(t) {
    var collection = new Backbone.Collection([{foo:5}]);
    var obj = {collection:collection};

    checkEvents(t, collection, function() {
        symbb.patch(obj, {t:'o', s:{collection:[{bar:8}]}});
    }, ['reset']);
    t.equal(collection.length, 1, 'has one model after reset');
    t.ok(collection.at(0).has('bar'), 'has bar after reset');
    t.notOk(collection.at(0).has('foo'), 'no foo after reset');

    t.end();
});
