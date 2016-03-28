/**
 * WebWorker abstraction layer
 */

(function (global) {

//------------------------------------------------------------------------------

function WeWo(script)
{
	var self = this;
	this.worker = null;
	this.onmessage = null;
	try {
		this.emulated = false;
		this.worker = new Worker(script);
		this.worker.onmessage = function (e)
		{
			if (typeof self.onmessage === 'function')
				return self.onmessage(e);
		}
		this.postMessage = this.worker.postMessage.bind(this.worker);
	} catch (e) {
		console.info('[WeWo] emulating ' + script);
		this.emulated = true;
		this.semaphore = new Semaphore();
		this.worker = new WeWoScope(this);
		WeWo.current = this.worker;
		inject(script, this.semaphore.wait());
		return;
	}
}

WeWo.prototype.postMessage = function postMessageQueued(msg)
{
	var worker = this.worker;
	this.semaphore.queue(function postMessage()
	{
		if (typeof worker.onmessage === 'function')
			return worker.onmessage({ data: msg });
	});
}

//------------------------------------------------------------------------------

WeWoScope = function WeWoScope(parent)
{
	this.parent = parent;
	this.onmessage = null;
}

WeWoScope.prototype.postMessage = function postMessage(msg)
{
	if (typeof this.parent.onmessage === 'function')
		return this.parent.onmessage({ data: msg });
}

WeWoScope.prototype.importScripts = function importScripts(/*...*/)
{
	var files = Array.prototype.slice.call(arguments, 0);
	for (var i = 0, l = files.length; i < l; ++i)
		inject_once(files[i], this.parent.semaphore.wait());
}

//------------------------------------------------------------------------------

WeWoBatch = function WeWoBatch(script, number, force)
{
	var batch = this;
	this.workers = [];
	this.size = 0;
	this.onmessage = null;
	this.queue = [];
	(function create(number)
	{
		if (number <= 0)
			return done();
		var worker = new WeWo(script);
		function next()
		{
			worker.onmessage = function (e)
			{
				e.worker = worker;
				if (typeof batch.onmessage === 'function')
					return batch.onmessage(e);
			}
			worker.index = batch.workers.length;
			batch.workers.push(worker);
			++batch.size;
			create(worker.emulated && !force ? 0 : number - 1);
		}
		if (worker.emulated)
			worker.semaphore.queue(next);
		else
			next();
	})(number || navigator.hardwareConcurrency || 4);
	function postMessage(msg)
	{
		for (var i = batch.workers.length - 1; i >= 0; --i)
			batch.workers[i].postMessage(msg);
	}
	function done()
	{
		while (batch.queue.length)
			postMessage(batch.queue.shift());
		batch.postMessage = postMessage;
	}
}

WeWoBatch.prototype.postMessage = function postMessageQueued(msg)
{
	this.queue.push(msg);
}

//------------------------------------------------------------------------------

var injected = [];
function inject(scriptname, done)
{
	var script = document.createElement('script');
	script.async = true;
	script.onload = function ()
	{
		script.onload = null;
		if (done)
			done();
		injected.push(scriptname);
	};
	script.src = scriptname;
	document.getElementsByTagName('head')[0].appendChild(script);
}

function inject_once(scriptname, done)
{
	if (injected.indexOf(scriptname) < 0)
		return inject(scriptname, done);
	if (done)
		done();
}

//------------------------------------------------------------------------------

function Semaphore()
{
	this.busy = [];
	this.waiting = [];
}

Semaphore.prototype.check = function check()
{
	if (this.busy.length < 1
	&& this.waiting.length >= 1)
		this.waiting.shift()();
}

Semaphore.prototype.wait = function wait()
{
	var semaphore = this;
	var done = function done()
	{
		semaphore.busy.splice(semaphore.busy.indexOf(done), 1);
		semaphore.check();
	}
	this.busy.push(done);
	return done;
}

Semaphore.prototype.queue = function queue(func)
{
	this.waiting.push(func);
	this.check();
}

//------------------------------------------------------------------------------

global.WeWo = WeWo;
global.WeWoBatch = WeWoBatch;

})(window || this);

//------------------------------------------------------------------------------
