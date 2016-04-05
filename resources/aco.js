/**
 * Ant Colony Optimization - a dynamic path finding algorithm
 */

(function (global) {

//------------------------------------------------------------------------------

function Source(cell, weight)
{
	this.cell = cell;
	this.weight = weight;

	this.w = 0;
}

function Target(cell, weight)
{
	this.cell = cell;
	this.weight = weight;
	this.heuristic = [];
	this.trails = [];

	this.w = 0;
}

function Settings(settings)
{
	var s = settings || {};
	this.trail_default   = s.trail_default   || Number.MIN_VALUE;
	this.trail_minimum   = s.trail_minimum   || Number.MIN_VALUE;
	this.trail_power     = s.trail_power     || 0.5;
	this.trail_decay     = s.trail_decay     || 0.5;
	this.trail_reward    = s.trail_reward    || 0.5;
	this.trail_feedback  = s.trail_feedback  || 0.1;
	this.heuristic_power = s.heuristic_power || 0.5;
	this.iteration_limit = s.iteration_limit || 10000;
	this.ant_count       = s.ant_count       || 10;
}

//------------------------------------------------------------------------------

function ACO(grid, settings, heuristic)
{
	this.grid = grid;
	this.settings = new Settings(settings);
	this.heuristic = heuristic || Heuristic.none;

	this.sources = [];
	this.targets = [];
	this.globalTrails = [];
	resetTrails(this, { trails: this.globalTrails });

	var cores = navigator.hardwareConcurrency || 4;
	this.colony = new WeWoBatch('resources/colony.js', cores);
	this.budget = undefined;
	this.canary = undefined;
	this.active = false;
	this.paths = []; // Path found since last run
	this.mark = null;

	sync(this, 'grid', this.grid.toArray());
	sync(this, 'settings', this.settings, true);
}

function sync(aco, type, value, amend)
{
	if (!amend)
		aco.timestamp = +new Date;
	aco.colony.postMessage({
		type: type,
		value: value,
		timestamp: aco.timestamp,
	});
}

function syncSources(aco, amend)
{
	sync(aco, 'sources', aco.sources.map(function (source)
	{
		return { w: source.w, cell: source.cell.index };
	}), amend);
}

function syncTargets(aco, amend)
{
	sync(aco, 'targets', aco.targets.map(function (target)
	{
		return { w: target.w, cell: target.cell.index };
	}), amend);
}

function syncHeuristics(aco, amend)
{
	sync(aco, 'heuristics', aco.targets.map(function (target)
	{
		return target.heuristic;
	}), amend);
}

function syncTrails(aco, amend)
{
	sync(aco, 'trails', aco.targets.map(function (target)
	{
		return target.trails;
	}), amend);
}

function updateHeuristic(aco, target)
{
	target.heuristic = Heuristic(aco.heuristic, aco.grid.edges, target.cell);
}

function resetTrails(aco, target)
{
	target.trails.length = aco.grid.edges.length;
	for (var i = aco.grid.edges.length - 1; i >= 0; --i)
		target.trails[i] = aco.settings.trail_default;
}

//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

ACO.prototype.changeGrid = function changeGrid(grid)
{
	this.halt();
	this.grid = grid;
	this.sources.length = 0;
	this.targets.length = 0;
	sync(this, 'grid', this.grid.toArray());
	this.changeHeuristic();
	this.reset();
}

ACO.prototype.changeSettings = function changeSettings(settings)
{
	if (settings.ant_count < aco.colony.size)
		throw new Error('[ACO] settings failed: ant_count should be at least ' + this.colony.size);
	for (var x in settings)
		if (settings.hasOwnProperty(x))
			this.settings[x] = settings[x];
	sync(this, 'settings', this.settings);
	this.budget = Math.ceil(aco.settings.ant_count / aco.colony.size);
}

ACO.prototype.changeHeuristic = function changeHeuristic(heuristic)
{
	if (heuristic)
		this.heuristic = heuristic;
	for (var i = this.targets.length - 1; i >= 0; --i)
		updateHeuristic(this, this.targets[i]);
	syncHeuristics(this);
}

ACO.prototype.benchmark = function benchmark()
{
	var mark = [0, 1];
	if (this.mark)
	{
		this.mark[1] = (+new Date) - this.mark[1];
		mark = this.mark;
	}
	this.mark = [0, +new Date];
	return mark;
}

//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

ACO.prototype.addSource = function addSource(cell, weight)
{
	addSpot(this.sources, new Source(cell, weight));
	syncSources(this);
	return this;
}

ACO.prototype.removeSource = function removeSource(id)
{
	removeSpot(this.sources, id);
	syncSources(this);
	this.paths = [];
	return this;
}

ACO.prototype.updateSource = function updateSource(id, cell, weight)
{
	updateSpot(this.sources, id, cell, weight);
	syncSources(this);
	return this;
}

ACO.prototype.addTarget = function addTarget(cell, weight)
{
	var target = new Target(cell, weight);
	updateHeuristic(aco, target);
	resetTrails(aco, target);
	addSpot(this.targets, target);
	syncTargets(this);
	syncHeuristics(this, true);
	syncTrails(this, true);
	return this;
}

ACO.prototype.removeTarget = function removeTarget(id)
{
	removeSpot(this.targets, id);
	syncTargets(this);
	syncHeuristics(this, true);
	syncTrails(this, true);
	this.paths = [];
	return this;
}

ACO.prototype.updateTarget = function updateTarget(id, cell, weight)
{
	var stale = updateSpot(this.targets, id, cell, weight);
	syncTargets(this);
	if (stale)
	{
		updateHeuristic(aco, this.targets[id]);
		syncHeuristics(this, true);
		this.paths = [];
	}
	return this;
}

function normalizeWeights(spot)
{
	var sum = 0;
	for (var i = spot.length - 1; i >= 0; --i)
		sum += spot[i].weight;
	for (var i = spot.length - 1; i >= 0; --i)
		spot[i].w = spot[i].weight / sum;
}

function addSpot(spots, spot)
{
	spot.index = spots.length;
	spots.push(spot);
	normalizeWeights(spots);
}

function removeSpot(spots, id)
{
	if (!(id in spots))
		return;
	spots.splice(id, 1);
	for (var i = spots.length - 1; i >= id; --i)
		spots[i].index = i;
	normalizeWeights(spots);
}

function updateSpot(spots, id, cell, weight)
{
	if (!(id in spots))
		return false;
	if (typeof cell === 'number')
	{
		weight = cell;
		cell = undefined;
	}
	if (weight !== undefined)
	{
		spots[id].weight = weight;
		normalizeWeights(spots);
	}
	if (cell !== undefined)
	{
		spots[id].cell = cell;
		return true;
	}
	return;
}

//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

ACO.prototype.go = function go()
{
	if (!this.sources.length || !this.targets.length)
		throw new Error('[ACO] unable to run: at least one source and target required.');
	if (this.budget <= 0)
		throw new Error('[ACO] unable to run: ant_count should be at least ' + this.colony.size);
	if (this.active)
		return this;

	var aco = this;
	this.colony.onmessage = function (e)
	{
		var type = e.data.type,
			value = e.data.value,
			timestamp = e.data.timestamp;
		
		if (aco.timestamp > timestamp) // Skip old messages
			return;
		if (type == 'path')
		{
			if (aco.mark)
				++aco.mark[0];
			aco.paths.push(value);
			if (aco.paths.length >= aco.settings.ant_count)
				aco.progress();
		}
	}

	// Set up budget canary: prevents the queue from flooding
	this.budget = Math.ceil(this.settings.ant_count / this.colony.size);
	function syncBudget() { sync(aco, 'budget', aco.budget, true); }
	this.canary = setInterval(syncBudget, 100);
	syncBudget();
	
	sync(this, 'start');
	this.active = true;
	return this;
}

ACO.prototype.progress = function progress()
{
	var s = this.settings;

	this.globalTrails.length = aco.grid.edges.length;
	for (var i = aco.grid.edges.length - 1; i >= 0; --i)
		this.globalTrails[i] = 0;

	for (var i = this.targets.length - 1; i >= 0; --i)
	{
		var target = this.targets[i];

		// Update best
		/*for (var i = self.paths.length - 1; i >= 0; --i)
			if (self.paths[i].length < self.best.length)
				self.best = self.paths[i];*/

		// Decay
		for (var j = target.trails.length - 1; j >= 0; --j)
			target.trails[j] = Math.max(
				target.trails[j] * (1 - s.trail_decay),
				s.trail_minimum);

		// Reward
		for (var j = this.paths.length - 1; j >= 0; --j)
		{
			var edges = this.paths[j].edges;
			for (var k = edges.length - 1; k >= 0; --k)
				target.trails[edges[k]] = Math.min(
					target.trails[edges[k]] + s.trail_reward
						* (edges.length / s.iteration_limit),
					1);
		}

		// Append to global trails
		for (var j = target.trails.length - 1; j >= 0; --j)
			this.globalTrails[j] += target.trails[j] * target.w;
	}

	// Global trail feedback
	for (var i = this.targets.length - 1; i >= 0; --i)
	{
		target = this.targets[i];
		for (var j = target.trails.length - 1; j >= 0; --j)
			target.trails[j] = Math.max(
				target.trails[j],
				this.globalTrails[j] * s.trail_feedback);
	}

	// Update colony
	this.paths = [];
	syncTrails(this, true);
	return this;
}

ACO.prototype.halt = function halt()
{
	if (!this.active) return this;
	clearInterval(this.canary);
	sync(this, 'stop');
	this.colony.onmessage = null;
	this.paths = [];
	this.active = false;
	return this;
}

ACO.prototype.interrupt = function interrupt(func)
{
	if (this.active)
	{
		this.halt();
		var aco = this;
		setTimeout(function ()
		{
			func();
			aco.go();
		}, 40);
	}
	else
		func();
	return this;
}

ACO.prototype.reset = function reset()
{
	var aco = this;
	this.interrupt(function resetAllTrails()
	{
		for (var i = aco.targets.length - 1; i >= 0; --i)
			resetTrails(aco, aco.targets[i]);
		aco.globalTrails.length = aco.grid.edges.length;
		for (var i = aco.grid.edges.length - 1; i >= 0; --i)
			aco.globalTrails[i] = aco.settings.trail_default;
		syncTrails(aco);
	});
	return this;
}

//------------------------------------------------------------------------------

global.ACO = ACO;
global.ACO.Settings = Settings;
global.ACO.Source = Source;
global.ACO.Target = Target;

})(window || this);

//------------------------------------------------------------------------------
