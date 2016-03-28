/**
 * Web worker interface that calculates ant paths for a given configuration
 */

(function (global) {

// Web Worker Emulation as fallback
var self = global; if (typeof WeWo !== 'undefined') self = WeWo.current;

// Colony globals
var timestamp = 0,
	grid = null,
	settings = null,
	sources = [], // { w: 0..1, cell: index }
	targets = [], // { w: 0..1, cell: index }
	trails = [], // [forall grid.edges] x targets
	heuristics = [], // [forall grid.cells] x targets
	ants = [],
	antcount = 100,
	speed = 1000 / 60,
	interval = undefined,
	burst = 1000;

self.onmessage = function recvMessage(e)
{
	var type = e.data.type,
		value = e.data.value;
	switch (type)
	{
		case 'grid':       grid       = value; break;
		case 'settings':   settings   = value; break;
		case 'sources':    sources    = value; break;
		case 'targets':    targets    = value; break;
		case 'trails':     trails     = value; break;
		case 'heuristics': heuristics = value; break;
		case 'start':      Start();            break;
		case 'stop':       Stop();             break;
		default: return;
	}
	timestamp = e.data.timestamp;

	// Reset all ants
	for (var i = ants.length - 1; i >= 0; --i)
		Ant.call(ants[i]);
}

//------------------------------------------------------------------------------

function Start()
{
	if (!interval)
	{
		ants = [];
		for (var i = antcount - 1; i >= 0; --i)
			ants.push(new Ant);
		interval = setInterval(Run, speed);
	}
}

function Stop()
{
	if (!interval)
		return;
	clearInterval(interval);
	interval = undefined;
}

function Step()
{
	for (var i = ants.length - 1; i >= 0; --i)
	{
		if (ants[i].step())
		{
			Report(ants[i]);
			Ant.call(ants[i]);
		}
	}
}

function Run()
{
	if (!sources.length || !targets.length
	|| targets.length != heuristics.length
	|| targets.length != trails.length)
		return;
	
	var start = performance.now();
	for (var i = burst - 1; i >= 0; --i)
		Step();
	var stop = performance.now();

	if (stop - start > speed)
		burst -= 100;
	else
		burst += 100;
}

function Report(ant)
{
	self.postMessage({
		type: 'path',
		value: {
			source: ant.sourceIndex,
			target: ant.targetIndex,
			edges: ant.path,
		},
		timestamp: timestamp,
	});
}

//------------------------------------------------------------------------------

function Ant()
{
	var source = this.sourceIndex = chooseRandom(sources),
		target = this.targetIndex = chooseRandom(targets);
	this.cell = sources[source].cell;
	this.target = targets[target].cell;
	this.trails = trails[target];
	this.heuristics = heuristics[target];
	this.path = [];
}

Ant.prototype.score = function score(index)
{
	var t = this.trails[index],
		h = this.heuristics[index],
		a = settings.trail_power,
		b = settings.heuristic_power;
	return Math.pow(t, a) * Math.pow(h, b);
}

Ant.prototype.step = function step()
{
	if (this.path.length > settings.iteration_limit) // Ant is lost!
		return this.wander();

	var edges = grid.cells[this.cell],
		len = edges.length,
		scores = Array(len),
		sum = 0;
	for (var i = 0; i < len; ++i)
		sum += (scores[i] = this.score(edges[i]));

	if (!sum) // Ant is deadlocked!
		return this.wander();

	var p = sum * Math.random();
	for (var i = 0; i < len; ++i)
	{
		if (p < scores[i])
		{
			this.path.push(edges[i]);
			this.cell = grid.edges[edges[i]];
			break;
		}
		p -= scores[i];
	}

	return this.cell == this.target;
}

Ant.prototype.wander = function wander()
{
	this.cell = (grid.cells.length * Math.random()) << 0;
	this.path = [];
	return false;
}

Ant.prototype.distance = function distance()
{
	return this.path.length;
}

//------------------------------------------------------------------------------

// performance.now polyfill for Edge (not available for web workers)
if (typeof performance === 'undefined') performance = { now: Date.now };
if (!performance.now) performance.now = performance.webkitNow || function() { return +new Date };

function chooseRandom(spots)
{
	var r = Math.random(), index = 0;
	for (var i = spots.length - 1; i >= 0; --i)
	{
		index = i;
		if (r < spots[i].w)
			break;
		r -= spots[i].w;
	}
	return index;
}

//------------------------------------------------------------------------------

})(this);

//------------------------------------------------------------------------------
