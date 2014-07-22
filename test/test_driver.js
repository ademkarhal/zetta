var PubSub = require('../lib/pubsub_service');
var Logger = require('../lib/logger');
var Runtime = require('../zetta_runtime');
var Scientist = require('../lib/scientist');
var assert = require('assert');
var TestDriver = require('./fixture/example_driver');
var MemRegistry = require('./fixture/mem_registry');


describe('Driver', function() {
  var machine = null;
  var pubsub = null;
  var log = null;
  var reg = null;

  beforeEach(function(){
    reg = new MemRegistry();
    pubsub = new PubSub();
    log = new Logger({pubsub: pubsub});
    
    // create machine
    machine = Scientist.create(TestDriver);
    machine._pubsub = pubsub; // setup pubsub, log, registry
    machine._log = log;
    machine._registry = reg;

    // init machine
    machine = Scientist.init(machine);
  });

  it('should be attached to the zetta runtime', function() {
    assert.ok(Runtime.Device);
  });

  describe('Configuration', function() {
    it('should be configured by Scientist#configure', function() {
      assert.ok(machine.call);
      assert.equal(machine.type, 'testdriver');
      assert.equal(machine.state, 'ready');
      assert.equal(machine.name, 'Matt\'s Test Device');
    });

    it('should have an id automatically generated for it', function(){
      assert.ok(machine.id);
    });
  });

  describe('Transitions', function() {

    it('should change the state from ready to changed when calling change.', function(done) {
      machine.call('change', function() {
        assert.equal(machine.properties.state, 'changed');
        done();
      });
    });

    it('should be able to call transiton afterchange after change was called', function(done) {
      machine.call('change', function() {
        assert.equal(machine.properties.state, 'changed');
        machine.call('prepare', function(err) {
          assert.equal(machine.properties.state, 'ready');
          done();
        });
      });
    });

    it('should throw an error when a disallowed transition tries to happen.', function(done) {
      machine.call('change', function() {
        try {
          machine.call('change');
        } catch (e) {
          assert.ok(e);
          done();
        }
      });
    });

    it('should have transitions emitted like events.', function(done) {
      machine.on('change', function() {
        done();
      });

      machine.call('change');
    });
  });

  describe('Streams', function(){

    function wireUpPubSub(stream, done){
      pubsub.publish = function(name, data){
        assert.ok(name);
        assert.ok(data);
        assert.ok(name.indexOf(stream) > -1);
        done();
      }
    }

    it('should stream values of foo once configured', function(done){
      assert.ok(machine.streams.foo);
      wireUpPubSub('foo', done);
      machine.foo++;
    });


    it('should stream values of bar once configured', function(done){
      assert.ok(machine.streams.bar);
      wireUpPubSub('bar', done);
      machine.incrementStreamValue();
    });
  });

  describe('Streams', function() {
    
    it('save should be implemented on device', function() {
      assert.equal(typeof machine.save, 'function');
    });

    it('save should update the registry with new property values', function(cb) {
      
      reg.get(machine.id, function(err, result) {
        assert(err);
        
        machine.someval = 123;
        machine._hidden = 'some-string';
        machine.save(function(err) {
          assert(!err);
          
          reg.get(machine.id, function(err, result) {
            result = JSON.parse(result);
            assert.equal(err, null);
            assert.equal(result.id, machine.id);
            assert.equal(result.someval, 123);
            assert.equal(typeof result._hidden, 'undefined');
            cb();
          });
        });
      });
    });
    
  });


});
