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

function Target(cell, weight, heuristic)
{
	this.cell = cell;
	this.weight = weight;
	this.heuristic = heuristic;

	this.w = 0;
}

//------------------------------------------------------------------------------

function Ant(cell /*in*/, target /*in*/, trails /*in out*/, settings /*in*/)
{
	this.cell = cell;
	this.target = target;
	this.trails = trails;
	this.settings = settings;
	this.path = [];
}

Ant.prototype.score = function score(index)
{
	var t = this.trails[index],
		h = this.target.heuristic[index],
		a = this.settings.trail_power,
		b = this.settings.heuristic_power;
	return Math.pow(t, a) * Math.pow(h, b);
}

Ant.prototype.step = function step()
{
	var len = this.cell.edges.length,
		scores = Array(len),
		sum = 0;
	for (var i = 0; i < len; ++i)
		sum += (scores[i] = this.score(this.cell.edges[i].index));

	if (sum == 0)
		throw new Error('Ant is deadlocked!');

	var p = sum * Math.random();
	for (var i = 0; i < len; ++i)
	{
		if (p < scores[i])
		{
			this.path.push(this.cell.edges[i]);
			this.cell = this.cell.edges[i].v;
			break;
		}
		p -= scores[i];
	}

	return this.cell == this.target.cell;
}

Ant.prototype.walk = function walk()
{
	for (var i = 0; i < this.settings.iteration_limit; ++i)
		if (this.step())
			break;
	return this.cell == this.target.cell;
}

Ant.prototype.distance = function distance()
{
	return this.path.length;
}

//------------------------------------------------------------------------------

function ACO(grid, settings)
{
	this.grid = grid;
	this.sources = [];
	this.targets = [];
	this.trails = Array(this.grid.edges.length);

	this.active = false;
	this.ants = []; // Ants currently wandering around
	this.paths = []; // Path found since last run
	this.best = { length: Infinity }; // XXX: keep best for all source-target pairs

	this.settings = settings || {}
	var s = this.settings;
	s.trail_default   = s.trail_default   || Number.MIN_VALUE;
	s.trail_minimum   = s.trail_minimum   || Number.MIN_VALUE;
	s.trail_power     = s.trail_power     || 0.5;
	s.trail_decay     = s.trail_decay     || 0.5;
	s.trail_reward    = s.trail_reward    || 0.5;
	s.heuristic_power = s.heuristic_power || 0.5;
	s.iteration_limit = s.iteration_limit || 10000;
	s.ant_count       = s.ant_count       || 10;

	this.reset();
}

//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

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
	spots.push(spot);
	normalizeWeights(spots);
}

function removeSpot(spots, cell)
{
	for (var i = spots.length - 1; i >= 0; --i)
	{
		if (spots[i].cell == cell)
		{
			spots.splice(i, 1);
			normalizeWeights(spots);
			return;
		}
	}
}

function updateSpot(spots, cell, weight)
{
	for (var i = spots.length - 1; i >= 0; --i)
	{
		if (spots[i].cell == cell)
		{
			spots[i].weight = weight;
			normalizeWeights(spots);
			return;
		}
	}
}

function pickSpot(spots)
{
	var r = Math.random(), spot;
	for (var i = spots.length - 1; i >= 0; --i)
	{
		spot = spots[i];
		if (r < spots[i].w)
			break;
		r -= spots[i].w;
	}
	return spot;
}

ACO.prototype.addSource = function addSource(cell, weight)
{
	addSpot(this.sources, new Source(cell, weight));
	return this;
}

ACO.prototype.removeSource = function removeSource(cell)
{
	removeSpot(this.sources, cell);
	return this;
}

ACO.prototype.updateSource = function updateSource(cell, weight)
{
	updateSpot(this.sources, cell, weight);
	return this;
}

ACO.prototype.addTarget = function addTarget(cell, weight, heuristic)
{
	// Sanity check
	if (heuristic.length != this.grid.edges.length)
		throw new Error('Invalid heuristic');
	addSpot(this.targets, new Target(cell, weight, heuristic));
	return this;
}

ACO.prototype.removeTarget = function removeTarget(cell)
{
	removeSpot(this.targets, cell);
	return this;
}

ACO.prototype.updateTarget = function updateTarget(cell, weight)
{
	updateSpot(this.targets, cell, weight);
	return this;
}

//- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 

ACO.prototype.reset = function reset()
{
	if (this.active)
		throw new Error('Can not reset ACO while active.');
	for (var i = this.grid.edges.length - 1; i >= 0; --i)
		this.trails[i] = this.settings.trail_default;
	this.best = { length: Infinity };
	return this;
}

ACO.prototype.go = function go()
{
	if (this.active) return this;
	var self = this,
		s = this.settings;
	this.active = setInterval(function check()
	{
		if (!self.active) return;

		// We've finished a run
		if (self.paths.length >= s.ant_count)
		{
			// Update best
			for (var i = self.paths.length - 1; i >= 0; --i)
				if (self.paths[i].length < self.best.length)
					self.best = self.paths[i];

			// Decay
			for (var i = self.trails.length - 1; i >= 0; --i)
				self.trails[i] = Math.max(self.trails[i] * (1 - s.trail_decay), s.trail_minimum);

			// Reward
			for (var i = self.paths.length - 1; i >= 0; --i)
				for (var j = self.paths[i].length - 1; j >= 0; --j)
					self.trails[self.paths[i][j].index] = Math.min(self.trails[self.paths[i][j].index]
						+ s.trail_reward * (self.paths[i].length / self.best.length), 1);

			self.ants = [];
			self.paths = [];
		}
		else (self.ants.length < s.ant_count)
		{
			var source = pickSpot(self.sources),
				target = pickSpot(self.targets),
				ant = new Ant(source.cell, target, self.trails, s);
			self.ants.push(ant);
			var finished = ant.walk(),
				index = self.ants.indexOf(ant);
			if (index >= 0)
			{
				if (finished)
					self.paths.push(ant.path);
				self.ants.splice(index, 1);
			}
		}
	}, 1);
	return this;
}

ACO.prototype.halt = function halt()
{
	if (!this.active) return this;
	clearInterval(this.active);
	this.active = false;
	this.ants = [];
	this.paths = [];
	return this;
}

ACO.prototype.interrupt = function interrupt(func)
{
	this.halt();
	var self = this;
	setTimeout(function check()
	{
		func();
		self.go();
	}, 40);
	return this;
}

//------------------------------------------------------------------------------

global.ACO = ACO;

})(window || this);

//------------------------------------------------------------------------------
